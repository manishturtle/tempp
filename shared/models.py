"""
Shared models for use across the application.

These models are stored in the public schema and are accessible to all tenants.
"""
from django.db import models
from django.utils import timezone


class TimestampedModel(models.Model):
    """
    An abstract base class that provides self-updating
    `created_at` and `updated_at` fields with audit fields.
    """
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by_id = models.BigIntegerField(null=True, blank=True)
    updated_by_id = models.BigIntegerField(null=True, blank=True)

    class Meta:
        abstract = True


class Country(TimestampedModel):
    """
    Country model for use across the application.
    
    This model is stored in the public schema and accessible to all tenants.
    It provides a standard list of countries with ISO codes.
    """
    id = models.AutoField(primary_key=True)
    iso_code = models.CharField(max_length=2, unique=True)
    name = models.CharField(max_length=100, unique=True)
    is_active = models.BooleanField(default=True)
    flag_url = models.URLField(blank=True, null=True)
    phone_code = models.CharField(max_length=10, blank=True, null=True)
    iso_code_3 = models.CharField(max_length=3, unique=True, null=True, blank=True)
    client_id = models.BigIntegerField(default=1, editable=False, db_index=True)
    company_id = models.BigIntegerField(default=1, editable=False)
    
    class Meta:
        verbose_name_plural = "Countries"
        ordering = ['name']
    
    def __str__(self):
        return self.name


class Currency(TimestampedModel):
    """
    Currency model for use across the application.
    
    This model is stored in the public schema and accessible to all tenants.
    It provides a standard list of currencies with ISO codes.
    """
    id = models.AutoField(primary_key=True)
    code = models.CharField(max_length=3, unique=True)
    name = models.CharField(max_length=100, unique=True)
    symbol = models.CharField(max_length=5)
    is_active = models.BooleanField(default=True)
    exchange_rate_to_usd = models.DecimalField(
        max_digits=14, 
        decimal_places=6,
        default=1.0,
        help_text="Exchange rate to USD"
    )
    client_id = models.BigIntegerField(default=1, editable=False, db_index=True)
    company_id = models.BigIntegerField(default=1, editable=False)
    
    class Meta:
        verbose_name_plural = "Currencies"
        ordering = ['code']
    
    def __str__(self):
        return f"{self.name} ({self.code})"
