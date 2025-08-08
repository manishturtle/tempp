from core.views import BaseTenantViewSet
from .models import (
    Opportunity,
    OpportunityStatus,
    OpportunityRoles,
    OpportunityTypes,
    OpportunityLeadSources,
)
from .serializers import (
    OpportunitySerializer,
    OpportunityStatusSerializer,
    OpportunityRolesSerializer,
    OpportunityTeamMembersSerializer,
    OpportunityTypesSerializer,
    OpportunityLeadSourcesSerializer,
)
from erp_backend.middleware import CustomJWTAuthentication
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from customers.models import (
    Account,
    Contact,
    Address,
    ContactAddress,
    CustomerGroupSellingChannel,
)
from customers.serializers import (
    AccountSerializer,
    ContactSerializer,
    AddressSerializer,
)
from erp_backend.base_model import TenantUser
import requests
from django.conf import settings
from pricing.models import SellingChannel, TaxRate
from pricing.serializers import SellingChannelSerializer, TaxRateSerializer
from payment_method.models import PaymentMethod
from payment_method.serializers import PaymentMethodSerializer
import logging
from rest_framework import serializers
from customers.serializers import CustomerGroupSerializer, ParentAccountSerializer

logger = logging.getLogger(__name__)


class LookupAddressSerializer(serializers.ModelSerializer):
    """
    Custom address serializer for lookup endpoints that returns address_id instead of id.
    """

    address_id = serializers.SerializerMethodField()

    class Meta:
        model = Address
        fields = [
            "address_id",
            "address_type",
            "business_name",
            "gst_number",
            "street_1",
            "street_2",
            "street_3",
            "full_name",
            "phone_number",
            "city",
            "state_province",
            "postal_code",
            "country",
            "is_primary_billing",
            "is_primary_shipping",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "custom_fields",
        ]

    def get_address_id(self, obj):
        """Return the original id as address_id."""
        return obj.id


class LookupAccountSerializer(serializers.ModelSerializer):
    """
    Custom account serializer for lookup endpoints that excludes contacts
    and uses custom address serializer.
    """

    # Nested serializers for related objects
    customer_group = CustomerGroupSerializer(read_only=True)
    parent_account = ParentAccountSerializer(read_only=True)

    # Use custom address serializer
    addresses = serializers.SerializerMethodField()

    # Read-only fields
    effective_customer_group = CustomerGroupSerializer(read_only=True)

    class Meta:
        model = Account
        fields = [
            "id",
            "name",
            "legal_name",
            "account_number",
            "customer_group",
            "effective_customer_group",
            "status",
            "parent_account",
            "owner",
            "website",
            "primary_phone",
            "industry",
            "company_size",
            "tax_id",
            "description",
            "addresses",
            "company_id",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
            "custom_fields",
        ]
        read_only_fields = [
            "id",
            "effective_customer_group",
            "company_id",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]

    def get_addresses(self, obj):
        """Get addresses with custom serializer that returns address_id."""
        if obj.addresses.exists():
            serializer = LookupAddressSerializer(
                obj.addresses.all(), many=True, context={"account": obj}
            )
            return serializer.data
        return []


class LookupDataViewSet(BaseTenantViewSet):
    """
    ViewSet for generic lookup data needed across the application.

    Provides endpoints for retrieving reference data such as accounts,
    contacts, and staff users for dropdowns and selection components.
    """

    permission_classes = [IsAuthenticated]
    authentication_classes = [CustomJWTAuthentication]

    @action(detail=False, methods=["get"], url_path="accounts")
    def get_accounts(self, request, *args, **kwargs):
        """
        Get a full list of all accounts without pagination.
        Uses custom serializer that excludes contacts and returns address_id instead of id for addresses.

        Returns:
            Response: A list of all accounts in the system.
        """
        accounts = Account.objects.all()
        serializer = LookupAccountSerializer(accounts, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="contacts")
    def get_contacts(self, request, *args, **kwargs):
        """
        Get a full list of all contacts for a specific account without pagination.

        Query Parameters:
            account_id: ID of the account to filter contacts.

        Returns:
            Response: A list of contacts belonging to the specified account.
        """
        account_id = request.query_params.get("account_id")
        if not account_id:
            return Response(
                {"error": "account_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        contacts = Contact.objects.filter(account_id=account_id)
        serializer = ContactSerializer(contacts, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="staff-users")
    def get_staff_users(self, request, *args, **kwargs):
        """
        Get a full list of all active staff users without pagination.

        Returns:
            Response: Object containing array of users and current user ID.
        """
        # Get the current user ID
        user = self.request.user
        user_id = getattr(user, "id", None)

        staff_users = TenantUser.objects.filter(is_active=True, is_staff=True)
        # Return a simplified response with essential user information
        user_data = [
            {
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "full_name": f"{user.first_name} {user.last_name}".strip(),
            }
            for user in staff_users
        ]

        # Return both users array and current user ID in a single object
        return Response({"users": user_data, "current_user": user_id})

    @action(detail=False, methods=["get"], url_path="contact-addresses")
    def get_contact_addresses(self, request, *args, **kwargs):
        """
        Get addresses for a specific contact.

        Query Parameters:
            contact_id: ID of the contact to fetch addresses for

        Returns:
            Response: A list of addresses associated with the specified contact.
        """
        contact_id = request.query_params.get("contact_id")
        if not contact_id:
            return Response(
                {"error": "contact_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Get all ContactAddress entries for this contact
            contact_addresses = ContactAddress.objects.filter(contact_id=contact_id)

            # Get the address IDs from the ContactAddress records
            address_ids = [ca.address_id for ca in contact_addresses]

            # Fetch all the addresses with these IDs
            addresses = Address.objects.filter(id__in=address_ids)

            # Serialize the addresses
            serializer = AddressSerializer(addresses, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error fetching addresses for contact {contact_id}: {str(e)}")
            return Response(
                {"error": f"Failed to fetch addresses: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["get"], url_path="selling-channels")
    def get_selling_channels(self, request, *args, **kwargs):
        """
        Get all selling channels without pagination.

        Returns:
            Response: A list of all selling channels in the system.
        """
        try:
            selling_channels = SellingChannel.objects.all()
            serializer = SellingChannelSerializer(selling_channels, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error fetching selling channels: {str(e)}")
            return Response(
                {"error": f"Failed to fetch selling channels: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["get"], url_path="tax-rates")
    def get_tax_rates(self, request, *args, **kwargs):
        """
        Get all tax rates without pagination.

        Returns:
            Response: A list of all tax rates in the system.
        """
        try:
            tax_rates = TaxRate.objects.all()
            serializer = TaxRateSerializer(tax_rates, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error fetching tax rates: {str(e)}")
            return Response(
                {"error": f"Failed to fetch tax rates: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["get"], url_path="payment-methods")
    def get_payment_methods(self, request, *args, **kwargs):
        """
        Get all payment methods available in the system.

        Returns:
            Response: A list of all payment methods.
        """
        try:
            # Get all active payment methods
            payment_methods = PaymentMethod.objects.all().order_by("name")

            # Serialize the payment methods
            serializer = PaymentMethodSerializer(payment_methods, many=True)
            return Response(serializer.data)

        except Exception as e:
            logger.error(f"Error fetching payment methods: {str(e)}")
            return Response(
                {"error": f"Failed to fetch payment methods: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class OpportunityViewSet(BaseTenantViewSet):
    """
    API endpoint that allows Opportunities to be viewed or edited.
    """

    # queryset is optimized to pre-fetch related data in a single query
    queryset = (
        Opportunity.objects.select_related(
            "account",
            "primary_contact",
            "status",
            "lead_source",
            "type",
        )
        .prefetch_related("team_members", "team_members__role")
        .all()
    )
    serializer_class = OpportunitySerializer
    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated]
    filterset_fields = [
        "status",
        "owner",
        "account_id",
        "service_ticket_id",
        "lead_source",
        "type",
    ]
    search_fields = ["name", "account__name"]
    ordering_fields = ["name", "amount", "close_date", "created_at"]

    def perform_create(self, serializer):
        service_sub_category_id = self.request.data.get("service_sub_category_id")
        # Save opportunity instance first
        opportunity = serializer.save(
            created_by=self.request.user.id, updated_by=self.request.user.id
        )

        # After saving, create service ticket in external system
        try:
            # Extract tenant slug from URL
            tenant_slug = self.kwargs.get("tenant_slug")
            if not tenant_slug:
                logger.error("No tenant slug found in request URL")
                return

            # Get primary contact details if available
            if opportunity.primary_contact:
                primary_contact = opportunity.primary_contact

                # Prepare service ticket payload
                payload = {
                    "service_sub_category_id": service_sub_category_id,
                    "status": "New",
                    "user_type": [1],
                    "priority": "Medium",
                    "requested_by": primary_contact.id,
                    "requester_email": primary_contact.email,
                    "requester_first_name": primary_contact.first_name,
                    "requester_last_name": primary_contact.last_name,
                    "subject": f"{opportunity.name} for {primary_contact.first_name} {primary_contact.last_name}",
                    "assigned_agent_id": int(opportunity.owner),
                }

                # Construct API URL
                api_url = f"{settings.SM_URL}/{tenant_slug}/service-tickets/tickets/"

                # Make API call to create service ticket
                response = requests.post(
                    api_url,
                    json=payload,
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": self.request.headers.get("Authorization", ""),
                    },
                )

                if response.status_code >= 400:
                    logger.error(
                        f"Failed to create service ticket. Status code: {response.status_code}, Response: {response.text}"
                    )
                else:
                    # Extract ticket ID from the response
                    try:
                        response_data = response.json()
                        service_ticket_id = response_data.get("id")
                        if service_ticket_id:
                            # Save the service_ticket_id back to the opportunity
                            opportunity.service_ticket_id = service_ticket_id
                            opportunity.save(update_fields=["service_ticket_id"])
                            logger.info(
                                f"Service ticket created successfully with ID {service_ticket_id} for opportunity {opportunity.id}"
                            )
                        else:
                            logger.warning(
                                f"Service ticket created but no ID returned in response: {response_data}"
                            )
                    except Exception as e:
                        logger.error(
                            f"Error extracting service ticket ID from response: {str(e)}. Response: {response.text}"
                        )

        except Exception as e:
            # Log error but don't fail the opportunity creation
            logger.error(f"Error creating service ticket: {str(e)}")

        return opportunity

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user.id)

    def retrieve(self, request, *args, **kwargs):
        """
        Retrieve a single opportunity, and if service_ticket_id exists, fetch the service ticket details.
        """
        # Get the opportunity instance
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        response_data = serializer.data

        # Check if service_ticket_id exists
        if instance.service_ticket_id:
            try:
                # Extract tenant slug from URL
                tenant_slug = kwargs.get("tenant_slug")
                if not tenant_slug:
                    logger.warning(
                        "No tenant slug found in request URL when retrieving service ticket"
                    )
                else:
                    # Construct API URL to get service ticket details
                    api_url = f"{settings.SM_URL}/{tenant_slug}/service-tickets/tickets/{instance.service_ticket_id}/"

                    # Make API call to fetch service ticket
                    ticket_response = requests.get(
                        api_url,
                        headers={
                            "Authorization": request.headers.get("Authorization", "")
                        },
                    )

                    if ticket_response.status_code == 200:
                        # Add service ticket details to the response
                        response_data["service_ticket"] = ticket_response.json()
                    else:
                        logger.warning(
                            f"Failed to fetch service ticket details. Status: {ticket_response.status_code}, Response: {ticket_response.text}"
                        )
            except Exception as e:
                logger.error(f"Error fetching service ticket details: {str(e)}")

        return Response(response_data)

    def list(self, request, *args, **kwargs):
        """
        Override list method to handle all_records flag for non-paginated response.
        """
        all_records = request.query_params.get("all_records", "false").lower() == "true"
        if all_records:
            queryset = self.filter_queryset(self.get_queryset())
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)

        return super().list(request, *args, **kwargs)

    @action(detail=False, methods=["get"], url_path="get-accounts")
    def get_accounts(self, request, *args, **kwargs):
        """
        Get a full list of all accounts without pagination.

        Returns:
            Response: A list of all accounts in the system.
        """
        accounts = Account.objects.all()
        serializer = AccountSerializer(accounts, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="get-contacts")
    def get_contacts(self, request, *args, **kwargs):
        """
        Get a full list of all contacts for a specific account without pagination.

        Query Parameters:
            account_id: ID of the account to filter contacts.

        Returns:
            Response: A list of contacts belonging to the specified account.
        """
        account_id = request.query_params.get("account_id")
        if not account_id:
            return Response({"error": "account_id parameter is required"}, status=400)

        contacts = Contact.objects.filter(account_id=account_id)
        serializer = ContactSerializer(contacts, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="get-staff-users")
    def get_staff_users(self, request, *args, **kwargs):
        """
        Get a full list of all active staff users without pagination.

        Returns:
            Response: Object containing array of users and current user ID.
        """
        # Get the current user ID
        user = self.request.user
        user_id = getattr(user, "id", None)

        staff_users = TenantUser.objects.filter(is_active=True, is_staff=True)
        # Return a simplified response with essential user information
        user_data = [
            {
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "full_name": f"{user.first_name} {user.last_name}".strip(),
            }
            for user in staff_users
        ]

        # Return both users array and current user ID in a single object
        return Response({"users": user_data, "current_user": user_id})


class OpportunityStatusViewSet(BaseTenantViewSet):
    """
    API endpoint that allows Opportunity Statuses to be viewed or edited.
    """

    queryset = OpportunityStatus.objects.all().order_by("name")
    serializer_class = OpportunityStatusSerializer
    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status"]
    search_fields = ["name"]
    ordering_fields = ["name", "created_at"]

    def perform_create(self, serializer):
        """
        Override to set created_by from the authenticated user.
        """
        # Get the authenticated user from the request
        user = self.request.user
        user_id = getattr(user, "id", None)

        serializer.save(created_by=user_id, updated_by=user_id)

    def perform_update(self, serializer):
        """
        Override to set updated_by from the authenticated user.
        """
        # Get the authenticated user from the request
        user = self.request.user
        user_id = getattr(user, "id", None)

        serializer.save(updated_by=user_id)

    def list(self, request, *args, **kwargs):
        """
        Override list method to handle all_records flag for non-paginated response.
        """
        all_records = request.query_params.get("all_records", "false").lower() == "true"
        if all_records:
            queryset = self.filter_queryset(self.get_queryset())
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)

        return super().list(request, *args, **kwargs)


class OpportunityRolesViewSet(BaseTenantViewSet):
    """
    API endpoint that allows Opportunity Roles to be viewed or edited.
    """

    queryset = OpportunityRoles.objects.all().order_by("name")
    serializer_class = OpportunityRolesSerializer
    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status"]
    search_fields = ["name"]
    ordering_fields = ["name", "created_at"]

    def perform_create(self, serializer):
        """
        Override to set created_by from the authenticated user.
        """
        user = self.request.user
        user_id = getattr(user, "id", None)
        serializer.save(created_by=user_id, updated_by=user_id)

    def perform_update(self, serializer):
        """
        Override to set updated_by from the authenticated user.
        """
        user = self.request.user
        user_id = getattr(user, "id", None)
        serializer.save(updated_by=user_id)

    def list(self, request, *args, **kwargs):
        """
        Override list method to handle all_records flag for non-paginated response.
        """
        all_records = request.query_params.get("all_records", "false").lower() == "true"
        if all_records:
            queryset = self.filter_queryset(self.get_queryset())
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)

        return super().list(request, *args, **kwargs)


class OpportunityTeamMembersViewSet(BaseTenantViewSet):
    """
    API endpoint for managing team members associated with a specific Opportunity.
    """

    serializer_class = OpportunityTeamMembersSerializer
    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated]


class OpportunityTypesViewSet(BaseTenantViewSet):
    """
    API endpoint that allows Opportunity Types to be viewed or edited.
    """

    queryset = OpportunityTypes.objects.all().order_by("name")
    serializer_class = OpportunityTypesSerializer
    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status"]
    search_fields = ["name"]
    ordering_fields = ["name", "created_at"]

    def perform_create(self, serializer):
        """
        Override to set created_by from the authenticated user.
        """
        serializer.save(
            created_by=self.request.user.id, updated_by=self.request.user.id
        )

    def perform_update(self, serializer):
        """
        Override to set updated_by from the authenticated user.
        """
        serializer.save(updated_by=self.request.user.id)

    def list(self, request, *args, **kwargs):
        """
        Override list method to handle all_records flag for non-paginated response.
        """
        all_records = request.query_params.get("all_records", "false").lower() == "true"

        if all_records:
            # If all_records is True, return all records without pagination
            queryset = self.filter_queryset(self.get_queryset())
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)

        # Otherwise, use standard pagination
        return super().list(request, *args, **kwargs)


class OpportunityLeadSourcesViewSet(BaseTenantViewSet):
    """
    API endpoint that allows Opportunity Lead Sources to be viewed or edited.
    """

    queryset = OpportunityLeadSources.objects.all().order_by("name")
    serializer_class = OpportunityLeadSourcesSerializer
    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status"]
    search_fields = ["name"]
    ordering_fields = ["name", "created_at"]

    def perform_create(self, serializer):
        """
        Override to set created_by from the authenticated user.
        """
        serializer.save(
            created_by=self.request.user.id, updated_by=self.request.user.id
        )

    def perform_update(self, serializer):
        """
        Override to set updated_by from the authenticated user.
        """
        serializer.save(updated_by=self.request.user.id)

    def list(self, request, *args, **kwargs):
        """
        Override list method to handle all_records flag for non-paginated response.
        """
        all_records = request.query_params.get("all_records", "false").lower() == "true"

        if all_records:
            # If all_records is True, return all records without pagination
            queryset = self.filter_queryset(self.get_queryset())
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)

        # Otherwise, use standard pagination
        return super().list(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(
            created_by=self.request.user.id,
            updated_by=self.request.user.id,
        )

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user.id)
