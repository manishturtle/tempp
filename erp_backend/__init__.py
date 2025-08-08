"""
ERP Backend Django project initialization.

This module initializes the Django project and sets up the Celery app.
"""
# Import the Celery app instance
from erp_backend.celery import app as celery_app

# Make the Celery app available at the module level
__all__ = ['celery_app']
