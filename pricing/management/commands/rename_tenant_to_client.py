"""
Management command to rename tenant_id to client_id in pricing tables.

This command updates the database schema to rename the tenant_id column to client_id
in all pricing tables.
"""
from django.core.management.base import BaseCommand
from django.db import connection

class Command(BaseCommand):
    help = 'Renames tenant_id column to client_id in pricing tables'

    def handle(self, *args, **options):
        self.stdout.write('Renaming tenant_id to client_id in pricing tables...')
        
        try:
            with connection.cursor() as cursor:
                # Check if the tables exist and have tenant_id column
                pricing_tables = [
                    'pricing_customergroup',
                    'pricing_sellingchannel',
                    'pricing_taxregion',
                    'pricing_taxrate',
                    'pricing_taxrateprofile'
                ]
                
                for table in pricing_tables:
                    # Check if the table exists
                    cursor.execute(f"""
                        SELECT EXISTS (
                            SELECT FROM information_schema.tables 
                            WHERE table_name = %s
                        )
                    """, [table])
                    table_exists = cursor.fetchone()[0]
                    
                    if not table_exists:
                        self.stdout.write(self.style.WARNING(f"Table {table} does not exist, skipping..."))
                        continue
                    
                    # Check if tenant_id column exists
                    cursor.execute(f"""
                        SELECT EXISTS (
                            SELECT FROM information_schema.columns 
                            WHERE table_name = %s AND column_name = 'tenant_id'
                        )
                    """, [table])
                    tenant_id_exists = cursor.fetchone()[0]
                    
                    if not tenant_id_exists:
                        self.stdout.write(self.style.WARNING(f"Column tenant_id does not exist in {table}, skipping..."))
                        continue
                    
                    # Check if client_id column already exists
                    cursor.execute(f"""
                        SELECT EXISTS (
                            SELECT FROM information_schema.columns 
                            WHERE table_name = %s AND column_name = 'client_id'
                        )
                    """, [table])
                    client_id_exists = cursor.fetchone()[0]
                    
                    if client_id_exists:
                        self.stdout.write(self.style.WARNING(f"Column client_id already exists in {table}, skipping..."))
                        continue
                    
                    # Rename tenant_id to client_id
                    self.stdout.write(f"Renaming tenant_id to client_id in {table}...")
                    cursor.execute(f"ALTER TABLE {table} RENAME COLUMN tenant_id TO client_id")
                    
                    # Find constraints that reference tenant_id and rename them
                    cursor.execute(f"""
                        SELECT constraint_name
                        FROM information_schema.constraint_column_usage
                        WHERE table_name = %s AND column_name = 'client_id'
                    """, [table])
                    constraints = cursor.fetchall()
                    
                    for constraint in constraints:
                        old_constraint_name = constraint[0]
                        if 'tenant' in old_constraint_name:
                            new_constraint_name = old_constraint_name.replace('tenant', 'client')
                            self.stdout.write(f"Renaming constraint {old_constraint_name} to {new_constraint_name}...")
                            cursor.execute(f"""
                                ALTER TABLE {table} 
                                RENAME CONSTRAINT {old_constraint_name} TO {new_constraint_name}
                            """)
            
            self.stdout.write(self.style.SUCCESS('Successfully renamed tenant_id to client_id in pricing tables'))
        
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error renaming columns: {str(e)}'))
            raise
