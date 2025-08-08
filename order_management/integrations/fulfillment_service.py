"""
Fulfillment Service Integration.

This module provides implementations for interacting with the Fulfillment Service API.
It handles shipping options retrieval and order submission for fulfillment.
"""
from typing import Dict, Any, List, Optional
import logging
import requests
from requests.exceptions import RequestException, Timeout, ConnectionError
from django.conf import settings
from django.core.cache import cache
from datetime import datetime

from order_management.exceptions import (
    FulfillmentServiceError,
    FulfillmentConnectionError,
    FulfillmentResponseError,
    FulfillmentProcessError
)

logger = logging.getLogger(__name__)

def _get_base_headers(tenant_identifier: str) -> Dict[str, str]:
    """
    Get base headers for API requests.
    
    Args:
        tenant_identifier: The tenant identifier to include in headers
        
    Returns:
        Dictionary of headers to include in all API requests
    """
    headers = {
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenant_identifier,
    }
    
    # Add authentication token if available
    if hasattr(settings, 'FULFILLMENT_API_AUTH_TOKEN') and settings.FULFILLMENT_API_AUTH_TOKEN:
        headers['Authorization'] = f'Token {settings.FULFILLMENT_API_AUTH_TOKEN}'
        
    return headers


def _get_api_url(endpoint: str) -> str:
    """
    Construct full API URL for a given endpoint.
    
    Args:
        endpoint: API endpoint path (without leading slash)
        
    Returns:
        Full URL including base API URL and endpoint
    """
    base_url = settings.FULFILLMENT_API_URL.rstrip('/')
    endpoint = endpoint.lstrip('/')
    return f"{base_url}/{endpoint}"


def _handle_api_error(response: requests.Response, operation: str) -> None:
    """
    Handle API error response.
    
    Args:
        response: Response object from requests
        operation: Description of the operation being performed
        
    Raises:
        FulfillmentResponseError: For all HTTP error responses
        FulfillmentProcessError: For business logic errors
    """
    try:
        error_data = response.json()
        error_detail = error_data.get('detail', str(error_data))
    except (ValueError, KeyError):
        error_detail = response.text or f"HTTP {response.status_code}"
        
    error_msg = f"Error during {operation}: {error_detail}"
    logger.error(error_msg)
    
    # Handle specific error codes
    if response.status_code == 404:
        raise FulfillmentResponseError(response.status_code, f"Resource not found during {operation}")
    elif response.status_code == 422:
        # Unprocessable Entity - usually validation errors
        raise FulfillmentProcessError(f"Validation error during {operation}: {error_detail}")
    elif response.status_code == 400:
        # Bad Request - usually business logic errors
        raise FulfillmentProcessError(f"Business rule violation during {operation}: {error_detail}")
    else:
        # Other errors
        raise FulfillmentResponseError(response.status_code, error_detail)


def get_shipping_options(tenant_identifier: str, shipping_address: Dict[str, Any], items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Get available shipping options based on shipping address and cart items.
    
    Args:
        tenant_identifier: The tenant identifier
        shipping_address: The shipping address dictionary
        items: List of cart items
        
    Returns:
        List of available shipping options
        
    Raises:
        FulfillmentConnectionError: If unable to connect to the Fulfillment API
        FulfillmentResponseError: If the Fulfillment API returns an error response
        FulfillmentProcessError: If there's a business logic error
    """
    logger.info(f"Getting shipping options for tenant {tenant_identifier}")
    
    # Check cache first
    cache_key = f"shipping_options:{tenant_identifier}:{hash(str(shipping_address))}"
    cached_options = cache.get(cache_key)
    if cached_options:
        logger.debug(f"Using cached shipping options for tenant {tenant_identifier}")
        return cached_options
    
    # Prepare API request
    url = _get_api_url("shipping-options/")
    headers = _get_base_headers(tenant_identifier)
    
    # Prepare payload
    payload = {
        "tenant_identifier": tenant_identifier,
        "shipping_address": shipping_address,
        "items": items
    }
    
    try:
        # Make API request
        response = requests.post(
            url,
            json=payload,
            headers=headers,
            timeout=settings.FULFILLMENT_API_TIMEOUT
        )
        
        # Handle non-200 responses
        if response.status_code != 200:
            _handle_api_error(response, "getting shipping options")
        
        # Parse response
        shipping_options = response.json()
        
        # Validate response structure
        if not isinstance(shipping_options, list):
            error_msg = f"Invalid response format from shipping options API: {shipping_options}"
            logger.error(error_msg)
            raise FulfillmentResponseError(response.status_code, error_msg)
            
        # Cache the result
        cache.set(cache_key, shipping_options, settings.FULFILLMENT_API_CACHE_TTL)
        
        return shipping_options
        
    except requests.exceptions.ConnectionError as e:
        error_msg = f"Connection error while getting shipping options for tenant {tenant_identifier}"
        logger.error(error_msg)
        
        # In development mode, return mock shipping options
        if settings.DEBUG:
            logger.info("Using mock shipping options in development mode")
            mock_options = [
                {
                    "id": "standard",
                    "name": "Standard Shipping",
                    "description": "Delivery in 3-5 business days",
                    "price": "5.99",
                    "estimated_days": 4
                },
                {
                    "id": "express",
                    "name": "Express Shipping",
                    "description": "Delivery in 1-2 business days",
                    "price": "12.99",
                    "estimated_days": 2
                },
                {
                    "id": "free",
                    "name": "Free Shipping",
                    "description": "Free shipping for orders over $50 (5-7 business days)",
                    "price": "0.00",
                    "estimated_days": 6
                }
            ]
            # Cache the mock options
            cache.set(cache_key, mock_options, settings.FULFILLMENT_API_CACHE_TTL)
            return mock_options
            
        raise FulfillmentConnectionError(error_msg) from e
        
    except requests.exceptions.Timeout as e:
        error_msg = f"Timeout while getting shipping options for tenant {tenant_identifier}"
        logger.error(error_msg)
        raise FulfillmentConnectionError(error_msg) from e
        
    except (FulfillmentResponseError, FulfillmentProcessError):
        # Re-raise exceptions from _handle_api_error
        raise
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Error getting shipping options for tenant {tenant_identifier}: {str(e)}"
        logger.error(error_msg)
        raise FulfillmentConnectionError(error_msg) from e
        
    except Exception as e:
        error_msg = f"Unexpected error getting shipping options for tenant {tenant_identifier}: {str(e)}"
        logger.exception(error_msg)
        raise FulfillmentServiceError(error_msg) from e


def submit_order_for_fulfillment(
    tenant_identifier: str,
    order_id: str,
    shipping_address: Dict[str, Any],
    items: List[Dict[str, Any]],
    shipping_method: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Submit an order for fulfillment.
    
    Args:
        tenant_identifier: The tenant identifier
        order_id: The order identifier
        shipping_address: The shipping address dictionary
        items: List of order items
        shipping_method: The selected shipping method
        
    Returns:
        Dictionary with fulfillment details
        
    Raises:
        FulfillmentConnectionError: If unable to connect to the Fulfillment API
        FulfillmentResponseError: If the Fulfillment API returns an error response
        FulfillmentProcessError: If there's a business logic error
    """
    logger.info(f"Submitting order {order_id} for fulfillment (Tenant: {tenant_identifier})")
    
    # Prepare API request
    url = _get_api_url("orders/")
    headers = _get_base_headers(tenant_identifier)
    
    # Prepare payload
    payload = {
        "tenant_identifier": tenant_identifier,
        "order_id": order_id,
        "shipping_address": shipping_address,
        "items": items,
        "shipping_method": shipping_method
    }
    
    try:
        # Make API request
        response = requests.post(
            url,
            json=payload,
            headers=headers,
            timeout=settings.FULFILLMENT_API_TIMEOUT
        )
        
        # Handle non-200 responses
        if response.status_code not in (200, 201, 202):
            _handle_api_error(response, f"submitting order {order_id} for fulfillment")
        
        # Parse response
        fulfillment_details = response.json()
        
        # Validate response
        if not isinstance(fulfillment_details, dict) or 'fulfillment_id' not in fulfillment_details:
            error_msg = f"Invalid response format from fulfillment API: {fulfillment_details}"
            logger.error(error_msg)
            raise FulfillmentResponseError(response.status_code, error_msg)
            
        logger.info(f"Successfully submitted order {order_id} for fulfillment (Tenant: {tenant_identifier})")
        return fulfillment_details
        
    except requests.exceptions.ConnectionError as e:
        error_msg = f"Connection error while submitting order {order_id} for fulfillment (Tenant: {tenant_identifier})"
        logger.error(error_msg)
        
        # In development mode, return mock fulfillment details
        if settings.DEBUG:
            logger.info(f"Using mock fulfillment details in development mode for order {order_id} (Tenant: {tenant_identifier})")
            mock_fulfillment = {
                "fulfillment_id": f"mock-{order_id}",
                "status": "processing",
                "tracking_number": f"MOCK-TN-{order_id}",
                "estimated_delivery": {
                    "min_days": shipping_method.get("estimated_days", 3),
                    "max_days": shipping_method.get("estimated_days", 3) + 2
                },
                "warehouse": "MOCK-WH-01",
                "created_at": datetime.now().isoformat()
            }
            return mock_fulfillment
            
        raise FulfillmentConnectionError(error_msg) from e
        
    except requests.exceptions.Timeout as e:
        error_msg = f"Timeout while submitting order {order_id} for fulfillment (Tenant: {tenant_identifier})"
        logger.error(error_msg)
        raise FulfillmentConnectionError(error_msg) from e
        
    except (FulfillmentResponseError, FulfillmentProcessError):
        # Re-raise exceptions from _handle_api_error
        raise
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Error submitting order {order_id} for fulfillment (Tenant: {tenant_identifier}): {str(e)}"
        logger.error(error_msg)
        raise FulfillmentConnectionError(error_msg) from e
        
    except Exception as e:
        error_msg = f"Unexpected error submitting order {order_id} for fulfillment (Tenant: {tenant_identifier}): {str(e)}"
        logger.exception(error_msg)
        raise FulfillmentServiceError(error_msg) from e
