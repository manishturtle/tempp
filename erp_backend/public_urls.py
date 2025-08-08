"""
URL configuration for the public schema.

This file defines URL patterns for the public schema, which is used for tenant signups
and other public-facing functionality.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

# Public schema URL patterns
urlpatterns = [
    path('admin/', admin.site.urls),
    # Add tenant management views here
    # path('tenants/', include('tenants.urls')),
    
    # API endpoints for shared data (available in public schema)
    path('api/v1/shared/', include('shared.urls')),
]

# Serve static and media files in development
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
