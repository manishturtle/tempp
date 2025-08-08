from django.db import models
from products.catalogue.models import Division
from core.models.base import BaseTenantModel
from django.utils.translation import gettext_lazy as _


class HeaderConfiguration(BaseTenantModel):
    """
    Singleton model for storing the header configuration.
    Only one instance of this model should exist per client.
    """
    name = models.CharField(max_length=100, default=_("Main Site Header Config"))
    
    class Meta:
        verbose_name = _("Header Configuration")
        verbose_name_plural = _("Header Configurations")
        unique_together = ('client_id', 'name')
    
    def __str__(self):
        return f"{self.name} (Client: {self.client_id})"
    
    def save(self, *args, **kwargs):
        """Override save method to enforce singleton pattern per client."""
        # If there's already an instance for this client, update it instead of creating a new one
        existing = HeaderConfiguration.objects.filter(client_id=self.client_id).first()
        if existing and not self.pk:
            self.pk = existing.pk
        
        super().save(*args, **kwargs)


class HeaderDivisionOrder(BaseTenantModel):
    """
    Model to store the order of divisions displayed in the header.
    """
    header_config = models.ForeignKey(
        HeaderConfiguration, 
        on_delete=models.CASCADE, 
        related_name="division_order"
    )
    division = models.ForeignKey(
        Division, 
        on_delete=models.CASCADE,
        related_name="+"
    )
    order = models.PositiveIntegerField(default=0)
    
    class Meta:
        ordering = ['order']
        unique_together = ('client_id', 'header_config', 'division')
        verbose_name = _("Header Division Order")
        verbose_name_plural = _("Header Division Orders")
    
    def __str__(self):
        return f"{self.division.name} (Order: {self.order})"
