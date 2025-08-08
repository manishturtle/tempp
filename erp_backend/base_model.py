from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class TenantUser(models.Model):
    """
    Unmanaged model for accessing the ecomm_tenant_admins_tenantuser table.
    This model won't generate migrations but allows us to query existing tables.
    """

    id = models.AutoField(primary_key=True)
    password = models.CharField(max_length=128, null=True)
    last_login = models.DateTimeField(null=True, blank=True)
    is_superuser = models.BooleanField(default=False)
    email = models.EmailField(unique=True, db_index=True)
    phone_number = models.CharField(max_length=150, blank=True)
    username = models.CharField(max_length=150, blank=True, db_index=True)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)
    is_email_verified = models.BooleanField(default=False)
    is_phone_verified = models.BooleanField(default=False)

    company_id = models.IntegerField(default=1, editable=False)
    client_id = models.IntegerField(default=1, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, editable=False)
    updated_at = models.DateTimeField(auto_now=True, editable=False)
    created_by = models.IntegerField(null=True, blank=True, db_column="created_by")
    updated_by = models.IntegerField(null=True, blank=True, db_column="updated_by")

    class Meta:
        managed = False  # Prevents Django from creating migrations for this model
        db_table = "ecomm_tenant_admins_tenantuser"  # Must match the actual table name
        app_label = "config"


class PaymentGateway(models.Model):
    """
    Model to store payment gateway configurations and credentials.
    """
    gateway_name = models.CharField(
        max_length=100,
        help_text=_("The name of the payment gateway provider (e.g., Razorpay, Stripe, PayU)"),
        null=False,
        blank=False
    )
    api_key = models.TextField(
        help_text=_("The API Key credential for authenticating with the gateway's server. Must be encrypted before storing.")
    )
    api_secret = models.TextField(
        help_text=_("The API Secret credential. Must be encrypted before storing.")
    )
    webhook_secret = models.TextField(
        help_text=_("The secret key used to verify incoming payment notifications (webhooks). Must be encrypted."),
        blank=True,
        null=True
    )
    merchant_id = models.CharField(
        max_length=100,
        help_text=_("Your unique merchant identifier provided by the payment gateway."),
        blank=True,
        null=True
    )
    success_webhook_url = models.URLField(
        max_length=500,
        help_text=_("The URL in your system that the gateway should call when a payment is successful."),
        blank=True,
        null=True
    )
    failure_webhook_url = models.URLField(
        max_length=500,
        help_text=_("The URL in your system that the gateway should call when a payment fails."),
        blank=True,
        null=True
    )
    supported_currencies = models.CharField(
        max_length=255,
        help_text=_("Comma-separated currency codes this gateway accepts (e.g., 'INR,USD,EUR')."),
        default='INR'
    )
    mdr_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        help_text=_("The Merchant Discount Rate percentage fee charged by the gateway per transaction (e.g., 1.75)."),
        default=0.00
    )
    mdr_fixed_fee = models.PositiveIntegerField(
        help_text=_("A flat fee charged by the gateway per transaction, stored in the smallest currency unit (e.g., 300 for ₹3.00)."),
        default=0
    )
    settlement_bank_account = models.ForeignKey(
        'BankAccount',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text=_("The bank account where the gateway settles your funds.")
    )
    refund_api_endpoint = models.URLField(
        max_length=500,
        help_text=_("The specific API endpoint for processing refunds programmatically."),
        blank=True,
        null=True
    )
    supports_partial_refunds = models.BooleanField(
        default=False,
        help_text=_("Whether the gateway supports refunding only part of a transaction.")
    )
    is_active = models.BooleanField(
        default=True,
        help_text=_("Whether this payment gateway configuration is active and can be used for transactions.")
    )
    client_id = models.BigIntegerField(
        _("Client ID"),
        null=True,
        blank=True,
        help_text=_("Client identifier for multi-tenant applications")
    )
    company_id = models.BigIntegerField(
        _("Company ID"),
        null=True,
        blank=True,
        help_text=_("Company identifier for organization structure")
    )
    
    # Audit fields
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    created_by = models.IntegerField(
        _('created by'),
        null=True,
        blank=True,
        help_text=_('ID of the user who created this record')
    )
    updated_by = models.IntegerField(
        _('updated by'),
        null=True,
        blank=True,
        help_text=_('ID of the user who last updated this record')
    )

    class Meta:
        managed = False  # Prevents Django from creating migrations for this model
        db_table = 'payment_gateways'  # Must match the actual table name
        app_label = "payment_method"

    def __str__(self):
        return f"{self.gateway_name} - {self.merchant_id or 'Default'}"

    def get_supported_currencies_list(self):
        """
        Returns the supported currencies as a list.
        """
        if not self.supported_currencies:
            return []
        return [curr.strip().upper() for curr in self.supported_currencies.split(',')]

    def add_supported_currency(self, currency_code):
        """
        Adds a currency to the supported currencies list if not already present.
        """
        currencies = self.get_supported_currencies_list()
        currency_code = currency_code.strip().upper()
        if currency_code not in currencies:
            currencies.append(currency_code)
            self.supported_currencies = ','.join(currencies)
            self.save(update_fields=['supported_currencies'])

    def remove_supported_currency(self, currency_code):
        """
        Removes a currency from the supported currencies list if present.
        """
        currencies = self.get_supported_currencies_list()
        currency_code = currency_code.strip().upper()
        if currency_code in currencies:
            currencies.remove(currency_code)
            self.supported_currencies = ','.join(currencies)
            self.save(update_fields=['supported_currencies'])


class BankAccount(models.Model):
    """
    Model to store bank account information for payment processing.
    """
    bank_name = models.CharField(
        _('bank name'),
        max_length=100,
        help_text=_("The name of the bank (e.g., State Bank of India)")
    )
    account_holder_name = models.CharField(
        _('account holder name'),
        max_length=100,
        help_text=_("The legal name of the account holder")
    )
    account_number = models.TextField(
        _('account number'),
        help_text=_("The bank account number. Must be encrypted before storing.")
    )
    ifsc_code = models.TextField(
        _('IFSC code'),
        help_text=_("The bank's IFSC code. Must be encrypted before storing.")
    )
    is_active = models.BooleanField(
        _('is active'),
        default=True,
        help_text=_("Whether this bank account is active and can be used for transactions.")
    )
    client_id = models.BigIntegerField(
        _("Client ID"),
        null=True,
        blank=True,
        help_text=_("Client identifier for multi-tenant applications")
    )
    company_id = models.BigIntegerField(
        _("Company ID"),
        null=True,
        blank=True,
        help_text=_("Company identifier for organization structure")
    )
    
    # Audit fields
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    created_by = models.IntegerField(
        _('created by'),
        null=True,
        blank=True,
        help_text=_('ID of the user who created this record')
    )
    updated_by = models.IntegerField(
        _('updated by'),
        null=True,
        blank=True,
        help_text=_('ID of the user who last updated this record')
    )

    class Meta:
        managed = False  # Prevents Django from creating migrations for this model
        db_table = 'bank_accounts'  # Must match the actual table name
        app_label = "payment_method"

    def __str__(self):
        return f"{self.bank_name} - {self.account_holder_name} ({self.account_number[-4:]})"
