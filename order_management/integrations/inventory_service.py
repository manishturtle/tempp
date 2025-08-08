"""
Inventory Service Integration.

This module provides implementations for the Inventory Service API.
It handles communication with the Inventory Service for operations like
checking available inventory, reserving inventory for orders, releasing
inventory for cancellations, and updating inventory for returns.
"""
from typing import Dict, Any, Optional, List, Union
from decimal import Decimal
import uuid
import logging
import requests
import json
from datetime import datetime, timedelta
from django.conf import settings
import requests
import logging
from typing import Dict, Any, Optional, List
from order_management.exceptions import InventoryServiceError, InventoryConnectionError, InventoryResponseError
from core.clients.auth_service import AuthServiceClient
import jwt
from datetime import datetime

logger = logging.getLogger(__name__)

# Initialize auth service client
auth_client = AuthServiceClient()

# Timeout for API requests in secondspl
API_TIMEOUT = settings.INVENTORY_API_TIMEOUT

# # Default headers for API requests
# def get_default_headers() -> Dict[str, str]:
#     """
#     Get the default headers for API requests.
    
#     Returns:
#         Dict containing the default headers for API requests
#     """
#     headers = {
#         'Content-Type': 'application/json',
#         'Accept': 'application/json'
#     }
    
#     try:
#         # Get a valid user from the database
#         from ecomm_auth.models import EcommUserCredential
#         from django.conf import settings
#         import jwt
#         import uuid
#         from datetime import datetime, timedelta
        
#         # Find an active admin user in the database
#         admin_user = EcommUserCredential.objects.filter(
#             is_active=True,
#             client_id=1  # Default tenant ID
#         ).first()
        
#         if admin_user:
#             # Generate JWT token directly
#             token_payload = {
#                 'user_id': str(admin_user.id),
#                 'email': admin_user.email,
#                 'exp': datetime.utcnow() + timedelta(hours=1),  # 1 hour expiry
#                 'iat': datetime.utcnow(),
#                 'jti': str(uuid.uuid4())
#             }
            
#             # Use the same secret key as in the login view
#             secret_key = getattr(settings, 'JWT_SECRET_KEY', 'default_secret_key_for_testing')
#             access_token = jwt.encode(token_payload, secret_key, algorithm='HS256')
            
#             headers['Authorization'] = f"Bearer {access_token}"
#             logger.info(f"Using database user {admin_user.email} for API authentication")
#         else:
#             logger.error("No active admin user found in the database")
#             # Fallback to hardcoded token in development only
#             if settings.DEBUG:
#                 test_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJleHAiOjE2MjE1MTIwMDB9.8sGW4JCW8u0FJ6TKY5F-rJUBLGwVXmdV3SfDQrNJqAA"
#                 headers['Authorization'] = f"Bearer {test_token}"
#     except Exception as e:
#         logger.exception(f"Error generating authentication token: {str(e)}")
#         # Fallback to hardcoded token in development only
#         if settings.DEBUG:
#             test_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJleHAiOjE2MjE1MTIwMDB9.8sGW4JCW8u0FJ6TKY5F-rJUBLGwVXmdV3SfDQrNJqAA"
#             headers['Authorization'] = f"Bearer {test_token}"
    
#     return headers


def get_atp(sku: str, tenant_slug: str) -> int:
    """
    Get Available to Promise (ATP) quantity for a product.
    
    Args:
        sku: The product SKU
        tenant_slug: The tenant slug for multi-tenant support (default: 'erp_turtle')
        
    Returns:
        Integer representing the available quantity
        
    Raises:
        InventoryConnectionError: If connection to inventory service fails
        InventoryResponseError: If inventory service returns an error response
    """
    log_context = {"sku": sku, "tenant_slug": tenant_slug}
    logger.info(f"Getting ATP for SKU {sku} in tenant {tenant_slug}", extra=log_context)
    
    # For testing purposes: Return a default ATP value of 0 without making API call
    # Comment this out in production
    if settings.DEBUG:
        logger.warning(f"DEBUG MODE: Returning default ATP of 0 for SKU {sku}", extra=log_context)
        return 0
    
    # Use the base URL from settings and format with tenant slug
    url = settings.INVENTORY_API_URL.format(tenant_slug=tenant_slug)
    
    # Log the complete URL being used
    logger.info(f"Using inventory service URL: {url}", extra=log_context)
    
    try:
        # Add debug logging for the exact URL and parameters
        params = {'product__sku': sku}
        full_url = f"{url}?{'&'.join(f'{key}={value}' for key, value in params.items())}"
        logger.info(f"Making inventory API request to: {full_url}", extra=log_context)
        
        print("man:", url)
        response = requests.get(
            url,
            params=params,
            timeout=API_TIMEOUT
        )
        if response.status_code != 200:
            # Log the error but don't raise an exception in development
            if settings.DEBUG:
                logger.error(f"Inventory service error: {response.status_code} - {response.text}", extra=log_context)
                return 0  # Return default value in development mode
            
            # In production, raise an exception
            raise InventoryResponseError(response.status_code, response.text)
            
        # Parse the response
        data = response.json()
        
        # Extract ATP value from paginated response
        if isinstance(data, dict) and 'results' in data:
            # Find the inventory record with matching SKU
            inventory_record = next((item for item in data['results'] 
                                  if item['product']['sku'] == sku), None)
            if inventory_record:
                return int(inventory_record['available_to_promise'])
            else:
                logger.error(f"No inventory record found for SKU {sku}", extra=log_context)
                return 0
        else:
            logger.error(f"Unexpected response format from inventory service: {data}", extra=log_context)
            if settings.DEBUG:
                return 0  # Return default value in development mode
            raise InventoryResponseError(200, "Unexpected response format")
            
    except requests.exceptions.RequestException as e:
        error_msg = f"Connection error getting ATP for SKU {sku} in tenant {tenant_slug}: {str(e)}"
        logger.error(error_msg, extra=log_context)
        
        # In development mode, return a default value
        if settings.DEBUG:
            return 0
            
        # In production, raise an exception
        raise InventoryConnectionError(error_msg)
        
    except (ValueError, KeyError, json.JSONDecodeError) as e:
        error_msg = f"Error parsing ATP response for SKU {sku} in tenant {tenant_slug}: {str(e)}"
        logger.error(error_msg, extra=log_context)
        
        # In development mode, return a default value
        if settings.DEBUG:
            return 0
            
        # In production, raise an exception
        raise InventoryResponseError(200, error_msg)


def get_inventory_details(sku: str) -> Dict[str, Any]:
    """
    Get detailed inventory information for a product.
    
    Args:
        sku: The product SKU
        
    Returns:
        Dictionary with inventory details
        
    Raises:
        InventoryConnectionError: If connection to inventory service fails
        InventoryResponseError: If inventory service returns an error response
    """
    log_context = {"sku": sku}
    logger.info(f"Getting inventory details for SKU {sku}", extra=log_context)
    
    url = f"{settings.INVENTORY_API_URL}/details/"
    
    try:
        response = requests.get(
            url,
            params={'sku': sku},
            headers=get_default_headers(),
            timeout=API_TIMEOUT
        )
        
        if response.status_code != 200:
            if settings.DEBUG:
                logger.error(f"Inventory service error: {response.status_code} - {response.text}", extra=log_context)
                # Return mock data in development
                return {
                    'sku': sku,
                    'atp': 0,
                    'on_hand': 0,
                    'allocated': 0,
                    'on_order': 0,
                    'expected_date': (datetime.now() + timedelta(days=7)).isoformat(),
                    'locations': []
                }
            
            raise InventoryResponseError(response.status_code, response.text)
            
        return response.json()
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Connection error getting inventory details for SKU {sku}: {str(e)}", extra=log_context)
        
        if settings.DEBUG:
            # Return mock data in development
            return {
                'sku': sku,
                'atp': 0,
                'on_hand': 0,
                'allocated': 0,
                'on_order': 0,
                'expected_date': (datetime.now() + timedelta(days=7)).isoformat(),
                'locations': []
            }
            
        raise InventoryConnectionError(str(e))


def reserve_inventory(order_id: str, items: List[Dict[str, Any]]) -> None:
    """
    Reserve inventory for an order.
    
    Args:
        order_id: The order identifier
        items: List of items to reserve [{'sku': 'SKU1', 'quantity': 2}, ...]
        
    Raises:
        InventoryConnectionError: If connection to inventory service fails
        InventoryResponseError: If inventory service returns an error response
        InventoryReservationError: If inventory reservation fails due to business rules
    """
    log_context = {"order_id": order_id, "item_count": len(items)}
    logger.info(f"Reserving inventory for order {order_id} with {len(items)} items", extra=log_context)
    
    # For testing purposes: Skip actual API call in development mode
    if settings.DEBUG:
        logger.warning(f"DEBUG MODE: Skipping actual inventory reservation", extra=log_context)
        # Check if any items would be out of stock
        for item in items:
            sku = item.get('sku')
            quantity = item.get('quantity', 1)
            atp = get_atp(sku)
            if atp < quantity:
                logger.warning(f"DEBUG MODE: Insufficient inventory for SKU {sku}: requested {quantity}, available {atp}", 
                              extra={"order_id": order_id, "sku": sku})
                # In development mode, we'll just log a warning but not fail
        return
    
    url = f"{settings.INVENTORY_API_URL}/reserve/"
    
    # Prepare payload
    payload = {
        "order_id": order_id,
        "items": items
    }
    
    try:
        response = requests.post(
            url,
            json=payload,
            headers=get_default_headers(),
            timeout=API_TIMEOUT
        )
        
        if response.status_code != 200:
            try:
                error_data = response.json()
                error_message = error_data.get('detail', response.text)
                
                # Check for specific error types
                if 'insufficient_inventory' in error_data:
                    # This is a business rule violation - insufficient inventory
                    insufficient_items = error_data.get('insufficient_inventory', [])
                    error_details = ", ".join([f"{item['sku']} (requested: {item['requested']}, available: {item['available']})" 
                                             for item in insufficient_items])
                    raise InventoryReservationError(f"Insufficient inventory for items: {error_details}")
                    
                # Generic error
                raise InventoryResponseError(response.status_code, error_message)
                
            except (ValueError, KeyError, json.JSONDecodeError):
                # Couldn't parse the response as JSON
                raise InventoryResponseError(response.status_code, response.text)
                
        # Successful reservation
        logger.info(f"Successfully reserved inventory for order {order_id}", extra=log_context)
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Connection error reserving inventory for order {order_id}: {str(e)}", extra=log_context)
        raise InventoryConnectionError(str(e))
    except InventoryReservationError:
        # Re-raise business rule violations
        raise
    except Exception as e:
        logger.exception(f"Unexpected error reserving inventory for order {order_id}: {str(e)}", extra=log_context)
        raise InventoryServiceError(f"Unexpected error: {str(e)}")


def release_inventory(order_id: str, items: List[Dict[str, Any]]) -> None:
    """
    Release previously reserved inventory.
    
    Args:
        order_id: The order identifier
        items: List of items to release [{'sku': 'SKU1', 'quantity': 2}, ...]
        
    Raises:
        InventoryConnectionError: If connection to inventory service fails
        InventoryResponseError: If inventory service returns an error response
        InventoryReleaseError: If inventory release fails due to business rules
    """
    log_context = {"order_id": order_id, "item_count": len(items)}
    logger.info(f"Releasing inventory for order {order_id} with {len(items)} items", extra=log_context)
    
    # For testing purposes: Skip actual API call in development mode
    if settings.DEBUG:
        logger.warning(f"DEBUG MODE: Skipping actual inventory release", extra=log_context)
        return
    
    url = f"{settings.INVENTORY_API_URL}/release/"
    
    # Prepare payload
    payload = {
        "order_id": order_id,
        "items": items
    }
    
    try:
        response = requests.post(
            url,
            json=payload,
            headers=get_default_headers(),
            timeout=API_TIMEOUT
        )
        
        if response.status_code != 200:
            try:
                error_data = response.json()
                error_message = error_data.get('detail', response.text)
                
                # Check for specific error types
                if 'no_reservation_found' in error_data:
                    # This is a business rule violation - no reservation found
                    raise InventoryReleaseError(f"No reservation found for order {order_id}")
                    
                # Generic error
                raise InventoryResponseError(response.status_code, error_message)
                
            except (ValueError, KeyError, json.JSONDecodeError):
                # Couldn't parse the response as JSON
                raise InventoryResponseError(response.status_code, response.text)
                
        # Successful release
        logger.info(f"Successfully released inventory for order {order_id}", extra=log_context)
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Connection error releasing inventory for order {order_id}: {str(e)}", extra=log_context)
        raise InventoryConnectionError(str(e))
    except InventoryReleaseError:
        # Re-raise business rule violations
        raise
    except Exception as e:
        logger.exception(f"Unexpected error releasing inventory for order {order_id}: {str(e)}", extra=log_context)
        raise InventoryServiceError(f"Unexpected error: {str(e)}")


def update_stock_on_return(items: List[Dict[str, Any]]) -> None:
    """
    Update inventory stock when items are returned.
    
    This function increases inventory counts based on returned items and their condition.
    Items in 'AS_NEW' condition go back to regular inventory, while others might
    go to different inventory pools based on condition.
    
    Args:
        items: List of returned items with format:
               [{'sku': 'SKU1', 'quantity': 2, 'condition': 'AS_NEW'}, ...]
               Where condition is one of: 'AS_NEW', 'GOOD', 'DAMAGED', 'UNSELLABLE'
        
    Raises:
        InventoryConnectionError: If connection to inventory service fails
        InventoryResponseError: If inventory service returns an error response
    """
    log_context = {"item_count": len(items)}
    logger.info(f"Updating inventory for returned items", extra=log_context)
    
    # For testing purposes: Skip actual API call in development mode
    if settings.DEBUG:
        logger.warning(f"DEBUG MODE: Skipping actual inventory update for returns", extra=log_context)
        return
    
    url = f"{settings.INVENTORY_API_URL}/adjust/"
    
    # Prepare payload
    payload = {
        'items': items,
        'adjustment_reason': 'RETURN',
        'notes': 'Inventory update due to return'
    }
    
    try:
        response = requests.post(
            url,
            json=payload,
            headers=get_default_headers(),
            timeout=API_TIMEOUT
        )
        
        if response.status_code != 200:
            try:
                error_data = response.json()
                error_message = error_data.get('detail', response.text)
                raise InventoryResponseError(response.status_code, error_message)
            except (ValueError, KeyError, json.JSONDecodeError):
                # Couldn't parse the response as JSON
                raise InventoryResponseError(response.status_code, response.text)
                
        # Successful update
        logger.info(f"Successfully updated inventory for {len(items)} returned items", extra=log_context)
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Connection error updating inventory for returns: {str(e)}", extra=log_context)
        raise InventoryConnectionError(str(e))
    except Exception as e:
        logger.exception(f"Unexpected error updating inventory for returns: {str(e)}", extra=log_context)
        raise InventoryServiceError(f"Unexpected error: {str(e)}")


def get_inventory_status(skus: List[str], tenant_slug: str) -> Dict[str, Dict[str, Any]]:
    """
    Get inventory status for multiple SKUs.
    
    Args:
        skus: List of product SKUs
        
    Returns:
        Dictionary mapping SKUs to their inventory status
        
    Raises:
        InventoryConnectionError: If connection to inventory service fails
        InventoryResponseError: If inventory service returns an error response
    """
    log_context = {"sku_count": len(skus)}
    logger.info(f"Getting inventory status for {len(skus)} SKUs", extra=log_context)
    
    url = f"{settings.INVENTORY_API_URL}/status/"
    
    try:
        response = requests.post(
            url,
            json={"skus": skus},
            headers=get_default_headers(),
            timeout=API_TIMEOUT
        )
        
        if response.status_code != 200:
            if settings.DEBUG:
                logger.warning(f"Inventory service error: {response.status_code}. Falling back to individual ATP calls", extra=log_context)
                # Fallback to individual ATP calls
                result = {}
                for sku in skus:
                    try:
                        atp = get_atp(sku, tenant_slug=tenant_slug)
                        result[sku] = {
                            'sku': sku,
                            'in_stock': atp > 0,
                            'atp': atp,
                            'status': 'IN_STOCK' if atp > 5 else ('LOW_STOCK' if atp > 0 else 'OUT_OF_STOCK')
                        }
                    except Exception as e:
                        logger.warning(f"Error getting ATP for SKU {sku} during fallback: {str(e)}", 
                                     extra={"sku": sku})
                        result[sku] = {
                            'sku': sku,
                            'in_stock': False,
                            'atp': 0,
                            'status': 'UNKNOWN'
                        }
                return result
            
            raise InventoryResponseError(response.status_code, response.text)
            
        # Parse the response
        data = response.json()
        
        # Return the inventory status dictionary
        return data
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Connection error getting inventory status: {str(e)}", extra=log_context)
        
        if settings.DEBUG:
            # Fallback to individual ATP calls if bulk status fails
            logger.warning(f"Falling back to individual ATP calls after connection error", extra=log_context)
            result = {}
            for sku in skus:
                try:
                    atp = get_atp(sku)
                    result[sku] = {
                        'sku': sku,
                        'in_stock': atp > 0,
                        'atp': atp,
                        'status': 'IN_STOCK' if atp > 5 else ('LOW_STOCK' if atp > 0 else 'OUT_OF_STOCK')
                    }
                except Exception:
                    result[sku] = {
                        'sku': sku,
                        'in_stock': False,
                        'atp': 0,
                        'status': 'UNKNOWN'
                    }
            return result
            
        raise InventoryConnectionError(str(e))
        
    except Exception as e:
        logger.exception(f"Unexpected error getting inventory status: {str(e)}", extra=log_context)
        
        if settings.DEBUG:
            # Fallback to individual ATP calls if bulk status fails
            logger.warning(f"Falling back to individual ATP calls after error", extra=log_context)
            result = {}
            for sku in skus:
                try:
                    atp = get_atp(sku)
                    result[sku] = {
                        'sku': sku,
                        'in_stock': atp > 0,
                        'atp': atp,
                        'status': 'IN_STOCK' if atp > 5 else ('LOW_STOCK' if atp > 0 else 'OUT_OF_STOCK')
                    }
                except Exception:
                    result[sku] = {
                        'sku': sku,
                        'in_stock': False,
                        'atp': 0,
                        'status': 'UNKNOWN'
                    }
            return result
            
        raise InventoryServiceError(f"Unexpected error: {str(e)}")
