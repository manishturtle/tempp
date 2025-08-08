from django_filters import rest_framework as filters
from order_management.models import StorePickup
from customers.models import CustomerGroupSellingChannel


class StorePickupFilter(filters.FilterSet):
    """
    FilterSet for StorePickup model that enables filtering by customer group and selling channel.

    Filters:
    - customer_group_id: Filter store pickups by customer group ID
    - selling_channel_id: Filter store pickups by selling channel ID
    """

    customer_group_id = filters.NumberFilter(
        method="filter_by_customer_group_selling_channel"
    )
    selling_channel_id = filters.NumberFilter(
        method="filter_by_customer_group_selling_channel"
    )

    class Meta:
        model = StorePickup
        fields = [
            "city",
            "state",
            "country",
            "is_active",
            "customer_group_id",
            "selling_channel_id",
        ]

    def filter_by_customer_group_selling_channel(self, queryset, name, value):
        """
        Filter store pickups based on customer group ID and selling channel ID.

        This method checks if the store pickup is associated with specific customer group and selling channel.
        When both filters are provided, only records matching both criteria are returned.

        Args:
            queryset: Base queryset of StorePickup objects
            name: Filter name ('customer_group_id' or 'selling_channel_id')
            value: Filter value (ID of customer group or selling channel)

        Returns:
            Filtered queryset
        """
        filters = self.request.query_params

        # Start with the base queryset
        filtered_queryset = queryset

        # Get filter parameters
        customer_group_id = filters.get("customer_group_id")
        selling_channel_id = filters.get("selling_channel_id")

        # Only proceed if both filters are provided
        if customer_group_id and selling_channel_id:
            # First find the CustomerGroupSellingChannel record that matches both IDs
            cgsc = CustomerGroupSellingChannel.objects.filter(
                customer_group_id=customer_group_id,
                selling_channel_id=selling_channel_id,
            ).first()

            if cgsc:
                # Then filter store pickups by the related through model
                filtered_queryset = filtered_queryset.filter(
                    customer_group_selling_channel_relationships__customer_group_selling_channel=cgsc,
                    customer_group_selling_channel_relationships__is_active=True
                )
            else:
                # If no matching CustomerGroupSellingChannel is found, return empty queryset
                return StorePickup.objects.none()

        return filtered_queryset.distinct()
