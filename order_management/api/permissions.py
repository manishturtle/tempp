"""
Custom permissions for Order Management API.

This module contains permission classes specific to the Order Management API.
These permissions enforce access control based on tenant context and user roles.
"""
from typing import Any, Optional

from rest_framework import permissions
from rest_framework.request import Request
from rest_framework.views import APIView

from order_management.integrations import customer_service


class IsTenantUser(permissions.BasePermission):
    """
    Permission to only allow users from the same tenant to access objects.
    
    This permission is designed for multi-tenant environments where each tenant
    should only have access to their own data.
    """
    
    def has_permission(self, request: Request, view: APIView) -> bool:
        """
        Check if the user has permission to access the view.
        
        Args:
            request: The request being made
            view: The view being accessed
            
        Returns:
            True if the user has permission, False otherwise
        """
        # For now, allow all authenticated users
        # In a real multi-tenant environment, we would check if the user
        # belongs to the tenant specified in the request
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request: Request, view: APIView, obj: Any) -> bool:
        """
        Check if the user has permission to access the object.
        
        Args:
            request: The request being made
            view: The view being accessed
            obj: The object being accessed
            
        Returns:
            True if the user has permission, False otherwise
        """
        # For now, allow all authenticated users
        # In a real multi-tenant environment, we would check if the object
        # belongs to the same tenant as the user
        return request.user and request.user.is_authenticated


class IsTenantAdminUser(permissions.BasePermission):
    """
    Permission to only allow Tenant Administrators to access the view.
    
    This permission checks if the user has the 'tenant_admin' role in their
    authentication claims, which indicates they have tenant-wide administrative
    privileges.
    """
    message = 'Only Tenant Administrators have permission to perform this action.'
    
    def has_permission(self, request: Request, view: APIView) -> bool:
        """
        Check if the user is a Tenant Administrator.
        
        Args:
            request: The request object
            view: The view object
            
        Returns:
            True if the user is a Tenant Administrator, False otherwise
        """
        # Check if user is authenticated
        if not request.user or not request.user.is_authenticated:
            return False
            
        # Access claims from the authenticated user context
        claims = getattr(request, 'auth_claims', None)
        if not isinstance(claims, dict):
            return False
            
        # Check for tenant admin role
        # Adjust the key and value based on your Auth Microservice's JWT structure
        user_role = claims.get('role')
        if user_role == 'tenant_admin':
            return True
            
        # Check if role is in a list of roles
        roles = claims.get('roles', [])
        if isinstance(roles, list) and 'tenant_admin' in roles:
            return True
            
        # Additional scope-based check if needed
        scopes = claims.get('scope', '')
        if isinstance(scopes, str) and 'tenant:admin' in scopes.split():
            return True
            
        return False


class IsCustomerAdminPermission(permissions.BasePermission):
    """
    Permission to only allow Customer Admins to access the view.
    
    This permission checks if the user has the 'Admin' role within their
    B2B/Gov customer account context.
    """
    
    def has_permission(self, request: Request, view: APIView) -> bool:
        """
        Check if the user is a Customer Admin.
        
        Args:
            request: The request object
            view: The view object
            
        Returns:
            True if the user is a Customer Admin, False otherwise
        """
        user_id = getattr(request, 'auth_user_id', None)
        client_id = getattr(request, 'auth_tenant_id', None)
        
        if not user_id or not client_id:
            return False
            
        role = customer_service.get_contact_person_role(
            user_id=user_id, 
            client_id=client_id
        )
        
        return role == 'Admin'
