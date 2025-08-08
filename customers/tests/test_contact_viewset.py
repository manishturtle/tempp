"""
Unit tests for the Contact viewset.

This module contains unit tests for the ContactViewSet that don't rely on
database operations, focusing on request handling and response formatting.
"""
from unittest import TestCase
from unittest.mock import Mock, patch
from rest_framework.test import APIRequestFactory
from rest_framework.request import Request

from customers.views import ContactViewSet
from customers.serializers import ContactSerializer


class ContactViewSetTests(TestCase):
    """Test cases for the ContactViewSet."""
    
    def setUp(self):
        """Set up test data."""
        self.factory = APIRequestFactory()
        self.view = ContactViewSet()
        
        # Mock user
        self.user = Mock()
        self.user.id = '123e4567-e89b-12d3-a456-426614174002'
        self.user.has_perm.return_value = True
        
        # Mock request
        self.request = self.factory.get('/api/v1/contacts/')
        self.request.user = self.user
        self.request.tenant = Mock()
        self.request.tenant.id = 1
        
        # Set up the view with the request
        self.view.request = Request(self.request)
        self.view.format_kwarg = None
    
    def test_queryset_optimization(self):
        """Test that the queryset is optimized with select_related."""
        queryset = self.view.get_queryset()
        
        # Check that the queryset uses select_related
        self.assertTrue(hasattr(queryset, 'query'))
        self.assertTrue(hasattr(queryset.query, 'select_related'))
        
        # Check that account and owner are included in select_related
        select_related = queryset.query.select_related
        self.assertIn('account', select_related)
        self.assertIn('owner', select_related)
    
    def test_serializer_class(self):
        """Test that the serializer class is ContactSerializer."""
        self.assertEqual(self.view.serializer_class, ContactSerializer)
    
    def test_filter_backends(self):
        """Test that filter backends are configured."""
        # Check that filter backends are configured
        self.assertTrue(len(self.view.filter_backends) > 0)
    
    def test_filterset_fields(self):
        """Test that filterset fields are configured."""
        # Check that filterset fields include expected fields
        self.assertIn('status', self.view.filterset_fields)
        self.assertIn('account', self.view.filterset_fields)
        self.assertIn('owner', self.view.filterset_fields)
        self.assertIn('email_opt_out', self.view.filterset_fields)
        self.assertIn('do_not_call', self.view.filterset_fields)
        self.assertIn('sms_opt_out', self.view.filterset_fields)
    
    def test_search_fields(self):
        """Test that search fields are configured."""
        # Check that search fields include expected fields
        self.assertIn('first_name', self.view.search_fields)
        self.assertIn('last_name', self.view.search_fields)
        self.assertIn('email', self.view.search_fields)
        self.assertIn('account__name', self.view.search_fields)
    
    def test_ordering_fields(self):
        """Test that ordering fields are configured."""
        # Check that ordering fields include expected fields
        self.assertIn('first_name', self.view.ordering_fields)
        self.assertIn('last_name', self.view.ordering_fields)
        self.assertIn('email', self.view.ordering_fields)
        self.assertIn('created_at', self.view.ordering_fields)
        self.assertIn('status', self.view.ordering_fields)
    
    def test_default_ordering(self):
        """Test that default ordering is configured."""
        # Check that default ordering is configured
        self.assertEqual(self.view.ordering, ['last_name', 'first_name'])
    
    @patch('customers.views.ContactViewSet.get_serializer')
    def test_perform_create(self, mock_get_serializer):
        """Test perform_create method."""
        # Set up mock serializer
        mock_serializer = Mock()
        mock_get_serializer.return_value = mock_serializer
        
        # Call perform_create
        self.view.perform_create(mock_serializer)
        
        # Check that serializer.save was called with expected arguments
        mock_serializer.save.assert_called_once()
        call_kwargs = mock_serializer.save.call_args[1]
        self.assertEqual(call_kwargs['client_id'], 1)
        self.assertEqual(call_kwargs['created_by'], self.user)
        self.assertEqual(call_kwargs['updated_by'], self.user)
    
    @patch('customers.views.ContactViewSet.get_serializer')
    def test_perform_update(self, mock_get_serializer):
        """Test perform_update method."""
        # Set up mock serializer
        mock_serializer = Mock()
        mock_get_serializer.return_value = mock_serializer
        
        # Call perform_update
        self.view.perform_update(mock_serializer)
        
        # Check that serializer.save was called with expected arguments
        mock_serializer.save.assert_called_once()
        call_kwargs = mock_serializer.save.call_args[1]
        self.assertEqual(call_kwargs['updated_by'], self.user)
    
    def test_check_permissions_create(self):
        """Test check_permissions method for create action."""
        # Set up the view with create action
        self.view.action = 'create'
        
        # Mock user permissions
        self.user.has_perm.return_value = True
        
        # Check that no exception is raised
        self.view.check_permissions(self.request)
        
        # Check that has_perm was called with expected arguments
        self.user.has_perm.assert_called_with('customers.add_contact')
    
    def test_check_permissions_update(self):
        """Test check_permissions method for update action."""
        # Set up the view with update action
        self.view.action = 'update'
        
        # Mock user permissions
        self.user.has_perm.return_value = True
        
        # Check that no exception is raised
        self.view.check_permissions(self.request)
        
        # Check that has_perm was called with expected arguments
        self.user.has_perm.assert_called_with('customers.change_contact')
    
    def test_check_permissions_destroy(self):
        """Test check_permissions method for destroy action."""
        # Set up the view with destroy action
        self.view.action = 'destroy'
        
        # Mock user permissions
        self.user.has_perm.return_value = True
        
        # Check that no exception is raised
        self.view.check_permissions(self.request)
        
        # Check that has_perm was called with expected arguments
        self.user.has_perm.assert_called_with('customers.delete_contact')
