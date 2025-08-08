from django.shortcuts import render
from rest_framework import viewsets, permissions, filters, mixins, status
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import MultiPartParser, FormParser
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework import serializers
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import action
from rest_framework.views import APIView
from django.db import transaction
from django.db.models import F, ExpressionWrapper, fields
from django.utils import timezone
from django.db import connection
from erp_backend.middleware import CustomJWTAuthentication ,TenantSchemaMiddleware
from rest_framework.permissions import IsAuthenticated
from .permissions import IsTenantAdmin
from rest_framework import permissions

from .models import (
    FulfillmentLocation,
    AdjustmentReason,
    Inventory,
    InventoryAdjustment,
    SerializedInventory,
    Lot,
    AdjustmentType
)
from .serializers import (
    FulfillmentLocationSerializer,
    AdjustmentReasonSerializer,
    InventorySerializer,
    InventoryAdjustmentSerializer,
    InventoryAdjustmentCreateSerializer,
    SerializedInventorySerializer,
    LotSerializer,
    LotCreateSerializer,
    InventoryImportSerializer
)
from .filters import InventoryFilter, SerializedInventoryFilter, LotFilter
from rest_framework.parsers import MultiPartParser, FormParser
from .tasks import process_inventory_import
from celery.result import AsyncResult
from datetime import datetime
from .services import update_serialized_status, reserve_serialized_item, ship_serialized_item, receive_serialized_item, find_available_serial_for_reservation

# Create your views here.

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 100

# Base class for tenant-aware viewsets
class TenantAwareViewSet(viewsets.ModelViewSet):
    """
    Base viewset that ensures all operations are tenant-aware.
    This class ensures that data is properly isolated per tenant.
    """
    
    def dispatch(self, request, *args, **kwargs):
        """
        Override dispatch to ensure tables exist before processing any request.
        """
        # Get the model class for this viewset
        model_class = self.get_serializer_class().Meta.model
        
        # If the model inherits from BaseTenantModel, ensure its table exists
        if hasattr(model_class, 'create_table_if_not_exists'):
            # Log the attempt to create table
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"Checking if table exists for model {model_class.__name__}")
            
            # Create the table if it doesn't exist
            table_created = model_class.create_table_if_not_exists()
            logger.info(f"Table creation result for {model_class.__name__}: {table_created}")
        
        # Continue with normal dispatch
        return super().dispatch(request, *args, **kwargs)
    
    def get_queryset(self):
        """
        Return queryset for the current tenant.
        The tenant context is set by the TenantRoutingMiddleware.
        """
        # Get the base queryset from the parent class
        queryset = super().get_queryset()
        
        # Log current tenant context for debugging
        if hasattr(self.request, 'tenant_slug'):
            print(f"Fetching data for tenant: {self.request.tenant_slug}")
        
        # No need to do any schema-specific filtering since Django Tenants handles this
        # automatically by setting the connection.schema_name
        return queryset
    
    def perform_create(self, serializer):
        """
        Perform create operation in the context of the current tenant.
        For now, we're using public schema so we'll set a default client_id.
        """
        # Set created_by and updated_by to the current user
        if hasattr(self.request, 'user') and self.request.user.is_authenticated:
            serializer.validated_data['created_by'] = self.request.user.id
            serializer.validated_data['updated_by'] = self.request.user.id
        
        # Save the object
        serializer.save()
    
    def perform_update(self, serializer):
        """
        Perform update operation in the context of the current tenant.
        """
        # Check if we have tenant information in the request
        tenant_slug = self.request.tenant_slug if hasattr(self.request, 'tenant_slug') else None
        
        # Log the tenant context for debugging
        print(f"Updating object in tenant: {tenant_slug}, schema: {connection.schema_name}")
        
        # Save the object directly to the tenant's schema
        serializer.save()
    
    def perform_destroy(self, instance):
        """
        Perform destroy operation in the context of the current tenant.
        """
        # Check if we have tenant information in the request
        tenant_slug = self.request.tenant_slug if hasattr(self.request, 'tenant_slug') else None
        
        # Log the tenant context for debugging
        print(f"Deleting object in tenant: {tenant_slug}, schema: {connection.schema_name}")
        
        # Delete the object directly from the tenant's schema
        instance.delete()

    def create(self, request, *args, **kwargs):
        """
        Create a new object with proper response formatting.
        """
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(
                {
                    "status": "success",
                    "message": "Object created successfully",
                    "data": serializer.data
                },
                status=status.HTTP_201_CREATED,
                headers=headers
            )
        except DRFValidationError as e:
            return Response(
                {
                    "status": "error",
                    "message": "Validation error",
                    "errors": e.detail
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {
                    "status": "error",
                    "message": str(e),
                    "errors": [str(e)]
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def update(self, request, *args, **kwargs):
        """
        Update an existing object with proper response formatting.
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        try:
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            return Response(
                {
                    "status": "success",
                    "message": "Object updated successfully",
                    "data": serializer.data
                },
                status=status.HTTP_200_OK
            )
        except DRFValidationError as e:
            return Response(
                {
                    "status": "error",
                    "message": "Validation error",
                    "errors": e.detail
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {
                    "status": "error",
                    "message": str(e),
                    "errors": [str(e)]
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def destroy(self, request, *args, **kwargs):
        """
        Delete an object with proper response formatting.
        """
        instance = self.get_object()
        try:
            self.perform_destroy(instance)
            return Response(
                {
                    "status": "success",
                    "message": "Object deleted successfully"
                },
                status=status.HTTP_204_NO_CONTENT
            )
        except DRFValidationError as e:
            return Response(
                {
                    "status": "error",
                    "message": "Cannot delete object",
                    "errors": e.detail
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {
                    "status": "error",
                    "message": str(e),
                    "errors": [str(e)]
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class FulfillmentLocationViewSet(TenantAwareViewSet):
    """
    API endpoint that allows Fulfillment Locations to be viewed or edited.
    
    list:
    Return a paginated list of all fulfillment locations for the current tenant.
    Results can be filtered by location_type, is_active, and country_code.
    
    create:
    Create a new fulfillment location for the current tenant.
    All address fields (except address_line_2) are required if any address field is provided.
    
    retrieve:
    Return the details of a specific fulfillment location.
    
    update:
    Update all fields of a specific fulfillment location.
    
    partial_update:
    Update one or more fields of a specific fulfillment location.
    
    destroy:
    Delete a specific fulfillment location.
    Note: This may be restricted if the location has associated inventory.
    """
    serializer_class = FulfillmentLocationSerializer
    permission_classes = [IsAuthenticated, IsTenantAdmin]
    authentication_classes = [CustomJWTAuthentication]
    pagination_class = StandardResultsSetPagination
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter
    ]
    filterset_fields = ['location_type', 'is_active', 'country_code']
    search_fields = ['name', 'city', 'state_province', 'country_code']
    ordering_fields = ['name', 'created_at', 'location_type']
    ordering = ['name']

    def get_queryset(self):
        """
        Return all locations for the current tenant.
        django-tenants handles tenant filtering automatically.
        """
        return FulfillmentLocation.objects.all()

    def perform_create(self, serializer):
        """
        Perform create operation in the context of the current tenant.
        For now, we're using public schema so we'll set a default client_id.
        """
        # Set created_by and updated_by to the current user
        if hasattr(self.request, 'user') and self.request.user.is_authenticated:
            serializer.validated_data['created_by'] = self.request.user.id
            serializer.validated_data['updated_by'] = self.request.user.id
        
        # Get the next available ID
        last_location = FulfillmentLocation.objects.order_by('-id').first()
        next_id = 1 if not last_location else last_location.id + 1
        serializer.validated_data['id'] = next_id
        
        # Save the object
        serializer.save()

    def perform_update(self, serializer):
        """
        Perform update operation in the context of the current tenant.
        Set updated_by to the current user and ensure client_id is preserved.
        """
        # Set updated_by to the current user if authenticated
        if hasattr(self.request, 'user') and self.request.user.is_authenticated:
            serializer.validated_data['updated_by'] = self.request.user.id
            
        # Ensure client_id is preserved from the instance
        instance = serializer.instance
        if instance and hasattr(instance, 'client_id') and 'client_id' not in serializer.validated_data:
            serializer.validated_data['client_id'] = instance.client_id
            
        # Save the updated object
        serializer.save()
    
    def perform_destroy(self, instance):
        """
        Override destroy to check if location has associated inventory.
        """
        if instance.inventory_set.exists():
            raise serializers.ValidationError(
                "Cannot delete location with existing inventory. "
                "Please transfer or remove inventory first."
            )
        instance.delete()

    def create(self, request, *args, **kwargs):
        """
        Create a new fulfillment location with proper response formatting.
        """
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(
                {
                    "status": "success",
                    "message": "Fulfillment location created successfully",
                    "data": serializer.data
                },
                status=status.HTTP_201_CREATED,
                headers=headers
            )
        except DRFValidationError as e:
            # Handle duplicate name error specifically
            if 'name' in e.detail and 'already exists' in str(e.detail['name']):
                return Response(
                    {
                        "status": "error",
                        "message": f"Location with name '{request.data.get('name')}' already exists",
                        "errors": e.detail
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            # Handle other validation errors
            return Response(
                {
                    "status": "error",
                    "message": "Validation error in fulfillment location data",
                    "errors": e.detail
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            # Handle database constraint violations
            if isinstance(e, DjangoValidationError) and 'duplicate key value' in str(e):
                return Response(
                    {
                        "status": "error",
                        "message": f"Location with name '{request.data.get('name')}' already exists",
                        "errors": [str(e)]
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            # Handle other exceptions
            return Response(
                {
                    "status": "error",
                    "message": "Failed to create fulfillment location",
                    "errors": [str(e)]
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def update(self, request, *args, **kwargs):
        """
        Update an existing fulfillment location with proper response formatting.
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        try:
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            return Response(
                {
                    "status": "success",
                    "message": "Fulfillment location updated successfully",
                    "data": serializer.data
                },
                status=status.HTTP_200_OK
            )
        except DRFValidationError as e:
            return Response(
                {
                    "status": "error",
                    "message": "Validation error in fulfillment location update",
                    "errors": e.detail
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {
                    "status": "error",
                    "message": "Failed to update fulfillment location",
                    "errors": [str(e)]
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def destroy(self, request, *args, **kwargs):
        """
        Delete a fulfillment location with proper response formatting.
        """
        instance = self.get_object()
        try:
            self.perform_destroy(instance)
            return Response(
                {
                    "status": "success",
                    "message": "Fulfillment location deleted successfully"
                },
                status=status.HTTP_204_NO_CONTENT
            )
        except DRFValidationError as e:
            return Response(
                {
                    "status": "error",
                    "message": "Cannot delete fulfillment location",
                    "errors": e.detail
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {
                    "status": "error",
                    "message": "Failed to delete fulfillment location",
                    "errors": [str(e)]
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class AdjustmentReasonViewSet(TenantAwareViewSet):
    """
    API endpoint for managing Inventory Adjustment Reasons.
    
    list:
    Return a paginated list of all adjustment reasons for the current tenant.
    Results can be filtered by is_active status.
    
    create:
    Create a new adjustment reason for the current tenant.
    Name must be unique and descriptive.
    
    retrieve:
    Return the details of a specific adjustment reason.
    
    update:
    Update all fields of a specific adjustment reason.
    
    partial_update:
    Update one or more fields of a specific adjustment reason.
    
    destroy:
    Delete a specific adjustment reason.
    Note: This may be restricted if the reason has been used in adjustments.
    """
    queryset = AdjustmentReason.objects.all()
    serializer_class = AdjustmentReasonSerializer
    permission_classes = [IsAuthenticated, IsTenantAdmin]
    authentication_classes = [CustomJWTAuthentication]
    
    def perform_update(self, serializer):
        """
        Perform update operation in the context of the current tenant.
        Set updated_by to the current user and ensure client_id is preserved.
        """
        # Set updated_by to the current user if authenticated
        if hasattr(self.request, 'user') and self.request.user.is_authenticated:
            serializer.validated_data['updated_by'] = self.request.user.id
            
        # Ensure client_id is preserved from the instance
        instance = serializer.instance
        if instance and hasattr(instance, 'client_id') and 'client_id' not in serializer.validated_data:
            serializer.validated_data['client_id'] = instance.client_id
            
        # Save the updated object
        serializer.save()
    pagination_class = StandardResultsSetPagination
    filter_backends = [
            DjangoFilterBackend,
            filters.SearchFilter,
            filters.OrderingFilter
        ]
    filterset_fields = ['is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    # No need for get_queryset method as TenantViewMixin handles tenant filtering

    def perform_destroy(self, instance):
        """
        Override destroy to check if reason has been used in adjustments.
        """
        # Check if this reason has been used in any adjustments
        if instance.adjustments.exists():
            raise serializers.ValidationError(
                "Cannot delete reason that has been used in adjustments. Consider marking it as inactive instead."
            )
        instance.delete()

    def create(self, request, *args, **kwargs):
        """
        Create a new adjustment reason with proper response formatting.
        """
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
            
            # Set created_by and updated_by to the current user
            if hasattr(self.request, 'user') and self.request.user.is_authenticated:
                serializer.validated_data['created_by'] = self.request.user.id
                serializer.validated_data['updated_by'] = self.request.user.id
            
            # Get the next available ID
            last_reason = AdjustmentReason.objects.order_by('-id').first()
            next_id = 1 if not last_reason else last_reason.id + 1
            serializer.validated_data['id'] = next_id
            
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(
                {
                    "status": "success",
                    "message": "Adjustment reason created successfully",
                    "data": serializer.data
                },
                status=status.HTTP_201_CREATED,
                headers=headers
            )
        except DRFValidationError as e:
            # Handle duplicate name error specifically
            if 'name' in e.detail and 'already exists' in str(e.detail['name']):
                return Response(
                    {
                        "status": "error",
                        "message": f"Adjustment reason with name '{request.data.get('name')}' already exists",
                        "errors": e.detail
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            # Handle other validation errors
            return Response(
                {
                    "status": "error",
                    "message": "Validation error in adjustment reason data",
                    "errors": e.detail
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            # Handle database constraint violations
            if isinstance(e, DjangoValidationError) and 'duplicate key value' in str(e):
                return Response(
                    {
                        "status": "error",
                        "message": f"Adjustment reason with name '{request.data.get('name')}' already exists",
                        "errors": [str(e)]
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            # Handle other exceptions
            return Response(
                {
                    "status": "error",
                    "message": "Failed to create adjustment reason",
                    "errors": [str(e)]
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def update(self, request, *args, **kwargs):
        """
        Update an existing adjustment reason with proper response formatting.
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        try:
            serializer.is_valid(raise_exception=True)
            
            # Set updated_by to the current user
            if hasattr(self.request, 'user') and self.request.user.is_authenticated:
                serializer.validated_data['updated_by'] = self.request.user.id
            
            self.perform_update(serializer)
            return Response(
                {
                    "status": "success",
                    "message": "Adjustment reason updated successfully",
                    "data": serializer.data
                },
                status=status.HTTP_200_OK
            )
        except DRFValidationError as e:
            return Response(
                {
                    "status": "error",
                    "message": "Validation error in adjustment reason update",
                    "errors": e.detail
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {
                    "status": "error",
                    "message": "Failed to update adjustment reason",
                    "errors": [str(e)]
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def destroy(self, request, *args, **kwargs):
        """
        Delete an adjustment reason with proper response formatting.
        """
        instance = self.get_object()
        try:
            # Check if reason has been used in adjustments
            if instance.inventoryadjustment_set.exists():
                return Response(
                    {
                        "status": "error",
                        "message": "Cannot delete adjustment reason as it has been used in inventory adjustments",
                        "errors": ["This reason has been used in inventory adjustments. Please archive it instead."]
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            self.perform_destroy(instance)
            return Response(
                {
                    "status": "success",
                    "message": "Adjustment reason deleted successfully"
                },
                status=status.HTTP_204_NO_CONTENT
            )
        except DRFValidationError as e:
            return Response(
                {
                    "status": "error",
                    "message": "Cannot delete adjustment reason",
                    "errors": e.detail
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {
                    "status": "error",
                    "message": "Failed to delete adjustment reason",
                    "errors": [str(e)]
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class InventoryViewSet(TenantAwareViewSet):
    """
    API endpoint for managing Inventory levels.
    
    list:
    Return a paginated list of all inventory records.
    Results can be filtered by product, location, stock status, etc.
    
    create:
    Create a new inventory record.
    Requires product, location, and stock quantities.
    
    retrieve:
    Return the details of a specific inventory record.
    
    update:
    Update all fields of a specific inventory record.
    
    partial_update:
    Update one or more fields of a specific inventory record.
    
    destroy:
    Delete a specific inventory record.
    
    Filtering Options:
    - Product: SKU, name, active status
    - Location: ID, type
    - Stock Status: In stock, out of stock, low stock
    - Quantities: Min/max stock, has backorders, has reserved
    
    Searching:
    - Product SKU, name
    - Location name
    
    Ordering:
    - Product: SKU, name
    - Location name
    - Stock quantities
    - Last updated
    - Available to promise
    
    Custom Actions:
    - POST /api/v1/inventory/add_inventory/ - Add inventory with adjustment record
    - GET /api/v1/inventory/{id}/lots/ - List all lots for this inventory
    - POST /api/v1/inventory/{id}/add-lot/ - Add quantity to a lot
    - POST /api/v1/inventory/{id}/consume-lot/ - Consume quantity from lots
    - POST /api/v1/inventory/{id}/reserve-lot/ - Reserve quantity from lots
    - POST /api/v1/inventory/{id}/release-lot-reservation/ - Release reserved lot quantity
    """
    serializer_class = InventorySerializer
    # permission_classes = [IsAuthenticated]
    authentication_classes = [TenantSchemaMiddleware]
    permission_classes = [permissions.AllowAny]
    # authentication_classes = [CustomJWTAuthentication]
    pagination_class = StandardResultsSetPagination
    filter_backends = [
            DjangoFilterBackend,
            filters.SearchFilter,
            filters.OrderingFilter
        ]
    filterset_class = InventoryFilter
    search_fields = ['product__sku', 'product__name', 'location__name']
    ordering_fields = [
            'product__sku', 'product__name', 'location__name',
            'stock_quantity', 'reserved_quantity', 'last_updated',
            'available_to_promise', 'updated_at', '-updated_at',
            'created_at', '-created_at'
        ]
    ordering = ['-updated_at']  # Default to most recently updated first
    
    def get_queryset(self):
        """
        Return all inventory records for the current tenant.
        django-tenants handles tenant filtering automatically.
        
        Annotate the queryset with calculated fields to avoid property setter errors.
        """
        queryset = Inventory.objects.all()
        
        # Apply select_related for nested serializers
        queryset = queryset.select_related('product', 'location')
        
        # Handle custom ordering from query params
        ordering = self.request.query_params.get('ordering', None)
        if ordering == 'updated_at' or ordering == '-updated_at':
            # Use the actual updated_at field from the model
            return queryset.order_by(ordering)
            
        return queryset
        
        return queryset
        
    @action(detail=False, methods=['post'])
    def add_inventory(self, request, tenant_slug=None, **kwargs):
        """
        Add inventory quantity with adjustment record.
        
        Required Fields:
          * product_id: ID of the product
          * location_id: ID of the fulfillment location
          * stock_quantity: Quantity to add
          * adjustment_reason_id: ID of the adjustment reason
        Optional Fields:
          * serial_number: Required for serialized products
          * notes: Additional notes about the adjustment
          * reserved_quantity: Quantity reserved for orders
          * non_saleable_quantity: Quantity not available for sale
          * on_order_quantity: Quantity on purchase orders
          * in_transit_quantity: Quantity in transit
          * returned_quantity: Quantity returned
          * hold_quantity: Quantity on hold
          * backorder_quantity: Quantity backordered
          * low_stock_threshold: Threshold for low stock alert
          * reorder_point: Point to trigger reorder
          * reorder_quantity: Quantity to reorder
        """
        # Get required fields from request
        product_id = request.data.get('product_id')
        location_id = request.data.get('location_id')
        stock_quantity = request.data.get('stock_quantity')
        adjustment_reason_id = request.data.get('adjustment_reason_id')
        serial_number = request.data.get('serial_number')
        notes = request.data.get('notes', '')
        
        # Get optional inventory parameters from request
        reserved_quantity = request.data.get('reserved_quantity', 0)
        non_saleable_quantity = request.data.get('non_saleable_quantity', 0)
        on_order_quantity = request.data.get('on_order_quantity', 0)
        in_transit_quantity = request.data.get('in_transit_quantity', 0)
        returned_quantity = request.data.get('returned_quantity', 0)
        hold_quantity = request.data.get('hold_quantity', 0)
        backorder_quantity = request.data.get('backorder_quantity', 0)
        low_stock_threshold = request.data.get('low_stock_threshold', 5)
        reorder_point = request.data.get('reorder_point', 10)
        reorder_quantity = request.data.get('reorder_quantity', 20)
        
        # Validate required fields
        if not all([product_id, location_id, stock_quantity, adjustment_reason_id]):
            return Response(
                {
                    "status": "error",
                    "message": "Missing required fields",
                    "errors": {
                        "required_fields": ["product_id", "location_id", "stock_quantity", "adjustment_reason_id"]
                    }
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Convert stock_quantity to integer
            stock_quantity = int(stock_quantity)
            if stock_quantity <= 0:
                return Response(
                    {
                        "status": "error",
                        "message": "Invalid stock quantity",
                        "errors": {
                            "stock_quantity": ["Stock quantity must be a positive number"]
                        }
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if the product exists
            from products.models import Product
            try:
                product = Product.objects.get(id=product_id)
            except Product.DoesNotExist:
                return Response(
                    {
                        "status": "error",
                        "message": "Product not found",
                        "errors": {
                            "product_id": [f"Product with ID {product_id} does not exist"]
                        }
                    },
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Check if the location exists
            try:
                location = FulfillmentLocation.objects.get(id=location_id)
            except FulfillmentLocation.DoesNotExist:
                return Response(
                    {
                        "status": "error",
                        "message": "Location not found",
                        "errors": {
                            "location_id": [f"Location with ID {location_id} does not exist"]
                        }
                    },
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Check if the adjustment reason exists or create it
            try:
                reason = AdjustmentReason.objects.get(id=adjustment_reason_id)
            except AdjustmentReason.DoesNotExist:
                try:
                    reason = AdjustmentReason.objects.create(
                        id=adjustment_reason_id,
                        name="Initial Stock",
                        description="Initial inventory receipt",
                        is_active=True,
                        client_id=1,
                        company_id=1
                    )
                except Exception as e:
                    return Response(
                        {
                            "status": "error",
                            "message": "Failed to create adjustment reason",
                            "errors": {
                                "adjustment_reason_id": [str(e)]
                            }
                        },
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
            
            # Check if the product is serialized and requires a serial number
            if product.is_serialized and not serial_number:
                return Response(
                    {
                        "status": "error",
                        "message": "Serial number required",
                        "errors": {
                            "serial_number": ["Serial number is required for ADD adjustment on serialized products"]
                        }
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Use Django ORM to create or update inventory record
            try:
                with transaction.atomic():
                    print("Creating inventory record for product", product.id)
                    
                    # Reset sequences before creating records
                    from django.db import connection
                    with connection.cursor() as cursor:
                        # Reset Inventory sequence
                        cursor.execute("""
                            SELECT setval('ecomm_inventory_inventory_id_seq', 
                            COALESCE((SELECT MAX(id) FROM ecomm_inventory_inventory), 1));
                        """)
                        
                        # Reset InventoryAdjustment sequence
                        cursor.execute("""
                            SELECT setval('ecomm_inventory_inventoryadjustment_id_seq', 
                            COALESCE((SELECT MAX(id) FROM ecomm_inventory_inventoryadjustment), 1));
                        """)
                    
                    # Create inventory record with values from request
                    inventory = Inventory.objects.create(
                        product=product,
                        location=location,
                        stock_quantity=stock_quantity,
                        reserved_quantity=reserved_quantity,
                        non_saleable_quantity=non_saleable_quantity,
                        on_order_quantity=on_order_quantity,
                        in_transit_quantity=in_transit_quantity,
                        returned_quantity=returned_quantity,
                        hold_quantity=hold_quantity,
                        backorder_quantity=backorder_quantity,
                        low_stock_threshold=getattr(product, 'low_stock_threshold', 0),
                        reorder_point=getattr(product, 'reorder_point', 0),
                        reorder_quantity=getattr(product, 'reorder_quantity', 0),
                        client_id=tenant_id,  # Use extracted tenant_id
                        company_id=1,  # Set company_id explicitly
                        custom_fields={},
                        created_by=request.user.id if hasattr(request, 'user') else None,
                        updated_by=request.user.id if hasattr(request, 'user') else None
                    )
                    print("Inventory record created for product",inventory)
                    
                    # Create adjustment record with the same ID
                    adjustment = InventoryAdjustment.objects.create(
                        inventory=inventory,
                        adjustment_type='ADD',
                        quantity_change=stock_quantity,
                        reason=reason,
                        notes=notes,
                        new_stock_quantity=inventory.stock_quantity,
                        created_by=request.user.id if hasattr(request, 'user') else None,
                        updated_by=request.user.id if hasattr(request, 'user') else None,
                        client_id=tenant_id,  # Use extracted tenant_id
                        company_id=1   # Set company_id explicitly
                    )
                    
                    # Handle serialized inventory
                    serialized_inventory = None
                    if product.is_serialized:
                        try:
                            # Debug info
                            print(f"Creating serialized inventory for product {product.id} with serial {serial_number}")
                            print(f"Current tenant schema: {connection.schema_name}")
                            print(f"User ID: {request.user.id if hasattr(request, 'user') else None}")
                            print(f"Using tenant_id {tenant_id} for serialized inventory creation")
                            
                            serialized_inventory = SerializedInventory.objects.create(
                                product=product,
                                location=location,
                                inventory_record=inventory,
                                serial_number=serial_number,
                                status='AVAILABLE',
                                notes=notes,
                                client_id=tenant_id,  # Use tenant_id from request
                                company_id=1,  # Set company_id explicitly
                                created_by=request.user.id if hasattr(request, 'user') else None,
                                updated_by=request.user.id if hasattr(request, 'user') else None
                            )
                            print(f"Successfully created serialized inventory with ID {serialized_inventory.id}")
                        except Exception as e:
                            print(f"Error creating serialized inventory: {str(e)}")
                            # Continue without raising exception to avoid breaking the main flow
                            pass
                    
                    # Handle lot-tracked inventory
                    lot = None
                    if product.is_lotted:
                        try:
                            # Debug info
                            print(f"Creating lot-tracked inventory for product {product.id} with lot {request.data.get('lot_number')}")
                            print(f"Current tenant schema: {connection.schema_name}")
                            print(f"Using tenant_id {tenant_id} for lot-tracked inventory creation")
                            
                            lot = Lot.objects.create(
                                product=product,
                                location=location,
                                inventory_record=inventory,
                                lot_number=request.data.get('lot_number'),
                                expiry_date=request.data.get('expiry_date'),
                                quantity=stock_quantity,
                                status='AVAILABLE',
                                notes=notes,
                                client_id=tenant_id,  # Use tenant_id from request
                                company_id=1,  # Set company_id explicitly
                                created_by=request.user.id if hasattr(request, 'user') else None,
                                updated_by=request.user.id if hasattr(request, 'user') else None
                            )
                            print(f"Successfully created lot-tracked inventory with ID {lot.id}")
                        except Exception as e:
                            print(f"Error creating lot-tracked inventory: {str(e)}")
                            # Continue without raising exception to avoid breaking the main flow
                            pass
                    
                    return Response({
                        "status": "success",
                        "message": "Inventory added successfully",
                        "data": {
                            "inventory": {
                                "id": inventory.id,
                                "product_id": inventory.product_id,
                                "location_id": inventory.location_id,
                                "stock_quantity": inventory.stock_quantity,
                                "created_at": inventory.created_at,
                                "updated_at": inventory.updated_at
                            },
                            "adjustment": {
                                "id": adjustment.id,
                                "adjustment_type": "ADD",
                                "quantity_change": stock_quantity,
                                "new_stock_quantity": inventory.stock_quantity,
                                "created_at": adjustment.created_at
                            },
                            "serialized": {
                                "id": serialized_inventory.id if serialized_inventory else None,
                                "serial_number": serial_number if serialized_inventory else None,
                                "status": "AVAILABLE" if serialized_inventory else None
                            },
                            "lot": {
                                "id": lot.id if lot else None,
                                "lot_number": request.data.get('lot_number') if lot else None,
                                "expiry_date": request.data.get('expiry_date') if lot else None,
                                "status": "AVAILABLE" if lot else None
                            }
                        },
                        "meta": {
                            "inventory_id": inventory.id,
                            "adjustment_id": adjustment.id,
                            "operation": "add_inventory",
                            "is_serialized": product.is_serialized,
                            "is_lotted": product.is_lotted
                        }
                    }, status=status.HTTP_200_OK)
            
            except Exception as db_error:
                return Response(
                    {
                        "status": "error",
                        "message": "Database error occurred",
                        "errors": {
                            "database": [str(db_error)]
                        }
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
        except ValueError as ve:
            return Response(
                {
                    "status": "error",
                    "message": "Invalid input",
                    "errors": {
                        "stock_quantity": [str(ve)]
                    }
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {
                    "status": "error",
                    "message": "Failed to add inventory",
                    "errors": {
                        "details": [str(e)]
                    }
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def lots(self, request, pk=None):
        """
        List all lots for a specific inventory record.
        """
        from django.db import connection
        
        # Ensure we're using the inventory schema in the search path
        if hasattr(connection, 'inventory_schema') and hasattr(connection, 'schema_name'):
            with connection.cursor() as cur:
                cur.execute(f'SET search_path TO "{connection.inventory_schema}", "{connection.schema_name}", public')
        
        inventory = self.get_object()
        lots = Lot.objects.filter(inventory_record=inventory)
        
        # Apply filters if provided
        lot_filter = LotFilter(request.GET, queryset=lots)
        lots = lot_filter.qs
        
        # Apply pagination
        page = self.paginate_queryset(lots)
        if page is not None:
            serializer = LotSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = LotSerializer(lots, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_lot(self, request, pk=None):
        """
        Add quantity to a lot for this inventory.
        
        Required fields:
        - lot_number: The lot number to add to
        - quantity: The quantity to add
        - expiry_date: The expiry date for the lot (if new)
        - cost_price_per_unit: Optional cost price per unit
        """
        from django.db import connection
        
        # Ensure we're using the inventory schema in the search path
        if hasattr(connection, 'inventory_schema') and hasattr(connection, 'schema_name'):
            with connection.cursor() as cur:
                cur.execute(f'SET search_path TO "{connection.inventory_schema}", "{connection.schema_name}", public')
        
        inventory = self.get_object()
        
        # Validate input
        serializer = LotCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Extract data
        lot_number = serializer.validated_data.get('lot_number')
        quantity = serializer.validated_data.get('quantity')
        expiry_date = serializer.validated_data.get('expiry_date')
        cost_price_per_unit = serializer.validated_data.get('cost_price_per_unit')
        
        try:
            # Import here to avoid circular imports
            from .services import add_quantity_to_lot
            
            # Add quantity to lot
            lot = add_quantity_to_lot(
                inventory=inventory,
                lot_number=lot_number,
                quantity=quantity,
                expiry_date=expiry_date,
                cost_price_per_unit=cost_price_per_unit,
                user=request.user
            )
            
            return Response(
                LotSerializer(lot).data,
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def consume_lot(self, request, pk=None):
        """
        Consume quantity from lots for this inventory.
        
        Required fields:
        - quantity: The total quantity to consume
        - strategy: The lot selection strategy ('FEFO' or 'FIFO')
        - lot_number: Optional specific lot number to consume from
        """
        from django.db import connection
        
        # Ensure we're using the inventory schema in the search path
        if hasattr(connection, 'inventory_schema') and hasattr(connection, 'schema_name'):
            with connection.cursor() as cur:
                cur.execute(f'SET search_path TO "{connection.inventory_schema}", "{connection.schema_name}", public')
        
        inventory = self.get_object()
        
        # Validate input
        quantity = request.data.get('quantity')
        strategy = request.data.get('strategy', 'FEFO')  # Default to FEFO
        lot_number = request.data.get('lot_number')
        
        if not quantity or not isinstance(quantity, (int, float)) or quantity <= 0:
            return Response(
                {"detail": "A positive quantity is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Import here to avoid circular imports
            from .services import consume_quantity_from_lot
            
            # Consume quantity from lots
            consumed_lots = consume_quantity_from_lot(
                inventory=inventory,
                quantity=quantity,
                strategy=strategy,
                specific_lot_number=lot_number,
                user=request.user
            )
            
            return Response(
                LotSerializer(consumed_lots, many=True).data,
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def reserve_lot(self, request, pk=None):
        """
        Reserve quantity from lots for this inventory.
        
        Required fields:
        - quantity: The total quantity to reserve
        - strategy: The lot selection strategy ('FEFO' or 'FIFO')
        - lot_number: Optional specific lot number to reserve from
        """
        from django.db import connection
        
        # Ensure we're using the inventory schema in the search path
        if hasattr(connection, 'inventory_schema') and hasattr(connection, 'schema_name'):
            with connection.cursor() as cur:
                cur.execute(f'SET search_path TO "{connection.inventory_schema}", "{connection.schema_name}", public')
        
        inventory = self.get_object()
        
        # Validate input
        quantity = request.data.get('quantity')
        strategy = request.data.get('strategy', 'FEFO')  # Default to FEFO
        lot_number = request.data.get('lot_number')
        
        if not quantity or not isinstance(quantity, (int, float)) or quantity <= 0:
            return Response(
                {"detail": "A positive quantity is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Import here to avoid circular imports
            from .services import reserve_lot_quantity
            
            # Reserve quantity from lots
            reserved_lots = reserve_lot_quantity(
                inventory=inventory,
                quantity=quantity,
                strategy=strategy,
                specific_lot_number=lot_number,
                user=request.user
            )
            
            return Response(
                LotSerializer(reserved_lots, many=True).data,
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def release_lot_reservation(self, request, pk=None):
        """
        Release reserved quantity from lots for this inventory.
        
        Required fields:
        - quantity: The total quantity to release
        - lot_number: Optional specific lot number to release from
        """
        from django.db import connection
        
        # Ensure we're using the inventory schema in the search path
        if hasattr(connection, 'inventory_schema') and hasattr(connection, 'schema_name'):
            with connection.cursor() as cur:
                cur.execute(f'SET search_path TO "{connection.inventory_schema}", "{connection.schema_name}", public')
        
        inventory = self.get_object()
        
        # Validate input
        quantity = request.data.get('quantity')
        lot_number = request.data.get('lot_number')
        
        if not quantity or not isinstance(quantity, (int, float)) or quantity <= 0:
            return Response(
                {"detail": "A positive quantity is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Import here to avoid circular imports
            from .services import release_lot_reservation
            
            # Release reserved quantity
            released_lots = release_lot_reservation(
                inventory=inventory,
                quantity=quantity,
                specific_lot_number=lot_number,
                user=request.user
            )
            
            return Response(
                LotSerializer(released_lots, many=True).data,
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def create(self, request, *args, **kwargs):
        """
        Create a new inventory record with proper response formatting.
        """
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
            
            # Set created_by and updated_by to the current user
            if hasattr(self.request, 'user') and self.request.user.is_authenticated:
                serializer.validated_data['created_by'] = self.request.user.id
                serializer.validated_data['updated_by'] = self.request.user.id
            
            # Get the next available ID
            last_inventory = Inventory.objects.order_by('-id').first()
            next_id = 1 if not last_inventory else last_inventory.id + 1
            serializer.validated_data['id'] = next_id
            
            # Check if combination of product and location already exists
            if Inventory.objects.filter(
                product_id=serializer.validated_data['product'],
                location_id=serializer.validated_data['location']
            ).exists():
                return Response(
                    {
                        "status": "error",
                        "message": "Inventory record for this product and location already exists",
                        "errors": ["Cannot create duplicate inventory record for the same product and location"]
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Set client_id and company_id explicitly
            serializer.validated_data['client_id'] = 1
            serializer.validated_data['company_id'] = 1
            
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(
                {
                    "status": "success",
                    "message": "Inventory record created successfully",
                    "data": serializer.data
                },
                status=status.HTTP_201_CREATED,
                headers=headers
            )
        except DRFValidationError as e:
            return Response(
                {
                    "status": "error",
                    "message": "Validation error in inventory data",
                    "errors": e.detail
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {
                    "status": "error",
                    "message": "Failed to create inventory record",
                    "errors": [str(e)]
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def update(self, request, *args, **kwargs):
        """
        Update an existing inventory record with proper response formatting.
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        try:
            serializer.is_valid(raise_exception=True)
            
            # Set updated_by to the current user
            if hasattr(self.request, 'user') and self.request.user.is_authenticated:
                serializer.validated_data['updated_by'] = self.request.user.id
            
            # Check if updating product or location would create a duplicate
            if 'product' in serializer.validated_data or 'location' in serializer.validated_data:
                product_id = serializer.validated_data.get('product', instance.product_id)
                location_id = serializer.validated_data.get('location', instance.location_id)
                
                if Inventory.objects.filter(
                    product_id=product_id,
                    location_id=location_id
                ).exclude(id=instance.id).exists():
                    return Response(
                        {
                            "status": "error",
                            "message": "Cannot update to duplicate product and location combination",
                            "errors": ["An inventory record for this product and location already exists"]
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            self.perform_update(serializer)
            return Response(
                {
                    "status": "success",
                    "message": "Inventory record updated successfully",
                    "data": serializer.data
                },
                status=status.HTTP_200_OK
            )
        except DRFValidationError as e:
            return Response(
                {
                    "status": "error",
                    "message": "Validation error in inventory update",
                    "errors": e.detail
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {
                    "status": "error",
                    "message": "Failed to update inventory record",
                    "errors": [str(e)]
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def destroy(self, request, *args, **kwargs):
        """
        Delete an inventory record with proper response formatting.
        """
        instance = self.get_object()
        try:
            # Check if inventory has associated serialized items
            if SerializedInventory.objects.filter(
                product_id=instance.product_id,
                location_id=instance.location_id
            ).exists():
                return Response(
                    {
                        "status": "error",
                        "message": "Cannot delete inventory record with associated serialized items",
                        "errors": ["Please delete or transfer the serialized items first"]
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            self.perform_destroy(instance)
            return Response(
                {
                    "status": "success",
                    "message": "Inventory record deleted successfully"
                },
                status=status.HTTP_204_NO_CONTENT
            )
        except DRFValidationError as e:
            return Response(
                {
                    "status": "error",
                    "message": "Cannot delete inventory record",
                    "errors": e.detail
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {
                    "status": "error",
                    "message": "Failed to delete inventory record",
                    "errors": [str(e)]
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class InventoryAdjustmentViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing Inventory Adjustments.
    
    list:
    Return a paginated list of all inventory adjustments.
    
    create:
    Create a new inventory adjustment.
    
    retrieve:
    Return the details of a specific inventory adjustment.
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [CustomJWTAuthentication]
    pagination_class = StandardResultsSetPagination
    http_method_names = ['get', 'post', 'head']  # Allow GET, POST, and HEAD methods

    def get_serializer_class(self):
        """
        Use different serializers for different HTTP methods.
        Create uses InventoryAdjustmentCreateSerializer, others use InventoryAdjustmentSerializer.
        """
        if self.request.method == 'POST':
            return InventoryAdjustmentCreateSerializer
        return InventoryAdjustmentSerializer

    def get_queryset(self):
        """
        Return all inventory adjustments for the current tenant.
        """
        return InventoryAdjustment.objects.all()

    def perform_create(self, serializer):
        """
        Perform create operation for a new inventory adjustment.
        
        This method handles two scenarios:
        1. Using an existing inventory record (via inventory_id)
        2. Creating a new inventory record (via product_id + location_id)
        
        All operations are wrapped in a transaction to ensure data consistency.
        """
        try:
            with transaction.atomic():
                # Get values from validated data
                adjustment_type = serializer.validated_data.get('adjustment_type')
                quantity_change = serializer.validated_data.get('quantity_change')
                reason = serializer.validated_data.get('reason')
                notes = serializer.validated_data.get('notes', '')
                
                # Get or create the inventory record
                inventory = serializer.validated_data.get('inventory')
                
                # If inventory wasn't provided, create it using product_id and location_id
                if not inventory:
                    product = serializer.validated_data.get('product')
                    location = serializer.validated_data.get('location')
                    
                    # Check if inventory already exists for this product/location
                    try:
                        inventory = Inventory.objects.get(
                            product=product,
                            location=location
                        )
                    except Inventory.DoesNotExist:
                        # Create a new inventory record with zero quantities
                        inventory = Inventory.objects.create(
                            product=product,
                            location=location,
                            stock_quantity=0,
                            reserved_quantity=0,
                            non_saleable_quantity=0,
                            on_order_quantity=0,
                            in_transit_quantity=0,
                            returned_quantity=0,
                            hold_quantity=0,
                            backorder_quantity=0,
                            low_stock_threshold=getattr(product, 'low_stock_threshold', 0),
                            reorder_point=getattr(product, 'reorder_point', 0),
                            reorder_quantity=getattr(product, 'reorder_quantity', 0),
                            client_id=1,  # Set client_id explicitly
                            company_id=1,  # Set company_id explicitly
                            custom_fields={},
                            created_by=self.request.user.id if hasattr(self.request, 'user') else None,
                            updated_by=self.request.user.id if hasattr(self.request, 'user') else None
                        )
                
                # Handle serialized products
                serial_number = serializer.validated_data.get('serial_number')
                
                # Handle lotted products
                lot_number = serializer.validated_data.get('lot_number')
                expiry_date = serializer.validated_data.get('expiry_date')
                
                # Create the adjustment instance first
                adjustment = InventoryAdjustment(
                    inventory=inventory,
                    adjustment_type=adjustment_type,
                    quantity_change=quantity_change,
                    reason=reason,
                    notes=notes,
                    new_stock_quantity=inventory.stock_quantity + quantity_change,
                    created_by=self.request.user.id if hasattr(self.request, 'user') else None,
                    updated_by=self.request.user.id if hasattr(self.request, 'user') else None,
                    client_id=1,  # Set client_id explicitly
                    company_id=1   # Set company_id explicitly
                )
                adjustment.save()
                
                # Now perform the actual adjustment using direct inventory update logic
                # Update inventory quantities based on adjustment type
                if adjustment_type == 'ADD':
                    # For ADD, always use positive quantity
                    actual_change = abs(quantity_change)
                    inventory.stock_quantity += actual_change
                elif adjustment_type == 'SUB':
                    # For SUB, always use positive quantity (regardless of input sign)
                    actual_change = abs(quantity_change)
                    if inventory.stock_quantity < actual_change:
                        raise serializers.ValidationError("Insufficient stock for subtraction")
                    inventory.stock_quantity -= actual_change
                elif adjustment_type == 'RES':
                    # For reservations, increase reserved quantity
                    actual_change = abs(quantity_change)
                    if inventory.stock_quantity < actual_change:
                        raise serializers.ValidationError("Insufficient stock for reservation")
                    inventory.reserved_quantity += actual_change
                elif adjustment_type == 'REL_RES':
                    # For releasing reservations, decrease reserved quantity
                    actual_change = abs(quantity_change)
                    if inventory.reserved_quantity < actual_change:
                        raise serializers.ValidationError("Insufficient reserved quantity to release")
                    inventory.reserved_quantity -= actual_change
                elif adjustment_type == 'INIT':
                    # For initial stock, set the quantity directly
                    actual_change = abs(quantity_change)
                    inventory.stock_quantity = actual_change
                else:
                    # For other adjustment types, use the default behavior
                    actual_change = abs(quantity_change)
                    inventory.stock_quantity += actual_change
                
                # Save the updated inventory
                inventory.save()
                
                # Handle serialized products if needed
                if serial_number and inventory.product.is_serialized:
                    # For ADD adjustment type, create a new serialized inventory record
                    if adjustment_type == 'ADD':
                        # Check if this serial number already exists for this product
                        existing_serial = SerializedInventory.objects.filter(
                            serial_number=serial_number,
                            product=inventory.product
                        ).exists()
                        
                        if existing_serial:
                            raise serializers.ValidationError(f"Serial number '{serial_number}' already exists for this product")
            
                        # Create new serialized inventory record
                        SerializedInventory.objects.create(
                            inventory_record=inventory,
                            product=inventory.product,
                            location=inventory.location,
                            serial_number=serial_number,
                            status='IN_STOCK',
                            client_id=1,  # Set client_id explicitly
                            company_id=1,  # Set company_id explicitly
                            created_by=self.request.user.id if hasattr(self.request, 'user') else None,
                            updated_by=self.request.user.id if hasattr(self.request, 'user') else None
                        )
                    # For SUB adjustment type, update the serialized inventory record status
                    elif adjustment_type == 'SUB':
                        try:
                            serial_item = SerializedInventory.objects.get(
                                serial_number=serial_number,
                                product=inventory.product,
                                status='IN_STOCK'
                            )
                            serial_item.status = 'SOLD'
                            serial_item.save()
                        except SerializedInventory.DoesNotExist:
                            raise serializers.ValidationError(f"Serial number '{serial_number}' not found or not in stock")
                
                # # Handle lotted products if needed
                # if lot_number and inventory.product.is_lotted:
                #     # Logic for lotted products would go here
                #     pass
                
                # Handle lotted products if needed
                if lot_number and inventory.product.is_lotted:
                    # For ADD adjustment type, create or update a lot record
                    if adjustment_type == 'ADD':
                        # Check if this lot number already exists for this product/location
                        try:
                            existing_lot = Lot.objects.get(
                                lot_number=lot_number,
                                product=inventory.product,
                                location=inventory.location
                            )
                            # If lot exists, update its quantity
                            existing_lot.quantity += quantity_change
                            if expiry_date and not existing_lot.expiry_date:
                                existing_lot.expiry_date = expiry_date
                            existing_lot.updated_by = self.request.user.id if hasattr(self.request, 'user') else None
                            existing_lot.save()
                        except Lot.DoesNotExist:
                            # Create new lot record
                            Lot.objects.create(
                                inventory_record=inventory,
                                product=inventory.product,
                                location=inventory.location,
                                lot_number=lot_number,
                                quantity=quantity_change,
                                expiry_date=expiry_date,
                                status='AVAILABLE',
                                client_id=1,  # Set client_id explicitly
                                company_id=1,  # Set company_id explicitly
                                created_by=self.request.user.id if hasattr(self.request, 'user') else None,
                                updated_by=self.request.user.id if hasattr(self.request, 'user') else None
                            )
                    # For SUB adjustment type, decrease lot quantity
                    elif adjustment_type == 'SUB':
                        try:
                            lot_item = Lot.objects.get(
                                lot_number=lot_number,
                                product=inventory.product,
                                location=inventory.location
                            )
                            # Ensure there's enough quantity in the lot
                            if lot_item.quantity < quantity_change:
                                raise serializers.ValidationError(f"Insufficient quantity in lot '{lot_number}' for subtraction")
                            
                            # Update lot quantity
                            lot_item.quantity -= quantity_change
                            lot_item.updated_by = self.request.user.id if hasattr(self.request, 'user') else None
                            lot_item.save()
                            
                            # If quantity becomes zero, optionally mark as consumed or remove
                            if lot_item.quantity == 0:
                                lot_item.status = 'CONSUMED'
                                lot_item.save()
                        except Lot.DoesNotExist:
                            raise serializers.ValidationError(f"Lot number '{lot_number}' not found for this product/location")
                
                # Return the serialized data
                serializer = InventoryAdjustmentSerializer(adjustment)
                return serializer.data
                
        except Exception as e:
            raise serializers.ValidationError({
                'error': str(e)
            })

    def create(self, request, *args, **kwargs):
        """
        Create a new inventory adjustment with proper response formatting.
        """
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(
                {
                    "status": "success",
                    "message": "Inventory adjustment created successfully",
                    "data": serializer.data
                },
                status=status.HTTP_201_CREATED,
                headers=headers
            )
        except DRFValidationError as e:
            return Response(
                {
                    "status": "error",
                    "message": "Validation error in inventory adjustment data",
                    "errors": e.detail
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {
                    "status": "error",
                    "message": "Failed to create inventory adjustment",
                    "errors": [str(e)]
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class InventoryAdjustmentAPIView(APIView):
    """
    API endpoint for creating inventory adjustments.
    This view handles POST requests for inventory adjustments.
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [CustomJWTAuthentication]
    
    def post(self, request, *args, **kwargs):
        """
        Create a new inventory adjustment.
        
        This method handles two scenarios:
        1. Using an existing inventory record (via inventory_id)
        2. Creating a new inventory record (via product_id + location_id)
        
        All operations are wrapped in a transaction to ensure data consistency.
        """
        serializer = InventoryAdjustmentCreateSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                {
                    "status": "error",
                    "message": "Validation error in inventory adjustment",
                    "errors": serializer.errors
                },
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            with transaction.atomic():
                # Get values from validated data
                adjustment_type = serializer.validated_data.get('adjustment_type')
                quantity_change = serializer.validated_data.get('quantity_change')
                reason = serializer.validated_data.get('reason')
                notes = serializer.validated_data.get('notes', '')
                
                # Get or create the inventory record
                inventory = serializer.validated_data.get('inventory')
                
                # If inventory wasn't provided, create it using product_id and location_id
                if not inventory:
                    product = serializer.validated_data.get('product')
                    location = serializer.validated_data.get('location')
                    
                    # Check if inventory already exists for this product/location
                    try:
                        inventory = Inventory.objects.get(
                            product=product,
                            location=location
                        )
                    except Inventory.DoesNotExist:
                        # Create a new inventory record with zero quantities
                        inventory = Inventory.objects.create(
                            product=product,
                            location=location,
                            stock_quantity=0,
                            reserved_quantity=0,
                            non_saleable_quantity=0,
                            on_order_quantity=0,
                            in_transit_quantity=0,
                            returned_quantity=0,
                            hold_quantity=0,
                            backorder_quantity=0,
                            low_stock_threshold=getattr(product, 'low_stock_threshold', 0),
                            reorder_point=getattr(product, 'reorder_point', 0),
                            reorder_quantity=getattr(product, 'reorder_quantity', 0),
                            client_id=1,  # Set client_id explicitly
                            company_id=1,  # Set company_id explicitly
                            custom_fields={},
                            created_by=request.user.id if hasattr(request, 'user') else None,
                            updated_by=request.user.id if hasattr(request, 'user') else None
                        )
                
                # Handle serialized products
                serial_number = serializer.validated_data.get('serial_number')
                
                # Handle lotted products
                lot_number = serializer.validated_data.get('lot_number')
                expiry_date = serializer.validated_data.get('expiry_date')
                
                # Perform the adjustment using direct inventory update logic
                # Update inventory quantities based on adjustment type
                if adjustment_type == 'ADD':
                    # For ADD, always use positive quantity
                    actual_change = abs(quantity_change)
                    inventory.stock_quantity += actual_change
                elif adjustment_type == 'SUB':
                    # For SUB, always use positive quantity (regardless of input sign)
                    actual_change = abs(quantity_change)
                    if inventory.stock_quantity < actual_change:
                        raise serializers.ValidationError("Insufficient stock for subtraction")
                    inventory.stock_quantity -= actual_change
                elif adjustment_type == 'RES':
                    # For reservations, increase reserved quantity
                    actual_change = abs(quantity_change)
                    if inventory.stock_quantity < actual_change:
                        raise serializers.ValidationError("Insufficient stock for reservation")
                    inventory.reserved_quantity += actual_change
                elif adjustment_type == 'REL_RES':
                    # For releasing reservations, decrease reserved quantity
                    actual_change = abs(quantity_change)
                    if inventory.reserved_quantity < actual_change:
                        raise serializers.ValidationError("Insufficient reserved quantity to release")
                    inventory.reserved_quantity -= actual_change
                elif adjustment_type == 'INIT':
                    # For initial stock, set the quantity directly
                    actual_change = abs(quantity_change)
                    inventory.stock_quantity = actual_change
                else:
                    # For other adjustment types, use the default behavior
                    actual_change = abs(quantity_change)
                    inventory.stock_quantity += actual_change
                
                # Save the updated inventory
                inventory.save()
                
                # Handle serialized products if needed
                if serial_number and inventory.product.is_serialized:
                    # Logic for serialized products would go here
                    pass
                
                # Handle lotted products if needed
                if lot_number and inventory.product.is_lotted:
                    # Logic for lotted products would go here
                    pass
                
                # Create the adjustment instance
                adjustment = serializer.save(
                    inventory=inventory,
                    created_by=request.user.id,
                    updated_by=request.user.id
                )
                
                return Response(
                    {
                        "status": "success",
                        "message": "Inventory adjustment created successfully",
                        "data": InventoryAdjustmentSerializer(adjustment).data
                    },
                    status=status.HTTP_201_CREATED
                )
                
        except Exception as e:
            return Response(
                {
                    "status": "error",
                    "message": "Failed to create inventory adjustment",
                    "errors": [str(e)]
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class SerializedInventoryViewSet(TenantAwareViewSet):
    """
    API endpoint for viewing and updating the status of Serialized Inventory items.
    Creation/Deletion might be handled by other processes (e.g., receiving, shipping).
    """
    queryset = SerializedInventory.objects.all()
    serializer_class = SerializedInventorySerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [CustomJWTAuthentication]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = SerializedInventoryFilter
    search_fields = ['serial_number', 'product__sku', 'product__name', 'location__name']
    ordering_fields = ['serial_number', 'product__name', 'location__name', 'status', 'created_at', 'updated_at']
    ordering = ['product__name', 'serial_number']

    # No need for get_queryset method as TenantViewMixin handles tenant filtering

    def perform_update(self, serializer):
        """
        Override perform_update to use the update_serialized_status service function
        for proper status transition validation and side effects.
        """
        instance = serializer.instance
        new_status = serializer.validated_data.get('status')
        
        if new_status and new_status != instance.status:
            # Use the service function to handle status transitions
            update_serialized_status(
                serialized_item=instance,
                new_status=new_status,
                user=self.request.user,
                notes=serializer.validated_data.get('notes')
            )
            # Skip the default save since the service function handles it
            return
            
        # For other field updates, use the default behavior
        serializer.save(updated_by=self.request.user.id)

    @action(detail=True, methods=['post'])
    def reserve(self, request, pk=None):
        """
        Reserve a specific serialized inventory item.
        """
        serialized_item = self.get_object()
        
        try:
            reserve_serialized_item(
                serialized_item=serialized_item,
                user=request.user,
                notes=request.data.get('notes')
            )
            return Response(
                {"message": f"Serial number {serialized_item.serial_number} has been reserved."},
                status=status.HTTP_200_OK
            )
        except DjangoValidationError as e:
            raise DRFValidationError(detail=str(e))

    @action(detail=True, methods=['post'])
    def ship(self, request, pk=None):
        """
        Mark a serialized inventory item as shipped/sold.
        """
        serialized_item = self.get_object()
        
        try:
            ship_serialized_item(
                serialized_item=serialized_item,
                user=request.user,
                notes=request.data.get('notes')
            )
            return Response(
                {"message": f"Serial number {serialized_item.serial_number} has been marked as shipped."},
                status=status.HTTP_200_OK
            )
        except DjangoValidationError as e:
            raise DRFValidationError(detail=str(e))

class LotViewSet(TenantAwareViewSet):
    """
    API endpoint for managing Inventory Lots.
    
    list:
        Get a list of all lots with filtering options
    
    create:
        Create a new lot with initial quantity
        
    retrieve:
        Get details of a specific lot
        
    update:
        Update quantity or expiry date of a lot
        WARNING: Direct quantity updates bypass the adjustment audit trail
    """
    queryset = Lot.objects.all()
    permission_classes = [IsAuthenticated]
    authentication_classes = [CustomJWTAuthentication]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = LotFilter
    search_fields = ['lot_number', 'product__sku', 'product__name', 'location__name']
    ordering_fields = [
        'lot_number', 'product__name', 'location__name',
        'quantity', 'expiry_date', 'created_at', 'updated_at'
    ]
    ordering = ['product__name', 'expiry_date', 'lot_number']  # Default order for FEFO

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return LotCreateSerializer
        return LotSerializer

    def get_queryset(self):
        """
        Override get_queryset to ensure we're using the inventory schema
        """
        from django.db import connection
        
        # Ensure we're using the inventory schema in the search path
        if hasattr(connection, 'inventory_schema') and hasattr(connection, 'schema_name'):
            with connection.cursor() as cur:
                cur.execute(f'SET search_path TO "{connection.inventory_schema}", "{connection.schema_name}", public')
        
        # Get the queryset with tenant filtering from TenantViewMixin
        return super().get_queryset()

    def perform_create(self, serializer):
        """
        Override perform_create to ensure we're using the inventory schema
        """
        from django.db import connection
        
        # Ensure we're using the inventory schema in the search path
        if hasattr(connection, 'inventory_schema') and hasattr(connection, 'schema_name'):
            with connection.cursor() as cur:
                cur.execute(f'SET search_path TO "{connection.inventory_schema}", "{connection.schema_name}", public')
        
        # Save the instance
        serializer.save()

    def perform_update(self, serializer):
        """
        Override perform_update to add logging for quantity changes and ensure
        we're using the inventory schema
        """
        from django.db import connection
        
        # Ensure we're using the inventory schema in the search path
        if hasattr(connection, 'inventory_schema') and hasattr(connection, 'schema_name'):
            with connection.cursor() as cur:
                cur.execute(f'SET search_path TO "{connection.inventory_schema}", "{connection.schema_name}", public')
        
        old_instance = self.get_object()
        old_quantity = old_instance.quantity
        instance = serializer.save()
        
        # Log quantity changes
        if instance.quantity != old_quantity:
            # In a real app, you might want to create an audit log entry here
            print(f"Lot {instance.lot_number} quantity changed from {old_quantity} to {instance.quantity}")

class AdjustmentTypeView(APIView):
    """
    API endpoint that returns all available adjustment types.
    This is a simple endpoint that returns the choices defined in the AdjustmentType model.
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [CustomJWTAuthentication]
    
    def get(self, request, *args, **kwargs):
        """
        Return a list of all adjustment types.
        Each type includes a code and display name.
        """
        # Log the tenant context for debugging
        tenant_slug = request.tenant_slug if hasattr(request, 'tenant_slug') else None
        print(f"Getting adjustment types in tenant: {tenant_slug}, schema: {connection.schema_name}")
        
        adjustment_types = [
            {'code': code, 'name': name}
            for code, name in AdjustmentType.choices
        ]
        return Response(adjustment_types)

class InventoryImportView(APIView):
    """
    Upload a CSV file to asynchronously import inventory data.
    Expects 'file' field in multipart/form-data.
    """
    permission_classes = [IsAuthenticated, IsTenantAdmin]
    authentication_classes = [CustomJWTAuthentication]
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request, format=None):
        # Log the tenant context for debugging
        tenant_slug = request.tenant_slug if hasattr(request, 'tenant_slug') else None
        print(f"Importing inventory in tenant: {tenant_slug}, schema: {connection.schema_name}")
        
        serializer = InventoryImportSerializer(data=request.data)
        if serializer.is_valid():
            csv_file = serializer.validated_data['file']
            
            # Start async task
            task = process_inventory_import.delay(
                file_content_str=csv_file.read().decode('utf-8'),
                tenant_id=1,  # Default tenant ID, adjust as needed
                user_id=request.user.id
            )
            
            return Response({
                'task_id': task.id,
                'status': 'PENDING',
                'message': 'Inventory import started. Check task status for updates.'
            }, status=status.HTTP_202_ACCEPTED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def get(self, request, format=None):
        """
        Check status of an inventory import task.
        Requires task_id parameter.
        """
        task_id = request.query_params.get('task_id')
        if not task_id:
            return Response(
                {"error": "task_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        result = AsyncResult(task_id)
        response_data = {
            "task_id": task_id,
            "status": result.status,
        }
        
        if result.successful():
            response_data["result"] = result.get()
        elif result.failed():
            response_data["error"] = str(result.result)
            
        return Response(response_data)
