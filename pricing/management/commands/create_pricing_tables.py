"""
Management command to create pricing tables directly in the database.

This command creates the necessary tables for the pricing app and marks
the migrations as applied in Django's migration history.
"""
from django.core.management.base import BaseCommand
from django.db import connection
from django.utils import timezone

class Command(BaseCommand):
    help = 'Creates pricing tables directly in the database and marks migrations as applied'

    def handle(self, *args, **options):
        self.stdout.write('Creating pricing tables...')
        
        try:
            # Create tables
            with connection.cursor() as cursor:
                # CustomerGroup table
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS pricing_customergroup (
                        id SERIAL PRIMARY KEY,
                        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
                        updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
                        company_id INTEGER NOT NULL,
                        name VARCHAR(100) NOT NULL,
                        is_active BOOLEAN NOT NULL,
                        created_by_id INTEGER NULL,
                        client_id INTEGER NOT NULL,
                        updated_by_id INTEGER NULL
                    )
                ''')
                
                # SellingChannel table
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS pricing_sellingchannel (
                        id SERIAL PRIMARY KEY,
                        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
                        updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
                        company_id INTEGER NOT NULL,
                        name VARCHAR(100) NOT NULL,
                        code VARCHAR(20) NOT NULL,
                        is_active BOOLEAN NOT NULL,
                        created_by_id INTEGER NULL,
                        client_id INTEGER NOT NULL,
                        updated_by_id INTEGER NULL
                    )
                ''')
                
                # TaxRegion table
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS pricing_taxregion (
                        id SERIAL PRIMARY KEY,
                        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
                        updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
                        company_id INTEGER NOT NULL,
                        name VARCHAR(100) NOT NULL,
                        code VARCHAR(50) NOT NULL,
                        is_active BOOLEAN NOT NULL,
                        created_by_id INTEGER NULL,
                        client_id INTEGER NOT NULL,
                        updated_by_id INTEGER NULL
                    )
                ''')
                
                # TaxRegion_countries table (many-to-many)
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS pricing_taxregion_countries (
                        id SERIAL PRIMARY KEY,
                        taxregion_id INTEGER NOT NULL,
                        country_id VARCHAR(2) NOT NULL
                    )
                ''')
                
                # TaxRate table
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS pricing_taxrate (
                        id SERIAL PRIMARY KEY,
                        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
                        updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
                        company_id INTEGER NOT NULL,
                        category_id INTEGER NULL,
                        tax_type VARCHAR(50) NOT NULL,
                        tax_code VARCHAR(50) NOT NULL,
                        tax_percentage NUMERIC(5, 2) NOT NULL,
                        price_from NUMERIC(12, 2) NULL,
                        price_to NUMERIC(12, 2) NULL,
                        is_active BOOLEAN NOT NULL,
                        created_by_id INTEGER NULL,
                        client_id INTEGER NOT NULL,
                        updated_by_id INTEGER NULL,
                        tax_region_id INTEGER NOT NULL
                    )
                ''')
                
                # TaxRateProfile table
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS pricing_taxrateprofile (
                        id SERIAL PRIMARY KEY,
                        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
                        updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
                        company_id INTEGER NOT NULL,
                        name VARCHAR(100) NOT NULL,
                        is_active BOOLEAN NOT NULL,
                        created_by_id INTEGER NULL,
                        client_id INTEGER NOT NULL,
                        updated_by_id INTEGER NULL
                    )
                ''')
                
                # TaxRateProfile_tax_rates table (many-to-many)
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS pricing_taxrateprofile_tax_rates (
                        id SERIAL PRIMARY KEY,
                        taxrateprofile_id INTEGER NOT NULL,
                        taxrate_id INTEGER NOT NULL
                    )
                ''')
                
                # Add constraints and indexes
                # CustomerGroup constraints
                cursor.execute('''
                    ALTER TABLE pricing_customergroup 
                    ADD CONSTRAINT pricing_customergroup_client_id_name_unique 
                    UNIQUE (client_id, name)
                ''')
                
                # SellingChannel constraints
                cursor.execute('''
                    ALTER TABLE pricing_sellingchannel 
                    ADD CONSTRAINT pricing_sellingchannel_client_id_name_unique 
                    UNIQUE (client_id, name)
                ''')
                
                # TaxRegion constraints
                cursor.execute('''
                    ALTER TABLE pricing_taxregion 
                    ADD CONSTRAINT pricing_taxregion_client_id_name_unique 
                    UNIQUE (client_id, name)
                ''')
                
                # TaxRateProfile constraints
                cursor.execute('''
                    ALTER TABLE pricing_taxrateprofile 
                    ADD CONSTRAINT pricing_taxrateprofile_client_id_name_unique 
                    UNIQUE (client_id, name)
                ''')
                
                # Mark the migration as applied in Django's migration history
                now = timezone.now().isoformat()
                cursor.execute(
                    "INSERT INTO django_migrations (app, name, applied) VALUES (%s, %s, %s)",
                    ['pricing', '0001_initial', now]
                )
            
            self.stdout.write(self.style.SUCCESS('Successfully created pricing tables and marked migrations as applied'))
        
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error creating pricing tables: {str(e)}'))
            raise
