"""
Tests for the Activity API.

This module contains integration tests for the Activity API endpoints,
covering CRUD operations, filtering, pagination, and permissions.
"""
import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from activities.models import Activity
from customers.models import Account, Contact, CustomerGroup
from core.tests.fixtures import tenant_fixture, user_fixture, admin_user_fixture


@pytest.fixture
def api_client():
    """Return an API client."""
    return APIClient()


@pytest.fixture
def authenticated_client(api_client, user_fixture):
    """Return an authenticated API client."""
    api_client.force_authenticate(user=user_fixture)
    return api_client


@pytest.fixture
def admin_client(api_client, admin_user_fixture):
    """Return an authenticated API client for admin user."""
    api_client.force_authenticate(user=admin_user_fixture)
    return api_client


@pytest.fixture
def account_fixture(tenant_fixture, user_fixture):
    """Create a test account."""
    # Create customer group
    group = CustomerGroup.objects.create(
        name='Test Group',
        client=tenant_fixture,
        created_by=user_fixture,
        updated_by=user_fixture
    )
    
    # Create account
    account = Account.objects.create(
        name='Test Account',
        customer_group=group,
        client=tenant_fixture,
        created_by=user_fixture,
        updated_by=user_fixture
    )
    
    return account


@pytest.fixture
def contact_fixture(account_fixture, tenant_fixture, user_fixture):
    """Create a test contact."""
    contact = Contact.objects.create(
        first_name='Test',
        last_name='Contact',
        email='test.contact@example.com',
        account=account_fixture,
        client=tenant_fixture,
        created_by=user_fixture,
        updated_by=user_fixture
    )
    
    return contact


@pytest.fixture
def activity_data(user_fixture, account_fixture, contact_fixture):
    """Return valid data for creating an activity."""
    return {
        'title': 'Test Activity',
        'description': 'This is a test activity',
        'activity_type': 'call',
        'priority': 'medium',
        'status': 'not_started',
        'due_date': timezone.now().isoformat(),
        'assigned_to_id': str(user_fixture.id),
        'related_account_id': str(account_fixture.id),
        'related_contact_id': str(contact_fixture.id)
    }


@pytest.fixture
def activity_fixture(tenant_fixture, user_fixture, account_fixture, contact_fixture):
    """Create a test activity."""
    activity = Activity.objects.create(
        title='Existing Activity',
        description='This is an existing activity',
        activity_type='meeting',
        priority='high',
        status='in_progress',
        due_date=timezone.now(),
        assigned_to=user_fixture,
        related_account=account_fixture,
        related_contact=contact_fixture,
        client=tenant_fixture,
        created_by=user_fixture,
        updated_by=user_fixture
    )
    
    return activity


@pytest.mark.django_db
class TestActivityAPI:
    """Test cases for the Activity API."""
    
    url = reverse('activity-list')
    
    def test_list_activities(self, authenticated_client, tenant_fixture, activity_fixture):
        """Test listing activities."""
        # Set tenant in request
        authenticated_client.tenant = tenant_fixture
        
        response = authenticated_client.get(self.url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['title'] == 'Existing Activity'
    
    def test_create_activity(self, authenticated_client, tenant_fixture, activity_data):
        """Test creating an activity."""
        # Set tenant in request
        authenticated_client.tenant = tenant_fixture
        
        response = authenticated_client.post(self.url, activity_data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['title'] == 'Test Activity'
        
        # Check that the activity was created in the database
        activity = Activity.objects.get(title='Test Activity')
        assert activity.description == 'This is a test activity'
        assert activity.activity_type == 'call'
        assert activity.created_by == authenticated_client.user
        assert activity.updated_by == authenticated_client.user
        assert activity.client == tenant_fixture
    
    def test_retrieve_activity(self, authenticated_client, tenant_fixture, activity_fixture):
        """Test retrieving an activity."""
        # Set tenant in request
        authenticated_client.tenant = tenant_fixture
        
        url = reverse('activity-detail', args=[activity_fixture.id])
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['title'] == 'Existing Activity'
        assert response.data['activity_type'] == 'meeting'
    
    def test_update_activity(self, authenticated_client, tenant_fixture, activity_fixture):
        """Test updating an activity."""
        # Set tenant in request
        authenticated_client.tenant = tenant_fixture
        
        url = reverse('activity-detail', args=[activity_fixture.id])
        data = {
            'title': 'Updated Activity',
            'description': 'This activity has been updated',
            'activity_type': 'email'
        }
        
        response = authenticated_client.patch(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['title'] == 'Updated Activity'
        assert response.data['description'] == 'This activity has been updated'
        assert response.data['activity_type'] == 'email'
        
        # Check that the activity was updated in the database
        activity_fixture.refresh_from_db()
        assert activity_fixture.title == 'Updated Activity'
        assert activity_fixture.updated_by == authenticated_client.user
    
    def test_delete_activity(self, authenticated_client, tenant_fixture, activity_fixture):
        """Test deleting an activity."""
        # Set tenant in request
        authenticated_client.tenant = tenant_fixture
        
        url = reverse('activity-detail', args=[activity_fixture.id])
        response = authenticated_client.delete(url)
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        
        # Check that the activity was deleted from the database
        assert not Activity.objects.filter(id=activity_fixture.id).exists()
    
    def test_filter_activities(self, authenticated_client, tenant_fixture, activity_fixture):
        """Test filtering activities."""
        # Set tenant in request
        authenticated_client.tenant = tenant_fixture
        
        # Create another activity with different type
        Activity.objects.create(
            title='Another Activity',
            description='This is another activity',
            activity_type='email',
            priority='low',
            status='not_started',
            assigned_to=authenticated_client.user,
            client=tenant_fixture,
            created_by=authenticated_client.user,
            updated_by=authenticated_client.user
        )
        
        # Filter by activity_type
        response = authenticated_client.get(f"{self.url}?activity_type=meeting")
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['title'] == 'Existing Activity'
        
        # Filter by priority
        response = authenticated_client.get(f"{self.url}?priority=high")
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['title'] == 'Existing Activity'
    
    def test_search_activities(self, authenticated_client, tenant_fixture, activity_fixture):
        """Test searching activities."""
        # Set tenant in request
        authenticated_client.tenant = tenant_fixture
        
        # Search by title
        response = authenticated_client.get(f"{self.url}?search=Existing")
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['title'] == 'Existing Activity'
    
    def test_my_activities(self, authenticated_client, tenant_fixture, activity_fixture):
        """Test my_activities endpoint."""
        # Set tenant in request
        authenticated_client.tenant = tenant_fixture
        
        url = reverse('activity-my-activities')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['title'] == 'Existing Activity'
    
    def test_admin_sees_all_activities(self, admin_client, tenant_fixture, activity_fixture, user_fixture):
        """Test that admin users can see all activities."""
        # Set tenant in request
        admin_client.tenant = tenant_fixture
        
        # Create another activity assigned to a different user
        Activity.objects.create(
            title='User Activity',
            description='This activity is assigned to a regular user',
            activity_type='call',
            priority='medium',
            status='not_started',
            assigned_to=user_fixture,
            client=tenant_fixture,
            created_by=user_fixture,
            updated_by=user_fixture
        )
        
        response = admin_client.get(self.url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 2
    
    def test_user_only_sees_own_activities(self, authenticated_client, tenant_fixture, activity_fixture, admin_user_fixture):
        """Test that regular users can only see their own activities."""
        # Set tenant in request
        authenticated_client.tenant = tenant_fixture
        
        # Create another activity assigned to admin
        Activity.objects.create(
            title='Admin Activity',
            description='This activity is assigned to an admin',
            activity_type='call',
            priority='medium',
            status='not_started',
            assigned_to=admin_user_fixture,
            client=tenant_fixture,
            created_by=admin_user_fixture,
            updated_by=admin_user_fixture
        )
        
        response = authenticated_client.get(self.url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['title'] == 'Existing Activity'
    
    def test_unauthenticated_access_denied(self, api_client, tenant_fixture):
        """Test that unauthenticated users cannot access the API."""
        # Set tenant in request
        api_client.tenant = tenant_fixture
        
        response = api_client.get(self.url)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
