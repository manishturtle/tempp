"""
Models for the pricing app.

This module defines models for pricing-related entities such as customer groups,
selling channels, tax rates, and tax rate profiles.
"""
from django.db import models
from django.conf import settings
from core.models.base import TimestampedModel
from core.models.base import BaseTenantModel


class CustomerGroup(TimestampedModel):
    """
    Customer group model for grouping customers for pricing purposes.
    
    Customer groups can be used to define different pricing tiers for different
    groups of customers.
    """
    client_id = models.BigIntegerField(default=1, editable=False, db_index=True)
    company_id = models.BigIntegerField(default=1, editable=False)
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_customer_groups'
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='updated_customer_groups'
    )
    
    class Meta:
        unique_together = ('client_id', 'name')
        ordering = ['name']
    
    def __str__(self):
        return self.name


class SellingChannel(TimestampedModel):
    """
    Selling channel model for defining different sales channels.
    
    Selling channels represent different platforms or methods through which
    products are sold, such as website, mobile app, physical store, etc.
    """
    client_id = models.BigIntegerField(default=1, editable=False, db_index=True)
    company_id = models.BigIntegerField(default=1, editable=False)
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_selling_channels'
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='updated_selling_channels'
    )
    
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['client_id', 'code'], 
                condition=~models.Q(code=''), 
                name='unique_client_code_if_present'
            )
        ]
        unique_together = ('client_id', 'name')
        ordering = ['id']
    
    def __str__(self):
        return self.name


class TaxRate(BaseTenantModel):
    """
    Tax rate model for defining tax rates for different regions and categories.
    
    Tax rates can be defined for specific regions and optionally for specific
    product categories within those regions.
    """
    rate_name = models.CharField(max_length=50)
    tax_type_code = models.CharField(max_length=50, db_index=True)
    rate_percentage = models.DecimalField(max_digits=5, decimal_places=2)
    effective_from = models.DateTimeField(db_index=True)
    effective_to = models.DateTimeField(null=True, blank=True, db_index=True)
    country_code = models.CharField(max_length=2, default='IN', db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    
    class Meta:
        db_table = 'pricing_tax_rates'
        ordering = ['tax_type_code']
        indexes = [
            models.Index(fields=['tax_type_code', 'country_code']),
            models.Index(fields=['country_code', 'is_active']),
            models.Index(fields=['effective_from', 'effective_to']),
        ]
    
    def __str__(self):
        return f"{self.tax_type_code} ({self.rate_percentage}%)"


class TaxRateProfile(BaseTenantModel):
    """
    Tax rate profile model for grouping tax rates by country.
    
    Tax rate profiles define tax configurations for specific countries.
    """
    profile_name = models.CharField(
        max_length=255,
        db_index=True,
        help_text="Unique name for the tax profile, e.g., 'Indian Garments Conditional Tax Profile'"
    )
    description = models.TextField(blank=True, default='')
    country_code = models.CharField(
        max_length=2,
        default='IN',
        db_index=True,
        help_text="ISO 3166-1 alpha-2 country code"
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Designates whether this tax profile is active."
    )
    
    class Meta:
        db_table = 'pricing_taxability_profiles'
        ordering = ['profile_name']
        constraints = [
            models.UniqueConstraint(
                fields=['client_id', 'profile_name'],
                name='unique_client_profile_name'
            )
        ]
    
    def __str__(self):
        return self.profile_name


class Rule(BaseTenantModel):
    """
    Represents a single prioritized IF...THEN block within a TaxabilityProfile.
    """
    taxability_profile = models.ForeignKey(
        'TaxRateProfile',
        on_delete=models.CASCADE,
        related_name='rules'
    )
    priority = models.PositiveIntegerField(
        help_text="Defines the strict order of evaluation."
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Designates whether this rule is active."
    )
    effective_from = models.DateTimeField(
        help_text="When this rule becomes effective."
    )
    effective_to = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When this rule expires (if applicable)."
    )

    class Meta:
        db_table = 'pricing_rules'
        unique_together = ('taxability_profile', 'priority')
        ordering = ['taxability_profile', 'priority']
        indexes = [
            models.Index(fields=['taxability_profile', 'is_active']),
            models.Index(fields=['effective_from', 'effective_to']),
        ]

    def __str__(self):
        return f"Rule {self.id} (Profile {self.taxability_profile_id}, Priority {self.priority})"

class RuleCondition(BaseTenantModel):
    """
    Defines the IF part of a rule.
    A rule is triggered only if all of its conditions are met.
    """
    rule = models.ForeignKey(
        'Rule',
        on_delete=models.CASCADE,
        related_name='conditions'
    )
    attribute_name = models.CharField(
        max_length=100,
        help_text="A hardcoded key, e.g., 'transactional_price' or 'place_of_supply_context'."
    )
    OPERATOR_CHOICES = [
        ('=', 'Equals'),
        ('!=', 'Not Equals'),
        ('>', 'Greater Than'),
        ('>=', 'Greater Than or Equal'),
        ('<', 'Less Than'),
        ('<=', 'Less Than or Equal'),
    ]
    operator = models.CharField(
        max_length=2,
        choices=OPERATOR_CHOICES,
        help_text="Comparison operator."
    )
    condition_value = models.CharField(
        max_length=1000,
        help_text="The value to compare against, e.g., '1000' or 'InterState'."
    )

    class Meta:
        db_table = 'pricing_rule_conditions'
        ordering = ['rule_id', 'id']

    def __str__(self):
        return f"Condition {self.id} for Rule {self.rule_id}: {self.attribute_name} {self.operator} {self.condition_value}"        

class RuleOutcome(BaseTenantModel):
    """
    Defines the THEN part of a rule, linking it to one or more tax rates to be applied.
    """
    rule = models.ForeignKey(
        'Rule',
        on_delete=models.CASCADE,
        related_name='outcomes'
    )
    tax_rate = models.ForeignKey(
        'TaxRate',
        on_delete=models.CASCADE,
        related_name='rule_outcomes'
    )


    class Meta:
        db_table = 'pricing_rule_outcomes'
        ordering = ['rule', 'id']

    def __str__(self):
        return f"Outcome {self.id} for Rule {self.rule_id}: TaxRate {self.tax_rate_id}, Order {self.calculation_order}, Base {self.calculated_on_base}"