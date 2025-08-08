"""
URL configuration for the pricing app.

This module defines URL patterns for the pricing app's API endpoints.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CustomerGroupViewSet, SellingChannelViewSet,
    TaxRateViewSet, TaxRateProfileViewSet
)

# Create a router and register our viewsets with it
router = DefaultRouter()
router.register(r'customer-groups', CustomerGroupViewSet, basename='customer-group')
router.register(r'selling-channels', SellingChannelViewSet, basename='selling-channel')
router.register(r'tax-rates', TaxRateViewSet, basename='tax-rate')
router.register(r'tax-rate-profiles', TaxRateProfileViewSet, basename='tax-rate-profile')

# The API URLs are determined automatically by the router
urlpatterns = [
    path('', include(router.urls)),
]
