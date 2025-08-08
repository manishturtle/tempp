"""
Tests for customer group inheritance in AccountSerializer.

This module contains tests for the customer group inheritance functionality
in the AccountSerializer, ensuring that child accounts properly inherit
their customer group from their parent's effective customer group.
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIRequestFactory

from customers.models import CustomerGroup, Account
from customers.serializers import AccountSerializer
from tenants.models import Tenant

User = get_user_model()


@pytest.mark.django_db
class TestAccountGroupInheritance:
    """Test cases for customer group inheritance in AccountSerializer."""
    
    @pytest.fixture
    def setup_data(self):
        """Set up test data for account group inheritance tests."""
        # Create tenant
        tenant = Tenant.objects.create(
            name="Test Tenant",
            schema_name="test_tenant"
        )
        
        # Create user
        user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpassword"
        )
        
        # Create customer groups
        group1 = CustomerGroup.objects.create(
            client=tenant,
            group_name="Group 1",
            group_type="BUSINESS",
            created_by=user,
            updated_by=user
        )
        
        group2 = CustomerGroup.objects.create(
            client=tenant,
            group_name="Group 2",
            group_type="BUSINESS",
            created_by=user,
            updated_by=user
        )
        
        # Create a root account
        root_account = Account.objects.create(
            client=tenant,
            name="Root Account",
            customer_group=group1,
            created_by=user,
            updated_by=user
        )
        
        # Create a factory for request context
        factory = APIRequestFactory()
        request = factory.get('/')
        request.user = user
        request.tenant_id = tenant.id
        
        return {
            'tenant': tenant,
            'user': user,
            'group1': group1,
            'group2': group2,
            'root_account': root_account,
            'request': request
        }
    
    def test_create_child_account_inherits_parent_group(self, setup_data):
        """Test that a child account inherits its parent's customer group during creation."""
        # Arrange
        data = setup_data
        
        # Create serializer with context
        serializer = AccountSerializer(
            data={
                'name': 'Child Account',
                'parent_account_id': data['root_account'].id,
                # Intentionally set a different group to verify it gets overridden
                'customer_group_id': data['group2'].id
            },
            context={'request': data['request']}
        )
        
        # Act
        is_valid = serializer.is_valid()
        
        # Assert
        assert is_valid, f"Serializer validation failed: {serializer.errors}"
        
        # Create the account
        child_account = serializer.save(
            created_by=data['user'],
            updated_by=data['user']
        )
        
        # Verify the child account's customer group matches the parent's group
        assert child_account.customer_group.id == data['root_account'].customer_group.id
        assert child_account.customer_group.id != data['group2'].id
    
    def test_create_top_level_account_requires_group(self, setup_data):
        """Test that creating a top-level account requires a customer group."""
        # Arrange
        data = setup_data
        
        # Create serializer with context but without customer_group
        serializer = AccountSerializer(
            data={
                'name': 'New Top Level Account',
                # No customer_group_id provided
            },
            context={'request': data['request']}
        )
        
        # Act & Assert
        with pytest.raises(ValidationError) as excinfo:
            serializer.is_valid(raise_exception=True)
        
        # Verify the error message
        assert 'customer_group' in str(excinfo.value)
        assert 'required for top-level accounts' in str(excinfo.value)
    
    def test_update_account_to_have_parent_inherits_group(self, setup_data):
        """Test that updating an account to have a parent inherits the parent's group."""
        # Arrange
        data = setup_data
        
        # Create an independent account with group2
        independent_account = Account.objects.create(
            client=data['tenant'],
            name="Independent Account",
            customer_group=data['group2'],
            created_by=data['user'],
            updated_by=data['user']
        )
        
        # Create serializer for update
        serializer = AccountSerializer(
            instance=independent_account,
            data={
                'parent_account_id': data['root_account'].id,
                # Keep the original group, but it should be overridden
                'customer_group_id': data['group2'].id
            },
            context={'request': data['request']},
            partial=True
        )
        
        # Act
        is_valid = serializer.is_valid()
        
        # Assert
        assert is_valid, f"Serializer validation failed: {serializer.errors}"
        
        # Update the account
        updated_account = serializer.save()
        
        # Verify the account's customer group has been updated to match the parent's
        assert updated_account.customer_group.id == data['root_account'].customer_group.id
        assert updated_account.customer_group.id != data['group2'].id
    
    def test_update_parent_account_updates_child_group(self, setup_data):
        """Test that updating a parent account's group is reflected in the child's effective group."""
        # Arrange
        data = setup_data
        
        # Create a child account
        child_account = Account.objects.create(
            client=data['tenant'],
            name="Child Account",
            parent_account=data['root_account'],
            customer_group=data['root_account'].customer_group,  # Same as parent
            created_by=data['user'],
            updated_by=data['user']
        )
        
        # Create serializer to update the parent's group
        serializer = AccountSerializer(
            instance=data['root_account'],
            data={
                'customer_group_id': data['group2'].id
            },
            context={'request': data['request']},
            partial=True
        )
        
        # Act
        is_valid = serializer.is_valid()
        
        # Assert
        assert is_valid, f"Serializer validation failed: {serializer.errors}"
        
        # Update the parent account
        updated_parent = serializer.save()
        
        # Refresh the child account from the database
        child_account.refresh_from_db()
        
        # Verify the parent's group has been updated
        assert updated_parent.customer_group.id == data['group2'].id
        
        # The child's direct customer_group field won't change automatically,
        # but its effective_customer_group property should reflect the parent's group
        assert child_account.effective_customer_group.id == data['group2'].id
    
    def test_remove_parent_requires_group(self, setup_data):
        """Test that removing a parent link requires a customer group."""
        # Arrange
        data = setup_data
        
        # Create a child account
        child_account = Account.objects.create(
            client=data['tenant'],
            name="Child Account",
            parent_account=data['root_account'],
            customer_group=data['root_account'].customer_group,  # Same as parent
            created_by=data['user'],
            updated_by=data['user']
        )
        
        # Create serializer to remove the parent link without specifying a group
        serializer = AccountSerializer(
            instance=child_account,
            data={
                'parent_account': None,
                # No customer_group_id provided
            },
            context={'request': data['request']},
            partial=True
        )
        
        # Act
        is_valid = serializer.is_valid()
        
        # Assert - the serializer should keep the existing group
        assert is_valid, f"Serializer validation failed: {serializer.errors}"
        
        # Update the account
        updated_account = serializer.save()
        
        # Verify the parent link has been removed
        assert updated_account.parent_account is None
        
        # Verify the account still has its original customer group
        assert updated_account.customer_group.id == data['root_account'].customer_group.id
    
    def test_invalid_parent_account_raises_error(self, setup_data):
        """Test that specifying an invalid parent account raises an error."""
        # Arrange
        data = setup_data
        
        # Create serializer with non-existent parent ID
        serializer = AccountSerializer(
            data={
                'name': 'Child Account',
                'parent_account_id': 999999,  # Non-existent ID
            },
            context={'request': data['request']}
        )
        
        # Act & Assert
        with pytest.raises(ValidationError) as excinfo:
            serializer.is_valid(raise_exception=True)
        
        # Verify the error message
        assert 'parent_account' in str(excinfo.value)
        assert 'Invalid Parent Account' in str(excinfo.value)
