"""
Tests for the customers app views.

This module contains tests for the API endpoints provided by the customers app,
focusing on CRUD operations, filtering, and permissions.
"""
import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from tenants.models import Tenant
from customers.models import CustomerGroup

User = get_user_model()


@pytest.mark.django_db
class TestCustomerGroupViewSet:
    """Test cases for the CustomerGroupViewSet."""
    
    @pytest.fixture
    def api_client(self):
        """Return an API client for testing."""
        return APIClient()
    
    @pytest.fixture
    def tenant1(self):
        """Create and return a test tenant."""
        return Tenant.objects.create(
            name="Test Tenant 1",
            schema_name="test_tenant_1"
        )
    
    @pytest.fixture
    def tenant2(self):
        """Create and return a second test tenant."""
        return Tenant.objects.create(
            name="Test Tenant 2",
            schema_name="test_tenant_2"
        )
    
    @pytest.fixture
    def user1(self):
        """Create and return a test user for tenant1."""
        return User.objects.create_user(
            username="user1",
            email="user1@example.com",
            password="password123"
        )
    
    @pytest.fixture
    def user2(self):
        """Create and return a test user for tenant2."""
        return User.objects.create_user(
            username="user2",
            email="user2@example.com",
            password="password123"
        )
    
    @pytest.fixture
    def customer_groups_tenant1(self, tenant1, user1):
        """Create and return test customer groups for tenant1."""
        groups = [
            CustomerGroup.objects.create(
                client=tenant1,
                group_name=f"Group {i}",
                group_type=group_type,
                is_active=is_active,
                created_by=user1,
                updated_by=user1
            )
            for i, (group_type, is_active) in enumerate([
                ("BUSINESS", True),
                ("INDIVIDUAL", True),
                ("GOVERNMENT", True),
                ("BUSINESS", False),
                ("INDIVIDUAL", False)
            ])
        ]
        return groups
    
    @pytest.fixture
    def customer_groups_tenant2(self, tenant2, user2):
        """Create and return test customer groups for tenant2."""
        groups = [
            CustomerGroup.objects.create(
                client=tenant2,
                group_name=f"Tenant2 Group {i}",
                group_type=group_type,
                is_active=is_active,
                created_by=user2,
                updated_by=user2
            )
            for i, (group_type, is_active) in enumerate([
                ("BUSINESS", True),
                ("INDIVIDUAL", True)
            ])
        ]
        return groups
    
    def test_unauthenticated_access(self, api_client, tenant1):
        """Test that unauthenticated users cannot access the API."""
        url = reverse('customer-group-list')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_list_customer_groups(self, api_client, user1, tenant1, customer_groups_tenant1):
        """Test listing all customer groups for an authenticated user."""
        api_client.force_authenticate(user=user1)
        url = reverse('customer-group-list')
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 5  # All groups from tenant1
    
    def test_filter_by_group_type(self, api_client, user1, tenant1, customer_groups_tenant1):
        """Test filtering customer groups by group_type."""
        api_client.force_authenticate(user=user1)
        url = reverse('customer-group-list')
        
        # Filter for BUSINESS groups
        response = api_client.get(f"{url}?group_type=BUSINESS")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 2  # 2 BUSINESS groups in tenant1
        
        # Filter for INDIVIDUAL groups
        response = api_client.get(f"{url}?group_type=INDIVIDUAL")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 2  # 2 INDIVIDUAL groups in tenant1
    
    def test_filter_by_is_active(self, api_client, user1, tenant1, customer_groups_tenant1):
        """Test filtering customer groups by is_active."""
        api_client.force_authenticate(user=user1)
        url = reverse('customer-group-list')
        
        # Filter for active groups
        response = api_client.get(f"{url}?is_active=true")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 3  # 3 active groups in tenant1
        
        # Filter for inactive groups
        response = api_client.get(f"{url}?is_active=false")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 2  # 2 inactive groups in tenant1
    
    def test_search_by_group_name(self, api_client, user1, tenant1, customer_groups_tenant1):
        """Test searching customer groups by group_name."""
        api_client.force_authenticate(user=user1)
        url = reverse('customer-group-list')
        
        # Search for Group 1
        response = api_client.get(f"{url}?search=Group 1")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['group_name'] == "Group 1"
    
    def test_ordering(self, api_client, user1, tenant1, customer_groups_tenant1):
        """Test ordering customer groups by different fields."""
        api_client.force_authenticate(user=user1)
        url = reverse('customer-group-list')
        
        # Order by group_name ascending (default)
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['results'][0]['group_name'] == "Group 0"
        
        # Order by group_name descending
        response = api_client.get(f"{url}?ordering=-group_name")
        assert response.status_code == status.HTTP_200_OK
        assert response.data['results'][0]['group_name'] == "Group 4"
        
        # Order by group_type
        response = api_client.get(f"{url}?ordering=group_type")
        assert response.status_code == status.HTTP_200_OK
        # First should be BUSINESS type
        assert response.data['results'][0]['group_type'] == "BUSINESS"
    
    def test_pagination(self, api_client, user1, tenant1, customer_groups_tenant1):
        """Test pagination of customer groups."""
        api_client.force_authenticate(user=user1)
        url = reverse('customer-group-list')
        
        # Get first page with 2 items
        response = api_client.get(f"{url}?page=1&page_size=2")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 2
        assert response.data['count'] == 5  # Total count
        assert response.data['next'] is not None  # There should be a next page
        assert response.data['previous'] is None  # There should be no previous page
        
        # Get second page
        response = api_client.get(f"{url}?page=2&page_size=2")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 2
        assert response.data['next'] is not None  # There should be a next page
        assert response.data['previous'] is not None  # There should be a previous page
    
    def test_tenant_isolation(self, api_client, user1, tenant1, tenant2, 
                             customer_groups_tenant1, customer_groups_tenant2):
        """Test that users only see groups from their tenant."""
        api_client.force_authenticate(user=user1)
        url = reverse('customer-group-list')
        
        # User1 should only see groups from tenant1
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        
        # Check that all returned groups belong to tenant1
        for group in response.data['results']:
            assert "Tenant2" not in group['group_name']
        
        # The total count should match the number of groups in tenant1
        assert response.data['count'] == len(customer_groups_tenant1)
