"""
Data loader for shared reference data.

This module provides functionality to load reference data from backup files
into the database after migrations.
"""
import json
import os
import logging
from django.conf import settings
from django.db import transaction
from pathlib import Path
from .models import Country, Currency

logger = logging.getLogger(__name__)

# Directory containing backup files
BACKUPS_DIR = Path(__file__).parent

# Default system user ID for audit fields
SYSTEM_USER_ID = 1

def load_countries(system_user_id):
    """
    Load country data from backup file into Country model.
    
    This function reads country data from the backup JSON file and
    loads it into the Country table, skipping existing entries based on iso_code.
    """
    try:
        country_file = BACKUPS_DIR
        logger.info(f"Loading country data from {country_file}")
        
        if not country_file.exists():
            logger.error(f"Country data file not found: {country_file}")
            return
            
        with open(country_file, 'r', encoding='utf-8') as file:
            countries_data = json.load(file)
            
        with transaction.atomic():
            created_count = 0
            updated_count = 0
            
            for country_data in countries_data:
                # Get or create using iso_code as the unique identifier
                country, created = Country.objects.update_or_create(
                    iso_code=country_data['iso_code'],
                    defaults={
                        'name': country_data['name'],
                        'iso_code_3': country_data.get('iso_code_3'),
                        'is_active': country_data.get('is_active', True),
                        'flag_url': country_data.get('flag_url'),
                        'phone_code': country_data.get('phone_code'),
                        'client_id': country_data.get('client_id', 1),
                        'company_id': country_data.get('company_id', 1),
                        # Use system user as default for audit fields if not provided
                        'created_by_id': country_data.get('created_by_id', system_user_id),
                        'updated_by_id': country_data.get('updated_by_id', system_user_id),
                    }
                )
                
                if created:
                    created_count += 1
                else:
                    updated_count += 1
        
        logger.info(f"Loaded country data: {created_count} created, {updated_count} updated")
        
    except Exception as e:
        logger.error(f"Error loading country data: {e}")
        raise


def load_currencies(system_user_id):
    """
    Load currency data from backup file into Currency model.
    
    This function reads currency data from the backup JSON file and
    loads it into the Currency table, skipping existing entries based on code.
    """
    try:
        # Find the most recent currency backup file
        currency_files = [f for f in BACKUPS_DIR.glob('')]
        if not currency_files:
            logger.error("No currency backup files found")
            return
            
        # Use the most recent file based on filename (which includes date)
        currency_file = max(currency_files)
        logger.info(f"Loading currency data from {currency_file}")
        
        with open(currency_file, 'r', encoding='utf-8') as file:
            currencies_data = json.load(file)
            
        with transaction.atomic():
            created_count = 0
            updated_count = 0
            
            for currency_data in currencies_data:
                # Get or create using code as the unique identifier
                currency, created = Currency.objects.update_or_create(
                    code=currency_data['code'],
                    defaults={
                        'name': currency_data['name'],
                        'symbol': currency_data['symbol'],
                        'exchange_rate_to_usd': currency_data.get('exchange_rate_to_usd', 1.0),
                        'is_active': currency_data.get('is_active', True),
                        'client_id': currency_data.get('client_id', 1),
                        'company_id': currency_data.get('company_id', 1),
                        # Use system user as default for audit fields if not provided
                        'created_by_id': currency_data.get('created_by_id', system_user_id),
                        'updated_by_id': currency_data.get('updated_by_id', system_user_id),
                    }
                )
                
                if created:
                    created_count += 1
                else:
                    updated_count += 1
        
        logger.info(f"Loaded currency data: {created_count} created, {updated_count} updated")
        
    except Exception as e:
        logger.error(f"Error loading currency data: {e}")
        raise


def load_all_reference_data():
    """Load all reference data from backup files."""
    logger.info("Starting reference data load process")
    load_countries(SYSTEM_USER_ID)
    load_currencies(SYSTEM_USER_ID)
    logger.info("Completed reference data load process")
