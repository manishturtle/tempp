"""
Serializers for the pricing app.

This module defines serializers for pricing-related models such as CustomerGroup,
SellingChannel, TaxRate, and TaxRateProfile.
"""
from rest_framework import serializers
from django.db.models import Q
from .models import CustomerGroup, SellingChannel, TaxRate, TaxRateProfile ,Rule, RuleCondition,RuleOutcome
from shared.models import Country
from erp_backend.base_model import TenantUser


def get_user_details(user_id):
    """
    Get user details from a user ID.
    
    Args:
        user_id: The ID of the user to get details for
        
    Returns:
        dict: A dictionary containing user details (email, phone_number, full_name)
    """
    import logging
    logger = logging.getLogger('django')
    
    logger.info(f"get_user_details called with user_id: {user_id}, type: {type(user_id)}")
    
    if not user_id:
        logger.info("user_id is None or empty, returning None")
        return None
        
    try:
        logger.info(f"Attempting to query TenantUser with id={user_id}")
        user = TenantUser.objects.get(id=user_id)
        logger.info(f"Found user: {user.email if hasattr(user, 'email') else 'No email'}")
        
        # Create a full name from first and last name
        full_name = ""
        if hasattr(user, 'first_name') and hasattr(user, 'last_name'):
            if user.first_name and user.last_name:
                full_name = f"{user.first_name} {user.last_name}"
            elif user.first_name:
                full_name = user.first_name
            elif user.last_name:
                full_name = user.last_name
        
        user_details = {
            "id": user.id,
            "email": user.email if hasattr(user, 'email') else "",
            "phone_number": user.phone_number if hasattr(user, 'phone_number') else "",
            "full_name": full_name
        }
        
        logger.info(f"Returning user details: {user_details}")
        return user_details
    except Exception as e:
        logger.error(f"Error getting user details: {str(e)}")
        # Return None if user doesn't exist or any error occurs
        return None


class UserSerializer(serializers.ModelSerializer):
    """Serializer for the TenantUser model."""
    
    # Add a custom full_name field that combines first and last name
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = TenantUser  # Use the imported TenantUser directly
        fields = ['id', 'email', 'phone_number', 'first_name', 'last_name', 'full_name']
        read_only_fields = fields
    
    def get_full_name(self, obj):
        """Combine first and last name into a full name."""
        if hasattr(obj, 'first_name') and hasattr(obj, 'last_name'):
            if obj.first_name and obj.last_name:
                return f"{obj.first_name} {obj.last_name}"
            elif obj.first_name:
                return obj.first_name
            elif obj.last_name:
                return obj.last_name
        return ""
class CustomerGroupSerializer(serializers.ModelSerializer):
    """Serializer for the CustomerGroup model."""
    
    company_id = serializers.IntegerField(read_only=True, default=1)
    client_id = serializers.IntegerField(source='client.id', read_only=True)
    created_by_id = serializers.IntegerField(source='created_by.id', read_only=True)
    updated_by_id = serializers.IntegerField(source='updated_by.id', read_only=True)
    created_by = UserSerializer(read_only=True)
    updated_by = UserSerializer(read_only=True)
    is_active = serializers.BooleanField(default=True)
    
    class Meta:
        model = CustomerGroup
        fields = [
            'id', 'name', 'code', 'description', 'is_active', 'company_id', 'client_id', 
            'created_by', 'updated_by', 'created_by_id', 'updated_by_id',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'company_id', 'client_id',
            'created_by', 'updated_by', 'created_by_id', 'updated_by_id'
        ]
    
    def validate(self, data):
        """
        Validate that the customer group name is unique for the client.
        """
        name = data.get('name')
        instance = self.instance
        
        # For now, we're using client_id=1 for all operations
        # This will be replaced with proper client handling later
        if CustomerGroup.objects.filter(client_id=1, name=name).exclude(id=instance.id if instance else None).exists():
            raise serializers.ValidationError({'name': 'A customer group with this name already exists.'})
        
        return data


class SellingChannelSerializer(serializers.ModelSerializer):
    """Serializer for the SellingChannel model."""
    
    company_id = serializers.IntegerField(read_only=True, default=1)
    client_id = serializers.IntegerField(source='client.id', read_only=True)
    created_by_id = serializers.IntegerField(source='created_by.id', read_only=True)
    updated_by_id = serializers.IntegerField(source='updated_by.id', read_only=True)
    created_by = UserSerializer(read_only=True)
    updated_by = UserSerializer(read_only=True)
    is_active = serializers.BooleanField(default=True)
    
    class Meta:
        model = SellingChannel
        fields = [
            'id', 'name', 'code', 'description', 'is_active', 'company_id', 'client_id',
            'created_by', 'updated_by', 'created_by_id', 'updated_by_id',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'company_id', 'client_id',
            'created_by', 'updated_by', 'created_by_id', 'updated_by_id'
        ]
    
    def validate(self, data):
        """
        Validate that the selling channel name is unique for the client.
        """
        name = data.get('name')
        instance = self.instance
        
        # For now, we're using client_id=1 for all operations
        # This will be replaced with proper client handling later
        if SellingChannel.objects.filter(client_id=1, name=name).exclude(id=instance.id if instance else None).exists():
            raise serializers.ValidationError({'name': 'A selling channel with this name already exists.'})
        
        return data


class TaxRateSerializer(serializers.ModelSerializer):
    """
    Serializer for the TaxRate model.
    
    Handles serialization and validation of tax rate data.
    """
    # Core fields from the model
    rate_name = serializers.CharField(max_length=50, required=True)
    tax_type_code = serializers.CharField(max_length=50, required=True)
    rate_percentage = serializers.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        required=True,
        coerce_to_string=False
    )
    effective_from = serializers.DateTimeField(required=True)
    effective_to = serializers.DateTimeField(required=False, allow_null=True)
    country_code = serializers.CharField(
        max_length=2, 
        default='IN',
        help_text="ISO 3166-1 alpha-2 country code"
    )
    is_active = serializers.BooleanField(default=True)
    
    # Base tenant model fields
    company_id = serializers.IntegerField(read_only=True)
    client_id = serializers.IntegerField(read_only=True)
    created_by = serializers.SerializerMethodField(read_only=True)
    updated_by = serializers.SerializerMethodField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    
    class Meta:
        model = TaxRate
        fields = [
            # Core fields
            'id', 'rate_name', 'tax_type_code', 'rate_percentage',
            'effective_from', 'effective_to', 'country_code', 'is_active',
            
            # Base tenant model fields
            'company_id', 'client_id', 'created_by', 'updated_by',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'company_id', 'client_id',
            'created_by', 'updated_by'
        ]
    
    def to_representation(self, instance):
        """
        Convert the instance to a dictionary representation.
        """
        ret = super().to_representation(instance)
        
        # Ensure rate_percentage is a number
        if ret['rate_percentage'] is not None:
            rate_str = str(ret['rate_percentage'])
            ret['rate_percentage'] = float(rate_str) if '.' in rate_str else int(rate_str)
        
        return ret

    def get_created_by(self, obj):
        """Return detailed information about the user who created the record."""
        if hasattr(obj, 'created_by'):
            return get_user_details(obj.created_by)
        return None

    def get_updated_by(self, obj):
        """Return detailed information about the user who last updated the record."""
        if hasattr(obj, 'updated_by'):
            return get_user_details(obj.updated_by)
        return None    
    
    def validate(self, data):
        """
        Validate the tax rate data.
        
        Ensures:
        1. effective_from is before effective_to if both are provided
        2. No duplicate tax_type_code exists for the same country and overlapping date range
        """
        effective_from = data.get('effective_from')
        effective_to = data.get('effective_to')
        
        # Validate date range
        if effective_from and effective_to and effective_from >= effective_to:
            raise serializers.ValidationError({
                'effective_to': 'Effective to date must be after effective from date.'
            })
        
        # Check for duplicate tax type codes within the same country and date range
        tax_type_code = data.get('tax_type_code')
        country_code = data.get('country_code', 'IN')
        
        if tax_type_code:
            # For updates, exclude the current instance
            instance = self.instance
            
            qs = TaxRate.objects.filter(
                tax_type_code=tax_type_code,
                country_code=country_code
            )
            
            # If we have effective dates, check for overlaps
            if effective_from:
                # Find rates where: 
                # other.start <= our.end AND other.end >= our.start
                # (standard time period overlap check)
                date_filter = Q(effective_from__lte=effective_to if effective_to else '9999-12-31') 
                if effective_to:
                    date_filter &= Q(Q(effective_to__isnull=True) | Q(effective_to__gte=effective_from))
                else:
                    date_filter &= Q(effective_to__gte=effective_from)
                    
                qs = qs.filter(date_filter)
            
            if instance and instance.pk:
                qs = qs.exclude(pk=instance.pk)
                
            if qs.exists():
                raise serializers.ValidationError({
                    'tax_type_code': 'A tax rate with this code already exists for the selected country and overlapping date range.'
                })
        
        return data

class RuleConditionSerializer(serializers.ModelSerializer):
    """Serializer for the RuleCondition model."""
    
    # Base tenant model fields
    company_id = serializers.IntegerField(read_only=True)
    client_id = serializers.IntegerField(read_only=True)
    created_by = serializers.SerializerMethodField(read_only=True)
    updated_by = serializers.SerializerMethodField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    
    class Meta:
        model = RuleCondition
        fields = [
            'id', 'rule', 'attribute_name', 'operator', 'condition_value',
            'company_id', 'client_id', 'created_by', 'updated_by',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'rule', 'created_at', 'updated_at', 'company_id', 'client_id',
            'created_by', 'updated_by'
        ]
    
    def get_created_by(self, obj):
        """Return detailed information about the user who created the record."""
        if hasattr(obj, 'created_by'):
            return get_user_details(obj.created_by)
        return None

    def get_updated_by(self, obj):
        """Return detailed information about the user who last updated the record."""
        if hasattr(obj, 'updated_by'):
            return get_user_details(obj.updated_by)
        return None


class RuleOutcomeSerializer(serializers.ModelSerializer):
    """Serializer for the RuleOutcome model."""

    company_id = serializers.IntegerField(read_only=True)
    client_id = serializers.IntegerField(read_only=True)
    created_by = serializers.SerializerMethodField(read_only=True)
    updated_by = serializers.SerializerMethodField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = RuleOutcome
        fields = [
            'id', 'rule', 'tax_rate', 'company_id', 'client_id', 'created_by', 'updated_by',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'rule', 'created_at', 'updated_at', 'company_id', 'client_id',
            'created_by', 'updated_by'
        ]

    def get_created_by(self, obj):
        """Return detailed information about the user who created the record."""
        if hasattr(obj, 'created_by'):
            return get_user_details(obj.created_by)
        return None

    def get_updated_by(self, obj):
        """Return detailed information about the user who last updated the record."""
        if hasattr(obj, 'updated_by'):
            return get_user_details(obj.updated_by)
        return None


class RuleSerializer(serializers.ModelSerializer):
    """Serializer for the Rule model."""
    
    # Base tenant model fields
    company_id = serializers.IntegerField(read_only=True)
    client_id = serializers.IntegerField(read_only=True)
    created_by = serializers.SerializerMethodField(read_only=True)
    updated_by = serializers.SerializerMethodField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    
    # Nested conditions and outcomes
    conditions = RuleConditionSerializer(many=True, required=False)
    outcomes = RuleOutcomeSerializer(many=True, required=False)
    
    class Meta:
        model = Rule
        fields = [
            'id', 'taxability_profile', 'priority', 'is_active',
            'effective_from', 'effective_to', 'conditions', 'outcomes',
            'company_id', 'client_id', 'created_by', 'updated_by',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'taxability_profile', 'created_at', 'updated_at', 'company_id', 'client_id',
            'created_by', 'updated_by'
        ]
    
    def get_created_by(self, obj):
        """Return detailed information about the user who created the record."""
        if hasattr(obj, 'created_by'):
            return get_user_details(obj.created_by)
        return None

    def get_updated_by(self, obj):
        """Return detailed information about the user who last updated the record."""
        if hasattr(obj, 'updated_by'):
            return get_user_details(obj.updated_by)
        return None

class TaxRateProfileSerializer(serializers.ModelSerializer):
    """Serializer for the TaxRateProfile model."""
    
    # Base tenant model fields
    company_id = serializers.IntegerField(read_only=True)
    client_id = serializers.IntegerField(read_only=True)
    created_by = serializers.SerializerMethodField(read_only=True)
    updated_by = serializers.SerializerMethodField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    
    # Core fields
    profile_name = serializers.CharField(max_length=255, required=True)
    description = serializers.CharField(allow_blank=True, required=False)
    country_code = serializers.CharField(
        max_length=2, 
        default='IN',
        help_text="ISO 3166-1 alpha-2 country code"
    )
    is_active = serializers.BooleanField(
        default=True,
        required=False,
        help_text="Designates whether this tax profile is active."
    )
    
    # Nested rules
    rules = RuleSerializer(many=True, required=False)

    class Meta:
        model = TaxRateProfile
        fields = [
            'id', 'profile_name', 'description', 'country_code', 'is_active',
            'company_id', 'client_id', 'created_by', 'updated_by',
            'created_at', 'updated_at', 'rules'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'company_id', 'client_id',
            'created_by', 'updated_by'
        ]
    
    def get_created_by(self, obj):
        """Return detailed information about the user who created the record."""
        if hasattr(obj, 'created_by'):
            return get_user_details(obj.created_by)
        return None

    def get_updated_by(self, obj):
        """Return detailed information about the user who last updated the record."""
        if hasattr(obj, 'updated_by'):
            return get_user_details(obj.updated_by)
        return None    
    
    def create(self, validated_data):
        """Create a new tax rate profile with nested rules, conditions, and outcomes."""
        rules_data = validated_data.pop('rules', [])
        user_id = self.context['request'].user.id if 'request' in self.context else None
        # Remove audit fields if present to avoid duplicate kwargs
        validated_data.pop('created_by', None)
        validated_data.pop('updated_by', None)
        profile = TaxRateProfile.objects.create(**validated_data, created_by=user_id, updated_by=user_id)
        for rule_data in rules_data:
            conditions_data = rule_data.pop('conditions', [])
            outcomes_data = rule_data.pop('outcomes', [])
            rule_data.pop('created_by', None)
            rule_data.pop('updated_by', None)
            rule = Rule.objects.create(taxability_profile=profile, created_by=user_id, updated_by=user_id, **rule_data)
            for condition_data in conditions_data:
                condition_data.pop('created_by', None)
                condition_data.pop('updated_by', None)
                RuleCondition.objects.create(rule=rule, created_by=user_id, updated_by=user_id, **condition_data)
            for outcome_data in outcomes_data:
                outcome_data.pop('created_by', None)
                outcome_data.pop('updated_by', None)
                RuleOutcome.objects.create(rule=rule, created_by=user_id, updated_by=user_id, **outcome_data)
        return profile
    
    def update(self, instance, validated_data):
        """Update a tax rate profile with nested rules, conditions, and outcomes.
        
        This method replaces all existing rules with the new ones provided in the payload.
        No rule IDs are expected in the payload - all rules are treated as new.
        """
        rules_data = validated_data.pop('rules', [])
        user_id = self.context['request'].user.id if 'request' in self.context else None
        
        # Update profile fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.updated_by = user_id
        instance.save()
        
        # Delete all existing rules (this will cascade to conditions and outcomes)
        instance.rules.all().delete()
        
        # Create new rules from the payload
        for rule_data in rules_data:
            conditions_data = rule_data.pop('conditions', [])
            outcomes_data = rule_data.pop('outcomes', [])
            
            # Remove any ID fields to ensure new records are created
            rule_data.pop('id', None)
            rule_data.pop('created_by', None)
            rule_data.pop('updated_by', None)
            
            # Create new rule
            rule = Rule.objects.create(
                taxability_profile=instance, 
                created_by=user_id, 
                updated_by=user_id, 
                **rule_data
            )
            
            # Create conditions for this rule
            for condition_data in conditions_data:
                # Remove any ID fields to ensure new records are created
                condition_data.pop('id', None)
                condition_data.pop('created_by', None)
                condition_data.pop('updated_by', None)
                
                RuleCondition.objects.create(
                    rule=rule, 
                    created_by=user_id, 
                    updated_by=user_id, 
                    **condition_data
                )
            
            # Create outcomes for this rule
            for outcome_data in outcomes_data:
                # Remove any ID fields to ensure new records are created
                outcome_data.pop('id', None)
                outcome_data.pop('created_by', None)
                outcome_data.pop('updated_by', None)
                
                RuleOutcome.objects.create(
                    rule=rule, 
                    created_by=user_id, 
                    updated_by=user_id, 
                    **outcome_data
                )
        
        return instance
    
    def validate(self, data):
        """
        Validate that the tax rate profile is valid.
        """
        profile_name = data.get('profile_name')
        instance = self.instance

        # For now, we're using client_id=1 for all operations
        # This will be replaced with proper client handling later
        if TaxRateProfile.objects.filter(client_id=1, profile_name=profile_name).exclude(id=instance.id if instance else None).exists():
            raise serializers.ValidationError({'profile_name': 'A tax rate profile with this name already exists.'})

        return data