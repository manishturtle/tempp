"""
Tests for the import_customers management command.

This module contains tests for the import_customers management command,
which imports Account and Contact data from CSV files.
"""
import os
import pytest
from io import StringIO
from unittest.mock import patch, MagicMock
from django.core.management import call_command
from django.test import TestCase
from django.conf import settings

from customers.models import Account, Contact, CustomerGroup
from customers.serializers import AccountSerializer, ContactSerializer


class TestImportCustomersCommand(TestCase):
    """Test cases for the import_customers management command."""
    
    fixtures_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'fixtures')
    
    def setUp(self):
        """Set up test environment."""
        # Create customer groups for testing
        self.business_group = CustomerGroup.objects.create(
            group_name="Business",
            group_type="BUSINESS",
            is_active=True
        )
        self.individual_group = CustomerGroup.objects.create(
            group_name="Individual",
            group_type="INDIVIDUAL",
            is_active=True
        )
        self.government_group = CustomerGroup.objects.create(
            group_name="Government",
            group_type="GOVERNMENT",
            is_active=True
        )
        
        # Create test accounts
        self.acme_account = Account.objects.create(
            name="Acme Corporation",
            account_number="ACM001",
            customer_group=self.business_group
        )
        
        # Define file paths
        self.accounts_csv = os.path.join(self.fixtures_dir, 'test_accounts.csv')
        self.individual_accounts_csv = os.path.join(self.fixtures_dir, 'test_individual_accounts.csv')
        self.contacts_csv = os.path.join(self.fixtures_dir, 'test_contacts.csv')
        self.account_mapping = os.path.join(self.fixtures_dir, 'test_account_mapping.json')
        self.contact_mapping = os.path.join(self.fixtures_dir, 'test_contact_mapping.json')
    
    def test_command_requires_model_argument(self):
        """Test that the command requires the model argument."""
        out = StringIO()
        with self.assertRaises(SystemExit):
            call_command('import_customers', stdout=out)
    
    def test_command_requires_file_argument(self):
        """Test that the command requires the file argument."""
        out = StringIO()
        with self.assertRaises(SystemExit):
            call_command('import_customers', model='Account', stdout=out)
    
    def test_import_accounts_create_mode(self):
        """Test importing accounts in create_only mode."""
        out = StringIO()
        
        # Count accounts before import
        accounts_before = Account.objects.count()
        
        # Call the command
        call_command(
            'import_customers',
            model='Account',
            file=self.accounts_csv,
            mode='create_only',
            stdout=out
        )
        
        # Check output
        output = out.getvalue()
        self.assertIn('Import completed', output)
        
        # Check that new accounts were created
        accounts_after = Account.objects.count()
        self.assertGreater(accounts_after, accounts_before)
        
        # Check specific account
        tech_account = Account.objects.filter(account_number='TECH002').first()
        self.assertIsNotNone(tech_account)
        self.assertEqual(tech_account.name, 'TechStart Inc.')
        self.assertEqual(tech_account.customer_group, self.business_group)
    
    def test_import_accounts_update_mode(self):
        """Test importing accounts in update_only mode."""
        # Create account to update
        Account.objects.create(
            name="Old TechStart Name",
            account_number="TECH002",
            customer_group=self.business_group
        )
        
        out = StringIO()
        
        # Call the command
        call_command(
            'import_customers',
            model='Account',
            file=self.accounts_csv,
            mode='update_only',
            stdout=out
        )
        
        # Check output
        output = out.getvalue()
        self.assertIn('Import completed', output)
        
        # Check that account was updated
        tech_account = Account.objects.get(account_number='TECH002')
        self.assertEqual(tech_account.name, 'TechStart Inc.')
        self.assertEqual(tech_account.legal_name, 'TechStart Innovations')
    
    def test_import_individual_accounts_auto_contact_creation(self):
        """Test importing individual accounts with auto-contact creation."""
        out = StringIO()
        
        # Count contacts before import
        contacts_before = Contact.objects.count()
        
        # Call the command
        call_command(
            'import_customers',
            model='Account',
            file=self.individual_accounts_csv,
            mode='create_only',
            stdout=out
        )
        
        # Check output
        output = out.getvalue()
        self.assertIn('Import completed', output)
        
        # Check that new accounts were created
        john_account = Account.objects.filter(account_number='IND001').first()
        self.assertIsNotNone(john_account)
        self.assertEqual(john_account.name, 'John Smith')
        self.assertEqual(john_account.customer_group, self.individual_group)
        
        # Check that contacts were auto-created
        contacts_after = Contact.objects.count()
        self.assertGreater(contacts_after, contacts_before)
        
        # Check specific contact
        john_contact = Contact.objects.filter(email='john.smith@example.com').first()
        self.assertIsNotNone(john_contact)
        self.assertEqual(john_contact.first_name, 'John')
        self.assertEqual(john_contact.last_name, 'Smith')
        self.assertEqual(john_contact.account, john_account)
    
    def test_import_contacts(self):
        """Test importing contacts."""
        # Create accounts for the contacts
        Account.objects.create(
            name="John Smith",
            account_number="IND001",
            customer_group=self.individual_group
        )
        Account.objects.create(
            name="Jane Doe",
            account_number="IND002",
            customer_group=self.individual_group
        )
        
        out = StringIO()
        
        # Count contacts before import
        contacts_before = Contact.objects.count()
        
        # Call the command
        call_command(
            'import_customers',
            model='Contact',
            file=self.contacts_csv,
            mode='create_only',
            stdout=out
        )
        
        # Check output
        output = out.getvalue()
        self.assertIn('Import completed', output)
        
        # Check that new contacts were created
        contacts_after = Contact.objects.count()
        self.assertGreater(contacts_after, contacts_before)
        
        # Check specific contact
        john_contact = Contact.objects.filter(email='john.smith@example.com').first()
        self.assertIsNotNone(john_contact)
        self.assertEqual(john_contact.first_name, 'John')
        self.assertEqual(john_contact.last_name, 'Smith')
        self.assertEqual(john_contact.job_title, 'CEO')
    
    def test_import_with_mapping_file(self):
        """Test importing with a mapping file."""
        out = StringIO()
        
        # Call the command with mapping file
        call_command(
            'import_customers',
            model='Account',
            file=self.accounts_csv,
            mode='create_only',
            mapping=self.account_mapping,
            stdout=out
        )
        
        # Check output
        output = out.getvalue()
        self.assertIn('Import completed', output)
        self.assertIn('Using mapping from file', output)
        
        # Check that accounts were created correctly
        gov_account = Account.objects.filter(account_number='GOV003').first()
        self.assertIsNotNone(gov_account)
        self.assertEqual(gov_account.name, 'Government Agency')
        self.assertEqual(gov_account.customer_group, self.government_group)
    
    def test_error_handling_invalid_file(self):
        """Test error handling for invalid file."""
        out = StringIO()
        
        # Call the command with non-existent file
        with self.assertRaises(FileNotFoundError):
            call_command(
                'import_customers',
                model='Account',
                file='non_existent_file.csv',
                stdout=out
            )
    
    def test_error_handling_invalid_data(self):
        """Test error handling for invalid data."""
        # Create a CSV with invalid data
        invalid_csv = os.path.join(self.fixtures_dir, 'test_invalid_accounts.csv')
        with open(invalid_csv, 'w') as f:
            f.write("name,customer_group\n")
            f.write(",Invalid Group\n")  # Missing name, invalid group
        
        out = StringIO()
        
        # Call the command
        call_command(
            'import_customers',
            model='Account',
            file=invalid_csv,
            mode='create_only',
            stdout=out
        )
        
        # Check output
        output = out.getvalue()
        self.assertIn('Import completed with errors', output)
        self.assertIn('Errors encountered', output)
