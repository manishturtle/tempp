"""
Manual test script for Contact API components.

This script manually tests the ContactSerializer and ContactViewSet
without relying on the Django test runner.
"""
import os
import sys
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_backend.settings')

# Add the parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
django.setup()

from customers.models import Contact, Account
from customers.serializers import ContactSerializer, ContactAccountSerializer
from customers.views import ContactViewSet
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory

User = get_user_model()

def test_contact_account_serializer():
    """Test ContactAccountSerializer."""
    print("\n=== Testing ContactAccountSerializer ===")
    
    # Get an account from the database
    try:
        account = Account.objects.first()
        if not account:
            print("No accounts found in the database.")
            return
        
        # Serialize the account
        serializer = ContactAccountSerializer(account)
        data = serializer.data
        
        # Print the serialized data
        print(f"Account ID: {data.get('id')}")
        print(f"Account Name: {data.get('name')}")
        print(f"Account Number: {data.get('account_number')}")
        print(f"Account Status: {data.get('status')}")
        
        print("ContactAccountSerializer test passed!")
    except Exception as e:
        print(f"Error in ContactAccountSerializer test: {e}")

def test_contact_serializer():
    """Test ContactSerializer."""
    print("\n=== Testing ContactSerializer ===")
    
    # Get a contact from the database
    try:
        contact = Contact.objects.select_related('account').first()
        if not contact:
            print("No contacts found in the database.")
            return
        
        # Serialize the contact
        serializer = ContactSerializer(contact)
        data = serializer.data
        
        # Print the serialized data
        print(f"Contact ID: {data.get('id')}")
        print(f"First Name: {data.get('first_name')}")
        print(f"Last Name: {data.get('last_name')}")
        print(f"Full Name: {data.get('full_name')}")
        print(f"Email: {data.get('email')}")
        print(f"Account: {data.get('account', {}).get('name') if data.get('account') else None}")
        
        print("ContactSerializer test passed!")
    except Exception as e:
        print(f"Error in ContactSerializer test: {e}")

def test_contact_viewset():
    """Test ContactViewSet."""
    print("\n=== Testing ContactViewSet ===")
    
    try:
        # Create a request factory
        factory = APIRequestFactory()
        
        # Create a viewset instance
        viewset = ContactViewSet()
        
        # Check the queryset
        queryset = viewset.get_queryset()
        print(f"Queryset model: {queryset.model.__name__}")
        print(f"Queryset select_related: {queryset.query.select_related}")
        
        # Check the serializer class
        print(f"Serializer class: {viewset.serializer_class.__name__}")
        
        # Check the filter backends
        print(f"Filter backends: {[backend.__name__ for backend in viewset.filter_backends]}")
        
        # Check the filterset fields
        print(f"Filterset fields: {viewset.filterset_fields}")
        
        # Check the search fields
        print(f"Search fields: {viewset.search_fields}")
        
        # Check the ordering fields
        print(f"Ordering fields: {viewset.ordering_fields}")
        
        # Check the default ordering
        print(f"Default ordering: {viewset.ordering}")
        
        print("ContactViewSet test passed!")
    except Exception as e:
        print(f"Error in ContactViewSet test: {e}")

if __name__ == "__main__":
    print("Starting manual tests for Contact API components...")
    
    # Run the tests
    test_contact_account_serializer()
    test_contact_serializer()
    test_contact_viewset()
    
    print("\nManual tests completed!")
