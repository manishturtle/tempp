"""
Utilities for managing checkout session data.

This module provides functions to store, retrieve, update, and clear
checkout-related data within the user's session during the checkout process.
Each tenant's data is isolated using tenant-specific session keys.
"""

from django.http import HttpRequest
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

# Keys for specific checkout data elements
SHIPPING_ADDRESS_SESSION_KEY = 'shipping_address'
BILLING_ADDRESS_SESSION_KEY = 'billing_address'
SHIPPING_METHOD_SESSION_KEY = 'shipping_method'
PAYMENT_METHOD_SESSION_KEY = 'payment_method'
PAYMENT_TXN_SESSION_KEY = 'pending_payment_txn'
CART_ID_SESSION_KEY = 'cart_id'
COUPON_CODE_SESSION_KEY = 'coupon_code'
LOYALTY_POINTS_TO_REDEEM_KEY = 'loyalty_points_to_redeem'


def _get_tenant_session_key(request: HttpRequest) -> Optional[str]:
    """
    Helper to get the tenant-specific session key.
    
    Args:
        request: The HTTP request object with tenant information
        
    Returns:
        A tenant-specific session key or None if tenant ID is not available
    """
    client_id = getattr(request, 'auth_tenant_id', None)
    if not client_id:
        logger.warning("Cannot generate tenant session key: client_id missing from request.")
        return None
    return f"checkout_data_om:{client_id}"


def get_checkout_data(request: HttpRequest) -> Dict[str, Any]:
    """
    Retrieve the checkout data dictionary from the session using a tenant-specific key.
    
    Args:
        request: The HTTP request object with session and tenant information
        
    Returns:
        Dictionary containing checkout data or empty dict if none exists or tenant ID is missing
    """
    session_key = _get_tenant_session_key(request)
    if not session_key:
        return {}
    return request.session.get(session_key, {})


def update_checkout_data(request: HttpRequest, data_to_update: Dict[str, Any]) -> None:
    """
    Update the checkout data in the session using a tenant-specific key.
    
    Args:
        request: The HTTP request object with session and tenant information
        data_to_update: Dictionary containing data to update or add
    """
    session_key = _get_tenant_session_key(request)
    if not session_key:
        logger.warning("Cannot update checkout data: tenant ID missing from request.")
        return
        
    # Fetch existing data using the tenant-specific key
    checkout_data = request.session.get(session_key, {})
    checkout_data.update(data_to_update)
    request.session[session_key] = checkout_data
    request.session.modified = True  # Ensure session is saved


def clear_checkout_data(request: HttpRequest) -> None:
    """
    Remove checkout data from the session using a tenant-specific key.
    
    Args:
        request: The HTTP request object with session and tenant information
    """
    session_key = _get_tenant_session_key(request)
    if not session_key:
        logger.warning("Cannot clear checkout data: tenant ID missing from request.")
        return
        
    if session_key in request.session:
        del request.session[session_key]
        request.session.modified = True
