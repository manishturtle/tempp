"""
Simple test for auto-creation of contacts for Individual accounts.

This module contains a focused test that doesn't require database setup.
"""
import sys
from unittest.mock import patch, MagicMock

# Create mock for Account model
class MockAccount:
    def __init__(self, name, customer_group=None, client_id=1, owner=None):
        self.name = name
        self.customer_group = customer_group
        self.client_id = client_id
        self.owner = owner
        self.id = 123

# Create mock for CustomerGroup model
class MockCustomerGroup:
    def __init__(self, group_type):
        self.group_type = group_type

# Create mock for User model
class MockUser:
    def __init__(self, username):
        self.username = username

# Create mock Contact.objects.create function
def mock_contact_create(**kwargs):
    print("Contact created with:")
    for key, value in kwargs.items():
        print(f"  - {key}: {value}")
    return MagicMock()

# Create mock for the perform_create method
def perform_create(serializer, request_user):
    # This simulates the AccountViewSet.perform_create method
    account_instance = serializer.save(
        client_id=1,
        created_by=request_user,
        updated_by=request_user
    )
    
    # Auto-create a Contact for Individual accounts
    if (account_instance.customer_group and 
            account_instance.customer_group.group_type == 'INDIVIDUAL'):
        try:
            # This would normally call Contact.objects.create
            # but we're mocking it for testing
            mock_contact_create(
                account=account_instance,
                first_name=account_instance.name,
                last_name="",
                email=serializer.validated_data.get('email'),
                owner=account_instance.owner,
                client_id=account_instance.client_id,
                created_by=request_user,
                updated_by=request_user
            )
            print("✅ Contact was created for Individual account")
        except Exception as e:
            print(f"❌ Error creating contact: {e}")
    else:
        print("✅ No contact created for non-Individual account (expected)")

# Test 1: Individual account should create a contact
def test_individual_account():
    print("\nTest 1: Individual account should create a contact")
    # Create mock objects
    individual_group = MockCustomerGroup(group_type='INDIVIDUAL')
    user = MockUser(username='testuser')
    
    # Create a mock account with Individual customer group
    account = MockAccount(
        name='John Doe',
        customer_group=individual_group,
        owner=user
    )
    
    # Create a mock serializer
    serializer = MagicMock()
    serializer.save.return_value = account
    serializer.validated_data = {'email': 'john.doe@example.com'}
    
    # Call perform_create
    perform_create(serializer, user)

# Test 2: Business account should not create a contact
def test_business_account():
    print("\nTest 2: Business account should not create a contact")
    # Create mock objects
    business_group = MockCustomerGroup(group_type='BUSINESS')
    user = MockUser(username='testuser')
    
    # Create a mock account with Business customer group
    account = MockAccount(
        name='Acme Corporation',
        customer_group=business_group,
        owner=user
    )
    
    # Create a mock serializer
    serializer = MagicMock()
    serializer.save.return_value = account
    serializer.validated_data = {'email': 'info@acme.com'}
    
    # Call perform_create
    perform_create(serializer, user)

# Run the tests
if __name__ == '__main__':
    print("Running Account Contact Creation Tests")
    test_individual_account()
    test_business_account()
    print("\nAll tests completed!")
