from django.db import transaction, models
from django.utils.translation import gettext_lazy as _
from rest_framework import status
from rest_framework.permissions import IsAuthenticated ,AllowAny
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework.decorators import action
from core.viewsets import TenantModelViewSet
from erp_backend.middleware import CustomJWTAuthentication ,TenantSchemaMiddleware
from erp_backend.base_model import PaymentGateway , BankAccount
from .models import (
    PaymentMethod, PaymentMethodType, PaymentGatewayOnlineDetails, BankTransferDetails,
    CashOfflineDetails, CollectionMechanism, CashLogisticsPartnerDetails, CashPOSDetails,
    CashDirectDepositDetails, CashChequeDDDetails, PaymentMethodCustomerGroupSellingChannel
)
from .serializers import PaymentMethodSerializer
from customers.models import CustomerGroupSellingChannel

import logging
logger = logging.getLogger(__name__)


class PaymentMethodViewSet(TenantModelViewSet):
    """
    ViewSet for managing payment methods with all their related details.
    
    Supports creating and updating payment methods with different types:
    - ONLINE_GATEWAY: Payment gateway integration like Razorpay, Stripe, etc.
    - BANK_TRANSFER: Direct bank transfer with beneficiary details
    - CASH_OFFLINE: Various offline payment mechanisms
      - LOGISTICS_PARTNER: Cash on Delivery (COD)
      - IN_STORE_POS: In-store Point of Sale
      - DIRECT_BANK_DEPOSIT: Direct cash deposit at bank
      - CHEQUE_DD: Payment by Cheque or Demand Draft
    """
    serializer_class = PaymentMethodSerializer
    queryset = PaymentMethod.objects.all()
    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """
        Get statistics about payment methods:
        - total count, active count, inactive count
        - counts by payment type (both total and active/inactive)
        """
        # Get base queryset with tenant filtering
        client_id = 1
        company_id = 1
        base_queryset = self.queryset.filter(
            client_id=client_id,
            company_id=company_id
        )
        
        # Calculate overall counts
        total_count = base_queryset.count()
        active_count = base_queryset.filter(is_active=True).count()
        inactive_count = base_queryset.filter(is_active=False).count()
        
        # Calculate counts by payment type
        type_stats = {}
        for payment_type in PaymentMethodType.values:
            type_queryset = base_queryset.filter(payment_type=payment_type)
            type_count = type_queryset.count()
            type_active_count = type_queryset.filter(is_active=True).count()
            type_inactive_count = type_queryset.filter(is_active=False).count()
            
            # Get display name for payment type
            display_name = dict(PaymentMethodType.choices).get(payment_type)
            
            type_stats[payment_type] = {
                'display_name': display_name,
                'total': type_count,
                'active': type_active_count,
                'inactive': type_inactive_count
            }
        
        # Return statistics
        return Response({
            'total_count': total_count,
            'active_count': active_count,
            'inactive_count': inactive_count,
            'payment_type_stats': type_stats
        })
    
    def get_queryset(self):
        """
        Filter queryset by tenant (client_id and company_id) and optional parameters:
        - is_active: Filter by active status (true/false)
        - payment_type: Filter by payment type (online/bank_transfer/cash_offline)
        Sort by ID by default.
        """
        # For now using hardcoded tenant values as specified
        # Later, these should come from the JWT token
        client_id = 1
        company_id = 1
        
        # Base queryset with tenant filter
        queryset = self.queryset.filter(
            client_id=client_id,
            company_id=company_id
        )
        
        # Filter by is_active if provided in request params
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            is_active_bool = is_active.lower() == 'true'
            queryset = queryset.filter(is_active=is_active_bool)
            
        # Filter by payment_type if provided in request params
        payment_type = self.request.query_params.get('payment_type')
        if payment_type and payment_type in PaymentMethodType.values:
            queryset = queryset.filter(payment_type=payment_type)
        
        # Prefetch related data and sort by ID
        return queryset.prefetch_related(
            models.Prefetch(
                'customer_group_selling_channel_relationships',
                queryset=PaymentMethodCustomerGroupSellingChannel.objects.filter(is_active=True)
            )
        ).order_by('id')
    
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """
        Create payment method with all related details based on payment_type.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Extract payment type from validated data
        payment_type = serializer.validated_data.get('payment_type')
        
        # Extract collection mechanism for cash offline payment type
        collection_mechanism = request.data.get('collection_mechanism')
        
        # Remove gateway_id from validated_data as it's not a field in PaymentMethod model
        gateway_id = None
        if 'gateway_id' in serializer.validated_data:
            gateway_id = serializer.validated_data.pop('gateway_id')
        
        # Get user ID from the authenticated user
        user_id = request.user.id if hasattr(request.user, 'id') else None
        
        # Create the base payment method with audit fields
        payment_method = serializer.save(
            created_by=user_id,
            updated_by=user_id
        )
        
        # Process customer group selling channels
        try:
            self._handle_customer_group_channels(payment_method, request.data)
            # Refresh the payment method to include the relationships in the response
            payment_method.refresh_from_db()
        except Exception as e:
            logger.error(f"Error processing customer group selling channels: {str(e)}")
            # Don't fail the entire request if there's an issue with customer group channels
            pass
        
        # Handle payment type specific details
        if payment_type == PaymentMethodType.ONLINE_GATEWAY:
            self._create_online_gateway_details(payment_method, request.data)
            
        elif payment_type == PaymentMethodType.BANK_TRANSFER:
            self._create_bank_transfer_details(payment_method, request.data)
            
        elif payment_type == PaymentMethodType.CASH_OFFLINE:
            # First create the cash offline details with collection mechanism
            cash_offline_details = self._create_cash_offline_details(payment_method, request.data)
            
            # Then create specific details based on collection mechanism
            if collection_mechanism == CollectionMechanism.LOGISTICS_PARTNER:
                self._create_logistics_partner_details(cash_offline_details, request.data)
                
            elif collection_mechanism == CollectionMechanism.IN_STORE_POS:
                self._create_pos_details(cash_offline_details, request.data)
                
            elif collection_mechanism == CollectionMechanism.DIRECT_BANK_DEPOSIT:
                self._create_direct_deposit_details(cash_offline_details, request.data)
                
            elif collection_mechanism == CollectionMechanism.CHEQUE_DD:
                self._create_cheque_dd_details(cash_offline_details, request.data)
        
        # Return the serialized payment method
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @transaction.atomic
    def update(self, request, *args, **kwargs):
        """
        Update payment method and all related details.
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=kwargs.get('partial', False))
        serializer.is_valid(raise_exception=True)
        
        # Cannot change payment type after creation
        if 'payment_type' in serializer.validated_data and serializer.validated_data['payment_type'] != instance.payment_type:
            return Response(
                {'error': _('Payment type cannot be changed after creation')},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get user ID from the authenticated user
        user_id = request.user.id if hasattr(request.user, 'id') else None
        
        # Update the base payment method with updated_by field
        payment_method = serializer.save(updated_by=user_id)
        
        # Process customer group selling channels
        self._handle_customer_group_channels(payment_method, request.data, update=True)
        
        # Handle payment type specific details
        if instance.payment_type == PaymentMethodType.ONLINE_GATEWAY:
            self._update_online_gateway_details(payment_method, request.data)
            
        elif instance.payment_type == PaymentMethodType.BANK_TRANSFER:
            self._update_bank_transfer_details(payment_method, request.data)
            
        elif instance.payment_type == PaymentMethodType.CASH_OFFLINE:
            # Get the cash offline details
            try:
                cash_offline_details = instance.cash_offline_details
                # Cannot change collection mechanism after creation
                if 'collection_mechanism' in request.data and request.data['collection_mechanism'] != cash_offline_details.collection_mechanism:
                    return Response(
                        {'error': _('Collection mechanism cannot be changed after creation')},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                    
                # Update the appropriate collection mechanism details
                if cash_offline_details.collection_mechanism == CollectionMechanism.LOGISTICS_PARTNER:
                    self._update_logistics_partner_details(cash_offline_details, request.data)
                    
                elif cash_offline_details.collection_mechanism == CollectionMechanism.IN_STORE_POS:
                    self._update_pos_details(cash_offline_details, request.data)
                    
                elif cash_offline_details.collection_mechanism == CollectionMechanism.DIRECT_BANK_DEPOSIT:
                    self._update_direct_deposit_details(cash_offline_details, request.data)
                    
                elif cash_offline_details.collection_mechanism == CollectionMechanism.CHEQUE_DD:
                    self._update_cheque_dd_details(cash_offline_details, request.data)
            
            except CashOfflineDetails.DoesNotExist:
                # This shouldn't happen if data integrity is maintained
                logger.error(f"Cash offline details missing for payment method {instance.id}")
                return Response(
                    {'error': _('Payment method data is corrupted')},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return Response(serializer.data)
    
    def _handle_customer_group_channels(self, payment_method, data, update=False):
        """
        Handle creating/updating customer group selling channel relationships
        """
        # Try to get customer group IDs from both possible field names
        customer_group_ids = data.get('customer_group_selling_channel_ids', 
                                   data.get('customer_group_selling_channels', []))
        
        # Convert to list if it's not already
        if not isinstance(customer_group_ids, list):
            customer_group_ids = [customer_group_ids] if customer_group_ids else []
            
        # Filter out any None or empty values and convert to integers
        customer_group_ids = [int(gid) for gid in customer_group_ids if gid is not None and str(gid).strip()]
        
        if not customer_group_ids:
            return
        
        # Get user ID from the payment method for consistency
        user_id = payment_method.updated_by if update else payment_method.created_by
        
        # Get tenant IDs from the payment method
        client_id = payment_method.client_id
        company_id = payment_method.company_id
        
        with transaction.atomic():
            if update:
                # Delete existing relationships that are not in the new list
                PaymentMethodCustomerGroupSellingChannel.objects.filter(
                    payment_method=payment_method
                ).exclude(
                    customer_group_selling_channel__in=customer_group_ids
                ).update(is_active=False)
                
                # Get existing active relationships to avoid recreating them
                existing_relations = PaymentMethodCustomerGroupSellingChannel.objects.filter(
                    payment_method=payment_method,
                    customer_group_selling_channel__in=customer_group_ids,
                    is_active=True
                ).values_list('customer_group_selling_channel_id', flat=True)
                
                # Only create new relationships that don't already exist
                new_ids = set(customer_group_ids) - set(existing_relations)
            else:
                new_ids = customer_group_ids
            
            # Create new relationships
            for group_id in new_ids:
                PaymentMethodCustomerGroupSellingChannel.objects.update_or_create(
                    payment_method=payment_method,
                    customer_group_selling_channel_id=group_id,
                    defaults={
                        'client_id': client_id,
                        'company_id': company_id,
                        'created_by': user_id,
                        'updated_by': user_id,
                        'is_active': True
                    }
                )
    
    def _create_online_gateway_details(self, payment_method, data):
        """
        Create online gateway details for payment method.
        """
        # Try to get gateway_id from data
        gateway_id = data.get('gateway_id')
        
        # This should never happen due to serializer validation, but as a safeguard
        if not gateway_id:
            logger.error(f"Attempted to create online gateway details without gateway_id for payment method {payment_method.id}")
            raise ValidationError({
                'gateway_id': _('Gateway ID is required for online gateway payment methods')
            })
    
        # Get user ID from the payment method for consistency
        user_id = payment_method.created_by
            
        try:
            gateway = PaymentGateway.objects.get(pk=gateway_id)
            
            # Create the online gateway details
            PaymentGatewayOnlineDetails.objects.create(
                payment_method=payment_method,
                gateway=gateway,
                client_id=1,  # TODO: Replace with JWT claims
                company_id=1,  # TODO: Replace with JWT claims
                created_by=user_id,
                updated_by=user_id
            )
        except PaymentGateway.DoesNotExist:
            # This should never happen due to serializer validation, but as a safeguard
            logger.error(f"Payment gateway with ID {gateway_id} not found when creating payment method {payment_method.id}")
            # Delete the payment method that was just created since it's invalid without a gateway
            payment_method.delete()
            raise ValidationError({
                'gateway_id': _(f'Payment gateway with ID {gateway_id} does not exist')
            })
    
    def _update_online_gateway_details(self, payment_method, data):
        """
        Update online gateway details for payment method.
        """
        gateway_id = data.get('gateway_id')
        if not gateway_id:
            return
            
        try:
            gateway = PaymentGateway.objects.get(pk=gateway_id)
            
            # Get or create the online gateway details
            details, created = PaymentGatewayOnlineDetails.objects.get_or_create(
                payment_method=payment_method,
                defaults={
                    'gateway': gateway,
                    'client_id': 1,
                    'company_id': 1
                }
            )
            
            if not created:
                details.gateway = gateway
                details.save()
        except PaymentGateway.DoesNotExist:
            logger.error(f"Payment gateway with ID {gateway_id} not found")
    
    def _create_bank_transfer_details(self, payment_method, data):
        """
        Create bank transfer details for payment method.
        """
        bank_fields = [
            'beneficiary_bank_name', 'beneficiary_account_no',
            'beneficiary_ifsc_code', 'beneficiary_account_holder_name',
            'instructions_for_customer'
        ]
        
        bank_data = {field: data.get(field) for field in bank_fields if field in data}
        user_id = payment_method.created_by

        if bank_data:
            BankTransferDetails.objects.create(
                payment_method=payment_method,
                client_id=1,
                company_id=1,
                created_by=user_id,
                updated_by=user_id,
                **bank_data
            )
    
    def _update_bank_transfer_details(self, payment_method, data):
        """
        Update bank transfer details for payment method.
        """
        try:
            bank_transfer_details = payment_method.bank_transfer_details
            
            bank_fields = [
                'beneficiary_bank_name', 'beneficiary_account_no',
                'beneficiary_ifsc_code', 'beneficiary_account_holder_name',
                'instructions_for_customer'
            ]
            
            # Update any fields that are provided
            for field in bank_fields:
                if field in data:
                    setattr(bank_transfer_details, field, data.get(field))
            
            bank_transfer_details.save()
        except BankTransferDetails.DoesNotExist:
            # Create if it doesn't exist
            self._create_bank_transfer_details(payment_method, data)
    
    def _create_cash_offline_details(self, payment_method, data):
        """
        Create cash offline details for payment method.
        Returns the created CashOfflineDetails instance.
        """
        collection_mechanism = data.get('collection_mechanism')
        
        if not collection_mechanism:
            logger.error("Collection mechanism is required for cash offline payment type")
            return None
            
        return CashOfflineDetails.objects.create(
            payment_method=payment_method,
            collection_mechanism=collection_mechanism,
            client_id=1,
            company_id=1,
            created_by=payment_method.created_by,
            updated_by=payment_method.updated_by
        )
    
    def _create_logistics_partner_details(self, cash_details, data):
        """
        Create logistics partner (COD) details for cash offline payment method.
        """
        logistics_fields = [
            'logistics_partner_name', 'api_key', 'merchant_id',
            'cod_collection_limit', 'partner_settlement_cycle_days'
        ]
        
        logistics_data = {field: data.get(field) for field in logistics_fields if field in data}
        
        # Handle foreign key to BankAccount
        settlement_bank_account_id = data.get('settlement_bank_account')
        settlement_bank_account = None
        
        if settlement_bank_account_id:
            try:
                settlement_bank_account = BankAccount.objects.get(pk=settlement_bank_account_id)
            except BankAccount.DoesNotExist:
                logger.error(f"Bank account with ID {settlement_bank_account_id} not found")
        
        if logistics_data:
            CashLogisticsPartnerDetails.objects.create(
                payment_method=cash_details,
                settlement_bank_account=settlement_bank_account,
                client_id=1,
                company_id=1,
                created_by=cash_details.payment_method.created_by,
                updated_by=cash_details.payment_method.updated_by,
                **logistics_data
            )
    
    def _update_logistics_partner_details(self, cash_details, data):
        """
        Update logistics partner (COD) details for cash offline payment method.
        """
        try:
            logistics_details = cash_details.logistics_details
            
            logistics_fields = [
                'logistics_partner_name', 'api_key', 'merchant_id',
                'cod_collection_limit', 'partner_settlement_cycle_days'
            ]
            
            # Update fields
            for field in logistics_fields:
                if field in data:
                    setattr(logistics_details, field, data.get(field))
            
            # Handle foreign key to BankAccount
            settlement_bank_account_id = data.get('settlement_bank_account')
            if settlement_bank_account_id:
                try:
                    settlement_bank_account = BankAccount.objects.get(pk=settlement_bank_account_id)
                    logistics_details.settlement_bank_account = settlement_bank_account
                except BankAccount.DoesNotExist:
                    logger.error(f"Bank account with ID {settlement_bank_account_id} not found")
            
            logistics_details.save()
        except CashLogisticsPartnerDetails.DoesNotExist:
            # Create if it doesn't exist
            self._create_logistics_partner_details(cash_details, data)
    
    def _create_pos_details(self, cash_details, data):
        """
        Create POS details for cash offline payment method.
        """
        pos_fields = [
            'physical_location_id', 'pos_device_provider', 'terminal_id',
            'merchant_id', 'api_key', 'supported_card_networks'
        ]
        
        pos_data = {field: data.get(field) for field in pos_fields if field in data}
        
        if pos_data:
            CashPOSDetails.objects.create(
                payment_method=cash_details,
                client_id=1,
                company_id=1,
                created_by=cash_details.payment_method.created_by,
                updated_by=cash_details.payment_method.updated_by,
                **pos_data
            )
    
    def _update_pos_details(self, cash_details, data):
        """
        Update POS details for cash offline payment method.
        """
        try:
            pos_details = cash_details.pos_details
            
            pos_fields = [
                'physical_location_id', 'pos_device_provider', 'terminal_id',
                'merchant_id', 'api_key', 'supported_card_networks'
            ]
            
            # Update fields
            for field in pos_fields:
                if field in data:
                    setattr(pos_details, field, data.get(field))
            
            pos_details.save()
        except CashPOSDetails.DoesNotExist:
            # Create if it doesn't exist
            self._create_pos_details(cash_details, data)
    
    def _create_direct_deposit_details(self, cash_details, data):
        """
        Create direct bank deposit details for cash offline payment method.
        """
        deposit_fields = [
            'customer_instructions', 'required_proof_details'
        ]
        
        deposit_data = {field: data.get(field) for field in deposit_fields if field in data}
        
        # Handle foreign key to BankAccount - this is required
        bank_account_id = data.get('beneficiary_bank_account')
        
        if not bank_account_id:
            logger.error("beneficiary_bank_account is required for direct bank deposit payment method")
            raise ValidationError({
                'beneficiary_bank_account': _('Bank account is required for direct bank deposit payment method')
            })
            
        try:
            bank_account = BankAccount.objects.get(pk=bank_account_id)
        except BankAccount.DoesNotExist:
            logger.error(f"Bank account with ID {bank_account_id} not found")
            raise ValidationError({
                'beneficiary_bank_account': _(f'Bank account with ID {bank_account_id} not found')
            })
        
        # Create the direct deposit details
        CashDirectDepositDetails.objects.create(
            payment_method=cash_details,
            beneficiary_bank_account=bank_account,
            client_id=1,
            company_id=1,
            created_by=cash_details.payment_method.created_by,
            updated_by=cash_details.payment_method.updated_by,
            **deposit_data
        )
    
    def _update_direct_deposit_details(self, cash_details, data):
        """
        Update direct bank deposit details for cash offline payment method.
        """
        try:
            deposit_details = cash_details.direct_deposit_details
            
            deposit_fields = [
                'customer_instructions', 'required_proof_details'
            ]
            
            # Update fields
            for field in deposit_fields:
                if field in data:
                    setattr(deposit_details, field, data.get(field))
            
            # Handle foreign key to BankAccount
            bank_account_id = data.get('beneficiary_bank_account')
            if bank_account_id:
                try:
                    bank_account = BankAccount.objects.get(pk=bank_account_id)
                    deposit_details.beneficiary_bank_account = bank_account
                except BankAccount.DoesNotExist:
                    logger.error(f"Bank account with ID {bank_account_id} not found")
                    raise ValidationError({
                        'beneficiary_bank_account': _(f'Bank account with ID {bank_account_id} not found')
                    })
            
            deposit_details.save()
        except CashDirectDepositDetails.DoesNotExist:
            # Create if it doesn't exist
            self._create_direct_deposit_details(cash_details, data)
    
    def _create_cheque_dd_details(self, cash_details, data):
        """
        Create cheque/DD details for cash offline payment method.
        """
        cheque_fields = [
            'payee_name', 'collection_address', 'clearing_time_days', 'bounced_cheque_charges'
        ]
        
        cheque_data = {field: data.get(field) for field in cheque_fields if field in data}
        
        # Handle foreign key to BankAccount - this is required
        bank_account_id = data.get('deposit_bank_account')
        
        if not bank_account_id:
            logger.error("deposit_bank_account is required for cheque/DD payment method")
            raise ValidationError({
                'deposit_bank_account': _('Bank account is required for cheque/DD payment method')
            })
            
        try:
            bank_account = BankAccount.objects.get(pk=bank_account_id)
        except BankAccount.DoesNotExist:
            logger.error(f"Bank account with ID {bank_account_id} not found")
            raise ValidationError({
                'deposit_bank_account': _(f'Bank account with ID {bank_account_id} not found')
            })
        
        # Create the cheque/DD details
        CashChequeDDDetails.objects.create(
            payment_method=cash_details,
            deposit_bank_account=bank_account,
            client_id=1,
            company_id=1,
            created_by=cash_details.payment_method.created_by,
            updated_by=cash_details.payment_method.updated_by,
            **cheque_data
        )
    
    def _update_cheque_dd_details(self, cash_details, data):
        """
        Update cheque/DD details for cash offline payment method.
        """
        try:
            cheque_details = cash_details.cheque_dd_details
            
            cheque_fields = [
                'payee_name', 'collection_address', 'clearing_time_days', 'bounced_cheque_charges'
            ]
            
            # Update fields
            for field in cheque_fields:
                if field in data:
                    setattr(cheque_details, field, data.get(field))
            
            # Handle foreign key to BankAccount
            bank_account_id = data.get('deposit_bank_account')
            if bank_account_id:
                try:
                    bank_account = BankAccount.objects.get(pk=bank_account_id)
                    cheque_details.deposit_bank_account = bank_account
                except BankAccount.DoesNotExist:
                    logger.error(f"Bank account with ID {bank_account_id} not found")
                    raise ValidationError({
                        'deposit_bank_account': _(f'Bank account with ID {bank_account_id} not found')
                    })
            
            cheque_details.save()
        except CashChequeDDDetails.DoesNotExist:
            # Create if it doesn't exist
            self._create_cheque_dd_details(cash_details, data)


class StorePaymentMethodViewSet(TenantModelViewSet):
    """
    API endpoint that allows all payment methods to be viewed (no pagination, public).
    """
    serializer_class = PaymentMethodSerializer
    queryset = PaymentMethod.objects.all()
    authentication_classes = [TenantSchemaMiddleware]
    permission_classes = [AllowAny]


    
    def list(self, request, *args, **kwargs):
        """
        Return all payment methods for the tenant, optionally filtered by segment (customer group selling channel).
        If ?segment_name=... is provided, only payment methods linked to that segment are returned.
        """
        # Always filter for active and visible payment methods
        queryset = self.filter_queryset(
            self.get_queryset().filter(is_active=True, is_visible_on_store=True)
        )

        segment_name = request.query_params.get('segment_name')
        if segment_name:
            # 1. Find all active customer group selling channels for this segment name
            group_channels = CustomerGroupSellingChannel.objects.filter(
                segment_name=segment_name,
                status="ACTIVE"
            )
            # 2. Find all PaymentMethodCustomerGroupSellingChannel with these group_channels and is_active
            pmcgc_qs = PaymentMethodCustomerGroupSellingChannel.objects.filter(
                customer_group_selling_channel__in=group_channels,
                is_active=True
            )
            # 3. Get all related payment method IDs
            payment_method_ids = pmcgc_qs.values_list('payment_method_id', flat=True)
            # 4. Filter payment methods by these IDs (still only active/visible)
            queryset = queryset.filter(id__in=payment_method_ids)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)