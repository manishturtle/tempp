"""
Tenant Service Integration.

This module provides integration with the Tenant Management service.
It contains stub functions for development and testing purposes.
"""
from typing import List
import logging

logger = logging.getLogger(__name__)


def get_all_active_tenant_client_ids() -> List[int]:
    """
    Get all active tenant client IDs.
    
    In a real implementation, this would query the Tenant Management module's database.
    
    Returns:
        List[int]: List of active tenant client IDs
    """
    # Mock data - in production, this would query the tenant database
    # For now, we return a static list of tenant IDs for development purposes
    logger.debug("Fetching active tenant client IDs (stub implementation)")
    return [1, 2, 3]
