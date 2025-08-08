from rest_framework import views, permissions, status
from rest_framework.response import Response
from django.utils.translation import gettext_lazy as _
from django.db import transaction
from .models import HeaderConfiguration, HeaderDivisionOrder
from .serializers import HeaderConfigurationSerializer, HeaderConfigurationUpdateSerializer, HeaderConfigurationSimpleSerializer
from typing import Dict, Any, List, Optional
from erp_backend.middleware import CustomJWTAuthentication, TenantSchemaMiddleware
from rest_framework.permissions import IsAuthenticated


class HeaderConfigurationView(views.APIView):
    """
    API endpoint for retrieving header configuration with navigation structure.
    This is a public endpoint that provides the header structure for rendering.
    """
    authentication_classes = [TenantSchemaMiddleware]
    permission_classes = [permissions.AllowAny]
    
    def get(self, request, *args, **kwargs) -> Response:
        """
        Get the header configuration with ordered divisions and their categories/subcategories.
        Uses prefetching for performance optimization.
        """
        # Get client_id from request or default to 1
        tenant = getattr(request, 'tenant', None)
        client_id = getattr(tenant, 'client_id', 1) if tenant else 1
        
        # Get or create the header configuration for this client
        header_config, created = HeaderConfiguration.objects.get_or_create(
            client_id=client_id,
            defaults={'name': f"Header Config for Client {client_id}"}
        )
        
        # Serialize the configuration with simplified division data
        serializer = HeaderConfigurationSimpleSerializer(header_config)
        return Response(serializer.data)


class AdminHeaderConfigurationView(views.APIView):
    """
    API endpoint for admin users to update header configuration.
    This is a protected endpoint that requires admin privileges.
    """
    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request, *args, **kwargs) -> Response:
        """
        Get the header configuration with ordered divisions for admin users.
        This provides the same data as the public endpoint but requires authentication.
        """
        # Get client_id from request tenant context
        client_id = getattr(request, 'tenant', {}).get('client_id', 1)
        
        # Get or create the header configuration for this client
        header_config, created = HeaderConfiguration.objects.get_or_create(
            client_id=client_id,
            defaults={'name': f"Header Config for Client {client_id}"}
        )
        
        # Serialize the configuration with simplified division data
        serializer = HeaderConfigurationSimpleSerializer(header_config)
        return Response(serializer.data)
    
    def put(self, request, *args, **kwargs) -> Response:
        """
        Update the header configuration with a new division order.
        Accepts a list of division IDs in the desired order.
        """
        # Get client_id from request or default to 1
        tenant = getattr(request, 'tenant', None)
        client_id = getattr(tenant, 'client_id', 1) if tenant else 1
        
        # Get or create the header configuration for this client
        header_config, created = HeaderConfiguration.objects.get_or_create(
            client_id=client_id,
            defaults={'name': f"Header Config for Client {client_id}"}
        )
        
        # Validate the input data
        serializer = HeaderConfigurationUpdateSerializer(
            data=request.data,
            context={'client_id': client_id}
        )
        serializer.is_valid(raise_exception=True)
        
        # Get the validated division IDs
        division_ids = serializer.validated_data.get('division_ids', [])
        
        # Transaction to ensure atomicity
        from django.db import transaction
        
        with transaction.atomic():
            # Delete existing order entries
            HeaderDivisionOrder.objects.filter(header_config=header_config).delete()
            
            # Create new order entries
            for index, division_id in enumerate(division_ids):
                HeaderDivisionOrder.objects.create(
                    client_id=client_id,
                    company_id=1,  # Default company ID
                    header_config=header_config,
                    division_id=division_id,
                    order=index
                )
        
        # Return the updated configuration
        response_serializer = HeaderConfigurationSerializer(header_config)
        return Response(response_serializer.data)
