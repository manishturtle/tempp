"""
Unit tests for core models.

This module contains tests for the models defined in the core app,
focusing on validation, constraints, and business logic.
"""
import uuid
import json
import pytest
from django.db import models
from django.test import TestCase
from django.contrib.auth import get_user_model
from tenants.models import Tenant
from core.models import BaseTenantModel
from customers.models import Account, Contact, CustomerGroup

User = get_user_model()


# Create a concrete model that inherits from BaseTenantModel for testing
class TestModel(BaseTenantModel):
    """A concrete model for testing BaseTenantModel functionality."""
    name = models.CharField(max_length=100)
    
    class Meta:
        app_label = 'core'
        # This ensures the model is only used for testing and not created in the database
        managed = False


class TestBaseTenantModel(TestCase):
    """Test cases for the BaseTenantModel."""
    
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
    
    def test_custom_fields_attribute_exists(self):
        """Test that the custom_fields attribute exists on BaseTenantModel instances."""
        # Create a test model instance
        test_model = TestModel(
            client=self.tenant,
            name="Test Model",
            created_by=self.user,
            updated_by=self.user
        )
        
        # Verify that the custom_fields attribute exists
        self.assertTrue(hasattr(test_model, 'custom_fields'))
    
    def test_custom_fields_default_value(self):
        """Test that the default value of custom_fields is an empty dictionary."""
        # Create a test model instance without specifying custom_fields
        test_model = TestModel(
            client=self.tenant,
            name="Test Model",
            created_by=self.user,
            updated_by=self.user
        )
        
        # Verify that the default value is an empty dictionary
        self.assertEqual(test_model.custom_fields, {})
    
    def test_custom_fields_stores_json_data(self):
        """Test that the custom_fields field correctly stores JSON dictionary data."""
        # Create a test model instance with custom_fields data
        test_data = {
            "internal_rating_c": "Hot",
            "legacy_system_id_c": 12345,
            "is_preferred_c": True,
            "last_contact_date_c": "2025-04-16"
        }
        
        test_model = TestModel(
            client=self.tenant,
            name="Test Model",
            custom_fields=test_data,
            created_by=self.user,
            updated_by=self.user
        )
        
        # Verify that the custom_fields data is stored correctly
        self.assertEqual(test_model.custom_fields, test_data)
    
    def test_custom_fields_null_and_blank(self):
        """Test that the blank=True and null=True constraints are respected."""
        # Create a test model instance with null custom_fields
        test_model_null = TestModel(
            client=self.tenant,
            name="Test Model Null",
            custom_fields=None,
            created_by=self.user,
            updated_by=self.user
        )
        
        # Create a test model instance with empty custom_fields
        test_model_empty = TestModel(
            client=self.tenant,
            name="Test Model Empty",
            custom_fields={},
            created_by=self.user,
            updated_by=self.user
        )
        
        # Verify that null and empty values are accepted
        self.assertIsNone(test_model_null.custom_fields)
        self.assertEqual(test_model_empty.custom_fields, {})


class TestCustomFieldsInheritance(TestCase):
    """Test cases for models inheriting from BaseTenantModel."""
    
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
    
    def test_account_has_custom_fields(self):
        """Test that Account model has the custom_fields attribute."""
        # Create a test account
        account = Account.objects.create(
            client=self.tenant,
            name="Test Account",
            customer_group=self.business_group,
            created_by=self.user,
            updated_by=self.user
        )
        
        # Verify that the custom_fields attribute exists and has the default value
        self.assertTrue(hasattr(account, 'custom_fields'))
        self.assertEqual(account.custom_fields, {})
        
        # Update custom_fields with test data
        test_data = {
            "industry_segment_c": "Technology",
            "annual_revenue_c": 1000000,
            "is_strategic_c": True
        }
        account.custom_fields = test_data
        account.save()
        
        # Refresh from database and verify data is stored correctly
        account.refresh_from_db()
        self.assertEqual(account.custom_fields, test_data)
    
    def test_contact_has_custom_fields(self):
        """Test that Contact model has the custom_fields attribute."""
        # Create a test account
        account = Account.objects.create(
            client=self.tenant,
            name="Test Account",
            customer_group=self.business_group,
            created_by=self.user,
            updated_by=self.user
        )
        
        # Create a test contact
        contact = Contact.objects.create(
            client=self.tenant,
            first_name="John",
            last_name="Doe",
            account=account,
            created_by=self.user,
            updated_by=self.user
        )
        
        # Verify that the custom_fields attribute exists and has the default value
        self.assertTrue(hasattr(contact, 'custom_fields'))
        self.assertEqual(contact.custom_fields, {})
        
        # Update custom_fields with test data
        test_data = {
            "preferred_contact_method_c": "Email",
            "birthday_c": "1980-01-01",
            "loyalty_tier_c": "Gold"
        }
        contact.custom_fields = test_data
        contact.save()
        
        # Refresh from database and verify data is stored correctly
        contact.refresh_from_db()
        self.assertEqual(contact.custom_fields, test_data)
