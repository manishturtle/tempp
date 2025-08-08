from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from core.models.base import TimestampedModel

class Tenant(models.Model):
    """
    Tenant model for multi-tenancy support.
    
    This model will be extended with TenantMixin from django-tenants when
    we implement full multi-tenancy support.
    """
    client_id = models.IntegerField(default=1, editable=False, help_text="External client identifier (fixed value)")
    name = models.CharField(max_length=100)
    schema_name = models.CharField(max_length=63, unique=True)
    paid_until = models.DateField(null=True, blank=True)
    on_trial = models.BooleanField(default=True)
    created_on = models.DateField(auto_now_add=True)
    
    def __str__(self):
        return self.name


class Domain(models.Model):
    """
    Domain model for multi-tenancy support.
    
    This model will be extended with DomainMixin from django-tenants when
    we implement full multi-tenancy support.
    """
    domain = models.CharField(max_length=253, unique=True)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='domains')
    is_primary = models.BooleanField(default=True)
    
    def __str__(self):
        return self.domain


class TenantSetting(TimestampedModel):
    """
    Settings model for tenant-specific configuration.
    
    This model stores various settings and preferences for each tenant,
    such as currency, tax settings, and product-related configurations.
    """
    client = models.OneToOneField(
        Tenant, 
        on_delete=models.CASCADE, 
        primary_key=True, 
        related_name='settings'
    )
    base_currency = models.CharField(max_length=3, default='USD')
    tax_inclusive_pricing_global = models.BooleanField(default=False)
    customer_group_pricing_enabled = models.BooleanField(default=False)
    product_reviews_enabled = models.BooleanField(default=True)
    product_reviews_auto_approval = models.BooleanField(default=False)
    inventory_management_enabled = models.BooleanField(default=True)
    backorders_enabled = models.BooleanField(default=False)
    sku_prefix = models.CharField(max_length=10, blank=True, default='SKU-')
    sku_include_attributes = models.BooleanField(default=False)
    sku_format = models.CharField(max_length=100, blank=True, default='{prefix}{product_id}')
    
    def __str__(self):
        return f"Settings for {self.client.name}"


@receiver(post_save, sender=Tenant)
def create_tenant_settings(sender, instance, created, **kwargs):
    """
    Signal handler to automatically create TenantSetting when a new Tenant is created.
    
    This ensures that every tenant has a settings object associated with it.
    """
    if created:
        TenantSetting.objects.create(client=instance)
