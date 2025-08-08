"""
Script to execute SQL commands to add tenant fields to ecomm_inventory tables.
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
    with open(file_path, 'r') as f:
        sql_commands = f.read()
    
    # Split commands by semicolon
    commands = sql_commands.split(';')
    
    with connection.cursor() as cursor:
        for command in commands:
            # Skip empty commands
            if command.strip():
                print(f"Executing: {command.strip()}")
                try:
                    cursor.execute(command)
                    print("Command executed successfully.")
                except Exception as e:
                    print(f"Error executing command: {e}")

if __name__ == '__main__':
    sql_file_path = 'fix_invoice_columns.sql'
    execute_sql_file(sql_file_path)
    print("Invoice table column fix script execution completed.")
