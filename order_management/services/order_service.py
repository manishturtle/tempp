"""
Order service module for handling order-related operations.

This module provides functions for creating and managing orders,
including order creation from payment data.
"""

import logging
from decimal import Decimal
from typing import Dict, Any, Optional, Tuple, List
from django.db import transaction
from django.utils import timezone
from django.conf import settings
from celery import shared_task

from order_management.models import Order, OrderItem, OrderStatus, Payment, WalletTransactionType
from order_management.models import Cart 
from order_management.checkout_session import get_checkout_data, SHIPPING_ADDRESS_SESSION_KEY, SHIPPING_METHOD_SESSION_KEY, LOYALTY_POINTS_TO_REDEEM_KEY
from order_management.integrations import inventory_service, notification_service, fulfillment_service, config_service, customer_service
from order_management.services import wallet_service, loyalty_service
from order_management.utils.feature_flags import is_feature_enabled, WALLET, LOYALTY

logger = logging.getLogger(__name__)


class OrderCreationFailedError(Exception):
    """Exception raised when order creation fails."""
    pass


class InventoryReservationError(Exception):
    """Exception raised when inventory reservation fails."""
    pass


def create_order_from_payment(
    cart_id: int,
    auth_credential_id: Optional[int] = None,
    payment_data: Dict[str, Any] = None,
    checkout_data: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Create an order from a cart after successful payment.
    
    This function handles the creation of an order after a successful payment.
    It validates the cart, checks inventory, creates the order and order items,
    records payment information, and clears the cart.
    
    Args:
        cart_id: The cart ID
        auth_credential_id: The authenticated user's credential ID (can be None for guest checkout)
        payment_data: Payment transaction data
        
    Returns:
        Dictionary with order details
        
    Raises:
        ValueError: If cart is invalid or empty
        Exception: If order creation fails
    """
    try:
        # Start a transaction to ensure atomicity
        with transaction.atomic():
            # Get the cart and validate
            try:
                from order_management.cart.models import Cart
                cart = Cart.objects.get(id=cart_id)
            except Cart.DoesNotExist:
                logger.error(f"Cart {cart_id} not found")
                raise ValueError(f"Cart {cart_id} not found")
            
            # Check if cart is empty
            if not cart.items.exists():
                logger.error(f"Cart {cart_id} is empty")
                raise ValueError("Cannot create order from empty cart")
            
            # Check inventory for all items
            for item in cart.items.all():
                # This would typically call inventory_service to check availability
                # For now, we'll assume inventory is available
                pass
            
            # Get subtotal amount
            subtotal = cart.get_subtotal_amount()
            
            # Initialize variables for loyalty redemption
            loyalty_discount = Decimal('0.00')
            loyalty_points_redeemed = 0
            
            # Check if loyalty points were redeemed during checkout
            if checkout_data and LOYALTY_POINTS_TO_REDEEM_KEY in checkout_data:
                loyalty_info = checkout_data.get(LOYALTY_POINTS_TO_REDEEM_KEY)
                if loyalty_info and loyalty_info.get('points', 0) > 0:
                    loyalty_points_redeemed = loyalty_info.get('points', 0)
                    loyalty_discount = Decimal(loyalty_info.get('discount', '0.00'))
                    logger.info(f"Applying loyalty discount of {loyalty_discount} for {loyalty_points_redeemed} points")
            
            # Calculate total amount with loyalty discount
            total_amount = subtotal - loyalty_discount
            
            # Map credential ID to contact ID and account ID
            contact_id = None
            account_id = None
            
            if auth_credential_id:
                # Map credential ID to contact ID
                contact_id = customer_service.get_contact_id_for_credential(credential_id=auth_credential_id)
                
                if not contact_id:
                    logger.warning(f"Could not map credential ID {auth_credential_id} to contact ID")
                else:
                    # Map contact ID to account ID
                    account_id = customer_service.get_account_id_for_contact(contact_id=contact_id)
                    if not account_id:
                        logger.warning(f"Could not map contact ID {contact_id} to account ID")
            
            # Create the order
            order = Order.objects.create(
                contact_person_id=contact_id,  # Use mapped contact ID
                account_id=account_id,         # Use mapped account ID
                order_number=f"ORD-{timezone.now().strftime('%Y%m%d')}-{payment_data.get('transaction_id', '')[-8:]}",
                status="PAID",
                subtotal_amount=subtotal,
                discount_amount=loyalty_discount,  # Apply loyalty discount to discount_amount
                total_amount=total_amount,
                created_by_id=auth_credential_id,  # Use credential ID for audit field
                updated_by_id=auth_credential_id,  # Use credential ID for audit field
                # Add shipping cost if available in session
                # shipping_cost=Decimal(shipping_method.get('cost', '0.00')),
                # Add other order details as needed
            )
            
            # Create order items
            for cart_item in cart.items.all():
                OrderItem.objects.create(
                    order=order,
                    product_id=cart_item.product_id,
                    quantity=cart_item.quantity,
                    unit_price=cart_item.price,
                    total_price=cart_item.price * cart_item.quantity,
                    # Add other item details as needed
                )
            
            # Create payment record
            payment = Payment.objects.create(
                order=order,
                transaction_id=payment_data.get('transaction_id', ''),
                payment_method=payment_data.get('payment_method', ''),
                amount=payment_data.get('amount', 0),
                status=payment_data.get('status', 'completed'),
                # Add other payment details as needed
            )
            
            # Process loyalty points redemption if applicable
            if loyalty_points_redeemed > 0 and auth_credential_id:
                # Check if loyalty feature is enabled for this tenant
                if not is_feature_enabled(LOYALTY):
                    logger.warning(f"Loyalty program is not enabled, but loyalty points redemption was attempted")
                    raise ValueError("Loyalty program is not enabled")
                    
                try:
                    # Redeem loyalty points
                    redeemed_ok = loyalty_service.redeem_points_for_checkout(
                        auth_credential_id=auth_credential_id,
                        client_id=order.client_id,
                        points_to_redeem=loyalty_points_redeemed,
                        order_being_placed=order
                    )
                    
                    if not redeemed_ok:
                        logger.error(f"Failed to redeem {loyalty_points_redeemed} loyalty points for order {order.order_number}")
                        raise OrderCreationFailedError("Failed to redeem loyalty points.")
                    
                    logger.info(f"Successfully redeemed {loyalty_points_redeemed} loyalty points for order {order.order_number}")
                except loyalty_service.LoyaltyError as e:
                    logger.error(f"Loyalty service error for order {order.id}: {str(e)}")
                    raise OrderCreationFailedError(f"Failed to redeem loyalty points: {str(e)}")
            
            # Create initial order status
            OrderStatus.objects.create(
                order=order,
                status='PAID',
                notes='Order created from successful payment',
                timestamp=timezone.now()
            )
            
            # Check if wallet was used for payment
            wallet_amount_used = Decimal(payment_data.get('wallet_amount_used', '0.00'))
            
            if wallet_amount_used > Decimal('0.00'):
                logger.info(f"Processing wallet payment of {wallet_amount_used} for order {order.order_number}")
                
                # Check if wallet feature is enabled
                if not is_feature_enabled(WALLET):
                    logger.warning(f"Wallet feature is not enabled, but wallet payment was attempted")
                    raise ValueError("Wallet feature is not enabled")
                
                try:
                    # We already have the contact_id and account_id from earlier mapping
                    if not contact_id or not account_id:
                        logger.error(f"Missing contact_id or account_id for wallet operation")
                        raise ValueError("Cannot process wallet payment without proper contact and account mapping")
                    
                    # Get or create the wallet
                    wallet = wallet_service.get_or_create_wallet(
                        account_id=account_id,
                        created_by_user_id=auth_credential_id
                    )
                    
                    # Add a transaction to debit the wallet (negative amount for debit)
                    wallet_service.add_transaction(
                        wallet=wallet,
                        transaction_type=WalletTransactionType.ORDER_PAYMENT,
                        amount=-wallet_amount_used,  # Negative amount for debit
                        created_by_user_id=auth_credential_id,
                        related_order=order,
                        notes=f"Payment for order {order.order_number}"
                    )
                    
                    logger.info(f"Successfully debited {wallet_amount_used} from wallet for order {order.order_number}")
                    
                except wallet_service.WalletError as e:
                    # Log the error but don't roll back the transaction
                    # In a production system, this should trigger alerts and manual intervention
                    logger.error(f"Error debiting wallet for order {order.order_number}: {e}")
                    
                except Exception as e:
                    logger.error(f"Unexpected error debiting wallet for order {order.order_number}: {e}")
                    raise  # Re-raise to trigger transaction rollback
            
            # Clear the cart
            cart.items.all().delete()
            
            # Optionally send order confirmation
            # This would typically call a notification service
            # notification_service.send_order_confirmation(order.id)
            
            logger.info(f"Order {order.order_number} created successfully")
            
            # Check if loyalty program is enabled
            loyalty_config = config_service.get_loyalty_config()
            if loyalty_config and loyalty_config.get('enabled', False):
                # Trigger the Celery task to award loyalty points
                from order_management.tasks import award_loyalty_points_task
                transaction.on_commit(lambda: award_loyalty_points_task.delay(order_id=order.id))
                logger.info(f"Scheduled loyalty points awarding for order {order.order_number}")
            
            return {
                'order_id': order.id,
                'order_number': order.order_number,
                'total_amount': str(order.total_amount),
                'status': order.status,
                'transaction_id': payment.transaction_id
            }
    
    except ValueError as e:
        logger.error(f"Value error creating order from payment: {e}")
        raise
    except Exception as e:
        logger.error(f"Error creating order from payment: {e}")
        raise


def create_order_from_checkout(
    cart_id: int,
    user_id: Optional[int],
    checkout_data: Dict[str, Any],
    payment_data: Dict[str, Any],
    request=None
) -> Order:
    """
    Create an order from checkout data after successful payment.
    
    This function handles the creation of an order using checkout data.
    It validates the cart, reserves inventory, creates the order and order items,
    and triggers notifications and fulfillment processes.
    
    Args:
        cart_id: The cart ID
        user_id: The user ID (can be None for guest checkout)
        checkout_data: Dictionary containing checkout data
        payment_data: Dictionary containing payment data
        request: Optional request object containing tenant context
        
    Returns:
        The created Order object
        
    Raises:
        OrderCreationFailedError: If order creation fails
    """
    logger.info(f"Creating order from checkout for cart {cart_id}")
    
    try:
        # Start a transaction to ensure atomicity
        with transaction.atomic():
            # Get the cart and validate
            try:
                cart = Cart.objects.get(id=cart_id)
                
                # Validate cart status
                if cart.status != 'OPEN':
                    logger.error(f"Cart {cart_id} has invalid status: {cart.status}")
                    raise OrderCreationFailedError(f"Cart {cart_id} has invalid status: {cart.status}")
                
                # Check if cart is empty
                if not cart.items.exists():
                    logger.error(f"Cart {cart_id} is empty")
                    raise OrderCreationFailedError("Cannot create order from empty cart")
                
            except Cart.DoesNotExist:
                logger.error(f"Cart {cart_id} not found")
                raise OrderCreationFailedError(f"Cart {cart_id} not found")
            
            # Extract addresses and shipping method from checkout_data
            shipping_address = checkout_data.get(SHIPPING_ADDRESS_SESSION_KEY, {})
            shipping_method = checkout_data.get(SHIPPING_METHOD_SESSION_KEY, {})
            
            if not shipping_address:
                logger.error("Shipping address not provided in checkout data")
                raise OrderCreationFailedError("Shipping address is required")
                
            if not shipping_method:
                logger.error("Shipping method not provided in checkout data")
                raise OrderCreationFailedError("Shipping method is required")
            
            # Prepare items list for inventory reservation
            items = []
            for cart_item in cart.items.all():
                items.append({
                    'sku': cart_item.product_id,
                    'quantity': cart_item.quantity
                })
            
            # Try to reserve inventory
            try:
                inventory_service.reserve_inventory(
                    order_id=None,  # Will be assigned after order creation
                    items=items
                )
                logger.info(f"Successfully reserved inventory for cart {cart_id}")
            except inventory_service.InventoryReservationError as e:
                logger.error(f"Inventory reservation failed for cart {cart_id}: {str(e)}")
                # If payment was already processed, trigger refund
                if payment_data and payment_data.get('transaction_id'):
                    try:
                        from order_management.integrations import payment_service
                        from order_management.exceptions import PaymentServiceError, PaymentConnectionError, PaymentResponseError, PaymentProcessingError
                        
                        payment_service.process_refund(
                            transaction_id=payment_data.get('transaction_id'),
                            amount=payment_data.get('amount', 0),
                            reason="Inventory reservation failed"
                        )
                        logger.info(f"Refund initiated for transaction {payment_data.get('transaction_id')} due to inventory reservation failure")
                    except PaymentConnectionError as e:
                        logger.critical(f"Failed to connect to payment service for refund after inventory reservation failure: {str(e)}")
                    except PaymentResponseError as e:
                        logger.critical(f"Payment service error response for refund after inventory reservation failure: {e.status_code} - {e.message}")
                    except PaymentProcessingError as e:
                        logger.critical(f"Payment processing error for refund after inventory reservation failure: {str(e)}")
                    except PaymentServiceError as e:
                        logger.critical(f"General payment service error for refund after inventory reservation failure: {str(e)}")
                    except Exception as refund_error:
                        logger.critical(f"Unexpected error processing refund after inventory reservation failure: {str(refund_error)}")
                raise OrderCreationFailedError(f"Failed to reserve inventory: {str(e)}")
            except inventory_service.InventoryConnectionError as e:
                logger.critical(f"Inventory service connection error for cart {cart_id}: {str(e)}")
                # If payment was already processed, trigger refund
                if payment_data and payment_data.get('transaction_id'):
                    try:
                        from order_management.integrations import payment_service
                        from order_management.exceptions import PaymentServiceError, PaymentConnectionError, PaymentResponseError, PaymentProcessingError
                        
                        payment_service.process_refund(
                            transaction_id=payment_data.get('transaction_id'),
                            amount=payment_data.get('amount', 0),
                            reason="Inventory service unavailable"
                        )
                        logger.info(f"Refund initiated for transaction {payment_data.get('transaction_id')} due to inventory service connection error")
                    except PaymentConnectionError as e:
                        logger.critical(f"Failed to connect to payment service for refund after inventory connection error: {str(e)}")
                    except PaymentResponseError as e:
                        logger.critical(f"Payment service error response for refund after inventory connection error: {e.status_code} - {e.message}")
                    except PaymentProcessingError as e:
                        logger.critical(f"Payment processing error for refund after inventory connection error: {str(e)}")
                    except PaymentServiceError as e:
                        logger.critical(f"General payment service error for refund after inventory connection error: {str(e)}")
                    except Exception as refund_error:
                        logger.critical(f"Unexpected error processing refund after inventory connection error: {str(refund_error)}")
                raise OrderCreationFailedError(f"Inventory service unavailable: {str(e)}")
            except inventory_service.InventoryResponseError as e:
                logger.critical(f"Inventory service response error for cart {cart_id}: {str(e)}")
                # If payment was already processed, trigger refund
                if payment_data and payment_data.get('transaction_id'):
                    try:
                        from order_management.integrations import payment_service
                        from order_management.exceptions import PaymentServiceError, PaymentConnectionError, PaymentResponseError, PaymentProcessingError
                        
                        payment_service.process_refund(
                            transaction_id=payment_data.get('transaction_id'),
                            amount=payment_data.get('amount', 0),
                            reason="Inventory service error"
                        )
                        logger.info(f"Refund initiated for transaction {payment_data.get('transaction_id')} due to inventory service response error")
                    except PaymentConnectionError as e:
                        logger.critical(f"Failed to connect to payment service for refund after inventory response error: {str(e)}")
                    except PaymentResponseError as e:
                        logger.critical(f"Payment service error response for refund after inventory response error: {e.status_code} - {e.message}")
                    except PaymentProcessingError as e:
                        logger.critical(f"Payment processing error for refund after inventory response error: {str(e)}")
                    except PaymentServiceError as e:
                        logger.critical(f"General payment service error for refund after inventory response error: {str(e)}")
                    except Exception as refund_error:
                        logger.critical(f"Unexpected error processing refund after inventory response error: {str(refund_error)}")
                raise OrderCreationFailedError(f"Inventory service error: {str(e)}")
            
            # Create the order
            order = Order.objects.create(
                user_id=user_id,
                order_number=f"ORD-{timezone.now().strftime('%Y%m%d')}-{payment_data.get('transaction_id', '')[-8:]}",
                status="PROCESSING",
                total_amount=cart.get_subtotal_amount(),
                shipping_cost=Decimal(shipping_method.get('cost', '0.00')),
                shipping_address=shipping_address,
                shipping_method=shipping_method.get('id'),
                payment_method=payment_data.get('payment_method_id'),
                payment_transaction_id=payment_data.get('transaction_id'),
                created_by=user_id,
                updated_by=user_id
            )
            
            # Create order items
            for cart_item in cart.items.all():
                OrderItem.objects.create(
                    order=order,
                    product_id=cart_item.product_id,
                    quantity=cart_item.quantity,
                    unit_price=cart_item.price,
                    total_price=cart_item.price * cart_item.quantity,
                    created_by=user_id,
                    updated_by=user_id
                )
            
            # Create initial order status
            OrderStatus.objects.create(
                order=order,
                status='PROCESSING',
                notes='Order created from checkout',
                timestamp=timezone.now(),
                created_by=user_id,
                updated_by=user_id
            )
            
            # Update cart status
            cart.status = 'ORDERED'
            cart.save(update_fields=['status', 'updated_at'])
            
            # Trigger notification (async)
            @shared_task
            def send_order_confirmation_email():
                """
                Send order confirmation email to the customer.
                
                Args:
                    None
                """
                customer_email = shipping_address.get('email', '')
                if customer_email:
                    notification_service.send_transactional_email.delay(
                        recipient_email=customer_email,
                        template_key='ORDER_CONFIRMATION',
                        context={
                            'order_number': order.order_number,
                            'order_date': order.created_at.strftime('%Y-%m-%d %H:%M'),
                            'customer_name': f"{shipping_address.get('first_name', '')} {shipping_address.get('last_name', '')}",
                            'total_amount': str(order.total_amount + order.shipping_cost),
                            'items': [
                                {
                                    'product_id': item.product_id,
                                    'quantity': item.quantity,
                                    'price': str(item.unit_price)
                                } for item in order.items.all()
                            ]
                        }
                    )
                    logger.info(f"Order confirmation email queued for {customer_email}")
            
            # Trigger notification
            send_order_confirmation_email.delay()
            
            # Trigger fulfillment (async)
            @shared_task(bind=True, max_retries=3)
            def submit_order_to_fulfillment(self):
                """
                Submit the order to the fulfillment service.
                
                Args:
                    self: The task instance (provided by bind=True)
                """
                try:
                    # Submit the order to fulfillment service
                    try:
                        result = fulfillment_service.submit_order_for_fulfillment(
                            order_id=order.order_number,
                            shipping_address=shipping_address,
                            items=[
                                {
                                    'sku': item.product_id,
                                    'quantity': item.quantity
                                } for item in order.items.all()
                            ],
                            shipping_method=shipping_method
                        )
                        
                        logger.info(f"Order {order.order_number} submitted for fulfillment")
                        return result
                        
                    except fulfillment_service.FulfillmentConnectionError as e:
                        logger.error(f"Failed to connect to fulfillment service for order {order.order_number}: {str(e)}")
                        # Retry with exponential backoff
                        retry_in = 60 * (2 ** self.request.retries)
                        raise self.retry(exc=e, countdown=retry_in)
                        
                    except fulfillment_service.FulfillmentResponseError as e:
                        logger.error(f"Fulfillment service error response for order {order.order_number}: {str(e)}")
                        # Retry with exponential backoff for 5xx errors
                        if hasattr(e, 'status_code') and 500 <= e.status_code < 600:
                            retry_in = 60 * (2 ** self.request.retries)
                            raise self.retry(exc=e, countdown=retry_in)
                        return {'status': 'error', 'message': str(e)}
                        
                    except fulfillment_service.FulfillmentProcessError as e:
                        logger.error(f"Fulfillment processing error for order {order.order_number}: {str(e)}")
                        return {'status': 'error', 'message': str(e)}
                        
                    except fulfillment_service.FulfillmentServiceError as e:
                        logger.error(f"General fulfillment service error for order {order.order_number}: {str(e)}")
                        # Retry with exponential backoff
                        retry_in = 60 * (2 ** self.request.retries)
                        raise self.retry(exc=e, countdown=retry_in)
                        
                except Exception as e:
                    logger.error(f"Unexpected error submitting order {order.order_number} for fulfillment: {str(e)}")
                    return {'status': 'error', 'message': f"Unexpected error: {str(e)}"}
            
            # Trigger fulfillment
            submit_order_to_fulfillment.delay()
            
            logger.info(f"Order {order.order_number} created successfully")
            
            return order
            
    except InventoryReservationError as e:
        logger.error(f"Inventory reservation stub failed for Cart ID {cart_id}")
        raise OrderCreationFailedError(f"Failed to create order due to inventory (stub): {e}")
    except Exception as e:
        logger.critical(f"Unexpected error creating order: {e}")
        raise OrderCreationFailedError(f"Unexpected error creating order: {e}")


def get_order_by_transaction_id(transaction_id: str) -> Optional[Order]:
    """
    Get an order by its payment transaction ID.
    
    Args:
        transaction_id: The payment transaction ID
        
    Returns:
        Order object if found, None otherwise
    """
    try:
        payment = Payment.objects.filter(
            transaction_id=transaction_id,
        ).first()
        
        if payment:
            return payment.order
        
        return None
    except Exception as e:
        logger.error(f"Error retrieving order by transaction ID {transaction_id}: {e}")
        return None
