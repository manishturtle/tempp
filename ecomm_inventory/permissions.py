"""
Custom permissions for ecomm_inventory app.
"""
from rest_framework import permissions

class IsTenantAdmin(permissions.BasePermission):
    """
    Custom permission to allow tenant users to access.
    Any authenticated user within the tenant can access all operations.
    This is appropriate for multi-tenant applications where tenant isolation
    is handled at the database level.
    """
    
    def has_permission(self, request, view):
        """
        Check if the user is authenticated within the tenant.
        All authenticated users can perform all operations within their tenant.
        """
        # Always require authentication
        return bool(request.user and request.user.is_authenticated)
