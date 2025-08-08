"""
Script to check if client_id and company_id fields exist in ecomm_inventory tables.
"""
import os
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_backend.settings')
django.setup()

# Import Django modules
from django.db import connection

def check_table_columns(table_name):
    """Check if client_id and company_id columns exist in a table."""
    with connection.cursor() as cursor:
        cursor.execute(f"""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = '{table_name}'
            AND table_schema = 'public'
        """)
        columns = [row[0] for row in cursor.fetchall()]
        
        print(f"\nTable: {table_name}")
        print(f"Columns: {', '.join(columns)}")
        print(f"client_id exists: {'client_id' in columns}")
        print(f"company_id exists: {'company_id' in columns}")

if __name__ == '__main__':
    # List of tables to check
    tables = [
        'ecomm_inventory_fulfillmentlocation',
        'ecomm_inventory_adjustmentreason',
        'ecomm_inventory_inventory',
        'ecomm_inventory_serializedinventory',
        'ecomm_inventory_lot',
        'ecomm_inventory_inventoryadjustment'
    ]
    
    # Open a file to write results
    with open('field_check_results.txt', 'w') as f:
        for table in tables:
            with connection.cursor() as cursor:
                cursor.execute(f"""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = '{table}'
                    AND table_schema = 'public'
                """)
                columns = [row[0] for row in cursor.fetchall()]
                
                f.write(f"\nTable: {table}\n")
                f.write(f"Columns: {', '.join(columns)}\n")
                f.write(f"client_id exists: {'client_id' in columns}\n")
                f.write(f"company_id exists: {'company_id' in columns}\n")
    
    print("Results written to field_check_results.txt")
