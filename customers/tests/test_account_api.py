"""
Tests for the Account API endpoints.

This module contains tests for the Account API endpoints, including CRUD operations,
nested address handling, validation, filtering, searching, and tenant isolation.
"""
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from tenants.models import Tenant
from customers.models import CustomerGroup, Account, Address

User = get_user_model()


class AccountViewSetTests(TestCase):
    """Test cases for the AccountViewSet."""
    
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
        
        # Create branch account
        self.branch_account = Account.objects.create(
            client=self.tenant,
            name="Branch Account",
            parent_account=self.account,
            created_by=self.user,
            updated_by=self.user
        )
        
        # Create address for the account
        self.address = Address.objects.create(
            client=self.tenant,
            account=self.account,
            address_type="BILLING",
            street_1="123 Test Street",
            city="Test City",
            country="US",
            is_primary_billing=True,
            created_by=self.user,
            updated_by=self.user
        )
        
        # Create an account for another tenant
        self.other_tenant_account = Account.objects.create(
            client=self.other_tenant,
            name="Other Tenant Account",
            created_by=self.user,
            updated_by=self.user
        )
        
        # Set up API client
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        # API endpoints
        self.list_url = reverse('account-list')
        self.detail_url = reverse('account-detail', args=[self.account.id])
        self.branch_detail_url = reverse('account-detail', args=[self.branch_account.id])
    
    def test_authentication_required(self):
        """Test that authentication is required for API access."""
        # Create unauthenticated client
        client = APIClient()
        
        # Try to access the API without authentication
        response = client.get(self.list_url)
        
        # Check that access is denied
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_list_accounts(self):
        """Test listing accounts."""
        # Get the list of accounts
        response = self.client.get(self.list_url)
        
        # Check that the request was successful
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that both accounts are returned (main and branch)
        self.assertEqual(len(response.data['results']), 2)
    
    def test_retrieve_account(self):
        """Test retrieving a single account with nested addresses."""
        # Get the account
        response = self.client.get(self.detail_url)
        
        # Check that the request was successful
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that the correct account is returned
        self.assertEqual(response.data['id'], str(self.account.id))
        self.assertEqual(response.data['name'], 'Test Account')
        
        # Check that the nested addresses are included
        self.assertEqual(len(response.data['addresses']), 1)
        self.assertEqual(response.data['addresses'][0]['street_1'], '123 Test Street')
    
    def test_create_account(self):
        """Test creating an account with nested addresses."""
        # Data for a new account with a nested address
        data = {
            'name': 'New Account',
            'customer_group_id': str(self.customer_group.id),
            'addresses': [
                {
                    'address_type': 'SHIPPING',
                    'street_1': '456 New Street',
                    'city': 'New City',
                    'country': 'CA',
                    'is_primary_shipping': True
                }
            ]
        }
        
        # Create the account
        response = self.client.post(self.list_url, data, format='json')
        
        # Check that the request was successful
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check that the account was created
        self.assertEqual(Account.objects.count(), 4)  # 3 existing + 1 new
        
        # Check that the address was created
        new_account = Account.objects.get(name='New Account')
        self.assertEqual(new_account.addresses.count(), 1)
        self.assertEqual(new_account.addresses.first().street_1, '456 New Street')
    
    def test_update_account(self):
        """Test updating an account with nested addresses."""
        # Data for updating the account
        data = {
            'name': 'Updated Account',
            'addresses': [
                {
                    'id': str(self.address.id),
                    'street_1': 'Updated Street',
                    'city': 'Updated City'
                },
                {
                    'address_type': 'SHIPPING',
                    'street_1': '789 New Street',
                    'city': 'New City',
                    'country': 'UK',
                    'is_primary_shipping': True
                }
            ]
        }
        
        # Update the account
        response = self.client.put(self.detail_url, data, format='json')
        
        # Check that the request was successful
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Refresh the account from the database
        self.account.refresh_from_db()
        
        # Check that the account was updated
        self.assertEqual(self.account.name, 'Updated Account')
        
        # Check that the existing address was updated
        updated_address = Address.objects.get(id=self.address.id)
        self.assertEqual(updated_address.street_1, 'Updated Street')
        self.assertEqual(updated_address.city, 'Updated City')
        
        # Check that the new address was created
        self.assertEqual(self.account.addresses.count(), 2)
        new_address = self.account.addresses.exclude(id=self.address.id).first()
        self.assertEqual(new_address.street_1, '789 New Street')
        self.assertEqual(new_address.city, 'New City')
    
    def test_partial_update_account(self):
        """Test partially updating an account."""
        # Data for partially updating the account
        data = {
            'name': 'Partially Updated Account'
        }
        
        # Partially update the account
        response = self.client.patch(self.detail_url, data, format='json')
        
        # Check that the request was successful
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Refresh the account from the database
        self.account.refresh_from_db()
        
        # Check that the account was updated
        self.assertEqual(self.account.name, 'Partially Updated Account')
        
        # Check that the address was not affected
        self.assertEqual(self.account.addresses.count(), 1)
        self.assertEqual(self.account.addresses.first().street_1, '123 Test Street')
    
    def test_delete_account(self):
        """Test deleting an account."""
        # Delete the account
        response = self.client.delete(self.detail_url)
        
        # Check that the request was successful
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Check that the account was deleted
        self.assertEqual(Account.objects.filter(id=self.account.id).count(), 0)
        
        # Check that the address was also deleted (cascade)
        self.assertEqual(Address.objects.filter(id=self.address.id).count(), 0)
    
    def test_branch_address_limit(self):
        """Test that branch accounts are limited to one address."""
        # Try to create a second address for the branch account
        data = {
            'addresses': [
                {
                    'address_type': 'BILLING',
                    'street_1': '123 Branch Street',
                    'city': 'Branch City',
                    'country': 'US',
                    'is_primary_billing': True
                },
                {
                    'address_type': 'SHIPPING',
                    'street_1': '456 Branch Street',
                    'city': 'Branch City',
                    'country': 'US',
                    'is_primary_shipping': True
                }
            ]
        }
        
        # Update the branch account
        response = self.client.put(self.branch_detail_url, data, format='json')
        
        # Check that the request failed
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Check that the error message is correct
        self.assertIn('addresses', response.data)
        self.assertIn('Branch accounts can have at most one address', str(response.data['addresses']))
    
    def test_primary_address_uniqueness(self):
        """Test that an account can have at most one primary billing and one primary shipping address."""
        # Create a second address for the account
        Address.objects.create(
            client=self.tenant,
            account=self.account,
            address_type="SHIPPING",
            street_1="456 Shipping Street",
            city="Shipping City",
            country="US",
            is_primary_shipping=True,
            created_by=self.user,
            updated_by=self.user
        )
        
        # Try to create a third address that is also primary billing
        data = {
            'addresses': [
                {
                    'address_type': 'BILLING',
                    'street_1': '789 Another Street',
                    'city': 'Another City',
                    'country': 'US',
                    'is_primary_billing': True
                }
            ]
        }
        
        # Update the account
        response = self.client.patch(self.detail_url, data, format='json')
        
        # Check that the request failed
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Check that the error message is correct
        self.assertIn('is_primary_billing', str(response.data))
    
    def test_filter_by_status(self):
        """Test filtering accounts by status."""
        # Set different statuses for the accounts
        self.account.status = 'Active'
        self.account.save()
        
        self.branch_account.status = 'Inactive'
        self.branch_account.save()
        
        # Filter by status=Active
        response = self.client.get(f"{self.list_url}?status=Active")
        
        # Check that the request was successful
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that only the active account is returned
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['status'], 'Active')
    
    def test_search_by_name(self):
        """Test searching accounts by name."""
        # Search for "Branch"
        response = self.client.get(f"{self.list_url}?search=Branch")
        
        # Check that the request was successful
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that only the branch account is returned
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['name'], 'Branch Account')
    
    def test_ordering(self):
        """Test ordering accounts."""
        # Order by name (ascending)
        response = self.client.get(f"{self.list_url}?ordering=name")
        
        # Check that the request was successful
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that accounts are ordered by name
        self.assertEqual(response.data['results'][0]['name'], 'Branch Account')
        self.assertEqual(response.data['results'][1]['name'], 'Test Account')
        
        # Order by name (descending)
        response = self.client.get(f"{self.list_url}?ordering=-name")
        
        # Check that accounts are ordered by name in descending order
        self.assertEqual(response.data['results'][0]['name'], 'Test Account')
        self.assertEqual(response.data['results'][1]['name'], 'Branch Account')
    
    def test_tenant_isolation(self):
        """Test that accounts from other tenants are not visible."""
        # Get the list of accounts
        response = self.client.get(self.list_url)
        
        # Check that the request was successful
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that only accounts from the current tenant are returned
        self.assertEqual(len(response.data['results']), 2)
        
        # Check that the account from the other tenant is not included
        account_ids = [account['id'] for account in response.data['results']]
        self.assertNotIn(str(self.other_tenant_account.id), account_ids)
    
    def test_parent_child_relationship(self):
        """Test parent-child relationship validation."""
        # Try to set an account as its own parent
        data = {
            'parent_account_id': str(self.account.id)
        }
        
        # Update the account
        response = self.client.patch(self.detail_url, data, format='json')
        
        # Check that the request failed
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Check that the error message is correct
        self.assertIn('Account cannot be its own parent', str(response.data))
    
    def test_circular_hierarchy(self):
        """Test circular hierarchy validation."""
        # Try to create a circular hierarchy
        data = {
            'parent_account_id': str(self.branch_account.id)
        }
        
        # Update the account
        response = self.client.patch(self.detail_url, data, format='json')
        
        # Check that the request failed
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Check that the error message is correct
        self.assertIn('Circular hierarchy detected', str(response.data))
    
    def test_effective_customer_group(self):
        """Test that effective_customer_group is correctly calculated."""
        # Get the branch account
        response = self.client.get(self.branch_detail_url)
        
        # Check that the request was successful
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that the effective_customer_group is the same as the parent's customer_group
        self.assertEqual(
            response.data['effective_customer_group']['id'], 
            str(self.customer_group.id)
        )
    
    def test_create_individual_account_auto_creates_contact(self):
        """Test that creating an account with an Individual customer group automatically creates a Contact."""
        # Create an Individual customer group
        individual_group = CustomerGroup.objects.create(
            client=self.tenant,
            group_name="Individual Customers",
            group_type="INDIVIDUAL",
            created_by=self.user,
            updated_by=self.user
        )
        
        # Data for a new Individual account
        data = {
            'name': 'John Doe',
            'customer_group_id': str(individual_group.id),
            'email': 'john.doe@example.com',
        }
        
        # Create the account
        response = self.client.post(self.list_url, data, format='json')
        
        # Check that the request was successful
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Get the created account
        account_id = response.data['id']
        new_account = Account.objects.get(id=account_id)
        
        # Check that a Contact was auto-created
        contacts = new_account.contacts.all()
        self.assertEqual(contacts.count(), 1)
        
        # Verify Contact details
        contact = contacts.first()
        self.assertEqual(contact.first_name, 'John Doe')
        self.assertEqual(contact.email, 'john.doe@example.com')
        self.assertEqual(contact.created_by, self.user)
        self.assertEqual(contact.client, self.tenant)
    
    def test_create_business_account_does_not_auto_create_contact(self):
        """Test that creating an account with a Business customer group does not auto-create a Contact."""
        # Data for a new Business account (using the existing business group)
        data = {
            'name': 'Acme Corporation',
            'customer_group_id': str(self.customer_group.id),  # This is a BUSINESS group
            'email': 'info@acme.com',
        }
        
        # Create the account
        response = self.client.post(self.list_url, data, format='json')
        
        # Check that the request was successful
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Get the created account
        account_id = response.data['id']
        new_account = Account.objects.get(id=account_id)
        
        # Check that no Contact was auto-created
        contacts = new_account.contacts.all()
        self.assertEqual(contacts.count(), 0)
