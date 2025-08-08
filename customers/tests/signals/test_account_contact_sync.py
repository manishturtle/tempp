"""
Tests for the Account-Contact synchronization signal handler.

This module contains tests for the signal handler that triggers
synchronization between Accounts and Contacts.
"""
import pytest
from unittest.mock import patch, MagicMock
from django.test import TestCase, override_settings

from customers.models import Account, Contact, CustomerGroup
from customers.signals import handle_account_contact_sync


@pytest.mark.django_db
class TestAccountContactSyncSignal(TestCase):
    """Test the Account-Contact synchronization signal handler."""
    
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
    
    @patch('customers.signals.sync_individual_account_contact_data')
    def test_signal_not_triggered_on_creation(self, mock_sync_task):
        """Test that the signal is not triggered when a model is created."""
        # Create a new account
        Account.objects.create(
            name="New Account",
            customer_group=self.business_group,
            status="Active",
            client_id=1,
            company_id=1
        )
        
        # The sync task should not be called
        mock_sync_task.delay.assert_not_called()
    
    @patch('customers.signals.sync_individual_account_contact_data')
    def test_signal_not_triggered_without_update_fields(self, mock_sync_task):
        """Test that the signal is not triggered when update_fields is not provided."""
        # Update an account without specifying update_fields
        self.individual_account.name = "John Smith"
        self.individual_account.save()
        
        # The sync task should not be called
        mock_sync_task.delay.assert_not_called()
    
    @patch('customers.signals.sync_individual_account_contact_data')
    def test_signal_triggered_for_account_name_update(self, mock_sync_task):
        """Test that the signal is triggered when an account's name is updated."""
        # Update an account's name with update_fields
        self.individual_account.name = "John Smith"
        self.individual_account.save(update_fields=['name'])
        
        # The sync task should be called with the correct parameters
        mock_sync_task.delay.assert_called_once_with(
            str(self.individual_account.id),
            'Account',
            ['name'],
            1,  # tenant_id
            None  # updated_by_id
        )
    
    @patch('customers.signals.sync_individual_account_contact_data')
    def test_signal_triggered_for_contact_name_update(self, mock_sync_task):
        """Test that the signal is triggered when a contact's name is updated."""
        # Update a contact's name with update_fields
        self.individual_contact.first_name = "Johnny"
        self.individual_contact.save(update_fields=['first_name'])
        
        # The sync task should be called with the correct parameters
        mock_sync_task.delay.assert_called_once_with(
            str(self.individual_contact.id),
            'Contact',
            ['first_name'],
            1,  # tenant_id
            None  # updated_by_id
        )
    
    @patch('customers.signals.sync_individual_account_contact_data')
    def test_signal_triggered_for_contact_email_update(self, mock_sync_task):
        """Test that the signal is triggered when a contact's email is updated."""
        # Update a contact's email with update_fields
        self.individual_contact.email = "johnny.doe@example.com"
        self.individual_contact.save(update_fields=['email'])
        
        # The sync task should be called with the correct parameters
        mock_sync_task.delay.assert_called_once_with(
            str(self.individual_contact.id),
            'Contact',
            ['email'],
            1,  # tenant_id
            None  # updated_by_id
        )
    
    @patch('customers.signals.sync_individual_account_contact_data')
    def test_signal_not_triggered_for_irrelevant_fields(self, mock_sync_task):
        """Test that the signal is not triggered when irrelevant fields are updated."""
        # Update a field that shouldn't trigger synchronization
        self.individual_contact.description = "Updated description"
        self.individual_contact.save(update_fields=['description'])
        
        # The sync task should not be called
        mock_sync_task.delay.assert_not_called()
    
    @patch('customers.signals.sync_individual_account_contact_data')
    def test_signal_includes_updated_by_id(self, mock_sync_task):
        """Test that the signal includes the updated_by_id when available."""
        # Create a mock user
        mock_user = MagicMock()
        mock_user.id = 123
        
        # Update a contact with an updated_by user
        self.individual_contact.first_name = "Johnny"
        self.individual_contact.updated_by = mock_user
        self.individual_contact.save(update_fields=['first_name', 'updated_by'])
        
        # The sync task should be called with the correct parameters
        mock_sync_task.delay.assert_called_once_with(
            str(self.individual_contact.id),
            'Contact',
            ['first_name', 'updated_by'],
            1,  # tenant_id
            123  # updated_by_id
        )
