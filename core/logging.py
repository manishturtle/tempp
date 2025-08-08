"""Logging utilities for structured logging and context injection.

This module provides filters and utilities for structured JSON logging,
including tenant, user, and request context injection.
"""
import logging
import threading
import uuid
from typing import Dict, Any, Optional

from django.http import HttpRequest

# Thread-local storage for request context
_thread_locals = threading.local()


def get_current_request() -> Optional[HttpRequest]:
    """Get the current request from thread-local storage.
    
    Returns:
        The current request object if available, None otherwise
    """
    return getattr(_thread_locals, 'request', None)


def get_current_tenant_id() -> Optional[int]:
    """Get the current tenant ID from thread-local storage.
    
    Returns:
        The current tenant ID if available, None otherwise
    """
    request = get_current_request()
    if request:
        return getattr(request, 'tenant_id', 1)  # Default to 1 for Phase 1
    return 1  # Default tenant ID for Phase 1


def get_current_user_id() -> Optional[str]:
    """Get the current user ID from thread-local storage.
    
    Returns:
        The current user ID if available, None otherwise
    """
    request = get_current_request()
    if request and hasattr(request, 'user') and request.user.is_authenticated:
        return str(request.user.id)
    return None


def get_current_request_id() -> Optional[str]:
    """Get the current request ID from thread-local storage.
    
    Returns:
        The current request ID if available, None otherwise
    """
    return getattr(_thread_locals, 'request_id', None)


def set_current_request(request: Optional[HttpRequest]) -> None:
    """Set the current request in thread-local storage.
    
    Args:
        request: The request object to store
    """
    _thread_locals.request = request


def set_current_request_id(request_id: Optional[str] = None) -> str:
    """Set the current request ID in thread-local storage.
    
    Args:
        request_id: The request ID to store, or None to generate a new one
        
    Returns:
        The request ID that was set
    """
    if request_id is None:
        request_id = str(uuid.uuid4())
    _thread_locals.request_id = request_id
    return request_id


def clear_request_context() -> None:
    """Clear the request context from thread-local storage."""
    if hasattr(_thread_locals, 'request'):
        delattr(_thread_locals, 'request')
    if hasattr(_thread_locals, 'request_id'):
        delattr(_thread_locals, 'request_id')


class TenantContextFilter(logging.Filter):
    """Logging filter that adds tenant context to log records.
    
    This filter adds the following fields to log records:
    - tenant_id: The ID of the current tenant
    - user_id: The ID of the current user
    """
    
    def filter(self, record: logging.LogRecord) -> bool:
        """Add tenant and user context to the log record.
        
        Args:
            record: The log record to modify
            
        Returns:
            Always True to include the record in the log output
        """
        # Add tenant ID to the record
        tenant_id = get_current_tenant_id()
        if tenant_id is not None:
            record.tenant_id = tenant_id
        else:
            record.tenant_id = 1  # Default tenant ID for Phase 1
        
        # Add user ID to the record
        user_id = get_current_user_id()
        if user_id is not None:
            record.user_id = user_id
        else:
            record.user_id = 'anonymous'
        
        return True


class RequestIDFilter(logging.Filter):
    """Logging filter that adds request ID to log records.
    
    This filter adds the following field to log records:
    - request_id: A unique ID for the current request
    """
    
    def filter(self, record: logging.LogRecord) -> bool:
        """Add request ID to the log record.
        
        Args:
            record: The log record to modify
            
        Returns:
            Always True to include the record in the log output
        """
        # Add request ID to the record
        request_id = get_current_request_id()
        if request_id is not None:
            record.request_id = request_id
        else:
            record.request_id = '-'
        
        return True
