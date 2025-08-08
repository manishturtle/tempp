from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DivisionViewSet, CategoryViewSet, SubcategoryViewSet, UnitOfMeasureViewSet, ProductStatusViewSet, DeleteImageView, ActiveDivisionHierarchyView ,CategoryCustomerGroupSellingChannelsView

# Create a router for API viewsets
router = DefaultRouter()
router.register(r'divisions', DivisionViewSet, basename='division')
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'subcategories', SubcategoryViewSet, basename='subcategory')
router.register(r'units-of-measure', UnitOfMeasureViewSet, basename='unit-of-measure')
router.register(r'product-statuses', ProductStatusViewSet, basename='product-status')

# URL patterns for the catalogue app
urlpatterns = [
    # Include the router URLs
    path('', include(router.urls)),
    # Add the delete-image endpoint
    path('delete-image/', DeleteImageView.as_view(), name='delete-image'),
    # Add the active-division-hierarchy endpoint
    path('active-division-hierarchy/', ActiveDivisionHierarchyView.as_view(), name='active-division-hierarchy'),
    # Add the category-customer-group-selling-channels endpoint
    path('exclusions-channels/', CategoryCustomerGroupSellingChannelsView.as_view(), name='category-customer-group-selling-channels'),
]
