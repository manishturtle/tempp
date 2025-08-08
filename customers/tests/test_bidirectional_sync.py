"""
Integration tests for bi-directional synchronization between Accounts and Contacts.

This module contains comprehensive tests to validate the synchronization logic
for Individual Accounts and their associated Contacts.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from tenants.models import Tenant
from customers.models import Account, Contact, CustomerGroup
from customers.tasks import sync_individual_account_contact_data

User = get_user_model()

class BiDirectionalSyncTests(TestCase):
    """Test cases for bi-directional synchronization between Accounts and Contacts."""

    def setUp(self):
        """Set up test data for synchronization tests."""
        # Create tenant
        self.tenant = Tenant.objects.create(
            name="Test Tenant",
            schema_name="test_tenant"
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
            group_type="INDIVIDUAL",
            created_by=self.user,
            updated_by=self.user
        )

    def test_account_name_sync_to_contact(self):
        """Test that Account name updates sync to Contact first_name and last_name."""
        # Create an Individual Account with a Contact
        account = Account.objects.create(
            name="John Doe",
            account_type="INDIVIDUAL",
            customer_group=self.customer_group,
            created_by=self.user,
            updated_by=self.user
        )

        # Verify Contact was auto-created
        contact = Contact.objects.get(account=account)
        self.assertEqual(contact.first_name, "John")
        self.assertEqual(contact.last_name, "Doe")

        # Update Account name
        account.name = "Jane Smith"
        account.save()

        # Refresh contact
        contact.refresh_from_db()
        self.assertEqual(contact.first_name, "Jane")
        self.assertEqual(contact.last_name, "Smith")

    def test_contact_name_sync_to_account(self):
        """Test that Contact name updates sync to Account name."""
        # Create an Individual Account with a Contact
        account = Account.objects.create(
            name="John Doe",
            account_type="INDIVIDUAL",
            customer_group=self.customer_group,
            created_by=self.user,
            updated_by=self.user
        )

        # Get the auto-created Contact
        contact = Contact.objects.get(account=account)

        # Update Contact name
        contact.first_name = "Jane"
        contact.last_name = "Smith"
        contact.save()

        # Refresh account
        account.refresh_from_db()
        self.assertEqual(account.name, "Jane Smith")

    def test_sync_only_for_individual_accounts(self):
        """Ensure synchronization only occurs for Individual account types."""
        # Create a Business Account
        business_account = Account.objects.create(
            name="Acme Corporation",
            account_type="BUSINESS",
            customer_group=self.customer_group,
            created_by=self.user,
            updated_by=self.user
        )

        # Verify no Contact is created for Business account
        with self.assertRaises(Contact.DoesNotExist):
            Contact.objects.get(account=business_account)

    def test_sync_task_handles_edge_cases(self):
        """Test the synchronization task handles various edge cases."""
        # Create an Individual Account
        account = Account.objects.create(
            name="John Doe",
            account_type="INDIVIDUAL",
            customer_group=self.customer_group,
            created_by=self.user,
            updated_by=self.user
        )

        contact = Contact.objects.get(account=account)

        # Test task with minimal parameters
        result = sync_individual_account_contact_data(
            record_id=str(account.id),
            model_name='Account',
            updated_fields=['name'],
            tenant_id=self.tenant.id
        )

        self.assertIn('success', result)
        self.assertTrue(result['success'])

    def test_sync_prevents_infinite_loops(self):
        """Verify that synchronization does not cause infinite update loops."""
        # Create an Individual Account
        account = Account.objects.create(
            name="John Doe",
            account_type="INDIVIDUAL",
            customer_group=self.customer_group,
            created_by=self.user,
            updated_by=self.user
        )

        contact = Contact.objects.get(account=account)

        # Track the number of saves
        with patch('customers.signals.post_save.send') as mock_signal:
            account.name = "Jane Smith"
            account.save()
            
            # Ensure the signal was sent only once
            self.assertEqual(mock_signal.call_count, 1)
