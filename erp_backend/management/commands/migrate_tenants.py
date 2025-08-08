from django.core.management.base import BaseCommand
from django.db import connection, transaction
from django.core.management import call_command
from django.conf import settings

class Command(BaseCommand):
    help = 'Run migrations for all tenant schemas'

    def create_schema_if_not_exists(self, schema_name):
        with connection.cursor() as cursor:
            # First check if schema exists
            cursor.execute(
                "SELECT schema_name FROM information_schema.schemata WHERE schema_name = %s",
                [schema_name])
            
            exists = cursor.fetchone() is not None
            
            if not exists:
                cursor.execute(f'CREATE SCHEMA "{schema_name}"')
                # Wait for schema to be fully created
                cursor.execute('COMMIT')
                self.stdout.write(f"Created new schema: {schema_name}")

    def migrate_shared_apps(self):
        """Migrate shared apps in public schema"""
        self.stdout.write("\nMigrating shared apps in public schema...")
        with connection.cursor() as cursor:
            cursor.execute('SET search_path TO public')
            for app in settings.SHARED_APPS:
                if app.startswith('django.') or app in ['rest_framework', 'corsheaders', 'django_filters']:
                    app_name = app.split('.')[-1]
                    self.stdout.write(f"  Migrating shared app {app_name}...")
                    try:
                        call_command('migrate', app_name, interactive=False, verbosity=0)
                    except Exception as e:
                        self.stdout.write(f"    Warning: {str(e)}")

    def ensure_auth_tables(self, schema):
        """Ensure auth tables exist and are properly set up"""
        with connection.cursor() as cursor:
            cursor.execute(f'SET search_path TO "{schema}"')
            # First check if auth_user exists
            cursor.execute(
                "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = %s AND table_name = 'auth_user')",
                [schema])
            
            has_auth = cursor.fetchone()[0]
            
            if not has_auth:
                self.stdout.write(f"Creating auth tables in schema {schema}...")
                # Create tables in the correct order
                tables = [
                    # First create independent tables
                    (
                        "CREATE TABLE django_migrations ("
                        "    id SERIAL PRIMARY KEY,"
                        "    app VARCHAR(255) NOT NULL,"
                        "    name VARCHAR(255) NOT NULL,"
                        "    applied TIMESTAMP NOT NULL"
                        ");",
                        "django_migrations"
                    ),
                    (
                        "CREATE TABLE django_content_type ("
                        "    id SERIAL PRIMARY KEY,"
                        "    app_label VARCHAR(100) NOT NULL,"
                        "    model VARCHAR(100) NOT NULL,"
                        "    CONSTRAINT django_content_type_app_label_model_key UNIQUE (app_label, model)"
                        ");",
                        "django_content_type"
                    ),
                    (
                        "CREATE TABLE auth_permission ("
                        "    id SERIAL PRIMARY KEY,"
                        "    name VARCHAR(255) NOT NULL,"
                        "    content_type_id INTEGER NOT NULL,"
                        "    codename VARCHAR(100) NOT NULL,"
                        "    CONSTRAINT auth_permission_content_type_id_codename_key UNIQUE (content_type_id, codename),"
                        "    CONSTRAINT auth_permission_content_type_id_fkey FOREIGN KEY (content_type_id)"
                        "        REFERENCES django_content_type (id) DEFERRABLE INITIALLY DEFERRED"
                        ");",
                        "auth_permission"
                    ),
                    (
                        "CREATE TABLE auth_user ("
                        "    id SERIAL PRIMARY KEY,"
                        "    password VARCHAR(128) NOT NULL,"
                        "    last_login TIMESTAMP WITH TIME ZONE NULL,"
                        "    is_superuser BOOLEAN NOT NULL,"
                        "    username VARCHAR(150) NOT NULL UNIQUE,"
                        "    first_name VARCHAR(150) NOT NULL,"
                        "    last_name VARCHAR(150) NOT NULL,"
                        "    email VARCHAR(254) NOT NULL,"
                        "    is_staff BOOLEAN NOT NULL,"
                        "    is_active BOOLEAN NOT NULL,"
                        "    date_joined TIMESTAMP WITH TIME ZONE NOT NULL"
                        ");",
                        "auth_user"
                    ),
                    (
                        "CREATE TABLE auth_group ("
                        "    id SERIAL PRIMARY KEY,"
                        "    name VARCHAR(150) NOT NULL UNIQUE"
                        ");",
                        "auth_group"
                    )
                ]
                
                # Create tables one by one if they don't exist
                for sql, table_name in tables:
                    # Check if table exists
                    cursor.execute(
                        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = %s AND table_name = %s)",
                        [schema, table_name])
                    if not cursor.fetchone()[0]:
                        cursor.execute(sql)
                        # Verify table was created
                        cursor.execute(
                            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = %s AND table_name = %s)",
                            [schema, table_name])
                        if not cursor.fetchone()[0]:
                            raise Exception(f"Failed to create {table_name} table")
                
                # Now create tables with foreign keys
                fk_tables = [
                    (
                        "CREATE TABLE auth_group_permissions ("
                        "    id SERIAL PRIMARY KEY,"
                        "    group_id INTEGER NOT NULL,"
                        "    permission_id INTEGER NOT NULL,"
                        "    CONSTRAINT auth_group_permissions_group_id_permission_id_key UNIQUE (group_id, permission_id),"
                        "    CONSTRAINT auth_group_permissions_group_id_fkey FOREIGN KEY (group_id)"
                        "        REFERENCES auth_group (id) DEFERRABLE INITIALLY DEFERRED,"
                        "    CONSTRAINT auth_group_permissions_permission_id_fkey FOREIGN KEY (permission_id)"
                        "        REFERENCES auth_permission (id) DEFERRABLE INITIALLY DEFERRED"
                        ");",
                        "auth_group_permissions"
                    ),
                    (
                        "CREATE TABLE auth_user_groups ("
                        "    id SERIAL PRIMARY KEY,"
                        "    user_id INTEGER NOT NULL,"
                        "    group_id INTEGER NOT NULL,"
                        "    CONSTRAINT auth_user_groups_user_id_group_id_key UNIQUE (user_id, group_id),"
                        "    CONSTRAINT auth_user_groups_user_id_fkey FOREIGN KEY (user_id)"
                        "        REFERENCES auth_user (id) DEFERRABLE INITIALLY DEFERRED,"
                        "    CONSTRAINT auth_user_groups_group_id_fkey FOREIGN KEY (group_id)"
                        "        REFERENCES auth_group (id) DEFERRABLE INITIALLY DEFERRED"
                        ");",
                        "auth_user_groups"
                    ),
                    (
                        "CREATE TABLE auth_user_user_permissions ("
                        "    id SERIAL PRIMARY KEY,"
                        "    user_id INTEGER NOT NULL,"
                        "    permission_id INTEGER NOT NULL,"
                        "    CONSTRAINT auth_user_user_permissions_user_id_permission_id_key UNIQUE (user_id, permission_id),"
                        "    CONSTRAINT auth_user_user_permissions_user_id_fkey FOREIGN KEY (user_id)"
                        "        REFERENCES auth_user (id) DEFERRABLE INITIALLY DEFERRED,"
                        "    CONSTRAINT auth_user_user_permissions_permission_id_fkey FOREIGN KEY (permission_id)"
                        "        REFERENCES auth_permission (id) DEFERRABLE INITIALLY DEFERRED"
                        ");",
                        "auth_user_user_permissions"
                    )
                ]
                
                for sql, table_name in fk_tables:
                    # Check if table exists
                    cursor.execute(
                        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = %s AND table_name = %s)",
                        [schema, table_name])
                    if not cursor.fetchone()[0]:
                        cursor.execute(sql)
                        # Verify table was created
                        cursor.execute(
                            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = %s AND table_name = %s)",
                            [schema, table_name])
                        if not cursor.fetchone()[0]:
                            raise Exception(f"Failed to create {table_name} table")
                
                cursor.execute('COMMIT')
                self.stdout.write("Auth tables created successfully")

    def migrate_tenant_apps(self, schema):
        """Migrate tenant-specific apps in the given schema"""
        self.stdout.write(f"\nMigrating tenant apps in schema: {schema}")
        
        # Create schema if it doesn't exist
        self.create_schema_if_not_exists(schema)
        
        # Ensure auth tables exist before migrations
        self.ensure_auth_tables(schema)
        
        try:
            # Set search path to tenant schema
            with connection.cursor() as cursor:
                cursor.execute(f'SET search_path TO "{schema}"')
                
                # Create essential tables first
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS django_migrations (
                        id SERIAL PRIMARY KEY,
                        app VARCHAR(255) NOT NULL,
                        name VARCHAR(255) NOT NULL,
                        applied TIMESTAMP NOT NULL
                    );
                """)
                
                # Create django_content_type table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS django_content_type (
                        id SERIAL PRIMARY KEY,
                        app_label VARCHAR(100) NOT NULL,
                        model VARCHAR(100) NOT NULL,
                        CONSTRAINT django_content_type_app_label_model_key UNIQUE (app_label, model)
                    );
                """)
                
                # Create auth_permission table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS auth_permission (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(255) NOT NULL,
                        content_type_id INTEGER NOT NULL,
                        codename VARCHAR(100) NOT NULL,
                        CONSTRAINT auth_permission_content_type_id_codename_key UNIQUE (content_type_id, codename),
                        CONSTRAINT auth_permission_content_type_id_fkey FOREIGN KEY (content_type_id)
                            REFERENCES django_content_type (id) DEFERRABLE INITIALLY DEFERRED
                    );
                """)

                # Create auth_user table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS auth_user (
                        id SERIAL PRIMARY KEY,
                        password VARCHAR(128) NOT NULL,
                        last_login TIMESTAMP WITH TIME ZONE NULL,
                        is_superuser BOOLEAN NOT NULL,
                        username VARCHAR(150) NOT NULL UNIQUE,
                        first_name VARCHAR(150) NOT NULL,
                        last_name VARCHAR(150) NOT NULL,
                        email VARCHAR(254) NOT NULL,
                        is_staff BOOLEAN NOT NULL,
                        is_active BOOLEAN NOT NULL,
                        date_joined TIMESTAMP WITH TIME ZONE NOT NULL
                    );
                """)

                # Create auth_group table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS auth_group (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(150) NOT NULL UNIQUE
                    );
                """)

                # Create auth_group_permissions table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS auth_group_permissions (
                        id SERIAL PRIMARY KEY,
                        group_id INTEGER NOT NULL,
                        permission_id INTEGER NOT NULL,
                        CONSTRAINT auth_group_permissions_group_id_permission_id_key UNIQUE (group_id, permission_id),
                        CONSTRAINT auth_group_permissions_group_id_fkey FOREIGN KEY (group_id)
                            REFERENCES auth_group (id) DEFERRABLE INITIALLY DEFERRED,
                        CONSTRAINT auth_group_permissions_permission_id_fkey FOREIGN KEY (permission_id)
                            REFERENCES auth_permission (id) DEFERRABLE INITIALLY DEFERRED
                    );
                """)

                # Create auth_user_groups table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS auth_user_groups (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL,
                        group_id INTEGER NOT NULL,
                        CONSTRAINT auth_user_groups_user_id_group_id_key UNIQUE (user_id, group_id),
                        CONSTRAINT auth_user_groups_user_id_fkey FOREIGN KEY (user_id)
                            REFERENCES auth_user (id) DEFERRABLE INITIALLY DEFERRED,
                        CONSTRAINT auth_user_groups_group_id_fkey FOREIGN KEY (group_id)
                            REFERENCES auth_group (id) DEFERRABLE INITIALLY DEFERRED
                    );
                """)

                # Create auth_user_user_permissions table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS auth_user_user_permissions (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL,
                        permission_id INTEGER NOT NULL,
                        CONSTRAINT auth_user_user_permissions_user_id_permission_id_key UNIQUE (user_id, permission_id),
                        CONSTRAINT auth_user_user_permissions_user_id_fkey FOREIGN KEY (user_id)
                            REFERENCES auth_user (id) DEFERRABLE INITIALLY DEFERRED,
                        CONSTRAINT auth_user_user_permissions_permission_id_fkey FOREIGN KEY (permission_id)
                            REFERENCES auth_permission (id) DEFERRABLE INITIALLY DEFERRED
                    );
                """)

            # First migrate auth and contenttypes
            core_apps = ['contenttypes', 'auth']
            for app in core_apps:
                self.stdout.write(f"  Migrating core app {app}...")
                try:
                    # Ensure we're in the right schema before each migration
                    with connection.cursor() as cursor:
                        cursor.execute(f'SET search_path TO "{schema}"')
                    call_command('migrate', app, interactive=False, verbosity=0)
                except Exception as e:
                    self.stdout.write(f"    Warning: {str(e)}")
                    raise  # Re-raise to trigger rollback

            # Then migrate other tenant apps
            for app in settings.TENANT_APPS:
                # Skip already migrated apps
                if app in ['django.contrib.auth', 'django.contrib.contenttypes']:
                    continue

                if app.startswith('role_management'):
                    app_name = 'role_controles'
                else:
                    app_name = app.split('.')[-1]
                
                self.stdout.write(f"  Migrating tenant app {app_name}...")
                try:
                    call_command('migrate', app_name, interactive=False, verbosity=0)
                except Exception as e:
                    self.stdout.write(f"    Warning: {str(e)}")
                    raise  # Re-raise to trigger rollback

            self.stdout.write(f"  Successfully migrated schema: {schema}")
        except Exception as e:
            self.stdout.write(f"  Error migrating schema {schema}: {str(e)}")
            # Rollback any pending transactions
            connection.rollback()
            raise
        finally:
            # Reset search path to public
            with connection.cursor() as cursor:
                cursor.execute('SET search_path TO public')

    def handle(self, *args, **options):
        # First migrate shared apps in public schema
        self.migrate_shared_apps()

        # Get all tenant schemas
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT schema_name 
                FROM information_schema.schemata 
                WHERE schema_name != 'public' 
                AND schema_name != 'information_schema' 
                AND schema_name NOT LIKE 'pg_%';
            """)
            schemas = [row[0] for row in cursor.fetchall()]

        if not schemas:
            self.stdout.write("No tenant schemas found")
            return

        self.stdout.write(f"Found {len(schemas)} tenant schemas")

        # Migrate tenant apps in each schema
        for schema in schemas:
            self.migrate_tenant_apps(schema)

        self.stdout.write("\nMigration complete!")