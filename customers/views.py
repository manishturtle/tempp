"""
Views for the customers app.

This module defines ViewSets for customer-related models such as Account, Contact,
and CustomerGroup.
"""

from rest_framework import viewsets, filters, status
from rest_framework.views import APIView
from rest_framework.viewsets import ReadOnlyModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta
from core.views import BaseTenantViewSet
from .models import (
    CustomerGroup,
    Address,
    Account,
    Contact,
    CustomerGroupSellingChannel,
)
from . import serializers
from .serializers import (
    CustomerGroupSerializer,
    AddressSerializer,
    AccountSerializer,
    ContactSerializer,
    CustomerGroupSellingChannelFilteredSerializer,
    ContactBasicSerializer,
    CustomerGroupSellingChannelDetailSerializer,
)
from rest_framework.permissions import AllowAny
from erp_backend.middleware import CustomJWTAuthentication, TenantSchemaMiddleware
from pricing.models import SellingChannel


class AccountViewSet(BaseTenantViewSet):
    """
    ViewSet for managing customer accounts.

    This viewset provides CRUD operations for accounts with nested address handling.
    It supports filtering, searching, and ordering capabilities, as well as
    tenant isolation and permission checks.

    Key features:
    - Nested address handling (create/update/delete addresses within account operations)
    - Parent-child relationship validation
    - Branch address limit enforcement
    - Primary address uniqueness validation
    - Status-based metrics (counts for Active, Inactive, Prospect accounts)
    """

    queryset = Account.objects.select_related(
        "customer_group", "owner", "parent_account"
    ).prefetch_related("addresses", "contacts")
    serializer_class = AccountSerializer
    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated]
    # Configure filtering, searching, and ordering
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["status", "customer_group", "industry"]
    search_fields = ["name", "account_number", "legal_name"]
    ordering_fields = ["name", "created_at", "status", "industry"]
    ordering = ["name"]  # Default ordering

    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request, *args, **kwargs):
        """
        Get account statistics.

        Returns:
            Response: JSON containing account statistics including total accounts,
                     active accounts, inactive accounts, and new accounts this month.
        """
        # Get date ranges
        today = timezone.now().date()
        first_day_of_month = today.replace(day=1)

        # Calculate previous month's date range
        if first_day_of_month.month == 1:
            prev_month = first_day_of_month.replace(
                year=first_day_of_month.year - 1, month=12
            )
        else:
            prev_month = first_day_of_month.replace(month=first_day_of_month.month - 1)

        first_day_prev_month = prev_month.replace(day=1)
        last_day_prev_month = first_day_of_month - timezone.timedelta(days=1)

        # Get the base queryset filtered by tenant
        queryset = self.filter_queryset(self.get_queryset())

        # Current month statistics
        total_accounts = queryset.count()
        active_accounts = queryset.filter(status="Active").count()
        inactive_accounts = queryset.filter(status="Inactive").count()
        new_this_month = queryset.filter(
            created_at__date__gte=first_day_of_month
        ).count()

        # Previous month statistics
        prev_month_queryset = queryset.filter(created_at__date__lt=first_day_of_month)

        # Calculate previous month's new accounts
        new_prev_month = queryset.filter(
            created_at__date__range=(first_day_prev_month, last_day_prev_month)
        ).count()

        # Calculate active/inactive from end of previous month
        active_prev_month = prev_month_queryset.filter(status="Active").count()
        inactive_prev_month = prev_month_queryset.filter(status="Inactive").count()

        # Helper function to calculate percentage change
        def calculate_change(current, previous):
            if previous == 0:
                return 0  # Avoid division by zero
            return round(((current - previous) / previous) * 100, 2)

        # Calculate percentage changes
        total_change = calculate_change(total_accounts, prev_month_queryset.count())
        active_change = calculate_change(active_accounts, active_prev_month)
        inactive_change = calculate_change(inactive_accounts, inactive_prev_month)
        new_change = (
            calculate_change(new_this_month, new_prev_month)
            if new_prev_month > 0
            else 100
        )

        data = {
            "total_accounts": {
                "count": total_accounts,
                "change_percentage": total_change,
                "change_direction": "increase" if total_change >= 0 else "decrease",
            },
            "active_accounts": {
                "count": active_accounts,
                "change_percentage": abs(active_change),
                "change_direction": "increase" if active_change >= 0 else "decrease",
            },
            "inactive_accounts": {
                "count": inactive_accounts,
                "change_percentage": abs(inactive_change),
                "change_direction": "increase" if inactive_change >= 0 else "decrease",
            },
            "new_accounts_this_month": {
                "count": new_this_month,
                "change_percentage": abs(new_change),
                "change_direction": "increase" if new_change >= 0 else "decrease",
                "previous_month_count": new_prev_month,
            },
            "as_of_date": today.isoformat(),
            "comparison_period": {
                "start": first_day_prev_month.isoformat(),
                "end": last_day_prev_month.isoformat(),
            },
        }

        return Response(data)

    def list(self, request, *args, **kwargs):
        """
        List all accounts with status-based counts.

        Returns a paginated list of accounts with additional metrics:
        - active_count: Number of accounts with status 'Active'
        - inactive_count: Number of accounts with status 'Inactive'
        - prospect_count: Number of accounts with status 'Prospect'

        Returns a paginated response with additional metrics:
        - active_count: Number of accounts with status 'Active'
        - inactive_count: Number of accounts with status 'Inactive'
        - prospect_count: Number of accounts with status 'Prospect'
        """
        # Get the standard paginated response
        response = super().list(request, *args, **kwargs)

        # Use the base queryset that's already filtered by tenant and any applied filters
        # except status filter to get accurate counts across all statuses
        queryset = self.filter_queryset(self.get_queryset())

        # Remove status filter if present to get total counts by status
        status_param = request.query_params.get("status", None)
        if status_param:
            # Create a copy of the current filter backends
            filter_backends = self.filter_backends

            # Apply all filters except status
            for backend in filter_backends:
                if isinstance(backend(), DjangoFilterBackend):
                    # Skip status filter but apply other filters
                    queryset = backend().filter_queryset(request, queryset, self)
                    # Remove status filtering that was applied
                    queryset = queryset.filter()
                else:
                    queryset = backend().filter_queryset(request, queryset, self)

        # Calculate metrics
        active_count = queryset.filter(status="Active").count()
        inactive_count = queryset.filter(status="Inactive").count()
        prospect_count = queryset.filter(status="Prospect").count()

        # Create a new ordered dictionary with the fields in the desired order
        from collections import OrderedDict

        ordered_data = OrderedDict()

        # Add pagination fields first
        for key in ["count", "next", "previous"]:
            if key in response.data:
                ordered_data[key] = response.data[key]

        # Add metrics before results
        ordered_data["active_count"] = active_count
        ordered_data["inactive_count"] = inactive_count
        ordered_data["prospect_count"] = prospect_count

        # Add results last
        if "results" in response.data:
            ordered_data["results"] = response.data["results"]

        # Replace response data with the ordered dictionary
        response.data = ordered_data

        return response

    def get_serializer_context(self):
        """
        Add request to serializer context for nested operations.
        """
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def perform_create(self, serializer):
        """
        Set tenant and user information when creating an account.
        Auto-create a Contact record for Individual accounts.
        Reset sequence to the lowest available ID to ensure gaps are filled.
        """
        # Reset the sequence to the lowest available ID
        from django.db import connection

        with connection.cursor() as cursor:
            # If no records exist, reset to 1
            if not Account.objects.exists():
                cursor.execute(
                    "SELECT setval(pg_get_serial_sequence('customers_account', 'id'), 1, false);"
                )
            else:
                # Find the lowest available ID
                # First get all existing IDs
                existing_ids = list(Account.objects.values_list("id", flat=True))

                # Find the first gap in the sequence
                next_id = 1
                while next_id in existing_ids:
                    next_id += 1

                # Reset the sequence to the lowest available ID
                cursor.execute(
                    f"SELECT setval(pg_get_serial_sequence('customers_account', 'id'), {next_id - 1}, true);"
                )

        # Get audit fields from the request
        # Extract user_id from the user object to avoid type errors
        user_id = getattr(self.request.user, "id", None)
        if user_id is None and hasattr(self.request.user, "_user_id"):
            # For SimpleTenantUser which stores user_id as _user_id
            user_id = self.request.user._user_id

        audit_fields = {"created_by": user_id, "updated_by": user_id}

        # Pass audit fields to serializer
        account_instance = serializer.save(**audit_fields)

        # Auto-create a Contact for Individual accounts
        if (
            account_instance.customer_group
            and account_instance.customer_group.group_type == "INDIVIDUAL"
        ):
            try:
                # Create a Contact record linked to this Individual account
                # Extract user_id from the user object to avoid type errors
                user_id = getattr(self.request.user, "id", None)
                if user_id is None and hasattr(self.request.user, "_user_id"):
                    # For SimpleTenantUser which stores user_id as _user_id
                    user_id = self.request.user._user_id

                # Get the client_id from the request or use the default from the model
                client_id = getattr(self.request, "tenant_id", 1)

                Contact.objects.create(
                    account=account_instance,
                    first_name=account_instance.name,  # Use account name as first name
                    last_name="",  # Leave last name blank initially
                    email=serializer.validated_data.get(
                        "email"
                    ),  # Use email if provided
                    owner=account_instance.owner,  # Same owner as account
                    client_id=client_id,  # Get client_id from request
                    created_by=user_id,
                    updated_by=user_id,
                )
            except Exception as e:
                # Log the error but don't fail the account creation
                import logging

                logger = logging.getLogger(__name__)
                logger.error(
                    f"Failed to auto-create Contact for Individual Account {account_instance.id}: {str(e)}"
                )

    def perform_update(self, serializer):
        """
        Set user information when updating an account.
        Pass update_fields to ensure signal handlers know which fields were updated.
        """
        # Get the fields that were included in the request data
        updated_fields = set(serializer.validated_data.keys())

        # Always include updated_by in the updated fields
        updated_fields.add("updated_by")

        # Extract user_id from the user object to avoid type errors
        user_id = getattr(self.request.user, "id", None)
        if user_id is None and hasattr(self.request.user, "_user_id"):
            # For SimpleTenantUser which stores user_id as _user_id
            user_id = self.request.user._user_id

        # Save with specific update_fields to optimize signal handling
        serializer.save(updated_by=user_id, update_fields=list(updated_fields))

    def destroy(self, request, *args, **kwargs):
        """
        Override destroy method to return a success message and reset sequence to the lowest available ID.
        """
        instance = self.get_object()
        account_name = instance.name

        # Delete the instance
        instance.delete()

        # Reset the sequence to the lowest available ID
        from django.db import connection

        with connection.cursor() as cursor:
            # If no records remain, reset to 1
            if not Account.objects.exists():
                cursor.execute(
                    "SELECT setval(pg_get_serial_sequence('customers_account', 'id'), 1, false);"
                )
            else:
                # Find the lowest available ID
                # First get all existing IDs
                existing_ids = list(Account.objects.values_list("id", flat=True))

                # Find the first gap in the sequence
                next_id = 1
                while next_id in existing_ids:
                    next_id += 1

                # Reset the sequence to the lowest available ID
                cursor.execute(
                    f"SELECT setval(pg_get_serial_sequence('customers_account', 'id'), {next_id - 1}, true);"
                )

        # Return a success message instead of 204 No Content
        from rest_framework.response import Response
        from rest_framework import status

        return Response(
            {"message": f"Account successfully deleted"}, status=status.HTTP_200_OK
        )

    def check_permissions(self, request):
        """
        Check permissions based on the action.

        This is a placeholder for more sophisticated RBAC that will be
        implemented in the future.
        """
        super().check_permissions(request)

        # Check if user has the has_perm method (SimpleTenantUser doesn't have it)
        if not hasattr(request.user, "has_perm"):
            # For SimpleTenantUser, we'll assume they have all permissions for now
            # This can be enhanced later with a more sophisticated permission system
            return

        # Basic permission checks based on action
        if self.action == "create" and not request.user.has_perm(
            "customers.add_account"
        ):
            self.permission_denied(
                request, message="You do not have permission to create accounts."
            )

        elif self.action in ["update", "partial_update"] and not request.user.has_perm(
            "customers.change_account"
        ):
            self.permission_denied(
                request, message="You do not have permission to update accounts."
            )

        elif self.action == "destroy" and not request.user.has_perm(
            "customers.delete_account"
        ):
            self.permission_denied(
                request, message="You do not have permission to delete accounts."
            )


class ContactViewSet(BaseTenantViewSet):
    """
    ViewSet for managing customer contacts.

    This viewset provides CRUD operations for contacts with nested account representation.
    It supports filtering, searching, and ordering capabilities, as well as
    tenant isolation and permission checks.

    Key features:
    - Nested account representation
    - Email uniqueness validation
    - Optional last_name field
    - Filtering by account, status, and owner
    - Searching by name and email
    """

    queryset = Contact.objects.select_related("account", "owner")
    serializer_class = ContactSerializer
    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated]
    # Configure filtering, searching, and ordering
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = [
        "status",
        "account",
        "owner",
        "email_opt_out",
        "do_not_call",
        "sms_opt_out",
    ]
    search_fields = ["first_name", "last_name", "email", "account__name"]
    ordering_fields = ["first_name", "last_name", "email", "created_at", "status"]
    ordering = ["last_name", "first_name"]  # Default ordering

    def perform_create(self, serializer):
        """
        Set tenant and user information when creating a contact.
        Reset sequence to the lowest available ID to ensure gaps are filled.
        """
        # Reset the sequence to the lowest available ID
        from django.db import connection

        with connection.cursor() as cursor:
            # If no records exist, reset to 1
            if not Contact.objects.exists():
                cursor.execute(
                    "SELECT setval(pg_get_serial_sequence('customers_contact', 'id'), 1, false);"
                )
            else:
                # Find the lowest available ID
                # First get all existing IDs
                existing_ids = list(Contact.objects.values_list("id", flat=True))

                # Find the first gap in the sequence
                next_id = 1
                while next_id in existing_ids:
                    next_id += 1

                # Reset the sequence to the lowest available ID
                cursor.execute(
                    f"SELECT setval(pg_get_serial_sequence('customers_contact', 'id'), {next_id - 1}, true);"
                )

        # In a real multi-tenant environment, this would use request.tenant
        # For now, use default tenant ID 1 as in BaseTenantViewSet
        serializer.save(
            client_id=1,  # Will be replaced with request.tenant in production
            created_by=self.request.user,
            updated_by=self.request.user,
        )

    def perform_update(self, serializer):
        """
        Set user information when updating a contact.
        Pass update_fields to ensure signal handlers know which fields were updated.
        """
        # Get the fields that were included in the request data
        updated_fields = set(serializer.validated_data.keys())

        # Always include updated_by in the updated fields
        updated_fields.add("updated_by")

        # Save with specific update_fields to optimize signal handling
        serializer.save(
            updated_by=self.request.user, update_fields=list(updated_fields)
        )

    def destroy(self, request, *args, **kwargs):
        """
        Override destroy method to return a success message and reset sequence to the lowest available ID.
        """
        instance = self.get_object()
        contact_name = f"{instance.first_name} {instance.last_name}".strip()

        # Delete the instance
        instance.delete()

        # Reset the sequence to the lowest available ID
        from django.db import connection

        with connection.cursor() as cursor:
            # If no records remain, reset to 1
            if not Contact.objects.exists():
                cursor.execute(
                    "SELECT setval(pg_get_serial_sequence('customers_contact', 'id'), 1, false);"
                )
            else:
                # Find the lowest available ID
                # First get all existing IDs
                existing_ids = list(Contact.objects.values_list("id", flat=True))

                # Find the first gap in the sequence
                next_id = 1
                while next_id in existing_ids:
                    next_id += 1

                # Reset the sequence to the lowest available ID
                cursor.execute(
                    f"SELECT setval(pg_get_serial_sequence('customers_contact', 'id'), {next_id - 1}, true);"
                )

        # Return a success message instead of 204 No Content
        from rest_framework.response import Response
        from rest_framework import status

        return Response(
            {"message": f"Contact successfully deleted"}, status=status.HTTP_200_OK
        )

    def check_permissions(self, request):
        """
        Check permissions based on the action.

        This is a placeholder for more sophisticated RBAC that will be
        implemented in the future.
        """
        super().check_permissions(request)

        # Basic permission checks based on action
        if self.action == "create" and not request.user.has_perm(
            "customers.add_contact"
        ):
            self.permission_denied(
                request, message="You do not have permission to create contacts."
            )

        elif self.action in ["update", "partial_update"] and not request.user.has_perm(
            "customers.change_contact"
        ):
            self.permission_denied(
                request, message="You do not have permission to update contacts."
            )

        elif self.action == "destroy" and not request.user.has_perm(
            "customers.delete_contact"
        ):
            self.permission_denied(
                request, message="You do not have permission to delete contacts."
            )


class CustomerGroupViewSet(BaseTenantViewSet):
    """
    ViewSet for managing customer groups.

    This viewset provides read-only access to customer groups for authenticated users.
    It supports filtering by group_type and is_active, searching by group_name,
    and ordering by various fields.

    Enhanced with metrics for total active and inactive counts.
    Future enhancements will include write operations with proper permission checks.
    """

    queryset = CustomerGroup.objects.all()
    serializer_class = CustomerGroupSerializer
    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated]
    # Configure filtering, searching, and ordering
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["group_type", "is_active"]
    search_fields = ["group_name"]
    ordering_fields = ["id", "group_name", "group_type", "created_at"]
    ordering = ["id"]  # Default ordering by ID

    def list(self, request, *args, **kwargs):
        """
        Override list method to include total active and inactive counts.

        Returns a paginated response with additional metrics:
        - total_active_count: Number of active customer groups
        - total_inactive_count: Number of inactive customer groups
        """
        # Get the standard paginated response
        response = super().list(request, *args, **kwargs)

        # Use the base queryset that's already filtered by tenant
        # This ensures we're using the same filtering logic as the main view
        queryset = self.get_queryset()

        # Calculate metrics without additional tenant filtering
        # since get_queryset() already applies tenant filtering
        total_active_count = queryset.filter(is_active=True).count()
        total_inactive_count = queryset.filter(is_active=False).count()

        # Create a new ordered dictionary with the fields in the desired order
        from collections import OrderedDict

        ordered_data = OrderedDict()

        # Add pagination fields first
        for key in [
            "count",
            "total_pages",
            "current_page",
            "page_size",
            "next",
            "previous",
        ]:
            if key in response.data:
                ordered_data[key] = response.data[key]

        # Add metrics before results
        ordered_data["total_active_count"] = total_active_count
        ordered_data["total_inactive_count"] = total_inactive_count

        # Add results last
        if "results" in response.data:
            ordered_data["results"] = response.data["results"]

        # Replace response data with the ordered dictionary
        response.data = ordered_data

        return response

    @action(detail=False, methods=["get"], url_path="active-with-channels")
    def active_selling_channels(self, request):
        """
        Get a flat list of all active selling channels across all customer groups.

        Returns:
            Response: Paginated list of active selling channels with their details
            Example response:
            {
                "count": 10,
                "next": "http://api.example.com/customer-groups/active-with-channels/?page=2",
                "previous": null,
                "results": [
                    {
                        "id": 21,
                        "status": "ACTIVE",
                        "segment_name": "G1-Marketplace"
                    },
                    ...
                ]
            }
        """
        # Get all active selling channel relationships
        queryset = CustomerGroupSellingChannel.objects.filter(
            status="ACTIVE", customer_group__is_active=True
        ).select_related("customer_group")

        # Apply search if provided
        search = request.query_params.get("search", None)
        if search:
            queryset = queryset.filter(
                Q(segment_name__icontains=search)
                | Q(customer_group__group_name__icontains=search)
            )

        # Order by ID for consistent ordering
        queryset = queryset.order_by("id")

        # Serialize the queryset using SimpleSellingChannelSerializer
        serializer = serializers.SimpleSellingChannelSerializer(queryset, many=True)
        return Response(serializer.data)

    def _update_selling_channels(self, instance, selling_channel_ids):
        """
        Update selling channels for a customer group.

        Args:
            instance: CustomerGroup instance
            selling_channel_ids: List of selling channel IDs to associate with this group
        """
        from pricing.models import SellingChannel

        if selling_channel_ids is None:
            return

        # Get existing relationships
        existing_relationships = instance.selling_channel_relationships.all()
        existing_channel_ids = set(
            rel.selling_channel_id for rel in existing_relationships
        )
        new_channel_ids = set(selling_channel_ids)

        # Find channels to add or reactivate
        channels_to_add = new_channel_ids - existing_channel_ids
        channels_to_reactivate = (
            new_channel_ids & existing_channel_ids
        )  # Channels that exist but might be inactive

        # Create new relationships for channels that don't exist yet
        if channels_to_add:
            selling_channels = SellingChannel.objects.filter(id__in=channels_to_add)
            for channel in selling_channels:
                CustomerGroupSellingChannel.objects.create(
                    customer_group=instance,
                    selling_channel=channel,
                    status="ACTIVE",
                    created_by=1,  # Will be replaced with request.user.id in production
                    updated_by=1,
                    client_id=1,
                )

        # Reactivate any previously inactive relationships
        if channels_to_reactivate:
            instance.selling_channel_relationships.filter(
                selling_channel_id__in=channels_to_reactivate,
                status="INACTIVE",  # Only update if currently inactive
            ).update(
                status="ACTIVE",
                updated_by=self.request.user.id if hasattr(self.request, "user") else 1,
            )

        # Find channels to deactivate (previously removed)
        channels_to_deactivate = existing_channel_ids - new_channel_ids
        if channels_to_deactivate:
            instance.selling_channel_relationships.filter(
                selling_channel_id__in=channels_to_deactivate,
                status="ACTIVE",  # Only update if currently active
            ).update(
                status="INACTIVE",
                updated_by=self.request.user.id if hasattr(self.request, "user") else 1,
            )

    def perform_create(self, serializer):
        """
        Set tenant and user information when creating a customer group.
        Reset sequence to the lowest available ID to ensure gaps are filled.
        Ensure is_active is set to True if not provided.
        Handle selling channels relationship.
        Create product visibility records for new selling channels.
        """
        # Reset the sequence to the lowest available ID
        from django.db import connection

        with connection.cursor() as cursor:
            # If no records exist, reset to 1
            if not CustomerGroup.objects.exists():
                cursor.execute(
                    "SELECT setval(pg_get_serial_sequence('customers_customergroup', 'id'), 1, false);"
                )
            else:
                # Find the lowest available ID
                # First get all existing IDs
                existing_ids = list(CustomerGroup.objects.values_list("id", flat=True))

                # Find the first gap in the sequence
                next_id = 1
                while next_id in existing_ids:
                    next_id += 1

                # Reset the sequence to the lowest available ID
                cursor.execute(
                    f"SELECT setval(pg_get_serial_sequence('customers_customergroup', 'id'), {next_id - 1}, true);"
                )

        # Get selling_channel_ids from request data before saving
        selling_channel_ids = serializer.validated_data.pop("selling_channel_ids", None)

        # Ensure is_active is set to True if not provided
        data = serializer.validated_data
        if "is_active" not in data:
            data["is_active"] = True

        # Save the customer group
        instance = serializer.save(
            client_id=1,  # Will be replaced with request.tenant in production
            created_by=1,
            updated_by=1,
        )

        # Update selling channels if provided
        self._update_selling_channels(instance, selling_channel_ids)

        # Create product visibility records for new selling channels
        if selling_channel_ids:
            import logging

            logger = logging.getLogger(__name__)
            logger.info(
                f"CustomerGroupViewSet.perform_create: Processing visibility for customer group {instance.id}, selling_channels: {selling_channel_ids}"
            )

            from django.db import transaction
            from products.product_visibility import (
                create_customer_group_selling_channel_visibility,
            )

            # Get the newly created customer group selling channels
            new_channel_relationships = instance.selling_channel_relationships.filter(
                selling_channel_id__in=selling_channel_ids, status="ACTIVE"
            )
            logger.info(
                f"CustomerGroupViewSet.perform_create: Found {new_channel_relationships.count()} new channel relationships"
            )

            # Debug output to show each relationship ID
            for rel in new_channel_relationships:
                logger.info(
                    f"CustomerGroupViewSet.perform_create: Scheduling visibility for channel relationship ID: {rel.id}, selling_channel: {rel.selling_channel_id}"
                )

            # Schedule visibility record creation for each new channel
            for channel_rel in new_channel_relationships:

                def create_visibility_for_channel(channel_id=channel_rel.id):
                    try:
                        logger.info(
                            f"Creating visibility records for CustomerGroupSellingChannel ID: {channel_id}"
                        )
                        result = create_customer_group_selling_channel_visibility(
                            channel_id
                        )
                        logger.info(
                            f"Visibility creation result for channel {channel_id}: {result}"
                        )
                    except Exception as e:
                        logger.error(
                            f"Error creating visibility records for channel {channel_id}: {str(e)}",
                            exc_info=True,
                        )

                logger.info(
                    f"Scheduling on_commit for channel relationship ID: {channel_rel.id}"
                )
                transaction.on_commit(create_visibility_for_channel)

        return instance

    def perform_update(self, serializer):
        """
        Set user information when updating a customer group.
        Handle selling channels relationship.
        """
        # Get the fields that were included in the request data
        updated_fields = set(serializer.validated_data.keys())

        # Get selling_channel_ids from request data before saving
        selling_channel_ids = None
        if "selling_channel_ids" in serializer.validated_data:
            selling_channel_ids = serializer.validated_data.pop("selling_channel_ids")
            updated_fields.discard("selling_channel_ids")

        # Always include updated_by in the updated fields
        updated_fields.add("updated_by")

        # Get user ID from the request user object
        user_id = getattr(
            self.request.user, "id", 1
        )  # Default to 1 if ID not available

        # Save the customer group with specific update_fields to optimize signal handling
        instance = serializer.save(
            updated_by=user_id, update_fields=list(updated_fields)
        )

        # Update selling channels if provided
        if selling_channel_ids is not None:
            self._update_selling_channels(instance, selling_channel_ids)

        return instance

    def destroy(self, request, *args, **kwargs):
        """
        Override destroy method to return a success message and reset sequence to the lowest available ID.
        """
        instance = self.get_object()
        group_name = instance.group_name

        # Delete the instance
        instance.delete()

        # Reset the sequence to the lowest available ID
        from django.db import connection

        with connection.cursor() as cursor:
            # If no records remain, reset to 1
            if not CustomerGroup.objects.exists():
                cursor.execute(
                    "SELECT setval(pg_get_serial_sequence('customers_customergroup', 'id'), 1, false);"
                )
            else:
                # Find the lowest available ID
                # First get all existing IDs
                existing_ids = list(CustomerGroup.objects.values_list("id", flat=True))

                # Find the first gap in the sequence
                next_id = 1
                while next_id in existing_ids:
                    next_id += 1

                # Reset the sequence to the lowest available ID
                cursor.execute(
                    f"SELECT setval(pg_get_serial_sequence('customers_customergroup', 'id'), {next_id - 1}, true);"
                )

        # Return a success message instead of 204 No Content
        from rest_framework.response import Response
        from rest_framework import status

        return Response(
            {"message": f"Customer group successfully deleted"},
            status=status.HTTP_200_OK,
        )

    # def check_permissions(self, request):
    #     """
    #     Check permissions based on the action.

    #     This is a placeholder for more sophisticated RBAC that will be
    #     implemented in the future.
    #     """
    #     super().check_permissions(request)

    #     # Basic permission checks based on action
    #     if self.action == 'create' and not request.user.has_perm('customers.add_customergroup'):
    #         self.permission_denied(request, message='You do not have permission to create customer groups.')

    #     elif self.action in ['update', 'partial_update'] and not request.user.has_perm('customers.change_customergroup'):
    #         self.permission_denied(request, message='You do not have permission to update customer groups.')

    #     elif self.action == 'destroy' and not request.user.has_perm('customers.delete_customergroup'):
    #         self.permission_denied(request, message='You do not have permission to delete customer groups.')


class AddressViewSet(BaseTenantViewSet):
    """
    ViewSet for managing addresses.

    This viewset provides read-only access to addresses for authenticated users.
    It supports filtering by address_type, city, state_province, postal_code, and country,
    searching by street_1 and city, and ordering by various fields.

    For Phase 1, this is a read-only API. Future enhancements will include write operations
    with proper permission checks and validation for primary address uniqueness.

    Note: Addresses are typically managed through the Account API rather than directly,
    as they are always associated with an Account.
    """

    authentication_classes = [TenantSchemaMiddleware, CustomJWTAuthentication]
    permission_classes = [AllowAny]
    serializer_class = AddressSerializer

    def get_queryset(self):
        """
        Get the queryset of addresses, filtered by tenant_slug.
        Optionally filter by account_id if provided in the query parameters.
        """
        # Get base queryset
        queryset = Address.objects.all()

        # Get tenant_slug from URL parameters
        tenant_slug = self.kwargs.get("tenant_slug")

        # If tenant_slug is provided, filter addresses by the tenant
        if tenant_slug:
            # In a multi-tenant environment, convert tenant_slug to client_id
            # For now, we'll use a simple mapping
            tenant_mapping = {
                "erp_turtle": 1,
                # Add more mappings as needed
            }

            client_id = tenant_mapping.get(tenant_slug, None)
            if client_id:
                queryset = queryset.filter(client_id=client_id)

        # Filter by account_id if provided
        account_id = self.request.query_params.get("account_id")
        if account_id:
            queryset = queryset.filter(account_id=account_id)

        return queryset

    # Configure filtering, searching, and ordering
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = [
        "address_type",
        "city",
        "state_province",
        "postal_code",
        "country",
        "is_primary_billing",
        "is_primary_shipping",
    ]
    search_fields = ["street_1", "city"]
    ordering_fields = ["address_type", "city", "country", "created_at"]
    ordering = ["address_type", "city"]  # Default ordering

    def get_serializer_context(self):
        """
        Add account to the serializer context if account_id is provided.
        """
        context = super().get_serializer_context()

        # Add account to context if account_id is provided in query params
        account_id = self.request.query_params.get("account_id")

        # For POST/PUT/PATCH, also check for account_id in the request data
        if not account_id and self.request.method in ["POST", "PUT", "PATCH"]:
            account_id = self.request.data.get("account_id")

        if account_id:
            try:
                account = Account.objects.get(id=account_id)
                context["account"] = account
            except Account.DoesNotExist:
                pass

        return context

    def perform_create(self, serializer):
        """
        Set tenant and user information when creating an address.
        Link to the specified account.
        Reset sequence to the lowest available ID to ensure gaps are filled.
        """
        # Reset the sequence to the lowest available ID
        from django.db import connection

        with connection.cursor() as cursor:
            # If no records exist, reset to 1
            if not Address.objects.exists():
                cursor.execute(
                    "SELECT setval(pg_get_serial_sequence('customers_address', 'id'), 1, false);"
                )
            else:
                # Find the lowest available ID
                # First get all existing IDs
                existing_ids = list(Address.objects.values_list("id", flat=True))

                # Find the first gap in the sequence
                next_id = 1
                while next_id in existing_ids:
                    next_id += 1

                # Reset the sequence to the lowest available ID
                cursor.execute(
                    f"SELECT setval(pg_get_serial_sequence('customers_address', 'id'), {next_id - 1}, true);"
                )

        # Get account_id from request data
        account_id = self.request.data.get("account_id")
        if not account_id:
            from rest_framework.exceptions import ValidationError

            raise ValidationError({"account_id": "This field is required."})

        try:
            account = Account.objects.get(id=account_id)
        except Account.DoesNotExist:
            from rest_framework.exceptions import ValidationError

            raise ValidationError({"account_id": "Invalid account ID."})

        user = self.request.user
        user_id = user.id if user and hasattr(user, "id") else None

        # In a real multi-tenant environment, this would use request.tenant
        # For now, use default tenant ID 1 as in BaseTenantViewSet
        serializer.save(
            account=account,
            client_id=1,  # Will be replaced with request.tenant in production
            created_by=user_id,
            updated_by=user_id,
        )

    def perform_update(self, serializer):
        """
        Set user information when updating an address.
        """
        user = self.request.user
        user_id = user.id if user and hasattr(user, "id") else None
        serializer.save(updated_by=user_id)

    @action(detail=False, methods=["get"], url_path="my-addresses")
    def my_addresses(self, request, *args, **kwargs):
        """
        Get addresses for the authenticated user based on their account_id from the JWT token.

        This endpoint extracts the account_id from the JWT token and returns all addresses
        associated with that account. No additional parameters are needed as the account_id
        is automatically extracted from the token.

        Returns:
            Response: JSON containing the list of addresses for the user's account
        """
        try:
            # Get the token from the Authorization header
            auth_header = request.META.get("HTTP_AUTHORIZATION", "").split()

            if (
                not auth_header
                or len(auth_header) != 2
                or auth_header[0].lower() != "bearer"
            ):
                return Response(
                    {"error": "Invalid Authorization header. Expected: Bearer <token>"},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            token = auth_header[1]

            # Manually decode the JWT token
            try:
                import jwt
                from django.conf import settings

                # Decode the token (without verification for now, in production use verify=True)
                payload = jwt.decode(
                    token,
                    settings.SECRET_KEY,  # Make sure to use your JWT secret key
                    algorithms=["HS256"],
                    options={"verify_signature": False},  # For development only
                )

                account_id = payload.get("account_id")
                if not account_id:
                    return Response(
                        {"error": "Account ID not found in token payload"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                # Convert account_id to integer if it's a string
                if isinstance(account_id, str):
                    try:
                        account_id = int(account_id)
                    except (ValueError, TypeError):
                        return Response(
                            {"error": "Invalid account_id format in token"},
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                # Filter addresses by the account_id from the token
                queryset = Address.objects.filter(account_id=account_id)

                # Apply filters, sorting, etc. from the standard filter backends
                queryset = self.filter_queryset(queryset)

                # Paginate the results
                page = self.paginate_queryset(queryset)
                if page is not None:
                    serializer = self.get_serializer(page, many=True)
                    return self.get_paginated_response(serializer.data)

                # If pagination is not configured
                serializer = self.get_serializer(queryset, many=True)
                return Response(serializer.data)

            except jwt.ExpiredSignatureError:
                return Response(
                    {"error": "Token has expired"}, status=status.HTTP_401_UNAUTHORIZED
                )
            except jwt.InvalidTokenError as e:
                return Response(
                    {"error": f"Invalid token: {str(e)}"},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

        except Exception as e:
            import traceback

            return Response(
                {
                    "error": f"Failed to retrieve addresses: {str(e)}",
                    "trace": traceback.format_exc(),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def destroy(self, request, *args, **kwargs):
        """
        Override destroy method to return a success message and reset sequence to the lowest available ID.
        """
        instance = self.get_object()
        address_type = instance.address_type

        # Delete the instance
        instance.delete()

        # Reset the sequence to the lowest available ID
        from django.db import connection

        with connection.cursor() as cursor:
            # If no records remain, reset to 1
            if not Address.objects.exists():
                cursor.execute(
                    "SELECT setval(pg_get_serial_sequence('customers_address', 'id'), 1, false);"
                )
            else:
                # Find the lowest available ID
                # First get all existing IDs
                existing_ids = list(Address.objects.values_list("id", flat=True))

                # Find the first gap in the sequence
                next_id = 1
                while next_id in existing_ids:
                    next_id += 1

                # Reset the sequence to the lowest available ID
                cursor.execute(
                    f"SELECT setval(pg_get_serial_sequence('customers_address', 'id'), {next_id - 1}, true);"
                )

        # Return a success message instead of 204 No Content
        from rest_framework.response import Response
        from rest_framework import status

        return Response(
            {"message": f"Address successfully deleted"}, status=status.HTTP_200_OK
        )


import logging

logger = logging.getLogger(__name__)


class GuestAccountViewSet(BaseTenantViewSet):
    """
    ViewSet for creating guest accounts.

    This viewset provides an endpoint for creating guest accounts with associated contacts.
    It does not require authentication and is accessible to any user.

    Key features:
    - Creates an Account with 'Guest' status
    - Creates an associated Contact record
    - Uses TenantSchemaMiddleware for tenant isolation
    - Allows anonymous access (no authentication required)
    """

    queryset = Account.objects.all()
    serializer_class = AccountSerializer
    authentication_classes = [TenantSchemaMiddleware]
    permission_classes = [AllowAny]
    http_method_names = ["post"]  # Only allow POST requests

    def dispatch(self, request, *args, **kwargs):
        logger.info(f"Dispatching request: {request.method} {request.path}")
        # Only log request body for POST requests and after the request has been processed
        if request.method == "POST":
            try:
                # Ensure request body is parsed before accessing data
                if hasattr(request, "_data"):
                    logger.info(f"Request data: {request._data}")
                elif hasattr(request, "data"):
                    logger.info(f"Request data: {request.data}")
                else:
                    logger.info("No request data available yet")
            except Exception as e:
                logger.warning(f"Could not log request data: {str(e)}")
        logger.info(f"URL kwargs: {kwargs}")
        return super().dispatch(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        """
        Create a guest account with an associated contact.

        This method creates a new Account with 'Guest' status and a Contact record
        linked to that account. It extracts tenant information from the request
        and sets appropriate default values for required fields.

        Returns:
            Response: JSON containing the created account and contact information
        """
        logger.info(f"Raw request data: {request.data}")

        # Extract data from request
        data = request.data.copy()
        logger.info(f"Copied request data: {data}")

        # Set default values for guest account
        data["status"] = "Guest"
        data["account_type"] = "Individual"  # Set default account type

        # Set required fields if not provided
        if not data.get("name"):
            data["name"] = "Guest Customer"

        # Ensure we have a customer group for guest accounts
        try:
            # Try to get an existing customer group for individuals
            guest_group = CustomerGroup.objects.filter(
                group_type="INDIVIDUAL", is_active=True
            ).first()

            # If no group exists, create a new one
            if not guest_group:
                guest_group = CustomerGroup.objects.create(
                    group_name="Individual Customers",
                    group_type="INDIVIDUAL",
                    is_active=True,
                    description="Default group for individual customers",
                    created_by=None,
                    updated_by=None,
                )
                logger.info(
                    f"Created new customer group: {guest_group.id} - {guest_group.group_name}"
                )

            # Set the customer group in the data - use customer_group_id which is the write-only field
            data["customer_group_id"] = guest_group.id
            logger.info(
                f"Using customer group: {guest_group.id} - {guest_group.group_name}"
            )

        except Exception as e:
            logger.error(f"Error getting or creating guest customer group: {str(e)}")
            return Response(
                {"detail": "Failed to set up guest account group"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        logger.info(f"Data after setting defaults: {data}")

        # Check for existing contact with this email first
        email = data.get("contact", {}).get("email") or data.get("email", "")
        existing_contact = None

        if email:
            try:
                existing_contact = Contact.objects.filter(email=email).first()
                if existing_contact:
                    logger.info(
                        f"Found existing contact with email {email}: {existing_contact.id}"
                    )
                    # Contact exists, return its information without creating a new account
                    existing_account = existing_contact.account

                    if existing_account:
                        response_data = {
                            "account": AccountSerializer(existing_account).data,
                            "contact": ContactSerializer(existing_contact).data,
                            "message": "Guest account found with existing contact",
                            "contact_status": "existing",
                        }
                        return Response(response_data, status=status.HTTP_200_OK)
            except Exception as e:
                logger.warning(f"Error checking for existing contact: {str(e)}")

        # Start a transaction to ensure both account and contact are created
        with transaction.atomic():
            try:
                # Get tenant ID from request or use default
                tenant_id = getattr(request, "tenant_id", 1)

                # Create account with tenant context
                account_serializer = self.get_serializer(data=data)
                if not account_serializer.is_valid():
                    logger.error(
                        f"Account validation errors: {account_serializer.errors}"
                    )
                    return Response(
                        {
                            "detail": "Account validation failed",
                            "errors": account_serializer.errors,
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                # Save the account with the tenant context
                account = account_serializer.save()

                # Prepare contact data
                contact_data = data.get("contact", {})
                if not contact_data:
                    # Create minimal contact data if none provided
                    contact_data = {
                        "first_name": data.get("first_name", "Guest"),
                        "last_name": data.get("last_name", "User"),
                        "email": data.get("email", ""),
                        "mobile_phone": data.get("phone", ""),
                    }

                # Add account to contact data - use account_id which is expected by ContactSerializer
                contact_data["account_id"] = account.id

                # Create new contact
                contact_serializer = ContactSerializer(data=contact_data)
                if not contact_serializer.is_valid():
                    logger.error(
                        f"Contact validation errors: {contact_serializer.errors}"
                    )
                    # Don't return error - continue with account creation
                    logger.warning(
                        "Proceeding with account creation despite contact validation errors"
                    )
                    contact = None
                else:
                    # Save the contact with the tenant context
                    contact = contact_serializer.save()

                # The contact is already linked to the account through the account_id field
                # No need to update the account with a reference back to the contact

                # Return the created account and contact information
                response_data = {
                    "account": AccountSerializer(account).data,
                    "message": "Guest account created successfully",
                    "contact_status": "created",
                }

                # Add contact info to response if we have a contact
                if contact:
                    response_data["contact"] = ContactSerializer(contact).data
                else:
                    # We have an account but no contact
                    response_data["message"] = (
                        "Guest account created successfully without contact"
                    )
                    response_data["contact_status"] = "failed"

                return Response(response_data, status=status.HTTP_201_CREATED)

            except Exception as e:
                logger.error(f"Error creating guest account: {str(e)}")
                return Response(
                    {"detail": f"Failed to create guest account: {str(e)}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

    def get_serializer_context(self):
        """
        Add request to serializer context for nested operations.
        """
        context = super().get_serializer_context()
        return context


class CustomerGroupSellingChannelFilteredView(APIView):
    """
    API endpoint to retrieve CustomerGroupSellingChannel by customer_group_id and selling_channel_id.
    
    If customer_group_id is not provided, it will attempt to find it from GuestConfig using the selling channel name.
    """

    authentication_classes = [TenantSchemaMiddleware]
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        customer_group_id = request.query_params.get("customer_group_id")
        selling_channel_id = request.query_params.get("selling_channel_id")

        # Validate required parameters
        if not selling_channel_id:
            return Response(
                {"detail": "selling_channel_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Get selling channel by ID
            selling_channel = SellingChannel.objects.filter(
                id=selling_channel_id, is_active=True
            ).first()
            if not selling_channel:
                return Response(
                    {"detail": "Selling channel not found or inactive."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            
            # If customer_group_id is not provided, try to find it from GuestConfig using selling_channel_id
            if not customer_group_id:
                from order_management.models import GuestConfig
                
                # Get the first matching guest config for this selling channel id
                guest_config = GuestConfig.objects.filter(
                    selling_channel_id=int(selling_channel_id)
                ).first()
                
                if guest_config:
                    customer_group_id = guest_config.customer_group_id
                else:
                    return Response(
                        {"detail": "No guest configuration found for the given selling channel ID."},
                        status=status.HTTP_404_NOT_FOUND,
                    )
            
            # If we still don't have a customer_group_id, return an error
            if not customer_group_id:
                return Response(
                    {"detail": "No customer group ID could be determined for this request."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Get the relationship
            relationship = (
                CustomerGroupSellingChannel.objects.filter(
                    customer_group_id=customer_group_id,
                    selling_channel=selling_channel,
                    status="ACTIVE",  # Only return active relationships
                )
                .select_related("customer_group", "selling_channel")
                .first()
            )

            if not relationship:
                return Response(
                    {
                        "detail": "No active relationship found for the given parameters."
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Serialize and return the data
            serializer = CustomerGroupSellingChannelFilteredSerializer(relationship)
            return Response(serializer.data)

        except SellingChannel.DoesNotExist:
            return Response(
                {"detail": "Selling channel not found or inactive."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            return Response(
                {"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CustomerGroupSellingChannelSegmentView(APIView):
    """
    API endpoint to retrieve CustomerGroupSellingChannel segment by customer_group_id and selling_channel_id.
    """

    authentication_classes = [TenantSchemaMiddleware]
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        customer_group_id = request.query_params.get("customer_group_id")
        selling_channel_id = request.query_params.get("selling_channel_id")

        # Validate required parameters
        if not customer_group_id or not selling_channel_id:
            return Response(
                {
                    "detail": "Both customer_group_id and selling_channel_id are required."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Get the CustomerGroupSellingChannel relationship
            segment = (
                CustomerGroupSellingChannel.objects.filter(
                    customer_group_id=customer_group_id,
                    selling_channel_id=selling_channel_id,
                )
                .select_related("customer_group", "selling_channel")
                .first()
            )

            if not segment:
                return Response(
                    {
                        "detail": "No active segment found for the given customer group and selling channel."
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Serialize and return the segment data
            serializer = CustomerGroupSellingChannelFilteredSerializer(segment)
            return Response({"segment": serializer.data})

        except Exception as e:
            return Response(
                {"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class WebSellingChannelSegmentsView(APIView):
    """
    API endpoint to retrieve all customer group segments that have a selling channel with the name 'Web'.
    
    This endpoint returns all active customer group and selling channel relationships where the
    selling channel is 'Web'. The response is a flattened array with only active segments.
    
    Query Parameters:
    - group_type: Optional filter for customer group type (BUSINESS, INDIVIDUAL, GOVERNMENT)
    """
    authentication_classes = [TenantSchemaMiddleware]
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        try:
            # Get the tenant from kwargs if provided
            tenant_id = kwargs.get('tenant_id')
            
            # Get optional group_type filter from query parameters
            group_type = request.query_params.get('group_type', None)
            
            # Validate group_type if provided
            valid_group_types = [choice[0] for choice in CustomerGroup.GROUP_TYPE_CHOICES]
            if group_type and group_type not in valid_group_types:
                return Response(
                    {"detail": f"Invalid group_type. Must be one of: {', '.join(valid_group_types)}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Find the Web selling channel using hardcoded ID 3
            web_channel = SellingChannel.objects.filter(
                id=3,
                is_active=True
            ).first()
            
            if not web_channel:
                return Response(
                    {"detail": "Web selling channel not found or inactive."},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Base query for active segments with the Web selling channel
            segments_query = CustomerGroupSellingChannel.objects.filter(
                selling_channel=web_channel,
                status="ACTIVE",
                customer_group__is_active=True
            ).select_related("customer_group", "selling_channel")
            
            # Apply group_type filter if provided
            if group_type:
                segments_query = segments_query.filter(customer_group__group_type=group_type)
                
            # Execute query and order results
            segments = segments_query.order_by("customer_group__group_name")
            
            if not segments.exists():
                return Response([], status=status.HTTP_200_OK)  # Return empty array instead of 404
            
            # Create response data grouped by customer_group_type
            result = {
                "INDIVIDUAL": [],
                "BUSINESS": [],
                "GOVERNMENT": []
            }
            
            for segment in segments:
                group_type = segment.customer_group.group_type
                segment_data = {
                    "id": segment.id,
                    "customer_group_id": segment.customer_group.id,
                    "customer_group_name": segment.customer_group.group_name,
                    "customer_group_display_name": segment.customer_group.display_name,
                    "customer_group_description": segment.customer_group.description,
                    "selling_channel_id": segment.selling_channel.id,
                    "selling_channel_name": segment.selling_channel.name,
                    "selling_channel_code": segment.selling_channel.code,
                    "status": segment.status,
                    "segment_name": segment.segment_name
                }
                
                # Add to the appropriate array based on group_type
                if group_type in result:
                    result[group_type].append(segment_data)
            
            # Remove group types with no segments
            filtered_result = {k: v for k, v in result.items() if v}
            return Response(filtered_result)
            
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ContactListAPIView(APIView):
    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, tenant_slug):
        contacts = Contact.objects.all()
        serializer = ContactBasicSerializer(contacts, many=True)
        return Response(serializer.data)


class CustomerGroupSellingChannelInternalReadOnlyViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Internal-only GET API for CustomerGroupSellingChannel.
    JWT auth, authenticated users only.
    No pagination - returns all records.
    """
    serializer_class = CustomerGroupSellingChannelDetailSerializer
    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated]
    pagination_class = None  # Disable pagination
    
    def get_queryset(self):
        # Get all CustomerGroupSellingChannel objects
        return CustomerGroupSellingChannel.objects.all().select_related('customer_group', 'selling_channel').order_by('id')

