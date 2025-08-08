"""
Management command to fake migrations for the pricing app.

This command marks migrations as applied in the database without actually
running them, which can help resolve migration conflicts.
"""
from django.core.management.base import BaseCommand
from django.db import connection
from django.utils import timezone

class Command(BaseCommand):
    help = 'Marks pricing migrations as applied without running them'

    def handle(self, *args, **options):
        self.stdout.write('Faking pricing migrations...')
        
        try:
            # Mark the migration as applied in Django's migration history
            with connection.cursor() as cursor:
                now = timezone.now().isoformat()
                cursor.execute(
                    "INSERT INTO django_migrations (app, name, applied) VALUES (%s, %s, %s)",
                    ['pricing', '0001_initial', now]
                )
            
            self.stdout.write(self.style.SUCCESS('Successfully marked pricing migrations as applied'))
        
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error faking migrations: {str(e)}'))
            raise
