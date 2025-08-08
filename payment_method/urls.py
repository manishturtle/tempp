"""
URL configuration for the payment_method app.

This module defines the API endpoints for managing payment methods,
including online gateways, bank transfers, and various offline payment methods.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PaymentMethodViewSet, StorePaymentMethodViewSet

# Create a router and register our viewsets with it.
router = DefaultRouter(trailing_slash=False)
router.register(r'payment-methods', PaymentMethodViewSet, basename='payment-method')
router.register(r'store-payment-methods', StorePaymentMethodViewSet, basename='store-payment-method')

# The API URLs are now determined automatically by the router.
urlpatterns = [
    path('', include(router.urls)),
]
