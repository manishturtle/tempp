"""
Celery configuration for the ERP backend.

This module configures Celery for asynchronous task processing in the Django application.
It sets up the Celery app instance and configures it to auto-discover tasks in all installed apps.
"""
import os
import eventlet

if os.environ.get("RUNNING_CELERY_WITH_EVENTLET") == "true":
    print("*** Applying Eventlet monkey patch (Conditional in celery.py) ***")
    try:
        eventlet.monkey_patch()
        print("*** Eventlet monkey patch applied successfully (from celery.py) ***")
    except Exception as e:
        print(f"!!! Failed to apply Eventlet monkey patch: {e} !!!")
else:
    print()
# --- End: Monkey Patching Logic ---

from celery import Celery
from celery.schedules import crontab
from datetime import timedelta
from django.conf import settings

# Set the default Django settings module for the 'celery' program
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_backend.settings')

# Create the Celery app instance
app = Celery('erp_backend')

# Load configuration from Django settings using the namespace 'CELERY'
# This means all celery-related settings should have the prefix 'CELERY_'
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks in all installed apps
app.autodiscover_tasks(lambda: settings.INSTALLED_APPS)

# Configure periodic tasks
app.conf.beat_schedule = {
    'cleanup-temp-uploads-daily': {
        'task': 'products.tasks.cleanup_temporary_uploads',
        'schedule': crontab(hour=3, minute=0),  # Run daily at 3 AM
        'options': {'expires': 3600}  # Task expires after 1 hour
    },
    'expire-loyalty-points-daily': {
        'task': 'expire_loyalty_points',
        'schedule': crontab(hour=1, minute=0),  # Run daily at 1 AM
        'options': {'expires': 7200}  # Task expires after 2 hours
    },
    'cancel-expired-pending-orders-hourly': {
        'task': 'cancel_expired_pending_orders',
        'schedule': timedelta(hours=1),  # Run every hour
        'options': {'expires': 3600}  # Task expires after 1 hour
    },
}


@app.task(bind=True)
def debug_task(self):
    """
    Debug task to verify Celery is working correctly.
    
    This task simply prints information about the request to help with debugging.
    """
    print(f'Request: {self.request!r}')
