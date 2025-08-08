"""
Unit tests for the Contact serializer.

This module contains unit tests for the ContactSerializer that don't rely on
database operations, focusing on validation and serialization logic.
"""
from unittest import TestCase
from unittest.mock import Mock, patch
from rest_framework.exceptions import ValidationError

from customers.serializers import ContactSerializer, ContactAccountSerializer
from customers.models import Contact, Account


class ContactSerializerTests(TestCase):
    """Test cases for the ContactSerializer."""
    
    def setUp(self):
        """Set up test data."""
        # Mock Account
        self.account = Mock(spec=Account)
        self.account.id = '123e4567-e89b-12d3-a456-426614174000'
        self.account.name = 'Test Account'
        self.account.account_number = 'ACC-001'
        self.account.status = 'Active'
        
        # Mock Contact
        self.contact = Mock(spec=Contact)
        self.contact.id = '123e4567-e89b-12d3-a456-426614174001'
        self.contact.first_name = 'John'
        self.contact.last_name = 'Doe'
        self.contact.account = self.account
        self.contact.email = 'john.doe@example.com'
        self.contact.mobile_phone = '123-456-7890'
        self.contact.job_title = 'Manager'
        self.contact.status = 'Active'
        self.contact.full_name = 'John Doe'
        
        # Valid contact data
        self.valid_data = {
            'first_name': 'Jane',
            'last_name': 'Smith',
            'email': 'jane.smith@example.com',
            'mobile_phone': '987-654-3210',
            'job_title': 'Developer',
            'status': 'Active'
        }
    
    def test_contact_account_serializer(self):
        """Test ContactAccountSerializer."""
        serializer = ContactAccountSerializer(self.account)
        data = serializer.data
        
        # Check that the serializer includes the expected fields
        self.assertEqual(data['id'], str(self.account.id))
        self.assertEqual(data['name'], self.account.name)
        self.assertEqual(data['account_number'], self.account.account_number)
        self.assertEqual(data['status'], self.account.status)
    
    def test_contact_serializer_fields(self):
        """Test that ContactSerializer includes all expected fields."""
        serializer = ContactSerializer(self.contact)
        data = serializer.data
        
        # Check that the serializer includes the expected fields
        self.assertEqual(data['id'], str(self.contact.id))
        self.assertEqual(data['first_name'], self.contact.first_name)
        self.assertEqual(data['last_name'], self.contact.last_name)
        self.assertEqual(data['full_name'], self.contact.full_name)
        self.assertEqual(data['email'], self.contact.email)
        self.assertEqual(data['mobile_phone'], self.contact.mobile_phone)
        self.assertEqual(data['job_title'], self.contact.job_title)
        self.assertEqual(data['status'], self.contact.status)
        
        # Check that the nested account is included
        self.assertEqual(data['account']['id'], str(self.account.id))
        self.assertEqual(data['account']['name'], self.account.name)
    
    @patch('customers.serializers.Contact.objects.filter')
    def test_email_uniqueness_validation(self, mock_filter):
        """Test email uniqueness validation."""
        # Set up the mock to simulate an existing contact with the same email
        mock_queryset = Mock()
        mock_queryset.exclude.return_value = mock_queryset
        mock_queryset.exists.return_value = True
        mock_filter.return_value = mock_queryset
        
        # Create serializer with duplicate email
        serializer = ContactSerializer(data={
            'first_name': 'New',
            'email': 'existing@example.com',
            'account_id': '123e4567-e89b-12d3-a456-426614174000'
        })
        
        # Check that validation fails
        with self.assertRaises(ValidationError):
            serializer.validate_email('existing@example.com')
    
    @patch('customers.serializers.Contact.objects.filter')
    def test_email_uniqueness_validation_update(self, mock_filter):
        """Test email uniqueness validation during update."""
        # Set up the mock to simulate no existing contacts with the same email
        mock_queryset = Mock()
        mock_queryset.exclude.return_value = mock_queryset
        mock_queryset.exists.return_value = False
        mock_filter.return_value = mock_queryset
        
        # Create serializer for update
        serializer = ContactSerializer(instance=self.contact)
        
        # Check that validation passes
        self.assertEqual(
            serializer.validate_email('new.email@example.com'),
            'new.email@example.com'
        )
    
    def test_optional_last_name(self):
        """Test that last_name is optional."""
        # Create data without last_name
        data = {
            'first_name': 'Jane',
            'email': 'jane@example.com',
            'account_id': '123e4567-e89b-12d3-a456-426614174000'
        }
        
        # Create serializer
        serializer = ContactSerializer(data=data)
        
        # Check that validation passes (no error for missing last_name)
        self.assertTrue('last_name' not in serializer.get_fields().fields or 
                       not serializer.get_fields()['last_name'].required)
    
    def test_required_account(self):
        """Test that account is required."""
        # Create data without account_id
        data = {
            'first_name': 'Jane',
            'email': 'jane@example.com'
        }
        
        # Create serializer
        serializer = ContactSerializer(data=data)
        
        # Check that account_id is required
        self.assertTrue('account_id' in serializer.get_fields() and 
                       serializer.get_fields()['account_id'].required)
    
    def test_read_only_fields(self):
        """Test that certain fields are read-only."""
        serializer = ContactSerializer()
        
        # Check that audit fields are read-only
        read_only_fields = serializer.Meta.read_only_fields
        self.assertIn('id', read_only_fields)
        self.assertIn('created_at', read_only_fields)
        self.assertIn('updated_at', read_only_fields)
        self.assertIn('created_by', read_only_fields)
        self.assertIn('updated_by', read_only_fields)
        self.assertIn('full_name', read_only_fields)
