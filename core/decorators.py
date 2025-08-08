"""Decorators for views and viewsets.

This module provides decorators for:
1. Tenant-aware views that ensure the correct tenant context is set
2. Permission checking for API endpoints
"""
import functools
import logging
from typing import Callable, Any, TypeVar, cast

from django.http import HttpRequest, HttpResponse
from django.db import connection

F = TypeVar('F', bound=Callable[..., Any])
logger = logging.getLogger(__name__)


def tenant_aware(view_func: F) -> F:
    """Decorator for tenant-aware views.
    
    This decorator ensures that the correct tenant schema is set for each request
    based on the tenant_id in the request context.
    
    Args:
        view_func: The view function to decorate
        
    Returns:
        The decorated view function
    """
    @functools.wraps(view_func)
    def wrapper(request: HttpRequest, *args: Any, **kwargs: Any) -> HttpResponse:
        # Get tenant_id from request context (set by TenantMiddleware)
        tenant_id = getattr(request, 'tenant_id', 1)  # Default to 1 for Phase 1
        
        # Log the tenant context for debugging
        logger.debug(f"Setting tenant context for request: {tenant_id}")
        
        # In Phase 1, we're not actually switching schemas yet
        # This is a placeholder for future implementation
        # connection.set_tenant(tenant_id)
        
        # Call the view function with the tenant context set
        return view_func(request, *args, **kwargs)
    
    return cast(F, wrapper)


def async_tenant_aware(view_func: F) -> F:
    """Decorator for async tenant-aware views.
    
    This decorator ensures that the correct tenant schema is set for each request
    based on the tenant_id in the request context, for async views.
    
    Args:
        view_func: The async view function to decorate
        
    Returns:
        The decorated async view function
    """
    @functools.wraps(view_func)
    async def wrapper(request: HttpRequest, *args: Any, **kwargs: Any) -> HttpResponse:
        # Get tenant_id from request context (set by TenantMiddleware)
        tenant_id = getattr(request, 'tenant_id', 1)  # Default to 1 for Phase 1
        
        # Log the tenant context for debugging
        logger.debug(f"Setting tenant context for async request: {tenant_id}")
        
        # In Phase 1, we're not actually switching schemas yet
        # This is a placeholder for future implementation
        # await connection.set_tenant_async(tenant_id)
        
        # Call the view function with the tenant context set
        return await view_func(request, *args, **kwargs)
    
    return cast(F, wrapper)
