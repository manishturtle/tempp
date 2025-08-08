"""
Serializers for the customers app.

This module defines serializers for customer-related models such as
CustomerGroup, Account, Contact, Address, and OrderAddress.
"""
from django.db import transaction
from rest_framework import serializers
from .models import CustomerGroup, Address, Account, Contact, ContactAddress, CustomerGroupSellingChannel, OrderAddress


class CustomerGroupSellingChannelSerializer(serializers.ModelSerializer):
    """
    Serializer for the CustomerGroupSellingChannel model.
    """
    id = serializers.ReadOnlyField()
    selling_channel_id = serializers.IntegerField(source='selling_channel.id')
    selling_channel_name = serializers.CharField(source='selling_channel.name', read_only=True)
    status = serializers.ChoiceField(choices=CustomerGroupSellingChannel.STATUS_CHOICES)
    segment_name = serializers.CharField(read_only=True, help_text="Auto-generated segment name in format 'groupname-sellingchannelname'")
    
    class Meta:
        model = CustomerGroupSellingChannel
        fields = ['id', 'selling_channel_id', 'selling_channel_name', 'status', 'segment_name']
        read_only_fields = ['id', 'selling_channel_name', 'segment_name']


class CustomerGroupSellingChannelDetailSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for the CustomerGroupSellingChannel model.
    Includes both customer group and selling channel names.
    """
    id = serializers.ReadOnlyField()
    customer_group_id = serializers.IntegerField(source='customer_group.id')
    customer_group_name = serializers.CharField(source='customer_group.group_name', read_only=True)
    selling_channel_id = serializers.IntegerField(source='selling_channel.id')
    selling_channel_name = serializers.CharField(source='selling_channel.name', read_only=True)
    status = serializers.ChoiceField(choices=CustomerGroupSellingChannel.STATUS_CHOICES)
    segment_name = serializers.CharField(read_only=True)
    
    class Meta:
        model = CustomerGroupSellingChannel
        fields = [
            'id', 
            'customer_group_id', 
            'customer_group_name',
            'selling_channel_id', 
            'selling_channel_name', 
            'status', 
            'segment_name'
        ]
        read_only_fields = ['id', 'customer_group_name', 'selling_channel_name', 'segment_name']


class CustomerGroupSerializer(serializers.ModelSerializer):
    """
    Serializer for the CustomerGroup model.
    
    This serializer handles validation and serialization of CustomerGroup objects,
    making audit fields read-only. When creating a new CustomerGroup, is_active
    defaults to True if not explicitly provided.
    """
    # Override is_active field to make it not required
    is_active = serializers.BooleanField(required=False)
    display_name = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    selling_channels = CustomerGroupSellingChannelSerializer(
        source='selling_channel_relationships', 
        many=True, 
        required=False,
        read_only=True
    )
    selling_channel_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        help_text="List of selling channel IDs to associate with this customer group"
    )
    
    class Meta:
        model = CustomerGroup
        fields = [
            'id', 
            'group_name', 
            'group_type', 
            'display_name',
            'description',
            'is_active', 
            'company_id',
            'created_at', 
            'updated_at', 
            'created_by', 
            'updated_by',
            'custom_fields',
            'selling_channels',
            'selling_channel_ids'
        ]
        read_only_fields = [
            'id', 
            'company_id',
            'created_at', 
            'updated_at', 
            'created_by', 
            'updated_by',
            'selling_channels',
        ]
        
    def validate(self, data):
        """
        Validate the data for CustomerGroup.
        
        Ensures is_active defaults to True for new instances when not provided.
        """
        # For create operations (when instance is None), set is_active to True if not provided
        if self.instance is None and 'is_active' not in data:
            data['is_active'] = True
            
        return data


class AddressSerializer(serializers.ModelSerializer):
    """
    Serializer for the Address model.
    
    This serializer is designed primarily for nested use within the Account API.
    It handles validation and serialization of Address objects, including validation
    of primary address uniqueness.
    
    Note: Branch address count validation is primarily handled in the Account
    serializer/view where the full context is clearer. This serializer only handles
    primary address uniqueness validation.
    """
    
    class Meta:
        model = Address
        fields = [
            'id',
            'address_type',
            'business_name',
            'gst_number',
            'street_1',
            'street_2',
            'street_3',
            'full_name',
            'phone_number',
            'city',
            'state_province',
            'postal_code',
            'country',
            'is_primary_billing',
            'is_primary_shipping',
            'created_at',
            'updated_at',
            'created_by',
            'updated_by',
            'custom_fields'
        ]
        read_only_fields = [
            'id',
            'created_at',
            'updated_at',
            'created_by',
            'updated_by'
        ]
    
    def validate(self, data):
        """
        Validate the address data.
        
        This method enforces the following rules:
        1. If is_primary_billing is True, ensure no other Address linked to the same
           Account already has is_primary_billing as True.
        2. If is_primary_shipping is True, ensure no other Address linked to the same
           Account already has is_primary_shipping as True.
        
        Note: Branch address count validation is handled in the Account serializer/view.
        """
        # Get the account from context or from the data
        account = self.context.get('account')
        
        # If we're updating an existing address, we can get the account from the instance
        if not account and self.instance:
            account = self.instance.account
            
        # For nested serializers in Account updates/creates, the account might be in the parent data
        if not account and hasattr(self, 'parent') and self.parent:
            if hasattr(self.parent, 'instance') and self.parent.instance:
                account = self.parent.instance
        
        if not account:
            raise serializers.ValidationError({
                'account': 'Account context is required for address validation.'
            })
        
        # Get the current instance (if this is an update)
        instance = self.instance
        
        # Validate primary billing address uniqueness
        if data.get('is_primary_billing'):
            # Check if another address is already primary billing
            existing_primary = Address.objects.filter(
                account=account,
                is_primary_billing=True
            )
            
            # Exclude the current instance if this is an update
            if instance:
                existing_primary = existing_primary.exclude(pk=instance.pk)
            
            if existing_primary.exists():
                raise serializers.ValidationError({
                    'is_primary_billing': 'This account already has a primary billing address.'
                })
        
        # Validate primary shipping address uniqueness
        if data.get('is_primary_shipping'):
            # Check if another address is already primary shipping
            existing_primary = Address.objects.filter(
                account=account,
                is_primary_shipping=True
            )
            
            # Exclude the current instance if this is an update
            if instance:
                existing_primary = existing_primary.exclude(pk=instance.pk)
            
            if existing_primary.exists():
                raise serializers.ValidationError({
                    'is_primary_shipping': 'This account already has a primary shipping address.'
                })
        
        # Note: Branch address count validation is handled in the Account serializer/view
        # where the full context is clearer. A branch account should have at most one address.
        
        return data


class ParentAccountSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for parent account representation.
    
    This serializer is used for nested representation of parent accounts
    within the AccountSerializer. It includes only the essential fields
    needed for identifying and displaying the parent account.
    """
    
    class Meta:
        model = Account
        fields = ['id', 'name', 'account_number']
        read_only_fields = ['id', 'name', 'account_number']


class ContactAccountSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for account representation in contacts.
    
    This serializer is used for nested representation of accounts within
    the ContactSerializer. It includes only the essential fields needed
    for identifying and displaying the account.
    """
    
    class Meta:
        model = Account
        fields = ['id', 'name', 'account_number', 'status']
        read_only_fields = ['id', 'name', 'account_number', 'status']


class AccountSerializer(serializers.ModelSerializer):
    """
    Serializer for the Account model.
    
    This serializer handles validation and serialization of Account objects,
    including nested address and contact handling, and parent-child relationship validation.
    It supports creating, updating, and deleting addresses and contacts as part of Account
    operations, with all operations performed in atomic transactions.
    """
    # Nested serializers for related objects
    customer_group = CustomerGroupSerializer(read_only=True)
    customer_group_id = serializers.PrimaryKeyRelatedField(
        queryset=CustomerGroup.objects.all(),
        source='customer_group',
        write_only=True,
        required=False,
        allow_null=True
    )
    
    parent_account = ParentAccountSerializer(read_only=True)
    parent_account_id = serializers.PrimaryKeyRelatedField(
        queryset=Account.objects.all(),
        source='parent_account',
        write_only=True,
        required=False,
        allow_null=True
    )
    
    # Use a custom method for addresses to ensure proper context passing
    addresses = serializers.SerializerMethodField()
    
    # Use a custom method for contacts to ensure proper context passing
    contacts = serializers.SerializerMethodField()
    
    def get_addresses(self, obj):
        # Get addresses with proper context
        serializer = AddressSerializer(obj.addresses.all(), many=True, context={'account': obj})
        return serializer.data
    
    def get_contacts(self, obj):
        # Get contacts with proper context
        serializer = ContactSerializer(obj.contacts.all(), many=True, context={'account': obj})
        return serializer.data
    
    # Read-only fields
    effective_customer_group = CustomerGroupSerializer(read_only=True)
    
    class Meta:
        model = Account
        fields = [
            'id',
            'name',
            'legal_name',
            'account_number',
            'customer_group',
            'customer_group_id',
            'effective_customer_group',
            'status',
            'parent_account',
            'parent_account_id',
            'owner',
            'website',
            'primary_phone',
            'industry',
            'company_size',
            'tax_id',
            'description',
            'addresses',
            'contacts',
            'company_id',
            'created_at',
            'updated_at',
            'created_by',
            'updated_by',
            'custom_fields'
        ]
        read_only_fields = [
            'id',
            'effective_customer_group',
            'company_id',
            'created_at',
            'updated_at',
            'created_by',
            'updated_by'
        ]
    
    def validate(self, data):
        """
        Validate the account data.
        
        This method enforces the following rules:
        1. Branch accounts (with parent_account set) can have at most one address.
        2. Primary address uniqueness is enforced by the AddressSerializer.
        3. Parent-child relationship validation is handled by the model's clean method.
        """
        # Get the current instance (if this is an update)
        instance = self.instance
        
        # Check if this is a branch account
        parent_account = data.get('parent_account')
        
        # Get addresses data
        addresses_data = self.initial_data.get('addresses', [])
        
        # If this is a branch account, enforce address limit
        if parent_account:
            # For updates, count existing addresses that aren't being replaced
            existing_address_count = 0
            if instance:
                # Get IDs of addresses in the request
                address_ids_in_request = [
                    addr.get('id') for addr in addresses_data 
                    if isinstance(addr, dict) and addr.get('id')
                ]
                
                # Count existing addresses not in the request (they'll be kept)
                existing_address_count = instance.addresses.exclude(
                    id__in=address_ids_in_request
                ).count()
            
            # Count new addresses in the request
            new_address_count = len([
                addr for addr in addresses_data 
                if isinstance(addr, dict) and not addr.get('id')
            ])
            
            # Total address count after operation
            total_address_count = existing_address_count + new_address_count
            
            if total_address_count > 1:
                raise serializers.ValidationError({
                    'addresses': 'Branch accounts can have at most one address.'
                })
        
        return data
    
    def validate_emails(self, contacts_data):
        """
        Validate that all contact emails are unique and don't already exist in the system.
        
        Args:
            contacts_data: List of contact data dictionaries
            
        Returns:
            None
            
        Raises:
            serializers.ValidationError: If any email already exists in the system
        """
        # Collect all non-empty emails from the request
        request_emails = set()
        for i, contact_data in enumerate(contacts_data):
            if isinstance(contact_data, dict):
                email = contact_data.get('email', '').strip().lower()
                if email:  # Only check non-empty emails
                    if email in request_emails:
                        raise serializers.ValidationError({
                            'contacts': [
                                {'email': f'Duplicate email "{email}" in the request.'}
                            ]
                        })
                    request_emails.add(email)
        
        # Check against existing emails in the database
        if request_emails:
            existing_emails = set(Contact.objects.filter(
                email__in=request_emails
            ).values_list('email', flat=True))
            
            if existing_emails:
                emails_str = ', '.join(sorted(existing_emails))
                raise serializers.ValidationError(
                    f'These email addresses are already registered : {emails_str}.'
                )
    
    def create(self, validated_data):
        """
        Create an account with nested addresses and contacts.
        
        This method handles creating an account and its related addresses and contacts in a single
        atomic transaction. It ensures that all related records are properly created with the
        correct tenant and user information.
        
        For child accounts (with parent_account set), this method enforces customer group inheritance
        by automatically setting the customer_group to match the parent's effective_customer_group,
        overriding any submitted value.
        """
        # Extract nested data
        addresses_data = self.initial_data.get('addresses', [])
        contacts_data = self.initial_data.get('contacts', [])
        
        # Validate email uniqueness before creating any records
        self.validate_emails(contacts_data)
        
        # Remove nested data from validated_data to avoid nested serializer issues
        if 'addresses' in validated_data:
            validated_data.pop('addresses')
        if 'contacts' in validated_data:
            validated_data.pop('contacts')
        
        # Get audit fields from validated_data if they exist
        audit_fields = {}
        if 'created_by' in validated_data:
            audit_fields['created_by'] = validated_data.pop('created_by')
        if 'updated_by' in validated_data:
            audit_fields['updated_by'] = validated_data.pop('updated_by')
        
        # Enforce customer group inheritance for child accounts
        parent_account_instance = validated_data.get('parent_account')  # Assumes validated_data contains the instance or ID
        parent_account_id = getattr(parent_account_instance, 'pk', None) if parent_account_instance else None
        
        if parent_account_id:
            try:
                # Fetch the parent to get its effective group
                parent = Account.objects.get(pk=parent_account_id)
                correct_group = parent.effective_customer_group  # Use the property from the model
                if correct_group:
                    validated_data['customer_group'] = correct_group  # Override submitted value
                else:
                    # Handle case where parent hierarchy somehow has no group
                    raise serializers.ValidationError("Parent account hierarchy does not have a valid Customer Group.")
            except Account.DoesNotExist:
                raise serializers.ValidationError({"parent_account": "Invalid Parent Account specified."})
        elif 'customer_group' not in validated_data or validated_data['customer_group'] is None:
            # If not a child account, ensure a group was provided (it's mandatory)
            raise serializers.ValidationError({"customer_group": "This field is required for top-level accounts."})
        
        try:
            with transaction.atomic():
                # Create the account with audit fields and the potentially modified customer_group
                # Get the client_id from the request or use the default
                client_id = getattr(self.context['request'], 'tenant_id', 1)
                
                account = Account.objects.create(
                    **validated_data,
                    **audit_fields,
                    client_id=client_id
                )
                
                # Create addresses for the account
                for address_data in addresses_data:
                    if isinstance(address_data, dict):
                        # Create address using model instance
                        # Get the client_id from the request or use the default
                        client_id = getattr(self.context['request'], 'tenant_id', 1)
                        
                        address = Address(
                            account=account,
                            client_id=client_id,
                            **audit_fields
                        )
                        
                        # Set other fields from address_data
                        for key, value in address_data.items():
                            if key not in ['id', 'account', 'client', 'created_by', 'updated_by']:
                                # Map frontend field names to backend field names if needed
                                if key == 'is_billing':
                                    setattr(address, 'is_primary_billing', value)
                                elif key == 'is_shipping':
                                    setattr(address, 'is_primary_shipping', value)
                                elif key == 'state':
                                    setattr(address, 'state_province', value)
                                else:
                                    setattr(address, key, value)
                        
                        # Save the address
                        address.save()
                
                # Store created addresses in a list for easy access by index
                created_addresses = list(account.addresses.all())
                
                # Create contacts for the account
                for contact_data in contacts_data:
                    if isinstance(contact_data, dict):
                        # Extract linked_addresses before processing other fields
                        linked_addresses = contact_data.pop('linked_addresses', [])
                        
                        # Create contact using model instance
                        # Get the client_id from the request or use the default
                        client_id = getattr(self.context['request'], 'tenant_id', 1)
                        
                        contact = Contact(
                            account=account,
                            client_id=client_id,
                            **audit_fields
                        )
                        
                        # Set other fields from contact_data
                        for key, value in contact_data.items():
                            if key not in ['id', 'account_id', 'account', 'client', 'created_by', 'updated_by']:
                                # Handle empty strings for foreign keys
                                if key == 'owner' and (value == '' or value is None):
                                    # Use account owner as default if available
                                    if account.owner:
                                        setattr(contact, 'owner', account.owner)
                                else:
                                    setattr(contact, key, value)
                        
                        # Save the contact
                        contact.save()
                        
                        # Link contact to addresses if specified
                        if linked_addresses and isinstance(linked_addresses, list):
                            for address_idx in linked_addresses:
                                # Ensure the index is valid
                                if isinstance(address_idx, int) and 0 <= address_idx < len(created_addresses):
                                    ContactAddress.objects.create(
                                        contact=contact,
                                        address=created_addresses[address_idx],
                                        **audit_fields
                                    )
        
        except Exception as e:
            # Raise DRF validation error to signal failure
            raise serializers.ValidationError(f"Failed to create account and related records: {e}") from e
        
        return account
    
    def update(self, instance, validated_data):
        """
        Update an account with nested addresses and contacts.
        
        This method handles updating an account and its related addresses and contacts in a single
        atomic transaction. For simplicity, it uses a delete-and-recreate strategy for related
        records, which ensures consistency but may not be optimal for preserving IDs.
        
        For child accounts (with parent_account set), this method enforces customer group inheritance
        by automatically setting the customer_group to match the parent's effective_customer_group,
        overriding any submitted value.
        
        TODO: Implement a more sophisticated diffing strategy for updates later
              to avoid unnecessary deletes/creates and preserve existing IDs/audit info.
        """
        # Extract nested data
        addresses_data = self.initial_data.get('addresses', [])
        contacts_data = self.initial_data.get('contacts', [])
        
        # Remove nested data from validated_data to avoid nested serializer issues
        if 'addresses' in validated_data:
            validated_data.pop('addresses')
        if 'contacts' in validated_data:
            validated_data.pop('contacts')
        
        # Prepare audit kwargs for update
        audit_kwargs = {}
        request = self.context.get('request')
        if request and hasattr(request, 'user') and not request.user.is_anonymous:
            audit_kwargs['updated_by'] = request.user
            # Inherit created_by, client_id, company_id from instance for creates below
            audit_kwargs['created_by'] = instance.created_by  # Keep original creator
            audit_kwargs['client_id'] = instance.client_id
            audit_kwargs['company_id'] = instance.company_id
        
        # Enforce customer group inheritance for child accounts
        parent_account_instance = validated_data.get('parent_account', instance.parent_account)  # Check incoming data or existing instance
        parent_account_id = getattr(parent_account_instance, 'pk', None) if parent_account_instance else None
        
        if parent_account_id:
            try:
                parent = Account.objects.get(pk=parent_account_id)
                correct_group = parent.effective_customer_group
                if correct_group:
                    validated_data['customer_group'] = correct_group  # Ensure update uses this
                else:
                    raise serializers.ValidationError("Parent account hierarchy does not have a valid Customer Group.")
            except Account.DoesNotExist:
                raise serializers.ValidationError({"parent_account": "Invalid Parent Account specified."})
        elif 'customer_group' not in validated_data or validated_data['customer_group'] is None:
            # If parent is being REMOVED, customer_group becomes mandatory if not already set
            if instance.parent_account is not None and 'parent_account' in validated_data and validated_data['parent_account'] is None:
                if instance.customer_group is None:  # Should not happen if always set, but defensive check
                    raise serializers.ValidationError({"customer_group": "Customer Group is required when removing parent link."})
                # Keep existing group if parent removed
                validated_data['customer_group'] = instance.customer_group
        
        try:
            with transaction.atomic():
                # Update account fields with potentially modified customer_group
                for attr, value in validated_data.items():
                    setattr(instance, attr, value)
                
                # Save the account
                instance.save()
                
                # Simple Nested Update Strategy: Delete existing, recreate from payload
                # Only if this is a full update (PUT) and data is provided
                if self.context.get('request') and self.context['request'].method == 'PUT':
                    # Delete existing records if data is provided
                    if addresses_data:
                        instance.addresses.all().delete()
                    if contacts_data:
                        instance.contacts.all().delete()
                    
                    # Recreate addresses
                    for address_data in addresses_data:
                        if isinstance(address_data, dict):
                            # Prepare address data
                            address_obj = {
                                'account': instance,
                                'client': instance.client,
                                'created_by': audit_kwargs.get('created_by'),
                                'updated_by': audit_kwargs.get('updated_by')
                            }
                            
                            # Add all other fields from address_data
                            for key, value in address_data.items():
                                if key not in ['id', 'account', 'client', 'created_by', 'updated_by']:
                                    # Map frontend field names to backend field names if needed
                                    if key == 'is_billing':
                                        address_obj['is_primary_billing'] = value
                                    elif key == 'is_shipping':
                                        address_obj['is_primary_shipping'] = value
                                    elif key == 'state':
                                        address_obj['state_province'] = value
                                    else:
                                        address_obj[key] = value
                            
                            # Create address using model instance to avoid duplicate field issues
                            # Get the client_id from the request or use the default
                            client_id = getattr(self.context['request'], 'tenant_id', 1)
                            
                            address = Address(
                                account=instance,
                                client_id=client_id,
                                created_by=audit_kwargs.get('created_by'),
                                updated_by=audit_kwargs.get('updated_by')
                            )
                            
                            # Set all other fields from address_data
                            for key, value in address_data.items():
                                if key not in ['id', 'account', 'client', 'created_by', 'updated_by']:
                                    # Map frontend field names to backend field names if needed
                                    if key == 'is_billing':
                                        setattr(address, 'is_primary_billing', value)
                                    elif key == 'is_shipping':
                                        setattr(address, 'is_primary_shipping', value)
                                    elif key == 'state':
                                        setattr(address, 'state_province', value)
                                    else:
                                        setattr(address, key, value)
                            
                            # Save the address
                            address.save()
                    
                    # Recreate contacts
                    for contact_data in contacts_data:
                        if isinstance(contact_data, dict):
                            # Prepare contact data
                            # Get the client_id from the request or use the default
                            client_id = getattr(self.context['request'], 'tenant_id', 1)
                            
                            contact_obj = {
                                'account': instance,
                                'client_id': client_id,
                                'created_by': audit_kwargs.get('created_by'),
                                'updated_by': audit_kwargs.get('updated_by')
                            }
                            
                            # Add all other fields from contact_data
                            for key, value in contact_data.items():
                                if key not in ['id', 'account_id', 'account', 'client', 'created_by', 'updated_by']:
                                    # Handle empty strings for foreign keys
                                    if key == 'owner' and (value == '' or value is None):
                                        # Use account owner as default if available
                                        if instance.owner:
                                            contact_obj['owner'] = instance.owner
                                    else:
                                        contact_obj[key] = value
                            
                            # Create contact using model instance to avoid duplicate field issues
                            # Get the client_id from the request or use the default
                            client_id = getattr(self.context['request'], 'tenant_id', 1)
                            
                            contact = Contact(
                                account=instance,
                                client_id=client_id,
                                created_by=audit_kwargs.get('created_by'),
                                updated_by=audit_kwargs.get('updated_by')
                            )
                            
                            # Set all other fields from contact_data
                            for key, value in contact_data.items():
                                if key not in ['id', 'account_id', 'account', 'client', 'created_by', 'updated_by']:
                                    # Handle empty strings for foreign keys
                                    if key == 'owner' and (value == '' or value is None):
                                        # Use account owner as default if available
                                        if instance.owner:
                                            setattr(contact, 'owner', instance.owner)
                                    else:
                                        setattr(contact, key, value)
                            
                            # Save the contact
                            contact.save()
                else:
                    # For partial updates (PATCH), use the more sophisticated approach
                    # that preserves existing records
                    
                    # Handle addresses if provided
                    if addresses_data:
                        # Get existing address IDs
                        existing_address_ids = set(instance.addresses.values_list('id', flat=True))
                        
                        # Track address IDs in the request
                        address_ids_in_request = set()
                        
                        # Process each address in the request
                        for address_data in addresses_data:
                            if isinstance(address_data, dict):
                                address_id = address_data.get('id')
                                
                                if address_id:  # Update existing address
                                    address_ids_in_request.add(address_id)
                                    
                                    try:
                                        address = instance.addresses.get(id=address_id)
                                        
                                        # Update only the fields that were provided
                                        for key, value in address_data.items():
                                            if key not in ['id', 'account', 'client', 'created_by']:
                                                # Map frontend field names to backend field names if needed
                                                if key == 'is_billing':
                                                    setattr(address, 'is_primary_billing', value)
                                                elif key == 'is_shipping':
                                                    setattr(address, 'is_primary_shipping', value)
                                                elif key == 'state':
                                                    setattr(address, 'state_province', value)
                                                else:
                                                    setattr(address, key, value)
                                        
                                        # Set updated_by from audit_kwargs
                                        if 'updated_by' in audit_kwargs:
                                            address.updated_by = audit_kwargs['updated_by']
                                        
                                        # Save the address
                                        address.save()
                                    except Address.DoesNotExist:
                                        # Address ID provided but doesn't exist or doesn't belong to this account
                                        pass
                                else:  # Create new address
                                    # Prepare address data
                                    address_obj = {
                                        'account': instance,
                                        'client': instance.client,
                                        'created_by': audit_kwargs.get('created_by'),
                                        'updated_by': audit_kwargs.get('updated_by')
                                    }
                                    
                                    # Add all other fields from address_data
                                    for key, value in address_data.items():
                                        if key not in ['id', 'account', 'client', 'created_by', 'updated_by']:
                                            # Map frontend field names to backend field names if needed
                                            if key == 'is_billing':
                                                address_obj['is_primary_billing'] = value
                                            elif key == 'is_shipping':
                                                address_obj['is_primary_shipping'] = value
                                            elif key == 'state':
                                                address_obj['state_province'] = value
                                            else:
                                                address_obj[key] = value
                                    
                                    # Create address using model instance to avoid duplicate field issues
                                    address = Address(
                                        account=instance,
                                        client=instance.client,
                                        created_by=audit_kwargs.get('created_by'),
                                        updated_by=audit_kwargs.get('updated_by')
                                    )
                                    
                                    # Set all other fields from address_data
                                    for key, value in address_data.items():
                                        if key not in ['id', 'account', 'client', 'created_by', 'updated_by']:
                                            # Map frontend field names to backend field names if needed
                                            if key == 'is_billing':
                                                setattr(address, 'is_primary_billing', value)
                                            elif key == 'is_shipping':
                                                setattr(address, 'is_primary_shipping', value)
                                            elif key == 'state':
                                                setattr(address, 'state_province', value)
                                            else:
                                                setattr(address, key, value)
                                    
                                    # Save the address
                                    address.save()
                                    address_ids_in_request.add(address.id)
                    
                    # Handle contacts if provided
                    if contacts_data:
                        # Get existing contact IDs
                        existing_contact_ids = set(instance.contacts.values_list('id', flat=True))
                        
                        # Track contact IDs in the request
                        contact_ids_in_request = set()
                        
                        # Process each contact in the request
                        for contact_data in contacts_data:
                            if isinstance(contact_data, dict):
                                contact_id = contact_data.get('id')
                                
                                if contact_id:  # Update existing contact
                                    contact_ids_in_request.add(contact_id)
                                    
                                    try:
                                        contact = instance.contacts.get(id=contact_id)
                                        
                                        # Update only the fields that were provided
                                        for key, value in contact_data.items():
                                            if key not in ['id', 'account_id', 'account', 'client', 'created_by']:
                                                # Handle empty strings for foreign keys
                                                if key == 'owner' and (value == '' or value is None):
                                                    # Skip empty owner field (keep existing)
                                                    pass
                                                else:
                                                    setattr(contact, key, value)
                                        
                                        # Set updated_by from audit_kwargs
                                        if 'updated_by' in audit_kwargs:
                                            contact.updated_by = audit_kwargs['updated_by']
                                        
                                        # Save the contact
                                        contact.save()
                                    except Contact.DoesNotExist:
                                        # Contact ID provided but doesn't exist or doesn't belong to this account
                                        pass
                                else:  # Create new contact
                                    # Prepare contact data
                                    contact_obj = {
                                        'account': instance,
                                        'client': instance.client,
                                        'created_by': audit_kwargs.get('created_by'),
                                        'updated_by': audit_kwargs.get('updated_by')
                                    }
                                    
                                    # Add all other fields from contact_data
                                    for key, value in contact_data.items():
                                        if key not in ['id', 'account_id', 'account', 'client', 'created_by', 'updated_by']:
                                            # Handle empty strings for foreign keys
                                            if key == 'owner' and (value == '' or value is None):
                                                # Use account owner as default if available
                                                if instance.owner:
                                                    contact_obj['owner'] = instance.owner
                                            else:
                                                contact_obj[key] = value
                                    
                                    # Create contact using model instance to avoid duplicate field issues
                                    contact = Contact(
                                        account=instance,
                                        client=instance.client,
                                        created_by=audit_kwargs.get('created_by'),
                                        updated_by=audit_kwargs.get('updated_by')
                                    )
                                    
                                    # Set all other fields from contact_data
                                    for key, value in contact_data.items():
                                        if key not in ['id', 'account_id', 'account', 'client', 'created_by', 'updated_by']:
                                            # Handle empty strings for foreign keys
                                            if key == 'owner' and (value == '' or value is None):
                                                # Use account owner as default if available
                                                if instance.owner:
                                                    setattr(contact, 'owner', instance.owner)
                                            else:
                                                setattr(contact, key, value)
                                    
                                    # Save the contact
                                    contact.save()
                                    contact_ids_in_request.add(contact.id)
        
        except Exception as e:
            # Raise DRF validation error to signal failure
            raise serializers.ValidationError(f"Failed to update account and related records: {e}") from e
        
        # Refresh instance after nested changes
        instance.refresh_from_db()
        return instance


class ContactSerializer(serializers.ModelSerializer):
    """
    Serializer for the Contact model.
    
    This serializer handles validation and serialization of Contact objects,
    including nested account representation and email uniqueness validation.
    """
    # Nested serializers for related objects
    account = ContactAccountSerializer(read_only=True)
    account_id = serializers.PrimaryKeyRelatedField(
        queryset=Account.objects.all(),
        source='account',
        write_only=True
    )
    
    # Read-only computed property
    full_name = serializers.ReadOnlyField()
    
    class Meta:
        model = Contact
        fields = [
            'id',
            'first_name',
            'last_name',
            'full_name',
            'account',
            'account_id',
            'email',
            'secondary_email',
            'mobile_phone',
            'work_phone',
            'job_title',
            'department',
            'status',
            'owner',
            'email_opt_out',
            'do_not_call',
            'sms_opt_out',
            'description',
            'company_id',
            'created_at',
            'updated_at',
            'created_by',
            'updated_by',
            'custom_fields'
        ]
        read_only_fields = [
            'id',
            'full_name',
            'company_id',
            'created_at',
            'updated_at',
            'created_by',
            'updated_by'
        ]
    
    def validate_email(self, value):
        """
        Validate that the email is unique.
        
        This method checks that the email is unique among all contacts,
        but only if the email is not None or empty.
        """
        if value:  # Only validate non-empty emails
            # Get the current instance (if this is an update)
            instance = self.instance
            
            # Check if another contact already has this email
            existing_contact = Contact.objects.filter(email=value)
            
            # Exclude the current instance if this is an update
            if instance:
                existing_contact = existing_contact.exclude(pk=instance.pk)
            
            if existing_contact.exists():
                raise serializers.ValidationError(
                    'A contact with this email already exists.'
                )
        
        return value
        
    def create(self, validated_data):
        """
        Create a contact with proper handling of audit fields.
        
        This method ensures that audit fields are properly set without duplication
        when creating a Contact object.
        """
        try:
            # Make a copy of validated_data to avoid modifying the original
            data = validated_data.copy()
            
            # Extract audit fields to avoid duplication
            audit_kwargs = {}
            for field in ['created_by', 'updated_by', 'client']:
                if field in data:
                    audit_kwargs[field] = data.pop(field)
            
            # Create the contact directly with Django ORM
            contact = Contact(**data, **audit_kwargs)
            contact.save()
            return contact
        except Exception as e:
            # Raise DRF validation error to signal failure
            raise serializers.ValidationError(f"Failed to create contact: {e}") from e


class AccountNestedSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = ["id", "name"]


class ContactNestedSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = ["id", "first_name", "last_name"]


class SimpleSellingChannelSerializer(serializers.ModelSerializer):
    selling_channel_id = serializers.IntegerField(source='selling_channel.id', read_only=True)
    selling_channel_name = serializers.CharField(source='selling_channel.name', read_only=True)
    
    class Meta:
        model = CustomerGroupSellingChannel
        fields = ['id', 'status', 'segment_name', 'selling_channel_id', 'selling_channel_name']


class SimpleCustomerGroupSerializer(serializers.ModelSerializer):
    selling_channels = SimpleSellingChannelSerializer(
        source='selling_channel_relationships',
        many=True,
        read_only=True
    )
    
    class Meta:
        model = CustomerGroup
        fields = ['id', 'group_name', 'group_type', 'is_active', 'selling_channels']


class OrderAddressSerializer(serializers.ModelSerializer):
    """
    Serializer for the OrderAddress model.
    
    This serializer handles validation and serialization of OrderAddress objects
    used in order processing, providing a standardized format for address data
    that is not directly tied to an account.
    """
    
    class Meta:
        model = OrderAddress
        fields = [
            'id',
            'address_category',
            'business_name',
            'gst_number',
            'address_type',
            'street_1',
            'street_2',
            'street_3',
            'full_name',
            'phone_number',
            'city',
            'state_province',
            'postal_code',
            'country',
            'created_at',
            'updated_at',
            'created_by',
            'updated_by',
            'custom_fields'
        ]
        read_only_fields = [
            'id',
            'created_at',
            'updated_at',
            'created_by',
            'updated_by'
        ]



class CustomerGroupSellingChannelFilteredSerializer(serializers.ModelSerializer):
    """
    Serializer for filtered CustomerGroupSellingChannel lookups.
    Includes all fields from the model plus related names.
    """
    customer_group_name = serializers.CharField(
        source='customer_group.group_name',
        read_only=True
    )
    selling_channel_name = serializers.CharField(
        source='selling_channel.name',
        read_only=True
    )
    selling_channel_code = serializers.CharField(
        source='selling_channel.code',
        read_only=True
    )

    class Meta:
        model = CustomerGroupSellingChannel
        fields = [
            'id',
            'customer_group_id',
            'customer_group_name',
            'selling_channel_id',
            'selling_channel_name',
            'selling_channel_code',
            'status',
            'segment_name',
        ]
        read_only_fields = [
            'id', 'customer_group_name', 'selling_channel_name',
            'selling_channel_code', 'segment_name'
        ]

class ContactBasicSerializer(serializers.ModelSerializer):
    """
    Serializer for the Contact model, returning only first name, last name, mobile phone, email, customer_group_id, and customer_group_name from the related account.
    """
    customer_group_id = serializers.SerializerMethodField()
    customer_group_name = serializers.SerializerMethodField()
    phone_number = serializers.CharField(source='mobile_phone')

    class Meta:
        model = Contact
        fields = ['first_name', 'last_name', 'phone_number', 'email', 'customer_group_id', 'customer_group_name']

    def get_customer_group_id(self, obj):
        if obj.account and obj.account.customer_group:
            return obj.account.customer_group.id
        return None

    def get_customer_group_name(self, obj):
        if obj.account and obj.account.customer_group:
            return obj.account.customer_group.group_name
        return None