from customers.models import Contact, CustomerGroupSellingChannel
from django.db.models import (
    QuerySet,
    Sum,
    Q,
    Prefetch,
)
from django.db import transaction
from datetime import datetime
from django.conf import settings
from decimal import Decimal
import logging
import secrets
from rest_framework import status, filters, generics
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.serializers import BaseSerializer
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.exceptions import ValidationError, NotFound
from django_filters.rest_framework import DjangoFilterBackend
from datetime import datetime
from django.utils import timezone
from drf_spectacular.utils import (
    extend_schema,
    extend_schema_view,
    OpenApiParameter,
    OpenApiResponse,
)
from rest_framework.exceptions import ValidationError
import logging
from order_management.models import (
    Order,
    OrderItem,
    WalletTransactionType,
    OrderStatus,
    PaymentStatus,
)

from order_management.api.order_serializers import (
    OrderSerializer,
    OrderItemSerializer,
    AdminOrderDetailSerializer,
    OrderListSerializer,
    OrderDetailSerializer,
    OrderCreateSerializer,
    OrderUpdateSerializer,
)
from order_management.api.authentication import JWTAuthentication
from order_management.filters import AdminOrderFilter
from order_management.integrations import (
    inventory_service,
    payment_service,
    notification_service,
)
from order_management.services import wallet_service, loyalty_service
from order_management.api.views import BaseTenantViewSet


logger = logging.getLogger(__name__)
from erp_backend.middleware import TenantSchemaMiddleware, CustomJWTAuthentication


class GuestOrderDetailView(generics.RetrieveAPIView):
    """
    API endpoint that allows guest users to view their order details using a secure token.

    This view is publicly accessible but secured by the requirement of a valid
    UUID token that is only sent to the guest's email. The token is non-guessable
    and uniquely identifies a specific guest order.

    The queryset is restricted to orders that have no user_id (guest orders only)
    and includes optimized prefetching of related data for performance.
    """

    permission_classes = [AllowAny]
    serializer_class = OrderDetailSerializer
    lookup_field = "guest_access_token"
    lookup_url_kwarg = "guest_access_token"

    def get_queryset(self):
        """
        Get the queryset for this view.

        Returns a queryset of Order objects that:
        1. Have a guest_access_token (guest orders only)
        2. Include prefetched related data for performance optimization

        Returns:
            QuerySet: Filtered and optimized queryset of Order objects
        """
        # Only allow access to orders with a guest_access_token
        # This ensures only guest orders can be accessed this way
        return Order.objects.filter(guest_access_token__isnull=False).prefetch_related(
            # Optimize by prefetching related items
            Prefetch("items", queryset=OrderItem.objects.all()),
            # Add other prefetch relations as needed
        )

    def get_object(self):
        """
        Retrieve the Order instance for this request.

        Overridden to provide better error messages for guest users.

        Returns:
            Order: The requested Order instance

        Raises:
            NotFound: If no order with the provided token exists
        """
        try:
            return super().get_object()
        except NotFound:
            # Provide a user-friendly error message
            raise NotFound("Order not found. The link may be invalid or expired.")


class GuestOrderViewSet(BaseTenantViewSet):
    """ViewSet for handling guest orders in a multi-tenant environment."""

    authentication_classes = [TenantSchemaMiddleware]
    permission_classes = [AllowAny]
    queryset = Order.objects.all().prefetch_related("items")

    def get_serializer_class(self):
        """
        Return the appropriate serializer class based on the action.
        """
        if self.action == "create":
            return OrderCreateSerializer
        return AdminOrderDetailSerializer

    def perform_create(self, serializer):
        """Create an order with items.

        Args:
            serializer: The serializer instance

        Raises:
            ValidationError: For user input validation errors
            PermissionDenied: For permission-related errors
        """
        from django.db import IntegrityError
        from django.core.exceptions import ValidationError as DjangoValidationError
        from rest_framework.exceptions import PermissionDenied
        from rest_framework import serializers

        try:
            # Set client_id in request object for address creation
            # This is needed because OrderAddress creation in the serializer
            # uses request.auth_tenant_id
            setattr(
                self.request, "auth_tenant_id", 1
            )  # Fixed client_id for development

            # Save the order with all required fields
            try:
                serializer.save(
                    client_id=1,
                    account_id=None,
                    contact_id=None,
                    account_name=None,
                    contact_person_name=None,
                    selling_channel_id=None,
                    source="ECOMM",
                )

            except IntegrityError as e:
                logger.error(f"Database integrity error creating order: {str(e)}")
                raise serializers.ValidationError(
                    "Unable to create order due to data constraints. Please check your input and try again."
                )

            except DjangoValidationError as e:
                logger.error(f"Django validation error creating order: {str(e)}")
                raise serializers.ValidationError(f"Order validation failed: {str(e)}")

        except serializers.ValidationError:
            # Re-raise validation errors as-is (these are user-facing)
            raise

        except PermissionDenied:
            # Re-raise permission errors as-is
            raise

        except Exception as e:
            # Log unexpected errors and provide generic user message
            logger.exception(f"Unexpected error creating order for guest: {str(e)}")
            raise serializers.ValidationError(
                "An unexpected error occurred while creating the order. Please try again later."
            )


class OrderViewSet(BaseTenantViewSet):
    """ViewSet for managing orders in a multi-tenant environment."""

    authentication_classes = [TenantSchemaMiddleware, JWTAuthentication]
    permission_classes = [IsAuthenticated]
    queryset = Order.objects.all().prefetch_related("items")
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["status", "account_id"]  # Use account_id instead of customer_id
    search_fields = [
        "order_number",
        "account_id",
    ]  # Changed order_id to order_number for consistency
    ordering_fields = ["created_at", "updated_at", "total_amount"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        """
        Return the appropriate serializer class based on the action.
        """
        if self.action == "create":
            return OrderCreateSerializer
        elif self.action in ["update", "partial_update"]:
            return OrderUpdateSerializer
        return AdminOrderDetailSerializer

    def perform_create(self, serializer):
        """Create an order with items.

        Args:
            serializer: The serializer instance

        Raises:
            ValidationError: For user input validation errors
            PermissionDenied: For permission-related errors
        """
        from django.db import IntegrityError
        from django.core.exceptions import ValidationError as DjangoValidationError
        from rest_framework.exceptions import PermissionDenied
        from rest_framework import serializers

        try:
            # Get user, contact, and account info
            user = self.request.user
            user_id = getattr(user, "id", None)

            # Validate user authentication
            if not user or not user.is_authenticated:
                logger.warning("Unauthenticated user attempted to create order")
                raise PermissionDenied("Authentication required to create orders.")

            try:
                contact = Contact.objects.get(user_id=user_id)
                account_id = contact.account_id
                contact_id = contact.id

                # Validate contact has required account information
                if not contact.account:
                    logger.error(f"Contact {contact_id} has no associated account")
                    raise serializers.ValidationError(
                        "Contact must be associated with a valid account to create orders."
                    )

                account_name = contact.account.name
                contact_person = f"{contact.first_name} {contact.last_name}".strip()

            except Contact.DoesNotExist:
                logger.error(f"No contact found for user {user_id}")
                raise serializers.ValidationError(
                    "User profile is incomplete. Please contact support to complete your registration."
                )

            # Handle customer group selling channel if provided
            selling_channel_id = None
            customer_group_selling_channel_id = self.request.data.get(
                "customer_group_selling_channel_id", None
            )

            if customer_group_selling_channel_id:
                try:
                    customer_group_selling_channel = (
                        CustomerGroupSellingChannel.objects.get(
                            id=customer_group_selling_channel_id
                        )
                    )

                    # Validate the selling channel relationship is active
                    if customer_group_selling_channel.status != "ACTIVE":
                        logger.warning(
                            f"Inactive customer group selling channel {customer_group_selling_channel_id} used"
                        )
                        raise serializers.ValidationError(
                            "Selected customer group selling channel is not active."
                        )

                    selling_channel_id = (
                        customer_group_selling_channel.selling_channel_id
                    )

                except CustomerGroupSellingChannel.DoesNotExist:
                    logger.error(
                        f"Invalid customer group selling channel ID: {customer_group_selling_channel_id}"
                    )
                    raise serializers.ValidationError(
                        "Invalid customer group selling channel specified."
                    )

            # Set client_id in request object for address creation
            # This is needed because OrderAddress creation in the serializer
            # uses request.auth_tenant_id
            setattr(
                self.request, "auth_tenant_id", 1
            )  # Fixed client_id for development

            # Save the order with all required fields
            try:
                serializer.save(
                    client_id=1,
                    account_id=account_id,
                    contact_id=contact_id,
                    account_name=account_name,
                    contact_person_name=contact_person,
                    selling_channel_id=selling_channel_id,
                    created_by=user_id,
                    updated_by=user_id,
                    source="ECOMM",
                )

                logger.info(
                    f"Order created successfully for user {user_id}, account {account_id}"
                )

            except IntegrityError as e:
                logger.error(f"Database integrity error creating order: {str(e)}")
                raise serializers.ValidationError(
                    "Unable to create order due to data constraints. Please check your input and try again."
                )

            except DjangoValidationError as e:
                logger.error(f"Django validation error creating order: {str(e)}")
                raise serializers.ValidationError(f"Order validation failed: {str(e)}")

        except serializers.ValidationError:
            # Re-raise validation errors as-is (these are user-facing)
            raise

        except PermissionDenied:
            # Re-raise permission errors as-is
            raise

        except Exception as e:
            # Log unexpected errors and provide generic user message
            logger.exception(
                f"Unexpected error creating order for user {user_id if user else 'unknown'}: {str(e)}"
            )
            raise serializers.ValidationError(
                "An unexpected error occurred while creating the order. Please try again later."
            )

    def get_queryset(self) -> QuerySet:
        """
        Get the queryset for this viewset.
        Uses fixed client_id of 1 for development.
        """
        return (
            super()
            .get_queryset()
            .filter(client_id=1)  # Fixed client_id for development
        )

    @action(detail=True, methods=["get"])
    def items(self, request: Request, pk: str = None) -> Response:
        """
        Get all items for a specific order.

        Args:
            request: The request object containing tenant context
            pk: The primary key of the order

        Returns:
            Response containing the order items with proper tenant context
        """
        order = self.get_object()
        items = order.items.all()  # Already prefetched
        serializer = OrderItemSerializer(
            items,
            many=True,
            context={
                "request": request
            },  # Pass request context for tenant-aware serialization
        )
        return Response(serializer.data)


class OrderItemViewSet(BaseTenantViewSet):
    """ViewSet for managing order items."""

    queryset = OrderItem.objects.all()
    serializer_class = OrderItemSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["order", "product_sku"]
    ordering_fields = ["id"]

    def get_queryset(self) -> QuerySet:
        """
        Override to filter by tenant context and optionally by order.

        Returns:
            QuerySet filtered by tenant context and order_id if provided
        """
        queryset = super().get_queryset()

        # Filter by order if specified in URL
        order_id = self.request.query_params.get("order_id")
        if order_id:
            queryset = queryset.filter(order_id=order_id)

        return queryset

    @transaction.atomic
    def perform_create(self, serializer: BaseSerializer) -> None:
        """
        Override to calculate total_price and update order totals.

        Args:
            serializer: The serializer instance
        """
        # Save the item
        item = serializer.save()

        # Update order totals
        order = item.order
        order.subtotal_amount = sum(i.total_price for i in order.items.all())
        order.total_amount = (
            order.subtotal_amount
            - order.discount_amount
            + order.shipping_amount
            + order.tax_amount
        )
        order.save(update_fields=["subtotal_amount", "total_amount"])


@extend_schema_view(
    list=extend_schema(
        summary="List order history",
        description="Returns a paginated list of orders for the authenticated user. Admin users can see all orders for their customer account, while regular users can only see their own orders.",
        parameters=[
            OpenApiParameter(
                name="status",
                description="Filter by order status (e.g., COMPLETED, PROCESSING)",
                required=False,
                type=str,
            ),
            OpenApiParameter(
                name="start_date",
                description="Filter orders created on or after this date (YYYY-MM-DD)",
                required=False,
                type=str,
            ),
            OpenApiParameter(
                name="end_date",
                description="Filter orders created on or before this date (YYYY-MM-DD)",
                required=False,
                type=str,
            ),
        ],
        responses={
            200: OpenApiResponse(
                description="Successful response with paginated order list"
            )
        },
    ),
    retrieve=extend_schema(
        summary="Retrieve order details",
        description="Returns detailed information about a specific order, including line items, payment details, and shipping information.",
        responses={
            200: OpenApiResponse(description="Successful response with order details"),
            404: OpenApiResponse(description="Order not found"),
        },
    ),
)
class OrderHistoryViewSet(BaseTenantViewSet):
    """
    ViewSet for retrieving order history with role-based filtering.

    This viewset provides list and retrieve endpoints for order history,
    with different filtering logic based on the user's role:
    - Admin users can see all orders for their parent customer account
    - Regular users and individuals can only see their own orders

    Permissions:
    - Requires authentication

    Query Parameters:
    - status: Filter by order status
    - start_date: Filter orders created on or after this date (YYYY-MM-DD)
    - end_date: Filter orders created on or before this date (YYYY-MM-DD)
    """

    authentication_classes = [TenantSchemaMiddleware, JWTAuthentication]
    permission_classes = [IsAuthenticated]
    queryset = Order.objects.all().prefetch_related("items")

    def get_serializer_class(self):
        """
        Return appropriate serializer class based on action.

        Returns:
            OrderListSerializer for list action, OrderDetailSerializer for retrieve action
        """
        if self.action == "list":
            return OrderListSerializer
        return OrderDetailSerializer

    def get_queryset(self):
        """
        Override to implement role-based filtering logic.

        Returns:
            QuerySet filtered based on user role and tenant context
        """
        from django.http import Http404

        # Fixed client_id for development
        client_id = 1

        # Get user, contact, and account info from authenticated user
        user = self.request.user
        user_id = user.id

        try:
            contact = Contact.objects.get(user_id=user.id)
            account_id = contact.account_id
            contact_id = contact.id
        except Contact.DoesNotExist:
            account_id = None
            contact_id = None
            logger.warning(f"No contact found for user {user_id}")

        print("user_id, account_id, client_id", user_id, account_id, client_id)
        if not user_id:
            raise Http404("User identification not available")

        # Log the user information for debugging
        logger.info(
            f"User info - user_id: {user_id}, account_id: {account_id}, client_id: {client_id}"
        )

        # Get base queryset filtered by tenant
        base_queryset = super().get_queryset()

        # Optimize with advanced prefetching to reduce N+1 queries
        optimized_queryset = base_queryset.prefetch_related(
            "items",  # Prefetch order items
            "wallet_transactions",  # Prefetch wallet transactions if they exist
        )

        # Add additional prefetch_related for detail view
        if self.action == "retrieve":
            optimized_queryset = optimized_queryset.prefetch_related(
                "loyalty_transactions"
            )

        # Simplified filtering logic - use account_id if available, otherwise filter by user_id
        if not contact_id:
            logger.warning(
                f"No contact_id found for user {user_id}, filtering by created_by only"
            )
            # Apply filter for just this user's created orders
            return optimized_queryset.filter(created_by=user_id)

        # If we have account_id, filter by it
        if account_id:
            optimized_queryset = optimized_queryset.filter(account_id=account_id)
            logger.info(f"Filtering orders for account {account_id}")
        else:
            # Fallback to created_by if account_id is not available
            optimized_queryset = optimized_queryset.filter(created_by=user_id)
            logger.warning(
                f"No account_id available for user {user_id}, filtering by created_by only"
            )

        # Apply additional filters from query parameters
        # Filter by status
        status = self.request.query_params.get("status")
        if status:
            optimized_queryset = optimized_queryset.filter(status=status.upper())

        # Filter by date range
        start_date = self.request.query_params.get("start_date")
        if start_date:
            optimized_queryset = optimized_queryset.filter(created_at__gte=start_date)

        end_date = self.request.query_params.get("end_date")
        if end_date:
            optimized_queryset = optimized_queryset.filter(created_at__lte=end_date)

        # Search by order_id or other fields
        search_term = self.request.query_params.get("searchTerm")
        if search_term:
            optimized_queryset = optimized_queryset.filter(
                Q(order_id__icontains=search_term)
                | Q(items__product_name__icontains=search_term)
            ).distinct()

        # Sort results
        sort_by = self.request.query_params.get("sortBy", "created_at")
        sort_order = self.request.query_params.get("sortOrder", "desc")

        # Map frontend sort fields to model fields
        sort_field_mapping = {
            "date": "created_at",
            "status": "status",
            "total": "total_amount",
            "id": "id",
            "order_id": "order_id",
        }

        # Get the actual field to sort by
        sort_field = sort_field_mapping.get(sort_by, "created_at")

        # Apply sorting
        if sort_order.lower() == "asc":
            return optimized_queryset.order_by(sort_field)
        else:
            return optimized_queryset.order_by(f"-{sort_field}")


class AdminOrderViewSet(BaseTenantViewSet):
    """
    ViewSet for Admin Order Management.

    Provides endpoints for Tenant Administrators to list, search, filter,
    and perform actions on orders within their tenant scope.

    Permissions:
    - User must be authenticated
    - User must have Tenant Administrator privileges
    """

    queryset = Order.objects.all().prefetch_related("items")
    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [AllowAny]
    filterset_class = AdminOrderFilter
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    search_fields = ["order_id", "customer_id", "contact_person_id"]
    ordering_fields = ["created_at", "updated_at", "total_amount", "status"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        """
        Return the appropriate serializer class based on the action.
        """
        if self.action == "create":
            return OrderCreateSerializer
        elif self.action in ["update", "partial_update"]:
            return OrderUpdateSerializer
        return AdminOrderDetailSerializer

    def get_serializer_context(self):
        """
        Add tenant context to the serializer.
        """
        context = super().get_serializer_context()

        # Try to get tenant_slug from the request first (might be set by middleware)
        tenant_slug = getattr(self.request, "tenant_slug", None)

        # If not found in request, try to get from JWT token
        if not tenant_slug and hasattr(self.request, "auth") and self.request.auth:
            try:
                from rest_framework_simplejwt.tokens import UntypedToken
                from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

                token = str(self.request.auth)
                if token:
                    # Decode the JWT token
                    decoded_token = UntypedToken(token)
                    # Get tenant slug from the token payload
                    tenant_slug = decoded_token.get("tenant_slug")
            except (InvalidToken, TokenError, AttributeError) as e:
                logger.warning(f"Error getting tenant slug from token: {e}")

        # Only set context if we have a valid tenant_slug
        if tenant_slug:
            context["tenant_slug"] = tenant_slug
            # Also add to request object for service calls
            self.request.tenant_slug = tenant_slug

        return context

    def get_queryset(self):
        """
        Get the list of orders for the current tenant.
        The tenant schema is already set by the middleware.
        """
        return super().get_queryset().prefetch_related("items")

    def perform_create(self, serializer):
        """
        Override to set created_by from the authenticated user.
        """
        # Get the authenticated user from the request
        user = self.request.user
        user_id = getattr(user, "id", None)

        serializer.save(created_by=user_id, updated_by=user_id, source="CRM")

    def perform_update(self, serializer):
        """
        Override to set updated_by from the authenticated user.
        """
        # Get the authenticated user from the request
        user = self.request.user
        user_id = getattr(user, "id", None)

        serializer.save(updated_by=user_id)

    def destroy(self, request, *args, **kwargs):
        """
        Disable DELETE method.

        Returns:
            405 Method Not Allowed response
        """
        return Response(
            {"detail": "DELETE method not allowed. Use cancel action instead."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel_order(self, request, pk=None):
        """
        Cancel an order and process refunds.

        This action:
        1. Validates if the order can be cancelled
        2. Updates the order status to CANCELLED
        3. Releases reserved inventory
        4. Processes refunds for all payment types (wallet, loyalty, gateway)
        5. Sends cancellation notification
        """
        order = self.get_object()

        # Validate if order can be cancelled
        if order.status in [
            OrderStatus.SHIPPED,
            OrderStatus.DELIVERED,
            OrderStatus.CANCELLED,
        ]:
            return Response(
                {"detail": f"Cannot cancel order in {order.status} status."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            # Update order status
            order.status = OrderStatus.CANCELLED
            order.save(update_fields=["status", "updated_at"])

            # Release inventory
            items_to_release = [
                {"sku": item.product_sku, "quantity": item.quantity}
                for item in order.items.all()
            ]

            try:
                inventory_service.release_inventory(
                    order_id=order.order_id,
                    items=items_to_release,
                    client_id=order.client_id,
                )
            except Exception as e:
                logger.error(
                    f"Error releasing inventory for order {order.order_id}: {e}"
                )
                # Continue with cancellation despite inventory release failure

            # Process refunds for all payment types
            try:
                # Find all successful payments for this order
                original_payments = Payment.objects.filter(
                    order=order, status=PaymentStatus.PAID
                ).select_related("wallet_transaction", "loyalty_transaction")

                # Process refunds for each payment type
                payment_methods_used = []
                for payment in original_payments:
                    try:
                        payment_methods_used.append(payment.payment_method)
                        if payment.payment_method == "WALLET":
                            # Process wallet refund
                            wallet_txn = wallet_service.add_transaction(
                                wallet=payment.wallet_transaction.wallet,
                                transaction_type=WalletTransactionType.REFUND,
                                amount=payment.amount,
                                related_order=order,
                                created_by_user_id=request.user.id,
                                notes=f"Refund for cancelled order {order.order_id}",
                            )

                            # Create refund payment record
                            Payment.objects.create(
                                client_id=order.client_id,
                                order=order,
                                amount=payment.amount,
                                payment_method="WALLET",
                                status=PaymentStatus.REFUNDED,
                                wallet_transaction=wallet_txn,
                                processed_at=timezone.now(),
                                created_by_id=request.user.id,
                                updated_by_id=request.user.id,
                            )

                        elif payment.payment_method == "LOYALTY":
                            # Process loyalty refund
                            loyalty_service.process_loyalty_refund(
                                transaction_id=payment.loyalty_transaction.id,
                                amount=payment.amount,
                                order_id=order.order_id,
                                client_id=order.client_id,
                            )

                            # Update payment status
                            payment.status = PaymentStatus.REFUNDED
                            payment.processed_at = timezone.now()
                            payment.save()

                        elif payment.payment_method == "GATEWAY":
                            # Process gateway refund
                            refund_result = payment_service.process_refund(
                                client_id=order.client_id,
                                transaction_id=payment.gateway_transaction_id,
                                amount=payment.amount,
                                reason=f"Refund for cancelled order {order.order_id}",
                                related_order_id=order.id,
                            )

                            # Update payment status based on refund result
                            if (
                                refund_result
                                and refund_result.get("status") == "SUCCESS"
                            ):
                                payment.status = PaymentStatus.REFUNDED
                            else:
                                payment.status = PaymentStatus.PARTIALLY_REFUNDED

                            payment.processed_at = timezone.now()
                            payment.save()

                    except Exception as e:
                        logger.error(
                            f"Error processing refund for payment {payment.id}: {e}"
                        )
                        # Continue with other payments even if one fails
                        continue

            except Exception as e:
                logger.error(f"Error processing order refunds: {e}")
                # Continue with cancellation despite refund processing failure

            # Update order payment status
            total_refunded = Payment.objects.filter(
                order=order, status=PaymentStatus.REFUNDED
            ).aggregate(total=Sum("amount"))["total"] or Decimal("0.00")

            if total_refunded >= order.total_amount:
                order.payment_status = PaymentStatus.REFUNDED
            else:
                order.payment_status = PaymentStatus.PARTIALLY_REFUNDED

            order.save(update_fields=["payment_status", "updated_at"])

            # Send cancellation notification
            try:
                customer_email = (
                    getattr(order, "customer_email", None) or "customer@example.com"
                )

                # Create a readable refund method description
                refund_methods = set(payment_methods_used)
                if len(refund_methods) == 1:
                    method = next(iter(refund_methods))
                    refund_method_desc = (
                        "wallet"
                        if method == "WALLET"
                        else (
                            "loyalty points"
                            if method == "LOYALTY"
                            else "original payment method"
                        )
                    )
                else:
                    refund_method_desc = "multiple payment methods"

                notification_service.send_transactional_email.delay(
                    client_id=order.client_id,
                    recipient_email=customer_email,
                    template_key="ORDER_CANCELLED",
                    context={
                        "order_id": order.order_id,
                        "total_refunded": str(total_refunded),
                        "refund_method": refund_method_desc,
                        "refund_status": (
                            "full"
                            if total_refunded >= order.total_amount
                            else "partial"
                        ),
                    },
                )
            except Exception as e:
                logger.error(
                    f"Error sending cancellation notification for order {order.order_id}: {e}"
                )
                # Continue with cancellation despite notification failure

            return Response(self.get_serializer(order).data, status=status.HTTP_200_OK)
