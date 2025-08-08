"""
Policy Service Integration.

This module provides implementations for the Policy Service API.
These functions handle policy-related functionality for returns and other business rules.
"""
from typing import Tuple, List, Dict, Any
import logging
from django.utils import timezone
from datetime import timedelta

from order_management.models import Order, OrderItem
from order_management.utils.config_utils import get_tenant_config_value

logger = logging.getLogger(__name__)


def can_initiate_return(order: Order, items_data: List[Dict[str, Any]], user_id: int) -> Tuple[bool, str]:
    """
    Check if a return can be initiated for the given order and items based on tenant configuration.
    
    Args:
        order: The Order object
        items_data: List of dictionaries containing order_item_id, quantity, and reason
        user_id: The ID of the user initiating the return
        
    Returns:
        Tuple of (is_allowed: bool, message: str)
    """
    logger.info(f"Checking return policy for order {order.id}, items: {items_data}, user: {user_id}")

    # Get tenant configuration
    tenant_config = get_tenant_config_value(
        str(order.client_id),
        'return_policy',
        {'enabled': True, 'window_days': 30, 'non_returnable_skus': []}
    )

    # 1. Check if order status is valid for returns
    allowed_statuses = get_tenant_config_value(
        str(order.client_id),
        'return_allowed_statuses',
        ['DELIVERED']
    )
    if order.status not in allowed_statuses:
        return (False, f"Order status {order.status} is not eligible for returns. Must be one of: {', '.join(allowed_statuses)}")

    # 2. Check if within return window
    return_window_days = tenant_config.get('window_days', 30)
    delivery_date = order.delivery_date if hasattr(order, 'delivery_date') else order.updated_at
    current_time = timezone.now()
    
    if (current_time - delivery_date).days > return_window_days:
        return (False, f"Return window of {return_window_days} days has expired")

    # 3. Check if all items are returnable
    non_returnable_skus = get_tenant_config_value(str(order.client_id), 'non_returnable_skus', [])
    
    # Get all order items being returned
    order_items = {str(item.id): item for item in order.items.all()}
    
    for item_data in items_data:
        order_item_id = str(item_data.get('order_item_id'))
        if order_item_id not in order_items:
            return (False, f"Invalid order item ID: {order_item_id}")
            
        order_item = order_items[order_item_id]
        if order_item.product_sku in non_returnable_skus:
            return (False, f"Product {order_item.product_sku} is not eligible for return")
            
        # Check if return quantity is valid
        requested_qty = int(item_data.get('quantity', 0))
        if requested_qty <= 0 or requested_qty > order_item.quantity:
            return (False, f"Invalid return quantity {requested_qty} for item {order_item.product_sku}")

    return (True, "Return policy checks passed successfully")
