"""
Management command to reset the ID sequences for pricing tables.

This command resets the auto-incrementing ID sequences for pricing tables
to ensure that new records use the next available ID after the maximum existing ID.
"""
from django.core.management.base import BaseCommand
from django.db import connection
from pricing.models import CustomerGroup, SellingChannel, TaxRegion, TaxRate, TaxRateProfile


class Command(BaseCommand):
    help = 'Reset ID sequences for pricing tables'

    def handle(self, *args, **options):
        models = [
            CustomerGroup,
            SellingChannel,
            TaxRegion,
            TaxRate,
            TaxRateProfile
        ]

        for model in models:
            table_name = model._meta.db_table
            self.reset_sequence(table_name)
            self.stdout.write(self.style.SUCCESS(f'Reset sequence for {table_name}'))

    def reset_sequence(self, table_name):
        """
        Reset the ID sequence for a table to the next value after the maximum ID.
        If the table is empty, reset to 1.
        """
        with connection.cursor() as cursor:
            # Get the maximum ID from the table
            cursor.execute(f"SELECT MAX(id) FROM {table_name}")
            max_id = cursor.fetchone()[0]
            
            # If there are no records, set the next ID to 1
            next_id = max_id + 1 if max_id else 1
            
            # Reset the sequence
            if connection.vendor == 'postgresql':
                cursor.execute(f"ALTER SEQUENCE {table_name}_id_seq RESTART WITH {next_id}")
            elif connection.vendor == 'sqlite':
                # SQLite doesn't have sequences, but we can update the sqlite_sequence table
                cursor.execute(f"UPDATE sqlite_sequence SET seq = {next_id - 1} WHERE name = '{table_name}'")
            elif connection.vendor == 'mysql':
                cursor.execute(f"ALTER TABLE {table_name} AUTO_INCREMENT = {next_id}")
