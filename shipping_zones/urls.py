from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create a router for our API endpoints
router = DefaultRouter()

# Pincode Master API
router.register(r'pincodes', views.PincodeMasterViewSet, basename='pincode')

# Shipping Zone API
router.register(r'zones', views.ShippingZoneViewSet, basename='shipping-zone')

# The API URLs are now determined automatically by the router
urlpatterns = [
    path('', include(router.urls)),
]