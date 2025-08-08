"""
URL configuration for the attributes app.

This module defines URL patterns for the attributes app's API endpoints.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AttributeGroupViewSet, AttributeViewSet, AttributeOptionViewSet

# Create a router and register our viewsets with it
router = DefaultRouter()
router.register(r'groups', AttributeGroupViewSet, basename='attribute-group')
router.register(r'attributes', AttributeViewSet, basename='attribute')
router.register(r'options', AttributeOptionViewSet, basename='attribute-option')

# The API URLs are determined automatically by the router
urlpatterns = [
    path('', include(router.urls)),
]
