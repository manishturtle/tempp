"""
Pytest fixtures for customers app testing.

This module provides reusable fixtures for comprehensive testing of 
customer-related models, serializers, and views.
"""
import pytest
from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework.test import APIClient
from tenants.models import Tenant
from customers.models import (
    CustomerGroup, 
    Account, 
    Contact, 
    Address
)

User = get_user_model()

@pytest.fixture
def tenant(db):
    """Create a test tenant."""
    return Tenant.objects.create(
        name="Test Tenant",
        schema_name="test_tenant"
    )

@pytest.fixture
def user(tenant):
    """Create a test user."""
    return User.objects.create_user(
        username="testuser",
        email="test@example.com",
        password="testpassword"
    )

@pytest.fixture
def admin_user(tenant):
    """Create an admin user."""
    return User.objects.create_superuser(
        username="admin",
        email="admin@example.com",
        password="adminpassword"
    )

@pytest.fixture
def customer_group(tenant, user):
    """Create a test customer group."""
    return CustomerGroup.objects.create(
        client=tenant,
        group_name="Test Group",
        group_type="INDIVIDUAL",
        created_by=user,
        updated_by=user
    )

@pytest.fixture
def account(tenant, user, customer_group):
    """Create a test account."""
    return Account.objects.create(
        name="John Doe",
        account_type="INDIVIDUAL",
        customer_group=customer_group,
        created_by=user,
        updated_by=user
    )

@pytest.fixture
def contact(account):
    """Create a test contact associated with an account."""
    return Contact.objects.get(account=account)

@pytest.fixture
def address(account):
    """Create a test address associated with an account."""
    return Address.objects.create(
        account=account,
        address_type="PRIMARY",
        street_address="123 Test St",
        city="Test City",
        state="Test State",
        country="Test Country",
        postal_code="12345"
    )

@pytest.fixture
def api_client():
    """Create an API client for testing."""
    return APIClient()

@pytest.fixture
def authenticated_client(user, api_client):
    """Create an authenticated API client."""
    api_client.force_authenticate(user=user)
    return api_client

@pytest.fixture
def admin_client(admin_user, api_client):
    """Create an admin-authenticated API client."""
    api_client.force_authenticate(user=admin_user)
    return api_client
