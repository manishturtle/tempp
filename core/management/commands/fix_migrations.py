from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = 'Fixes migration conflicts in the products app by directly updating the django_migrations table'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting migration fix process...'))
        
        with connection.cursor() as cursor:
            # Check if the problematic migrations exist
            cursor.execute(
                "SELECT COUNT(*) FROM django_migrations WHERE app = 'products' AND name = '0007_remove_category_org_id_remove_division_org_id_and_more'"
            )
            count = cursor.fetchone()[0]
            
            if count == 0:
                self.stdout.write(self.style.WARNING('Migration 0007 not found, marking it as applied...'))
                cursor.execute(
                    "INSERT INTO django_migrations (app, name, applied) VALUES (%s, %s, NOW())",
                    ['products', '0007_remove_category_org_id_remove_division_org_id_and_more']
                )
            
            # Mark all potentially conflicting migrations as applied
            problematic_migrations = [
                '0009_fix_company_id_and_remove_org_id',
                '0010_clean_start',
                '0011_force_clean',
                '0012_merge',
                '0013_force_migrate',
                '0014_force_reset',
                '0015_final_fix',
                '0016_force_clean',
                '0017_force_reset',
                '0018_force_fix',
                '0019_fix_client_id',
                '0020_force_client_id',
                '0021_merge',
                '0022_force_reset',
                '0023_final_fix',
                '0024_force_clean',
                '0025_merge_20250328_1424',
                '0026_manual_fix'
            ]
            
            for migration in problematic_migrations:
                cursor.execute(
                    "SELECT COUNT(*) FROM django_migrations WHERE app = 'products' AND name = %s",
                    [migration]
                )
                count = cursor.fetchone()[0]
                
                if count == 0:
                    self.stdout.write(f'Marking migration {migration} as applied...')
                    cursor.execute(
                        "INSERT INTO django_migrations (app, name, applied) VALUES (%s, %s, NOW())",
                        ['products', migration]
                    )
            
            self.stdout.write(self.style.SUCCESS('Migration fix process completed successfully!'))
            self.stdout.write(self.style.WARNING('You should now be able to run migrations normally.'))
