"""
Management command to run migrations for a specific tenant schema.

Example usage:
    python manage.py migrate_tenant --schema=tenant1
    python manage.py migrate_tenant --schema=tenant1 app_name 0001_initial
"""
from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction
from django.db.migrations.executor import MigrationExecutor
from django.db.migrations.autodetector import MigrationAutodetector
from django.db.migrations.state import ProjectState
from django.db.migrations import Migration
import sys

class Command(BaseCommand):
    help = 'Run migrations for a specific tenant schema'

    def add_arguments(self, parser):
        parser.add_argument(
            '--schema',
            dest='schema',
            required=True,
            help='Tenant schema name',
        )
        parser.add_argument(
            'args',
            metavar='app_label [migration_name]',
            nargs='*',
            help='App label and optional migration name',
        )
        parser.add_argument(
            '--fake',
            action='store_true',
            help='Mark migrations as run without actually running them',
        )
        parser.add_argument(
            '--fake-initial',
            action='store_true',
            help='Detect if tables already exist and fake-apply initial migrations',
        )

    def handle(self, *args, **options):
        schema = options['schema']
        app_label = args[0] if len(args) > 0 else None
        migration_name = args[1] if len(args) > 1 else None
        fake = options.get('fake', False)
        fake_initial = options.get('fake_initial', False)
        original_search_path = None

        # First get the current search path
        with connection.cursor() as cursor:
            cursor.execute('SHOW search_path')
            original_search_path = cursor.fetchone()[0]
        
        # Set the schema for this connection
        with connection.cursor() as cursor:
            # Set the search path to the tenant schema and public (required for migrations table)
            cursor.execute(f'SET search_path TO {schema}, public')
            
            # Create the schema if it doesn't exist
            cursor.execute(f'CREATE SCHEMA IF NOT EXISTS {schema}')
        
        try:
            # Run the migration
            self.stdout.write(self.style.SUCCESS(f'Running migrations for schema: {schema}'))
            
            # Import here to avoid circular imports
            from django.core.management.commands import migrate
            
            # Create a custom command that inherits from migrate
            class MigrateTenantCommand(migrate.Command):
                def handle(self, *args, **options):
                    # Override database settings to use our schema
                    options['database'] = 'default'
                    options['fake'] = fake
                    options['fake_initial'] = fake_initial
                    
                    # Call the original migrate command
                    super().handle(*args, **options)
            
            # Prepare arguments for the migrate command
            migrate_args = []
            if app_label:
                migrate_args.append(app_label)
                if migration_name:
                    migrate_args.append(migration_name)
            
            migrate_options = {
                'no_color': options.get('no_color', False),
                'verbosity': options.get('verbosity', 1),
                'settings': options.get('settings', None),
                'pythonpath': options.get('pythonpath', None),
                'traceback': options.get('traceback', False),
                'skip_checks': options.get('skip_checks', True),
            }
            
            # Run the migration
            cmd = MigrateTenantCommand()
            cmd.run_from_argv([sys.argv[0], 'migrate'] + migrate_args)
            
            self.stdout.write(
                self.style.SUCCESS(f'Successfully migrated schema: {schema}')
            )
            
        except Exception as e:
            self.stderr.write(
                self.style.ERROR(f'Error migrating schema {schema}: {str(e)}')
            )
            raise CommandError(str(e))
            
        finally:
            # Always restore the original search path with a new cursor
            if original_search_path:
                with connection.cursor() as cursor:
                    cursor.execute(f'SET search_path TO {original_search_path}')
