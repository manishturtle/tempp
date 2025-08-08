"""
Celery tasks for tenant onboarding process.
"""

import json
import os
from pathlib import Path
from celery import shared_task
from django.db import connection, transaction
from django.conf import settings
from .seeders.main_seeder import run_tenant_seeding

@shared_task
def onboard_new_tenant_task(tenant_schema, industry, region):
    """
    This is the asynchronous Celery task that will be executed by a worker.
    It checks if the schema exists and if onboarding is not already completed.

    Args:
        tenant_schema (str): Schema name for the tenant
        industry (str): Industry type for the tenant (e.g., 'fashion', 'electronics')
        region (str): Geographic region for the tenant

    Returns:
        str: Success or error message
    """
    try:
        print(f"CELERY_TASK_STARTED: Onboarding for schema={tenant_schema}, industry={industry}, region={region}")
        
        # Step 1: Check if schema exists
        with connection.cursor() as cursor:
            cursor.execute(
                """SELECT schema_name FROM information_schema.schemata 
                   WHERE schema_name = %s""", 
                [tenant_schema]
            )
            if not cursor.fetchone():
                print(f"CELERY_TASK_FAILED: Schema {tenant_schema} does not exist.")
                return f"Error: Schema {tenant_schema} does not exist."

            # Step 2: Switch to tenant schema
            print(f"Switching to schema: {tenant_schema}")
            cursor.execute(f'SET search_path TO {tenant_schema}')
            
            # Step 3: Check if tenant configuration exists and get current status
            cursor.execute(
                """SELECT is_onboarding_completed FROM order_management_tenantconfiguration 
                   WHERE tenant_ref = %s""", 
                [tenant_schema]
            )
            result = cursor.fetchone()
            
            # If no configuration found, raise an error
            if not result:
                print(f"CELERY_TASK_FAILED: No tenant configuration found for {tenant_schema}")
                return f"Error: No tenant configuration found for {tenant_schema}"
                
            # Reset onboarding status to false before starting
            cursor.execute(
                """UPDATE order_management_tenantconfiguration 
                   SET is_onboarding_completed = false, updated_at = NOW() 
                   WHERE tenant_ref = %s""",
                [tenant_schema]
            )
            print(f"CELERY_TASK_INFO: Reset onboarding status for {tenant_schema}")
            
            # Load country and currency data before running seeder logic
            print(f"CELERY_TASK_INFO: Loading country and currency data for schema {tenant_schema}")
            
            try:
                # First, verify if the shared tables exist in tenant schema
                cursor.execute(
                    f"""SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = '{tenant_schema}' 
                        AND table_name = 'shared_country'
                    )"""
                )
                country_table_exists = cursor.fetchone()[0]
                
                cursor.execute(
                    f"""SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = '{tenant_schema}' 
                        AND table_name = 'shared_currency'
                    )"""
                )
                currency_table_exists = cursor.fetchone()[0]
                
                if not country_table_exists:
                    print(f"CELERY_TASK_WARNING: shared_country table does not exist in schema {tenant_schema}")
                
                if not currency_table_exists:
                    print(f"CELERY_TASK_WARNING: shared_currency table does not exist in schema {tenant_schema}")
                
                if country_table_exists:
                    print(f"CELERY_TASK_INFO: Loading country data for schema {tenant_schema}")
                    
                    # Find the country data file
                    country_data_path = os.path.join(
                        settings.BASE_DIR, 
                        'onboarding', 'seeders', 'backups', 
                        'country_data.json'
                    )
                    
                    if os.path.exists(country_data_path):
                        with open(country_data_path, 'r', encoding='utf-8') as f:
                            countries_data = json.load(f)
                            
                            # Get existing country codes to avoid duplicates
                            cursor.execute(f"SELECT iso_code FROM {tenant_schema}.shared_country")
                            existing_codes = {row[0] for row in cursor.fetchall()}
                            
                            # Insert countries that don't exist
                            created_count = 0
                            for country_data in countries_data:
                                if country_data['iso_code'] not in existing_codes:
                                    created_count += 1
                                    
                                    # Use a dictionary comprehension to filter out None values
                                    filtered_data = {k: v for k, v in country_data.items() if v is not None}
                                    
                                    # Add timestamps
                                    filtered_data['created_at'] = 'NOW()'
                                    filtered_data['updated_at'] = 'NOW()'
                                    
                                    # Separate NOW() functions from other values
                                    fields = []
                                    values = []
                                    placeholders = []
                                    
                                    for field, value in filtered_data.items():
                                        fields.append(field)
                                        if value == 'NOW()':
                                            placeholders.append('NOW()')
                                        else:
                                            placeholders.append('%s')
                                            values.append(value)
                                    
                                    fields_str = ", ".join(fields)
                                    placeholders_str = ", ".join(placeholders)
                                    
                                    try:
                                        cursor.execute(
                                            f"""INSERT INTO {tenant_schema}.shared_country 
                                               ({fields_str}) VALUES ({placeholders_str})""",
                                            values
                                        )
                                    except Exception as ex:
                                        print(f"CELERY_TASK_ERROR: Failed to insert country {country_data['iso_code']}: {ex}")
                            
                            print(f"CELERY_TASK_INFO: {created_count} countries added to schema {tenant_schema}")
                    else:
                        print(f"CELERY_TASK_WARNING: Country data file not found: {country_data_path}")
                
                if currency_table_exists:
                    print(f"CELERY_TASK_INFO: Loading currency data for schema {tenant_schema}")
                    
                    # Find the currency data file
                    currency_files = [f for f in Path(settings.BASE_DIR, 'onboarding', 'seeders', 'backups').glob('currency_backup_*.json')]
                    
                    if currency_files:
                        # Use the most recent file
                        currency_data_path = str(max(currency_files))
                        
                        with open(currency_data_path, 'r', encoding='utf-8') as f:
                            currencies_data = json.load(f)
                            
                            # Get existing currency codes to avoid duplicates
                            cursor.execute(f"SELECT code FROM {tenant_schema}.shared_currency")
                            existing_codes = {row[0] for row in cursor.fetchall()}
                            
                            # Insert currencies that don't exist
                            created_count = 0
                            for currency_data in currencies_data:
                                if currency_data['code'] not in existing_codes:
                                    created_count += 1
                                    
                                    # Use a dictionary comprehension to filter out None values
                                    filtered_data = {k: v for k, v in currency_data.items() if v is not None}
                                    
                                    # Add timestamps
                                    filtered_data['created_at'] = 'NOW()'
                                    filtered_data['updated_at'] = 'NOW()'
                                    
                                    # Separate NOW() functions from other values
                                    fields = []
                                    values = []
                                    placeholders = []
                                    
                                    for field, value in filtered_data.items():
                                        fields.append(field)
                                        if value == 'NOW()':
                                            placeholders.append('NOW()')
                                        else:
                                            placeholders.append('%s')
                                            values.append(value)
                                    
                                    fields_str = ", ".join(fields)
                                    placeholders_str = ", ".join(placeholders)
                                    
                                    try:
                                        cursor.execute(
                                            f"""INSERT INTO {tenant_schema}.shared_currency 
                                               ({fields_str}) VALUES ({placeholders_str})""",
                                            values
                                        )
                                    except Exception as ex:
                                        print(f"CELERY_TASK_ERROR: Failed to insert currency {currency_data['code']}: {ex}")
                            
                            print(f"CELERY_TASK_INFO: {created_count} currencies added to schema {tenant_schema}")
                    else:
                        print(f"CELERY_TASK_WARNING: No currency data files found")
                        
                print(f"CELERY_TASK_INFO: Reference data loading completed for schema {tenant_schema}")
            
            except Exception as e:
                print(f"CELERY_TASK_ERROR: Failed to load reference data for {tenant_schema}. Error: {e}")
            
            # Step 6: Run the seeder logic
            print(f"Starting seeding process for schema {tenant_schema}")
            run_tenant_seeding(industry, region, tenant_schema)
            
            # Step 5: Mark onboarding as completed in TenantConfiguration table
            cursor.execute(
                """UPDATE order_management_tenantconfiguration 
                   SET is_onboarding_completed = true, updated_at = NOW() 
                   WHERE tenant_ref = %s""",
                [tenant_schema]
            )
            
        print(f"CELERY_TASK_SUCCESS: Onboarding for schema '{tenant_schema}' complete.")
        return f"Onboarding complete for {tenant_schema}"

    except Exception as e:
        print(f"CELERY_TASK_FAILED: An unexpected error occurred for schema={tenant_schema}. Error: {e}")
        print(f"CELERY_TASK_FAILED: Task will not be retried. Error: {e}")
        raise
    finally:
        # Reset to public schema
        with connection.cursor() as cursor:
            cursor.execute('SET search_path TO public')


def trigger_onboarding(tenant_schema, industry, region):
    """
    A helper function to enqueue the onboarding task using Celery.
    
    Args:
        tenant_schema (str): Schema name for the tenant
        industry (str): Industry type for the tenant (e.g., 'fashion', 'electronics')
        region (str): Geographic region for the tenant
    """
    print(f"Enqueuing onboarding task via Celery for schema={tenant_schema}")
    onboard_new_tenant_task.delay(
        tenant_schema,
        industry,
        region
    )
