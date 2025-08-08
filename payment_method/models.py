from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models.base import BaseTenantModel
from django.conf import settings
from erp_backend.base_model import PaymentGateway , BankAccount


class PaymentMethodType(models.TextChoices):
    """
    Enumeration of available payment method categories.
    These represent the main types of payment methods supported by the system.
    """
    ONLINE_GATEWAY = 'online_gateway', _('Online Gateway')
    BANK_TRANSFER = 'bank_transfer', _('Bank Transfer')
    CASH_OFFLINE = 'cash_offline', _('Cash/Offline')


class PaymentMethod(BaseTenantModel):
    """
    Represents a payment method available in the system.
    
    This model stores core information about payment methods that can be used
    for transactions. It supports multi-tenancy and includes audit fields.
    """
    
    name = models.CharField(
        max_length=100,
        verbose_name=_('Payment Method Name'),
        help_text=_('Customer-facing name for the payment option')
    )
    
    payment_type = models.CharField(
        max_length=20,
        choices=PaymentMethodType.choices,
        verbose_name=_('Payment Type'),
        help_text=_('Main category of the payment method')
    )
    
    is_active = models.BooleanField(
        default=True,
        verbose_name=_('Is Active'),
        help_text=_('Enable/disable this payment method system-wide')
    )
    
    is_visible_on_store = models.BooleanField(
        default=True,
        verbose_name=_('Visible on Store'),
        help_text=_('Show this payment method to customers during checkout')
    )
    
    description = models.TextField(
        blank=True,
        null=True,
        verbose_name=_('Description'),
        help_text=_('Internal notes or customer-facing explanation')
    )

    # Many-to-many relationship with CustomerGroupSellingChannel through a custom junction model
    customer_group_selling_channels = models.ManyToManyField(
        'customers.CustomerGroupSellingChannel',
        through='payment_method.PaymentMethodCustomerGroupSellingChannel',
        related_name='payment_methods',
        blank=True,
        help_text=_("Customer group and selling channel combinations that have access to this payment method")
    )
    

    class Meta:
        db_table = 'payment_method'
        verbose_name = _('Payment Method')
        verbose_name_plural = _('Payment Methods')
        ordering = ['name']
        indexes = [
            models.Index(fields=['is_active', 'is_visible_on_store'], name='idx_payment_method_visibility'),
            models.Index(fields=['payment_type'], name='idx_payment_method_type'),
            models.Index(fields=['name'], name='idx_payment_method_name')
        ]
    
    def __str__(self) -> str:
        return f"{self.get_payment_type_display()}: {self.name}"
    
    def save(self, *args, **kwargs):
        """
        Override save to update timestamps and handle audit fields.
        """
        from django.utils import timezone
        self.updated_at = timezone.now()
        super().save(*args, **kwargs)


class PaymentMethodCustomerGroupSellingChannel(BaseTenantModel):
    """
    Through model for the many-to-many relationship between PaymentMethod and CustomerGroupSellingChannel.
    This allows tracking which payment methods are available to which customer group and selling channel combinations.
    """
    customer_group_selling_channel = models.ForeignKey(
        'customers.CustomerGroupSellingChannel',
        on_delete=models.CASCADE,
        related_name='payment_method_relationships',
        help_text=_("Reference to the CustomerGroupSellingChannel relationship"),
    )
    
    payment_method = models.ForeignKey(
        'payment_method.PaymentMethod',
        on_delete=models.CASCADE,
        related_name='customer_group_selling_channel_relationships',
        help_text=_("Reference to the payment method")
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text=_("Whether this payment method is active for this customer group and selling channel")
    )
    

    class Meta:
        db_table = 'payment_method_customer_group_channels'
        unique_together = ('customer_group_selling_channel', 'payment_method')
        ordering = ['payment_method__name']
        indexes = [
            # Index for customer group selling channel lookups
            models.Index(
                fields=['customer_group_selling_channel'],
                name='idx_pmcgsc_cgsc'
            ),
            # Index for payment method lookups
            models.Index(
                fields=['payment_method'],
                name='idx_pmcgsc_payment_id'
            ),
            # Composite index for the common query pattern
            models.Index(
                fields=['customer_group_selling_channel', 'payment_method'],
                name='idx_pmcgsc_comp_query'
            )
        ]
        verbose_name = _('Payment Method Channel Availability')
        verbose_name_plural = _('Payment Method Channel Availabilities')
    
    def __str__(self):
        return f"{self.customer_group_selling_channel} - {self.payment_method}"
        
    def save(self, *args, **kwargs):
        """
        Override save to ensure audit fields are properly set.
        """
        from django.utils import timezone
        self.updated_at = timezone.now()
        super().save(*args, **kwargs)


class PaymentGatewayOnlineDetails(BaseTenantModel):
    """
    Model to link payment gateways with shipping methods for online payments.
    """
    payment_method = models.ForeignKey(
        'payment_method.PaymentMethod',
        on_delete=models.CASCADE,
        related_name='payment_gateway_methods',
        help_text=_("Reference to the payment method"),
        db_index=True
    )
    
    gateway = models.ForeignKey(
        PaymentGateway,
        on_delete=models.CASCADE,
        related_name='payment_method_links',
        help_text=_("Reference to the payment gateway"),
        db_index=True
    )
    
    class Meta:
        db_table = 'payment_method_pg_online_details'
        unique_together = ('payment_method', 'gateway')
        verbose_name = _('Payment Gateway Online Detail')
        verbose_name_plural = _('Payment Gateway Online Details')
        indexes = [
            # Single field indexes for individual lookups
            models.Index(fields=['payment_method'], name='idx_pgod_payment_method'),
            models.Index(fields=['gateway'], name='idx_pgod_gateway'),
            
            # Index for common query patterns
            models.Index(
                fields=['payment_method', 'gateway'],
                name='idx_pgod_comp_fields'
            )
        ]
    
    def __str__(self):
        return f"Gateway: {self.gateway.gateway_name} - Payment Method: {self.payment_method}"
        
    def save(self, *args, **kwargs):
        """
        Override save to ensure audit fields are properly set.
        """
        from django.utils import timezone
        self.updated_at = timezone.now()
        super().save(*args, **kwargs)


class BankTransferDetails(BaseTenantModel):
    """
    Stores beneficiary information for direct bank transfer payment methods.
    This model is used when payment_type is BANK_TRANSFER.
    """
    payment_method = models.OneToOneField(
        'payment_method.PaymentMethod',
        on_delete=models.CASCADE,
        related_name='bank_transfer_details',
        help_text=_("Reference to the payment method")
    )
    
    beneficiary_bank_name = models.TextField(
        _("Beneficiary Bank Name"),
        help_text=_("Name of the bank where customers should send their payment (e.g., HDFC Bank)")
    )
    
    beneficiary_account_no = models.TextField(
        _("Beneficiary Account Number"),
        help_text=_("Bank account number. Must be encrypted before storing")
    )
    
    beneficiary_ifsc_code = models.TextField(
        _("Beneficiary IFSC Code"),
        help_text=_("Bank's IFSC code. Must be encrypted before storing")
    )
    
    beneficiary_account_holder_name = models.TextField(
        _("Account Holder Name"),
        help_text=_("Legal name of the account holder as registered with the bank")
    )
    
    instructions_for_customer = models.TextField(
        _("Instructions for Customer"),
        help_text=_("Custom text guiding customers on how to make the transfer (e.g., 'Please mention your Order ID in the remarks')"),
        blank=True,
        null=True
    )
    
    class Meta:
        db_table = 'payment_method_bank_transfer_details'
        verbose_name = _('Bank Transfer Details')
        verbose_name_plural = _('Bank Transfer Details')
        indexes = [
            # Index on the foreign key for reverse lookups
            models.Index(fields=['payment_method'], name='idx_btd_payment_method_fk')
        ]
    
    def __str__(self):
        return f"Bank Transfer - {self.beneficiary_account_holder_name} ({self.beneficiary_bank_name})"
        
    def save(self, *args, **kwargs):
        """
        Override save to ensure audit fields are properly set.
        """
        from django.utils import timezone
        self.updated_at = timezone.now()
        super().save(*args, **kwargs)


class CollectionMechanism(models.TextChoices):
    """
    Defines the specific offline payment collection mechanisms.
    Each mechanism may have its own detailed configuration in separate tables.
    """
    LOGISTICS_PARTNER = 'logistics_partner', _('Logistics Partner (e.g., COD)')
    IN_STORE_POS = 'in_store_pos', _('In-Store POS')
    DIRECT_BANK_DEPOSIT = 'direct_bank_deposit', _('Direct Bank Deposit')
    CHEQUE_DD = 'cheque_dd', _('Cheque/Demand Draft')
    MANUAL_CAPTURE = 'manual_capture', _('Manually Capture Payment')


class CashOfflineDetails(BaseTenantModel):
    """
    Router for various offline payment methods (payment_type = CASH_OFFLINE).
    The actual details are stored in further sub-tables based on the collection_mechanism.
    """
    payment_method = models.OneToOneField(
        'payment_method.PaymentMethod',
        on_delete=models.CASCADE,
        related_name='cash_offline_details',
        help_text=_("Reference to the payment method")
    )
    
    collection_mechanism = models.CharField(
        max_length=50,
        choices=CollectionMechanism.choices,
        verbose_name=_("Collection Mechanism"),
        help_text=_("Defines the specific offline method used (e.g., LOGISTICS_PARTNER for COD)")
    )
    
    class Meta:
        db_table = 'payment_method_cash_offline_details'
        verbose_name = _('Cash/Offline Payment Details')
        verbose_name_plural = _('Cash/Offline Payment Details')
        indexes = [
            models.Index(fields=['payment_method'], name='idx_cod_payment_method'),
            models.Index(fields=['collection_mechanism'], name='idx_cod_mechanism_type'),
        ]
    
    def __str__(self):
        return f"{self.get_collection_mechanism_display()} - {self.payment_method.name}"


class CashLogisticsPartnerDetails(BaseTenantModel):
    """
    Stores settings for Cash on Delivery (COD) methods handled by logistics partners.
    This is used when collection_mechanism is LOGISTICS_PARTNER in CashOfflineDetails.
    """
    payment_method = models.OneToOneField(
        'payment_method.CashOfflineDetails',
        on_delete=models.CASCADE,
        related_name='logistics_details',
        help_text=_("Reference to the cash offline payment method")
    )
    
    logistics_partner_name = models.CharField(
        max_length=100,
        verbose_name=_("Logistics Partner Name"),
        help_text=_("Name of the logistics company (e.g., Delhivery, Blue Dart)")
    )
    
    api_key = models.TextField(
        verbose_name=_("API Key"),
        help_text=_("API Key for partner integration (must be encrypted before saving)")
    )
    
    merchant_id = models.CharField(
        max_length=100,
        verbose_name=_("Merchant ID"),
        help_text=_("Your unique merchant identifier with the logistics partner")
    )
    
    cod_collection_limit = models.PositiveIntegerField(
        verbose_name=_("COD Collection Limit"),
        help_text=_("Maximum cash amount the partner will collect per order (in paisa)")
    )
    
    partner_settlement_cycle_days = models.PositiveSmallIntegerField(
        verbose_name=_("Settlement Cycle (days)"),
        help_text=_("Number of days for the partner to settle collected funds")
    )
    
    settlement_bank_account = models.ForeignKey(
        BankAccount,
        on_delete=models.PROTECT,
        related_name='logistics_settlement_accounts',
        verbose_name=_("Settlement Bank Account"),
        help_text=_("Bank account for COD settlement")
    )
    
    class Meta:
        db_table = 'payment_method_cod_logistics_details'
        verbose_name = _('COD Logistics Partner Details')
        verbose_name_plural = _('COD Logistics Partner Details')
        indexes = [
            models.Index(fields=['payment_method'], name='idx_clpd_payment_method'),
            models.Index(fields=['logistics_partner_name'], name='idx_clpd_partner_name'),
        ]
    
    def __str__(self):
        return f"{self.logistics_partner_name} - {self.payment_method.payment_method.name}"


class CashPOSDetails(BaseTenantModel):
    """
    Stores details for payments collected via an in-store Point of Sale (POS) terminal.
    This is used when collection_mechanism is IN_STORE_POS in CashOfflineDetails.
    """
    payment_method = models.OneToOneField(
        'payment_method.CashOfflineDetails',
        on_delete=models.CASCADE,
        related_name='pos_details',
        help_text=_("Reference to the cash offline payment method")
    )
    
    physical_location_id = models.CharField(
        max_length=100,
        verbose_name=_("Physical Location ID"),
        help_text=_("Identifier for the physical store or warehouse where the POS terminal is located")
    )
    
    pos_device_provider = models.CharField(
        max_length=100,
        verbose_name=_("POS Device Provider"),
        help_text=_("Name of the POS machine provider (e.g., Pine Labs, Ingenico)")
    )
    
    terminal_id = models.CharField(
        max_length=100,
        verbose_name=_("Terminal ID"),
        help_text=_("Unique ID of the specific POS terminal")
    )
    
    merchant_id = models.CharField(
        max_length=100,
        verbose_name=_("Merchant ID"),
        help_text=_("Merchant ID associated with the POS acquiring bank")
    )
    
    api_key = models.TextField(
        verbose_name=_("API Key"),
        help_text=_("API Key for POS system integration (must be encrypted before saving)")
    )
    
    supported_card_networks = models.CharField(
        max_length=255,
        verbose_name=_("Supported Card Networks"),
        help_text=_("Comma-separated list of accepted card networks (e.g., Visa,Mastercard,RuPay)")
    )
    
    class Meta:
        db_table = 'payment_method_cash_pos_details'
        verbose_name = _('In-Store POS Details')
        verbose_name_plural = _('In-Store POS Details')
        indexes = [
            models.Index(fields=['payment_method'], name='idx_cpd_payment_method'),
            models.Index(fields=['physical_location_id'], name='idx_cpd_location'),
        ]
    
    def __str__(self):
        return f"{self.pos_device_provider} - {self.terminal_id}"


class CashDirectDepositDetails(BaseTenantModel):
    """
    Stores details for direct cash/cheque deposits into company's bank account.
    Used when collection_mechanism is DIRECT_BANK_DEPOSIT.
    """
    payment_method = models.OneToOneField(
        'payment_method.CashOfflineDetails',
        on_delete=models.CASCADE,
        related_name='direct_deposit_details',
        help_text=_("Reference to the cash offline payment method")
    )
    
    beneficiary_bank_account = models.ForeignKey(
        BankAccount,
        on_delete=models.PROTECT,
        related_name='direct_deposit_accounts',
        verbose_name=_("Beneficiary Bank Account"),
        help_text=_("Bank account where customers should deposit funds")
    )
    
    customer_instructions = models.TextField(
        verbose_name=_("Customer Instructions"),
        help_text=_("Specific instructions for this deposit method")
    )
    
    required_proof_details = models.TextField(
        verbose_name=_("Required Proof Details"),
        help_text=_("Description of the proof of payment the customer must provide")
    )
    
    class Meta:
        db_table = 'payment_method_cash_direct_deposit'
        verbose_name = _('Direct Bank Deposit Details')
        verbose_name_plural = _('Direct Bank Deposit Details')
        indexes = [
            models.Index(fields=['payment_method'], name='idx_cddd_payment_method'),
            models.Index(fields=['beneficiary_bank_account'], name='idx_cddd_bank_account'),
        ]
    
    def __str__(self):
        return f"Direct Deposit - {self.beneficiary_bank_account.bank_name}"


class CashChequeDDDetails(BaseTenantModel):
    """
    Stores details for payments made via Cheque or Demand Draft.
    Used when collection_mechanism is CHEQUE_DD.
    """
    payment_method = models.OneToOneField(
        'payment_method.CashOfflineDetails',
        on_delete=models.CASCADE,
        related_name='cheque_dd_details',
        help_text=_("Reference to the cash offline payment method")
    )
    
    payee_name = models.CharField(
        max_length=200,
        verbose_name=_("Payee Name"),
        help_text=_("Exact name to be written on the cheque/DD")
    )
    
    deposit_bank_account = models.ForeignKey(
        BankAccount,
        on_delete=models.PROTECT,
        related_name='cheque_dd_accounts',
        verbose_name=_("Deposit Bank Account"),
        help_text=_("Bank account where cheques/DDs will be deposited")
    )
    
    collection_address = models.TextField(
        verbose_name=_("Collection Address"),
        help_text=_("Physical address where customers should mail the cheque/DD")
    )
    
    clearing_time_days = models.PositiveSmallIntegerField(
        verbose_name=_("Clearing Time (days)"),
        help_text=_("Estimated business days for cheque/DD to clear")
    )
    
    bounced_cheque_charges = models.PositiveIntegerField(
        verbose_name=_("Bounced Cheque Charges"),
        help_text=_("Penalty fee for bounced cheques (in paisa)"),
        default=0
    )
    
    class Meta:
        db_table = 'payment_method_cash_cheque_dd'
        verbose_name = _('Cheque/DD Payment Details')
        verbose_name_plural = _('Cheque/DD Payment Details')
        indexes = [
            models.Index(fields=['payment_method'], name='idx_ccdd_payment_method'),
            models.Index(fields=['deposit_bank_account'], name='idx_ccdd_bank_account'),
        ]
    
    def __str__(self):
        return f"Cheque/DD - {self.payee_name}"