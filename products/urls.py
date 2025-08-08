from django.urls import path, include, re_path
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers
from products.views import (
    ProductViewSet, ProductImageViewSet,
    ProductVariantViewSet, KitComponentViewSet,
    GcsTestView
)

# Create a router for product endpoints
product_router = DefaultRouter()
product_router.register(r'products', ProductViewSet, basename='product')

# Create nested routers for product-related resources
products_nested_router = routers.NestedDefaultRouter(product_router, r'products', lookup='product')
products_nested_router.register(r'images', ProductImageViewSet, basename='product-image')
products_nested_router.register(r'variants', ProductVariantViewSet, basename='product-variant')
products_nested_router.register(r'kit-components', KitComponentViewSet, basename='product-kitcomponent')

# The URL patterns include both the router URLs and any custom views
urlpatterns = [
    # Include the router URLs - these will handle products/ patterns
    path('', include(product_router.urls)),
    path('', include(products_nested_router.urls)),
    
    # Other product-related URLs
    path('catalogue/', include('products.catalogue.urls')),
    path('test-gcs/', GcsTestView.as_view({'get': 'test_gcs'}), name='test-gcs'),
]
