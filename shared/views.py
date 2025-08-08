"""
API views for shared models.

These views provide API endpoints for accessing shared models.
"""
from rest_framework import viewsets, permissions
from rest_framework.views import APIView
from django.db import connection
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework import status
from typing import Any


from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import User
from .models import Country, Currency
from .serializers import CountrySerializer, CurrencySerializer
from erp_backend.middleware import CustomJWTAuthentication, TenantSchemaMiddleware
from rest_framework.permissions import IsAuthenticated

class CountryViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Countries.
    
    Provides CRUD operations for Country model instances.
    
    Optional query parameters:
    - paginate: Set to 'false' to disable pagination and return all results
    """
    queryset = Country.objects.all().order_by('id')
    serializer_class = CountrySerializer
    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated]
    lookup_field = 'iso_code'
    
    def get_paginated_response(self, data):
        """
        Override to support disabling pagination with paginate=false query param
        """
        # Check if pagination should be disabled
        paginate = self.request.query_params.get('paginate', 'true').lower()
        if paginate == 'false':
            return Response(data)
        return super().get_paginated_response(data)
    
    def list(self, request, *args, **kwargs):
        """
        Override list method to handle pagination toggle
        """
        queryset = self.filter_queryset(self.get_queryset())
        
        # Check if pagination should be disabled
        paginate = request.query_params.get('paginate', 'true').lower()
        
        if paginate == 'false':
            # Skip pagination
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        else:
            # Use default pagination behavior
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)


class CountryListRawViewSet(viewsets.ViewSet):
    """
    API endpoint that returns a list of countries using a raw SQL SELECT query with multi-tenant schema switching.

    - Uses TenantSchemaMiddleware for authentication (schema context)
    - Allows any permissions
    - Returns a list of countries from the tenant's schema using raw SQL
    """
    authentication_classes = [TenantSchemaMiddleware]
    permission_classes = [permissions.AllowAny]

    def list(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        """
        GET endpoint that returns all countries with all fields using a raw SQL query.
        Fetches from the schema specified in the URL (tenant_slug).
        """
        try:
            schema = kwargs.get('tenant_slug')
            if not schema:
                return Response(
                    {"detail": "Missing tenant_slug in URL."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            with connection.cursor() as cursor:
                cursor.execute(f"""
                    SELECT 
                        id, 
                        name, 
                        iso_code,
                        flag_url
                    FROM 
                        {schema}.shared_country 
                    ORDER BY 
                        name ASC;
                """)
                columns = [col[0] for col in cursor.description]
                countries = [
                    dict(zip(columns, row))
                    for row in cursor.fetchall()
                ]
            return Response(countries, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"detail": f"Error reading countries: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
class CurrencyViewSet(viewsets.ModelViewSet):
    """
    API endpoint for currencies.
    
    Provides CRUD operations for Currency model.
    
    Optional query parameters:
    - paginate: Set to 'false' to disable pagination and return all results
    """
    queryset = Currency.objects.all().order_by('id')
    serializer_class = CurrencySerializer
    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated]
    lookup_field = 'code'
    
    def get_paginated_response(self, data):
        """
        Override to support disabling pagination with paginate=false query param
        """
        # Check if pagination should be disabled
        paginate = self.request.query_params.get('paginate', 'true').lower()
        if paginate == 'false':
            return Response(data)
        return super().get_paginated_response(data)
    
    def list(self, request, *args, **kwargs):
        """
        Override list method to handle pagination toggle
        """
        queryset = self.filter_queryset(self.get_queryset())
        
        # Check if pagination should be disabled
        paginate = request.query_params.get('paginate', 'true').lower()
        
        if paginate == 'false':
            # Skip pagination
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        else:
            # Use default pagination behavior
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        """
        Override create method to set default values for client_id, created_by_id, and updated_by_id.
        """
        # Get or set default user (admin)
        default_user_id = 1
        default_user = User.objects.filter(id=default_user_id).first()
        
        # Add default values to request data
        data = request.data.copy()
        data['client'] = 1  # Default client_id
        data['company_id'] = 1  # Default company_id
        
        # Create serializer with modified data
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        
        # Save with default user
        instance = serializer.save(
            created_by=default_user,
            updated_by=default_user
        )
        
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def update(self, request, *args, **kwargs):
        """
        Override update method to set default values for updated_by_id.
        """
        # Get or set default user (admin)
        default_user_id = 1
        default_user = User.objects.filter(id=default_user_id).first()
        
        # Get instance and update it
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=kwargs.get('partial', False))
        serializer.is_valid(raise_exception=True)
        
        # Save with default user as updated_by
        serializer.save(updated_by=default_user)
        
        return Response(serializer.data)
