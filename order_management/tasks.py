"""
Asynchronous tasks for Order Management.

This module defines Celery tasks for processing orders, handling payments,
and managing shipments asynchronously.
"""
from typing import Dict, Any, List, Optional, Union
from decimal import Decimal
import logging
import requests
from datetime import timedelta
from celery import shared_task
from django.db import transaction
from django.utils import timezone

from order_management.models import Order, OrderItem, LoyaltyTransaction, OrderStatus, PaymentStatus
from order_management.services import loyalty_service
from order_management.integrations import tenant_service, customer_service, payment_service, notification_service, inventory_service, fulfillment_service
from order_management.utils.feature_flags import is_feature_enabled, LOYALTY
from order_management.utils.config_utils import get_tenant_config_obj
from order_management.exceptions import (
    PaymentServiceError, PaymentConnectionError, PaymentResponseError, PaymentProcessingError,
    NotificationServiceError, NotificationConnectionError, NotificationResponseError, NotificationSendError,
    InventoryServiceError, InventoryConnectionError, InventoryResponseError, InventoryReservationError,
    FulfillmentServiceError, FulfillmentConnectionError, FulfillmentResponseError, FulfillmentProcessError,
    CustomerServiceError, CustomerConnectionError, CustomerResponseError, CustomerNotFoundError
)

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, acks_late=True)
def process_order(self, order_id: int) -> Dict[str, Any]:
    """
    Process a new order asynchronously.
    
    This task handles the following operations:
    1. Verify inventory availability
    2. Reserve inventory
    3. Calculate final pricing
    4. Update order status
    
    Args:
        self: The task instance (provided by bind=True)
        order_id: The ID of the order to process
        
    Returns:
        Dictionary with processing results
    """
    logger.info(f"Processing order ID: {order_id} (Attempt {self.request.retries + 1}/{self.max_retries + 1})")
    
    try:
        # Check if order exists
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            logger.error(f"Order with ID {order_id} not found")
            # No retry needed if order doesn't exist
            return {
                "success": False,
                "error": f"Order with ID {order_id} not found"
            }
        
        # Check if order is already processed (idempotency check)
        if order.status not in ["DRAFT", "PENDING"]:
            logger.info(f"Order {order_id} already processed with status {order.status}. Skipping.")
            return {
                "success": True,
                "order_id": order_id,
                "status": order.status,
                "message": "Order already processed",
                "processed_at": timezone.now().isoformat()
            }
        
        # Verify and reserve inventory
        try:
            items = [
                {"sku": item.product_id, "quantity": item.quantity}
                for item in order.items.all()
            ]
            
            inventory_service.reserve_inventory(
                order_id=order.id,
                items=items,
                client_id=order.client_id
            )
            logger.info(f"Successfully reserved inventory for order {order_id}")
            
        except InventoryReservationError as e:
            logger.error(f"Inventory reservation error for order {order_id}: {str(e)}")
            retry_delay = 60 * (2 ** self.request.retries)
            raise self.retry(exc=e, countdown=retry_delay)
            
        except InventoryConnectionError as e:
            logger.error(f"Inventory service connection error for order {order_id}: {str(e)}")
            retry_delay = 60 * (2 ** self.request.retries)
            raise self.retry(exc=e, countdown=retry_delay)
            
        except InventoryResponseError as e:
            logger.error(f"Inventory service response error for order {order_id}: {str(e)}")
            retry_delay = 60 * (2 ** self.request.retries)
            raise self.retry(exc=e, countdown=retry_delay)
        
        # Update order status within transaction
        with transaction.atomic():
            order = Order.objects.select_for_update().get(id=order_id)
            order.status = "PROCESSING"
            order.save(update_fields=['status', 'updated_at'])
        
        logger.info(f"Successfully processed order {order_id}")
        return {
            "success": True,
            "order_id": order_id,
            "status": order.status,
            "processed_at": timezone.now().isoformat()
        }
        
    except (InventoryServiceError, PaymentServiceError) as e:
        # These are already handled in specific exception blocks above
        # This catch-all ensures we don't miss any subclass exceptions
        logger.error(f"Service error processing order {order_id}: {str(e)}")
        retry_delay = 60 * (2 ** self.request.retries)
        raise self.retry(exc=e, countdown=retry_delay)
        
    except Exception as e:
        logger.exception(f"Unexpected error processing order {order_id}: {str(e)}")
        # For unexpected errors, we may still want to retry
        if self.request.retries < self.max_retries:
            retry_delay = 60 * (2 ** self.request.retries)
            raise self.retry(exc=e, countdown=retry_delay)
        
        # If we've exhausted retries or it's a non-retryable error
        return {
            "success": False,
            "error": str(e),
            "order_id": order_id
        }


@shared_task(bind=True, max_retries=3, acks_late=True)
def update_order_totals(self, order_id: int) -> Dict[str, Any]:
    """
    Update order totals based on order items.
    
    This task recalculates the following:
    - Subtotal amount
    - Total amount (including tax, shipping, discounts)
    
    Args:
        self: The task instance (provided by bind=True)
        order_id: The ID of the order to update
        
    Returns:
        Dictionary with update results
    """
    logger.info(f"Updating order totals for order ID: {order_id} (Attempt {self.request.retries + 1}/{self.max_retries + 1})")
    
    try:
        # Check if order exists
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            logger.error(f"Order with ID {order_id} not found")
            # No retry needed if order doesn't exist
            return {
                "success": False,
                "error": f"Order with ID {order_id} not found"
            }
        
        # Perform update within transaction
        try:
            with transaction.atomic():
                # Use select_for_update to prevent race conditions
                order = Order.objects.select_for_update().get(id=order_id)
                items = order.items.all()
                
                # Calculate subtotal
                subtotal = sum(item.total_price for item in items)
                
                # Update order
                order.subtotal_amount = subtotal
                order.total_amount = (
                    subtotal - order.discount_amount + 
                    order.shipping_amount + order.tax_amount
                )
                order.save(update_fields=['subtotal_amount', 'total_amount', 'updated_at'])
                
                logger.info(f"Successfully updated totals for order {order_id}: subtotal={subtotal}, total={order.total_amount}")
                
                return {
                    "success": True,
                    "order_id": order_id,
                    "subtotal": str(order.subtotal_amount),
                    "total": str(order.total_amount)
                }
        except Exception as e:
            logger.error(f"Database error updating order totals for order {order_id}: {str(e)}")
            retry_delay = 30 * (2 ** self.request.retries)
            raise self.retry(exc=e, countdown=retry_delay)
    
    except Exception as e:
        logger.exception(f"Unexpected error updating order totals for order {order_id}: {str(e)}")
        # For unexpected errors, we may still want to retry
        if self.request.retries < self.max_retries:
            retry_delay = 30 * (2 ** self.request.retries)
            raise self.retry(exc=e, countdown=retry_delay)
        
        # If we've exhausted retries or it's a non-retryable error
        return {
            "success": False,
            "error": str(e),
            "order_id": order_id
        }


@shared_task(bind=True, max_retries=2, acks_late=True)
def cleanup_abandoned_orders(self) -> Dict[str, Any]:
    """
    Clean up abandoned draft orders.
    
    This task finds draft orders that haven't been updated in 24 hours
    and marks them as abandoned.
    
    Args:
        self: The task instance (provided by bind=True)
        
    Returns:
        Dictionary with cleanup results
    """
    logger.info(f"Starting cleanup of abandoned orders (Attempt {self.request.retries + 1}/{self.max_retries + 1})")
    
    try:
        # Time threshold for abandoned orders (24 hours ago)
        threshold = timezone.now() - timezone.timedelta(hours=24)
        
        # Find abandoned draft orders
        abandoned_orders = Order.objects.filter(
            status="DRAFT",
            updated_at__lt=threshold
        )
        
        # Log the count before updating
        count = abandoned_orders.count()
        logger.info(f"Found {count} abandoned draft orders to clean up")
        
        # Update their status in batches to avoid long-running transactions
        batch_size = 100
        processed_count = 0
        
        if count > 0:
            # Get the IDs to process in batches
            order_ids = list(abandoned_orders.values_list('id', flat=True))
            
            for i in range(0, len(order_ids), batch_size):
                batch_ids = order_ids[i:i+batch_size]
                try:
                    with transaction.atomic():
                        # Update status for this batch
                        updated = Order.objects.filter(id__in=batch_ids).update(
                            status="CANCELLED",
                            updated_at=timezone.now()
                        )
                        processed_count += updated
                        logger.info(f"Updated {updated} orders in batch {i//batch_size + 1}")
                except Exception as batch_error:
                    logger.error(f"Error updating batch {i//batch_size + 1}: {str(batch_error)}")
                    # Continue with next batch instead of failing the entire task
        
        logger.info(f"Cleanup completed. Processed {processed_count} of {count} abandoned orders")
        return {
            "success": True,
            "found_orders_count": count,
            "cleaned_orders_count": processed_count
        }
        
    except Exception as e:
        logger.exception(f"Unexpected error in cleanup_abandoned_orders: {str(e)}")
        # For database-related errors, retry with backoff
        if self.request.retries < self.max_retries:
            retry_delay = 60 * (2 ** self.request.retries)
            raise self.retry(exc=e, countdown=retry_delay)
        
        # If we've exhausted retries
        return {
            "success": False,
            "error": str(e)
        }


@shared_task(bind=True, max_retries=3, acks_late=True)
def award_loyalty_points_task(self, order_id: int) -> Dict[str, Any]:
    """
    Award loyalty points for a completed order.
    
    This task retrieves the order and calls the loyalty service
    to award points based on the order amount.
    
    Args:
        self: The task instance (provided by bind=True)
        order_id: The ID of the order to award points for
        
    Returns:
        Dictionary with results of the loyalty point awarding
    """
    logger.info(f"Awarding loyalty points for order ID: {order_id} (Attempt {self.request.retries + 1}/{self.max_retries + 1})")
    
    try:
        # Check for idempotency - see if points were already awarded for this order
        existing_transaction = LoyaltyTransaction.objects.filter(
            related_order_id=order_id,
            transaction_type='ORDER_REWARD'
        ).first()
        
        if existing_transaction:
            logger.info(f"Loyalty points already awarded for order {order_id}. Skipping.")
            return {
                "status": "skipped",
                "order_id": order_id,
                "message": "Points already awarded for this order",
                "points_awarded": existing_transaction.points_change
            }
        
        # Retrieve the order
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            logger.error(f"Order with ID {order_id} not found")
            # No retry needed if order doesn't exist
            return {"status": "error", "message": f"Order with ID {order_id} not found"}
        
        # Check if loyalty feature is enabled for this tenant
        if not is_feature_enabled(LOYALTY, order.client_id):
            logger.info(f"Loyalty program is not enabled for client {order.client_id}. Skipping points award.")
            return {
                "status": "skipped",
                "order_id": order_id,
                "order_number": order.order_number,
                "message": "Loyalty program is not enabled for this tenant"
            }
        
        # Award points using the loyalty service
        try:
            result = loyalty_service.award_points_for_order(order=order)
            
            logger.info(f"Successfully awarded {result['points_awarded']} loyalty points for order {order.order_number}")
            return {
                "status": "success",
                "order_id": order_id,
                "order_number": order.order_number,
                "points_awarded": result['points_awarded']
            }
        except loyalty_service.LoyaltyError as e:
            logger.error(f"Loyalty service error for order {order_id}: {str(e)}")
            # Retry with exponential backoff
            retry_delay = 60 * (2 ** self.request.retries)
            raise self.retry(exc=e, countdown=retry_delay)
        
    except Exception as e:
        logger.exception(f"Unexpected error awarding loyalty points for order {order_id}: {str(e)}")
        # For unexpected errors, we may still want to retry
        if self.request.retries < self.max_retries:
            retry_delay = 60 * (2 ** self.request.retries)
            raise self.retry(exc=e, countdown=retry_delay)
        
        # If we've exhausted retries or it's a non-retryable error
        return {
            "status": "error", 
            "message": str(e),
            "order_id": order_id
        }


@shared_task(bind=True, name='expire_loyalty_points', max_retries=3, acks_late=True)
def expire_loyalty_points_task(self) -> Dict[str, Any]:
    """
    Celery task to expire loyalty points for all accounts across all tenants.
    
    This task:
    1. Gets all active tenant client IDs
    2. For each tenant, switches tenant context
    3. For each account, expires points based on configured rules
    
    Args:
        self: The task instance (provided by bind=True)
        
    Returns:
        Dictionary with task execution results
    """
    logger.info(f"Starting loyalty points expiry task (Attempt {self.request.retries + 1}/{self.max_retries + 1})")
    
    try:
        # Get all active tenant IDs
        try:
            tenant_ids = tenant_service.get_all_active_tenant_client_ids()
            logger.info(f"Processing {len(tenant_ids)} active tenants")
        except Exception as e:
            logger.error(f"Failed to get active tenant IDs: {str(e)}")
            retry_delay = 60 * (2 ** self.request.retries)
            raise self.retry(exc=e, countdown=retry_delay)
        
        expired_points_count = 0
        processed_accounts_count = 0
        error_count = 0
        tenant_errors = []
        
        # Process each tenant
        for client_id in tenant_ids:
            try:
                # Set tenant context for this iteration
                from core.utils.tenant import set_tenant_context
                set_tenant_context(client_id)
                
                # Check if loyalty feature is enabled for this tenant
                if not is_feature_enabled(LOYALTY, client_id):
                    logger.info(f"Loyalty program is not enabled for tenant {client_id}. Skipping.")
                    continue
                    
                # Get all accounts for this tenant
                try:
                    account_ids = customer_service.get_accounts_for_tenant(client_id)
                    logger.info(f"Processing {len(account_ids)} accounts for tenant {client_id}")
                except CustomerServiceError as e:
                    logger.error(f"Customer service error for tenant {client_id}: {str(e)}")
                    tenant_errors.append({"client_id": client_id, "error": str(e)})
                    error_count += 1
                    continue  # Skip this tenant but continue with others
                
                # Process each account
                for account_id in account_ids:
                    try:
                        # Expire points for this account
                        transaction = loyalty_service.expire_points_for_account(
                            account_id=account_id, 
                            client_id=client_id
                        )
                        
                        # Update counters
                        if transaction:
                            # Points were expired (transaction.points_change is negative)
                            points_expired = abs(transaction.points_change)
                            expired_points_count += points_expired
                            
                            logger.info(
                                f"Expired {points_expired} points for account {account_id} "
                                f"in tenant {client_id}"
                            )
                        
                        processed_accounts_count += 1
                            
                    except loyalty_service.LoyaltyError as e:
                        error_count += 1
                        logger.error(
                            f"Loyalty service error for account {account_id} in tenant {client_id}: {str(e)}"
                        )
                    except Exception as e:
                        error_count += 1
                        logger.error(
                            f"Error expiring points for account {account_id} in tenant {client_id}: {str(e)}"
                        )
                        
            except Exception as e:
                error_count += 1
                tenant_errors.append({"client_id": client_id, "error": str(e)})
                logger.error(f"Error processing tenant {client_id}: {str(e)}")
        
        logger.info(
            f"Loyalty points expiry task completed. "
            f"Processed {processed_accounts_count} accounts, expired {expired_points_count} points, "
            f"encountered {error_count} errors"
        )
        
        return {
            "status": "success",
            "processed_accounts": processed_accounts_count,
            "expired_points": expired_points_count,
            "errors": error_count,
            "tenant_errors": tenant_errors if tenant_errors else None
        }
        
    except Exception as e:
        logger.exception(f"Unexpected error in expire_loyalty_points_task: {str(e)}")
        # For unexpected errors, we may still want to retry
        if self.request.retries < self.max_retries:
            retry_delay = 60 * (2 ** self.request.retries)
            raise self.retry(exc=e, countdown=retry_delay)
        
        # If we've exhausted retries or it's a non-retryable error
        return {
            "status": "error",
            "message": str(e)
        }


@shared_task(name='cancel_expired_pending_orders')
def cancel_expired_pending_orders_task() -> Dict[str, Any]:
    """
    Automatically cancel orders that have been in PENDING_PAYMENT status beyond
    the configured timeout period for each tenant.
    
    This task:
    1. Gets all active tenant client IDs
    2. For each tenant, switches tenant context
    3. For each tenant, gets the configured timeout period
    4. Finds orders in PENDING_PAYMENT status older than the timeout
    5. Cancels those orders and updates their payment status
    
    Returns:
        Dictionary with task execution results
    """
    logger.info("Starting expired pending orders cancellation task")
    
    # Get all active tenant IDs
    try:
        active_tenant_ids = tenant_service.get_all_active_tenant_client_ids()
        logger.info(f"Processing {len(active_tenant_ids)} active tenants")
    except Exception as e:
        logger.error(f"Failed to get active tenant IDs: {str(e)}")
        return {
            "status": "error",
            "message": f"Failed to get active tenant IDs: {str(e)}"
        }
    
    total_cancelled = 0
    tenant_results = []
    
    # Process each tenant
    for client_id in active_tenant_ids:
        try:
            # Set tenant context for this iteration
            from core.utils.tenant import set_tenant_context
            set_tenant_context(client_id)
            
            # Get tenant configuration
            config = get_tenant_config_obj(client_id)
            timeout_minutes = config.pending_payment_timeout_minutes if config else None
            
            # Skip if timeout is disabled
            if not timeout_minutes or timeout_minutes <= 0:
                logger.info(f"Auto-cancellation timeout is disabled for client_id {client_id}")
                tenant_results.append({
                    "client_id": client_id,
                    "status": "skipped",
                    "reason": "Timeout disabled"
                })
                continue
            
            # Calculate cutoff time
            from django.utils import timezone
            from datetime import timedelta
            cutoff_time = timezone.now() - timedelta(minutes=timeout_minutes)
            
            # Find expired orders
            # Now we're filtering by client_id to ensure we're only processing orders for the current tenant
            expired_orders_qs = Order.objects.filter(
                client_id=client_id,
                status=OrderStatus.PENDING_PAYMENT,
                created_at__lt=cutoff_time
            )
            
            if expired_orders_qs.exists():
                # Use transaction to ensure atomicity
                with transaction.atomic():
                    # Update all expired orders in bulk
                    updated_count = expired_orders_qs.update(
                        status=OrderStatus.CANCELLED,
                        payment_status=PaymentStatus.FAILED,
                        updated_at=timezone.now()
                    )
                    
                    logger.info(f"Auto-cancelled {updated_count} expired pending orders for client_id {client_id}")
                    total_cancelled += updated_count
                    
                    tenant_results.append({
                        "client_id": client_id,
                        "status": "success",
                        "cancelled_count": updated_count,
                        "timeout_minutes": timeout_minutes
                    })
            else:
                logger.info(f"No expired pending orders found for client_id {client_id}")
                tenant_results.append({
                    "client_id": client_id,
                    "status": "success",
                    "cancelled_count": 0,
                    "timeout_minutes": timeout_minutes
                })
                
        except Exception as e:
            logger.error(f"Error processing tenant {client_id}: {str(e)}", exc_info=True)
            tenant_results.append({
                "client_id": client_id,
                "status": "error",
                "error": str(e)
            })
    
    logger.info(f"Expired orders cancellation task completed. Cancelled {total_cancelled} orders across {len(active_tenant_ids)} tenants")
    
    return {
        "status": "success",
        "total_cancelled": total_cancelled,
        "tenant_results": tenant_results
    }


@shared_task(bind=True, max_retries=3, acks_late=True)
def submit_order_for_fulfillment_task(self, order_id: int) -> Dict[str, Any]:
    """
    Submit an order to the fulfillment service.
    
    This task retrieves the order details and calls the fulfillment service
    to create a fulfillment request.
    
    Args:
        self: The task instance (provided by bind=True)
        order_id: The order ID to submit for fulfillment
        
    Returns:
        Dictionary with results of the fulfillment submission
    """
    logger.info(f"Submitting order ID: {order_id} for fulfillment (Attempt {self.request.retries + 1}/{self.max_retries + 1})")
    
    try:
        # Get order
        try:
            order = Order.objects.get(id=order_id)
        except Order.DoesNotExist:
            logger.error(f"Order with ID {order_id} not found")
            # No retry needed if order doesn't exist
            return {
                "success": False,
                "error": f"Order with ID {order_id} not found",
                "order_id": order_id
            }
            
        # Check if order is in a valid state for fulfillment
        if order.status != 'PROCESSING':
            logger.warning(f"Order {order_id} is not in PROCESSING state. Current state: {order.status}. Skipping fulfillment.")
            return {
                "success": False,
                "error": f"Order is in {order.status} status, not PROCESSING",
                "order_id": order_id
            }
            
        # Prepare order items for fulfillment
        order_items = []
        for item in order.items.all():
            order_items.append({
                "sku": item.product_sku,
                "quantity": item.quantity,
                "unit_price": str(item.unit_price),
                "name": item.product_name
            })
            
        # Handle empty items (shouldn't happen, but just in case)
        if not order_items:
            logger.error(f"Order {order_id} has no items. Cannot submit for fulfillment.")
            return {
                "success": False,
                "error": "Order has no items",
                "order_id": order_id
            }
            
        # Get shipping details
        shipping_address = order.shipping_address
        shipping_method = {
            "id": order.shipping_method_id,
            "name": order.shipping_method_name
        }
        
        # Call fulfillment service
        try:
            fulfillment_details = fulfillment_service.submit_order_for_fulfillment(
                tenant_identifier=str(order.client_id),
                order_id=str(order.id),
                shipping_address=shipping_address,
                items=order_items,
                shipping_method=shipping_method
            )
            
            # Update order with fulfillment details (optional)
            if fulfillment_details and 'fulfillment_id' in fulfillment_details:
                # Store fulfillment ID in order's custom_fields
                custom_fields = order.custom_fields or {}
                custom_fields['fulfillment_id'] = fulfillment_details['fulfillment_id']
                order.custom_fields = custom_fields
                order.save(update_fields=['custom_fields', 'updated_at'])
                
            logger.info(f"Successfully submitted order {order_id} for fulfillment")
            return {
                "success": True,
                "order_id": order_id,
                "fulfillment_id": fulfillment_details.get('fulfillment_id')
            }
                
        except FulfillmentConnectionError as e:
            logger.error(f"Failed to connect to fulfillment service for order {order_id}: {str(e)}")
            retry_delay = 60 * (2 ** self.request.retries)
            raise self.retry(exc=e, countdown=retry_delay)
            
        except FulfillmentResponseError as e:
            logger.error(f"Fulfillment service error response for order {order_id}: {e.status_code} - {e.message}")
            retry_delay = 60 * (2 ** self.request.retries)
            raise self.retry(exc=e, countdown=retry_delay)
            
        except FulfillmentProcessError as e:
            logger.error(f"Fulfillment processing error for order {order_id}: {str(e)}")
            retry_delay = 60 * (2 ** self.request.retries)
            raise self.retry(exc=e, countdown=retry_delay)
            
        except FulfillmentServiceError as e:
            logger.error(f"General fulfillment service error for order {order_id}: {str(e)}")
            retry_delay = 60 * (2 ** self.request.retries)
            raise self.retry(exc=e, countdown=retry_delay)
            
    except Exception as e:
        logger.exception(f"Unexpected error submitting order {order_id} for fulfillment: {str(e)}")
        # For unexpected errors, we may still want to retry
        if self.request.retries < self.max_retries:
            retry_delay = 60 * (2 ** self.request.retries)
            raise self.retry(exc=e, countdown=retry_delay)
        
        # If we've exhausted retries or it's a non-retryable error
        return {
            "success": False,
            "error": str(e),
            "order_id": order_id
        }
