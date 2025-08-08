"""
Script to execute multiple SQL files to add tenant fields to ecomm_inventory tables.
"""
import os
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_backend.settings')
django.setup()

# Import Django modules
from django.db import connection

def execute_sql_file(file_path):
    """Execute SQL commands from a file."""
    print(f"\nExecuting SQL file: {file_path}")
    with open(file_path, 'r') as f:
        sql_commands = f.read()
    
    with connection.cursor() as cursor:
        try:
            cursor.execute(sql_commands)
            print(f"SQL file {file_path} executed successfully.")
        except Exception as e:
            print(f"Error executing {file_path}: {e}")

if __name__ == '__main__':
    # List of SQL files to execute
    sql_files = [
        'add_tenant_fields_inventory.sql',
        'add_tenant_fields_serialized.sql',
        'add_tenant_fields_lot.sql',
        'add_tenant_fields_adjustment.sql',
        'add_tenant_fk_constraints.sql'
    ]
    
    # Execute each SQL file
    for sql_file in sql_files:
        execute_sql_file(sql_file)
    
    print("\nSQL script execution completed.")
