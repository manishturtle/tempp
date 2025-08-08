"""
URL configurations for shared models API.

These URL patterns define the API endpoints for accessing shared models.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CountryViewSet, CurrencyViewSet, CountryListRawViewSet

# Create a router and register our viewsets
router = DefaultRouter()
router.register(r'countries', CountryViewSet, basename='country')
router.register(r'currencies', CurrencyViewSet, basename='currency')
router.register(r'country-list-raw', CountryListRawViewSet, basename='country-list-raw')

# The API URLs are determined automatically by the router
urlpatterns = [
    path('', include(router.urls)),
]
