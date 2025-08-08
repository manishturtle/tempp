"""
Combined Configuration Views for Order Management API.

This module contains API views that fetch combined configuration data
from multiple related tables using raw SQL queries.
"""

from typing import Dict, Any, Optional
from django.db import connection
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from erp_backend.middleware import TenantSchemaMiddleware
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse
import logging

logger = logging.getLogger(__name__)


class CombinedConfigurationView(APIView):
    """
    API endpoint for fetching combined configuration data.
    
    This view uses raw SQL to fetch combined data from CheckoutConfiguration,
    UITemplateSettings, and FeatureToggleSettings tables based on a segment name parameter.
    Returns all matching data for the segment or fallback to default data with no
    customer group selling channel if none is found.
    """
    
    permission_classes = [AllowAny]
    authentication_classes = [TenantSchemaMiddleware]
    
    @extend_schema(
        summary="Get combined configuration data by customer group selling channel",
        description=(
            "Fetches combined configuration data from CheckoutConfiguration, "
            "UITemplateSettings, and FeatureToggleSettings tables filtered by customer_group_selling_channel_id. "
            "If no data exists for the specified ID, returns default data with is_default=True."
        ),
        parameters=[
            OpenApiParameter(
                name='customer_group_selling_channel_id',
                description='ID of the customer group selling channel to filter configurations',
                required=True,
                type=int,
                location=OpenApiParameter.QUERY,
            ),
        ]
    )
    def get(self, request, *args, **kwargs) -> Response:
        """
        Handle GET request to fetch combined configuration data.
        
        Args:
            request: HTTP request object
            *args: Variable length argument list
            **kwargs: Arbitrary keyword arguments
            
        Returns:
            Response: JSON response with combined configuration data
        """
        # Store request object for tenant schema switching
        self.request = request
        
        customer_group_selling_channel_id = request.query_params.get('customer_group_selling_channel_id')
        
        try:
            config_data = self._get_combined_config_data(customer_group_selling_channel_id)
            return Response(config_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error fetching combined configuration data: {str(e)}")
            return Response(
                {"error": "Internal server error"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_combined_config_data(self, customer_group_selling_channel_id: Optional[str]) -> Dict[str, Any]:
        """
        Fetch combined configuration data using raw SQL.
        
        Args:
            customer_group_selling_channel_id: Optional customer group selling channel ID to filter by
            
        Returns:
            Dictionary containing combined configuration data
        """
        # Extract tenant slug from request path
        tenant_slug = None
        if hasattr(self, 'request') and self.request:
            path_parts = self.request.path.strip('/').split('/')
            if len(path_parts) >= 3 and path_parts[0] == 'api' and path_parts[1] == 'v1':
                tenant_slug = path_parts[2]
        
        with connection.cursor() as cursor:
            # If we have a tenant slug, manually switch to that schema
            if tenant_slug:
                cursor.execute(f"SET search_path TO {tenant_slug}, public")
                logger.info(f"Switched to tenant schema: {tenant_slug}")
            
            # Debug: Check current schema after switching
            cursor.execute("""
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = %s AND table_name IN (
                    'order_management_checkout_configuration',
                    'order_management_ui_template_settings',
                    'order_management_feature_toggle_settings'
                )
            """, [tenant_slug])
            existing_tables = [row[0] for row in cursor.fetchall()]
            logger.info(f"Existing tables in {tenant_slug}: {existing_tables}")
            
            # Helper function to get configuration for a specific customer group selling channel ID or default
            def get_config_data(cgsc_id):
                checkout_config = None
                ui_config = None
                feature_config = None
                
                if cgsc_id:
                    # For specific customer_group_selling_channel_id
                    
                    # Try to get checkout configuration
                    try:
                        cursor.execute("""
                            SELECT id, allow_guest_checkout, min_order_value, allow_user_select_shipping,
                                   fulfillment_type, pickup_method_label, enable_delivery_prefs, enable_preferred_date,
                                   enable_time_slots, currency, customer_group_selling_channel_id, is_active
                            FROM order_management_checkout_configuration
                            WHERE customer_group_selling_channel_id = %s
                            LIMIT 1
                        """, [cgsc_id])
                        checkout_config = cursor.fetchone()
                        logger.info(f"Checkout config for CGSC ID {cgsc_id}: {checkout_config is not None}")
                    except Exception as e:
                        logger.warning(f"Error fetching checkout config for CGSC ID {cgsc_id}: {e}")
                    
                    # Try to get UI template settings
                    try:
                        cursor.execute("""
                            SELECT id, product_card_style, pdp_layout_style, checkout_layout,
                                   customer_group_selling_channel_id, is_active
                            FROM order_management_ui_template_settings
                            WHERE customer_group_selling_channel_id = %s
                            LIMIT 1
                        """, [cgsc_id])
                        ui_config = cursor.fetchone()
                        logger.info(f"UI config for CGSC ID {cgsc_id}: {ui_config is not None}")
                    except Exception as e:
                        logger.warning(f"Error fetching UI config for CGSC ID {cgsc_id}: {e}")
                    
                    # Try to get feature toggle settings
                    try:
                        cursor.execute("""
                            SELECT id, wallet_enabled, loyalty_enabled, reviews_enabled, wishlist_enabled,
                                   min_recharge_amount, max_recharge_amount, daily_transaction_limit,
                                   kill_switch, default_delivery_zone,
                                   customer_group_selling_channel_id, is_active
                            FROM order_management_feature_toggle_settings
                            WHERE customer_group_selling_channel_id = %s
                            LIMIT 1
                        """, [cgsc_id])
                        feature_config = cursor.fetchone()
                        logger.info(f"Feature config for CGSC ID {cgsc_id}: {feature_config is not None}")
                    except Exception as e:
                        logger.warning(f"Error fetching feature config for CGSC ID {cgsc_id}: {e}")
                
                return checkout_config, ui_config, feature_config
                
            # Helper function to get default configuration (is_default=True)
            def get_default_config_data():
                checkout_config = None
                ui_config = None
                feature_config = None
                
                # Try to get default checkout configuration
                try:
                    cursor.execute("""
                        SELECT id, allow_guest_checkout, min_order_value, allow_user_select_shipping,
                               fulfillment_type, pickup_method_label, enable_delivery_prefs, enable_preferred_date,
                               enable_time_slots, currency, customer_group_selling_channel_id, is_active
                        FROM order_management_checkout_configuration
                        WHERE is_default = TRUE
                        LIMIT 1
                    """)
                    checkout_config = cursor.fetchone()
                    logger.info(f"Default checkout config found: {checkout_config is not None}")
                except Exception as e:
                    logger.warning(f"Error fetching default checkout config: {e}")
                
                # Try to get default UI template settings
                try:
                    cursor.execute("""
                        SELECT id, product_card_style, pdp_layout_style, checkout_layout,
                               customer_group_selling_channel_id, is_active
                        FROM order_management_ui_template_settings
                        WHERE is_default = TRUE
                        LIMIT 1
                    """)
                    ui_config = cursor.fetchone()
                    logger.info(f"Default UI config found: {ui_config is not None}")
                except Exception as e:
                    logger.warning(f"Error fetching default UI config: {e}")
                
                # Try to get default feature toggle settings
                try:
                    cursor.execute("""
                        SELECT id, wallet_enabled, loyalty_enabled, reviews_enabled, wishlist_enabled,
                               min_recharge_amount, max_recharge_amount, daily_transaction_limit,
                               kill_switch, default_delivery_zone,
                               customer_group_selling_channel_id, is_active
                        FROM order_management_feature_toggle_settings
                        WHERE is_default = TRUE
                        LIMIT 1
                    """)
                    feature_config = cursor.fetchone()
                    logger.info(f"Default feature config found: {feature_config is not None}")
                except Exception as e:
                    logger.warning(f"Error fetching default feature config: {e}")
                    
                return checkout_config, ui_config, feature_config
            
            # Get customer group selling channel specific data first (if ID is provided)
            cgsc_checkout = None
            cgsc_ui = None
            cgsc_feature = None
            
            if customer_group_selling_channel_id:
                logger.info(f"Fetching data for customer_group_selling_channel_id: {customer_group_selling_channel_id}")
                cgsc_checkout, cgsc_ui, cgsc_feature = get_config_data(customer_group_selling_channel_id)
            
            # Get default data (is_default=True) for missing configurations
            default_checkout = None
            default_ui = None
            default_feature = None
            
            # Check what's missing and get defaults with is_default=True
            if not cgsc_checkout or not cgsc_ui or not cgsc_feature:
                logger.info("Some configurations missing, fetching default data with is_default=True")
                default_checkout, default_ui, default_feature = get_default_config_data()
            
            # Use customer group selling channel data if available, otherwise use default data
            final_checkout = cgsc_checkout or default_checkout
            final_ui = cgsc_ui or default_ui
            final_feature = cgsc_feature or default_feature
            
            # Build the response with fallback values if no data exists
            return {
                "checkout_configuration": self._build_checkout_config(final_checkout),
                "ui_template_settings": self._build_ui_config(final_ui),
                "feature_toggle_settings": self._build_feature_config(final_feature)
            }
    
    def _build_checkout_config(self, config_data) -> Dict[str, Any]:
        """Build checkout configuration."""
        if not config_data:
            return None
            
        return {
            "id": config_data[0],
            "allow_guest_checkout": config_data[1],
            "min_order_value": str(config_data[2]) if config_data[2] is not None else "0.00",
            "allow_user_select_shipping": config_data[3],
            "fulfillment_type": config_data[4] or "both",
            "pickup_method_label": config_data[5] or "Pickup",
            "enable_delivery_prefs": config_data[6],
            "enable_preferred_date": config_data[7],
            "enable_time_slots": config_data[8],
            "currency": config_data[9] or "INR",
            "customer_group_selling_channel": config_data[10],
            "is_active": config_data[11]
        }
    
    def _build_ui_config(self, config_data) -> Dict[str, Any]:
        """Build UI configuration."""
        if not config_data:
            return None
            
        return {
            "id": config_data[0],
            "product_card_style": config_data[1] or "card1",
            "pdp_layout_style": config_data[2] or "classic",
            "checkout_layout": config_data[3] or "layout1",
            "customer_group_selling_channel": config_data[4],
            "is_active": config_data[5]
        }
    
    def _build_feature_config(self, config_data) -> Dict[str, Any]:
        """Build feature toggle configuration."""
        if not config_data:
            return None
            
        return {
            "id": config_data[0],
            "wallet_enabled": config_data[1],
            "loyalty_enabled": config_data[2],
            "reviews_enabled": config_data[3],
            "wishlist_enabled": config_data[4],
            "min_recharge_amount": str(config_data[5]) if config_data[5] is not None else "100.00",
            "max_recharge_amount": str(config_data[6]) if config_data[6] is not None else "10000.00",
            "daily_transaction_limit": str(config_data[7]) if config_data[7] is not None else "50000.00",
            "kill_switch": config_data[8] if config_data[8] is not None else False,
            "default_delivery_zone": config_data[9],
            "customer_group_selling_channel": config_data[10],
            "is_active": config_data[11]
        }
    

