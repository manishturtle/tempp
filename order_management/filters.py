"""
Filters for Order Management API.

This module defines filter sets for Order Management models,
enabling advanced filtering capabilities in API endpoints.
"""
from django_filters import rest_framework as filters
from django.db.models import Q
import django_filters

from order_management.models import Order, OrderStatus


class AdminOrderFilter(filters.FilterSet):
    """
    Filter set for Admin Order management.
    
    Provides filtering capabilities for order listing in the Admin API,
    including filters for order_id, status, customer_id, and date ranges.
    """
    order_id = filters.CharFilter(lookup_expr='icontains')
    status = filters.MultipleChoiceFilter(choices=OrderStatus.choices)
    customer_id = filters.NumberFilter(lookup_expr='exact')
    created_at_from = filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_at_to = filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    total_amount_min = filters.NumberFilter(field_name='total_amount', lookup_expr='gte')
    total_amount_max = filters.NumberFilter(field_name='total_amount', lookup_expr='lte')
    
    class Meta:
        model = Order
        fields = ['order_id', 'status', 'customer_id', 'created_at', 'total_amount']
