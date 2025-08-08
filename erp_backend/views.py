from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db import connection ,transaction
from django.apps import apps
from django.conf import settings
from django.core.management import call_command
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
import os
import logging

from io import StringIO
logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([AllowAny]) # WARNING: In production, you should secure this endpoint.
def migrate_tenant_schema(request):
    """
    API endpoint to robustly migrate all tables to a specific tenant schema.
    This definitive version fixes corrupted existing schemas by performing a hard
    reset of the entire migration history for the tenant before applying all
    migrations, ensuring all changes are detected and applied.

    Expects a JSON payload:
    {
        "tenant_schema": "schema_name_of_the_tenant"
    }
    """
    tenant_schema = request.data.get("tenant_schema")

    # 1. Validate the input
    if not tenant_schema or not tenant_schema.isidentifier():
        return Response({
            "error": "A valid 'tenant_schema' is required and must be a valid SQL identifier."
        }, status=400)

    output_buffer = StringIO()

    try:
        # 2. Use a single atomic transaction for the entire process.
        # This is CRITICAL to ensure the 'search_path' setting persists.
        with transaction.atomic():
            with connection.cursor() as cursor:
                logger.info(f"Starting migration process for schema: '{tenant_schema}'")
                cursor.execute(f"CREATE SCHEMA IF NOT EXISTS {tenant_schema}")
                cursor.execute(f"SET search_path TO {tenant_schema}, public")
                logger.info(f"Schema '{tenant_schema}' is ready. Search path is set within transaction.")

                # 3. Hard reset the entire migration history for the schema.
                # This is the definitive fix. It forces Django to re-evaluate every
                # migration against the schema's actual state, ensuring new tables
                # and changes are applied to existing schemas.
                logger.info(f"Checking for existing django_migrations table in schema '{tenant_schema}'...")
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = %s AND table_name = 'django_migrations'
                    );
                """, [tenant_schema])
                
                if cursor.fetchone()[0]:
                    logger.warning(f"--- Hard resetting ALL migration records for schema '{tenant_schema}' to fix corruption and apply new changes. ---")
                    cursor.execute("DELETE FROM django_migrations")

            # 4. Run a single, global migrate command.
            # After the history reset, this one command is sufficient. Django will now
            # correctly detect and apply all migrations in the correct dependency order.
            logger.info(f"--- Applying all migrations for '{tenant_schema}' from a clean slate. ---")
            call_command(
                "migrate",
                interactive=False,
                stdout=output_buffer,
                stderr=output_buffer,
                verbosity=1
            )

        # If we reach here, the transaction has been committed successfully.
        migration_output = output_buffer.getvalue()
        logger.info(f"Migration command successful for '{tenant_schema}':\n{migration_output}")

        response_data = {
            "message": "Migration process completed successfully.",
            "schema": tenant_schema,
            "details": migration_output
        }
        return Response(response_data, status=200)

    except Exception as e:
        # The transaction will be rolled back automatically if an exception occurs.
        logger.exception(f"A critical error occurred during migration for schema '{tenant_schema}': {e}")
        
        error_details = output_buffer.getvalue()
        return Response({
            "error": "A critical error occurred during the migration process.",
            "exception": str(e),
            "details": error_details
        }, status=500)
    
    finally:
        # 5. ALWAYS reset the connection's search path for the next request.
        try:
            with connection.cursor() as cursor:
                cursor.execute("SET search_path TO public")
            logger.info(f"Connection search path reset to 'public' after operation on '{tenant_schema}'.")
        except Exception as e:
            logger.error(f"CRITICAL: Could not reset search path to public. This may affect subsequent requests. Error: {e}")



from django.db import connection
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
import json
from rest_framework.permissions import IsAuthenticated
from erp_backend.middleware import CustomJWTAuthentication

@csrf_exempt
@api_view(['POST'])
@authentication_classes([CustomJWTAuthentication])
@permission_classes([IsAuthenticated]) 
def get_subscription_plan_by_tenant(request):
    """
    API endpoint to get subscription plan data based on tenant_id using raw SQL.
    """
    if request.method != 'POST':
        return Response({'error': 'Method not allowed'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)
    
    try:
        data = request.data
        tenant_id = request.user._tenant_id if hasattr(request.user, '_tenant_id') else None

        if not tenant_id:
            return Response({'error': 'tenant_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        with connection.cursor() as cursor:
            # Get tenant details
            cursor.execute("""
                SELECT id, name, schema_name, subscription_plan_id
                FROM ecomm_superadmin_tenants
                WHERE id = %s
            """, [tenant_id])
            tenant_row = cursor.fetchone()
            
            if not tenant_row:
                return Response({'error': 'Tenant not found'}, status=status.HTTP_404_NOT_FOUND)
            
            tenant = {
                'id': tenant_row[0],
                'name': tenant_row[1],
                'schema_name': tenant_row[2],
                'subscription_plan_id': tenant_row[3]
            }

            if not tenant['subscription_plan_id']:
                return Response({'error': 'No subscription plan associated with this tenant'}, status=status.HTTP_404_NOT_FOUND)

            # Get subscription plan
            cursor.execute("""
                SELECT id, name, description, price, status, valid_from, valid_until, max_users, storage_limit, support_level
                FROM subscription_plans
                WHERE id = %s
            """, [tenant['subscription_plan_id']])
            plan_row = cursor.fetchone()

            if not plan_row:
                return Response({'error': 'Subscription plan not found'}, status=status.HTTP_404_NOT_FOUND)
            
            subscription_plan = {
                "id": plan_row[0],
                "name": plan_row[1],
                "description": plan_row[2],
                "price": str(plan_row[3]),
                "status": plan_row[4],
                "valid_from": plan_row[5].isoformat(),
                "valid_until": plan_row[6].isoformat() if plan_row[6] else None,
                "max_users": plan_row[7],
                "storage_limit": plan_row[8],
                "support_level": plan_row[9],
                "modules": []
            }

            # Get feature entitlements
            cursor.execute("""
                SELECT f.id, f.name, f.key, f.description, f.granual_settings
                FROM plan_feature_entitlements pfe
                JOIN features f ON f.id = pfe.feature_id
                WHERE pfe.plan_id = %s
            """, [tenant['subscription_plan_id']])

            features = cursor.fetchall()
            for row in features:
                granual_settings = row[4]
                subfeatures = []
                if granual_settings:
                    try:
                        settings_json = json.loads(granual_settings)
                        subfeatures = settings_json.get("subfeatures", [])
                    except Exception:
                        pass
                
                subscription_plan["modules"].append({
                    "id": row[0],
                    "name": row[1],
                    "key": row[2],
                    "description": row[3],
                    "features": subfeatures
                })

        # Response payload
        return Response({
            "tenant_id": tenant["id"],
            "tenant_name": tenant["name"],
            "schema_name": tenant["schema_name"],
            "subscription_plan": subscription_plan
        }, status=status.HTTP_200_OK)

    except Exception as e:
        print("Internal server error:", e)
        return Response({'error': 'Internal Server Error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)