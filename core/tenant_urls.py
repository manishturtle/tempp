"""
URL configuration for tenant-specific API endpoints.

This module defines the URL patterns for tenant-specific API endpoints,
which are mounted under the /api/v1/ path.
"""

from django.urls import path, include

urlpatterns = [
    # Include products app URLs
    path('api/v1/', include('products.urls')),
    
    # Include attributes app URLs
    path('api/v1/products/', include('attributes.urls')),
    
    # Include assets app URLs
    path('api/v1/assets/', include('assets.urls')),
    
    # Add other tenant-specific app URLs here
]
