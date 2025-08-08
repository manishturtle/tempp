from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers
from .views import (
    FulfillmentLocationViewSet,
    AdjustmentReasonViewSet,
    InventoryViewSet,
    InventoryAdjustmentViewSet,
    SerializedInventoryViewSet,
    LotViewSet,
    InventoryImportView,
    AdjustmentTypeView
)

# Define app_name for namespace
app_name = 'inventory'

# Create a top-level router
router = DefaultRouter()
router.register(r'fulfillment-locations', FulfillmentLocationViewSet, basename='fulfillmentlocation')
router.register(r'adjustment-reasons', AdjustmentReasonViewSet, basename='adjustmentreason')
router.register(r'inventory', InventoryViewSet, basename='inventory')
router.register(r'adjustments', InventoryAdjustmentViewSet, basename='inventoryadjustment')
router.register(r'serialized', SerializedInventoryViewSet, basename='serializedinventory')
router.register(r'lots', LotViewSet, basename='lot')

# Create a nested router for inventory-related routes
inventory_router = routers.NestedDefaultRouter(router, r'inventory', lookup='inventory')

urlpatterns = [
    path('', include(router.urls)),
    path('', include(inventory_router.urls)),
    path('import/', InventoryImportView.as_view(), name='inventory-import'),
    path('adjustment-types/', AdjustmentTypeView.as_view(), name='adjustment-types'),
]
