"""
Serializers for the onboarding app.
"""

from rest_framework import serializers
from onboarding.seeders.main_seeder import INDUSTRY_DATA_MAP
from order_management.models import TenantConfiguration

class OnboardingTriggerSerializer(serializers.Serializer):
    """
    Serializer for the onboarding trigger endpoint.
    """
    industry = serializers.ChoiceField(
        choices=['fashion', 'electronics', 'food_and_beverage', 'home_goods', 'health_and_beauty']
    )
    region = serializers.ChoiceField(
        choices=['us', 'uk', 'eu', 'in', 'au', 'ae']
    )

    def validate_industry(self, value):
        """
        Validates that the industry is one of the supported ones from our INDUSTRY_DATA_MAP.
        """
        supported_industries = list(INDUSTRY_DATA_MAP.keys())
        if value.lower() not in supported_industries:
            raise serializers.ValidationError(
                f"Industry '{value}' is not supported. Must be one of: {', '.join(supported_industries)}"
            )
        return value.lower()

    def validate_region(self, value):
        """
        Validates the region format and ensures it's a known region code.
        """
        # Add your supported regions here
        supported_regions = ['us', 'uk', 'eu', 'in', 'au', 'ae']
        if value.lower() not in supported_regions:
            raise serializers.ValidationError(
                f"Region '{value}' is not supported. Must be one of: {', '.join(supported_regions)}"
            )
        return value.lower()


class TenantConfigurationStatusSerializer(serializers.ModelSerializer):
    """
    Serializer for the tenant configuration status endpoint.
    Only exposes the is_onboarding_completed field for the onboarding flow.
    """
    class Meta:
        model = TenantConfiguration
        fields = ['id', 'tenant_ref', 'is_onboarding_completed']
        read_only_fields = ['id', 'tenant_ref']
