"""
Views for the pricing app.

This module defines ViewSets for pricing-related models such as CustomerGroup,
SellingChannel, TaxRate, and TaxRateProfile.
"""

from rest_framework.permissions import IsAuthenticated
from rest_framework import filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.response import Response
from core.viewsets import TenantModelViewSet
from .models import CustomerGroup, SellingChannel, TaxRate, TaxRateProfile
from .serializers import (
    CustomerGroupSerializer,
    SellingChannelSerializer,
    TaxRateSerializer,
    TaxRateProfileSerializer,
)
from django.contrib.auth.models import User
from erp_backend.middleware import CustomJWTAuthentication


class CustomerGroupViewSet(TenantModelViewSet):
    """
    ViewSet for managing customer groups.

    Provides CRUD operations for customer groups.
    """

    serializer_class = CustomerGroupSerializer
    queryset = CustomerGroup.objects.all()
    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Override to ensure customer groups are ordered by ID in ascending order.
        """
        queryset = super().get_queryset()
        return queryset.order_by("id")


class SellingChannelViewSet(TenantModelViewSet):
    """
    ViewSet for managing selling channels.

    Provides CRUD operations for selling channels.
    """

    serializer_class = SellingChannelSerializer
    queryset = SellingChannel.objects.all().order_by("id")
    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [
        filters.SearchFilter,
        filters.OrderingFilter,
        DjangoFilterBackend,
    ]
    filterset_fields = ["is_active"]
    search_fields = ["name"]
    ordering_fields = ["name", "created_at", "id"]

    def list(self, request, *args, **kwargs):
        """
        List all selling channels with pagination and counts.

        Query Parameters:
            paginated (bool): If false, returns a simple array without pagination. Default is true.
        """
        # Get the base queryset without any filters
        base_queryset = super().get_queryset()

        # Apply filters for the actual data
        queryset = self.filter_queryset(self.get_queryset())

        # Check if simple array response is requested
        if request.query_params.get("paginated", "true").lower() == "false":
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)

        # Default behavior with pagination and counts
        counts = {
            "active": base_queryset.filter(is_active=True).count(),
            "inactive": base_queryset.filter(is_active=False).count(),
            "total": base_queryset.count(),
        }

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response = self.get_paginated_response(serializer.data)
            response.data["counts"] = counts
            response.data["filtered_count"] = len(serializer.data)
            return response

        serializer = self.get_serializer(queryset, many=True)
        return Response(
            {
                "count": len(serializer.data),
                "results": serializer.data,
                "counts": counts,
                "filtered_count": len(serializer.data),
            }
        )


class TaxRateViewSet(TenantModelViewSet):
    """
    ViewSet for managing tax rates.

    Provides CRUD operations for tax rates with support for filtering,
    searching, and ordering by the new model fields.
    """

    serializer_class = TaxRateSerializer
    queryset = TaxRate.objects.all().order_by("id")
    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [
        filters.SearchFilter,
        filters.OrderingFilter,
        DjangoFilterBackend,
    ]
    filterset_fields = {
        "is_active": ["exact"],
        "country_code": ["exact"],
        "tax_type_code": ["exact", "icontains"],
        "effective_from": ["gte", "lte", "exact", "gt", "lt"],
        "effective_to": ["gte", "lte", "exact", "gt", "lt", "isnull"],
    }
    search_fields = ["rate_name", "tax_type_code"]
    ordering_fields = [
        "rate_name",
        "tax_type_code",
        "rate_percentage",
        "effective_from",
        "effective_to",
        "country_code",
        "is_active",
        "created_at",
        "updated_at",
        "id",
    ]

    def list(self, request, *args, **kwargs):
        """
        List all tax rates with pagination and counts.

        Query Parameters:
            paginate (bool): If false, returns all records without pagination. Default is true.
        """
        # Get the base queryset without any filters
        base_queryset = super().get_queryset()

        # Apply filters for the actual data
        queryset = self.filter_queryset(self.get_queryset())

        # Get counts from the base queryset (unfiltered)
        counts = {
            "active": base_queryset.filter(is_active=True).count(),
            "inactive": base_queryset.filter(is_active=False).count(),
            "total": base_queryset.count(),
        }

        # Check if unpaginated response is requested
        if request.query_params.get("paginate", "true").lower() == "false":
            serializer = self.get_serializer(queryset, many=True)
            return Response(
                {
                    "count": len(serializer.data),
                    "results": serializer.data,
                    "counts": counts,
                    "filtered_count": len(serializer.data),
                }
            )

        # Apply pagination for paginated responses
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response = self.get_paginated_response(serializer.data)
            response.data["counts"] = counts
            response.data["filtered_count"] = len(serializer.data)
            return response

        serializer = self.get_serializer(queryset, many=True)
        return Response(
            {
                "count": len(serializer.data),
                "results": serializer.data,
                "counts": counts,
                "filtered_count": len(serializer.data),
            }
        )

    def perform_create(self, serializer):
        """
        Create a new tax rate with proper defaults and audit fields.
        Reuses deleted record IDs when possible.
        """
        # Get the current user ID from the request
        user = self.request.user
        user_id = user.id if user and hasattr(user, "id") else None

        # Find the lowest available ID
        all_ids = set(TaxRate.objects.values_list("id", flat=True))
        next_id = 1
        while next_id in all_ids:
            next_id += 1

        # Try to find a gap in the IDs (deleted records)
        for i in range(1, next_id):
            if i not in all_ids:
                next_id = i
                break

        # Prepare the data with proper defaults
        data = {
            "id": next_id,  # Use the found ID
            "is_active": True,  # Default to active
            "created_by": user_id,
            "updated_by": user_id,
            "client_id": 1,  # Will be overridden by middleware
            "company_id": 1,  # Will be overridden by middleware
        }

        # Save the instance with the prepared data
        serializer.save(**data)

    def perform_update(self, serializer):
        """
        Update a tax rate and set the updated_by field.
        """
        # Get the current user ID from the request
        user = self.request.user
        user_id = user.id if user and hasattr(user, "id") else None

        # Save with the user ID
        serializer.save(updated_by=user_id)


class TaxRateProfileViewSet(TenantModelViewSet):
    """
    ViewSet for managing tax rate profiles.

    Provides CRUD operations for tax rate profiles.
    """

    serializer_class = TaxRateProfileSerializer
    queryset = TaxRateProfile.objects.all().order_by("id")
    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [
        filters.SearchFilter,
        filters.OrderingFilter,
        DjangoFilterBackend,
    ]
    filterset_fields = ["is_active"]
    search_fields = ["profile_name", "description"]
    ordering_fields = ["profile_name", "created_at", "id", "country_code"]

    def list(self, request, *args, **kwargs):
        """
        List all tax rate profiles with pagination and counts.
        """
        # Get the base queryset without any filters
        base_queryset = super().get_queryset()

        # Apply filters for the actual data
        queryset = self.filter_queryset(self.get_queryset())

        # Get counts from the base queryset (unfiltered)
        counts = {
            "active": base_queryset.filter(is_active=True).count(),
            "inactive": base_queryset.filter(is_active=False).count(),
            "total": base_queryset.count(),
        }

        # Apply pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response = self.get_paginated_response(serializer.data)
            response.data["counts"] = counts
            response.data["filtered_count"] = len(serializer.data)
            return response

        serializer = self.get_serializer(queryset, many=True)
        return Response(
            {
                "count": len(serializer.data),
                "results": serializer.data,
                "counts": counts,
                "filtered_count": len(serializer.data),
            }
        )

    def perform_create(self, serializer):
        """
        Override to ensure new tax rate profiles reuse deleted IDs.
        Finds the lowest available ID to reuse deleted IDs.
        """
        # Get the current user ID from the request
        user = self.request.user
        user_id = user.id if user and hasattr(user, "id") else None

        # Find the lowest available ID
        all_ids = set(TaxRateProfile.objects.values_list("id", flat=True))
        next_id = 1
        while next_id in all_ids:
            next_id += 1

        # Try to find a gap in the IDs (deleted records)
        for i in range(1, next_id):
            if i not in all_ids:
                next_id = i
                break

        # Save with the found ID and other required fields
        serializer.save(
            id=next_id,  # Set the ID explicitly
            client_id=1,  # Will be overridden by middleware
            company_id=1,  # Will be overridden by middleware
            created_by=user_id,
            updated_by=user_id,
        )

    def perform_update(self, serializer):
        """
        Update a tax rate profile and set the updated_by field.
        """
        # Get the current user ID from the request
        user = self.request.user
        user_id = user.id if user and hasattr(user, "id") else None

        # Save with the user ID
        serializer.save(updated_by=user_id)
