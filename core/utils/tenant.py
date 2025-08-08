"""
Tenant context utilities.

This module provides utility functions for working with tenant contexts
in a multi-tenant environment.
"""
import logging
from typing import Optional
from django.db import connection
from django.conf import settings

logger = logging.getLogger(__name__)


def set_tenant_context(tenant_id: int) -> None:
    """
    Set the current tenant context for database operations.
    
    In a schema-per-tenant architecture, this function sets the appropriate
    PostgreSQL schema for the given tenant ID.
    
    Args:
        tenant_id: The ID of the tenant to set as the current context
    """
    try:
        # Get the tenant model
        tenant_model = settings.TENANT_MODEL.split('.')[-1].lower()
        
        # For now, just log the tenant context change
        # In a real implementation, this would set the PostgreSQL schema
        logger.info("Setting tenant context to %s ID: %s", tenant_model, tenant_id)
        
        # Example of how to set PostgreSQL schema in a real implementation:
        # with connection.cursor() as cursor:
        #     cursor.execute(f'SET search_path TO tenant_{tenant_id}, public')
        
        # For development/testing, we're just using the default schema
        # with tenant filtering via the client_id field
    except Exception as e:
        logger.exception("Error setting tenant context: %s", str(e))
        raise
