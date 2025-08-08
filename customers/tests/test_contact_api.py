"""
Tests for the Contact API endpoints.

This module contains tests for the Contact API endpoints, including CRUD operations,
validation, filtering, searching, and tenant isolation.
"""
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from tenants.models import Tenant
from customers.models import CustomerGroup, Account, Contact

User = get_user_model()


class ContactViewSetTests(TestCase):
    """Test cases for the ContactViewSet."""
    
    def setUp(self):
        """Set up test data."""
        # Create tenant
        self.tenant = Tenant.objects.create(
            name="Test Tenant",
            schema_name="test_tenant"
        )
        
        # Create another tenant for isolation testing
        self.other_tenant = Tenant.objects.create(
            name="Other Tenant",
            schema_name="other_tenant"
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
            group_type="BUSINESS",
            created_by=self.user,
            updated_by=self.user
        )
        
        # Create account
        self.account = Account.objects.create(
            client=self.tenant,
            name="Test Account",
            customer_group=self.customer_group,
            created_by=self.user,
            updated_by=self.user
        )
        
        # Create another account
        self.another_account = Account.objects.create(
            client=self.tenant,
            name="Another Account",
            customer_group=self.customer_group,
            created_by=self.user,
            updated_by=self.user
        )
        
        # Create contact
        self.contact = Contact.objects.create(
            client=self.tenant,
            first_name="John",
            last_name="Doe",
            account=self.account,
            email="john.doe@example.com",
            mobile_phone="123-456-7890",
            job_title="Manager",
            created_by=self.user,
            updated_by=self.user
        )
        
        # Create contact without last name
        self.contact_no_last_name = Contact.objects.create(
            client=self.tenant,
            first_name="Jane",
            account=self.account,
            email="jane@example.com",
            created_by=self.user,
            updated_by=self.user
        )
        
        # Create a contact for another tenant
        self.other_tenant_account = Account.objects.create(
            client=self.other_tenant,
            name="Other Tenant Account",
            created_by=self.user,
            updated_by=self.user
        )
        
        self.other_tenant_contact = Contact.objects.create(
            client=self.other_tenant,
            first_name="Other",
            last_name="Contact",
            account=self.other_tenant_account,
            email="other.contact@example.com",
            created_by=self.user,
            updated_by=self.user
        )
        
        # Set up API client
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        # API endpoints
        self.list_url = reverse('contact-list')
        self.detail_url = reverse('contact-detail', args=[self.contact.id])
    
    def test_authentication_required(self):
        """Test that authentication is required for API access."""
        # Create unauthenticated client
        client = APIClient()
        
        # Try to access the API without authentication
        response = client.get(self.list_url)
        
        # Check that access is denied
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_list_contacts(self):
        """Test listing contacts."""
        # Get the list of contacts
        response = self.client.get(self.list_url)
        
        # Check that the request was successful
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that both contacts are returned
        self.assertEqual(len(response.data['results']), 2)
    
    def test_retrieve_contact(self):
        """Test retrieving a single contact."""
        # Get the contact
        response = self.client.get(self.detail_url)
        
        # Check that the request was successful
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that the correct contact is returned
        self.assertEqual(response.data['id'], str(self.contact.id))
        self.assertEqual(response.data['first_name'], 'John')
        self.assertEqual(response.data['last_name'], 'Doe')
        self.assertEqual(response.data['email'], 'john.doe@example.com')
        
        # Check that the nested account is included
        self.assertEqual(response.data['account']['id'], str(self.account.id))
        self.assertEqual(response.data['account']['name'], 'Test Account')
    
    def test_create_contact(self):
        """Test creating a contact."""
        # Data for a new contact
        data = {
            'first_name': 'New',
            'last_name': 'Contact',
            'account_id': str(self.account.id),
            'email': 'new.contact@example.com',
            'mobile_phone': '987-654-3210',
            'job_title': 'Developer'
        }
        
        # Create the contact
        response = self.client.post(self.list_url, data, format='json')
        
        # Check that the request was successful
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check that the contact was created
        self.assertEqual(Contact.objects.count(), 4)  # 3 existing + 1 new
        
        # Check that the contact has the correct data
        new_contact = Contact.objects.get(email='new.contact@example.com')
        self.assertEqual(new_contact.first_name, 'New')
        self.assertEqual(new_contact.last_name, 'Contact')
        self.assertEqual(new_contact.account.id, self.account.id)
        self.assertEqual(new_contact.mobile_phone, '987-654-3210')
        self.assertEqual(new_contact.job_title, 'Developer')
    
    def test_create_contact_without_last_name(self):
        """Test creating a contact without a last name."""
        # Data for a new contact without last name
        data = {
            'first_name': 'NoLast',
            'account_id': str(self.account.id),
            'email': 'nolast@example.com'
        }
        
        # Create the contact
        response = self.client.post(self.list_url, data, format='json')
        
        # Check that the request was successful
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check that the contact was created
        self.assertEqual(Contact.objects.count(), 4)  # 3 existing + 1 new
        
        # Check that the contact has the correct data
        new_contact = Contact.objects.get(email='nolast@example.com')
        self.assertEqual(new_contact.first_name, 'NoLast')
        self.assertIsNone(new_contact.last_name)
        self.assertEqual(new_contact.account.id, self.account.id)
    
    def test_create_contact_without_account(self):
        """Test that creating a contact without an account fails."""
        # Data for a new contact without account
        data = {
            'first_name': 'No',
            'last_name': 'Account',
            'email': 'no.account@example.com'
        }
        
        # Try to create the contact
        response = self.client.post(self.list_url, data, format='json')
        
        # Check that the request failed
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Check that the error message mentions account
        self.assertIn('account', response.data)
    
    def test_create_contact_duplicate_email(self):
        """Test that creating a contact with a duplicate email fails."""
        # Data for a new contact with duplicate email
        data = {
            'first_name': 'Duplicate',
            'last_name': 'Email',
            'account_id': str(self.account.id),
            'email': 'john.doe@example.com'  # Same as existing contact
        }
        
        # Try to create the contact
        response = self.client.post(self.list_url, data, format='json')
        
        # Check that the request failed
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Check that the error message mentions email
        self.assertIn('email', response.data)
    
    def test_update_contact(self):
        """Test updating a contact."""
        # Data for updating the contact
        data = {
            'first_name': 'Updated',
            'last_name': 'Contact',
            'account_id': str(self.another_account.id),  # Change account
            'email': 'updated.contact@example.com',
            'job_title': 'Senior Manager'
        }
        
        # Update the contact
        response = self.client.put(self.detail_url, data, format='json')
        
        # Check that the request was successful
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Refresh the contact from the database
        self.contact.refresh_from_db()
        
        # Check that the contact was updated
        self.assertEqual(self.contact.first_name, 'Updated')
        self.assertEqual(self.contact.last_name, 'Contact')
        self.assertEqual(self.contact.account.id, self.another_account.id)
        self.assertEqual(self.contact.email, 'updated.contact@example.com')
        self.assertEqual(self.contact.job_title, 'Senior Manager')
    
    def test_partial_update_contact(self):
        """Test partially updating a contact."""
        # Data for partially updating the contact
        data = {
            'job_title': 'Senior Developer'
        }
        
        # Partially update the contact
        response = self.client.patch(self.detail_url, data, format='json')
        
        # Check that the request was successful
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Refresh the contact from the database
        self.contact.refresh_from_db()
        
        # Check that only the specified field was updated
        self.assertEqual(self.contact.job_title, 'Senior Developer')
        self.assertEqual(self.contact.first_name, 'John')  # Unchanged
        self.assertEqual(self.contact.last_name, 'Doe')  # Unchanged
        self.assertEqual(self.contact.email, 'john.doe@example.com')  # Unchanged
    
    def test_delete_contact(self):
        """Test deleting a contact."""
        # Delete the contact
        response = self.client.delete(self.detail_url)
        
        # Check that the request was successful
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Check that the contact was deleted
        self.assertEqual(Contact.objects.filter(id=self.contact.id).count(), 0)
    
    def test_filter_by_account(self):
        """Test filtering contacts by account."""
        # Filter by account
        response = self.client.get(f"{self.list_url}?account={self.account.id}")
        
        # Check that the request was successful
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that only contacts for the specified account are returned
        self.assertEqual(len(response.data['results']), 2)
        
        # Create a contact for another account
        Contact.objects.create(
            client=self.tenant,
            first_name="Another",
            last_name="Person",
            account=self.another_account,
            email="another.person@example.com",
            created_by=self.user,
            updated_by=self.user
        )
        
        # Filter by the other account
        response = self.client.get(f"{self.list_url}?account={self.another_account.id}")
        
        # Check that only contacts for the specified account are returned
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['first_name'], 'Another')
    
    def test_search_by_name(self):
        """Test searching contacts by name."""
        # Search for "John"
        response = self.client.get(f"{self.list_url}?search=John")
        
        # Check that the request was successful
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that only matching contacts are returned
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['first_name'], 'John')
        
        # Search for "Jane"
        response = self.client.get(f"{self.list_url}?search=Jane")
        
        # Check that only matching contacts are returned
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['first_name'], 'Jane')
    
    def test_search_by_email(self):
        """Test searching contacts by email."""
        # Search for "john.doe"
        response = self.client.get(f"{self.list_url}?search=john.doe")
        
        # Check that the request was successful
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that only matching contacts are returned
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['email'], 'john.doe@example.com')
    
    def test_ordering(self):
        """Test ordering contacts."""
        # Order by first_name (ascending)
        response = self.client.get(f"{self.list_url}?ordering=first_name")
        
        # Check that the request was successful
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that contacts are ordered by first_name
        self.assertEqual(response.data['results'][0]['first_name'], 'Jane')
        self.assertEqual(response.data['results'][1]['first_name'], 'John')
        
        # Order by first_name (descending)
        response = self.client.get(f"{self.list_url}?ordering=-first_name")
        
        # Check that contacts are ordered by first_name in descending order
        self.assertEqual(response.data['results'][0]['first_name'], 'John')
        self.assertEqual(response.data['results'][1]['first_name'], 'Jane')
    
    def test_tenant_isolation(self):
        """Test that contacts from other tenants are not visible."""
        # Get the list of contacts
        response = self.client.get(self.list_url)
        
        # Check that the request was successful
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that only contacts from the current tenant are returned
        self.assertEqual(len(response.data['results']), 2)
        
        # Check that the contact from the other tenant is not included
        contact_ids = [contact['id'] for contact in response.data['results']]
        self.assertNotIn(str(self.other_tenant_contact.id), contact_ids)
