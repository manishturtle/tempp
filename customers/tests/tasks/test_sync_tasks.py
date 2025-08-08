"""
Tests for the Account-Contact synchronization tasks.

This module contains tests for the Celery tasks that handle
synchronization between Accounts, Contacts, and the E-commerce platform.
"""
import pytest
import uuid
from unittest.mock import patch, MagicMock, AsyncMock
from django.test import TestCase, override_settings

from customers.models import Account, Contact, CustomerGroup
from customers.tasks import (
    sync_individual_account_contact_data,
    _sync_account_to_contact,
    _sync_contact_to_account,
    _sync_contact_to_ecommerce
)


@pytest.mark.django_db
class TestSyncTasks(TestCase):
    """Test the Account-Contact synchronization tasks."""
    
    def setUp(self):
        """Set up test data."""
        # Create a customer group for Individual accounts
        self.individual_group = CustomerGroup.objects.create(
            group_name="Individual",
            group_type="INDIVIDUAL",
            is_active=True,
            client_id=1,
            company_id=1
        )
        
        # Create a customer group for Business accounts
        self.business_group = CustomerGroup.objects.create(
            group_name="Business",
            group_type="BUSINESS",
            is_active=True,
            client_id=1,
            company_id=1
        )
        
        # Create an Individual account
        self.individual_account = Account.objects.create(
            name="John Doe",
            customer_group=self.individual_group,
            status="Active",
            client_id=1,
            company_id=1
        )
        
        # Create a Business account
        self.business_account = Account.objects.create(
            name="Acme Corp",
            customer_group=self.business_group,
            status="Active",
            client_id=1,
            company_id=1
        )
        
        # Create a contact for the Individual account
        self.individual_contact = Contact.objects.create(
            first_name="John",
            last_name="Doe",
            account=self.individual_account,
            email="john.doe@example.com",
            client_id=1,
            company_id=1
        )
        
        # Create a contact for the Business account
        self.business_contact = Contact.objects.create(
            first_name="Jane",
            last_name="Smith",
            account=self.business_account,
            email="jane.smith@acme.com",
            client_id=1,
            company_id=1
        )
        
        # Create a contact with an ecommerce_user_id
        self.ecommerce_contact = Contact.objects.create(
            first_name="Alice",
            last_name="Johnson",
            account=self.business_account,
            email="alice.johnson@acme.com",
            ecommerce_user_id="ecom-123",
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
        assert len(result['operations']) == 1
        assert result['operations'][0]['operation'] == 'account_to_contact'
    
    @patch('customers.tasks.set_tenant_context')
    @patch('customers.tasks._sync_contact_to_account')
    @patch('customers.tasks._sync_contact_to_ecommerce')
    def test_sync_task_contact_to_account_and_ecommerce(
        self, mock_sync_c2e, mock_sync_c2a, mock_set_tenant
    ):
        """Test that the sync task calls both contact sync functions."""
        # Set up the mocks to return results
        mock_sync_c2a.return_value = {
            "operation": "contact_to_account",
            "contact_id": str(self.individual_contact.id),
            "account_id": str(self.individual_account.id),
            "updated_fields": ["name"]
        }
        
        mock_sync_c2e.return_value = {
            "operation": "contact_to_ecommerce",
            "contact_id": str(self.individual_contact.id),
            "ecommerce_user_id": "ecom-123",
            "updated_fields": ["first_name"],
            "response": {"status": "success"}
        }
        
        # Call the task with relevant fields
        result = sync_individual_account_contact_data(
            str(self.individual_contact.id),
            'Contact',
            ['first_name', 'email'],
            1,
            self.mock_user_id
        )
        
        # Verify tenant context was set
        mock_set_tenant.assert_called_once_with(1)
        
        # Verify the sync functions were called
        mock_sync_c2a.assert_called_once_with(
            uuid.UUID(str(self.individual_contact.id)),
            ['first_name', 'email'],
            self.mock_user_id
        )
        
        mock_sync_c2e.assert_called_once_with(
            uuid.UUID(str(self.individual_contact.id)),
            ['first_name', 'email']
        )
        
        # Verify the result
        assert result['status'] == 'success'
        assert len(result['operations']) == 2
    
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
    
    @pytest.mark.asyncio
    async def test_sync_contact_to_ecommerce(self):
        """Test the contact-to-ecommerce sync function."""
        # Mock the EcomApiClient
        with patch('customers.tasks.EcomApiClient') as mock_client_class:
            # Set up the mock client
            mock_client = MagicMock()
            mock_client.update_user_profile = AsyncMock(return_value=(True, {"status": "success"}))
            mock_client_class.return_value = mock_client
            
            # Call the sync function
            result = await _sync_contact_to_ecommerce(
                self.ecommerce_contact.id,
                ['first_name', 'email']
            )
            
            # Verify the result
            assert result is not None
            assert result['operation'] == 'contact_to_ecommerce'
            assert result['contact_id'] == str(self.ecommerce_contact.id)
            assert result['ecommerce_user_id'] == self.ecommerce_contact.ecommerce_user_id
            
            # Verify the API client was called
            mock_client.update_user_profile.assert_called_once_with(
                self.ecommerce_contact.ecommerce_user_id,
                {
                    'first_name': self.ecommerce_contact.first_name,
                    'email': self.ecommerce_contact.email
                }
            )
    
    @pytest.mark.asyncio
    async def test_sync_contact_to_ecommerce_no_ecommerce_id(self):
        """Test that the contact-to-ecommerce sync function skips contacts without an ecommerce_user_id."""
        # Call the sync function with a contact that has no ecommerce_user_id
        result = await _sync_contact_to_ecommerce(
            self.individual_contact.id,
            ['first_name', 'email']
        )
        
        # Verify the result is None (skipped)
        assert result is None
    
    @pytest.mark.asyncio
    async def test_sync_contact_to_ecommerce_api_error(self):
        """Test that the contact-to-ecommerce sync function handles API errors."""
        # Mock the EcomApiClient
        with patch('customers.tasks.EcomApiClient') as mock_client_class:
            # Set up the mock client to return an error
            mock_client = MagicMock()
            mock_client.update_user_profile = AsyncMock(return_value=(False, {"error": "API error"}))
            mock_client_class.return_value = mock_client
            
            # Call the sync function and expect an exception
            with pytest.raises(Exception) as excinfo:
                await _sync_contact_to_ecommerce(
                    self.ecommerce_contact.id,
                    ['first_name', 'email']
                )
            
            # Verify the exception message
            assert "E-commerce API error" in str(excinfo.value)
            
            # Verify the API client was called
            mock_client.update_user_profile.assert_called_once()
