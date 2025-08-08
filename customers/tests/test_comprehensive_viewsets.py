"""
Comprehensive ViewSet integration tests for customers app.

This module provides in-depth testing for all ViewSets in the customers app,
covering CRUD operations, authentication, permissions, and edge cases.
"""
import pytest
from django.urls import reverse
from rest_framework import status

from customers.models import CustomerGroup, Account, Contact, Address

@pytest.mark.django_db
class TestCustomerGroupViewSet:
    def test_customer_group_list(self, authenticated_client, customer_group):
        """Test retrieving list of customer groups."""
        url = reverse('customergroup-list')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) > 0

    def test_customer_group_create(self, authenticated_client, tenant, user):
        """Test creating a new customer group."""
        url = reverse('customergroup-list')
        data = {
            'client': tenant.id,
            'group_name': 'New Test Group',
            'group_type': 'BUSINESS',
            'created_by': user.id,
            'updated_by': user.id
        }
        
        response = authenticated_client.post(url, data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['group_name'] == 'New Test Group'

    def test_customer_group_unauthorized_access(self, api_client):
        """Test unauthorized access to customer group endpoints."""
        url = reverse('customergroup-list')
        
        # Unauthenticated access
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

@pytest.mark.django_db
class TestAccountViewSet:
    def test_account_list(self, authenticated_client, account):
        """Test retrieving list of accounts."""
        url = reverse('account-list')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) > 0

    def test_account_create_with_contact(self, authenticated_client, customer_group, user):
        """Test creating an account automatically creates a contact."""
        url = reverse('account-list')
        data = {
            'name': 'New Account',
            'account_type': 'INDIVIDUAL',
            'customer_group': customer_group.id,
            'created_by': user.id,
            'updated_by': user.id
        }
        
        response = authenticated_client.post(url, data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == 'New Account'
        
        # Verify contact was created
        account_id = response.data['id']
        contact = Contact.objects.get(account_id=account_id)
        assert contact.first_name == 'New'
        assert contact.last_name == 'Account'

    def test_account_update(self, authenticated_client, account):
        """Test updating an existing account."""
        url = reverse('account-detail', kwargs={'pk': account.id})
        data = {
            'name': 'Updated Account Name',
            'account_type': account.account_type
        }
        
        response = authenticated_client.patch(url, data)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == 'Updated Account Name'

@pytest.mark.django_db
class TestContactViewSet:
    def test_contact_list(self, authenticated_client, contact):
        """Test retrieving list of contacts."""
        url = reverse('contact-list')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) > 0

    def test_contact_create(self, authenticated_client, account):
        """Test creating a new contact."""
        url = reverse('contact-list')
        data = {
            'first_name': 'Test',
            'last_name': 'Contact',
            'account': account.id,
            'email': 'test.contact@example.com'
        }
        
        response = authenticated_client.post(url, data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['first_name'] == 'Test'
        assert response.data['last_name'] == 'Contact'

@pytest.mark.django_db
class TestAddressViewSet:
    def test_address_list(self, authenticated_client, address):
        """Test retrieving list of addresses."""
        url = reverse('address-list')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) > 0

    def test_address_create(self, authenticated_client, account):
        """Test creating a new address."""
        url = reverse('address-list')
        data = {
            'account': account.id,
            'address_type': 'SHIPPING',
            'street_address': '456 Test Avenue',
            'city': 'Test City',
            'state': 'Test State',
            'country': 'Test Country',
            'postal_code': '54321'
        }
        
        response = authenticated_client.post(url, data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['street_address'] == '456 Test Avenue'
        assert response.data['address_type'] == 'SHIPPING'

    def test_address_validation(self, authenticated_client, account):
        """Test address creation with invalid data."""
        url = reverse('address-list')
        data = {
            'account': account.id,
            'address_type': 'INVALID'
        }
        
        response = authenticated_client.post(url, data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
