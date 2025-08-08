"""
Comprehensive serializer tests for customers app.

This module provides in-depth testing for all serializers in the customers app,
covering validation, serialization, deserialization, and edge cases.
"""
import pytest
from django.core.exceptions import ValidationError
from rest_framework.exceptions import ValidationError as DRFValidationError

from customers.models import CustomerGroup, Account, Contact, Address
from customers.serializers import (
    CustomerGroupSerializer, 
    AccountSerializer, 
    ContactSerializer, 
    AddressSerializer
)

@pytest.mark.django_db
class TestCustomerGroupSerializer:
    def test_valid_customer_group_serialization(self, customer_group, user):
        """Test successful serialization of a valid customer group."""
        serializer = CustomerGroupSerializer(customer_group)
        data = serializer.data
        
        assert data['group_name'] == customer_group.group_name
        assert data['group_type'] == customer_group.group_type
        assert 'created_by' in data
        assert 'updated_by' in data

    def test_customer_group_validation(self, tenant, user):
        """Test validation rules for customer group creation."""
        # Test invalid group type
        with pytest.raises(DRFValidationError):
            CustomerGroupSerializer().create({
                'client': tenant,
                'group_name': 'Invalid Group',
                'group_type': 'INVALID_TYPE',
                'created_by': user,
                'updated_by': user
            })

@pytest.mark.django_db
class TestAccountSerializer:
    def test_account_serialization(self, account):
        """Test successful serialization of an account."""
        serializer = AccountSerializer(account)
        data = serializer.data
        
        assert data['name'] == account.name
        assert data['account_type'] == account.account_type
        assert 'customer_group' in data
        assert 'created_by' in data

    def test_account_creation_with_contact(self, tenant, user, customer_group):
        """Test account creation automatically creates a contact for INDIVIDUAL type."""
        serializer = AccountSerializer()
        account_data = {
            'name': 'Jane Doe',
            'account_type': 'INDIVIDUAL',
            'customer_group': customer_group,
            'created_by': user,
            'updated_by': user
        }
        
        account = serializer.create(account_data)
        
        # Verify account creation
        assert account.name == 'Jane Doe'
        
        # Verify automatic contact creation
        contact = Contact.objects.get(account=account)
        assert contact.first_name == 'Jane'
        assert contact.last_name == 'Doe'

    def test_account_validation(self, tenant, user, customer_group):
        """Test validation rules for account creation."""
        # Test missing required fields
        with pytest.raises(DRFValidationError):
            AccountSerializer().create({
                'customer_group': customer_group,
                'created_by': user
            })

@pytest.mark.django_db
class TestContactSerializer:
    def test_contact_serialization(self, contact):
        """Test successful serialization of a contact."""
        serializer = ContactSerializer(contact)
        data = serializer.data
        
        assert 'first_name' in data
        assert 'last_name' in data
        assert 'account' in data
        assert 'email' in data

    def test_contact_creation_validation(self, account):
        """Test contact creation with validation."""
        serializer = ContactSerializer()
        contact_data = {
            'first_name': 'Test',
            'last_name': 'Contact',
            'account': account,
            'email': 'test@example.com'
        }
        
        contact = serializer.create(contact_data)
        
        assert contact.first_name == 'Test'
        assert contact.last_name == 'Contact'
        assert contact.email == 'test@example.com'

@pytest.mark.django_db
class TestAddressSerializer:
    def test_address_serialization(self, address):
        """Test successful serialization of an address."""
        serializer = AddressSerializer(address)
        data = serializer.data
        
        assert data['street_address'] == address.street_address
        assert data['city'] == address.city
        assert data['account'] is not None

    def test_address_validation(self, account):
        """Test comprehensive address validation."""
        serializer = AddressSerializer()
        
        # Test invalid postal code
        with pytest.raises(DRFValidationError):
            serializer.create({
                'account': account,
                'address_type': 'PRIMARY',
                'street_address': '123 Test St',
                'city': 'Test City',
                'state': 'Test State',
                'country': 'Test Country',
                'postal_code': 'INVALID'  # Assuming postal code validation exists
            })

        # Test missing required fields
        with pytest.raises(DRFValidationError):
            serializer.create({
                'account': account,
                'street_address': '123 Test St'
            })
