from rest_framework import serializers
from .models import Division, Category, Subcategory, UnitOfMeasure, ProductStatus 
from customers.models import CustomerGroupSellingChannel
from django.core.files.base import ContentFile
import base64
import uuid
import requests
from io import BytesIO
from django.contrib.auth import get_user_model
User = get_user_model()


class CustomerGroupSellingChannelSerializer(serializers.ModelSerializer):
    """Serializer for CustomerGroupSellingChannel in Division responses."""
    class Meta:
        model = CustomerGroupSellingChannel
        fields = ['id', 'customer_group', 'selling_channel', 'status', 'segment_name']
        read_only_fields = fields


class UserSerializer(serializers.ModelSerializer):
    """Serializer for the User model, used for created_by and updated_by fields."""
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        read_only_fields = fields


class Base64ImageField(serializers.ImageField):
    """
    A custom field to handle images encoded as base64 strings or URLs.
    """
    def to_internal_value(self, data):
        if isinstance(data, str) and data.startswith('http'):
            # Handle image URL
            try:
                response = requests.get(data)
                response.raise_for_status()
                img_name = f"{uuid.uuid4()}.jpg"  # Generate a unique filename
                return ContentFile(response.content, name=img_name)
            except requests.exceptions.RequestException as e:
                raise serializers.ValidationError(f"Failed to download image from URL: {e}")
        
        # Handle base64 encoded image or regular file upload
        return super().to_internal_value(data)


class DivisionSerializer(serializers.ModelSerializer):
    """Serializer for the Division model."""
    image = Base64ImageField(required=False, allow_null=True)
    created_by = UserSerializer(read_only=True)
    updated_by = UserSerializer(read_only=True)
    customer_group_selling_channels = serializers.SerializerMethodField()
    
    def get_customer_group_selling_channels(self, obj):
        # Only return active customer group selling channels
        active_channels = obj.customer_group_selling_channels.through.objects.filter(
            division=obj,
            is_active=True
        ).select_related('customer_group_selling_channel')
        
        # Map to the CustomerGroupSellingChannel objects
        channels = [rel.customer_group_selling_channel for rel in active_channels]
        
        # Use the existing serializer to format the response
        return CustomerGroupSellingChannelSerializer(channels, many=True).data
    customer_group_selling_channel_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=CustomerGroupSellingChannel.objects.all(),
        source='customer_group_selling_channels',
        write_only=True,
        required=False
    )
    
    def update(self, instance, validated_data):
        # Handle customer_group_selling_channels separately
        if 'customer_group_selling_channels' in validated_data:
            new_channels = validated_data.pop('customer_group_selling_channels')
            new_channel_ids = {channel.id for channel in new_channels}
            
            # Get existing channel relationships
            existing_relationships = instance.customer_group_selling_channels.through.objects.filter(
                division=instance
            )
            
            # Update existing relationships
            for rel in existing_relationships:
                if rel.customer_group_selling_channel_id in new_channel_ids:
                    # If channel is in new set, ensure it's active
                    if not rel.is_active:
                        rel.is_active = True
                        rel.save(update_fields=['is_active', 'updated_at'])
                else:
                    # If channel is not in new set, mark as inactive
                    if rel.is_active:
                        rel.is_active = False
                        rel.save(update_fields=['is_active', 'updated_at'])
            
            # Add any new relationships
            existing_channel_ids = {rel.customer_group_selling_channel_id for rel in existing_relationships}
            for channel in new_channels:
                if channel.id not in existing_channel_ids:
                    instance.customer_group_selling_channels.through.objects.create(
                        division=instance,
                        customer_group_selling_channel=channel,
                        is_active=True
                    )
        
        # Update other fields
        return super().update(instance, validated_data)
    
    class Meta:
        model = Division
        fields = [
            'id', 'company_id', 'name', 'description', 'image', 'image_alt_text', 
            'is_active', 'created_at', 'updated_at', 'created_by', 'updated_by',
            'customer_group_selling_channels', 'customer_group_selling_channel_ids'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by', 'updated_by', 'company_id']
    
    def validate_name(self, value):
        """
        Check that the division name is unique for the client.
        """
        from tenants.models import Tenant
        # Get or create a default client for development purposes
        default_client, _ = Tenant.objects.get_or_create(
            schema_name='public',
            defaults={
                'name': 'Default Client',
                'client_id': 1
            }
        )
        
        # Check if a division with this name already exists for this client
        if Division.objects.filter(client_id=default_client.client_id, name=value).exists():
            if self.instance and self.instance.name == value:
                # If we're updating and the name hasn't changed, it's valid
                return value
            raise serializers.ValidationError(f"A division with the name '{value}' already exists.")
        return value


class CategorySerializer(serializers.ModelSerializer):
    """Serializer for the Category model."""
    division_name = serializers.CharField(source='division.name', read_only=True)
    default_tax_rate_profile_name = serializers.CharField(source='default_tax_rate_profile.name', read_only=True)
    image = Base64ImageField(required=False, allow_null=True)
    created_by = UserSerializer(read_only=True)
    updated_by = UserSerializer(read_only=True)
    customer_group_selling_channels = CustomerGroupSellingChannelSerializer(
        many=True,
        read_only=True
    )
    customer_group_selling_channel_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=CustomerGroupSellingChannel.objects.all(),
        source='customer_group_selling_channels',
        write_only=True,
        required=False
    )
    
    class TaxRateProfileRelatedField(serializers.PrimaryKeyRelatedField):
        """Custom PrimaryKeyRelatedField that gets its queryset from context."""
        def get_queryset(self):
            return self.context.get('default_tax_rate_profile_queryset')
    
    default_tax_rate_profile = TaxRateProfileRelatedField(
        required=True,
        allow_null=False,
        error_messages={
            'required': 'Default tax rate profile is required for all categories',
            'null': 'Default tax rate profile cannot be null, please select a valid tax rate profile'
        },
        help_text='Default tax rate profile for products in this category'
    )
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
    
    class Meta:
        model = Category
        fields = [
            'id', 'company_id', 'division', 'division_name', 'name', 'description', 
            'image', 'image_alt_text', 'default_tax_rate_profile', 'default_tax_rate_profile_name',
            'tax_inclusive', 'is_active', 'sort_order', 'created_at', 'updated_at',
            'created_by', 'updated_by', 'customer_group_selling_channels', 'customer_group_selling_channel_ids'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by', 'updated_by', 'company_id']
        extra_kwargs = {
            'division': {'required': True},
            'default_tax_rate_profile': {'required': True}
        }
    
    def validate(self, data):
        """
        Check that the category name is unique for the client and division.
        """
        from tenants.models import Tenant
        # Get or create a default client for development purposes
        default_client, _ = Tenant.objects.get_or_create(
            schema_name='public',
            defaults={
                'name': 'Default Client',
                'client_id': 1
            }
        )
        
        # Get the division from the data
        division = data.get('division')
        name = data.get('name')
        
        if division and name:
            # Check if a category with this name already exists for this client and division
            if Category.objects.filter(client_id=default_client.client_id, division=division, name=name).exists():
                if self.instance and self.instance.name == name and self.instance.division == division:
                    # If we're updating and the name and division haven't changed, it's valid
                    return data
                raise serializers.ValidationError(
                    {"name": f"A category with the name '{name}' already exists in this division."}
                )
        return data


class SubcategorySerializer(serializers.ModelSerializer):
    """Serializer for the Subcategory model."""
    category_name = serializers.CharField(source='category.name', read_only=True)
    division_name = serializers.CharField(source='category.division.name', read_only=True)
    image = Base64ImageField(required=False, allow_null=True)
    created_by = UserSerializer(read_only=True)
    updated_by = UserSerializer(read_only=True)
    customer_group_selling_channels = CustomerGroupSellingChannelSerializer(
        many=True,
        read_only=True
    )
    customer_group_selling_channel_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=CustomerGroupSellingChannel.objects.all(),
        source='customer_group_selling_channels',
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Subcategory
        fields = [
            'id', 'company_id', 'category', 'category_name', 'division_name', 'name', 
            'description', 'image', 'image_alt_text', 'workflow_flow_id', 'is_active', 
            'sort_order', 'created_at', 'updated_at', 'created_by', 'updated_by',
            'customer_group_selling_channels', 'customer_group_selling_channel_ids'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by', 'updated_by', 'company_id']
    
    def validate(self, data):
        """
        Check that the subcategory name is unique for the client and category.
        """
        from tenants.models import Tenant
        # Get or create a default client for development purposes
        default_client, _ = Tenant.objects.get_or_create(
            schema_name='public',
            defaults={
                'name': 'Default Client',
                'client_id': 1
            }
        )
        
        # Get the category from the data
        category = data.get('category')
        name = data.get('name')
        
        if category and name:
            # Check if a subcategory with this name already exists for this client and category
            if Subcategory.objects.filter(client_id=default_client.client_id, category=category, name=name).exists():
                if self.instance and self.instance.name == name and self.instance.category == category:
                    # If we're updating and the name and category haven't changed, it's valid
                    return data
                raise serializers.ValidationError(
                    {"name": f"A subcategory with the name '{name}' already exists in this category."}
                )
        return data


class UnitOfMeasureSerializer(serializers.ModelSerializer):
    """Serializer for the UnitOfMeasure model."""
    type_display = serializers.CharField(source='get_unit_type_display', read_only=True)
    created_by = UserSerializer(read_only=True)
    updated_by = UserSerializer(read_only=True)
    
    class Meta:
        model = UnitOfMeasure
        fields = [
            'id', 'company_id', 'name', 'symbol', 'description', 'unit_type', 'type_display', 
            'associated_value', 'is_active', 'created_at', 'updated_at', 'created_by', 'updated_by'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by', 'updated_by', 'company_id']
    
    def validate_symbol(self, value):
        """
        Check that the UOM symbol is unique for the client and follows the required format.
        """
        from tenants.models import Tenant
        # Get or create a default client for development purposes
        default_client, _ = Tenant.objects.get_or_create(
            schema_name='public',
            defaults={
                'name': 'Default Client',
                'client_id': 1
            }
        )
        
        # Check if a UOM with this symbol already exists for this client
        if UnitOfMeasure.objects.filter(client_id=default_client.client_id, symbol=value).exists():
            if self.instance and self.instance.symbol == value:
                # If we're updating and the symbol hasn't changed, it's valid
                return value
            raise serializers.ValidationError(f"A unit of measure with the symbol '{value}' already exists.")
        
        # Check that the symbol follows the required format (1-10 alphanumeric characters)
        import re
        if not re.match(r'^[a-zA-Z0-9]{1,10}$', value):
            raise serializers.ValidationError(
                "Symbol must be 1-10 alphanumeric characters (letters and numbers only)."
            )
        
        return value
    
    def validate_name(self, value):
        """
        Check that the UOM name is unique for the client.
        """
        from tenants.models import Tenant
        # Get or create a default client for development purposes
        default_client, _ = Tenant.objects.get_or_create(
            schema_name='public',
            defaults={
                'name': 'Default Client',
                'client_id': 1
            }
        )
        
        # Check if a UOM with this name already exists for this client
        if UnitOfMeasure.objects.filter(client_id=default_client.client_id, name=value).exists():
            if self.instance and self.instance.name == value:
                # If we're updating and the name hasn't changed, it's valid
                return value
            raise serializers.ValidationError(f"A unit of measure with the name '{value}' already exists.")
        return value
    
    def validate(self, data):
        """
        Validate the associated_value based on the unit_type.
        """
        unit_type = data.get('unit_type')
        associated_value = data.get('associated_value')
        
        if unit_type and associated_value is not None:
            if unit_type == 'COUNTABLE' and associated_value % 1 != 0:
                raise serializers.ValidationError({
                    'associated_value': 'For Countable units, the associated value must be a whole number.'
                })
        
        return data


class ProductStatusSerializer(serializers.ModelSerializer):
    """Serializer for the ProductStatus model."""
    created_by = UserSerializer(read_only=True)
    updated_by = UserSerializer(read_only=True)
    
    class Meta:
        model = ProductStatus
        fields = [
            'id', 'company_id', 'name', 'description', 'is_active', 'is_orderable', 
            'created_at', 'updated_at', 'created_by', 'updated_by'
        ]
        read_only_fields = ['created_at', 'updated_at', 'created_by', 'updated_by', 'company_id']
    
    def validate_name(self, value):
        """
        Check that the product status name is unique for the client.
        """
        from tenants.models import Tenant
        # Get or create a default client for development purposes
        default_client, _ = Tenant.objects.get_or_create(
            schema_name='public',
            defaults={
                'name': 'Default Client',
                'client_id': 1
            }
        )
        
        # Check if a product status with this name already exists for this client
        if ProductStatus.objects.filter(client_id=default_client.client_id, name=value).exists():
            if self.instance and self.instance.name == value:
                # If we're updating and the name hasn't changed, it's valid
                return value
            raise serializers.ValidationError(f"A product status with the name '{value}' already exists.")
        return value
