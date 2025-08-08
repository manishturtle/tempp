"""
Views for the onboarding app.
"""

import os
import json
import jwt
import logging
from pathlib import Path
from typing import Dict, Any, Optional
import logging
import jwt
from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.conf import settings
from django.db import connection, transaction
from django.utils import timezone
from erp_backend.middleware import CustomJWTAuthentication
from .serializers import OnboardingTriggerSerializer, TenantConfigurationStatusSerializer
from order_management.models import TenantConfiguration
from .seeders.main_seeder import run_tenant_seeding

logger = logging.getLogger(__name__)

# Country and currency data loading has been moved to migrations

class OnboardingTriggerView(APIView):
    """
    API View to trigger the onboarding process for a new tenant.
    Requires JWT authentication with tenant information.
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [CustomJWTAuthentication]

    def post(self, request, *args, **kwargs):
        """
        Triggers the onboarding process for a tenant.
        
        Request body should contain:
        - industry: Industry type (e.g., 'fashion', 'electronics')
        - region: Geographic region code (e.g., 'us', 'uk')
        
        JWT token must contain:
        - tenant_id: ID of the tenant
        - tenant_schema: Schema name
        - tenant_slug: Tenant slug
        
        Returns:
            Response with 200 OK if onboarding was successful
            Response with 400 Bad Request if validation fails
            Response with 500 if there's an error during onboarding
        """
        try:
            # 1. Get tenant info from JWT token
            token = request.auth.split(' ')[1] if ' ' in request.auth else request.auth
            decoded_token = jwt.decode(token, options={"verify_signature": False})
            tenant_id = int(decoded_token.get('tenant_id'))
            tenant_schema = decoded_token.get('tenant_schema')
            tenant_slug = decoded_token.get('tenant_slug')
            
            if not all([tenant_id, tenant_schema, tenant_slug]):
                return Response(
                    {'error': 'Missing required tenant information in token'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            tenant_slug = decoded_token.get('tenant_slug')
        except Exception as e:
            return Response(
                {"error": f"Error decoding token: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not all([tenant_id, tenant_schema, tenant_slug]):
            return Response(
                {"error": "Missing tenant information in token"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 2. Validate request data
        serializer = OnboardingTriggerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        industry = serializer.validated_data['industry']
        region = serializer.validated_data['region']

        # 3. Check if onboarding is already complete
        with connection.cursor() as check_cursor:
            check_cursor.execute(f'SET LOCAL search_path TO {tenant_schema}, public')
            
            # First check if the tenant_configuration table exists
            check_cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE  table_schema = %s
                    AND    table_name   = 'tenant_configuration'
                );
            """, [tenant_schema])
            
            table_exists = check_cursor.fetchone()[0]
            
            if table_exists:
                # Check if onboarding is already complete
                check_cursor.execute("""
                    SELECT 1 FROM tenant_configuration 
                    WHERE custom_fields->>'is_onboarding_complete' = 'true' 
                    LIMIT 1
                """)
                if check_cursor.fetchone():
                    return Response(
                        {
                            'status': 'success',
                            'message': 'Onboarding was already completed for this tenant',
                            'already_completed': True
                        },
                        status=status.HTTP_200_OK
                    )
        
        # 4. Execute the seeding process in a transaction
        try:
            with transaction.atomic():
                # Set the schema for this connection
                with connection.cursor() as cursor:
                    # Set search path for the entire transaction
                    cursor.execute(f'SET LOCAL search_path TO {tenant_schema}, public')
                
                    # Log the start of onboarding process
                    logger.info(f"Starting onboarding process for tenant {tenant_schema}")
                    
                    # Country and currency data are now loaded via migrations
                    logger.info(f"Country and currency data are loaded via migrations for tenant {tenant_schema}")
                    
                    # Run the main seeder
                    try:
                        logger.info(f"Starting main seeder for tenant {tenant_schema}")
                        run_tenant_seeding(industry, region, tenant_schema)
                    except Exception as e:
                        logger.error(f"Failed to run tenant seeding: {str(e)}", exc_info=True)
                        raise  # Let the transaction handle this
                    
                    # Update tenant configuration
                    try:
                        # Let Django know we're using this schema
                        with connection.cursor() as config_cursor:
                            config_cursor.execute(f'SET LOCAL search_path TO {tenant_schema}, public')
                            
                        # Get or create tenant config with the correct fields
                        tenant_config, created = TenantConfiguration.objects.get_or_create(
                            tenant_ref=tenant_schema,
                            defaults={
                                'client_id': tenant_id,
                                'created_by': request.user.id,
                                'updated_by': request.user.id,
                                'custom_fields': {
                                    'is_onboarding_complete': True
                                }
                            }
                        )
                        
                        if not created:
                            # Update existing config
                            tenant_config.updated_by = request.user.id
                            tenant_config.custom_fields['is_onboarding_complete'] = True
                            tenant_config.save(update_fields=['updated_by', 'updated_at', 'custom_fields'])
                            
                        logger.info(f"Onboarding completed for tenant {tenant_schema}")
                    except Exception as e:
                        logger.error(f"Failed to update tenant configuration: {str(e)}", exc_info=True)
                        raise  # Let the transaction handle this
            
            # If we get here, the transaction completed successfully
            return Response(
                {
                    'status': 'success',
                    'message': 'Onboarding process completed successfully',
                    'tenant_id': tenant_id,
                    'tenant_schema': tenant_schema,
                    'industry': industry,
                    'region': region,
                },
                status=status.HTTP_200_OK
            )
            
        except Exception as e:
            logger.error(f"Error during tenant seeding: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Error during onboarding: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
        except Exception as e:
            logger.error(f"Error in OnboardingTriggerView: {str(e)}", exc_info=True)
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class TenantConfigurationStatusView(APIView):
    """
    API View to get and update the tenant configuration's is_onboarding_completed status.
    Requires JWT authentication with tenant information.
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [CustomJWTAuthentication]
    
    def get_tenant_info_from_token(self, request) -> Dict[str, Any]:
        """
        Extract tenant information from the JWT token.
        
        Args:
            request: The HTTP request object
            
        Returns:
            Dict containing tenant_id, tenant_schema, and tenant_slug
            
        Raises:
            Response: HTTP 400 if token decoding fails or tenant info is missing
        """
        try:
            # The token is in the format: Bearer <token>
            token = request.auth.split(' ')[1] if ' ' in request.auth else request.auth
            # Decode the token without verification since it's already verified by authentication
            decoded_token = jwt.decode(token, options={"verify_signature": False})
            tenant_id = decoded_token.get('tenant_id')
            tenant_schema = decoded_token.get('tenant_schema')
            tenant_slug = decoded_token.get('tenant_slug')
            
            if not all([tenant_id, tenant_schema, tenant_slug]):
                raise ValueError("Missing tenant information in token")
                
            return {
                'tenant_id': tenant_id,
                'tenant_schema': tenant_schema,
                'tenant_slug': tenant_slug
            }
        except Exception as e:
            raise ValueError(f"Error decoding token: {str(e)}")
    
    def get_tenant_configuration(self, tenant_schema: str, tenant_id: str) -> Optional[TenantConfiguration]:
        """
        Get the tenant configuration for the specified tenant.
        
        Args:
            tenant_schema: The schema name of the tenant
            tenant_id: The ID of the tenant (not used for filtering)
            
        Returns:
            TenantConfiguration object or None if not found
        """
        # Set the search path to the tenant's schema
        with connection.cursor() as cursor:
            cursor.execute(f"SET search_path TO {tenant_schema}")
            
            try:
                # Get the first tenant configuration in the schema
                # We're not filtering by tenant_ref as requested
                config = TenantConfiguration.objects.first()
                return config
            finally:
                # Reset the search path to public
                cursor.execute("SET search_path TO public")
    
    def get(self, request, *args, **kwargs):
        """
        Get the tenant configuration status.
        
        Returns:
            Response with 200 OK and the tenant configuration status
            Response with 404 Not Found if the tenant configuration doesn't exist
        """
        try:
            tenant_info = self.get_tenant_info_from_token(request)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        config = self.get_tenant_configuration(
            tenant_info['tenant_schema'],
            tenant_info['tenant_id']
        )
        
        if not config:
            return Response(
                {"error": "Tenant configuration not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = TenantConfigurationStatusSerializer(config)
        return Response(serializer.data)
    
    def patch(self, request, *args, **kwargs):
        """
        Update the tenant configuration status.
        
        Request body should contain:
        - is_onboarding_completed: Boolean indicating whether onboarding is completed
        
        Returns:
            Response with 200 OK and the updated tenant configuration status
            Response with 400 Bad Request if validation fails
            Response with 404 Not Found if the tenant configuration doesn't exist
        """
        try:
            tenant_info = self.get_tenant_info_from_token(request)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        config = self.get_tenant_configuration(
            tenant_info['tenant_schema'],
            tenant_info['tenant_id']
        )
        
        if not config:
            return Response(
                {"error": "Tenant configuration not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = TenantConfigurationStatusSerializer(config, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Set the search path to the tenant's schema for the update
        with connection.cursor() as cursor:
            cursor.execute(f"SET search_path TO {tenant_info['tenant_schema']}")
            try:
                serializer.save()
            finally:
                # Reset the search path to public
                cursor.execute("SET search_path TO public")
        
        return Response(serializer.data)
