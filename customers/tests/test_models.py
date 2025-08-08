"""
Unit tests for customer models.

This module contains tests for the models defined in the customers app,
focusing on validation, constraints, and business logic.
"""
import uuid
import pytest
from django.db import IntegrityError
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from django.test import TestCase
from tenants.models import Tenant
from customers.models import CustomerGroup, Account, Address, Contact

User = get_user_model()


class TestCustomerGroup(TestCase):
    """Test cases for the CustomerGroup model."""
    
    @classmethod
    def setUpTestData(cls):
        """Set up data for all test methods."""
        # Create a test tenant
        cls.tenant = Tenant.objects.create(
            name="Test Tenant",
            schema_name="test_tenant"
        )
        
        # Create a test user for audit fields
        cls.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpassword"
        )
    
    def test_create_customer_group(self):
        """Test creating a customer group with valid data."""
        customer_group = CustomerGroup.objects.create(
            client=self.tenant,
            company_id=1,
            group_name="Wholesale",
            group_type="BUSINESS",
            created_by=self.user,
            updated_by=self.user
        )
        
        # Verify the customer group was created
        self.assertIsNotNone(customer_group.id)
        self.assertIsInstance(customer_group.id, uuid.UUID)
        
        # Verify the fields were set correctly
        self.assertEqual(customer_group.group_name, "Wholesale")
        self.assertEqual(customer_group.group_type, "BUSINESS")
        self.assertTrue(customer_group.is_active)
        
        # Verify the inherited fields
        self.assertEqual(customer_group.client, self.tenant)
        self.assertEqual(customer_group.company_id, 1)
        self.assertEqual(customer_group.created_by, self.user)
        self.assertEqual(customer_group.updated_by, self.user)
        self.assertIsNotNone(customer_group.created_at)
        self.assertIsNotNone(customer_group.updated_at)
    
    def test_unique_group_name_constraint(self):
        """Test that group_name must be unique within a tenant."""
        # Create the first customer group
        CustomerGroup.objects.create(
            client=self.tenant,
            group_name="VIP",
            group_type="INDIVIDUAL",
            created_by=self.user,
            updated_by=self.user
        )
        
        # Try to create another customer group with the same name
        with self.assertRaises(IntegrityError):
            CustomerGroup.objects.create(
                client=self.tenant,
                group_name="VIP",
                group_type="BUSINESS",
                created_by=self.user,
                updated_by=self.user
            )
    
    def test_group_type_choices(self):
        """Test that group_type must be one of the defined choices."""
        # Create a customer group with a valid group_type
        group = CustomerGroup.objects.create(
            client=self.tenant,
            group_name="Government",
            group_type="GOVERNMENT",
            created_by=self.user,
            updated_by=self.user
        )
        self.assertEqual(group.group_type, "GOVERNMENT")
        
        # Try to create a customer group with an invalid group_type
        # This should raise a validation error when full_clean is called
        invalid_group = CustomerGroup(
            client=self.tenant,
            group_name="Invalid",
            group_type="INVALID_TYPE",
            created_by=self.user,
            updated_by=self.user
        )
        
        with self.assertRaises(Exception):
            invalid_group.full_clean()
    
    def test_default_is_active_value(self):
        """Test that is_active defaults to True."""
        group = CustomerGroup.objects.create(
            client=self.tenant,
            group_name="Default Active",
            group_type="BUSINESS",
            created_by=self.user,
            updated_by=self.user
        )
        self.assertTrue(group.is_active)
    
    def test_string_representation(self):
        """Test the string representation of the model."""
        group = CustomerGroup.objects.create(
            client=self.tenant,
            group_name="String Test",
            group_type="INDIVIDUAL",
            created_by=self.user,
            updated_by=self.user
        )
        self.assertEqual(str(group), "String Test")
    
    def test_custom_fields_json_storage(self):
        """Test that custom_fields correctly stores JSON data."""
        # Create a customer group with custom fields
        test_data = {
            "discount_percentage_c": 15,
            "payment_terms_c": "Net 30",
            "industry_c": "Technology",
            "tags_c": ["Premium", "Enterprise", "Global"],
            "credit_limit_c": 50000
        }
        
        group = CustomerGroup.objects.create(
            client=self.tenant,
            group_name="Custom Fields Test",
            group_type="BUSINESS",
            custom_fields=test_data,
            created_by=self.user,
            updated_by=self.user
        )
        
        # Verify custom_fields data is stored correctly
        self.assertEqual(group.custom_fields, test_data)
        
        # Update custom_fields with new data
        updated_data = {
            "discount_percentage_c": 20,
            "payment_terms_c": "Net 45",
            "industry_c": "Finance",
            "tags_c": ["Premium", "Enterprise"],
            "credit_limit_c": 75000
        }
        
        group.custom_fields = updated_data
        group.save()
        
        # Refresh from database and verify updated data
        group.refresh_from_db()
        self.assertEqual(group.custom_fields, updated_data)


class TestAccount(TestCase):
    """Test cases for the Account model."""
    
    @classmethod
    def setUpTestData(cls):
        """Set up data for all test methods."""
        # Create a test tenant
        cls.tenant = Tenant.objects.create(
            name="Test Tenant",
            schema_name="test_tenant"
        )
        
        # Create a test user for audit fields
        cls.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpassword"
        )
        
        # Create test customer groups
        cls.business_group = CustomerGroup.objects.create(
            client=cls.tenant,
            group_name="Business",
            group_type="BUSINESS",
            created_by=cls.user,
            updated_by=cls.user
        )
        
        cls.individual_group = CustomerGroup.objects.create(
            client=cls.tenant,
            group_name="Individual",
            group_type="INDIVIDUAL",
            created_by=cls.user,
            updated_by=cls.user
        )
    
    def test_create_account_with_required_fields(self):
        """Test creating an account with only required fields."""
        account = Account.objects.create(
            client=self.tenant,
            name="Test Account",
            customer_group=self.business_group,
            created_by=self.user,
            updated_by=self.user
        )
        
        # Verify the account was created
        self.assertIsNotNone(account.id)
        self.assertIsInstance(account.id, uuid.UUID)
        
        # Verify the required fields were set correctly
        self.assertEqual(account.name, "Test Account")
        self.assertEqual(account.customer_group, self.business_group)
        self.assertEqual(account.status, "Active")  # Default value
        
        # Verify the inherited fields
        self.assertEqual(account.client, self.tenant)
        self.assertEqual(account.created_by, self.user)
        self.assertEqual(account.updated_by, self.user)
        self.assertIsNotNone(account.created_at)
        self.assertIsNotNone(account.updated_at)
    
    def test_optional_fields(self):
        """Test setting optional fields."""
        account = Account.objects.create(
            client=self.tenant,
            name="Optional Fields Test",
            customer_group=self.business_group,
            legal_name="Legal Company Name",
            account_number="ACC12345",
            website="https://example.com",
            primary_phone="+1-555-123-4567",
            industry="Technology",
            company_size="11-50",
            tax_id="TAX12345",
            description="Test account with optional fields",
            custom_fields={"custom1": "value1", "custom2": "value2"},
            created_by=self.user,
            updated_by=self.user
        )
        
        # Verify optional fields were set correctly
        self.assertEqual(account.legal_name, "Legal Company Name")
        self.assertEqual(account.account_number, "ACC12345")
        self.assertEqual(account.website, "https://example.com")
        self.assertEqual(account.primary_phone, "+1-555-123-4567")
        self.assertEqual(account.industry, "Technology")
        self.assertEqual(account.company_size, "11-50")
        self.assertEqual(account.tax_id, "TAX12345")
        self.assertEqual(account.description, "Test account with optional fields")
        self.assertEqual(account.custom_fields, {"custom1": "value1", "custom2": "value2"})
    
    def test_hierarchy_setup(self):
        """Test setting up a parent-child hierarchy."""
        # Create parent account
        parent = Account.objects.create(
            client=self.tenant,
            name="Parent Account",
            customer_group=self.business_group,
            created_by=self.user,
            updated_by=self.user
        )
        
        # Create child account
        child = Account.objects.create(
            client=self.tenant,
            name="Child Account",
            customer_group=self.business_group,
            parent_account=parent,
            created_by=self.user,
            updated_by=self.user
        )
        
        # Verify the relationship
        self.assertEqual(child.parent_account, parent)
        self.assertIn(child, parent.child_accounts.all())
        
        # Create grandchild account
        grandchild = Account.objects.create(
            client=self.tenant,
            name="Grandchild Account",
            customer_group=self.business_group,
            parent_account=child,
            created_by=self.user,
            updated_by=self.user
        )
        
        # Verify the relationship
        self.assertEqual(grandchild.parent_account, child)
        self.assertIn(grandchild, child.child_accounts.all())
    
    def test_circular_hierarchy_prevention_direct(self):
        """Test that an account cannot be its own parent."""
        account = Account.objects.create(
            client=self.tenant,
            name="Self Reference Test",
            customer_group=self.business_group,
            created_by=self.user,
            updated_by=self.user
        )
        
        # Try to set the account as its own parent
        account.parent_account = account
        
        with self.assertRaises(ValidationError):
            account.full_clean()
    
    def test_circular_hierarchy_prevention_indirect(self):
        """Test that circular references in the hierarchy are prevented."""
        # Create a hierarchy: parent -> child -> grandchild
        parent = Account.objects.create(
            client=self.tenant,
            name="Parent Account",
            customer_group=self.business_group,
            created_by=self.user,
            updated_by=self.user
        )
        
        child = Account.objects.create(
            client=self.tenant,
            name="Child Account",
            customer_group=self.business_group,
            parent_account=parent,
            created_by=self.user,
            updated_by=self.user
        )
        
        grandchild = Account.objects.create(
            client=self.tenant,
            name="Grandchild Account",
            customer_group=self.business_group,
            parent_account=child,
            created_by=self.user,
            updated_by=self.user
        )
        
        # Try to create a circular reference: grandchild -> parent
        parent.parent_account = grandchild
        
        with self.assertRaises(ValidationError):
            parent.full_clean()
    
    def test_branch_customer_group_inheritance(self):
        """Test that branch accounts must inherit customer group from parent."""
        # Create parent account with business group
        parent = Account.objects.create(
            client=self.tenant,
            name="Parent Account",
            customer_group=self.business_group,
            created_by=self.user,
            updated_by=self.user
        )
        
        # Try to create a child account with a different group
        child = Account(
            client=self.tenant,
            name="Child Account",
            customer_group=self.individual_group,  # Different from parent
            parent_account=parent,
            created_by=self.user,
            updated_by=self.user
        )
        
        with self.assertRaises(ValidationError):
            child.full_clean()
    
    def test_effective_customer_group_property(self):
        """Test the effective_customer_group property."""
        # Create parent account
        parent = Account.objects.create(
            client=self.tenant,
            name="Parent Account",
            customer_group=self.business_group,
            created_by=self.user,
            updated_by=self.user
        )
        
        # Create child account
        child = Account.objects.create(
            client=self.tenant,
            name="Child Account",
            customer_group=self.business_group,
            parent_account=parent,
            created_by=self.user,
            updated_by=self.user
        )
        
        # Create grandchild account
        grandchild = Account.objects.create(
            client=self.tenant,
            name="Grandchild Account",
            customer_group=self.business_group,
            parent_account=child,
            created_by=self.user,
            updated_by=self.user
        )
        
        # Test effective_customer_group for each account
        self.assertEqual(parent.effective_customer_group, self.business_group)
        self.assertEqual(child.effective_customer_group, self.business_group)
        self.assertEqual(grandchild.effective_customer_group, self.business_group)
        
        # Change parent's customer group and verify it propagates
        parent.customer_group = self.individual_group
        parent.save()
        
        # Need to refresh from database to clear cached_property
        child.refresh_from_db()
        grandchild.refresh_from_db()
        
        self.assertEqual(parent.effective_customer_group, self.individual_group)
        self.assertEqual(child.effective_customer_group, self.individual_group)
        self.assertEqual(grandchild.effective_customer_group, self.individual_group)
    
    def test_branch_with_own_tax_id(self):
        """Test that branch accounts can have their own tax ID."""
        # Create parent account
        parent = Account.objects.create(
            client=self.tenant,
            name="Parent Account",
            customer_group=self.business_group,
            tax_id="PARENT-TAX-ID",
            created_by=self.user,
            updated_by=self.user
        )
        
        # Create branch account with its own tax ID
        branch = Account.objects.create(
            client=self.tenant,
            name="Branch Account",
            customer_group=self.business_group,
            parent_account=parent,
            tax_id="BRANCH-TAX-ID",  # Different from parent
            created_by=self.user,
            updated_by=self.user
        )
        
        # Verify branch can have its own tax ID
        self.assertEqual(parent.tax_id, "PARENT-TAX-ID")
        self.assertEqual(branch.tax_id, "BRANCH-TAX-ID")
    
    def test_get_root_parent_method(self):
        """Test the get_root_parent method."""
        # Create a hierarchy: root -> parent -> child -> grandchild
        root = Account.objects.create(
            client=self.tenant,
            name="Root Account",
            customer_group=self.business_group,
            created_by=self.user,
            updated_by=self.user
        )
        
        parent = Account.objects.create(
            client=self.tenant,
            name="Parent Account",
            customer_group=self.business_group,
            parent_account=root,
            created_by=self.user,
            updated_by=self.user
        )
        
        child = Account.objects.create(
            client=self.tenant,
            name="Child Account",
            customer_group=self.business_group,
            parent_account=parent,
            created_by=self.user,
            updated_by=self.user
        )
        
        grandchild = Account.objects.create(
            client=self.tenant,
            name="Grandchild Account",
            customer_group=self.business_group,
            parent_account=child,
            created_by=self.user,
            updated_by=self.user
        )
        
        # Test get_root_parent for each account
        self.assertEqual(root.get_root_parent(), root)
        self.assertEqual(parent.get_root_parent(), root)
        self.assertEqual(child.get_root_parent(), root)
        self.assertEqual(grandchild.get_root_parent(), root)
    
    def test_string_representation(self):
        """Test the string representation of the model."""
        account = Account.objects.create(
            client=self.tenant,
            name="String Test Account",
            customer_group=self.business_group,
            created_by=self.user,
            updated_by=self.user
        )
        self.assertEqual(str(account), "String Test Account")


class TestContact(TestCase):
    """Test cases for the Contact model."""
    
    @classmethod
    def setUpTestData(cls):
        """Set up data for all test methods."""
        # Create a test tenant
        cls.tenant = Tenant.objects.create(
            name="Test Tenant",
            schema_name="test_tenant"
        )
        
        # Create a test user for audit fields
        cls.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpassword"
        )
        
        # Create test customer group
        cls.business_group = CustomerGroup.objects.create(
            client=cls.tenant,
            group_name="Business",
            group_type="BUSINESS",
            created_by=cls.user,
            updated_by=cls.user
        )
        
        # Create test account
        cls.account = Account.objects.create(
            client=cls.tenant,
            name="Test Account",
            customer_group=cls.business_group,
            created_by=cls.user,
            updated_by=cls.user
        )
    
    def test_create_contact_with_required_fields(self):
        """Test creating a contact with only required fields."""
        contact = Contact.objects.create(
            client=self.tenant,
            first_name="John",
            account=self.account,
            created_by=self.user,
            updated_by=self.user
        )
        
        # Verify the contact was created
        self.assertIsNotNone(contact.id)
        self.assertIsInstance(contact.id, uuid.UUID)
        
        # Verify the required fields were set correctly
        self.assertEqual(contact.first_name, "John")
        self.assertEqual(contact.account, self.account)
        self.assertEqual(contact.status, "Active")  # Default value
        
        # Verify the inherited fields
        self.assertEqual(contact.client, self.tenant)
        self.assertEqual(contact.created_by, self.user)
        self.assertEqual(contact.updated_by, self.user)
        self.assertIsNotNone(contact.created_at)
        self.assertIsNotNone(contact.updated_at)
    
    def test_optional_last_name(self):
        """Test handling of optional last_name field."""
        # Create contact with last_name
        contact_with_last_name = Contact.objects.create(
            client=self.tenant,
            first_name="John",
            last_name="Doe",
            account=self.account,
            created_by=self.user,
            updated_by=self.user
        )
        
        # Create contact without last_name
        contact_without_last_name = Contact.objects.create(
            client=self.tenant,
            first_name="Jane",
            account=self.account,
            created_by=self.user,
            updated_by=self.user
        )
        
        # Verify last_name handling
        self.assertEqual(contact_with_last_name.last_name, "Doe")
        self.assertIsNone(contact_without_last_name.last_name)
    
    def test_email_format_validation(self):
        """Test EmailField format validation (built-in)."""
        # Create contact with valid email
        contact_valid_email = Contact.objects.create(
            client=self.tenant,
            first_name="John",
            account=self.account,
            email="john.doe@example.com",
            created_by=self.user,
            updated_by=self.user
        )
        
        # Verify email was set correctly
        self.assertEqual(contact_valid_email.email, "john.doe@example.com")
        
        # Try to create contact with invalid email
        with self.assertRaises(ValidationError):
            contact_invalid_email = Contact(
                client=self.tenant,
                first_name="Jane",
                account=self.account,
                email="not-an-email",  # Invalid email format
                created_by=self.user,
                updated_by=self.user
            )
            contact_invalid_email.full_clean()
    
    def test_email_uniqueness_constraint(self):
        """Test uniqueness constraint for non-null email."""
        # Create first contact with email
        Contact.objects.create(
            client=self.tenant,
            first_name="John",
            account=self.account,
            email="unique@example.com",
            created_by=self.user,
            updated_by=self.user
        )
        
        # Try to create another contact with the same email
        with self.assertRaises(IntegrityError):
            Contact.objects.create(
                client=self.tenant,
                first_name="Jane",
                account=self.account,
                email="unique@example.com",  # Same email as first contact
                created_by=self.user,
                updated_by=self.user
            )
    
    def test_default_values(self):
        """Test correct default values for fields."""
        contact = Contact.objects.create(
            client=self.tenant,
            first_name="John",
            account=self.account,
            created_by=self.user,
            updated_by=self.user
        )
        
        # Verify default values
        self.assertEqual(contact.status, "Active")
        self.assertFalse(contact.email_opt_out)
        self.assertFalse(contact.do_not_call)
        self.assertFalse(contact.sms_opt_out)
    
    def test_full_name_property(self):
        """Test the full_name property logic."""
        # Contact with first and last name
        contact_full = Contact.objects.create(
            client=self.tenant,
            first_name="John",
            last_name="Doe",
            account=self.account,
            created_by=self.user,
            updated_by=self.user
        )
        
        # Contact with only first name
        contact_first_only = Contact.objects.create(
            client=self.tenant,
            first_name="Jane",
            account=self.account,
            created_by=self.user,
            updated_by=self.user
        )
        
        # Test full_name property
        self.assertEqual(contact_full.full_name, "John Doe")
        self.assertEqual(contact_first_only.full_name, "Jane")
    
    def test_string_representation(self):
        """Test the string representation of the model."""
        contact = Contact.objects.create(
            client=self.tenant,
            first_name="John",
            last_name="Doe",
            account=self.account,
            created_by=self.user,
            updated_by=self.user
        )
        
        # Verify __str__ method returns full_name
        self.assertEqual(str(contact), "John Doe")
    
    def test_cascade_deletion_behavior(self):
        """Test that deleting an Account cascades to its Contacts."""
        # Create a new account for this test
        test_account = Account.objects.create(
            client=self.tenant,
            name="Cascade Test Account",
            customer_group=self.business_group,
            created_by=self.user,
            updated_by=self.user
        )
        
        # Create a contact for this account
        contact = Contact.objects.create(
            client=self.tenant,
            first_name="Cascade",
            last_name="Test",
            account=test_account,
            created_by=self.user,
            updated_by=self.user
        )
        
        # Store the contact ID for later verification
        contact_id = contact.id
        
        # Verify the contact exists
        self.assertTrue(Contact.objects.filter(id=contact_id).exists())
        
        # Delete the account
        test_account.delete()
        
        # Verify the contact was also deleted (CASCADE)
        self.assertFalse(Contact.objects.filter(id=contact_id).exists())
    
    def test_custom_fields_json_storage(self):
        """Test that custom_fields correctly stores JSON data."""
        # Create a contact with custom fields
        test_data = {
            "preferred_contact_method_c": "Email",
            "birthday_c": "1980-01-01",
            "loyalty_tier_c": "Gold",
            "interests_c": ["Technology", "Sports", "Travel"],
            "lead_score_c": 85
        }
        
        contact = Contact.objects.create(
            client=self.tenant,
            first_name="Custom",
            last_name="Fields",
            account=self.account,
            custom_fields=test_data,
            created_by=self.user,
            updated_by=self.user
        )
        
        # Verify custom_fields data is stored correctly
        self.assertEqual(contact.custom_fields, test_data)
        
        # Update custom_fields with new data
        updated_data = {
            "preferred_contact_method_c": "Phone",
            "birthday_c": "1980-01-01",
            "loyalty_tier_c": "Platinum",
            "interests_c": ["Technology", "Music"],
            "lead_score_c": 95
        }
        
        contact.custom_fields = updated_data
        contact.save()
        
        # Refresh from database and verify updated data
        contact.refresh_from_db()
        self.assertEqual(contact.custom_fields, updated_data)


class TestAddress(TestCase):
    """Test cases for the Address model."""
    
    @classmethod
    def setUpTestData(cls):
        """Set up data for all test methods."""
        # Create a test tenant
        cls.tenant = Tenant.objects.create(
            name="Test Tenant",
            schema_name="test_tenant"
        )
        
        # Create a test user for audit fields
        cls.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpassword"
        )
        
        # Create a test customer group
        cls.customer_group = CustomerGroup.objects.create(
            client=cls.tenant,
            group_name="Test Group",
            group_type="BUSINESS",
            created_by=cls.user,
            updated_by=cls.user
        )
        
        # Create a test account
        cls.account = Account.objects.create(
            client=cls.tenant,
            name="Test Account",
            customer_group=cls.customer_group,
            created_by=cls.user,
            updated_by=cls.user
        )
    
    def test_create_address(self):
        """Test creating an address with valid data."""
        address = Address.objects.create(
            client=self.tenant,
            account=self.account,
            address_type="BILLING",
            street_1="123 Test Street",
            city="Test City",
            country="US",
            created_by=self.user,
            updated_by=self.user
        )
        
        # Verify the address was created
        self.assertIsNotNone(address.id)
        self.assertIsInstance(address.id, uuid.UUID)
        
        # Verify the fields were set correctly
        self.assertEqual(address.street_1, "123 Test Street")
        self.assertEqual(address.city, "Test City")
        self.assertEqual(address.country, "US")
        self.assertEqual(address.address_type, "BILLING")
        self.assertFalse(address.is_primary_billing)
        self.assertFalse(address.is_primary_shipping)
        
        # Verify the inherited fields
        self.assertEqual(address.client, self.tenant)
        self.assertEqual(address.account, self.account)
        self.assertEqual(address.created_by, self.user)
        self.assertEqual(address.updated_by, self.user)
        self.assertIsNotNone(address.created_at)
        self.assertIsNotNone(address.updated_at)
    
    def test_required_fields(self):
        """Test that required fields must be provided."""
        # Try to create an address without required fields
        address = Address(
            client=self.tenant,
            account=self.account,
            # Missing address_type
            street_1="123 Test Street",
            # Missing city
            # Missing country
            created_by=self.user,
            updated_by=self.user
        )
        
        # This should raise a validation error when full_clean is called
        with self.assertRaises(ValidationError):
            address.full_clean()
    
    def test_address_type_choices(self):
        """Test that address_type must be one of the defined choices."""
        # Create an address with a valid address_type
        address = Address.objects.create(
            client=self.tenant,
            account=self.account,
            address_type="SHIPPING",
            street_1="123 Test Street",
            city="Test City",
            country="US",
            created_by=self.user,
            updated_by=self.user
        )
        self.assertEqual(address.address_type, "SHIPPING")
        
        # Try to create an address with an invalid address_type
        invalid_address = Address(
            client=self.tenant,
            account=self.account,
            address_type="INVALID_TYPE",
            street_1="123 Test Street",
            city="Test City",
            country="US",
            created_by=self.user,
            updated_by=self.user
        )
        
        # This should raise a validation error when full_clean is called
        with self.assertRaises(ValidationError):
            invalid_address.full_clean()
    
    def test_default_primary_flag_values(self):
        """Test that primary flags default to False."""
        address = Address.objects.create(
            client=self.tenant,
            account=self.account,
            address_type="MAILING",
            street_1="123 Test Street",
            city="Test City",
            country="US",
            created_by=self.user,
            updated_by=self.user
        )
        self.assertFalse(address.is_primary_billing)
        self.assertFalse(address.is_primary_shipping)
    
    def test_foreign_key_relationship(self):
        """Test the foreign key relationship with Account."""
        address = Address.objects.create(
            client=self.tenant,
            account=self.account,
            address_type="BRANCH",
            street_1="123 Test Street",
            city="Test City",
            country="US",
            created_by=self.user,
            updated_by=self.user
        )
        
        # Verify the relationship with Account
        self.assertEqual(address.account, self.account)
        self.assertIn(address, self.account.addresses.all())
    
    def test_string_representation(self):
        """Test the string representation of the model."""
        address = Address.objects.create(
            client=self.tenant,
            account=self.account,
            address_type="OTHER",
            street_1="123 Test Street",
            city="Test City",
            country="US",
            created_by=self.user,
            updated_by=self.user
        )
        self.assertEqual(str(address), "123 Test Street, Test City (Other)")
    
    def test_cascade_deletion_behavior(self):
        """Test that deleting an Account cascades to its Addresses."""
        # Create a new account for this test
        test_account = Account.objects.create(
            client=self.tenant,
            name="Cascade Test Account",
            customer_group=self.customer_group,
            created_by=self.user,
            updated_by=self.user
        )
        
        # Create an address for this account
        address = Address.objects.create(
            client=self.tenant,
            account=test_account,
            address_type="BILLING",
            street_1="456 Cascade Street",
            city="Cascade City",
            country="US",
            created_by=self.user,
            updated_by=self.user
        )
        
        # Store the address ID for later verification
        address_id = address.id
        
        # Verify the address exists
        self.assertTrue(Address.objects.filter(id=address_id).exists())
        
        # Delete the account
        test_account.delete()
        
        # Verify the address was also deleted (CASCADE)
        self.assertFalse(Address.objects.filter(id=address_id).exists())
