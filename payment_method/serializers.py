from rest_framework import serializers
from django.utils.translation import gettext_lazy as _
from typing import Dict, Any, List
from rest_framework import serializers
import logging

from erp_backend.base_model import PaymentGateway, BankAccount

logger = logging.getLogger(__name__)

class PaymentGatewaySerializer(serializers.ModelSerializer):
    """Serializer for PaymentGateway model"""
    
    # Add a field for supported currencies as a list
    supported_currencies_list = serializers.SerializerMethodField()
    
    # Add a field for settlement bank account details if needed
    settlement_bank_name = serializers.SerializerMethodField(read_only=True)
    
    def get_supported_currencies_list(self, obj):
        """Convert comma-separated currencies to a list"""
        return obj.get_supported_currencies_list()
    
    def get_settlement_bank_name(self, obj):
        """Get the settlement bank name if available"""
        if obj.settlement_bank_account:
            return obj.settlement_bank_account.bank_name
        return None
    
    class Meta:
        model = PaymentGateway
        fields = [
            'id',
            'gateway_name',
            'merchant_id',
            'supported_currencies',
            'supported_currencies_list',
            'mdr_percentage',
            'mdr_fixed_fee',
            'settlement_bank_name',
            'success_webhook_url',
            'failure_webhook_url',
            'refund_api_endpoint',
            'supports_partial_refunds',
            'is_active',
            'client_id',
            'company_id',
            'created_at',
            'updated_at',
            'created_by',
            'updated_by'
        ]
        # Exclude sensitive fields like API keys, secrets, and webhook secrets


from .models import (
    PaymentMethod,
    PaymentMethodType,
    PaymentMethodCustomerGroupSellingChannel,
    PaymentGatewayOnlineDetails,
    BankTransferDetails,
    CashOfflineDetails,
    CollectionMechanism,
    CashLogisticsPartnerDetails,
    CashPOSDetails,
    CashDirectDepositDetails,
    CashChequeDDDetails
)


class PaymentMethodCustomerGroupSellingChannelSerializer(serializers.ModelSerializer):
    """Serializer for the through model relationship."""
    class Meta:
        model = PaymentMethodCustomerGroupSellingChannel
        fields = ['customer_group_selling_channel', 'payment_method', 'is_active']
        read_only_fields = ['is_active']


class PaymentGatewayOnlineDetailsSerializer(serializers.ModelSerializer):
    """Serializer for payment gateway online details.
    
    Used when payment_type is ONLINE_GATEWAY to associate payment methods with gateways.
    """
    client_id = serializers.IntegerField(default=1, write_only=True)
    company_id = serializers.IntegerField(default=1, write_only=True)
    
    class Meta:
        model = PaymentGatewayOnlineDetails
        fields = [
            'id',
            'payment_method',
            'gateway',
            'client_id',
            'company_id',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class BankTransferDetailsSerializer(serializers.ModelSerializer):
    """Serializer for bank transfer details.
    
    Used when payment_type is BANK_TRANSFER to store beneficiary information.
    """
    client_id = serializers.IntegerField(default=1, write_only=True)
    company_id = serializers.IntegerField(default=1, write_only=True)
    
    class Meta:
        model = BankTransferDetails
        fields = [
            'id',
            'payment_method',
            'beneficiary_bank_name',
            'beneficiary_account_no',
            'beneficiary_ifsc_code',
            'beneficiary_account_holder_name',
            'instructions_for_customer',
            'client_id',
            'company_id',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CashOfflineDetailsSerializer(serializers.ModelSerializer):
    """Serializer for cash/offline payment details.
    
    Used when payment_type is CASH_OFFLINE to define the collection mechanism.
    """
    client_id = serializers.IntegerField(default=1, write_only=True)
    company_id = serializers.IntegerField(default=1, write_only=True)
    collection_mechanism_display = serializers.CharField(
        source='get_collection_mechanism_display',
        read_only=True,
        help_text=_('Human-readable collection mechanism')
    )
    
    class Meta:
        model = CashOfflineDetails
        fields = [
            'id',
            'payment_method',
            'collection_mechanism',
            'collection_mechanism_display',
            'client_id',
            'company_id',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CashLogisticsPartnerDetailsSerializer(serializers.ModelSerializer):
    """Serializer for Cash on Delivery (COD) details handled by logistics partners.
    
    Used when collection_mechanism is LOGISTICS_PARTNER in CashOfflineDetails.
    """
    client_id = serializers.IntegerField(default=1, write_only=True)
    company_id = serializers.IntegerField(default=1, write_only=True)
    
    class Meta:
        model = CashLogisticsPartnerDetails
        fields = [
            'id',
            'payment_method',
            'logistics_partner_name',
            'api_key',
            'merchant_id',
            'cod_collection_limit',
            'partner_settlement_cycle_days',
            'settlement_bank_account',
            'client_id',
            'company_id',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CashPOSDetailsSerializer(serializers.ModelSerializer):
    """Serializer for in-store POS terminal payment details.
    
    Used when collection_mechanism is IN_STORE_POS in CashOfflineDetails.
    """
    client_id = serializers.IntegerField(default=1, write_only=True)
    company_id = serializers.IntegerField(default=1, write_only=True)
    
    class Meta:
        model = CashPOSDetails
        fields = [
            'id',
            'payment_method',
            'physical_location_id',
            'pos_device_provider',
            'terminal_id',
            'merchant_id',
            'api_key',
            'supported_card_networks',
            'client_id',
            'company_id',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CashDirectDepositDetailsSerializer(serializers.ModelSerializer):
    """Serializer for direct cash/cheque deposits details.
    
    Used when collection_mechanism is DIRECT_BANK_DEPOSIT in CashOfflineDetails.
    """
    client_id = serializers.IntegerField(default=1, write_only=True)
    company_id = serializers.IntegerField(default=1, write_only=True)
    
    class Meta:
        model = CashDirectDepositDetails
        fields = [
            'id',
            'payment_method',
            'beneficiary_bank_account',
            'customer_instructions',
            'required_proof_details',
            'client_id',
            'company_id',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CashChequeDDDetailsSerializer(serializers.ModelSerializer):
    """Serializer for payments made via Cheque or Demand Draft.
    
    Used when collection_mechanism is CHEQUE_DD in CashOfflineDetails.
    """
    client_id = serializers.IntegerField(default=1, write_only=True)
    company_id = serializers.IntegerField(default=1, write_only=True)
    
    class Meta:
        model = CashChequeDDDetails
        fields = [
            'id',
            'payment_method',
            'payee_name',
            'deposit_bank_account',
            'collection_address',
            'clearing_time_days',
            'bounced_cheque_charges',
            'client_id',
            'company_id',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PaymentMethodSerializer(serializers.ModelSerializer):
    """Serializer for the PaymentMethod model.
    
    Provides serialization and deserialization of PaymentMethod instances.
    All creation/update logic is handled in views.
    """
    client_id = serializers.IntegerField(default=1, write_only=True)
    company_id = serializers.IntegerField(default=1, write_only=True)
    # For writing/updating customer group selling channels
    # Read-only field to display the customer group selling channels
    customer_group_selling_channels = serializers.SerializerMethodField(
        help_text=_('List of CustomerGroupSellingChannel IDs this payment method is available to')
    )
    
    # Write-only field for creating/updating (accepts both field names for backward compatibility)
    customer_group_selling_channel_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        help_text=_('List of CustomerGroupSellingChannel IDs this payment method is available to')
    )
    
    # For backward compatibility - will be removed in future versions
    def validate(self, data):
        # If customer_group_selling_channels is provided, move it to customer_group_selling_channel_ids
        if 'customer_group_selling_channels' in data and 'customer_group_selling_channel_ids' not in data:
            data['customer_group_selling_channel_ids'] = data.pop('customer_group_selling_channels')
        return super().validate(data)
    
    def get_customer_group_selling_channels(self, obj):
        # Get active relationships and return list of channel IDs
        return list(
            obj.customer_group_selling_channel_relationships.filter(
                is_active=True
            ).values_list('customer_group_selling_channel_id', flat=True)
        )
    bank_transfer_details = serializers.SerializerMethodField(help_text=_('Details of the bank transfer for bank transfer payments'))
    cash_offline_details = serializers.SerializerMethodField(help_text=_('Details of the cash offline payment method'))
    
    # For online_gateway payment type
    gateway_id = serializers.IntegerField(
        write_only=True,
        required=False,
        help_text=_('ID of the payment gateway to associate with this payment method')
    )
    
    def validate(self, data):
        """Validate payment method data based on payment type."""
        payment_type = data.get('payment_type')
        
        # Validate gateway_id for online_gateway payment type
        if payment_type == PaymentMethodType.ONLINE_GATEWAY:
            gateway_id = data.get('gateway_id')
            if not gateway_id:
                raise serializers.ValidationError({
                    'gateway_id': _('Gateway ID is required for online gateway payment methods')
                })
            
            # Check if the gateway exists
            try:
                PaymentGateway.objects.get(pk=gateway_id)
            except PaymentGateway.DoesNotExist:
                raise serializers.ValidationError({
                    'gateway_id': _(f'Payment gateway with ID {gateway_id} does not exist')
                })
        
        return data
    
    # Nested serializer for gateway details
    gateway_details = serializers.SerializerMethodField(
        read_only=True,
        help_text=_('Details of the associated payment gateway')
    )
    
    # For bank_transfer payment type
    beneficiary_bank_name = serializers.CharField(
        write_only=True,
        required=False,
        help_text=_('Name of the bank where customers should send their payment')
    )
    beneficiary_account_no = serializers.CharField(
        write_only=True,
        required=False,
        help_text=_('Bank account number')
    )
    beneficiary_ifsc_code = serializers.CharField(
        write_only=True,
        required=False,
        help_text=_('Bank IFSC code')
    )
    beneficiary_account_holder_name = serializers.CharField(
        write_only=True,
        required=False,
        help_text=_('Legal name of the account holder')
    )
    instructions_for_customer = serializers.CharField(
        write_only=True,
        required=False,
        help_text=_('Instructions for customers on how to make the transfer')
    )
    
    # For cash_offline payment type
    collection_mechanism = serializers.ChoiceField(
        choices=CollectionMechanism.choices,
        write_only=True,
        required=False,
        help_text=_('Collection mechanism for cash/offline payments')
    )
    
    # For LOGISTICS_PARTNER (COD) collection mechanism
    logistics_partner_name = serializers.CharField(
        write_only=True,
        required=False,
        help_text=_('Name of the logistics company')
    )
    api_key = serializers.CharField(
        write_only=True,
        required=False,
        help_text=_('API Key for partner integration')
    )
    merchant_id = serializers.CharField(
        write_only=True,
        required=False,
        help_text=_('Merchant ID with logistics partner')
    )
    cod_collection_limit = serializers.IntegerField(
        write_only=True,
        required=False,
        help_text=_('Maximum cash amount the partner will collect per order')
    )
    partner_settlement_cycle_days = serializers.IntegerField(
        write_only=True,
        required=False,
        help_text=_('Number of days for the partner to settle collected funds')
    )
    settlement_bank_account = serializers.IntegerField(
        write_only=True,
        required=False,
        help_text=_('Bank account ID for COD settlement')
    )
    
    # For IN_STORE_POS collection mechanism
    physical_location_id = serializers.CharField(
        write_only=True,
        required=False,
        help_text=_('Identifier for the physical store location')
    )
    pos_device_provider = serializers.CharField(
        write_only=True,
        required=False,
        help_text=_('Name of the POS machine provider (e.g., Pine Labs, Ingenico)')
    )
    terminal_id = serializers.CharField(
        write_only=True,
        required=False,
        help_text=_('Unique ID of the specific POS terminal')
    )
    merchant_id = serializers.CharField(
        write_only=True,
        required=False,
        help_text=_('Merchant ID associated with the POS acquiring bank')
    )
    api_key = serializers.CharField(
        write_only=True,
        required=False,
        help_text=_('API Key for POS system integration')
    )
    supported_card_networks = serializers.CharField(
        write_only=True,
        required=False,
        help_text=_('Comma-separated list of accepted card networks (e.g., Visa,Mastercard,RuPay)')
    )
    
    # For DIRECT_BANK_DEPOSIT collection mechanism
    beneficiary_bank_account = serializers.IntegerField(
        write_only=True,
        required=False,
        help_text=_('Bank account ID where customers should deposit funds')
    )
    customer_instructions = serializers.CharField(
        write_only=True,
        required=False,
        help_text=_('Specific instructions for this deposit method')
    )
    required_proof_details = serializers.CharField(
        write_only=True,
        required=False,
        help_text=_('Description of the proof of payment required')
    )
    
    # For CHEQUE_DD collection mechanism
    payee_name = serializers.CharField(
        write_only=True,
        required=False,
        help_text=_('Exact name to be written on the cheque/DD')
    )
    deposit_bank_account = serializers.IntegerField(
        write_only=True,
        required=False,
        help_text=_('Bank account ID where cheques/DDs will be deposited')
    )
    collection_address = serializers.CharField(
        write_only=True,
        required=False,
        help_text=_('Physical address where customers should mail the cheque/DD')
    )
    clearing_time_days = serializers.IntegerField(
        write_only=True,
        required=False,
        help_text=_('Estimated business days for cheque/DD to clear')
    )
    bounced_cheque_charges = serializers.IntegerField(
        write_only=True,
        required=False,
        help_text=_('Penalty fee for bounced cheques')
    )
    
    payment_type_display = serializers.CharField(
        source='get_payment_type_display',
        read_only=True,
        help_text=_('Human-readable payment type')
    )
    
    def get_gateway_details(self, obj):
        """Get the gateway details for online payment methods"""
        if obj.payment_type != PaymentMethodType.ONLINE_GATEWAY:
            return None
            
        try:
            # Get the associated gateway details
            gateway_details = obj.payment_gateway_methods.first()
            if gateway_details and gateway_details.gateway:
                return PaymentGatewaySerializer(gateway_details.gateway).data
        except Exception as e:
            # Log the error but don't fail the request
            logger.error(f"Error retrieving gateway details: {e}")
            
        return None
        
    def get_bank_transfer_details(self, obj):
        """Get the bank transfer details for bank transfer payment methods"""
        if obj.payment_type != PaymentMethodType.BANK_TRANSFER:
            return None
            
        try:
            # Get the associated bank transfer details
            bank_details = BankTransferDetails.objects.filter(payment_method=obj).first()
            if bank_details:
                return BankTransferDetailsSerializer(bank_details).data
        except Exception as e:
            # Log the error but don't fail the request
            logger.error(f"Error retrieving bank transfer details: {e}")
            
        return None
        
    def get_cash_offline_details(self, obj):
        """Get the cash offline details for cash offline payment methods"""
        if obj.payment_type != PaymentMethodType.CASH_OFFLINE:
            return None
            
        try:
            # Get the associated cash offline details
            cash_details = CashOfflineDetails.objects.filter(payment_method=obj).first()
            if not cash_details:
                return None
                
            # Create a base response with collection mechanism
            result = {
                'id': cash_details.id,
                'collection_mechanism': cash_details.collection_mechanism,
                'collection_mechanism_display': cash_details.get_collection_mechanism_display(),
                'created_at': cash_details.created_at,
                'updated_at': cash_details.updated_at,
                'created_by': cash_details.created_by,
                'updated_by': cash_details.updated_by
            }
            
            # Add specific details based on collection mechanism
            if cash_details.collection_mechanism == CollectionMechanism.LOGISTICS_PARTNER:
                try:
                    logistics_details = cash_details.logistics_details
                    if logistics_details:
                        result.update({
                            'logistics_partner_details': {
                                'id': logistics_details.id,
                                'logistics_partner_name': logistics_details.logistics_partner_name,
                                'merchant_id': logistics_details.merchant_id,
                                'api_key': logistics_details.api_key,
                                'cod_collection_limit': logistics_details.cod_collection_limit,
                                'partner_settlement_cycle_days': logistics_details.partner_settlement_cycle_days,
                                'settlement_bank_account': logistics_details.settlement_bank_account_id if logistics_details.settlement_bank_account else None,
                                'created_at': logistics_details.created_at,
                                'updated_at': logistics_details.updated_at,
                                'created_by': logistics_details.created_by,
                                'updated_by': logistics_details.updated_by
                            }
                        })
                except CashLogisticsPartnerDetails.DoesNotExist:
                    pass
            
            # For IN_STORE_POS
            elif cash_details.collection_mechanism == CollectionMechanism.IN_STORE_POS:
                try:
                    pos_details = cash_details.pos_details
                    if pos_details:
                        result.update({
                            'pos_details': {
                                'id': pos_details.id,
                                'physical_location_id': pos_details.physical_location_id,
                                'pos_device_provider': pos_details.pos_device_provider,
                                'terminal_id': pos_details.terminal_id,
                                'merchant_id': pos_details.merchant_id,
                                'api_key': pos_details.api_key,
                                'supported_card_networks': pos_details.supported_card_networks,
                                'created_at': pos_details.created_at,
                                'updated_at': pos_details.updated_at,
                                'created_by': pos_details.created_by,
                                'updated_by': pos_details.updated_by
                            }
                        })
                except CashPOSDetails.DoesNotExist:
                    pass
            
            # For DIRECT_BANK_DEPOSIT
            elif cash_details.collection_mechanism == CollectionMechanism.DIRECT_BANK_DEPOSIT:
                try:
                    deposit_details = cash_details.direct_deposit_details
                    if deposit_details:
                        result.update({
                            'direct_deposit_details': {
                                'id': deposit_details.id,
                                'customer_instructions': deposit_details.customer_instructions,
                                'required_proof_details': deposit_details.required_proof_details,
                                'beneficiary_bank_account': deposit_details.beneficiary_bank_account_id if deposit_details.beneficiary_bank_account else None,
                                'created_at': deposit_details.created_at,
                                'updated_at': deposit_details.updated_at,
                                'created_by': deposit_details.created_by,
                                'updated_by': deposit_details.updated_by
                            }
                        })
                except CashDirectDepositDetails.DoesNotExist:
                    pass
            
            # For CHEQUE_DD
            elif cash_details.collection_mechanism == CollectionMechanism.CHEQUE_DD:
                try:
                    cheque_details = cash_details.cheque_dd_details
                    if cheque_details:
                        result.update({
                            'cheque_dd_details': {
                                'id': cheque_details.id,
                                'payee_name': cheque_details.payee_name,
                                'collection_address': cheque_details.collection_address,
                                'clearing_time_days': cheque_details.clearing_time_days,
                                'bounced_cheque_charges': cheque_details.bounced_cheque_charges,
                                'deposit_bank_account': cheque_details.deposit_bank_account_id if cheque_details.deposit_bank_account else None,
                                'created_at': cheque_details.created_at,
                                'updated_at': cheque_details.updated_at,
                                'created_by': cheque_details.created_by,
                                'updated_by': cheque_details.updated_by
                            }
                        })
                except CashChequeDDDetails.DoesNotExist:
                    pass
            
            # For MANUAL_CAPTURE - No specific details table exists, so just basic info is returned
            
            return result
        except Exception as e:
            # Log the error but don't fail the request
            logger.error(f"Error retrieving cash offline details: {e}")
            
        return None
    
    def create(self, validated_data):
        """
        Override create method to handle payment type specific fields.
        Remove fields that don't belong to the PaymentMethod model before creating the instance.
        """
        # Extract payment type
        payment_type = validated_data.get('payment_type')
        
        # Fields to remove based on payment type
        fields_to_remove = []
        
        # Handle bank transfer fields
        if payment_type == PaymentMethodType.BANK_TRANSFER:
            fields_to_remove.extend([
                'beneficiary_bank_name', 'beneficiary_account_no',
                'beneficiary_ifsc_code', 'beneficiary_account_holder_name',
                'instructions_for_customer'
            ])
        
        # Handle cash offline fields
        elif payment_type == PaymentMethodType.CASH_OFFLINE:
            fields_to_remove.append('collection_mechanism')
            # Add other cash offline related fields
            fields_to_remove.extend([
                'logistics_partner_name', 'api_key', 'merchant_id',
                'cod_collection_limit', 'partner_settlement_cycle_days',
                'settlement_bank_account', 'physical_location_id',
                'pos_device_provider', 'terminal_id', 'supported_card_networks',
                'beneficiary_bank_account', 'customer_instructions',
                'required_proof_details', 'payee_name', 'deposit_bank_account',
                'collection_address', 'clearing_time_days', 'bounced_cheque_charges'
            ])
        
        # Remove fields that don't belong to PaymentMethod model
        for field in fields_to_remove:
            if field in validated_data:
                validated_data.pop(field)
        
        # Create the PaymentMethod instance with cleaned data
        return super().create(validated_data)
        
    def update(self, instance, validated_data):
        """
        Override update method to handle payment type specific fields.
        Remove fields that don't belong to the PaymentMethod model before updating the instance.
        """
        # Extract payment type (use instance's payment type since it can't be changed after creation)
        payment_type = instance.payment_type
        
        # Fields to remove based on payment type
        fields_to_remove = []
        
        # Handle bank transfer fields
        if payment_type == PaymentMethodType.BANK_TRANSFER:
            fields_to_remove.extend([
                'beneficiary_bank_name', 'beneficiary_account_no',
                'beneficiary_ifsc_code', 'beneficiary_account_holder_name',
                'instructions_for_customer'
            ])
        
        # Handle cash offline fields
        elif payment_type == PaymentMethodType.CASH_OFFLINE:
            fields_to_remove.append('collection_mechanism')
            # Add other cash offline related fields
            fields_to_remove.extend([
                'logistics_partner_name', 'api_key', 'merchant_id',
                'cod_collection_limit', 'partner_settlement_cycle_days',
                'settlement_bank_account', 'physical_location_id',
                'pos_device_provider', 'terminal_id', 'supported_card_networks',
                'beneficiary_bank_account', 'customer_instructions',
                'required_proof_details', 'payee_name', 'deposit_bank_account',
                'collection_address', 'clearing_time_days', 'bounced_cheque_charges'
            ])
        
        # Remove fields that don't belong to PaymentMethod model
        for field in fields_to_remove:
            if field in validated_data:
                validated_data.pop(field)
        
        # Update the PaymentMethod instance with cleaned data
        return super().update(instance, validated_data)
    
    class Meta:
        model = PaymentMethod
        fields = [
            'id',
            'name',
            'payment_type',
            'payment_type_display',
            'is_active',
            'is_visible_on_store',
            'description',
            'client_id',
            'company_id',
            'customer_group_selling_channels',
            'customer_group_selling_channel_ids',
            'gateway_details',
            'bank_transfer_details',
            'cash_offline_details',
            # For online_gateway payment type
            'gateway_id',
            # For bank_transfer payment type
            'beneficiary_bank_name',
            'beneficiary_account_no',
            'beneficiary_ifsc_code',
            'beneficiary_account_holder_name',
            'instructions_for_customer',
            # For cash_offline payment type
            'collection_mechanism',
            # For LOGISTICS_PARTNER (COD) collection mechanism
            'logistics_partner_name',
            'api_key',
            'merchant_id',
            'cod_collection_limit',
            'partner_settlement_cycle_days',
            'settlement_bank_account',
            # For IN_STORE_POS collection mechanism
            'physical_location_id',
            'pos_device_provider',
            'terminal_id',
            'merchant_id',
            'api_key',
            'supported_card_networks',
            # For DIRECT_BANK_DEPOSIT collection mechanism
            'beneficiary_bank_account',
            'customer_instructions',
            'required_proof_details',
            # For CHEQUE_DD collection mechanism
            'payee_name',
            'deposit_bank_account',
            'collection_address',
            'clearing_time_days',
            'bounced_cheque_charges',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
