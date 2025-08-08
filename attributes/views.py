"""
Views for the attributes app.

This module defines ViewSets for attribute-related models such as AttributeGroup,
Attribute, and AttributeOption.
"""
from rest_framework import filters, viewsets
from django.contrib.auth import get_user_model
from django.db import connection, models
from core.viewsets import TenantModelViewSet
from .models import AttributeGroup, Attribute, AttributeOption
from .serializers import (
    AttributeGroupSerializer, AttributeSerializer, AttributeOptionSerializer
)
from erp_backend.middleware import CustomJWTAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
User = get_user_model()


class AttributeGroupViewSet(TenantModelViewSet):
    """API endpoint for managing attribute groups."""
    queryset = AttributeGroup.objects.all()
    serializer_class = AttributeGroupSerializer
    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter, DjangoFilterBackend]
    search_fields = ['name']
    ordering_fields = ['name', 'display_order', 'created_at']
    ordering = ['display_order', 'name']
    filterset_fields = ['is_active']
    
    def perform_create(self, serializer):
        """
        Create a new attribute group with client_id, company_id, created_by and updated_by.
        
        Sets client_id and company_id to 1, and assigns the first user as created_by and updated_by.
        Also sets is_active to True by default.
        """
        # Get a default user for created_by and updated_by
        default_user = User.objects.first()
        
        serializer.save(
            client_id=1,
            company_id=1,
            created_by=default_user,
            updated_by=default_user,
            is_active=True
        )
    
    def perform_update(self, serializer):
        """
        Update an attribute group with client_id, company_id and updated_by.
        
        Sets client_id and company_id to 1, and assigns the first user as updated_by.
        """
        # Get a default user for updated_by
        default_user = User.objects.first()
        
        serializer.save(
            client_id=1,
            company_id=1,
            updated_by=default_user
        )
    
    def get_queryset(self):
        """
        Get the list of attribute groups with counts of active/inactive items.
        """
        queryset = super().get_queryset()
        
        # If this is a list request, we'll add counts to the response
        if self.action == 'list':
            # Get counts for active and inactive attribute groups
            active_count = AttributeGroup.objects.filter(is_active=True).count()
            inactive_count = AttributeGroup.objects.filter(is_active=False).count()
            total_count = AttributeGroup.objects.count()
            
            # Store the counts in the view for later use in list()
            self.counts = {
                'active': active_count,
                'inactive': inactive_count,
                'total': total_count
            }
            
        return queryset
    
    def list(self, request, *args, **kwargs):
        """
        List all attribute groups with counts of active/inactive items.
        """
        queryset = self.filter_queryset(self.get_queryset())
        
        # Get the paginated queryset
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response_data = {
                'count': self.paginator.page.paginator.count,
                'total_pages': self.paginator.page.paginator.num_pages,
                'current_page': self.paginator.page.number,
                'page_size': self.paginator.page_size,
                'next': self.paginator.get_next_link(),
                'previous': self.paginator.get_previous_link(),
                'results': serializer.data,
                'counts': getattr(self, 'counts', {
                    'active': queryset.filter(is_active=True).count(),
                    'inactive': queryset.filter(is_active=False).count(),
                    'total': queryset.count()
                }),
                'filtered_count': len(serializer.data)
            }
            return Response(response_data)
        
        # If not using pagination (shouldn't happen with default settings)
        serializer = self.get_serializer(queryset, many=True)
        response_data = {
            'count': queryset.count(),
            'total_pages': 1,
            'current_page': 1,
            'page_size': queryset.count() or 1,
            'next': None,
            'previous': None,
            'results': serializer.data,
            'counts': getattr(self, 'counts', {
                'active': queryset.filter(is_active=True).count(),
                'inactive': queryset.filter(is_active=False).count(),
                'total': queryset.count()
            }),
            'filtered_count': len(serializer.data)
        }
        return Response(response_data)


class AttributeViewSet(TenantModelViewSet):
    """
    API endpoint for managing attributes.
    
    This viewset handles the CRUD operations for attributes, including the
    management of nested attribute options through the options_input field.
    """
    queryset = Attribute.objects.prefetch_related('groups', 'options').all().order_by('id')
    serializer_class = AttributeSerializer
    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter, DjangoFilterBackend]
    filterset_fields = ['is_active']
    search_fields = ['name', 'code', 'label', 'description']
    ordering_fields = ['name', 'label', 'created_at', 'id']
    ordering = ['-id']  # Default to newest first
    
    def get_queryset(self):
        """
        Get the list of attributes for the current client with optimized prefetching.
        """
        queryset = super().get_queryset()
        
        # Add additional filters if needed
        data_type = self.request.query_params.get('data_type')
        if data_type:
            queryset = queryset.filter(data_type=data_type)
            
        # Add any other filters here
        use_for_variants = self.request.query_params.get('use_for_variants')
        if use_for_variants is not None:
            use_for_variants = use_for_variants.lower() == 'true'
            queryset = queryset.filter(use_for_variants=use_for_variants)
            
        return queryset
            
    def list(self, request, *args, **kwargs):
        """
        List all attributes with pagination and counts.
        """
        # Get the base queryset without any filters
        base_queryset = super().get_queryset()
        
        # Apply filters for the actual data
        queryset = self.filter_queryset(self.get_queryset())
        
        # Get counts from the base queryset (unfiltered)
        counts = {
            'active': base_queryset.filter(is_active=True).count(),
            'inactive': base_queryset.filter(is_active=False).count(),
            'total': base_queryset.count()
        }
        
        # Apply pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response = self.get_paginated_response(serializer.data)
            response.data['counts'] = counts
            response.data['filtered_count'] = len(serializer.data)
            return response
            
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'count': len(serializer.data),
            'results': serializer.data,
            'counts': counts,
            'filtered_count': len(serializer.data)
        })
            
        use_for_variants = self.request.query_params.get('use_for_variants')
        if use_for_variants is not None:
            use_for_variants = use_for_variants.lower() == 'true'
            queryset = queryset.filter(use_for_variants=use_for_variants)
            
        show_on_pdp = self.request.query_params.get('show_on_pdp')
        if show_on_pdp is not None:
            show_on_pdp = show_on_pdp.lower() == 'true'
            queryset = queryset.filter(show_on_pdp=show_on_pdp)
            
        # Filter by attribute group if specified
        group_id = self.request.query_params.get('group')
        if group_id:
            queryset = queryset.filter(groups__id=group_id)
            
        return queryset
    
    def perform_create(self, serializer):
        """
        Create a new attribute with client_id, company_id, created_by and updated_by.
        
        Sets client_id and company_id to 1, and assigns the first user as created_by and updated_by.
        Also sets is_active to True by default.
        
        If the table is empty, resets the ID sequence to start from 1.
        """
        # Check if the table is empty and reset the sequence if needed
        if not Attribute.objects.exists():
            with connection.cursor() as cursor:
                table_name = Attribute._meta.db_table
                if connection.vendor == 'postgresql':
                    cursor.execute(f"ALTER SEQUENCE {table_name}_id_seq RESTART WITH 1")
                elif connection.vendor == 'sqlite':
                    cursor.execute(f"UPDATE sqlite_sequence SET seq = 0 WHERE name = '{table_name}'")
                elif connection.vendor == 'mysql':
                    cursor.execute(f"ALTER TABLE {table_name} AUTO_INCREMENT = 1")
        
        # Get a default user for created_by and updated_by
        default_user = User.objects.first()
        
        serializer.save(
            client_id=1,
            company_id=1,
            created_by=default_user,
            updated_by=default_user,
            is_active=True
        )
    
    def perform_update(self, serializer):
        """
        Update an attribute with client_id, company_id and updated_by.
        
        Sets client_id and company_id to 1, and assigns the first user as updated_by.
        """
        # Get a default user for updated_by
        default_user = User.objects.first()
        
        serializer.save(
            client_id=1,
            company_id=1,
            updated_by=default_user
        )


class AttributeOptionViewSet(TenantModelViewSet):
    """
    API endpoint for managing attribute options.
    
    This viewset handles the CRUD operations for attribute options.
    """
    queryset = AttributeOption.objects.select_related('attribute').all()
    serializer_class = AttributeOptionSerializer
    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['option_label', 'option_value', 'attribute__label']
    ordering_fields = ['attribute__label', 'sort_order', 'option_label', 'created_at']
    ordering = ['attribute__label', 'sort_order', 'option_label']
    
    def get_queryset(self):
        """
        Get the list of attribute options for the current client with filtering by attribute.
        """
        queryset = super().get_queryset()
        
        # Filter by attribute if specified
        attribute_id = self.request.query_params.get('attribute')
        if attribute_id:
            queryset = queryset.filter(attribute_id=attribute_id)
            
        return queryset
    
    def perform_create(self, serializer):
        """
        Create a new attribute option with client_id, company_id, created_by and updated_by.
        
        Sets client_id and company_id to 1, and assigns the first user as created_by and updated_by.
        """
        # Get a default user for created_by and updated_by
        default_user = User.objects.first()
        
        serializer.save(
            client_id=1,
            company_id=1,
            created_by=default_user,
            updated_by=default_user
        )
    
    def perform_update(self, serializer):
        """
        Update an attribute option with client_id, company_id and updated_by.
        
        Sets client_id and company_id to 1, and assigns the first user as updated_by.
        """
        # Get a default user for updated_by
        default_user = User.objects.first()
        
        serializer.save(
            client_id=1,
            company_id=1,
            updated_by=default_user
        )
