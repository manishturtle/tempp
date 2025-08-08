"""
Filters for the products app.

This module provides filter classes for filtering querysets in the products app,
using django-filter.
"""

import django_filters
from products.models import PRODUCT_TYPE_CHOICES, Product, PublicationStatus


class ProductFilter(django_filters.FilterSet):
    """
    Filter for Product model.

    Allows filtering products by various fields including product_type,
    category, publication_status, and is_active.
    """

    name = django_filters.CharFilter(lookup_expr="icontains")
    sku = django_filters.CharFilter(lookup_expr="icontains")
    description = django_filters.CharFilter(lookup_expr="icontains")
    product_type = django_filters.ChoiceFilter(choices=PRODUCT_TYPE_CHOICES.CHOICES)
    min_price = django_filters.NumberFilter(
        field_name="display_price", lookup_expr="gte"
    )
    max_price = django_filters.NumberFilter(
        field_name="display_price", lookup_expr="lte"
    )
    publication_status = django_filters.ChoiceFilter(choices=PublicationStatus.choices)
    customer_group_id = django_filters.NumberFilter(
        method="filter_by_customer_group_selling_channel"
    )
    selling_channel_id = django_filters.NumberFilter(
        method="filter_by_customer_group_selling_channel"
    )

    def filter_by_customer_group_selling_channel(self, queryset, name, value):
        # Get both parameters - they need to be used together
        customer_group_id = self.request.query_params.get("customer_group_id")
        selling_channel_id = self.request.query_params.get("selling_channel_id")

        # Only apply filter if both parameters are provided
        if customer_group_id and selling_channel_id:
            try:
                # Find the CustomerGroupSellingChannel instance
                from customers.models import CustomerGroupSellingChannel

                cgsc = CustomerGroupSellingChannel.objects.filter(
                    customer_group_id=customer_group_id,
                    selling_channel_id=selling_channel_id,
                ).first()

                if cgsc:
                    # Filter products based on visibility records related to this CGSC
                    return queryset.filter(
                        visibility_records__customer_group_selling_channel=cgsc
                    ).distinct()
            except Exception as e:
                import logging

                logger = logging.getLogger(__name__)
                logger.error(
                    f"Error filtering by customer group and selling channel: {str(e)}"
                )

        # Return unmodified queryset if any condition isn't met
        return queryset

    class Meta:
        model = Product
        fields = {
            "category": ["exact"],
            "is_active": ["exact"],
            "inventory_tracking_enabled": ["exact"],
            "backorders_allowed": ["exact"],
            "is_tax_exempt": ["exact"],
            "allow_reviews": ["exact"],
        }
