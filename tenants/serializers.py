"""
Serializers for the tenants app.

This module defines serializers for tenant-related models such as TenantSetting.
"""
from rest_framework import serializers
from .models import TenantSetting


class TenantSettingSerializer(serializers.ModelSerializer):
    """Serializer for the TenantSetting model."""
    tenant_name = serializers.CharField(source='tenant.name', read_only=True)
    
    class Meta:
        model = TenantSetting
        fields = [
            'tenant', 'tenant_name', 'base_currency', 'tax_inclusive_pricing_global',
            'customer_group_pricing_enabled', 'product_reviews_enabled',
            'product_reviews_auto_approval', 'inventory_management_enabled',
            'backorders_enabled', 'sku_prefix', 'sku_include_attributes',
            'sku_format', 'created_at', 'updated_at'
        ]
        read_only_fields = ['tenant', 'tenant_name', 'created_at', 'updated_at']
