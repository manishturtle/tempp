"""
Tenant configuration utilities for caching and retrieving tenant-specific settings.

This module provides utility functions for efficiently accessing tenant configuration
data with caching to minimize database queries.
"""
from typing import Optional, Dict, Any
import logging
from django.core.cache import cache

from order_management.models import TenantConfiguration

logger = logging.getLogger(__name__)

# Cache timeout (1 hour in seconds)
CACHE_TIMEOUT = 3600


def get_tenant_config_obj(tenant_identifier: str) -> Optional[TenantConfiguration]:
    """
    Get the TenantConfiguration object for a specific tenant with caching.
    
    This function retrieves the TenantConfiguration object for the specified tenant,
    using caching to minimize database queries. If the configuration is not found
    in the cache, it will be fetched from the database and stored in the cache.
    
    Args:
        tenant_identifier: The unique tenant identifier (from URL path)
        
    Returns:
        TenantConfiguration object if found, None otherwise
    """
    if not tenant_identifier:
        logger.warning("Invalid tenant_identifier: None or empty")
        return None
    
    # Define cache key
    cache_key = f"tenant_config_obj:{tenant_identifier}"
    
    # Try fetching from cache
    config_obj = cache.get(cache_key)
    if config_obj is not None:
        logger.debug(f"Cache hit for {cache_key}")
        return config_obj
    
    # Not in cache, fetch from database
    logger.debug(f"Cache miss for {cache_key}, fetching from database")
    
    try:
        config_obj = TenantConfiguration.objects.filter(tenant_ref=tenant_identifier).first()
        
        # Store in cache (even if None)
        cache.set(cache_key, config_obj, timeout=CACHE_TIMEOUT)
        
        if config_obj:
            logger.debug(f"Found configuration for tenant {tenant_identifier}")
        else:
            logger.debug(f"No configuration found for tenant {tenant_identifier}")
        
        return config_obj
        
    except Exception as e:
        logger.error(f"Error fetching configuration for tenant {tenant_identifier}: {str(e)}", exc_info=True)
        return None


def get_tenant_config_value(tenant_identifier: str, config_key: str, default: Any = None) -> Any:
    """
    Get a specific configuration value from TenantConfiguration.
    
    This function retrieves a specific attribute from the TenantConfiguration object
    for the specified tenant, with a fallback default value if not found.
    
    Args:
        tenant_identifier: The unique tenant identifier (from URL path)
        config_key: The configuration attribute name to retrieve
        default: Default value to return if the attribute is not found or is None
        
    Returns:
        The configuration value if found, default otherwise
    """
    if not tenant_identifier or not config_key:
        logger.warning(f"Invalid parameters: tenant_identifier={tenant_identifier}, config_key={config_key}")
        return default
    
    config_obj = get_tenant_config_obj(tenant_identifier)
    
    if config_obj and hasattr(config_obj, config_key):
        value = getattr(config_obj, config_key)
        return default if value is None else value
    
    logger.debug(f"Configuration key '{config_key}' not found for tenant {tenant_identifier}, using default")
    return default


def get_nested_config_value(tenant_identifier: str, config_key: str, nested_key: str, default: Any = None) -> Any:
    """
    Get a nested configuration value from a JSON field in TenantConfiguration.
    
    This function retrieves a nested key from a JSON field (dictionary) in the
    TenantConfiguration object for the specified tenant, with a fallback default
    value if not found.
    
    Args:
        tenant_identifier: The unique tenant identifier (from URL path)
        config_key: The JSON field name in TenantConfiguration (e.g., 'feature_toggles', 'wallet_config')
        nested_key: The key within the JSON field to retrieve
        default: Default value to return if the nested key is not found
        
    Returns:
        The nested configuration value if found, default otherwise
    """
    if not tenant_identifier or not config_key or not nested_key:
        logger.warning(f"Invalid parameters: tenant_identifier={tenant_identifier}, config_key={config_key}, nested_key={nested_key}")
        return default
    
    config_dict = get_tenant_config_value(tenant_identifier, config_key, default={})
    
    if isinstance(config_dict, dict):
        value = config_dict.get(nested_key, default)
        if value is None:
            logger.debug(f"Nested key '{nested_key}' not found in '{config_key}' for tenant {tenant_identifier}, using default")
            return default
        return value
    
    logger.warning(f"Configuration key '{config_key}' is not a dictionary for tenant {tenant_identifier}, using default")
    return default
