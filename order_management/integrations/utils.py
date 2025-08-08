"""
Integration Utilities.

This module provides common utilities for external service integrations,
including logging, error handling, and helper functions.
"""
from typing import Dict, Any, Optional, List, Union, Callable, TypeVar
import logging
import time
import functools
import json
from decimal import Decimal

logger = logging.getLogger(__name__)

# Type variables for generic functions
T = TypeVar('T')
R = TypeVar('R')


class DecimalEncoder(json.JSONEncoder):
    """JSON encoder that handles Decimal objects."""
    
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)


def log_integration_call(service_name: str, operation: str) -> Callable:
    """
    Decorator to log integration service calls.
    
    Args:
        service_name: Name of the external service
        operation: Name of the operation being performed
        
    Returns:
        Decorated function
    """
    def decorator(func: Callable[..., R]) -> Callable[..., R]:
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> R:
            client_id = kwargs.get('client_id', 'unknown')
            
            # Log the start of the operation
            logger.info(f"[{service_name}] Starting {operation} (Client: {client_id})")
            
            start_time = time.time()
            try:
                # Call the original function
                result = func(*args, **kwargs)
                
                # Log successful completion
                elapsed_time = time.time() - start_time
                logger.info(f"[{service_name}] Completed {operation} in {elapsed_time:.2f}s")
                
                return result
            except Exception as e:
                # Log error
                elapsed_time = time.time() - start_time
                logger.error(f"[{service_name}] Error in {operation} after {elapsed_time:.2f}s: {str(e)}")
                raise
        
        return wrapper
    
    return decorator


def format_address(address: Dict[str, Any]) -> str:
    """
    Format an address dictionary into a string.
    
    Args:
        address: Address dictionary
        
    Returns:
        Formatted address string
    """
    lines = []
    
    # Add name if present
    if address.get('name'):
        lines.append(address['name'])
    
    # Add street address
    if address.get('street_address'):
        lines.append(address['street_address'])
    
    # Add street address line 2 if present
    if address.get('street_address2'):
        lines.append(address['street_address2'])
    
    # Add city, state, postal code
    city_line = []
    if address.get('city'):
        city_line.append(address['city'])
    if address.get('state'):
        city_line.append(address['state'])
    if address.get('postal_code'):
        city_line.append(address['postal_code'])
    
    if city_line:
        lines.append(', '.join(city_line))
    
    # Add country
    if address.get('country'):
        lines.append(address['country'])
    
    # Join lines with newlines
    return '\n'.join(lines)


def format_phone(phone: str) -> str:
    """
    Format a phone number for display.
    
    Args:
        phone: Phone number string
        
    Returns:
        Formatted phone number
    """
    # This is a simple stub - in a real implementation,
    # this would handle different phone number formats
    return phone


def get_mock_tracking_url(carrier: str, tracking_number: str) -> str:
    """
    Get a mock tracking URL for a shipment.
    
    Args:
        carrier: Carrier name
        tracking_number: Tracking number
        
    Returns:
        Mock tracking URL
    """
    carrier_domains = {
        'UPS': 'ups.com',
        'FEDEX': 'fedex.com',
        'USPS': 'usps.com',
        'DHL': 'dhl.com'
    }
    
    domain = carrier_domains.get(carrier.upper(), 'example.com')
    
    return f"https://www.{domain}/tracking?number={tracking_number}"


def retry_operation(max_attempts: int = 3, delay_seconds: float = 1.0) -> Callable:
    """
    Decorator to retry operations with exponential backoff.
    
    Args:
        max_attempts: Maximum number of retry attempts
        delay_seconds: Initial delay between retries (doubles each attempt)
        
    Returns:
        Decorated function
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> T:
            last_exception = None
            current_delay = delay_seconds
            
            for attempt in range(1, max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    
                    if attempt < max_attempts:
                        logger.warning(f"Attempt {attempt} failed, retrying in {current_delay:.2f}s: {str(e)}")
                        time.sleep(current_delay)
                        current_delay *= 2  # Exponential backoff
                    else:
                        logger.error(f"All {max_attempts} attempts failed: {str(e)}")
            
            # If we get here, all attempts failed
            raise last_exception
        
        return wrapper
    
    return decorator
