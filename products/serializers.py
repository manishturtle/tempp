from django.db import transaction
from django.core.exceptions import ValidationError
from rest_framework import serializers
from django.contrib.auth import get_user_model
import logging

from customers.models import CustomerGroupSellingChannel
from customers.serializers import CustomerGroupSellingChannelSerializer

from products.models import (
    Product, ProductVariant, ProductImage, 
    ProductAttributeValue, PRODUCT_TYPE_CHOICES,
    KitComponent, ProductAttributeMultiValue,
    PublicationStatus, ProductZoneRestriction
)
from pricing.models import TaxRateProfile
from products.catalogue.models import (
    Category, Subcategory, Division,
    UnitOfMeasure, ProductStatus
)
from attributes.models import Attribute, AttributeOption, AttributeGroup
from products.utils import link_temporary_images, generate_unique_sku
from shared.models import Currency

User = get_user_model()
logger = logging.getLogger(__name__)

class SimpleCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'image', 'image_alt_text']

class SimpleSubcategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Subcategory
        fields = ['id', 'category', 'name', 'description', 'image', 'image_alt_text']

class SimpleDivisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Division
        fields = ['id', 'name', 'description', 'image', 'image_alt_text']

class SimpleUOMSerializer(serializers.ModelSerializer):
    class Meta:
        model = UnitOfMeasure
        fields = ['name', 'symbol', 'description']

class SimpleProductStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductStatus
        fields = ['name', 'description']

class SimpleUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']


class ProductImageSerializer(serializers.ModelSerializer):
    """
    Serializer for the ProductImage model.
    
    This serializer handles validation and conversion between Python objects and
    JSON for the ProductImage model, supporting all CRUD operations.
    """
    # Read-only fields
    client_id = serializers.IntegerField(read_only=True)
    company_id = serializers.IntegerField(read_only=True)
    product = serializers.PrimaryKeyRelatedField(read_only=True)
    
    class Meta:
        model = ProductImage
        fields = [
            'id',
            'client_id',
            'company_id',
            'product',
            'image',
            'alt_text',
            'sort_order',
            'is_default',
            'created_at',
            'updated_at'
        ]


class ProductAttributeValueSerializer(serializers.ModelSerializer):
    """
    Serializer for the ProductAttributeValue model.
    
    This serializer is read-only and provides a representation of attribute values
    for a product, handling different data types appropriately.
    """
    # Read-only fields
    client_id = serializers.IntegerField(read_only=True)
    company_id = serializers.IntegerField(read_only=True)
    product = serializers.PrimaryKeyRelatedField(read_only=True)
    
    # Related fields
    attribute_name = serializers.CharField(source='attribute.name', read_only=True)
    attribute_code = serializers.CharField(source='attribute.code', read_only=True)
    attribute_type = serializers.CharField(source='attribute.data_type', read_only=True)
    
    # Value representation
    value = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductAttributeValue
        fields = [
            'id',
            'client_id',
            'company_id',
            'product',
            'attribute',
            'attribute_name',
            'attribute_code',
            'attribute_type',
            'value',
            'value_text',
            'value_number',
            'value_boolean',
            'value_date',
            'value_option',
            'created_at',
            'updated_at'
        ]
        read_only_fields = fields
    
    def get_value(self, obj):
        """
        Get the appropriate value based on the attribute's data type.
        
        Args:
            obj (ProductAttributeValue): The attribute value object
            
        Returns:
            The value in the appropriate format based on the attribute's data type
        """
        if not obj.attribute:
            return None
            
        data_type = obj.attribute.data_type
        
        if data_type == Attribute.AttributeDataType.TEXT:
            return obj.value_text
        elif data_type == Attribute.AttributeDataType.NUMBER:
            return obj.value_number
        elif data_type == Attribute.AttributeDataType.BOOLEAN:
            return obj.value_boolean
        elif data_type == Attribute.AttributeDataType.DATE:
            return obj.value_date
        elif data_type == Attribute.AttributeDataType.SELECT:
            if obj.value_option:
                return {
                    'id': obj.value_option.id,
                    'label': obj.value_option.option_label,
                    'value': obj.value_option.option_value
                }
            return None
        elif data_type == Attribute.AttributeDataType.MULTI_SELECT:
            # Get all multi-values for this attribute value
            multi_values = obj.multi_values.all()
            return [
                {
                    'id': mv.attribute_option.id,
                    'label': mv.attribute_option.option_label,
                    'value': mv.attribute_option.option_value
                } for mv in multi_values
            ]
        return None

class ProductZoneRestrictionSerializer(serializers.ModelSerializer):
    """
    Serializer for the ProductZoneRestriction model.
    
    Handles validation and conversion between Python objects and JSON for the
    ProductZoneRestriction model, supporting zone restriction operations.
    """
    class Meta:
        model = ProductZoneRestriction
        fields = ['id', 'product', 'zone', 'restriction_mode']
        read_only_fields = ['id']


class ProductSerializer(serializers.ModelSerializer):
    # Zone restriction fields
    zone_restrictions = ProductZoneRestrictionSerializer(many=True, read_only=True)
    zone_restrictions_input = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        write_only=True,
        help_text='List of zone restrictions: [{"zone": zone_id, "restriction_mode": "INCLUDE" or "EXCLUDE"}, ...]'
    )
    
    # Nested serializers for related fields
    category_details = SimpleCategorySerializer(source='category', read_only=True)
    subcategory_details = SimpleSubcategorySerializer(source='subcategory', read_only=True)
    division_details = SimpleDivisionSerializer(source='division', read_only=True)
    uom_details = SimpleUOMSerializer(source='uom', read_only=True)
    productstatus_details = SimpleProductStatusSerializer(source='productstatus', read_only=True)
    created_by_details = SimpleUserSerializer(source='created_by', read_only=True)
    updated_by_details = SimpleUserSerializer(source='updated_by', read_only=True)
    # Product variants - will be populated when variant_defining_attributes exist
    variants = serializers.SerializerMethodField(read_only=True)
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
    
    # Add explicit field for default_tax_rate_profile
    default_tax_rate_profile = serializers.PrimaryKeyRelatedField(
        queryset=TaxRateProfile.objects.all(),
        required=False,
        allow_null=True,
        error_messages={
            'does_not_exist': 'Tax rate profile with id {pk_value} does not exist.',
            'incorrect_type': 'Tax rate profile must be a number.'
        }
    )
    
    def validate_default_tax_rate_profile(self, value):
        """
        Validate the default_tax_rate_profile field.
        """
        logger.info(f"Validating default_tax_rate_profile: {value}")
        return value
    
    def to_internal_value(self, data):
        # Add debug logging to see what fields are coming from the request
        logger = logging.getLogger(__name__)
        logger.info(f"Incoming data fields: {list(data.keys())}")
        
        # Handle uom_id and map it to uom
        if 'uom_id' in data and 'uom' not in data:
            data = data.copy()  # Make a mutable copy
            logger.info(f"Converting uom_id: {data['uom_id']} to uom field")
            data['uom'] = data.pop('uom_id')
            
        logger.info(f"ProductSerializer.to_internal_value received: {data}")
        
        # Handle subcategory=0 or empty string as null
        if 'subcategory' in data:
            if data['subcategory'] in [0, '0', '', None]:
                data['subcategory'] = None
                logger.info("Setting subcategory to None")
        
        if 'default_tax_rate_profile' in data:
            logger.info(f"default_tax_rate_profile value: {data['default_tax_rate_profile']}")
        
        return super().to_internal_value(data)
    """
    Serializer for the Product model.
    
    This serializer handles validation and conversion between Python objects and
    JSON for the Product model, supporting all CRUD operations including related
    images and attribute values.
    """
    # Tenant fields with defaults
    client_id = serializers.IntegerField(default=1)
    company_id = serializers.IntegerField(default=1)
    slug = serializers.SlugField(required=False)
    
    
    # Nested serializers for related objects
    images = ProductImageSerializer(many=True, read_only=True)
    attribute_values = ProductAttributeValueSerializer(many=True, read_only=True)
    # Simplified nested serializers
    category_details = SimpleCategorySerializer(source='category', read_only=True)
    subcategory_details = SimpleSubcategorySerializer(source='subcategory', read_only=True)
    
    division_details = SimpleDivisionSerializer(source='division', read_only=True)
    uom_details = SimpleUOMSerializer(source='uom', read_only=True)
    productstatus_details = SimpleProductStatusSerializer(source='productstatus', read_only=True)
    created_by_details = SimpleUserSerializer(source='created_by', read_only=True)
    updated_by_details = SimpleUserSerializer(source='updated_by', read_only=True)
    
    # Handle currency_code as string input
    currency_code = serializers.SlugRelatedField(
        queryset=Currency.objects.all(),
        slug_field='code',
        required=False,
        allow_null=True
    )
    
    # Write-only field for attribute values input
    attribute_values_input = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        write_only=True
    )
    
    # Publication status field
    publication_status = serializers.ChoiceField(
        choices=PublicationStatus.choices,
        required=False,
        default=PublicationStatus.DRAFT
    )
    
    # Variant defining attributes field
    variant_defining_attributes = serializers.PrimaryKeyRelatedField(
        queryset=Attribute.objects.filter(use_for_variants=True),
        many=True,
        required=False
    )
    
    # Temporary images field
    temp_images = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False,
        help_text='List of temp image objects: [{"id": temp_uuid, "alt_text": "...", "sort_order": 0, "is_default": false}, ...]'
    )
    
    # M2M fields
    attribute_groups = serializers.PrimaryKeyRelatedField(
        queryset=AttributeGroup.objects.all(),
        many=True,
        required=False
    )
    
    # New boolean flags
    is_serialized = serializers.BooleanField(required=False, default=False)
    is_lotted = serializers.BooleanField(required=False, default=False)
    
    class Meta:
        model = Product
        fields = [
            'id',
            'client_id',
            'company_id',
            'product_type',
            'name',
            'slug',
            'sku',
            'description',
            'short_description',
            # Category and classification fields
            'category',
            'category_details',
            'subcategory',
            'subcategory_details',
            'division',
            'division_details',
            'uom',
            'uom_details',
            'productstatus',
            'productstatus_details',
            # Pricing and tax fields
            'currency_code',
            'default_tax_rate_profile',
            'is_tax_exempt',
            'display_price',
            'compare_at_price',
            # Inventory and product management flags
            'is_active',
            'allow_reviews',
            'inventory_tracking_enabled',
            'backorders_allowed',
            'quantity_on_hand',
            'is_serialized',
            'is_lotted',
            'pre_order_available',
            'pre_order_date',
            # Publication status and variant attributes
            'publication_status',
            'attribute_groups',
            'variant_defining_attributes',
            'variants',
            # SEO fields
            'seo_title',
            'seo_description',
            'seo_keywords',
            # Additional metadata
            'tags',
            'faqs',
            'key_features',
            # Related objects
            'images',
            'attribute_values',
            'attribute_values_input',
            'temp_images',
            # Audit fields
            'created_at',
            'updated_at',
            'created_by',
            'created_by_details',
            'updated_by',
            'updated_by_details',
            'workflow_flow_id',
            # Customer group selling channels
            'customer_group_selling_channels',
            'customer_group_selling_channel_ids',
            # Zone restrictions
            'zone_restrictions',
            'zone_restrictions_input',
            'low_stock_count',
            'min_count',
            'max_count',
            'cost_price',
            'active_from_date',
            'active_to_date'
        ]
        read_only_fields = [
            'slug', 
            'images',
            'created_at', 
            'updated_at', 
            'created_by', 
            'updated_by'
        ]

    def get_variants(self, obj):
        """
        Get all variants associated with this product if variant_defining_attributes exist.
        
        Returns full variant details including images and options.
        """
        if obj.variant_defining_attributes.exists():
            variants = ProductVariant.objects.filter(
                product=obj
            ).select_related(
                'product'
            ).prefetch_related(
                'options',
                'images'
            )
            
            return ProductVariantSerializer(variants, many=True, context=self.context).data
        return []
        
    def validate_category(self, value):
        """
        Validate that the category belongs to the same client.
        """
        if not value:
            return value
            
        request = self.context.get('request')
        if request and hasattr(request, 'client_id'):
            if value.client_id != request.client_id:
                raise serializers.ValidationError("Category does not belong to the current client.")
        return value
        
    def validate_subcategory(self, value):
        """
        Validate that the subcategory belongs to the same client.
        """
        if not value:
            return value
            
        request = self.context.get('request')
        if request and hasattr(request, 'client_id'):
            if value.client_id != request.client_id:
                raise serializers.ValidationError("Subcategory does not belong to the current client.")
        return value
        
    def validate_division(self, value):
        """
        Validate that the division belongs to the same client.
        """
        if not value:
            return value
            
        request = self.context.get('request')
        if request and hasattr(request, 'client_id'):
            if value.client_id != request.client_id:
                raise serializers.ValidationError("Division does not belong to the current client.")
        return value
        
    def validate_uom(self, value):
        """
        Validate that the unit of measure belongs to the same client.
        """
        if not value:
            return value
            
        request = self.context.get('request')
        if request and hasattr(request, 'client_id'):
            if value.client_id != request.client_id:
                raise serializers.ValidationError("Unit of Measure does not belong to the current client.")
        return value
        
    def validate_productstatus(self, value):
        """
        Validate that the product status belongs to the same client.
        """
        if not value:
            return value
            
        request = self.context.get('request')
        if request and hasattr(request, 'client_id'):
            if value.client_id != request.client_id:
                raise serializers.ValidationError("Product Status does not belong to the current client.")
        return value
        
    def validate_currency(self, value):
        """
        Validate that the currency belongs to the same client.
        """
        if not value:
            return value
            
        request = self.context.get('request')
        if request and hasattr(request, 'client_id'):
            if hasattr(value, 'client_id') and value.client_id != request.client_id:
                raise serializers.ValidationError("Currency does not belong to the current client.")
        return value
    
    def validate_attribute_groups(self, value):
        """
        Validate that the attribute groups belong to the same tenant.
        """
        request = self.context.get('request')
        if request and hasattr(request, 'client_id'):
            client_id = request.client_id
            invalid_groups = [
                group for group in value 
                if group.client_id != client_id
            ]
            if invalid_groups:
                raise serializers.ValidationError(
                    f"Attribute groups {', '.join(str(g.id) for g in invalid_groups)} "
                    f"do not belong to the current tenant."
                )
        return value

    def validate_variant_defining_attributes(self, value):
        """
        Validate that the variant defining attributes belong to the same tenant
        and are marked for variant use.
        """
        request = self.context.get('request')
        if request and hasattr(request, 'client_id'):
            client_id = request.client_id
            invalid_attrs = [
                attr for attr in value 
                if attr.client_id != client_id or not attr.use_for_variants
            ]
            if invalid_attrs:
                raise serializers.ValidationError(
                    f"Attributes {', '.join(str(a.id) for a in invalid_attrs)} "
                    f"are either not from the current tenant or not marked for variant use."
                )
        return value
    
    def validate_attribute_values_input(self, value):
        """
        Validate attribute values input:
        1. Attribute exists
        2. Value matches the attribute's data type
        3. For SELECT/MULTI_SELECT, options exist and belong to the attribute
        """
        if not value:
            return value
            
        # Get client ID from context
        request = self.context.get('request')
        client_id = self.context.get('client_id') or getattr(request, 'client_id', 1) if request else 1
        
        for item in value:
            # Check if attribute exists
            attribute_id = item.get('attribute')
            if not attribute_id:
                raise serializers.ValidationError("Attribute ID is required.")
            
            # Validate attribute
            try:
                attribute = Attribute.objects.get(
                    id=attribute_id, 
                    client_id=client_id
                )
            except Attribute.DoesNotExist:
                raise serializers.ValidationError(f"Attribute with ID {attribute_id} does not exist or does not belong to the current client.")
            
            # Get the value
            val = item.get('value')
            
            # Validate based on attribute type
            if attribute.data_type == 'TEXT':
                if not isinstance(val, str):
                    raise serializers.ValidationError(f"Value for attribute {attribute.name} must be a string.")
            
            elif attribute.data_type == 'NUMBER':
                try:
                    float(val)
                except (TypeError, ValueError):
                    raise serializers.ValidationError(f"Value for attribute {attribute.name} must be a number.")
            
            elif attribute.data_type == 'BOOLEAN':
                if not isinstance(val, bool):
                    raise serializers.ValidationError(f"Value for attribute {attribute.name} must be a boolean.")
            
            elif attribute.data_type == 'DATE':
                try:
                    from django.utils.dateparse import parse_date
                    parsed_date = parse_date(val)
                    if not parsed_date:
                        raise ValueError
                except (TypeError, ValueError):
                    raise serializers.ValidationError(f"Value for attribute {attribute.name} must be a valid date (YYYY-MM-DD).")
            
            elif attribute.data_type == 'SELECT':
                # Validate single select option
                try:
                    # Handle case where value is an object with id property
                    if isinstance(val, dict) and 'id' in val:
                        val = val['id']
                        item['value'] = val
                    
                    # Convert to integer if it's a string
                    if isinstance(val, str) and val.isdigit():
                        val = int(val)
                        item['value'] = val
                    
                    option = AttributeOption.objects.get(
                        id=val, 
                        attribute_id=attribute_id, 
                        client_id=client_id
                    )
                except AttributeOption.DoesNotExist:
                    raise serializers.ValidationError(f"Invalid option for attribute {attribute.name}.")
            
            elif attribute.data_type == 'MULTI_SELECT':
                # Validate multi-select options
                processed_options = []
                
                # If it's not a list, try to convert it
                if not isinstance(val, list):
                    if isinstance(val, dict) and 'id' in val:
                        # Handle case where value is an object with id property
                        val = [val['id']]
                    else:
                        # Try to convert a single value to a list
                        val = [val]
                    item['value'] = val
                
                # Process each option in the list
                for option_value in val:
                    # Handle case where option is an object with id property
                    if isinstance(option_value, dict) and 'id' in option_value:
                        option_id = option_value['id']
                    else:
                        option_id = option_value
                    
                    # Convert to integer if it's a string
                    if isinstance(option_id, str) and option_id.isdigit():
                        option_id = int(option_id)
                
                    try:
                        option = AttributeOption.objects.get(
                            id=option_id, 
                            attribute_id=attribute_id, 
                            client_id=client_id
                        )
                        processed_options.append(option_id)
                    except AttributeOption.DoesNotExist:
                        raise serializers.ValidationError(f"Invalid option {option_id} for attribute {attribute.name}.")
                
                # Update the value with processed options
                item['value'] = processed_options
        
        return value
    
    def validate(self, data):
        """
        Validate the entire product data, with special attention to attribute values.
        """
        import logging
        logger = logging.getLogger(__name__)
        
        # Check if attribute_values_input is present
        attribute_values_input = data.get('attribute_values_input', [])
        
        logger.info(f"Validating product data. Attribute values input: {attribute_values_input}")
        
        # Validate each attribute value
        validated_attribute_values = []
        for attr_value_data in attribute_values_input:
            try:
                # Ensure required keys are present
                if 'attribute' not in attr_value_data or 'value' not in attr_value_data:
                    logger.warning(f"Incomplete attribute value data: {attr_value_data}")
                    continue
                
                # Fetch the attribute
                try:
                    attribute = Attribute.objects.get(id=attr_value_data['attribute'])
                except Attribute.DoesNotExist:
                    logger.error(f"Attribute not found: {attr_value_data['attribute']}")
                    continue
                
                # Validate value based on attribute type
                value = attr_value_data['value']
                data_type = attribute.data_type
                
                # Type-specific validations
                if data_type == 'TEXT':
                    # Ensure value can be converted to string
                    str_value = str(value)
                    if not str_value or len(str_value) > 255:  # Example length constraint
                        logger.warning(f"Invalid text value: {value}")
                        continue
                
                elif data_type == 'NUMBER':
                    # Ensure value can be converted to float
                    try:
                        float_value = float(value)
                    except (TypeError, ValueError):
                        logger.warning(f"Invalid number value: {value}")
                        continue
                
                elif data_type == 'BOOLEAN':
                    # Ensure value is boolean
                    bool_value = bool(value)
                
                elif data_type == 'DATE':
                    # Validate date format
                    from datetime import datetime
                    try:
                        if isinstance(value, str):
                            datetime.fromisoformat(value.replace('Z', '+00:00'))
                        elif not isinstance(value, datetime):
                            logger.warning(f"Invalid date value: {value}")
                            continue
                    except ValueError:
                        logger.warning(f"Could not parse date: {value}")
                        continue
                
                elif data_type in ['SELECT', 'MULTI_SELECT']:
                    # Ensure value is a valid option ID
                    try:
                        AttributeOption.objects.get(id=value)
                    except AttributeOption.DoesNotExist:
                        logger.error(f"Invalid option for {data_type}: {value}")
                        continue
                
                # If we've made it this far, the attribute value is valid
                validated_attribute_values.append(attr_value_data)
            
            except Exception as e:
                logger.error(f"Unexpected error validating attribute value: {str(e)}")
                logger.error(f"Problematic data: {attr_value_data}")
        
        # Update the data with validated attribute values
        data['attribute_values_input'] = validated_attribute_values
        
        logger.info(f"Validated attribute values: {validated_attribute_values}")
        
        return data
    
    @transaction.atomic
    def create(self, validated_data):
        """
        Custom create method to handle attribute values input, variant defining attributes,
        and temporary images with comprehensive logging.
        """
        try:
            # Pop related data that needs special handling
            logger.info(f"CREATE METHOD: validated_data keys before popping: {validated_data.keys()}")
            temp_images = validated_data.pop('temp_images', [])
            zone_restrictions_input = validated_data.pop('zone_restrictions_input', None)
            logger.info(f"CREATE METHOD: zone_restrictions_input popped: {zone_restrictions_input}")
            attribute_groups_data = validated_data.pop('attribute_groups', None)
            variant_defining_attributes_data = validated_data.pop('variant_defining_attributes', None)
            attribute_values_input = validated_data.pop('attribute_values_input', [])
            zone_restrictions_input = validated_data.pop('zone_restrictions_input', None)
            
            # Get customer_group_selling_channels without removing it from validated_data
            # DRF will handle setting it automatically since it's using the source parameter
            customer_group_selling_channels = validated_data.get('customer_group_selling_channels', [])
            
            # Get tenant from context or use default client_id
            try:
                tenant = self.context['request'].tenant
            except (KeyError, AttributeError):
                # If tenant is not available in request, use client_id from instance
                logger.info("No tenant found in request, using client_id from instance")
                tenant = instance.client_id
            
            # Extract workflow_flow_id from validated_data if it exists
            workflow_flow_id = validated_data.pop('workflow_flow_id', None)
            
            # Handle publication status
            publication_status = validated_data.pop('publication_status', 'DRAFT')
            
            # Create the product instance
            logger.info(f"Creating product with data: {validated_data}")
            logger.info(f"BEFORE CREATE: low_stock_count={validated_data.get('low_stock_count')}, min_count={validated_data.get('min_count')}, max_count={validated_data.get('max_count')}")
            try:
                product = Product.objects.create(
                    publication_status=publication_status,
                    **validated_data
                )
                logger.info(f"AFTER CREATE: low_stock_count={product.low_stock_count}, min_count={product.min_count}, max_count={product.max_count}")
                logger.info(f"Product created successfully with ID: {product.id}")
            except Exception as create_error:
                logger.error(f"Error creating product: {str(create_error)}")
                logger.error(f"Validated data that caused error: {validated_data}")
                raise
            
            # Set workflow_flow_id separately if it was provided
            if workflow_flow_id is not None:
                product.workflow_flow_id = workflow_flow_id
                product.save(update_fields=['workflow_flow_id'])
            
            logger.info(f"Created product with ID: {product.id}")
            
            # Set M2M fields if provided
            if attribute_groups_data is not None:
                logger.info(f"Setting attribute groups: {attribute_groups_data}")
                product.attribute_groups.set(attribute_groups_data)
            
            if variant_defining_attributes_data is not None:
                logger.info(f"Setting variant defining attributes: {variant_defining_attributes_data}")
                product.variant_defining_attributes.set(variant_defining_attributes_data)
                
            # Log if customer group selling channels are provided
            if customer_group_selling_channels:
                logger.info(f"Customer group selling channels will be set automatically: {customer_group_selling_channels}")
            
            # Link temporary images
            if temp_images:
                try:
                    logger.info(f"Linking {len(temp_images)} temporary images")
                    # Handle different tenant types (object or ID)
                    tenant_param = tenant
                    if isinstance(tenant, int):
                        # If tenant is just an ID (client_id), pass it directly
                        logger.info(f"Using client_id {tenant} as tenant parameter")
                        
                    link_temporary_images(
                        owner_instance=product,
                        owner_type='product',
                        temp_image_data=temp_images,
                        tenant=tenant_param
                    )
                except Exception as e:
                    logger.error(f"Error linking temporary images: {str(e)}")
                    raise serializers.ValidationError(f"Error processing images: {str(e)}")
            
            # Process attribute values
            if attribute_values_input:
                logger.info(f"Processing {len(attribute_values_input)} attribute values")
                for attr_value in attribute_values_input:
                    try:
                        attribute_id = attr_value.get('attribute')
                        # Handle different tenant types (object or client_id)
                        if isinstance(tenant, int):
                            # If tenant is just an ID (client_id), use client_id filter
                            logger.info(f"Using client_id {tenant} for attribute lookup")
                            attribute = Attribute.objects.get(
                                id=attribute_id,
                                client_id=tenant,  # Use client_id directly, not tenant__client_id
                                groups__in=attribute_groups_data if attribute_groups_data else []  # Fixed field name from attribute_groups to groups
                            )
                        else:
                            # Normal case with tenant object - but we need to use client_id
                            # Extract client_id from tenant object if it's not already a client_id
                            client_id_value = tenant if isinstance(tenant, int) else getattr(tenant, 'client_id', 1)
                            attribute = Attribute.objects.get(
                                id=attribute_id,
                                client_id=client_id_value,  # Always use client_id field
                                groups__in=attribute_groups_data if attribute_groups_data else []  # Fixed field name from attribute_groups to groups
                            )
                        
                        # Create attribute value based on type
                        if attribute.data_type in ['SELECT', 'MULTI_SELECT']:
                            # Handle SELECT/MULTI_SELECT types
                            option_ids = attr_value.get('value', [])
                            if not isinstance(option_ids, list):
                                option_ids = [option_ids]
                            
                            options = AttributeOption.objects.filter(
                                id__in=option_ids,
                                attribute=attribute
                            )
                            
                            if attribute.data_type == 'SELECT':
                                ProductAttributeValue.objects.create(
                                    product=product,
                                    attribute=attribute,
                                    value_option=options.first() if options else None
                                )
                            else:  # MULTI_SELECT
                                for option in options:
                                    ProductAttributeMultiValue.objects.create(
                                        product=product,
                                        attribute=attribute,
                                        value_option=option
                                    )
                        else:
                            # Handle other types (TEXT, NUMBER, BOOLEAN, DATE)
                            # We need to use type-specific fields, not a generic 'value' field
                            value_data = {}
                            if attribute.data_type == 'TEXT':
                                value_data['value_text'] = attr_value.get('value')
                            elif attribute.data_type == 'NUMBER':
                                value_data['value_number'] = attr_value.get('value')
                            elif attribute.data_type == 'BOOLEAN':
                                value_data['value_boolean'] = attr_value.get('value')
                            elif attribute.data_type == 'DATE':
                                value_data['value_date'] = attr_value.get('value')
                                
                            ProductAttributeValue.objects.create(
                                product=product,
                                attribute=attribute,
                                **value_data  # Use the type-specific field
                            )
                    except Attribute.DoesNotExist:
                        logger.error(f"Attribute {attribute_id} not found")
                        raise serializers.ValidationError(f"Attribute {attribute_id} not found")
                    except Exception as e:
                        logger.error(f"Error processing attribute value: {str(e)}")
                        raise serializers.ValidationError(f"Error processing attribute value: {str(e)}")
                        
            # Process zone restrictions if provided
            if zone_restrictions_input:
                logger.info(f"CREATE METHOD: Processing {len(zone_restrictions_input)} zone restrictions")
                try:
                    self._process_zone_restrictions(product, zone_restrictions_input)
                    logger.info("Zone restrictions processed successfully")
                except Exception as e:
                    logger.error(f"Failed to process zone restrictions: {str(e)}")
                    # Don't raise the exception here to avoid transaction rollback
            
            return product
            
        except Exception as e:
            logger.error(f"Error in create method: {str(e)}")
            raise

    @transaction.atomic
    def update(self, instance, validated_data):
        """
        Custom update method to handle attribute values input, variant defining attributes,
        and temporary images with comprehensive logging.
        """
        try:
            # Pop related data that needs special handling
            temp_images = None
            if 'temp_images' in validated_data:
                temp_images = validated_data.pop('temp_images')
                
            attribute_groups_data = validated_data.pop('attribute_groups', None)
            variant_defining_attributes_data = validated_data.pop('variant_defining_attributes', None)
            attribute_values_input = validated_data.pop('attribute_values_input', None)
            zone_restrictions_input = validated_data.pop('zone_restrictions_input', None)
            
            # Get tenant from context or use default client_id
            try:
                tenant = self.context['request'].tenant
            except (KeyError, AttributeError):
                # If tenant is not available in request, use client_id from instance
                logger.info("No tenant found in request, using client_id from instance")
                tenant = instance.client_id
            
            # Extract workflow_flow_id from validated_data if it exists
            workflow_flow_id = validated_data.pop('workflow_flow_id', None)
            
            # Get customer_group_selling_channels without removing it from validated_data
            # DRF will handle setting it automatically since it's using the source parameter
            customer_group_selling_channels = validated_data.get('customer_group_selling_channels', None)
            
            # Debug log to see the validated_data
            logger.info(f"Validated data after pops: {validated_data}")
            
            # Track UOM changes directly with the Model API
            logger.info(f"Current UOM ID in database: {instance.uom_id}")
            
            # Handle UOM - more direct approach
            new_uom_id = None
            if hasattr(self.context['request'], 'data') and 'uom_id' in self.context['request'].data:
                new_uom_id = self.context['request'].data.get('uom_id')
                logger.info(f"Found uom_id in request data: {new_uom_id}")
            
            # Make sure new_uom_id is an integer if present
            if new_uom_id is not None:
                try:
                    new_uom_id = int(new_uom_id)
                    logger.info(f"Will update UOM ID to: {new_uom_id}")
                except (ValueError, TypeError):
                    logger.error(f"Invalid UOM value: {new_uom_id}")
                    raise serializers.ValidationError(f"Invalid UOM value: {new_uom_id}")
            
            # Update the product instance
            logger.info(f"Updating product {instance.id} with data: {validated_data}")
            product = super().update(instance, validated_data)

            # Handle UOM after the main update using our new approach
            if new_uom_id is not None:
                # Direct database update for the UOM
                product.uom_id = new_uom_id
                product.save(update_fields=['uom_id'])
                logger.info(f"Updated UOM ID to {new_uom_id} for product {product.id}")
            
            # Update workflow_flow_id separately if it was provided
            if workflow_flow_id is not None:
                product.workflow_flow_id = workflow_flow_id
                product.save(update_fields=['workflow_flow_id'])
            
            # Update M2M fields if provided
            if attribute_groups_data is not None:
                logger.info(f"Updating attribute groups: {attribute_groups_data}")
                product.attribute_groups.set(attribute_groups_data)
            
            if variant_defining_attributes_data is not None:
                logger.info(f"Updating variant defining attributes: {variant_defining_attributes_data}")
                product.variant_defining_attributes.set(variant_defining_attributes_data)
                
            # Log if customer group selling channels are provided
            if customer_group_selling_channels is not None:
                logger.info(f"Customer group selling channels will be set automatically: {customer_group_selling_channels}")
            
            
            # Link temporary images if provided
            if temp_images is not None:
                try:
                    logger.info(f"Linking {len(temp_images)} temporary images")
                    # Handle different tenant types (object or ID)
                    tenant_param = tenant
                    if isinstance(tenant, int):
                        # If tenant is just an ID (client_id), pass it directly
                        logger.info(f"Using client_id {tenant} as tenant parameter")
                        
                    link_temporary_images(
                        owner_instance=product,
                        owner_type='product',
                        temp_image_data=temp_images,
                        tenant=tenant_param
                    )
                except Exception as e:
                    logger.error(f"Error linking temporary images: {str(e)}")
                    raise serializers.ValidationError(f"Error processing images: {str(e)}")
            
            # Process attribute values if provided
            if attribute_values_input is not None:
                logger.info(f"Processing {len(attribute_values_input)} attribute values")
                
                # Clear existing values if we're updating
                # First get all ProductAttributeValue objects for this product
                product_attr_values = ProductAttributeValue.objects.filter(product=product)
                
                # Delete any ProductAttributeMultiValue objects related to these ProductAttributeValue objects
                if product_attr_values.exists():
                    ProductAttributeMultiValue.objects.filter(product_attribute_value__in=product_attr_values).delete()
                
                # Then delete the ProductAttributeValue objects themselves
                product_attr_values.delete()
                
                for attr_value in attribute_values_input:
                    try:
                        attribute_id = attr_value.get('attribute')
                        # Handle different tenant types (object or client_id)
                        if isinstance(tenant, int):
                            # If tenant is just an ID (client_id), use client_id filter
                            logger.info(f"Using client_id {tenant} for attribute lookup")
                            attribute = Attribute.objects.get(
                                id=attribute_id,
                                client_id=tenant,  # Use client_id directly, not tenant__client_id
                                groups__in=attribute_groups_data if attribute_groups_data else []  # Fixed field name from attribute_groups to groups
                            )
                        else:
                            # Normal case with tenant object - but we need to use client_id
                            # Extract client_id from tenant object if it's not already a client_id
                            client_id_value = tenant if isinstance(tenant, int) else getattr(tenant, 'client_id', 1)
                            attribute = Attribute.objects.get(
                                id=attribute_id,
                                client_id=client_id_value,  # Always use client_id field
                                groups__in=attribute_groups_data if attribute_groups_data else []  # Fixed field name from attribute_groups to groups
                            )
                        
                        # Create attribute value based on type
                        if attribute.data_type in ['SELECT', 'MULTI_SELECT']:
                            # Handle SELECT/MULTI_SELECT types
                            option_ids = attr_value.get('value', [])
                            if not isinstance(option_ids, list):
                                option_ids = [option_ids]
                            
                            options = AttributeOption.objects.filter(
                                id__in=option_ids,
                                attribute=attribute
                            )
                            
                            if attribute.data_type == 'SELECT':
                                ProductAttributeValue.objects.create(
                                    product=product,
                                    attribute=attribute,
                                    value_option=options.first() if options else None
                                )
                            else:  # MULTI_SELECT
                                for option in options:
                                    ProductAttributeMultiValue.objects.create(
                                        product=product,
                                        attribute=attribute,
                                        value_option=option
                                    )
                        else:
                            # Handle other types (TEXT, NUMBER, BOOLEAN, DATE)
                            # We need to use type-specific fields, not a generic 'value' field
                            value_data = {}
                            if attribute.data_type == 'TEXT':
                                value_data['value_text'] = attr_value.get('value')
                            elif attribute.data_type == 'NUMBER':
                                value_data['value_number'] = attr_value.get('value')
                            elif attribute.data_type == 'BOOLEAN':
                                value_data['value_boolean'] = attr_value.get('value')
                            elif attribute.data_type == 'DATE':
                                value_data['value_date'] = attr_value.get('value')
                                
                            ProductAttributeValue.objects.create(
                                product=product,
                                attribute=attribute,
                                **value_data  # Use the type-specific field
                            )
                    except Attribute.DoesNotExist:
                        logger.error(f"Attribute {attribute_id} not found")
                        raise serializers.ValidationError(f"Attribute {attribute_id} not found")
                    except Exception as e:
                        logger.error(f"Error processing attribute value: {str(e)}")
                        raise serializers.ValidationError(f"Error processing attribute value: {str(e)}")
            # Process zone restrictions if provided
            if zone_restrictions_input is not None:
                logger.info(f"UPDATE METHOD: Processing {len(zone_restrictions_input)} zone restrictions")
                try:
                    # First remove any existing zone restrictions
                    existing_count = product.zone_restrictions.count()
                    logger.info(f"Deleting {existing_count} existing zone restrictions")
                    product.zone_restrictions.all().delete()
                    
                    # Then process new zone restrictions
                    self._process_zone_restrictions(product, zone_restrictions_input)
                    logger.info("Zone restrictions processed successfully in update")
                except Exception as e:
                    logger.error(f"Failed to process zone restrictions in update: {str(e)}")
                    # Don't raise the exception here to avoid transaction rollback
            
            return product
            
        except Exception as e:
            logger.error(f"Error in update method: {str(e)}")
            raise

    def _process_zone_restrictions(self, product, zone_restrictions_input):
        """
        Process zone restrictions input and create or update zone restriction records.
        
        Args:
            product (Product): The product instance
            zone_restrictions_input (list): List of dictionaries with zone restriction data
        """
        logger.info(f"Processing {len(zone_restrictions_input)} zone restrictions")
        logger.info(f"Zone restrictions input: {zone_restrictions_input}")
        logger.info(f"Product ID: {product.id}, Product Name: {product.name}")
        
        # Verify the tenant context
        try:
            from shipping_zones.models import ShippingZone
            client_id = getattr(self.context.get('request'), 'client_id', None)
            logger.info(f"Current client_id from context: {client_id}")
            
            # Check if zones exist
            for restriction_data in zone_restrictions_input:
                zone_id = restriction_data.get('zone')
                exists = ShippingZone.objects.filter(id=zone_id).exists()
                logger.info(f"Zone with ID {zone_id} exists: {exists}")
                if not exists:
                    logger.warning(f"Zone with ID {zone_id} does not exist")
        except Exception as e:
            logger.error(f"Error checking zones: {str(e)}")
        
        for restriction_data in zone_restrictions_input:
            try:
                logger.info(f"Creating zone restriction with data: {restriction_data}")
                zone_id = restriction_data.get('zone')
                restriction_mode = restriction_data.get('restriction_mode')
                
                # Validate inputs
                if not zone_id:
                    logger.error("Zone ID is missing")
                    raise serializers.ValidationError("Zone ID is required")
                    
                if not restriction_mode or restriction_mode not in ['INCLUDE', 'EXCLUDE']:
                    logger.error(f"Invalid restriction_mode: {restriction_mode}")
                    raise serializers.ValidationError("Restriction mode must be either 'INCLUDE' or 'EXCLUDE'")
                
                # Create zone restriction
                restriction = ProductZoneRestriction.objects.create(
                    product=product,
                    zone_id=zone_id,
                    restriction_mode=restriction_mode
                )
                logger.info(f"Created zone restriction with ID: {restriction.id}")
            except Exception as e:
                logger.error(f"Error processing zone restriction: {str(e)}")
                raise serializers.ValidationError(f"Error processing zone restriction: {str(e)}")

class ProductVariantSerializer(serializers.ModelSerializer):
    """
    Serializer for the ProductVariant model.
    
    This serializer handles validation and conversion between Python objects and
    JSON for the ProductVariant model, supporting all CRUD operations.
    """
    # Read-only fields
    client_id = serializers.IntegerField(read_only=True)
    company_id = serializers.IntegerField(read_only=True)
    product = serializers.PrimaryKeyRelatedField(read_only=True)
    
    # Related fields
    options = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=AttributeOption.objects.all(),
        write_only=True
    )
    
    # Add nested read-only serializer for options for GET responses
    options_detail = serializers.SerializerMethodField(read_only=True)
    
    # Image handling
    images = ProductImageSerializer(many=True, read_only=True)
    temp_images = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False,
        help_text='List of temp image objects for this variant: [{"id": temp_uuid, "alt_text": "...", "sort_order": 0, "is_default": false}, ...]'
    )
    
    # Display fields
    options_display = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = ProductVariant
        fields = [
            'id',
            'client_id',
            'company_id',
            'product',
            'sku',
            'display_price',
            'is_active',
            'quantity_on_hand',
            'options',
            'options_detail',
            'options_display',
            'status_override',
            'images',
            'temp_images',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id',
            'client_id',
            'company_id',
            'product',
            'images',
            'options_detail',
            'options_display',
            'created_at',
            'updated_at'
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Filter related fields by client if request is available
        request = self.context.get('request')
        if request and hasattr(request, 'tenant'):
            tenant = request.tenant
            # Filter options by client_id
            client_id = tenant.id if hasattr(tenant, 'id') else tenant
            self.fields['options'].queryset = AttributeOption.objects.filter(attribute__client_id=client_id)
    
    def get_options_display(self, obj):
        """
        Get a human-readable representation of the variant options.
        """
        return obj.get_options_display()
    
    def get_options_detail(self, obj):
        """
        Get detailed information about the variant's options.
        
        Returns a list of dictionaries containing option details including
        attribute name, option label, and option value.
        """
        result = []
        for option in obj.options.all().select_related('attribute'):
            result.append({
                'id': option.id,
                'attribute_id': option.attribute.id,
                'attribute_name': option.attribute.name,
                'attribute_code': option.attribute.code,
                'option_label': option.option_label,
                'option_value': option.option_value
            })
        return result
    
    def validate_options(self, options):
        """
        Validate that the options are valid for creating a variant:
        1. All options belong to attributes marked use_for_variants=True
        2. All options belong to the same client
        3. The combination of options is unique for the parent product
        """
        if not options:
            raise serializers.ValidationError("At least one option is required.")
            
        request = self.context.get('request')
        client_id = None
        
        if request and hasattr(request, 'tenant'):
            client_id = request.tenant
        else:
            # Default to client_id=1 for development
            client_id = 1
            logger.info("No tenant found in request, using default client_id=1 for variant options validation")
        
        # Check that all options belong to variant-enabled attributes
        invalid_options = [
            opt for opt in options
            if not opt.attribute.use_for_variants or opt.attribute.client_id != client_id
        ]
        if invalid_options:
            raise serializers.ValidationError(
                f"Options {', '.join(str(o.id) for o in invalid_options)} "
                f"are either not from variant-enabled attributes or belong to a different client."
            )
        
        # Check uniqueness of option combination for the parent product
        if self.instance:
            # For updates, exclude current instance from uniqueness check
            product = self.instance.product
            existing_variants = product.variants.exclude(id=self.instance.id)
        else:
            # For creates, get product from context
            try:
                product_id = self.context['view'].kwargs['product_pk']
                product = Product.objects.get(id=product_id, client_id=client_id)
            except (KeyError, Product.DoesNotExist):
                raise serializers.ValidationError("Valid product context is required.")
            existing_variants = product.variants.all()
        
        # Check if this combination of options already exists
        for variant in existing_variants:
            if set(variant.options.values_list('id', flat=True)) == set(opt.id for opt in options):
                raise serializers.ValidationError(
                    "A variant with this combination of options already exists."
                )
        
        return options
        
    def validate(self, data):
        """
        Validate the entire variant data, with special attention to options.
        
        Ensures:
        1. Options are provided and valid
        2. Options match the parent product's variant-defining attributes
        3. The combination of options is unique for the parent product
        """
        # Get options from the data
        options_data = data.get('options')
        if not options_data:
            raise serializers.ValidationError({"options": "Variant must have defining attribute options selected."})
        
        # Get parent product from context
        request = self.context.get('request')
        client_id = None
        
        if request and hasattr(request, 'tenant'):
            client_id = request.tenant
        else:
            # Default to client_id=1 for development
            client_id = 1
            logger.info("No tenant found in request, using default client_id=1 for variant validation")
        
        # Get the parent product
        if self.instance:
            # For updates, get from instance
            product = self.instance.product
        else:
            # For creates, get from context
            try:
                product_id = self.context['view'].kwargs['product_pk']
                product = Product.objects.get(id=product_id, client_id=client_id)
            except (KeyError, Product.DoesNotExist):
                raise serializers.ValidationError({"product": "Valid product context is required."})
        
        # Get the variant-defining attributes for the parent product
        defining_attrs = product.variant_defining_attributes.all()
        defining_attr_ids = set(defining_attrs.values_list('id', flat=True))
        
        if not defining_attr_ids:
            raise serializers.ValidationError({"product": "Parent product has no variant-defining attributes."})
        
        # Get the submitted options
        submitted_option_pks = [opt.pk for opt in options_data]
        
        # Fetch options fully to get their attributes
        submitted_options = AttributeOption.objects.filter(
            pk__in=submitted_option_pks
        ).select_related('attribute')
        
        if len(submitted_options) != len(submitted_option_pks):
            raise serializers.ValidationError({"options": "One or more selected options are invalid."})
        
        # Get the attributes of the submitted options
        submitted_attr_ids = set(opt.attribute_id for opt in submitted_options)
        
        # Check 1: Correct Attributes and Count
        if submitted_attr_ids != defining_attr_ids:
            missing_attrs = defining_attr_ids - submitted_attr_ids
            extra_attrs = submitted_attr_ids - defining_attr_ids
            
            error_msg = "Selected options must exactly match the parent product's variant-defining attributes."
            if missing_attrs:
                error_msg += f" Missing attributes: {', '.join(str(a) for a in missing_attrs)}."
            if extra_attrs:
                error_msg += f" Extra attributes: {', '.join(str(a) for a in extra_attrs)}."
                
            raise serializers.ValidationError({"options": error_msg})
        
        # Check 2: One option per attribute (no duplicates)
        attr_count = {}
        for opt in submitted_options:
            attr_count[opt.attribute_id] = attr_count.get(opt.attribute_id, 0) + 1
        
        duplicate_attrs = [attr_id for attr_id, count in attr_count.items() if count > 1]
        if duplicate_attrs:
            raise serializers.ValidationError({
                "options": f"Multiple options selected for the same attribute(s): {', '.join(str(a) for a in duplicate_attrs)}"
            })
        
        # Check 3: Uniqueness of combination
        existing_variants = product.variants.all()
        if self.instance:
            existing_variants = existing_variants.exclude(pk=self.instance.pk)
        
        submitted_option_id_set = set(submitted_option_pks)
        for variant in existing_variants.prefetch_related('options'):
            existing_option_id_set = set(variant.options.values_list('id', flat=True))
            if submitted_option_id_set == existing_option_id_set:
                raise serializers.ValidationError({
                    "options": "A variant with this combination of options already exists."
                })
        
        return data

    @transaction.atomic
    def create(self, validated_data):
        """
        Create a new ProductVariant instance with options and temporary images.
        
        This method handles the creation of a ProductVariant and processes any
        temporary images, linking them to the newly created variant.
        """
        logger.critical("Entering VariantSerializer create. Validated data keys: %s", validated_data.keys())
        
        try:
            # Extract options from validated data
            options_data = []
            if 'options' in validated_data:
                options_data = validated_data.pop('options')
            
            # Extract temp_images from validated data
            temp_images = None
            if 'temp_images' in validated_data:
                temp_images = validated_data.pop('temp_images')
                logger.critical("Popped temp_images data: %s", temp_images)
            else:
                logger.critical("No temp_images found in validated_data")
                
            # Get tenant and product from context
            request = self.context.get('request')
            client_id = getattr(request, 'client_id', 1) if request else 1
            product_id = self.context['view'].kwargs['product_pk']
            
            # Verify product exists and belongs to tenant
            try:
                product = Product.objects.get(id=product_id, client_id=client_id)
                if product.product_type != 'PARENT':
                    raise serializers.ValidationError(
                        "Variants can only be created for PARENT type products."
                    )
            except Product.DoesNotExist:
                raise serializers.ValidationError(
                    f"Product {product_id} not found or does not belong to the current client."
                )
            
            # Create the variant
            logger.critical(f"Creating variant for product {product_id} with data: {validated_data}")
            variant = ProductVariant.objects.create(
                product_id=product_id,
                **validated_data
            )
            logger.critical("Created Variant instance with ID: %s", variant.id)
            
            # Set options
            variant.options.set(options_data)
            logger.critical("Set options for variant ID: %s with options: %s", variant.id, [o.id for o in options_data])
            
            # Process temporary images
            if temp_images:
                logger.critical("Calling link_temporary_images for variant ID %s with owner_type='variant'", variant.id)
                try:
                    link_temporary_images(
                        owner_instance=variant,
                        owner_type='variant',
                        temp_image_data=temp_images,
                        tenant=client_id
                    )
                    logger.critical("Finished calling link_temporary_images for variant ID %s", variant.id)
                except Exception as e:
                    logger.critical("ERROR calling link_temporary_images for variant ID %s: %s", variant.id, e, exc_info=True)
                    logger.error(f"Error linking temporary images: {str(e)}")
                    raise serializers.ValidationError(f"Error processing images: {str(e)}")
            else:
                logger.critical("No temp_images data found for variant ID %s.", variant.id)
            
            return variant
            
        except Exception as e:
            logger.critical(f"Error in create method: {str(e)}", exc_info=True)
            logger.error(f"Error in create method: {str(e)}")
            raise

    @transaction.atomic
    def update(self, instance, validated_data):
        """
        Update an existing ProductVariant instance with options and temporary images.
        
        This method handles the updating of a ProductVariant and processes any
        temporary images, linking them to the updated variant.
        """
        try:
            # Pop related data
            temp_images = None
            if 'temp_images' in validated_data:
                temp_images = validated_data.pop('temp_images')
                
            options_data = None
            if 'options' in validated_data:
                options_data = validated_data.pop('options')
            
            # Update the variant
            logger.info(f"Updating variant {instance.id} with data: {validated_data}")
            variant = super().update(instance, validated_data)
            
            # Update options if provided
            if options_data is not None:
                variant.options.set(options_data)
                logger.info(f"Updated options for variant {variant.id}: {[o.id for o in options_data]}")
            
            # Process temporary images if provided
            if temp_images is not None:
                try:
                    logger.info(f"Linking {len(temp_images)} temporary images to variant {variant.id}")
                    link_temporary_images(
                        owner_instance=variant,
                        owner_type='variant',
                        temp_image_data=temp_images,
                        tenant=instance.client_id
                    )
                except Exception as e:
                    logger.error(f"Error linking temporary images: {str(e)}")
                    raise serializers.ValidationError(f"Error processing images: {str(e)}")
            
            return variant
            
        except Exception as e:
            logger.error(f"Error in update method: {str(e)}")
            raise

    def validate_status_override(self, status_override):
        """
        Validate that the status_override belongs to the same client.
        """
        if not status_override:
            return status_override
        
        request = self.context.get('request')
        client_id = getattr(request, 'client_id', 1) if request else 1
        
        # Check if status_override belongs to the same client
        if status_override.client_id != client_id:
            raise serializers.ValidationError("The selected status does not belong to the current client.")
        
        return status_override


class KitComponentSerializer(serializers.ModelSerializer):
    """
    Serializer for the KitComponent model.
    
    This serializer handles validation and conversion between Python objects and
    JSON for the KitComponent model, supporting all CRUD operations.
    """
    # Read-only fields
    client_id = serializers.IntegerField(read_only=True)
    company_id = serializers.IntegerField(read_only=True)
    kit_product = serializers.PrimaryKeyRelatedField(read_only=True)
    
    # Related fields with appropriate nullability
    component_product = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(),
        required=False,
        allow_null=True
    )
    component_variant = serializers.PrimaryKeyRelatedField(
        queryset=ProductVariant.objects.all(),
        required=False,
        allow_null=True
    )
    
    # Display fields for readability
    component_display = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = KitComponent
        fields = [
            'id',
            'client_id',
            'company_id',
            'kit_product',
            'component_product',
            'component_variant',
            'quantity',
            'is_swappable_group',
            'component_display',
            'created_at',
            'updated_at'
        ]
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Filter related fields by client if request is available
        request = self.context.get('request')
        if request and hasattr(request, 'client_id'):
            client_id = request.client_id
            # Filter products by client
            self.fields['component_product'].queryset = Product.objects.filter(
                client_id=client_id,
                product_type='REGULAR'  # Only allow REGULAR products as components by default
            )
            # Filter variants by client
            self.fields['component_variant'].queryset = ProductVariant.objects.filter(
                client_id=client_id
            )
    
    def get_component_display(self, obj):
        """
        Get a human-readable representation of the component.
        """
        if obj.component_product:
            return f"{obj.component_product.name} (Product)"
        elif obj.component_variant:
            return f"{obj.component_variant.product.name} - {obj.component_variant.get_options_display()} (Variant)"
        return "No component selected"
    
    def validate(self, data):
        """
        Validate the kit component data:
        1. Either component_product or component_variant must be set, but not both
        2. If is_swappable_group=True, component_product must be set and its type must be PARENT
        3. If is_swappable_group=False, one of the component fields must be set
        """
        component_product = data.get('component_product')
        component_variant = data.get('component_variant')
        is_swappable_group = data.get('is_swappable_group', False)
        
        # Check if exactly one of component_product or component_variant is set
        if (component_product and component_variant) or (not component_product and not component_variant):
            raise serializers.ValidationError(
                "Exactly one of component_product or component_variant must be set."
            )
        
        # Check swappable group rules
        if is_swappable_group:
            # For swappable groups, component_product must be set and must be a PARENT product
            if not component_product:
                raise serializers.ValidationError(
                    "For swappable groups, component_product must be set."
                )
            
            if component_product.product_type != 'PARENT':
                raise serializers.ValidationError(
                    "For swappable groups, component_product must be a PARENT product."
                )
            
            if component_variant:
                raise serializers.ValidationError(
                    "For swappable groups, component_variant must not be set."
                )
        
        # Check client consistency
        request = self.context.get('request')
        client_id = getattr(request, 'client_id', 1) if request else 1
        
        if component_product and component_product.client_id != client_id:
            raise serializers.ValidationError(
                "The selected component product does not belong to the current client."
            )
        
        if component_variant and component_variant.client_id != client_id:
            raise serializers.ValidationError(
                "The selected component variant does not belong to the current client."
            )
        
        return data
