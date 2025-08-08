"""
URL configuration for the tenants app.

This module defines URL patterns for tenant-related functionality such as tenant settings.
"""
from django.urls import path
from .views import TenantSettingView

urlpatterns = [
    path('settings/tenant/', TenantSettingView.as_view(), name='tenant-settings'),
]
