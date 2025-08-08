"""
Core views and viewsets for the API.

This module provides base views and viewsets that can be used throughout the application.
"""
from django.shortcuts import render
from django.http import JsonResponse
from rest_framework import viewsets, permissions
from django.contrib.auth import get_user_model

User = get_user_model()


def health_check(request):
    """
    Basic health check endpoint to verify server is running.
    """
    return JsonResponse({
        'status': 'ok',
        'message': 'Server is running'
    })


class BaseTenantViewSet(viewsets.ModelViewSet):
    """
    Base ModelViewSet for tenant-specific models.
    
    This viewset relies on the default authentication and permission classes
    from settings.py. It also relies on the multi-tenancy middleware for
    automatic tenant query scoping via request.tenant.
    
    Note: Role-Based Access Control (RBAC) permissions will be added later
    on a per-action basis as needed.
    """
    
    def get_queryset(self):
        """
        Filter the queryset to only include objects belonging to the current tenant.
        
        This method relies on the multi-tenancy middleware to set request.tenant.
        """
        queryset = super().get_queryset()
        
        # Filter by tenant - this will be enabled once multi-tenancy middleware is fully implemented
        # return queryset.filter(client=self.request.tenant)
        
        # For now, return all objects without tenant filtering
        return queryset
    
    def perform_create(self, serializer):
        """
        Automatically assign the current tenant and user when creating objects.
        """
        # This will be updated once multi-tenancy middleware is fully implemented
        # serializer.save(client=self.request.tenant, created_by=self.request.user, updated_by=self.request.user)
        
        # For now, use a default tenant and user
        default_user = User.objects.first()
        serializer.save(
            client_id=1,  # Default tenant ID for Phase 1
            created_by=default_user,
            updated_by=default_user
        )
    
    def perform_update(self, serializer):
        """
        Update the updated_by field with the current user.
        """
        # This will be updated once multi-tenancy middleware is fully implemented
        # serializer.save(updated_by=self.request.user)
        
        # For now, use a default user
        default_user = User.objects.first()
        serializer.save(updated_by=default_user)
