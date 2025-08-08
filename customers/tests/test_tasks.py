"""
Tests for the Account-Contact synchronization tasks.

This module contains tests for the Celery tasks that handle
synchronization between Accounts and Contacts, with special focus on
tenant context handling and user context propagation.
"""
import pytest
import uuid
import logging
from unittest.mock import patch, MagicMock, call
from django.test import TestCase
from django.contrib.auth import get_user_model

from tenants.models import Tenant
from customers.models import Account, Contact, CustomerGroup
from customers.tasks import (
    sync_individual_account_contact_data,
    _sync_account_to_contact,
    _sync_contact_to_account
)
from core.utils.tenant import set_tenant_context

User = get_user_model()


@pytest.mark.django_db
class TestSyncTasks(TestCase):
    """Test the Account-Contact synchronization tasks with context handling."""
    
    def setUp(self):
        """Set up test data including tenant and user context."""
        # Create tenant
        self.tenant = Tenant.objects.create(
            name="Test Tenant",
            schema_name="test_tenant"
        )
        
        # Create user for audit fields
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpassword"
        )
        
        # Create a customer group for Individual accounts
        self.individual_group = CustomerGroup.objects.create(
            group_name="Individual",
            group_type="INDIVIDUAL",
            is_active=True,
            client=self.tenant,
            created_by=self.user,
            updated_by=self.user
        )
        
        # Create a customer group for Business accounts
        self.business_group = CustomerGroup.objects.create(
            group_name="Business",
            group_type="BUSINESS",
            is_active=True,
            client=self.tenant,
            created_by=self.user,
            updated_by=self.user
        )
        
        # Create an Individual account
        self.individual_account = Account.objects.create(
            name="John Doe",
            customer_group=self.individual_group,
            status="Active",
            client=self.tenant,
            created_by=self.user,
            updated_by=self.user
        )
        
        # Create a Business account
        self.business_account = Account.objects.create(
            name="Acme Corp",
            customer_group=self.business_group,
            status="Active",
            client=self.tenant,
            created_by=self.user,
            updated_by=self.user
        )
        
        # Get the auto-created Contact for the Individual account
        self.contact = Contact.objects.get(account=self.individual_account)
        # Note: We don't need to create a contact manually as it's auto-created for Individual accounts
        # Just ensure the contact exists
        assert self.contact is not None
        assert self.contact.first_name == "John"
        assert self.contact.last_name == "Doe"
    
    @patch('customers.tasks.set_tenant_context')
    @patch('customers.tasks.logger')
    def test_tenant_context_activation(self, mock_logger, mock_set_tenant_context):
        """Test that tenant context is properly activated in the task."""
        # Call the task with tenant_id and user_id
        sync_individual_account_contact_data(
            record_id=str(self.individual_account.id),
            model_name='Account',
            updated_fields=['name'],
            tenant_id=self.tenant.id,
            initiating_user_id=self.user.id
        )
        
        # Verify tenant context was activated
        mock_set_tenant_context.assert_called_once_with(self.tenant.id)
        
        # Verify logging with context
        mock_logger.info.assert_any_call(
            "Tenant context activated for Account synchronization",
            extra={
                'tenant_id': self.tenant.id,
                'user_id': self.user.id,
                'model': 'Account',
                'record_id': str(self.individual_account.id)
            }
        )
    
    @patch('customers.tasks.set_tenant_context')
    def test_tenant_context_error_handling(self, mock_set_tenant_context):
        """Test error handling when tenant context activation fails."""
        # Configure the mock to raise an exception
        mock_set_tenant_context.side_effect = Exception("Tenant context error")
        
        # Call the task and expect it to raise the exception
        with pytest.raises(Exception):
            sync_individual_account_contact_data(
                record_id=str(self.individual_account.id),
                model_name='Account',
                updated_fields=['name'],
                tenant_id=self.tenant.id,
                initiating_user_id=self.user.id
            )
    
    @patch('customers.tasks.set_tenant_context')
    def test_account_to_contact_sync_with_user_context(self, mock_set_tenant_context):
        """Test account to contact synchronization with user context for audit fields."""
        # Call the task with tenant_id and user_id
        result = sync_individual_account_contact_data(
            record_id=str(self.individual_account.id),
            model_name='Account',
            updated_fields=['name'],
            tenant_id=self.tenant.id,
            initiating_user_id=self.user.id
        )
        
        # Verify the result
        assert result['status'] == 'success'
        assert result['model'] == 'Account'
        
        # Refresh the contact from the database
        self.contact.refresh_from_db()
        
        # Verify updated_by field was set correctly
        assert self.contact.updated_by_id == self.user.id
    
    @patch('customers.tasks.set_tenant_context')
    def test_contact_to_account_sync_with_user_context(self, mock_set_tenant_context):
        """Test contact to account synchronization with user context for audit fields."""
        # Call the task with tenant_id and user_id
        result = sync_individual_account_contact_data(
            record_id=str(self.contact.id),
            model_name='Contact',
            updated_fields=['first_name', 'last_name'],
            tenant_id=self.tenant.id,
            initiating_user_id=self.user.id
        )
        
        # Verify the result
        assert result['status'] == 'success'
        assert result['model'] == 'Contact'
        
        # Refresh the account from the database
        self.individual_account.refresh_from_db()
        
        # Verify updated_by field was set correctly
        assert self.individual_account.updated_by_id == self.user.id
    
    @patch('customers.tasks.set_tenant_context')
    def test_sync_without_user_context(self, mock_set_tenant_context):
        """Test synchronization without user context (None for initiating_user_id)."""
        # Call the task without user_id
        result = sync_individual_account_contact_data(
            record_id=str(self.individual_account.id),
            model_name='Account',
            updated_fields=['name'],
            tenant_id=self.tenant.id,
            initiating_user_id=None
        )
        
        # Verify the task still succeeds
        assert result['status'] == 'success'
        
        # Create a contact for the Business account
        self.business_contact = Contact.objects.create(
            first_name="Jane",
            last_name="Smith",
            account=self.business_account,
            email="jane.smith@acme.com",
            client_id=1,
            company_id=1
        )
        
        # Create a mock user for updated_by
        self.mock_user_id = 123
    
    @patch('customers.tasks.set_tenant_context')
    def test_sync_task_skips_irrelevant_fields(self, mock_set_tenant):
        """Test that the sync task skips processing when no relevant fields are updated."""
        # Call the task with irrelevant fields
        result = sync_individual_account_contact_data(
            str(self.individual_account.id),
            'Account',
            ['description', 'status'],
            1,
            self.mock_user_id
        )
        
        # Verify tenant context was set
        mock_set_tenant.assert_called_once_with(1)
        
        # Verify the task was skipped
        assert result['status'] == 'skipped'
        assert result['reason'] == 'no_relevant_fields'
    
    @patch('customers.tasks.set_tenant_context')
    @patch('customers.tasks._sync_account_to_contact')
    def test_sync_task_account_to_contact(self, mock_sync_a2c, mock_set_tenant):
        """Test that the sync task calls the account-to-contact sync function."""
        # Set up the mock to return a result
        mock_sync_a2c.return_value = {
            "status": "success",
            "operation": "account_to_contact",
            "account_id": str(self.individual_account.id),
            "contact_id": str(self.individual_contact.id),
            "updated_fields": ["first_name", "last_name"]
        }
        
        # Call the task with a relevant field
        result = sync_individual_account_contact_data(
            str(self.individual_account.id),
            'Account',
            ['name'],
            1,
            self.mock_user_id
        )
        
        # Verify tenant context was set
        mock_set_tenant.assert_called_once_with(1)
        
        # Verify the sync function was called
        mock_sync_a2c.assert_called_once_with(
            uuid.UUID(str(self.individual_account.id)),
            ['name'],
            self.mock_user_id
        )
        
        # Verify the result
        assert result['status'] == 'success'
        assert result['operation'] == 'account_to_contact'
    
    @patch('customers.tasks.set_tenant_context')
    @patch('customers.tasks._sync_contact_to_account')
    def test_sync_task_contact_to_account(self, mock_sync_c2a, mock_set_tenant):
        """Test that the sync task calls the contact-to-account sync function."""
        # Set up the mock to return a result
        mock_sync_c2a.return_value = {
            "status": "success",
            "operation": "contact_to_account",
            "contact_id": str(self.individual_contact.id),
            "account_id": str(self.individual_account.id),
            "updated_fields": ["name"]
        }
        
        # Call the task with relevant fields
        result = sync_individual_account_contact_data(
            str(self.individual_contact.id),
            'Contact',
            ['first_name', 'last_name'],
            1,
            self.mock_user_id
        )
        
        # Verify tenant context was set
        mock_set_tenant.assert_called_once_with(1)
        
        # Verify the sync function was called
        mock_sync_c2a.assert_called_once_with(
            uuid.UUID(str(self.individual_contact.id)),
            ['first_name', 'last_name'],
            self.mock_user_id
        )
        
        # Verify the result
        assert result['status'] == 'success'
        assert result['operation'] == 'contact_to_account'
    
    @patch('customers.tasks.set_tenant_context')
    def test_sync_task_handles_invalid_record_id(self, mock_set_tenant):
        """Test that the sync task handles an invalid record ID gracefully."""
        # Create a mock task instance with a retry method
        mock_task = MagicMock()
        mock_task.retry = MagicMock(side_effect=Exception("Retry failed"))
        
        # Call the task with an invalid record ID
        with pytest.raises(Exception):
            sync_individual_account_contact_data.bind(mock_task)(
                str(uuid.uuid4()),  # Random UUID that doesn't exist
                'Account',
                ['name'],
                1,
                self.mock_user_id
            )
        
        # Verify tenant context was set
        mock_set_tenant.assert_called_once_with(1)
        
        # Verify retry was called
        mock_task.retry.assert_called_once()
    
    def test_sync_account_to_contact(self):
        """Test the account-to-contact sync function."""
        # Update the account name
        self.individual_account.name = "John Smith"
        self.individual_account.save()
        
        # Call the sync function
        result = _sync_account_to_contact(
            self.individual_account.id,
            ['name'],
            self.mock_user_id
        )
        
        # Verify the result
        assert result is not None
        assert result['status'] == 'success'
        assert result['operation'] == 'account_to_contact'
        assert result['account_id'] == str(self.individual_account.id)
        
        # Refresh the contact from the database
        self.individual_contact.refresh_from_db()
        
        # Verify the contact was updated
        assert self.individual_contact.first_name == "John"
        assert self.individual_contact.last_name == "Smith"
    
    def test_sync_account_to_contact_business_account(self):
        """Test that the account-to-contact sync function skips business accounts."""
        # Call the sync function with a business account
        result = _sync_account_to_contact(
            self.business_account.id,
            ['name'],
            self.mock_user_id
        )
        
        # Verify the result is None (skipped)
        assert result is None
    
    def test_sync_contact_to_account(self):
        """Test the contact-to-account sync function."""
        # Update the contact name
        self.individual_contact.first_name = "Johnny"
        self.individual_contact.save()
        
        # Call the sync function
        result = _sync_contact_to_account(
            self.individual_contact.id,
            ['first_name'],
            self.mock_user_id
        )
        
        # Verify the result
        assert result is not None
        assert result['status'] == 'success'
        assert result['operation'] == 'contact_to_account'
        assert result['contact_id'] == str(self.individual_contact.id)
        
        # Refresh the account from the database
        self.individual_account.refresh_from_db()
        
        # Verify the account was updated
        assert self.individual_account.name == "Johnny Doe"
    
    def test_sync_contact_to_account_business_account(self):
        """Test that the contact-to-account sync function skips contacts for business accounts."""
        # Call the sync function with a contact for a business account
        result = _sync_contact_to_account(
            self.business_contact.id,
            ['first_name'],
            self.mock_user_id
        )
        
        # Verify the result is None (skipped)
        assert result is None
