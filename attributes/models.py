"""
Models for the attributes app.

This module defines models for managing product attributes: AttributeGroup,
Attribute, and AttributeOption, which provide the structure for defining
reusable product characteristics, their types, validation rules, and allowed
options, all within a tenant's context.
"""
from django.db import models
from django.db.models import Q
from core.models.base import AuditableModel


class AttributeGroup(AuditableModel):
    """
    Attribute group model for grouping related attributes.
    
    Attribute groups help organize attributes into logical categories,
    such as "Technical Specifications", "Physical Dimensions", etc.
    """
    client_id = models.IntegerField(default=1)
    company_id = models.IntegerField(default=1)
    name = models.CharField(max_length=100)
    display_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        unique_together = ('client_id', 'name')
        ordering = ['display_order', 'name']
    
    def __str__(self):
        return self.name


class Attribute(AuditableModel):
    """
    Attribute model for defining product characteristics.
    
    Attributes define the characteristics that can be assigned to products,
    such as color, size, material, etc. Each attribute has a data type and
    optional validation rules.
    """
    class AttributeDataType(models.TextChoices):
        TEXT = 'TEXT', 'Text'
        NUMBER = 'NUMBER', 'Number'
        BOOLEAN = 'BOOLEAN', 'Boolean'
        DATE = 'DATE', 'Date'
        SELECT = 'SELECT', 'Select (Single Choice)'
        MULTI_SELECT = 'MULTI_SELECT', 'Multi-Select (Multiple Choices)'
    
    client_id = models.IntegerField(default=1)
    company_id = models.IntegerField(default=1)
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50)
    label = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    data_type = models.CharField(
        max_length=20,
        choices=AttributeDataType.choices,
        default=AttributeDataType.TEXT
    )
    validation_rules = models.JSONField(blank=True, null=True)
    is_required = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_filterable = models.BooleanField(default=False)
    use_for_variants = models.BooleanField(default=False)
    show_on_pdp = models.BooleanField(default=True)
    groups = models.ManyToManyField(
        AttributeGroup,
        related_name='attributes',
        blank=True
    )
    
    class Meta:
        unique_together = [
            ('client_id', 'name'),
            ('client_id', 'code')
        ]
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.get_data_type_display()})"


class AttributeOption(AuditableModel):
    """
    Attribute option model for defining allowed values for SELECT and MULTI_SELECT attributes.
    
    Attribute options define the allowed values for attributes with data_type
    SELECT or MULTI_SELECT, such as color options (red, blue, green) or
    size options (S, M, L, XL).
    """
    client_id = models.IntegerField(default=1)
    company_id = models.IntegerField(default=1)
    attribute = models.ForeignKey(
        Attribute, 
        on_delete=models.CASCADE, 
        related_name='options',
        limit_choices_to=Q(data_type=Attribute.AttributeDataType.SELECT) | 
                         Q(data_type=Attribute.AttributeDataType.MULTI_SELECT)
    )
    option_label = models.CharField(max_length=100)
    option_value = models.CharField(max_length=100)
    sort_order = models.PositiveIntegerField(default=0)
    
    class Meta:
        unique_together = ('client_id', 'attribute', 'option_value')
        ordering = ['attribute', 'sort_order', 'option_label']
    
    def __str__(self):
        return f"{self.attribute.name}: {self.option_label}"
