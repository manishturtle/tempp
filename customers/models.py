"""
Models for the customers app.

This module defines models for customer-related entities such as customers,
customer addresses, and customer groups.

Note: Future Implementation Requirements:
1. Logic to automatically populate created_by and updated_by fields based on the current user
   will be implemented via middleware or model save overrides.
2. Logic to dynamically set the correct client_id and company_id based on tenant context
   will be implemented in a later phase.
3. These fields provide the foundation for detailed audit trails as specified in
   Functional Specification Section 8.2.3.
"""

from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils.functional import cached_property
from django.db.models.signals import post_save
from django.dispatch import receiver
from core.models import BaseTenantModel
from pricing.models import SellingChannel


class Customer(BaseTenantModel):
    """
    Customer model for managing customer information.

    This model stores basic customer information and serves as the central
    entity for customer-related data.
    """

    # Fields will be defined based on detailed requirements
    name = models.CharField(max_length=255, help_text="Customer name")
    # Additional fields will be added later

    def __str__(self):
        return self.name


class CustomerAddress(BaseTenantModel):
    """
    Model for storing customer addresses.

    This model allows customers to have multiple addresses for different purposes
    such as billing, shipping, etc.
    """

    # Fields will be defined based on detailed requirements
    customer = models.ForeignKey(
        Customer, on_delete=models.CASCADE, related_name="addresses"
    )
    # Additional fields will be added later

    def __str__(self):
        return f"Address for {self.customer}"


class CustomerNote(BaseTenantModel):
    """
    Model for storing notes related to customers.

    This model allows storing internal notes about customers.
    """

    # Fields will be defined based on detailed requirements
    customer = models.ForeignKey(
        Customer, on_delete=models.CASCADE, related_name="notes"
    )
    # Additional fields will be added later

    def __str__(self):
        return f"Note for {self.customer}"


class CustomerGroup(BaseTenantModel):
    """
    Customer group model for grouping customers for pricing and other purposes.

    Customer groups can be used to define different pricing tiers, access levels,
    and other group-specific settings for different groups of customers.

    Ref: Functional Specification Section 2.1.2 (Revised)
    """

    GROUP_TYPE_CHOICES = [
        ("BUSINESS", "Business"),
        ("INDIVIDUAL", "Individual"),
        ("GOVERNMENT", "Government"),
    ]

    group_name = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        blank=False,
        null=False,
        help_text="Unique name for the customer group within this tenant (e.g., Wholesale, VIP).",
    )
    group_type = models.CharField(
        max_length=20,
        choices=GROUP_TYPE_CHOICES,
        db_index=True,
        blank=False,
        null=False,
        help_text="Fundamental type of entity this group represents.",
    )

    display_name = models.CharField(
        max_length=150,
        blank=True,
        null=True,
        help_text="Optional display name for the customer group (for UI display, i18n, etc.)."
    )
    description = models.TextField(
        blank=True,
        null=True,
        help_text="Optional description for this customer group."
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Is this group available for assignment to Accounts within this tenant?",
    )

    def __str__(self):
        return self.group_name

    # Many-to-many relationship with SellingChannel through a custom junction model
    selling_channels = models.ManyToManyField(
        SellingChannel,
        through="customers.CustomerGroupSellingChannel",
        related_name="customer_groups",
        blank=True,
        help_text="Selling channels this customer group has access to",
    )

    class Meta:
        verbose_name = "Customer Group"
        verbose_name_plural = "Customer Groups"
        unique_together = [("group_name",)]
        ordering = ["group_name"]


class CustomerGroupSellingChannel(BaseTenantModel):
    """
    Model for managing the many-to-many relationship between CustomerGroup and SellingChannel.

    This model allows for additional fields and status tracking on the relationship
    between customer groups and selling channels.
    """

    STATUS_CHOICES = [("ACTIVE", "Active"), ("INACTIVE", "Inactive")]

    customer_group = models.ForeignKey(
        CustomerGroup,
        on_delete=models.CASCADE,
        related_name="selling_channel_relationships",
        db_index=True,
        help_text="Reference to the CustomerGroup",
    )

    selling_channel = models.ForeignKey(
        "pricing.SellingChannel",
        on_delete=models.CASCADE,
        related_name="customer_group_relationships",
        db_index=True,
        help_text="Reference to the SellingChannel",
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="ACTIVE",
        db_index=True,
        help_text="Status of the relationship",
    )

    segment_name = models.CharField(
        max_length=255,
        blank=True,
        db_index=True,
        help_text="Auto-generated segment name in format 'groupname-sellingchannelname'",
    )

    class Meta:
        db_table = "customer_group_selling_channel"
        unique_together = ("customer_group", "selling_channel")
        ordering = ["customer_group__group_name", "selling_channel__name"]
        indexes = [
            models.Index(fields=["customer_group", "selling_channel", "status"]),
            models.Index(fields=["status"]),
        ]

    def save(self, *args, **kwargs):
        # Always regenerate segment name before saving
        if self.customer_group and self.selling_channel:
            # Keep original names exactly as they are, just join with a hyphen
            self.segment_name = (
                f"{self.customer_group.group_name}-{self.selling_channel.name}"
            )
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.customer_group.group_name} - {self.selling_channel.name} ({self.status})"


class Account(BaseTenantModel):
    """
    Account model for managing customer accounts.

    This model stores account information for customers within a tenant.
    Accounts can be linked to customer groups and can have multiple addresses.
    Accounts can form hierarchies with parent-child relationships, where child
    accounts (branches) inherit certain properties from their parent.

    Ref: Functional Specification Section 2.2, 2.5, 2.7 (Phase 1 structure)
    """

    name = models.CharField(
        max_length=255, db_index=True, help_text="Primary display name of the Account."
    )
    legal_name = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Official legal name, if different.",
    )
    account_number = models.CharField(
        max_length=50,
        unique=True,
        blank=True,
        null=True,
        help_text="Unique account identifier (can be auto-generated or manually set based on config).",
    )
    customer_group = models.ForeignKey(
        CustomerGroup,
        on_delete=models.PROTECT,
        related_name="accounts",
        null=True,  # Allow null for existing records
        blank=True,  # Allow blank in forms
        help_text="Classification of the account.",
    )
    # Status field replaces is_active with more options
    status = models.CharField(
        max_length=50,
        default="Active",
        db_index=True,
        help_text="e.g., Active, Inactive. Configurable choices later.",
    )
    country = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        db_index=True,
        help_text="Country of the account.",
    )
    parent_account = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="child_accounts",
        help_text="Link to parent account for hierarchy.",
    )
    status = models.CharField(
        max_length=50,
        default="Active",
        db_index=True,
        help_text="e.g., Active, Inactive. Configurable choices later.",
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="owned_accounts",
    )
    website = models.URLField(max_length=255, blank=True, null=True)
    primary_phone = models.CharField(max_length=50, blank=True, null=True)
    industry = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        db_index=True,
        help_text="Primary industry (config picklist later).",
    )
    company_size = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="e.g., 1-10, 11-50. Configurable picklist later.",
    )
    tax_id = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        db_index=True,
        help_text="VAT ID / Tax ID number. Branches can have their own.",
    )
    description = models.TextField(blank=True, null=True)
    custom_fields = models.JSONField(
        default=dict,
        blank=True,
        null=True,
        help_text="Stores basic custom field data as key-value pairs.",
    )

    def get_root_parent(self, max_depth=10):
        """
        Find the root parent account in the hierarchy.

        Args:
            max_depth: Maximum depth to traverse to prevent infinite loops
                       in case of data corruption.

        Returns:
            The root parent account, or self if no parent exists.

        Raises:
            ValidationError: If max_depth is exceeded (potential circular reference).
        """
        if max_depth <= 0:
            raise ValidationError(
                "Maximum hierarchy depth exceeded. Possible circular reference detected."
            )

        if self.parent_account is None:
            return self

        return self.parent_account.get_root_parent(max_depth - 1)

    @cached_property
    def effective_customer_group(self):
        """
        Get the effective customer group for this account.

        For root accounts, this is their own customer_group.
        For branch accounts, this is inherited from the root parent.

        Returns:
            The effective CustomerGroup for this account.
        """
        if self.parent_account:
            return self.get_root_parent().customer_group
        return self.customer_group

    def clean(self):
        """
        Validate the account data.

        Checks:
        1. Prevent circular hierarchies (account can't be its own parent).
        2. Ensure branch accounts inherit customer group from root parent.

        Raises:
            ValidationError: If validation fails.
        """
        super().clean()

        # Check for direct self-reference
        if self.parent_account and self.parent_account == self:
            raise ValidationError("Account cannot be its own parent.")

        # Check for circular references in hierarchy
        if self.pk and self.parent_account:
            current = self.parent_account
            visited = set()

            while current and current not in visited:
                if current.pk == self.pk:
                    raise ValidationError("Circular hierarchy detected.")
                visited.add(current)
                current = current.parent_account

        # Ensure branch accounts inherit customer group from root parent
        if (
            self.parent_account
            and self.customer_group != self.parent_account.effective_customer_group
        ):
            raise ValidationError(
                "Branch accounts must inherit the Customer Group from their "
                "top-level parent. Set the group on the parent account."
            )

    def save(self, *args, **kwargs):
        """
        Save the account, performing validation first.
        """
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Account"
        verbose_name_plural = "Accounts"
        ordering = ["name"]

        # Note: Branch Address Limit (Max 1) enforced in Address model/serializer/form validation.
        # Note: Primary Address Uniqueness (Max 1 Billing, Max 1 Shipping) enforced in Address model/serializer/form validation.


class Contact(BaseTenantModel):
    """
    Contact model for managing individual contacts associated with accounts.

    This model stores contact information for individuals associated with accounts.
    Each contact is linked to exactly one account, but an account can have multiple contacts.

    Ref: Functional Specification Section 2.3 (Phase 1 structure)
    """

    first_name = models.CharField(max_length=100, db_index=True)
    last_name = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    account = models.ForeignKey(
        "Account",
        on_delete=models.CASCADE,
        related_name="contacts",
        help_text="The single Account this Contact is primarily associated with.",
    )
    email = models.EmailField(
        max_length=254,
        unique=True,
        blank=True,
        null=True,
        db_index=True,
        help_text="Primary email address. Uniqueness recommended for non-null values.",
    )
    secondary_email = models.EmailField(max_length=254, blank=True, null=True)
    mobile_phone = models.CharField(max_length=50, blank=True, null=True)
    work_phone = models.CharField(max_length=50, blank=True, null=True)
    job_title = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Relevant for Business/Govt contacts.",
    )
    department = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Relevant for Business/Govt contacts.",
    )
    status = models.CharField(
        max_length=50,
        default="Active",
        db_index=True,
        help_text="e.g., Active, Inactive, Left Company. Configurable choices later.",
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="owned_contacts",
    )
    # Communication Preferences
    email_opt_out = models.BooleanField(
        default=False, help_text="Indicates user does not want marketing emails."
    )
    do_not_call = models.BooleanField(default=False)
    sms_opt_out = models.BooleanField(default=False)
    description = models.TextField(blank=True, null=True)
    custom_fields = models.JSONField(
        default=dict,
        blank=True,
        null=True,
        help_text="Stores basic custom field data as key-value pairs.",
    )
    user_id = models.BigIntegerField(
        blank=True, null=True, help_text="User ID associated with this account."
    )

    @cached_property
    def full_name(self):
        """
        Get the full name of the contact.

        Returns a formatted string containing first_name and last_name,
        handling the case where last_name is null/blank gracefully.

        Returns:
            The full name of the contact.
        """
        if self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.first_name

    def __str__(self):
        return self.full_name

    class Meta:
        verbose_name = "Contact"
        verbose_name_plural = "Contacts"
        ordering = ["last_name", "first_name"]


class ContactAddress(BaseTenantModel):
    """
    Junction model for many-to-many relationship between Contact and Address.

    This model allows contacts to be associated with multiple addresses
    and includes a status field to track the relationship status.
    """

    STATUS_CHOICES = [
        ("ACTIVE", "Active"),
        ("INACTIVE", "Inactive"),
        ("PENDING", "Pending"),
        ("REJECTED", "Rejected"),
    ]

    contact = models.ForeignKey(
        "Contact",
        on_delete=models.CASCADE,
        related_name="contact_addresses",
        help_text="The contact associated with this address.",
        db_column="contact_id",  # Explicit column name
    )

    address = models.ForeignKey(
        "Address",
        on_delete=models.CASCADE,
        related_name="contact_addresses",
        help_text="The address associated with this contact.",
        db_column="address_id",  # Explicit column name
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="ACTIVE",
        db_index=True,
        help_text="Status of the contact-address relationship.",
    )

    class Meta:
        db_table = "customers_contact_address"
        unique_together = ("contact", "address")
        verbose_name = "Contact Address"
        verbose_name_plural = "Contact Addresses"

    def __str__(self):
        return f"Contact {self.contact_id} - Address {self.address_id} ({self.status})"


class Address(BaseTenantModel):
    """
    Model for storing addresses linked to tenant-specific accounts.

    This model allows accounts to have multiple addresses for different purposes
    such as billing, shipping, branch offices, etc.

    Ref: Functional Specification Section 2.5 (Phase 1 structure)
    """

    ADDRESS_TYPE_CHOICES = [
        ("BILLING", "Billing"),
        ("SHIPPING", "Shipping"),
        ("BRANCH", "Branch Office"),
        ("MAILING", "Mailing"),
        ("OTHER", "Other"),
    ]

    ADDRESS_CATEGORY_CHOICES = [
        ("residential", "Residential"),
        ("business", "Business"),
        ("other", "Other"),
    ]

    account = models.ForeignKey(
        "Account",
        on_delete=models.CASCADE,
        related_name="addresses",
        help_text="The Account this address belongs to.",
    )

    address_category = models.CharField(
        max_length=20,
        choices=ADDRESS_CATEGORY_CHOICES,
        default="residential",
        db_index=True,
        help_text="Category of the address (Residential/Business/Other)",
    )
    business_name = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Name of the business (if address category is Business)",
    )
    gst_number = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="GST number for the business (if applicable)",
    )
    address_type = models.CharField(
        max_length=50,
        choices=ADDRESS_TYPE_CHOICES,
        db_index=True,
        help_text="Type of address.",
    )
    street_1 = models.CharField(max_length=255)
    street_2 = models.CharField(max_length=255, blank=True, null=True)
    street_3 = models.CharField(max_length=255, blank=True, null=True)
    full_name = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Full name of the contact person at this address",
    )
    phone_number = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="Contact phone number for this address",
    )
    city = models.CharField(max_length=100)
    state_province = models.CharField(
        max_length=100, blank=True, null=True, db_index=True
    )
    postal_code = models.CharField(max_length=20, blank=True, null=True, db_index=True)
    country = models.CharField(
        db_index=True, help_text="ISO 3166-1 alpha-2 country code."
    )
    is_primary_billing = models.BooleanField(
        default=False, help_text="Is this the primary billing address for the account?"
    )
    is_primary_shipping = models.BooleanField(
        default=False, help_text="Is this the primary shipping address for the account?"
    )

    def __str__(self):
        return f"{self.street_1}, {self.city} ({self.get_address_type_display()})"

    class Meta:
        verbose_name = "Address"
        verbose_name_plural = "Addresses"
        ordering = ["account", "address_type"]


class OrderAddress(BaseTenantModel):
    """
    Model for storing addresses linked to tenant-specific accounts.

    This model allows accounts to have multiple addresses for different purposes
    such as billing, shipping, branch offices, etc.

    Ref: Functional Specification Section 2.5 (Phase 1 structure)
    """

    ADDRESS_TYPE_CHOICES = [
        ("BILLING", "Billing"),
        ("SHIPPING", "Shipping"),
        ("BRANCH", "Branch Office"),
        ("MAILING", "Mailing"),
        ("OTHER", "Other"),
    ]

    ADDRESS_CATEGORY_CHOICES = [
        ("residential", "Residential"),
        ("business", "Business"),
        ("other", "Other"),
    ]

    address_category = models.CharField(
        max_length=20,
        choices=ADDRESS_CATEGORY_CHOICES,
        default="residential",
        db_index=True,
        help_text="Category of the address (Residential/Business/Other)",
    )
    business_name = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Name of the business (if address category is Business)",
    )
    gst_number = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="GST number for the business (if applicable)",
    )
    address_type = models.CharField(
        max_length=50,
        choices=ADDRESS_TYPE_CHOICES,
        db_index=True,
        help_text="Type of address.",
    )
    street_1 = models.CharField(max_length=255)
    street_2 = models.CharField(max_length=255, blank=True, null=True)
    street_3 = models.CharField(max_length=255, blank=True, null=True)
    full_name = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Full name of the contact person at this address",
    )
    phone_number = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="Contact phone number for this address",
    )
    city = models.CharField(max_length=100)
    state_province = models.CharField(
        max_length=100, blank=True, null=True, db_index=True
    )
    postal_code = models.CharField(max_length=20, blank=True, null=True, db_index=True)
    country = models.CharField(db_index=True)
    address_id = models.BigIntegerField(null=True)

    def __str__(self):
        return f"{self.street_1}, {self.city} ({self.get_address_type_display()})"

    class Meta:
        verbose_name = "Order Address"
        verbose_name_plural = "Order Addresses"
        ordering = ["address_type"]


# Signal handlers
@receiver(post_save, sender=CustomerGroup)
def update_segment_names_on_group_name_change(sender, instance, created, **kwargs):
    """
    Update segment_name in all related CustomerGroupSellingChannel records
    when a CustomerGroup's group_name is changed.
    
    This ensures that the segment_name always reflects the current group name
    in the format 'groupname-sellingchannelname'.
    """
    if not created:  # Only for updates, not new creations
        # Get all related CustomerGroupSellingChannel records
        related_channels = instance.selling_channel_relationships.all()
        
        # Update each record to regenerate segment_name
        for channel_rel in related_channels:
            # The save method will automatically regenerate the segment_name
            channel_rel.save()
