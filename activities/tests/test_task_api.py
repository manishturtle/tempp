"""
Tests for the Task API.

This module contains integration tests for the Task API endpoints,
covering CRUD operations, filtering, pagination, and permissions.
"""
import pytest
from django.urls import reverse
from django.utils import timezone
from datetime import timedelta
from rest_framework import status
from rest_framework.test import APIClient

from activities.models import Task
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
def task_data(user_fixture, account_fixture, contact_fixture):
    """Return valid data for creating a task."""
    return {
        'subject': 'Test Task',
        'description': 'This is a test task',
        'due_date': (timezone.now() + timedelta(days=1)).isoformat(),
        'status': 'not_started',
        'priority': 'medium',
        'assignee_id': str(user_fixture.id),
        'related_account_id': str(account_fixture.id),
        'related_contact_id': str(contact_fixture.id)
    }


@pytest.fixture
def task_fixture(tenant_fixture, user_fixture, account_fixture, contact_fixture):
    """Create a test task."""
    task = Task.objects.create(
        subject='Existing Task',
        description='This is an existing task',
        due_date=timezone.now() + timedelta(days=1),
        status='in_progress',
        priority='high',
        assignee=user_fixture,
        related_account=account_fixture,
        related_contact=contact_fixture,
        client=tenant_fixture,
        created_by=user_fixture,
        updated_by=user_fixture
    )
    
    return task


@pytest.mark.django_db
class TestTaskAPI:
    """Test cases for the Task API."""
    
    url = reverse('task-list')
    
    def test_list_tasks(self, authenticated_client, tenant_fixture, task_fixture):
        """Test listing tasks."""
        # Set tenant in request
        authenticated_client.tenant = tenant_fixture
        
        response = authenticated_client.get(self.url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['subject'] == 'Existing Task'
    
    def test_create_task(self, authenticated_client, tenant_fixture, task_data):
        """Test creating a task."""
        # Set tenant in request
        authenticated_client.tenant = tenant_fixture
        
        response = authenticated_client.post(self.url, task_data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['subject'] == 'Test Task'
        
        # Check that the task was created in the database
        task = Task.objects.get(subject='Test Task')
        assert task.description == 'This is a test task'
        assert task.status == 'not_started'
        assert task.created_by == authenticated_client.user
        assert task.updated_by == authenticated_client.user
        assert task.client == tenant_fixture
    
    def test_retrieve_task(self, authenticated_client, tenant_fixture, task_fixture):
        """Test retrieving a task."""
        # Set tenant in request
        authenticated_client.tenant = tenant_fixture
        
        url = reverse('task-detail', args=[task_fixture.id])
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['subject'] == 'Existing Task'
        assert response.data['status'] == 'in_progress'
    
    def test_update_task(self, authenticated_client, tenant_fixture, task_fixture):
        """Test updating a task."""
        # Set tenant in request
        authenticated_client.tenant = tenant_fixture
        
        url = reverse('task-detail', args=[task_fixture.id])
        data = {
            'subject': 'Updated Task',
            'description': 'This task has been updated',
            'status': 'completed',
            'completed_date': timezone.now().isoformat()
        }
        
        response = authenticated_client.patch(url, data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['subject'] == 'Updated Task'
        assert response.data['description'] == 'This task has been updated'
        assert response.data['status'] == 'completed'
        
        # Check that the task was updated in the database
        task_fixture.refresh_from_db()
        assert task_fixture.subject == 'Updated Task'
        assert task_fixture.status == 'completed'
        assert task_fixture.updated_by == authenticated_client.user
    
    def test_delete_task(self, authenticated_client, tenant_fixture, task_fixture):
        """Test deleting a task."""
        # Set tenant in request
        authenticated_client.tenant = tenant_fixture
        
        url = reverse('task-detail', args=[task_fixture.id])
        response = authenticated_client.delete(url)
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        
        # Check that the task was deleted from the database
        assert not Task.objects.filter(id=task_fixture.id).exists()
    
    def test_filter_tasks(self, authenticated_client, tenant_fixture, task_fixture):
        """Test filtering tasks."""
        # Set tenant in request
        authenticated_client.tenant = tenant_fixture
        
        # Create another task with different status
        Task.objects.create(
            subject='Another Task',
            description='This is another task',
            due_date=timezone.now() + timedelta(days=2),
            status='not_started',
            priority='low',
            assignee=authenticated_client.user,
            client=tenant_fixture,
            created_by=authenticated_client.user,
            updated_by=authenticated_client.user
        )
        
        # Filter by status
        response = authenticated_client.get(f"{self.url}?status=in_progress")
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['subject'] == 'Existing Task'
        
        # Filter by priority
        response = authenticated_client.get(f"{self.url}?priority=high")
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['subject'] == 'Existing Task'
    
    def test_search_tasks(self, authenticated_client, tenant_fixture, task_fixture):
        """Test searching tasks."""
        # Set tenant in request
        authenticated_client.tenant = tenant_fixture
        
        # Search by subject
        response = authenticated_client.get(f"{self.url}?search=Existing")
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['subject'] == 'Existing Task'
    
    def test_my_tasks(self, authenticated_client, tenant_fixture, task_fixture):
        """Test my_tasks endpoint."""
        # Set tenant in request
        authenticated_client.tenant = tenant_fixture
        
        url = reverse('task-my-tasks')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['subject'] == 'Existing Task'
    
    def test_overdue_tasks(self, authenticated_client, tenant_fixture, user_fixture):
        """Test overdue endpoint."""
        # Set tenant in request
        authenticated_client.tenant = tenant_fixture
        
        # Create an overdue task
        Task.objects.create(
            subject='Overdue Task',
            description='This task is overdue',
            due_date=timezone.now() - timedelta(days=1),
            status='not_started',
            priority='high',
            assignee=user_fixture,
            client=tenant_fixture,
            created_by=user_fixture,
            updated_by=user_fixture
        )
        
        url = reverse('task-overdue')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['subject'] == 'Overdue Task'
    
    def test_admin_sees_all_tasks(self, admin_client, tenant_fixture, task_fixture, user_fixture):
        """Test that admin users can see all tasks."""
        # Set tenant in request
        admin_client.tenant = tenant_fixture
        
        # Create another task assigned to a different user
        Task.objects.create(
            subject='User Task',
            description='This task is assigned to a regular user',
            due_date=timezone.now() + timedelta(days=3),
            status='not_started',
            priority='medium',
            assignee=user_fixture,
            client=tenant_fixture,
            created_by=user_fixture,
            updated_by=user_fixture
        )
        
        response = admin_client.get(self.url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 2
    
    def test_user_only_sees_own_tasks(self, authenticated_client, tenant_fixture, task_fixture, admin_user_fixture):
        """Test that regular users can only see their own tasks."""
        # Set tenant in request
        authenticated_client.tenant = tenant_fixture
        
        # Create another task assigned to admin
        Task.objects.create(
            subject='Admin Task',
            description='This task is assigned to an admin',
            due_date=timezone.now() + timedelta(days=3),
            status='not_started',
            priority='medium',
            assignee=admin_user_fixture,
            client=tenant_fixture,
            created_by=admin_user_fixture,
            updated_by=admin_user_fixture
        )
        
        response = authenticated_client.get(self.url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['subject'] == 'Existing Task'
    
    def test_unauthenticated_access_denied(self, api_client, tenant_fixture):
        """Test that unauthenticated users cannot access the API."""
        # Set tenant in request
        api_client.tenant = tenant_fixture
        
        response = api_client.get(self.url)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_pagination(self, authenticated_client, tenant_fixture, task_fixture, user_fixture):
        """Test that tasks are paginated."""
        # Set tenant in request
        authenticated_client.tenant = tenant_fixture
        
        # Create multiple tasks
        for i in range(10):
            Task.objects.create(
                subject=f'Task {i}',
                description=f'This is task {i}',
                due_date=timezone.now() + timedelta(days=i),
                status='not_started',
                priority='medium',
                assignee=user_fixture,
                client=tenant_fixture,
                created_by=user_fixture,
                updated_by=user_fixture
            )
        
        response = authenticated_client.get(self.url)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'count' in response.data
        assert 'next' in response.data
        assert 'previous' in response.data
        assert 'results' in response.data
        assert response.data['count'] == 11  # 10 new tasks + 1 fixture task
        assert len(response.data['results']) <= 10  # Default page size
