from django.db import models
from core.models.base import BaseTenantModel


class PincodeMaster(BaseTenantModel):
    """
    Immutable master table for Indian pincodes.
    This table serves as the single source of truth for all Indian pincodes
    and is shared across all tenants for reference and validation.
    """
    pincode = models.CharField(
        max_length=10,
        help_text="6-digit Indian Pincode",
        db_index=True
    )
    city = models.CharField(
        max_length=100,
        help_text="Primary city/post office name",
        db_index=True,
        null=True,
        blank=True
    )
    district = models.CharField(
        max_length=100,
        help_text="District name",
        db_index=True
    )
    state = models.CharField(
        max_length=100,
        help_text="State name",
        db_index=True
    )
    country_code = models.CharField(
        max_length=2,
        default='IN',
        help_text="ISO 3166-1 alpha-2 country code",
        db_index=True
    )

    class Meta:
        db_table = 'shipping_zones_pincode_master'
        verbose_name = 'Pincode Master'
        verbose_name_plural = 'Pincode Master'
        ordering = ['pincode']
        # Composite unique constraint to allow same pincode with different cities
        unique_together = ('pincode', 'city', 'district')
        indexes = [
            models.Index(fields=['pincode']),  # Explicit index on primary key
            models.Index(fields=['city', 'state']),
            models.Index(fields=['district', 'state']),
            models.Index(fields=['state']),
            models.Index(fields=['country_code']),
        ]

    def __str__(self):
        return f"{self.pincode} - {self.city}, {self.district}, {self.state}"

    def save(self, *args, **kwargs):
        # Ensure pincode is stored as a 6-digit string
        self.pincode = str(self.pincode).strip().zfill(6)
        super().save(*args, **kwargs)


class ShippingZone(BaseTenantModel):
    """
    Defines atomic geographic building blocks for shipping.
    Each zone is a named container that can be assigned pincodes.
    """
    zone_name = models.CharField(
        max_length=255,
        unique=True,
        help_text="A unique, human-readable name (e.g., 'Surat Metro', 'Pune Rural')",
        db_index=True
    )
    description = models.TextField(
        blank=True,
        null=True,
        help_text="Optional internal description of the zone"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Enable or disable the zone"
    )

    class Meta:
        db_table = 'shipping_zones'
        verbose_name = 'Shipping Zone'
        verbose_name_plural = 'Shipping Zones'
        ordering = ['zone_name']

    def __str__(self):
        return self.zone_name


class PincodeZoneAssignment(BaseTenantModel):
    """
    Maps pincodes to shipping zones for each tenant.
    Implements a many-to-one relationship between PincodeMaster and ShippingZone.
    """
    pincode = models.OneToOneField(
        'PincodeMaster',
        on_delete=models.CASCADE,
        related_name='zone_assignment',
        help_text="The pincode being assigned to a zone"
    )
    zone = models.ForeignKey(
        'ShippingZone',
        on_delete=models.CASCADE,
        related_name='assigned_pincodes',
        help_text="The zone this pincode belongs to"
    )

    class Meta:
        db_table = 'shipping_zone_pincode_assignments'
        verbose_name = 'Pincode Zone Assignment'
        verbose_name_plural = 'Pincode Zone Assignments'
        constraints = [
            models.UniqueConstraint(
                fields=['pincode', 'client_id'],
                name='unique_pincode_per_tenant'
            ),
        ]
        indexes = [
            models.Index(fields=['pincode']),  # For reverse lookups
            models.Index(fields=['zone']),     # For filtering by zone
        ]

    def __str__(self):
        return f"{self.pincode.pincode} → {self.zone.zone_name}"

    def clean(self):
        """
        Ensure that a pincode can only be assigned to one zone per tenant.
        """
        if PincodeZoneAssignment.objects.filter(
            pincode=self.pincode,
            client_id=self.client_id
        ).exclude(pk=self.pk).exists():
            raise ValidationError(
                'This pincode is already assigned to a zone for this tenant.'
            )

