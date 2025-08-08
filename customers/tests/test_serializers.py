"""
Tests for the customers app serializers.

This module contains tests for the serializers defined in the customers app,
focusing on validation, serialization, and deserialization.
"""
import pytest
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.exceptions import ValidationError
from tenants.models import Tenant
from customers.models import CustomerGroup, Account, Address
from customers.serializers import AddressSerializer

User = get_user_model()


class TestAddressSerializer(TestCase):
    """Test cases for the AddressSerializer."""
    
    def setUp(self):
        """Set up test data."""
        # Create tenant
        self.tenant = Tenant.objects.create(
            name="Test Tenant",
            schema_name="test_tenant"
        )
        
        # Create user
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpassword"
        )
        
        # Create customer group
        self.customer_group = CustomerGroup.objects.create(
            client=self.tenant,
            group_name="Test Group",
            group_type="BUSINESS",
            created_by=self.user,
            updated_by=self.user
        )
        
        # Create account
        self.account = Account.objects.create(
            client=self.tenant,
            name="Test Account",
            customer_group=self.customer_group,
            created_by=self.user,
            updated_by=self.user
        )
        
        # Create branch account
        self.branch_account = Account.objects.create(
            client=self.tenant,
            name="Branch Account",
            customer_group=self.customer_group,
            parent_account=self.account,
            created_by=self.user,
            updated_by=self.user
        )
        
        # Define valid address data
        self.address_data = {
            'address_type': 'BILLING',
            'street_1': '123 Test Street',
            'street_2': 'Suite 100',
            'street_3': 'Floor 1',
            'city': 'Test City',
            'state_province': 'Test State',
            'postal_code': '12345',
            'country': 'US',
            'is_primary_billing': True,
            'is_primary_shipping': False
        }
    
    def test_serialization(self):
        """Test serializing an Address object to JSON."""
        # Create an address
        address = Address.objects.create(
            client=self.tenant,
            account=self.account,
            address_type=self.address_data['address_type'],
            street_1=self.address_data['street_1'],
            street_2=self.address_data['street_2'],
            street_3=self.address_data['street_3'],
            city=self.address_data['city'],
            state_province=self.address_data['state_province'],
            postal_code=self.address_data['postal_code'],
            country=self.address_data['country'],
            is_primary_billing=self.address_data['is_primary_billing'],
            is_primary_shipping=self.address_data['is_primary_shipping'],
            created_by=self.user,
            updated_by=self.user
        )
        
        # Serialize the address
        serializer = AddressSerializer(address)
        data = serializer.data
        
        # Check that all fields are serialized correctly
        self.assertEqual(data['id'], str(address.id))
        self.assertEqual(data['address_type'], self.address_data['address_type'])
        self.assertEqual(data['street_1'], self.address_data['street_1'])
        self.assertEqual(data['street_2'], self.address_data['street_2'])
        self.assertEqual(data['street_3'], self.address_data['street_3'])
        self.assertEqual(data['city'], self.address_data['city'])
        self.assertEqual(data['state_province'], self.address_data['state_province'])
        self.assertEqual(data['postal_code'], self.address_data['postal_code'])
        self.assertEqual(data['country'], self.address_data['country'])
        self.assertEqual(data['is_primary_billing'], self.address_data['is_primary_billing'])
        self.assertEqual(data['is_primary_shipping'], self.address_data['is_primary_shipping'])
        
        # Check that audit fields are included but read-only
        self.assertIn('created_at', data)
        self.assertIn('updated_at', data)
        self.assertIn('created_by', data)
        self.assertIn('updated_by', data)
    
    def test_deserialization(self):
        """Test deserializing JSON to an Address object."""
        # Create serializer with data
        serializer = AddressSerializer(data=self.address_data, context={'account': self.account})
        
        # Check that validation passes
        self.assertTrue(serializer.is_valid(), serializer.errors)
        
        # Check that deserialized data matches input
        self.assertEqual(serializer.validated_data['address_type'], self.address_data['address_type'])
        self.assertEqual(serializer.validated_data['street_1'], self.address_data['street_1'])
        self.assertEqual(serializer.validated_data['street_2'], self.address_data['street_2'])
        self.assertEqual(serializer.validated_data['street_3'], self.address_data['street_3'])
        self.assertEqual(serializer.validated_data['city'], self.address_data['city'])
        self.assertEqual(serializer.validated_data['state_province'], self.address_data['state_province'])
        self.assertEqual(serializer.validated_data['postal_code'], self.address_data['postal_code'])
        self.assertEqual(serializer.validated_data['country'], self.address_data['country'])
        self.assertEqual(serializer.validated_data['is_primary_billing'], self.address_data['is_primary_billing'])
        self.assertEqual(serializer.validated_data['is_primary_shipping'], self.address_data['is_primary_shipping'])
    
    def test_required_fields(self):
        """Test validation of required fields."""
        # Create serializer with missing required fields
        serializer = AddressSerializer(data={}, context={'account': self.account})
        
        # Check that validation fails
        self.assertFalse(serializer.is_valid())
        
        # Check that error messages include required fields
        self.assertIn('address_type', serializer.errors)
        self.assertIn('street_1', serializer.errors)
        self.assertIn('city', serializer.errors)
        self.assertIn('country', serializer.errors)
    
    def test_primary_billing_uniqueness(self):
        """Test validation of primary billing address uniqueness."""
        # Create an existing primary billing address
        Address.objects.create(
            client=self.tenant,
            account=self.account,
            address_type='BILLING',
            street_1='456 Existing Street',
            city='Existing City',
            country='US',
            is_primary_billing=True,
            is_primary_shipping=False,
            created_by=self.user,
            updated_by=self.user
        )
        
        # Create serializer with new primary billing address
        serializer = AddressSerializer(data=self.address_data, context={'account': self.account})
        
        # Check that validation fails due to duplicate primary billing
        self.assertFalse(serializer.is_valid())
        self.assertIn('is_primary_billing', serializer.errors)
    
    def test_update_existing_primary(self):
        """Test updating an existing primary address."""
        # Create an address that will be updated
        address = Address.objects.create(
            client=self.tenant,
            account=self.account,
            address_type='BILLING',
            street_1='456 Existing Street',
            city='Existing City',
            country='US',
            is_primary_billing=True,
            is_primary_shipping=False,
            created_by=self.user,
            updated_by=self.user
        )
        
        # Update the address with new data
        update_data = {
            'street_1': '789 Updated Street',
            'city': 'Updated City',
        }
        
        serializer = AddressSerializer(
            address, 
            data=update_data, 
            context={'account': self.account},
            partial=True
        )
        
        # Check that validation passes (updating the same primary address is allowed)
        self.assertTrue(serializer.is_valid(), serializer.errors)
