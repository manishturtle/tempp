"""
Cart utility functions for the Order Management system.

This module provides utility functions for managing shopping carts,
including cart retrieval, creation, and merging.
"""
from typing import Optional
from django.db import transaction
from order_management.models import Cart, CartItem, CartStatus
from products.models import Product





def get_request_cart(request) -> Cart:
    """
    Get or create a cart for the current request.
    
    This function handles both user-based and session-based carts,
    and performs cart merging when a user logs in.
    
    Args:
        request: The request object
        
    Returns:
        Cart instance for the current request
    """
    # Get context from request
    client_id = getattr(request, 'auth_tenant_id', None)
    user_id = getattr(request, 'auth_user_id', None)
    company_id = getattr(request, 'auth_company_id', 1)  # Default to 1 if not available
    
    # Ensure session key exists
    if not request.session.session_key:
        
        request.session.save()
    session_key = request.session.session_key
    

    
    # Try to find user cart if user is logged in
    user_cart = None
    if user_id:
        user_cart = Cart.objects.filter(
            user_id=user_id,
            status=CartStatus.OPEN
        ).prefetch_related('items').first()
        
        if user_cart:
            pass
    
    # Try to find session cart
    session_cart = None
    if session_key:
        session_cart = Cart.objects.filter(
            session_key=session_key,
            status=CartStatus.OPEN
        ).prefetch_related('items').first()
        
        if session_cart:
            pass
    
    # Handle cart merging if user is logged in and has a session cart
    if user_id and session_cart:
        if user_cart:
            # Both carts exist, merge them
            merge_session_cart_to_user(session_key, user_id, client_id, company_id)
            return user_cart
        else:
            # Only session cart exists, associate it with the user
            session_cart.user_id = user_id
            session_cart.session_key = None
            session_cart.save()
            return session_cart
    
    # Return existing cart if found
    if user_cart:
        return user_cart
    if session_cart:
        return session_cart
    
    # Create new cart
    # Always use user_id 1 as default in development
    default_user_id = 1
    
    cart = Cart(
        status=CartStatus.OPEN,
        user_id=user_id or default_user_id,
        created_by=user_id or default_user_id,
        updated_by=user_id or default_user_id
    )
    
    if not user_id:
        cart.session_key = session_key
    
    cart.save()
    return cart


@transaction.atomic
def merge_session_cart_to_user(session_key: str, user_id: int, client_id: int, company_id: int = 1) -> None:
    """
    Merge a session-based cart into a user-based cart.
    
    This function is called when a user logs in and has both a session cart
    and a user cart. It merges the items from the session cart into the user cart.
    
    Args:
        session_key: The session key
        user_id: The user ID
        client_id: The client ID
        company_id: The company ID (default: 1)
    """
    # Find session and user carts
    session_cart = Cart.objects.filter(
        session_key=session_key,
        status=CartStatus.OPEN
    ).first()
    
    user_cart = Cart.objects.filter(
        user_id=user_id,
        status=CartStatus.OPEN
    ).first()
    
    if not session_cart:
        return
    
    if not user_cart:
        # Associate session cart with user
        session_cart.user_id = user_id
        session_cart.session_key = None
        session_cart.save()
        return
    
    # Merge items from session cart to user cart
    for session_item in session_cart.items.all():
        # Check if item already exists in user cart
        user_item = user_cart.items.filter(product_sku=session_item.product_sku).first()
        
        if user_item:
            # Item exists, update quantity
            new_quantity = user_item.quantity + session_item.quantity
            
            # Check ATP before updating using direct Product model access
            try:
                product = Product.objects.get(sku=session_item.product_sku, is_active=True)
                atp = product.quantity_on_hand if hasattr(product, 'quantity_on_hand') else 0
                
                if atp >= new_quantity:
                    user_item.quantity = new_quantity
                else:
                    user_item.quantity = atp if atp > 0 else user_item.quantity
            except Product.DoesNotExist:
                # If product not found, keep original quantity
                pass
            
            user_item.save()
            session_item.delete()
        else:
            # Move item to user cart
            session_item.cart = user_cart
            session_item.save()
    
    # Mark session cart as merged
    session_cart.status = CartStatus.MERGED
    session_cart.save()
