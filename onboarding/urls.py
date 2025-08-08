"""
URL configuration for the onboarding app.
"""

from django.urls import path
from .views import OnboardingTriggerView, TenantConfigurationStatusView

app_name = 'onboarding'

urlpatterns = [
    path('trigger/', OnboardingTriggerView.as_view(), name='onboarding-trigger'),
    path('tenant-configuration-status/', TenantConfigurationStatusView.as_view(), name='tenant-configuration-status'),
]
