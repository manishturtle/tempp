"""
Cart Views for Order Management API.

This module contains ViewSets and API views for cart management functionality.
"""



from rest_framework import viewsets, status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from drf_spectacular.utils import (
    extend_schema,
    extend_schema_view,
    OpenApiExample,
    OpenApiResponse,
)

from order_management.models import (
    Cart,
    CartItem,
)
from order_management.cart.serializers import (
    CartSerializer,
    CartItemSerializer,
    CartItemInputSerializer,
    CartItemUpdateSerializer,
)
from products.models import Product
from order_management.cart_utils import get_request_cart
from erp_backend.middleware import TenantSchemaMiddleware




@extend_schema_view(
    get_cart=extend_schema(
        summary="Get current cart",
        description="Retrieves the current shopping cart for the authenticated user or guest session.",
        tags=["Shopping Cart"],
        responses={200: OpenApiResponse(description="Cart retrieved successfully")},
    ),
    add_item=extend_schema(
        summary="Add item to cart",
        description="Adds a product to the shopping cart. Creates a new cart if one doesn't exist.",
        tags=["Shopping Cart"],
        request=CartItemInputSerializer,
        responses={
            200: OpenApiResponse(description="Item added successfully"),
            400: OpenApiResponse(description="Invalid input or product not found"),
        },
        examples=[
            OpenApiExample(
                name="Add item example",
                value={"product_sku": "PROD-12345", "quantity": 2},
                request_only=True,
            )
        ],
    ),
    update_item=extend_schema(
        summary="Update cart item",
        description="Updates the quantity of an item in the cart. Set quantity to 0 to remove the item.",
        tags=["Shopping Cart"],
        request=CartItemUpdateSerializer,
        responses={
            200: OpenApiResponse(description="Item updated successfully"),
            404: OpenApiResponse(description="Item not found in cart"),
        },
        examples=[
            OpenApiExample(
                name="Update quantity example", value={"quantity": 3}, request_only=True
            )
        ],
    ),
    remove_item=extend_schema(
        summary="Remove item from cart",
        description="Removes an item from the shopping cart.",
        tags=["Shopping Cart"],
        responses={
            204: OpenApiResponse(description="Item removed successfully"),
            404: OpenApiResponse(description="Item not found in cart"),
        },
    ),
    clear_cart=extend_schema(
        summary="Clear cart",
        description="Removes all items from the shopping cart.",
        tags=["Shopping Cart"],
        responses={
            204: OpenApiResponse(description="Cart cleared successfully"),
            404: OpenApiResponse(description="Cart not found"),
        },
    ),
)
class CartViewSet(viewsets.ViewSet):
    """
    ViewSet for managing shopping carts.

    This viewset provides methods for viewing, adding, updating, and removing
    items from the shopping cart. It handles both guest (session-based) and
    logged-in (user-based) carts.

    Security:
    - Uses AllowAny permission to support guest cart functionality
    - Applies rate limiting to prevent abuse
    - Ensures proper tenant isolation through get_request_cart utility

    Endpoints:
    - GET /cart/ - Get the current shopping cart
    - POST /cart/add_item/ - Add an item to the cart
    - PUT /cart/update_item/{item_pk}/ - Update item quantity
    - DELETE /cart/clear/ - Clear all items from the cart
    - DELETE /cart/remove_item/{item_pk}/ - Remove an item from the cart
    """

    authentication_classes = [TenantSchemaMiddleware]
    permission_classes = [
        AllowAny
    ]  # Allow anonymous users for guest cart functionality
    throttle_classes = [
        AnonRateThrottle,
        UserRateThrottle,
    ]  # Apply throttling to prevent abuse

    def get_throttles(self):
        """
        Return custom throttle scopes based on user authentication status.

        Returns:
            List of throttle instances with appropriate scopes
        """
        throttle_classes = self.throttle_classes
        if not throttle_classes:
            return []

        return [throttle() for throttle in throttle_classes]

    def get_throttle_scopes(self):
        """
        Define custom throttle scopes for cart operations.

        Returns:
            Dictionary mapping throttle classes to scopes
        """
        return {"AnonRateThrottle": "cart_anon", "UserRateThrottle": "cart_user"}

    def get_cart(self, request: Request, tenant_slug: str = None) -> Response:
        """
        Get the current cart.

        Args:
            request: The request object
            tenant_slug: The tenant slug from the URL

        Returns:
            Response containing serialized cart data
        """
        # Set tenant context from the URL parameter
        if tenant_slug and not hasattr(request, "tenant"):
            from django_tenants.utils import schema_context
            from clients.models import Client

            try:
                tenant = Client.objects.get(schema_name=tenant_slug, is_active=True)
                request.tenant = tenant
                request.auth_tenant_id = tenant.id
            except Client.DoesNotExist:
                return Response(
                    {"detail": "Invalid tenant"}, status=status.HTTP_404_NOT_FOUND
                )

        # Get basic cart first
        cart = get_request_cart(request)

        # If cart has an ID (saved to DB), fetch an optimized version with prefetching
        if cart and cart.id:
            # Optimized query with prefetch_related to eliminate N+1 queries
            cart = Cart.objects.filter(id=cart.id).prefetch_related("items").first()

        # Get delivery location parameters from query params
        pincode = request.query_params.get('pincode')
        country = request.query_params.get('country')
        state = request.query_params.get('state')
        customer_group_selling_channel_id = request.query_params.get('customer_group_selling_channel_id')

        # Always use tenant_country and tenant_state from query params
        tenant_country = request.query_params.get('tenant_country')
        tenant_state = request.query_params.get('tenant_state')
        
        serializer = CartSerializer(
            cart,
            context={
                "client_id": getattr(request, "auth_tenant_id", None),
                "request": request,
                "pincode": pincode,
                "country": country,
                "state": state,
                "customer_group_selling_channel_id": customer_group_selling_channel_id,
                "tenant_country": tenant_country,
                "tenant_state": tenant_state,
            },
        )
        return Response(serializer.data)

    def add_item(self, request: Request, tenant_slug: str = None) -> Response:
        print("SESSION KEY BEFORE:", request.session.session_key)
        print("SESSION DATA:", dict(request.session))

        if not request.session.session_key:
            request.session.save()
            print("NEW SESSION KEY:", request.session.session_key)
        """
        Add an item to the cart.
        
        Args:
            request: The request object containing product_sku and quantity
            
        Returns:
            Response containing serialized cart data
        """
        # Validate input
        serializer = CartItemInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        product_sku = serializer.validated_data["product_sku"]
        quantity = serializer.validated_data["quantity"]

        # Get client_id from request
        client_id = getattr(request, "auth_tenant_id", None)
        if not client_id:
            return Response(
                {"detail": "Tenant context not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate product SKU
        if not product_sku:
            return Response(
                {"detail": "Product SKU not provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # # Extract delivery parameters from query params
        # pincode = request.query_params.get('pincode')
        # country = request.query_params.get('country')
        # customer_group_selling_channel_id = request.query_params.get('customer_group_selling_channel_id')

        # Check ATP using direct Product model
        try:
            product = Product.objects.get(sku=product_sku, is_active=True)
            atp = product.quantity_on_hand if hasattr(product, 'quantity_on_hand') else 0
            
            if atp < quantity:
                return Response(
                    {
                        "detail": f"Requested quantity ({quantity}) exceeds available quantity ({atp})."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        except Product.DoesNotExist:
            return Response(
                {"detail": "Product not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            return Response(
                {"detail": "Could not retrieve stock information at this time."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        # Get or create cart
        cart = get_request_cart(request)

        # Find or create cart item
        cart_item, created = CartItem.objects.get_or_create(
            cart=cart,
            product_sku=product_sku,
            defaults={
                "quantity": quantity,
                "client_id": client_id,
                "company_id": getattr(request, "auth_company_id", 1),
                "created_by": getattr(
                    request, "auth_user_id", 1
                ),  # Use 1 as default in development
                "updated_by": getattr(request, "auth_user_id", 1),
            },
        )

        # Update quantity if item already exists
        if not created:
            new_quantity = cart_item.quantity + quantity
            if atp >= new_quantity:
                cart_item.quantity = new_quantity
            else:
                cart_item.quantity = atp
            cart_item.save()

        # Return serialized cart
        serializer = CartSerializer(
            cart, context={"client_id": client_id, "request": request}
        )
        return Response(serializer.data)

    def update_item(
        self, request: Request, item_pk=None, tenant_slug: str = None
    ) -> Response:
        """
        Update an item in the cart.

        Args:
            request: The request object containing quantity
            item_pk: The primary key of the cart item

        Returns:
            Response containing serialized cart item data
        """
        # Validate input
        serializer = CartItemUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        quantity = serializer.validated_data["quantity"]

        # Get client_id from request
        client_id = getattr(request, "auth_tenant_id", None)
        if not client_id:
            return Response(
                {"detail": "Tenant context not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get cart
        cart = get_request_cart(request)

        # Find cart item
        try:
            cart_item = CartItem.objects.get(cart=cart, id=item_pk)
        except CartItem.DoesNotExist:
            return Response(
                {"detail": "Cart item not found."}, status=status.HTTP_404_NOT_FOUND
            )

        # Check if quantity is valid
        if quantity <= 0:
            # Remove item if quantity is 0 or negative
            cart_item.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        # Check ATP if quantity increases using direct Product model
        if quantity > cart_item.quantity:
            try:
                product = Product.objects.get(sku=cart_item.product_sku, is_active=True)
                atp = product.quantity_on_hand if hasattr(product, 'quantity_on_hand') else 0
                
                if atp < quantity:
                    return Response(
                        {
                            "detail": f"Requested quantity ({quantity}) exceeds available quantity ({atp})."
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            except Product.DoesNotExist:
                return Response(
                    {"detail": "Product not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            except Exception as e:
                return Response(
                    {"detail": "Could not retrieve stock information at this time."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

        # Update quantity
        cart_item.quantity = quantity
        cart_item.save()

        # Return serialized cart item
        serializer = CartItemSerializer(
            cart_item, context={"client_id": client_id, "request": request}
        )
        return Response(serializer.data)

    def remove_item(
        self, request: Request, item_pk=None, tenant_slug: str = None
    ) -> Response:
        """
        Remove an item from the cart.

        Args:
            request: The request object
            item_pk: The primary key of the cart item

        Returns:
            Response with no content
        """
        # Get cart
        cart = get_request_cart(request)

        # Find cart item
        try:
            cart_item = CartItem.objects.get(cart=cart, id=item_pk)
        except CartItem.DoesNotExist:
            return Response(
                {"detail": "Cart item not found."}, status=status.HTTP_404_NOT_FOUND
            )

        # Delete cart item
        cart_item.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)

    def clear_cart(self, request: Request, tenant_slug: str = None) -> Response:
        """
        Remove all items from the cart.

        Args:
            request: The request object

        Returns:
            Response with no content
        """
        # Get cart
        cart = get_request_cart(request)

        if cart:
            # Delete all cart items
            CartItem.objects.filter(cart=cart).delete()

        return Response(status=status.HTTP_204_NO_CONTENT)
