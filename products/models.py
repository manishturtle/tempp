"""
Models for the products app.

This module defines models for product-related entities such as Product, ProductImage,
ProductAttributeValue, and ProductVariant, which form the central structure for storing product data.
"""

from django.db import models
from django.conf import settings
from django.utils.text import slugify
from django.utils.translation import gettext_lazy as _
from django.contrib.postgres.fields import JSONField
from core.models.base import TimestampedModel, AuditableModel
from core.models import BaseTenantModel

# Import the models from the catalogue app
from products.catalogue.models import Division, Subcategory, UnitOfMeasure, ProductStatus

# Import Category from the correct module based on the database table name
from products.catalogue.models import Category


class PublicationStatus(models.TextChoices):
    """
    Publication status choices for products.
    """
    DRAFT = 'DRAFT', _('Draft')
    ACTIVE = 'ACTIVE', _('Active')
    ARCHIVED = 'ARCHIVED', _('Archived')


# NOTE: We're not using this ProductCategory model anymore.
# Instead, we're using the Category model from products.catalogue.models
# The model below is kept as a reference but is not used in the database schema.

# class ProductCategory(models.Model):
#     """
#     Model for product categories.
#     
#     Categories are used to organize products and can have different tax rates
#     and other settings that apply to all products within the category.
#     """
#     category_id = models.AutoField(primary_key=True)
#     category_name = models.CharField(max_length=100, unique=True)
#     category_description = models.TextField(blank=True, null=True)
#     category_image_url = models.CharField(max_length=255, blank=True, null=True)
#     category_image_alt_text = models.TextField(blank=True, null=True)
#     is_active = models.BooleanField(default=True)
#     # We'll define this as a string for now since we don't have the TaxRateProfile model yet
#     default_tax_rate_profile = models.CharField(max_length=100, blank=True, null=True)
#     tax_inclusive = models.BooleanField(default=False)
#     
#     def __str__(self):
#         return self.category_name
#     
#     class Meta:
#         verbose_name = "Product Category"
#         verbose_name_plural = "Product Categories"


# Product type choices
class PRODUCT_TYPE_CHOICES:
    """
    Choices for different product types.
    
    - REGULAR: Standard products without variants
    - PARENT: Products that have variants (child products)
    - KIT: Bundle products composed of multiple other products
    """
    REGULAR = 'REGULAR'
    PARENT = 'PARENT'
    KIT = 'KIT'
    
    CHOICES = [
        (REGULAR, 'Regular Product'),
        (PARENT, 'Parent Product (with Variants)'),
        (KIT, 'Kit/Bundle Product'),
    ]
    # VARIANT type is handled by a separate model (ProductVariant)


class Product(AuditableModel):
    """
    Product model for storing product information.
    
    This is the central model for product data, containing fields for product details,
    pricing, inventory, and SEO.
    """
    # Inventory management fields
    low_stock_count = models.PositiveIntegerField(
        default=0, 
        help_text="Threshold at which product is considered low in stock"
    )
    min_count = models.PositiveIntegerField(
        default=0, 
        help_text="Minimum allowed stock count"
    )
    max_count = models.PositiveIntegerField(
        null=True, 
        blank=True, 
        help_text="Maximum allowed stock count (optional)"
    )

    # Availability timeframe
    active_from_date = models.DateTimeField(
        null=True, 
        blank=True, 
        help_text="Date from which this product is available"
    )
    active_to_date = models.DateTimeField(
        null=True, 
        blank=True, 
        help_text="Date until which this product is available"
    )

    # Additional fields
    custom_label = models.CharField(
        max_length=255, 
        null=True, 
        blank=True, 
        help_text="Optional custom label for internal use"
    )
    cost_price = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        null=True, 
        blank=True, 
        help_text="Cost price of the product"
    )
    # Core fields
    id = models.AutoField(primary_key=True)
    client_id = models.IntegerField(default=1)
    company_id = models.IntegerField(default=1)
    product_type = models.CharField(
        max_length=10,
        choices=PRODUCT_TYPE_CHOICES.CHOICES,
        default=PRODUCT_TYPE_CHOICES.REGULAR
    )
    publication_status = models.CharField(
        max_length=10,
        choices=PublicationStatus.choices,
        default=PublicationStatus.DRAFT,
        db_index=True,
        help_text=_('Current publication status of the product')
    )
    attribute_groups = models.ManyToManyField(
        'attributes.AttributeGroup',
        blank=True,
        related_name='products',
        help_text=_('Groups whose attributes should be initially displayed')
    )
    variant_defining_attributes = models.ManyToManyField(
        'attributes.Attribute',
        blank=True,
        related_name='defines_variants_for',
        limit_choices_to={'use_for_variants': True},
        help_text=_('Attributes used to define variants for this product')
    )
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255)
    sku = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    description = models.TextField(blank=True)
    short_description = models.TextField(blank=True)
    
    # Category and classification references
    category = models.ForeignKey(
        Category,  # Use the imported Category from products.catalogue.models
        on_delete=models.PROTECT,
        related_name='products',
        to_field='id'
    )
    subcategory = models.ForeignKey(
        Subcategory,
        on_delete=models.PROTECT,
        related_name='products',
        blank=True,
        null=True,
        help_text='Subcategory this product belongs to'
    )
    division = models.ForeignKey(
        Division,
        on_delete=models.PROTECT,
        related_name='products',
        null=True,
        help_text='Division this product belongs to'
    )
    uom = models.ForeignKey(
        UnitOfMeasure,
        on_delete=models.PROTECT,
        related_name='products',
        null=True,
        help_text='Unit of measure for this product'
    )
    productstatus = models.ForeignKey(
        ProductStatus,
        on_delete=models.PROTECT,
        related_name='products',
        null=True,
        help_text='Current status of this product'
    )
    
    # Pricing and tax fields
    currency_code = models.ForeignKey(
        'shared.Currency',
        on_delete=models.PROTECT,
        related_name='products',
        null=True,
        help_text='Currency for product pricing'
    )
    default_tax_rate_profile = models.ForeignKey(
        'pricing.TaxRateProfile',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='default_for_products'
    )
    is_tax_exempt = models.BooleanField(default=False)
    display_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )
    compare_at_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Original price for comparison (e.g., for sale items)'
    )
    
    # Inventory and product management flags
    is_active = models.BooleanField(default=True)
    allow_reviews = models.BooleanField(default=True)
    inventory_tracking_enabled = models.BooleanField(default=True)
    backorders_allowed = models.BooleanField(default=False)
    quantity_on_hand = models.IntegerField(default=10)
    is_serialized = models.BooleanField(
        default=False,
        help_text='Whether this product has serial numbers'
    )
    is_lotted = models.BooleanField(
        default=False,
        help_text='Whether this product is tracked by lot/batch numbers'
    )
    pre_order_available = models.BooleanField(
        default=False,
        help_text='Whether this product can be pre-ordered'
    )
    pre_order_date = models.DateField(
        blank=True,
        null=True,
        help_text='Date when pre-ordered items will be available'
    )
    
    # SEO fields
    seo_title = models.CharField(max_length=70, blank=True)
    seo_description = models.CharField(max_length=160, blank=True)
    seo_keywords = models.CharField(max_length=255, blank=True)
    
    # Additional metadata
    tags = models.JSONField(
        blank=True,
        null=True,
        help_text='Product tags stored as a JSON array of strings'
    )
    
    # FAQ field as JSON
    faqs = models.JSONField(blank=True, null=True, help_text='Product FAQs stored as JSON')
    
    # Key features as JSON array of strings
    key_features = models.JSONField(
        blank=True,
        null=True,
        default=list,
        help_text='List of key features for the product stored as a JSON array of strings. Example: ["Feature 1", "Feature 2"]'
    )
    
    # Custom fields as JSON
    custom_fields = models.JSONField(
        blank=True,
        null=True,
        default=dict,
        help_text='Custom product attributes stored as JSON. Can include any additional product data.'
    )
    
    # Workflow integration
    workflow_flow_id = models.IntegerField(
        null=True,
        blank=True,
        help_text='Workflow flow ID for this product',
        db_index=True
    )
    
    # Many-to-many relationship with CustomerGroupSellingChannel through a custom junction model
    customer_group_selling_channels = models.ManyToManyField(
        'customers.CustomerGroupSellingChannel',
        through='products.CustomerGroupSellingChannelProduct',
        related_name='products',
        blank=True,
        help_text="Customer group and selling channel combinations that have access to this product"
    )
    
    class Meta:
        unique_together = [
            ('client_id', 'slug')
        ]
        ordering = ['name']
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        # Generate slug if not provided
        if not self.slug:
            self.slug = slugify(self.name)
            
            # Ensure slug uniqueness within tenant
            original_slug = self.slug
            counter = 1
            while Product.objects.filter(client_id=self.client_id, slug=self.slug).exists():
                self.slug = f"{original_slug}-{counter}"
                counter += 1
        
        super().save(*args, **kwargs)


class ProductImage(TimestampedModel):
    """
    ProductImage model for storing product images.
    
    Each product can have multiple images, with one designated as the default.
    Images can be associated with either a product or a variant, but not both.
    """
    client_id = models.IntegerField(default=1)
    company_id = models.IntegerField(default=1)
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='images',
        null=True,
        blank=True
    )
    variant = models.ForeignKey(
        'ProductVariant',
        on_delete=models.CASCADE,
        related_name='images',
        null=True,
        blank=True
    )
    image = models.ImageField(upload_to='products/', blank=True, null=True)
    alt_text = models.CharField(max_length=255, blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_default = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['product', 'variant', 'sort_order']
        constraints = [
            models.CheckConstraint(
                check=(
                    models.Q(product__isnull=False, variant__isnull=True) | 
                    models.Q(product__isnull=True, variant__isnull=False)
                ),
                name='product_xor_variant'
            )
        ]
    
    def __str__(self):
        if self.product:
            return f"Image for {self.product.name}"
        elif self.variant:
            return f"Image for variant {self.variant.sku}"
        return "Unlinked image"
    
    def save(self, *args, **kwargs):
        # If this image is set as default, ensure no other image for this product/variant is default
        if self.is_default:
            if self.product:
                ProductImage.objects.filter(
                    client_id=self.client_id,
                    product=self.product,
                    is_default=True
                ).update(is_default=False)
            elif self.variant:
                ProductImage.objects.filter(
                    client_id=self.client_id,
                    variant=self.variant,
                    is_default=True
                ).update(is_default=False)
        
        # If this is the first image for the product/variant, make it default
        if not self.pk:
            if self.product and not ProductImage.objects.filter(client_id=self.client_id, product=self.product).exists():
                self.is_default = True
            elif self.variant and not ProductImage.objects.filter(client_id=self.client_id, variant=self.variant).exists():
                self.is_default = True
        
        super().save(*args, **kwargs)


class ProductAttributeValue(TimestampedModel):
    """
    ProductAttributeValue model for storing attribute values for products.
    
    This model stores values for non-variant attributes assigned to a product.
    Variant-defining attributes are handled via ProductVariant.
    """
    client_id = models.IntegerField(default=1)
    company_id = models.IntegerField(default=1)
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='attribute_values'
    )
    attribute = models.ForeignKey(
        'attributes.Attribute',
        on_delete=models.CASCADE,
        related_name='product_values'
    )
    
    # Value fields based on attribute data_type
    value_text = models.TextField(null=True, blank=True)
    value_number = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    value_boolean = models.BooleanField(null=True, blank=True)
    value_date = models.DateField(null=True, blank=True)
    value_option = models.ForeignKey(
        'attributes.AttributeOption',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='product_values_single'
    )
    
    class Meta:
        unique_together = ('client_id', 'product', 'attribute')
        ordering = ['product', 'attribute']
    
    def __str__(self):
        return f"{self.product.name} - {self.attribute.name}"
    
    def clean(self):
        from django.core.exceptions import ValidationError
        from attributes.models import Attribute
        
        # Ensure the correct value field is populated based on attribute.data_type
        if self.attribute.data_type == Attribute.AttributeDataType.TEXT and not self.value_text:
            raise ValidationError({'value_text': 'This field is required for text attributes.'})
        elif self.attribute.data_type == Attribute.AttributeDataType.NUMBER and self.value_number is None:
            raise ValidationError({'value_number': 'This field is required for number attributes.'})
        elif self.attribute.data_type == Attribute.AttributeDataType.BOOLEAN and self.value_boolean is None:
            raise ValidationError({'value_boolean': 'This field is required for boolean attributes.'})
        elif self.attribute.data_type == Attribute.AttributeDataType.DATE and not self.value_date:
            raise ValidationError({'value_date': 'This field is required for date attributes.'})
        elif self.attribute.data_type == Attribute.AttributeDataType.SELECT and not self.value_option:
            raise ValidationError({'value_option': 'This field is required for select attributes.'})
        
        # Ensure value_option belongs to the correct attribute
        if self.value_option and self.value_option.attribute != self.attribute:
            raise ValidationError({'value_option': 'Selected option does not belong to this attribute.'})


# M2M relationship for MULTI_SELECT attributes
class ProductAttributeMultiValue(models.Model):
    """
    Model for storing multiple attribute option values for MULTI_SELECT attributes.
    """
    product_attribute_value = models.ForeignKey(
        ProductAttributeValue,
        on_delete=models.CASCADE,
        related_name='multi_values'
    )
    attribute_option = models.ForeignKey(
        'attributes.AttributeOption',
        on_delete=models.CASCADE,
        related_name='product_values_multi'
    )
    
    class Meta:
        unique_together = ('product_attribute_value', 'attribute_option')
    
    def __str__(self):
        return f"{self.product_attribute_value} - {self.attribute_option.option_label}"


class ProductVariant(TimestampedModel):
    """
    ProductVariant model for representing specific, purchasable variations of a PARENT type product.
    
    Each variant is linked to a parent Product and is distinguished by a combination of
    selected AttributeOptions (e.g., Color: Red, Size: Small).
    """
    # Tenant and product references
    client_id = models.IntegerField(default=1)
    company_id = models.IntegerField(default=1)
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='variants',
        limit_choices_to={'product_type': PRODUCT_TYPE_CHOICES.PARENT}
    )
    
    # Options defining this variant (e.g., Red, Small)
    options = models.ManyToManyField(
        'attributes.AttributeOption',
        related_name='variants',
        help_text='Attribute options defining this variant (e.g., Red, Small)'
    )
    
    # Core variant fields
    sku = models.CharField(max_length=100)
    display_price = models.DecimalField(max_digits=12, decimal_places=2)
    is_active = models.BooleanField(default=True)
    quantity_on_hand = models.IntegerField(default=0)
    
    # Optional variant-specific default image
    image = models.ForeignKey(
        ProductImage,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='variant_default_image',
        help_text='Optional variant-specific default image.'
    )
    
    # Status override for this variant
    status_override = models.ForeignKey(
        'products.ProductStatus',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='variant_statuses',
        help_text='Optional override of the parent product status.'
    )
    
    class Meta:
        unique_together = ('client_id', 'sku')
        ordering = ['product', 'sku']
        verbose_name = 'Product Variant'
        verbose_name_plural = 'Product Variants'
    
    def get_options_display(self):
        """
        Helper method to display options concisely.
        
        Returns a comma-separated string of option labels, ordered by attribute name.
        """
        return ", ".join(opt.option_label for opt in self.options.all().order_by('attribute__name'))
    
    def __str__(self):
        return f"{self.product.name} - {self.get_options_display()} ({self.sku})"


class KitComponent(TimestampedModel):
    """
    KitComponent model for linking a KIT type product to its constituent components.
    
    This model captures the structure of a kit/bundle product, distinguishing between
    required base components and swappable options (where variants of a parent product
    can be selected).
    """
    # Tenant reference
    client_id = models.IntegerField(default=1)
    company_id = models.IntegerField(default=1)
    
    # Link to the Kit product
    kit_product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='kit_components',
        limit_choices_to={'product_type': PRODUCT_TYPE_CHOICES.KIT},
        help_text='The KIT product that contains this component'
    )
    
    # Component Definition (ONE of these must be set per component)
    component_product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name='+',  # No reverse relation needed
        null=True,
        blank=True,
        limit_choices_to={'product_type': PRODUCT_TYPE_CHOICES.REGULAR},
        help_text='Link to a REGULAR product component OR the PARENT product for a swappable group.'
    )
    
    component_variant = models.ForeignKey(
        ProductVariant,
        on_delete=models.PROTECT,
        related_name='+',  # No reverse relation needed
        null=True,
        blank=True,
        help_text='Link to a specific VARIANT product component.'
    )
    
    # Quantity of this component in the kit
    quantity = models.PositiveIntegerField(default=1)
    
    # Swappable group flag
    is_swappable_group = models.BooleanField(
        default=False,
        help_text='If True, component_product MUST be a PARENT product, and its variants are the options.'
    )
    
    class Meta:
        ordering = ['kit_product', 'id']
        verbose_name = 'Kit Component'
        verbose_name_plural = 'Kit Components'
        constraints = [
            # Ensure component_product or component_variant is set, but not both
            models.CheckConstraint(
                check=(
                    models.Q(component_product__isnull=False) & models.Q(component_variant__isnull=True) |
                    models.Q(component_product__isnull=True) & models.Q(component_variant__isnull=False)
                ),
                name='component_product_or_variant_set'
            ),
            # Ensure if swappable, component_product is set (and should be PARENT - validated elsewhere)
            models.CheckConstraint(
                check=models.Q(is_swappable_group=False) | models.Q(component_product__isnull=False),
                name='swappable_requires_component_product'
            ),
            # Ensure if not swappable, component_variant can be set (already covered by first constraint implicitly)
        ]
    
    def get_component_display(self):
        """
        Helper method to get a display string for the component.
        
        Returns the name of the component product or variant.
        """
        if self.component_variant:
            return str(self.component_variant)
        elif self.component_product:
            return self.component_product.name
        return "N/A"
    
    def __str__(self):
        return f"Kit: {self.kit_product.name} -> Component: {self.get_component_display()} (Qty: {self.quantity})"
    
    def clean(self):
        """
        Validate that if is_swappable_group=True, the linked component_product must have product_type=PARENT.
        """
        from django.core.exceptions import ValidationError
        
        if self.is_swappable_group:
            if not self.component_product:
                raise ValidationError({'component_product': 'A component product must be selected for swappable groups.'})
            
            if self.component_product.product_type != PRODUCT_TYPE_CHOICES.PARENT:
                raise ValidationError({
                    'component_product': 'For swappable groups, the component product must be a PARENT type product.'
                })


class CustomerGroupSellingChannelProduct(BaseTenantModel):
    """
    Through model for the many-to-many relationship between CustomerGroupSellingChannel and Product.
    This allows tracking which products are accessible to which customer group and selling channel combinations.
    """
    customer_group_selling_channel = models.ForeignKey(
        'customers.CustomerGroupSellingChannel',
        on_delete=models.CASCADE,
        related_name='product_relationships',
        help_text="Reference to the CustomerGroupSellingChannel relationship",
        db_index=True
    )
    
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.CASCADE,
        related_name='customer_group_selling_channel_relationships',
        help_text="Reference to the Product",
        db_index=True
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this relationship is active",
        db_index=True
    )
    
    class Meta:
        db_table = 'product_product_exclusions'  # Changed from 'products_customer_group_selling_channel_subcategory'
        unique_together = ('customer_group_selling_channel', 'product')
        ordering = ['customer_group_selling_channel', 'product__name']
        indexes = [
            models.Index(
                fields=['customer_group_selling_channel', 'is_active'],
                name='idx_cgscp_cgsc_active'
            ),
            models.Index(
                fields=['product', 'is_active'],
                name='idx_cgscp_product_active'
            ),
            models.Index(
                fields=['customer_group_selling_channel', 'product', 'is_active'],
                name='idx_cgscp_comp_query'
            )
        ]

    def __str__(self):
        return f"{self.customer_group_selling_channel} - {self.product}"


class ProductZoneRestriction(BaseTenantModel):
    """
    Manages product-level shipping zone restrictions (allow/deny lists).
    This model defines which shipping zones a product can or cannot be shipped to.
    """
    class RestrictionMode(models.TextChoices):
        INCLUDE = 'INCLUDE', _('Include')
        EXCLUDE = 'EXCLUDE', _('Exclude')

    product = models.ForeignKey(
        'products.Product',
        on_delete=models.CASCADE,
        related_name='zone_restrictions',
        help_text="The product this restriction applies to"
    )
    
    zone = models.ForeignKey(
        'shipping_zones.ShippingZone',
        on_delete=models.CASCADE,
        related_name='product_restrictions',
        help_text="The shipping zone being included or excluded"
    )
    
    restriction_mode = models.CharField(
        max_length=10,
        choices=RestrictionMode.choices,
        help_text="Whether to include or exclude this zone for the product"
    )

    class Meta:
        db_table = 'product_zone_restrictions'
        unique_together = ('product', 'zone')
        verbose_name = _("Product Zone Restriction")
        verbose_name_plural = _("Product Zone Restrictions")

    def __str__(self):
        return f"{self.product} - {self.zone} ({self.restriction_mode})"


class ProductVisibility(BaseTenantModel):
    """
    Stores the calculated visibility of products for different customer group and selling channel combinations.
    This is a materialized view of product visibility based on all exclusion rules.
    """
    product = models.ForeignKey(
        'products.Product',
        on_delete=models.CASCADE,
        related_name='visibility_records',
        db_index=True
    )
    
    customer_group_selling_channel = models.ForeignKey(
        'customers.CustomerGroupSellingChannel',
        on_delete=models.CASCADE,
        related_name='product_visibility_records',
        db_index=True
    )
    
    # Category and classification references
    division = models.ForeignKey(
        Division,
        on_delete=models.PROTECT,
        related_name='product_visibilities',
        null=True,
        help_text='Division this product belongs to',
        db_index=True
    )
    
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name='product_visibilities',
        help_text='Category this product belongs to',
        db_index=True
    )
    
    subcategory = models.ForeignKey(
        Subcategory,
        on_delete=models.PROTECT,
        related_name='product_visibilities',
        null=True,
        blank=True,
        help_text='Subcategory this product belongs to',
        db_index=True
    )
    
    is_visible = models.BooleanField(
        default=True,
        help_text="Whether this product is visible to this customer group and selling channel",
        db_index=True
    )
    
    last_calculated = models.DateTimeField(
        auto_now=True,
        help_text="When this visibility record was last calculated",
        db_index=True
    )
    
    class Meta:
        db_table = 'product_visibility'
        unique_together = ('product', 'customer_group_selling_channel')
        indexes = [
            # Single-column indexes (handled by db_index=True in fields)
            # Composite indexes for common query patterns
            models.Index(fields=['is_visible', 'last_calculated'], name='idx_visibility_status_date'),
            models.Index(fields=['category', 'is_visible', 'last_calculated'], name='idx_category_visibility_date'),
            models.Index(fields=['division', 'category', 'is_visible'], name='idx_division_category_visible'),
            models.Index(fields=['subcategory', 'is_visible'], name='idx_subcategory_visible', condition=models.Q(subcategory__isnull=False)),
            models.Index(fields=['product', 'is_visible', 'last_calculated'], name='idx_product_visibility_status'),
        ]