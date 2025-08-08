import os
from django.core.wsgi import get_wsgi_application

# Set the DJANGO_SETTINGS_MODULE environment variable
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_backend.settings')

# Initialize Django
application = get_wsgi_application()

from django.db import connection

def update_password():
    with connection.cursor() as cursor:
        cursor.execute("""
            UPDATE ecomm_auth_ecommusercredential 
            SET password = 'pbkdf2_sha256$260000$random_salt$random_hash',
                updated_at = NOW(),
                updated_by_id = 1
            WHERE email = 'yash@gmail.com';
        """)
        print(f"Rows affected: {cursor.rowcount}")

if __name__ == '__main__':
    update_password()
