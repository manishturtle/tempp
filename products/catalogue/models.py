from django.db import models
from django.conf import settings
from core.models.base import AuditableModel
from core.models import BaseTenantModel


# Keeping this for backward compatibility but not using it anymore
class TimestampedModel(models.Model):
    """
    An abstract base model that provides self-updating
    created_at and updated_at fields.
    """
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Division(AuditableModel):
    """
    Division model represents the highest level in the product catalogue hierarchy.
    """
    client_id = models.IntegerField(default=1, editable=False, help_text="External client identifier (fixed value)")
    company_id = models.IntegerField(default=1, editable=False, help_text="External company identifier (fixed value)")
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='divisions/', blank=True, null=True)
    image_alt_text = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)
    
    # Many-to-many relationship with CustomerGroupSellingChannel through a custom junction model
    customer_group_selling_channels = models.ManyToManyField(
        'customers.CustomerGroupSellingChannel',
        through='products.CustomerGroupSellingChannelDivision',
        related_name='divisions',
        blank=True,
        help_text="Customer group and selling channel combinations that have access to this division"
    )

    class Meta:
        unique_together = ('client_id', 'name')
        ordering = ['id']

    def __str__(self):
        return self.name


class CustomerGroupSellingChannelDivision(BaseTenantModel):
    """
    Through model for the many-to-many relationship between CustomerGroupSellingChannel and Division.
    This allows tracking which divisions are accessible to which customer group and selling channel combinations.
    """
    customer_group_selling_channel = models.ForeignKey(
        'customers.CustomerGroupSellingChannel',
        on_delete=models.CASCADE,
        related_name='division_relationships',
        help_text="Reference to the CustomerGroupSellingChannel relationship",
        db_index=True  # Index for faster lookups
    )
    
    division = models.ForeignKey(
        'products.Division',
        on_delete=models.CASCADE,
        related_name='customer_group_selling_channel_relationships',
        help_text="Reference to the Division",
        db_index=True  # Index for faster lookups
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this relationship is active",
        db_index=True  # Index for filtering active/inactive relationships
    )
    
    class Meta:
        db_table = 'product_division_exclusions'  # Changed from 'products_customer_group_selling_channel_division'
        unique_together = ('customer_group_selling_channel', 'division')
        ordering = ['customer_group_selling_channel', 'division__name']
        indexes = [
            # Composite index for queries filtering on both fields
            models.Index(
                fields=['customer_group_selling_channel', 'is_active'],
                name='idx_cgscd_cgsc_active'
            ),
            # Composite index for queries filtering on division and active status
            models.Index(
                fields=['division', 'is_active'],
                name='idx_cgscd_division_active'
            ),
            # Composite index for the common query pattern
            models.Index(
                fields=['customer_group_selling_channel', 'division', 'is_active'],
                name='idx_cgscd_comp_query'
            )
        ]
    
    def __str__(self):
        return f"{self.customer_group_selling_channel} - {self.division}"

class Category(AuditableModel):
    """
    Category model represents the middle level in the product catalogue hierarchy.
    """
    client_id = models.IntegerField(default=1, editable=False, help_text="External client identifier (fixed value)")
    company_id = models.IntegerField(default=1, editable=False, help_text="External company identifier (fixed value)")
    division = models.ForeignKey(
        Division, 
        on_delete=models.CASCADE, 
        related_name='categories'
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='categories/', blank=True, null=True)
    
    # Many-to-many relationship with CustomerGroupSellingChannel through a custom junction model
    customer_group_selling_channels = models.ManyToManyField(
        'customers.CustomerGroupSellingChannel',
        through='products.CustomerGroupSellingChannelCategory',
        related_name='categories',
        blank=True,
        help_text="Customer group and selling channel combinations that have access to this category"
    )
    image_alt_text = models.CharField(max_length=255, blank=True)
    default_tax_rate_profile = models.ForeignKey(
        'pricing.TaxRateProfile', 
        on_delete=models.PROTECT,  # Changed from SET_NULL to PROTECT since it's required
        related_name='default_for_categories',
        help_text='Default tax rate profile for products in this category'
    )
    tax_inclusive = models.BooleanField(
        default=False,
        help_text='Whether prices for products in this category include tax by default'
    )
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'products_category'
        unique_together = ('client_id', 'division', 'name')
        ordering = ['division__name', 'sort_order', 'name']
       

    def __str__(self):
        return f"{self.division.name} > {self.name}"

class CustomerGroupSellingChannelCategory(BaseTenantModel):
    """
    Through model for the many-to-many relationship between CustomerGroupSellingChannel and Category.
    This allows tracking which categories are accessible to which customer group and selling channel combinations.
    """
    customer_group_selling_channel = models.ForeignKey(
        'customers.CustomerGroupSellingChannel',
        on_delete=models.CASCADE,
        related_name='category_relationships',
        help_text="Reference to the CustomerGroupSellingChannel relationship",
        db_index=True
    )
    
    category = models.ForeignKey(
        'products.Category',
        on_delete=models.CASCADE,
        related_name='customer_group_selling_channel_relationships',
        help_text="Reference to the Category",
        db_index=True
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this relationship is active",
        db_index=True
    )
    
    class Meta:
        db_table = 'product_category_exclusions'  # Changed from 'products_customer_group_selling_channel_category'
        unique_together = ('customer_group_selling_channel', 'category')
        ordering = ['customer_group_selling_channel', 'category__name']
        indexes = [
            models.Index(
                fields=['customer_group_selling_channel', 'is_active'],
                name='idx_cgscc_cgsc_active'
            ),
            models.Index(
                fields=['category', 'is_active'],
                name='idx_cgscc_category_active'
            ),
            models.Index(
                fields=['customer_group_selling_channel', 'category', 'is_active'],
                name='idx_cgscc_comp_query'
            )
        ]
    
    def __str__(self):
        return f"{self.customer_group_selling_channel} - {self.category}"

class Subcategory(AuditableModel):
    """
    Subcategory model represents the lowest level in the product catalogue hierarchy.
    """
    client_id = models.IntegerField(default=1, editable=False, help_text="External client identifier (fixed value)")
    company_id = models.IntegerField(default=1, editable=False, help_text="External company identifier (fixed value)")
    category = models.ForeignKey(
        Category, 
        on_delete=models.CASCADE, 
        related_name='subcategories'
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='subcategories/', blank=True, null=True)
    image_alt_text = models.CharField(max_length=255, blank=True)
    
    # Many-to-many relationship with CustomerGroupSellingChannel through a custom junction model
    customer_group_selling_channels = models.ManyToManyField(
        'customers.CustomerGroupSellingChannel',
        through='products.CustomerGroupSellingChannelSubcategory',
        related_name='subcategories',
        blank=True,
        help_text="Customer group and selling channel combinations that have access to this subcategory"
    )
    workflow_flow_id = models.IntegerField(
        null=True,
        blank=True,
        help_text="Future foreign key to workflow flow"
    )
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ('client_id', 'category', 'name')
        ordering = ['id']

    def __str__(self):
        return f"{self.category} > {self.name}"


class CustomerGroupSellingChannelSubcategory(BaseTenantModel):
    """
    Through model for the many-to-many relationship between CustomerGroupSellingChannel and Subcategory.
    This allows tracking which subcategories are accessible to which customer group and selling channel combinations.
    """
    customer_group_selling_channel = models.ForeignKey(
        'customers.CustomerGroupSellingChannel',
        on_delete=models.CASCADE,
        related_name='subcategory_relationships',
        help_text="Reference to the CustomerGroupSellingChannel relationship",
        db_index=True
    )
    
    subcategory = models.ForeignKey(
        'products.Subcategory',
        on_delete=models.CASCADE,
        related_name='customer_group_selling_channel_relationships',
        help_text="Reference to the Subcategory",
        db_index=True
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this relationship is active",
        db_index=True
    )
    
    class Meta:
        db_table = 'product_subcategory_exclusions'  # Changed from 'products_customer_group_selling_channel_subcategory'
        unique_together = ('customer_group_selling_channel', 'subcategory')
        ordering = ['customer_group_selling_channel', 'subcategory__name']
        indexes = [
            models.Index(
                fields=['customer_group_selling_channel', 'is_active'],
                name='idx_cgscs_cgsc_active'
            ),
            models.Index(
                fields=['subcategory', 'is_active'],
                name='idx_cgscs_subcategory_active'
            ),
            models.Index(
                fields=['customer_group_selling_channel', 'subcategory', 'is_active'],
                name='idx_cgscs_comp_query'
            )
        ]
    
    def __str__(self):
        return f"{self.customer_group_selling_channel} - {self.subcategory}"


class UomType(models.TextChoices):
    """
    Choices for Unit of Measure types.
    """
    COUNTABLE = 'COUNTABLE', 'Countable'
    MEASURABLE = 'MEASURABLE', 'Measurable'


class UnitOfMeasure(AuditableModel):
    """
    UnitOfMeasure model represents the units used to measure products.
    """
    client_id = models.IntegerField(default=1, editable=False, help_text="External client identifier (fixed value)")
    company_id = models.IntegerField(default=1, editable=False, help_text="External company identifier (fixed value)")
    name = models.CharField(max_length=50)  # e.g., Pieces, Kilograms, Liters
    symbol = models.CharField(max_length=10)  # e.g., PCS, KG, LTR
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    unit_type = models.CharField(
        max_length=10, 
        choices=UomType.choices, 
        default=UomType.COUNTABLE,
        help_text="Determines if the unit is typically counted in whole numbers or measured with decimal values"
    )
    associated_value = models.DecimalField(
        max_digits=10, 
        decimal_places=4, 
        null=True, 
        blank=True,
        help_text="Numeric value associated with this unit of measure"
    )

    class Meta:
        unique_together = [('client_id', 'symbol'), ('client_id', 'name')]
        ordering = ['name']

    def __str__(self):
        return self.name


class ProductStatus(AuditableModel):
    """
    ProductStatus model represents the possible statuses of products.
    """
    client_id = models.IntegerField(default=1, editable=False, help_text="External client identifier (fixed value)")
    company_id = models.IntegerField(default=1, editable=False, help_text="External company identifier (fixed value)")
    name = models.CharField(max_length=50)  # e.g., New, Available, Discontinued, Pre-Order
    description = models.TextField(blank=True, help_text="Optional description of the product status")
    is_active = models.BooleanField(default=True, help_text="Whether this status is active and available for use")
    is_orderable = models.BooleanField(default=True, help_text="Can products with this status be ordered?")

    class Meta:
        unique_together = ('client_id', 'name')
        ordering = ['id']

    def __str__(self):
        return self.name
