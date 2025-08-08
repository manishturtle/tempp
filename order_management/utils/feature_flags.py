"""
Feature flag utility for checking tenant-specific feature availability.

This module provides utilities for checking if conditional features
like Wallet or Loyalty are enabled for a specific tenant.
"""
from typing import Optional
import logging
from django.core.cache import cache

from order_management.models import TenantConfiguration

logger = logging.getLogger(__name__)

# Feature flag constants
WALLET = 'WALLET'
LOYALTY = 'LOYALTY'

# Cache timeout (1 hour in seconds)
CACHE_TIMEOUT = 3600


def is_feature_enabled(feature_name: str, client_id: int) -> bool:
    """
    Check if a feature is enabled for a specific tenant using TenantConfiguration.
    
    This function checks if a feature like Wallet or Loyalty is enabled
    for the specified tenant by querying the TenantConfiguration model's
    feature_toggles field. Results are cached for performance.
    
    Args:
        feature_name: The name of the feature to check (use constants)
        client_id: The tenant client ID
        
    Returns:
        True if the feature is enabled, False otherwise
    """
    if not feature_name or not client_id:
        logger.warning(f"Invalid parameters: feature_name={feature_name}, client_id={client_id}")
        return False
    
    # Define cache key
    cache_key = f"feature_flag:{client_id}:{feature_name}"
    
    # Try fetching from cache
    cached_value = cache.get(cache_key)
    if cached_value is not None:
        logger.debug(f"Cache hit for {cache_key}: {cached_value}")
        return cached_value
    
    # Not in cache, fetch from TenantConfiguration
    logger.debug(f"Cache miss for {cache_key}, fetching from TenantConfiguration")
    
    is_enabled = False
    
    try:
        # Get the tenant configuration
        config = TenantConfiguration.objects.filter(client_id=client_id).first()
        
        if config and isinstance(config.feature_toggles, dict):
            # Check if the feature key exists and its value is True
            is_enabled = config.feature_toggles.get(feature_name, False)
            # Ensure boolean type just in case something else was stored
            is_enabled = bool(is_enabled)
        else:
            # No config record found for tenant, default to disabled
            is_enabled = False
            if not config:
                logger.debug(f"No TenantConfiguration found for client_id {client_id}. Feature '{feature_name}' defaulted to disabled.")
        
        # Cache the result
        cache.set(cache_key, is_enabled, timeout=CACHE_TIMEOUT)
        
        logger.info(f"Feature {feature_name} is {'enabled' if is_enabled else 'disabled'} for client {client_id}")
        return is_enabled
        
    except Exception as e:
        logger.error(f"Error checking if feature {feature_name} is enabled for client {client_id}: {str(e)}", exc_info=True)
        # Cache the error result (as disabled) for a shorter time to prevent hammering the database
        cache.set(cache_key, False, timeout=300)  # Cache for 5 minutes on error
        return False
