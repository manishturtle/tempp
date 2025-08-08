# products/views.py

import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import viewsets, status
import decimal
from .selector import get_storefront_products, get_product_detail_with_delivery
from rest_framework.permissions import AllowAny
from erp_backend.middleware import TenantSchemaMiddleware

# Configure logger
logger = logging.getLogger(__name__)

class ProductListView(APIView):
    """
    An API view to list and filter products for the storefront.
    """
    permission_classes = [AllowAny]
    authentication_classes = [TenantSchemaMiddleware]

    def get(self, request, *args, **kwargs):
        """
        Handles incoming GET requests and returns a list of products
        with dynamic filters and pagination data.
        """
        # logger.info("ProductListView: GET request received")
        # A utility to safely convert string params to numbers
        def to_decimal(value):
            try:
                return decimal.Decimal(value)
            except (TypeError, decimal.InvalidOperation):
                return None

        # Parse all potential filters and options from the request query parameters
        def parse_id_list(value_str):
            if not value_str:
                return None
            try:
                # Handle comma-separated IDs
                if ',' in value_str:
                    return [int(x.strip()) for x in value_str.split(',') if x.strip().isdigit()]
                # Handle single ID
                elif value_str.strip().isdigit():
                    return int(value_str.strip())
                return None
            except (ValueError, TypeError):
                return None
                
        filters = {
            'division_id': parse_id_list(request.query_params.get('division_id')),
            'category_id': parse_id_list(request.query_params.get('category_id')),
            'subcategory_id': parse_id_list(request.query_params.get('subcategory_id')),
            'price__gte': to_decimal(request.query_params.get('price_min')),
            'price__lte': to_decimal(request.query_params.get('price_max')),
            'show_out_of_stock': request.query_params.get('show_out_of_stock') == 'true',
            'customer_group_selling_channel_id': parse_id_list(request.query_params.get('customer_group_selling_channel_id')),
            'country': request.query_params.get('country'),
            'pincode': request.query_params.get('pincode')
        }

        # Process attribute filters (all parameters starting with 'attribute_')
        attributes = {}
        for key, value in request.query_params.items():
            if key.startswith('attribute_'):
                attr_name = key[10:]  # Remove 'attribute_' prefix
                attributes[attr_name] = parse_id_list(value) if value.isdigit() else value
                
        if attributes:
            filters['attributes'] = attributes
            
        # logger.info(f"Parsed filters from request: {filters}")
        
        # Clean up None values so we don't pass empty filters
        filters = {k: v for k, v in filters.items() if v is not None and v != ''}
        
        try:
            page = int(request.query_params.get('page', 1))
        except (ValueError, TypeError):
            page = 1

        # Call the main selector function to get all processed data
        # logger.info(f"Calling get_storefront_products with page={page}")
        products, pagination, available_filters = get_storefront_products(
            filters=filters,
            page=page
        )
        # logger.info(f"get_storefront_products returned {len(products)} products")

        # Structure the final response payload
        response_data = {
            'data': products,
            'pagination': pagination,
            'filters': available_filters
        }

        # logger.info("Returning products response")
        return Response(response_data)


class ProductDetailViewSet(viewsets.ViewSet):
    """
    ViewSet for retrieving detailed product information with delivery eligibility.
    
    This viewset provides detailed product data including delivery eligibility
    based on pincode, country, and customer group selling channel.
    """
    permission_classes = [AllowAny]
    authentication_classes = [TenantSchemaMiddleware]
    
    def retrieve(self, request, tenant_slug=None, sku=None):
        """
        Retrieve detailed product information by SKU.
        
        Args:
            request: The request object
            sku: The product SKU
            
        Returns:
            Response containing detailed product data with delivery eligibility
        """
        if not sku:
            return Response(
                {"detail": "Product SKU not provided."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get delivery parameters from query params
        pincode = request.query_params.get('pincode')
        country = request.query_params.get('country')
        customer_group_selling_channel_id = request.query_params.get('customer_group_selling_channel_id')
        
        # Fetch product details with delivery eligibility
        product_data = get_product_detail_with_delivery(
            sku=sku,
            pincode=pincode,
            country=country,
            customer_group_selling_channel_id=customer_group_selling_channel_id
        )
        
        if not product_data:
            return Response(
                {"detail": "Product not found."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response(product_data)