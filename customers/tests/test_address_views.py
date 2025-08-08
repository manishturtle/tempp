"""
Tests for the Address API endpoints.

This module contains tests for the Address API endpoints, including
authentication, listing, filtering, searching, and tenant isolation.
"""
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from tenants.models import Tenant
from customers.models import CustomerGroup, Account, Address

User = get_user_model()


class AddressViewSetTests(TestCase):
    """Test cases for the AddressViewSet."""
    
    def setUp(self):
        """Set up test data."""
        # Create tenant
        self.tenant = Tenant.objects.create(
            name="Test Tenant",
            schema_name="test_tenant"
        )
        
        # Create another tenant for isolation testing
        self.other_tenant = Tenant.objects.create(
            name="Other Tenant",
            schema_name="other_tenant"
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
        
        # Create addresses for the account
        self.billing_address = Address.objects.create(
            client=self.tenant,
            account=self.account,
            address_type="BILLING",
            street_1="123 Billing Street",
            city="Billing City",
            country="US",
            is_primary_billing=True,
            is_primary_shipping=False,
            created_by=self.user,
            updated_by=self.user
        )
        
        self.shipping_address = Address.objects.create(
            client=self.tenant,
            account=self.account,
            address_type="SHIPPING",
            street_1="456 Shipping Street",
            city="Shipping City",
            country="US",
            is_primary_billing=False,
            is_primary_shipping=True,
            created_by=self.user,
            updated_by=self.user
        )
        
        # Create an address for another tenant
        self.other_tenant_account = Account.objects.create(
            client=self.other_tenant,
            name="Other Tenant Account",
            created_by=self.user,
            updated_by=self.user
        )
        
        self.other_tenant_address = Address.objects.create(
            client=self.other_tenant,
            account=self.other_tenant_account,
            address_type="BILLING",
            street_1="789 Other Street",
            city="Other City",
            country="CA",
            is_primary_billing=True,
            is_primary_shipping=False,
            created_by=self.user,
            updated_by=self.user
        )
        
        # Set up API client
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        # API endpoints
        self.list_url = reverse('address-list')
        self.detail_url = reverse('address-detail', args=[self.billing_address.id])
    
    def test_authentication_required(self):
        """Test that authentication is required for API access."""
        # Create unauthenticated client
        client = APIClient()
        
        # Try to access the API without authentication
        response = client.get(self.list_url)
        
        # Check that access is denied
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_list_addresses(self):
        """Test listing addresses."""
        # Get the list of addresses
        response = self.client.get(self.list_url)
        
        # Check that the request was successful
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that both addresses are returned
        self.assertEqual(len(response.data['results']), 2)
    
    def test_filter_by_address_type(self):
        """Test filtering addresses by address_type."""
        # Filter by address_type=BILLING
        response = self.client.get(f"{self.list_url}?address_type=BILLING")
        
        # Check that the request was successful
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that only the billing address is returned
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['address_type'], 'BILLING')
    
    def test_filter_by_account(self):
        """Test filtering addresses by account_id."""
        # Filter by account_id
        response = self.client.get(f"{self.list_url}?account_id={self.account.id}")
        
        # Check that the request was successful
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that both addresses for the account are returned
        self.assertEqual(len(response.data['results']), 2)
    
    def test_search_by_street(self):
        """Test searching addresses by street."""
        # Search for "Billing"
        response = self.client.get(f"{self.list_url}?search=Billing")
        
        # Check that the request was successful
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that only the billing address is returned
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['street_1'], '123 Billing Street')
    
    def test_ordering(self):
        """Test ordering addresses."""
        # Order by city (ascending)
        response = self.client.get(f"{self.list_url}?ordering=city")
        
        # Check that the request was successful
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that addresses are ordered by city
        self.assertEqual(response.data['results'][0]['city'], 'Billing City')
        self.assertEqual(response.data['results'][1]['city'], 'Shipping City')
        
        # Order by city (descending)
        response = self.client.get(f"{self.list_url}?ordering=-city")
        
        # Check that addresses are ordered by city in descending order
        self.assertEqual(response.data['results'][0]['city'], 'Shipping City')
        self.assertEqual(response.data['results'][1]['city'], 'Billing City')
    
    def test_tenant_isolation(self):
        """Test that addresses from other tenants are not visible."""
        # Get the list of addresses
        response = self.client.get(self.list_url)
        
        # Check that the request was successful
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that only addresses from the current tenant are returned
        self.assertEqual(len(response.data['results']), 2)
        
        # Check that the address from the other tenant is not included
        address_ids = [address['id'] for address in response.data['results']]
        self.assertNotIn(str(self.other_tenant_address.id), address_ids)
    
    def test_retrieve_address(self):
        """Test retrieving a single address."""
        # Get the billing address
        response = self.client.get(self.detail_url)
        
        # Check that the request was successful
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that the correct address is returned
        self.assertEqual(response.data['id'], str(self.billing_address.id))
        self.assertEqual(response.data['address_type'], 'BILLING')
        self.assertEqual(response.data['street_1'], '123 Billing Street')
        self.assertEqual(response.data['city'], 'Billing City')
        self.assertEqual(response.data['country'], 'US')
        self.assertEqual(response.data['is_primary_billing'], True)
        self.assertEqual(response.data['is_primary_shipping'], False)
