from rest_framework import viewsets, filters , generics
# from rest_framework.permissions import IsAuthenticated  # Temporarily disabled
# Import django-filter for filtering
from django_filters.rest_framework import DjangoFilterBackend
from .models import Division, Category, Subcategory, UnitOfMeasure, ProductStatus ,CustomerGroupSellingChannelCategory,CustomerGroupSellingChannelSubcategory ,CustomerGroupSellingChannelDivision
from .serializers import (
    DivisionSerializer, CategorySerializer, SubcategorySerializer,
    UnitOfMeasureSerializer, ProductStatusSerializer 
)
from products.models import (
    CustomerGroupSellingChannelProduct
)
from core.viewsets import TenantModelViewSet
from django.contrib.auth import get_user_model
from rest_framework.response import Response
from rest_framework import status
from erp_backend.middleware import CustomJWTAuthentication, TenantSchemaMiddleware
from rest_framework.permissions import IsAuthenticated
from rest_framework import permissions
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.core.exceptions import ValidationError
from django.core.files.storage import default_storage
from django.db import transaction , connection
from products.models import ProductImage
from products.product_visibility import update_subcategory_visibility
from rest_framework.views import APIView
from django.conf import settings

# Import logging
import logging
logger = logging.getLogger(__name__)

User = get_user_model()


class CORSMixin:
    """
    Mixin to add CORS headers to API responses.
    """
    def dispatch(self, request, *args, **kwargs):
        response = super().dispatch(request, *args, **kwargs)
        # Add CORS headers
        response["Access-Control-Allow-Origin"] = "http://localhost:3000"
        response["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, accept, origin, referer, user-agent"
        response["Access-Control-Allow-Credentials"] = "true"
        return response
    
    def options(self, request, *args, **kwargs):
        """
        Handle OPTIONS requests for CORS preflight.
        """
        response = Response()
        response["Access-Control-Allow-Origin"] = "http://localhost:3000"
        response["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, accept, origin, referer, user-agent"
        response["Access-Control-Allow-Credentials"] = "true"
        return response


class DivisionViewSet(CORSMixin, TenantModelViewSet):
    """
    API endpoint for managing Divisions.
    
    Provides CRUD operations for Division model instances.
    
    Optional query parameters:
    - paginate: Set to 'false' to disable pagination and return all results
    """
    queryset = Division.objects.all()
    serializer_class = DivisionSerializer
    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated] 
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    # filterset_fields = ['is_active']  # Commented out as it requires django-filter
    search_fields = ['name', 'description']
    ordering_fields = ['id', 'name', 'created_at']
    ordering = ['id']
    
    def get_paginated_response(self, data, extra_data=None):
        """
        Override to include extra data in the paginated response.
        """
        # Check if pagination should be disabled
        paginate = self.request.query_params.get('paginate', 'true').lower()
        if paginate == 'false':
            if extra_data:
                response_data = {'results': data}
                response_data.update(extra_data)
                return Response(response_data)
            return Response(data)
        
        # For paginated responses, we need to modify the response data
        response = super().get_paginated_response(data)
        if extra_data:
            response.data.update(extra_data)
        return response
    
    def filter_queryset(self, queryset):
        """
        Override to handle custom filtering by is_active.
        """
        queryset = super().filter_queryset(queryset)
        
        # Apply is_active filter if provided
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            is_active_bool = is_active.lower() == 'true'
            queryset = queryset.filter(is_active=is_active_bool)
        
        return queryset
    
    def list(self, request, *args, **kwargs):
        """
        Override list method to handle pagination toggle.
        When paginate=false, returns a simple array of divisions.
        """
        queryset = self.filter_queryset(self.get_queryset())
    
        # Check if pagination should be disabled
        paginate = request.query_params.get('paginate', 'true').lower()
        if paginate == 'false':
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)  # Return just the array of divisions
            
        # Get counts from the full unfiltered queryset
        full_queryset = self.get_queryset()
        active_count = full_queryset.filter(is_active=True).count()
        inactive_count = full_queryset.filter(is_active=False).count()
        total_count = active_count + inactive_count
        
        # Apply pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(
                serializer.data,
                {
                    'counts': {
                        'active': active_count,
                        'inactive': inactive_count,
                        'total': total_count
                    }
                }
            )
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'counts': {
                'active': active_count,
                'inactive': inactive_count,
                'total': total_count
            },
            'results': serializer.data,
            'count': total_count,
            'current_page': 1,
            'total_pages': 1,
            'page_size': total_count
        })
    def create(self, request, *args, **kwargs):
        """
        Create a new Division instance.
        Returns the new ID in the response after successful creation.
        """
        # Store temp_images data before calling super().create() as it will be consumed
        temp_images = request.data.get('temp_images', [])
        
        # Call the parent create method to create the division
        response = super().create(request, *args, **kwargs)
        
        # Process temp_images if present and creation was successful
        if response.status_code == 201 and temp_images:
            try:
                # Get the created division instance
                division_id = response.data['id']
                division = Division.objects.get(id=division_id)
                
                # Use our mock Redis implementation
                from products.mock_redis import mock_redis
                
                # Create a simple tenant-like object with an id attribute
                class TenantLike:
                    def __init__(self, tenant_id, company_id=1):
                        self.id = tenant_id
                        self.company_id = company_id
                
                # Get the client_id from the division
                client_id = division.client_id
                tenant_obj = TenantLike(client_id)
                
                logger.info(f"Processing {len(temp_images)} temporary images for division {division.id}")
                logger.info(f"Temp images data: {temp_images}")
                
                # Import here to avoid circular imports
                from products.utils import link_temporary_images
                
                # Process temporary images and link them to the division
                created_images = link_temporary_images(
                    owner_instance=division,
                    owner_type='division',  # Use 'division' as the owner type
                    temp_image_data=temp_images,
                    tenant=tenant_obj,
                    redis_client=mock_redis
                )
                
                # The division's image field is now directly updated in link_temporary_images
                # Just log that we've processed the images
                if created_images:
                    logger.info(f"Division {division.id} image was directly updated in link_temporary_images")
                    # No need to update division.image here as it's already done in link_temporary_images
                
                logger.info(f"Successfully linked {len(created_images)} images to division {division.id}")
            except Exception as e:
                logger.error(f"Failed to handle temporary images for division {response.data['id']}: {str(e)}")
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
        
        # Add the new ID to the response data
        if response.status_code == 201:  # Created
            response.data['message'] = f"Division created successfully with ID: {response.data['id']}"
        
        return response
    
    def perform_create(self, serializer):
        """
        Override to avoid client-related functionality until multi-tenancy is fully implemented.
        Assign a default client_id for now to satisfy the database constraint.
        Also set created_by and updated_by fields.
        Check for the last ID in the records and increment it by 1 for new records.
        """
        # Get the user ID from the request
        user_id = None
        if hasattr(self.request, 'user') and hasattr(self.request.user, 'user_id'):
            user_id = self.request.user.user_id
        elif hasattr(self.request, 'user') and hasattr(self.request.user, 'id'):
            user_id = self.request.user.id
        
        # Use 1 as default user_id if none is available
        if not user_id:
            user_id = 1
        
        # Get the last ID in the records and increment it by 1
        last_division = Division.objects.order_by('-id').first()
        next_id = (last_division.id + 1) if last_division else 1
        
        # Get the tenant ID from the request or use a default
        tenant_id = getattr(self.request, 'tenant_id', 1)
        
        # Check if the user exists in the current tenant's schema
        from django.contrib.auth.models import User
        user_exists = User.objects.filter(id=user_id).exists() if user_id else False
        
        # If user doesn't exist, set created_by_id and updated_by_id to None
        serializer.save(
            client_id=tenant_id, 
            created_by_id=user_id if user_exists else None, 
            updated_by_id=user_id if user_exists else None, 
            id=next_id,
            company_id=1
        )
    
    def update(self, request, *args, **kwargs):
        """
        Update a Division instance.
        Also handles temporary images during updates.
        """
        # Store temp_images data before calling super().update()
        temp_images = request.data.get('temp_images', [])
        logger.info(f"Division update requested with temp_images: {temp_images}")
        
        # Call the parent update method
        response = super().update(request, *args, **kwargs)
        
        # Process temp_images if present and update was successful
        if response.status_code == 200 and temp_images:
            try:
                # Get the updated division instance
                division_id = response.data['id']
                division = Division.objects.get(id=division_id)
                
                # Use our mock Redis implementation
                from products.mock_redis import mock_redis
                
                # Create a simple tenant-like object with an id attribute
                class TenantLike:
                    def __init__(self, tenant_id, company_id=1):
                        self.id = tenant_id
                        self.company_id = company_id
                
                # Get the client_id from the division
                client_id = division.client_id
                tenant_obj = TenantLike(client_id)
                
                # Import here to avoid circular imports
                from products.utils import link_temporary_images
                
                # Process temporary images and link them to the division
                created_images = link_temporary_images(
                    owner_instance=division,
                    owner_type='division',  # Use 'division' as the owner type
                    temp_image_data=temp_images,
                    tenant=tenant_obj,
                    redis_client=mock_redis
                )
                
                if created_images:
                    logger.info(f"Division {division.id} image was updated with new temp image")
                    # Refresh the data to show the updated image URL
                    updated_division = Division.objects.get(id=division_id)
                    response.data['image'] = updated_division.image
                
                logger.info(f"Successfully linked {len(created_images)} images to division {division.id} during update")
            except Exception as e:
                logger.error(f"Failed to handle temporary images for division update {response.data['id']}: {str(e)}")
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
        
        return response
        
    def perform_update(self, serializer):
        """
        Set updated_by field when updating an object.
        """
        # Get the user ID from the request
        user_id = None
        if hasattr(self.request, 'user') and hasattr(self.request.user, 'user_id'):
            user_id = self.request.user.user_id
        elif hasattr(self.request, 'user') and hasattr(self.request.user, 'id'):
            user_id = self.request.user.id
    
        # Use 1 as default user_id if none is available
        if not user_id:
            user_id = 1
        
        # Check if the user exists in the current tenant's schema
        from django.contrib.auth.models import User
        user_exists = User.objects.filter(id=user_id).exists() if user_id else False
        
        # If user doesn't exist, set updated_by_id to None
        instance = serializer.save(updated_by_id=user_id if user_exists else None, company_id=1)
        
        # Schedule visibility update after transaction commits
        if hasattr(instance, 'id'):
            def update_visibility():
                try:
                    from products.product_visibility import update_division_visibility
                    update_division_visibility(instance.id)
                except Exception:
                    pass
                    
            from django.db import transaction
            transaction.on_commit(update_visibility)


class CategoryViewSet(TenantModelViewSet):
    """
    API endpoint for managing Categories.
    
    Supports lookup by slug field for better URL readability and SEO.
    
    Optional query parameters:
    - paginate: Set to 'false' to disable pagination and return all results
    - division: Filter categories by division ID
    - is_active: Filter categories by active status (true/false)
    """
    queryset = Category.objects.select_related('division').all()
    serializer_class = CategorySerializer
    authentication_classes = [TenantSchemaMiddleware]
    permission_classes = [permissions.AllowAny]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter, DjangoFilterBackend]
    filterset_fields = ['is_active', 'division']
    search_fields = ['name', 'description']
    ordering_fields = ['id', 'name', 'created_at']
    ordering = ['id']
    
    def get_serializer_context(self):
        """
        Add TaxRateProfile queryset to the serializer context.
        """
        context = super().get_serializer_context()
        from pricing.models import TaxRateProfile
        context['default_tax_rate_profile_queryset'] = TaxRateProfile.objects.all()
        return context
    
    def get_queryset(self):
        """
        Override get_queryset to handle filtering by division ID and is_active
        """
        queryset = super().get_queryset()
        
        # Log initial queryset count
        logger.info(f"Initial queryset count: {queryset.count()}")
        logger.info(f"Query params: {self.request.query_params}")
        
        # Filter by division if division parameter is provided
        division_id = self.request.query_params.get('division')
        if division_id:
            logger.info(f"Filtering by division_id: {division_id}")
            queryset = queryset.filter(division=division_id)
            logger.info(f"After division filter count: {queryset.count()}")
        
        # Filter by is_active if is_active parameter is provided
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            # Convert string 'true'/'false' to boolean
            is_active_bool = is_active.lower() == 'true'
            logger.info(f"Filtering by is_active: {is_active_bool}")
            queryset = queryset.filter(is_active=is_active_bool)
            logger.info(f"After is_active filter count: {queryset.count()}")
        
        # Log final SQL query
        logger.info(f"Final SQL query: {queryset.query}")
        
        return queryset
    
    def get_paginated_response(self, data, extra_data=None):
        """
        Override to support disabling pagination with paginate=false query param
        and include extra data in the response
        """
        # Check if pagination should be disabled
        paginate = self.request.query_params.get('paginate', 'true').lower()
        if paginate == 'false':
            return Response(data)
    
        # For paginated responses, include any extra data
        response = super().get_paginated_response(data)
        if extra_data:
            response.data.update(extra_data)
        return response
    
    def list(self, request, *args, **kwargs):
        """
        Override list method to handle pagination toggle and include active/inactive counts
        When paginate=false, returns a simple array of categories
        When paginate=true, returns paginated response with counts and metadata
        """
        # Get base queryset (without is_active filter) for accurate counts
        base_queryset = Category.objects.all()
        active_count = base_queryset.filter(is_active=True).count()
        inactive_count = base_queryset.filter(is_active=False).count()
        total_count = active_count + inactive_count
        
        # Get the filtered queryset for results
        queryset = self.filter_queryset(self.get_queryset())
        filtered_count = queryset.count()

        # Check if pagination should be disabled
        paginate = request.query_params.get('paginate', 'true').lower()

        if paginate == 'false':
            # Return simple array without any wrapper
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
    
        # For paginated responses, include counts and pagination info
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(
                serializer.data,
                {
                    'counts': {
                        'active': active_count,
                        'inactive': inactive_count,
                        'total': total_count
                    }
                }
            )

        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'counts': {
                'active': active_count,
                'inactive': inactive_count,
                'total': total_count
            },
            'results': serializer.data,
            'count': filtered_count,
            'current_page': 1,
            'total_pages': 1,
            'page_size': filtered_count
        })
    search_fields = ['name', 'description', 'slug']
    ordering_fields = ['id', 'name', 'division__name', 'sort_order', 'created_at']
    ordering = ['id']
    
    def create(self, request, *args, **kwargs):
        """
        Create a new Category instance.
        Handles temporary images and links them to the category.
        """
        # Store temp_images data before calling super().create() as it will be consumed
        temp_images = request.data.get('temp_images', [])
        
        # Call the parent create method to create the category
        response = super().create(request, *args, **kwargs)
        
        # Process temp_images if present and creation was successful
        if response.status_code == 201 and temp_images:
            try:
                # Get the created category instance
                category_id = response.data['id']
                category = Category.objects.get(id=category_id)
                
                # Use our mock Redis implementation
                from products.mock_redis import mock_redis
                
                # Create a simple tenant-like object with an id attribute
                class TenantLike:
                    def __init__(self, tenant_id, company_id=1):
                        self.id = tenant_id
                        self.company_id = company_id
                
                # Get the client_id from the category
                client_id = category.client_id
                tenant_obj = TenantLike(client_id)
                
                # Process temporary images and link them to the category
                from products.utils import link_temporary_images
                created_images = link_temporary_images(
                    owner_instance=category,
                    owner_type='category',  # Use 'category' as the owner type
                    temp_image_data=temp_images,
                    tenant=tenant_obj,
                    redis_client=mock_redis
                )
                
                # The category's image field is now directly updated in link_temporary_images
                # Just log that we've processed the images
                if created_images:
                    logger.info(f"Category {category.id} image was directly updated in link_temporary_images")
                
                logger.info(f"Successfully linked {len(created_images)} images to category {category.id}")
            except Exception as e:
                logger.error(f"Failed to handle temporary images for category {response.data['id']}: {str(e)}")
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
        
        # Add the new ID to the response data
        if response.status_code == 201:  # Created
            response.data['message'] = f"Category created successfully with ID: {response.data['id']}"
        
        return response
    
    def perform_create(self, serializer):
        """
        Override to avoid client-related functionality until multi-tenancy is fully implemented.
        Assign a default client_id for now to satisfy the database constraint.
        Also set created_by and updated_by fields.
        Optionally set a specific ID for the new record.
        """
        # Get the tenant ID from the request
        tenant_id = getattr(self.request, 'tenant_id', 1)
        
        # Extract user_id from the user object to avoid type errors
        user_id = None
        if hasattr(self.request, 'user') and hasattr(self.request.user, 'id'):
            user_id = self.request.user.id
        elif hasattr(self.request, 'user') and hasattr(self.request.user, 'user_id'):
            user_id = self.request.user.user_id
        elif hasattr(self.request, 'user') and hasattr(self.request.user, '_user_id'):
            # For SimpleTenantUser which stores user_id as _user_id
            user_id = self.request.user._user_id
        
        # Use 1 as default user_id if none is available
        if not user_id:
            user_id = 1
        
        # Get the last ID in the records and increment it by 1, or use a specific starting ID
        last_category = Category.objects.order_by('-id').first()
        next_id = (last_category.id + 1) if last_category else 1
        
        # Check if the user exists in the current tenant's schema
        from django.contrib.auth.models import User
        user_exists = User.objects.filter(id=user_id).exists() if user_id else False
        
        # If user doesn't exist, set created_by_id and updated_by_id to None
        serializer.save(
            client_id=tenant_id, 
            created_by_id=user_id if user_exists else None, 
            updated_by_id=user_id if user_exists else None, 
            company_id=1, 
            id=next_id
        )
    
    def update(self, request, *args, **kwargs):
        """
        Update a Category instance.
        Also handles temporary images during updates.
        """
        # Store temp_images data before calling super().update()
        temp_images = request.data.get('temp_images', [])
        logger.info(f"Category update requested with temp_images: {temp_images}")
        
        # Debug request data
        logger.info(f"Request data: {request.data}")
        
        # Call the parent update method
        response = super().update(request, *args, **kwargs)
        logger.info(f"Response after super().update(): {response.data}")
        
        # Process temp_images if present and update was successful
        if response.status_code == 200 and temp_images:
            logger.info(f"Processing temp_images for category update. Status: {response.status_code}, Temp images: {temp_images}")
            try:
                # Get the updated category instance
                category_id = response.data['id']
                category = Category.objects.get(id=category_id)
                logger.info(f"Retrieved category instance: ID={category.id}, Current image={category.image}")
                
                # Use our mock Redis implementation
                from products.mock_redis import mock_redis
                logger.info(f"Mock Redis keys before: {mock_redis.keys()}")
                
                # Check if temp images exist in Redis
                temp_image_id = temp_images[0].get('id') if temp_images and isinstance(temp_images[0], dict) else None
                if temp_image_id:
                    redis_key = f"temp_image:{temp_image_id}"
                    logger.info(f"Looking for Redis key: {redis_key}, Exists: {redis_key in mock_redis.keys()}")
                
                # Create a simple tenant-like object with an id attribute
                class TenantLike:
                    def __init__(self, tenant_id, company_id=1):
                        self.id = tenant_id
                        self.company_id = company_id
                
                # Get the client_id from the category
                client_id = getattr(category, 'client_id', 1)
                logger.info(f"Using client_id: {client_id}")
                tenant_obj = TenantLike(client_id)
                
                # Import here to avoid circular imports
                from products.utils import link_temporary_images
                
                # Debug the temp_image_data structure
                logger.info(f"Temp image data structure: {type(temp_images)}, Content: {temp_images}")
                
                # Process temporary images and link them to the category
                created_images = link_temporary_images(
                    owner_instance=category,
                    owner_type='category',  # Use 'category' as the owner type
                    temp_image_data=temp_images,
                    tenant=tenant_obj,
                    redis_client=mock_redis
                )
                
                logger.info(f"Created images result: {created_images}")
                
                if created_images:
                    logger.info(f"Category {category.id} image was updated with new temp image")
                    # Refresh the data to show the updated image URL
                    updated_category = Category.objects.get(id=category_id)
                    logger.info(f"Updated category image: {updated_category.image}")
                    response.data['image'] = updated_category.image
                else:
                    logger.warning(f"No images were created/linked for category {category.id}")
                    # Let's inspect the link_temporary_images function parameters
                    logger.info(f"link_temporary_images params: owner_type=category, owner_id={category.id}")
                
                logger.info(f"Successfully linked {len(created_images)} images to category {category.id} during update")
            except Exception as e:
                logger.error(f"Failed to handle temporary images for category update {response.data['id']}: {str(e)}")
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
        elif not temp_images:
            logger.warning("No temp_images found in request data for category update")
        elif response.status_code != 200:
            logger.warning(f"Update response status code is not 200: {response.status_code}")
        
        logger.info(f"Final response data: {response.data}")
        return response
    
   
    def perform_update(self, serializer):
        """
        Set updated_by field when updating an object.
        """
        # Extract user_id from the user object to avoid type errors
        user_id = None
        if hasattr(self.request, 'user') and hasattr(self.request.user, 'id'):
            user_id = self.request.user.id
        elif hasattr(self.request, 'user') and hasattr(self.request.user, 'user_id'):
            user_id = self.request.user.user_id
        elif hasattr(self.request, 'user') and hasattr(self.request.user, '_user_id'):
            # For SimpleTenantUser which stores user_id as _user_id
            user_id = self.request.user._user_id
    
        # Use 1 as default user_id if none is available
        if not user_id:
            user_id = 1
        
        # Check if the user exists in the current tenant's schema
        from django.contrib.auth.models import User
        user_exists = User.objects.filter(id=user_id).exists() if user_id else False
    
        # If user doesn't exist, set updated_by_id to None
        instance = serializer.save(updated_by_id=user_id if user_exists else None, company_id=1)
        
        # Schedule visibility update after transaction commits
        if hasattr(instance, 'id'):
            def update_visibility():
                try:
                    from products.product_visibility import update_category_visibility
                    update_category_visibility(instance.id)
                except Exception:
                    pass
                    
            from django.db import transaction
            transaction.on_commit(update_visibility)
        

class SubcategoryViewSet(CORSMixin, TenantModelViewSet):
    """
    API endpoint for managing Subcategories.
    
    Optional query parameters:
    - paginate: Set to 'false' to disable pagination and return all results
    - category: Filter subcategories by category ID
    - is_active: Filter subcategories by active status (true/false)
    """
    queryset = Subcategory.objects.select_related('category', 'category__division').all()
    serializer_class = SubcategorySerializer
    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter, DjangoFilterBackend]
    filterset_fields = ['is_active', 'category']
    search_fields = ['name', 'description']
    ordering_fields = ['id', 'name', 'category__name', 'sort_order', 'created_at']
    ordering = ['id']
    
    def get_queryset(self):
        """
        Override get_queryset to handle filtering by category ID and is_active
        """
        queryset = super().get_queryset()
        
        # Filter by category if category parameter is provided
        category_id = self.request.query_params.get('category')
        if category_id:
            queryset = queryset.filter(category=category_id)
        
        # Filter by is_active if is_active parameter is provided
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            # Convert string 'true'/'false' to boolean
            is_active_bool = is_active.lower() == 'true'
            queryset = queryset.filter(is_active=is_active_bool)
        
        return queryset
    
    def get_paginated_response(self, data, extra_data=None):
        """
        Override to include extra data in the paginated response.
        """
        response = super().get_paginated_response(data)
        if extra_data:
            response.data.update(extra_data)
        return response
    
    def list(self, request, *args, **kwargs):
        """
        Override list method to handle pagination toggle and include active/inactive counts
        When paginate=false, returns a simple array of subcategories
        When paginate=true, returns paginated response with counts and metadata
        """
        # Get base queryset (all subcategories without filtering)
        base_queryset = Subcategory.objects.all()
        
        # Get counts from base queryset (all subcategories in database)
        active_count = base_queryset.filter(is_active=True).count()
        inactive_count = base_queryset.filter(is_active=False).count()
        total_count = active_count + inactive_count
        
        # Get filtered queryset (with all filters applied)
        queryset = self.filter_queryset(self.get_queryset())
        filtered_count = queryset.count()
        
        # Check if pagination should be disabled
        paginate = request.query_params.get('paginate', 'true').lower()
        
        if paginate == 'false':
            # Return simple array without any wrapper
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
    
        # For paginated responses, include counts and pagination info
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(
                serializer.data,
                extra_data={
                    'counts': {
                        'active': active_count,
                        'inactive': inactive_count,
                        'total': total_count
                    },
                    'filtered_count': filtered_count
                }
            )
        
        # Fallback for non-paginated response (shouldn't normally reach here)
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'results': serializer.data,
            'count': filtered_count,
            'counts': {
                'active': active_count,
                'inactive': inactive_count,
                'total': total_count
            },
            'filtered_count': filtered_count
        })
    
    def create(self, request, *args, **kwargs):
        """
        Create a new Subcategory instance.
        Handles temporary images and links them to the subcategory.
        """
        # Store temp_images data before calling super().create() as it will be consumed
        temp_images = request.data.get('temp_images', [])
        
        # Call the parent create method to create the subcategory
        response = super().create(request, *args, **kwargs)
        
        # Process temp_images if present and creation was successful
        if response.status_code == 201 and temp_images:
            try:
                # Get the created subcategory instance
                subcategory_id = response.data['id']
                subcategory = Subcategory.objects.get(id=subcategory_id)
                
                # Use our mock Redis implementation
                from products.mock_redis import mock_redis
                
                # Create a simple tenant-like object with an id attribute
                class TenantLike:
                    def __init__(self, tenant_id, company_id=1):
                        self.id = tenant_id
                        self.company_id = company_id
                
                # Get the client_id from the subcategory
                client_id = subcategory.client_id
                tenant_obj = TenantLike(client_id)
                
                # Process temporary images and link them to the subcategory
                from products.utils import link_temporary_images
                created_images = link_temporary_images(
                    owner_instance=subcategory,
                    owner_type='subcategory',  # Use 'subcategory' as the owner type
                    temp_image_data=temp_images,
                    tenant=tenant_obj,
                    redis_client=mock_redis
                )
                
                # The subcategory's image field is now directly updated in link_temporary_images
                # Just log that we've processed the images
                if created_images:
                    logger.info(f"Subcategory {subcategory.id} image was directly updated in link_temporary_images")
                
                logger.info(f"Successfully linked {len(created_images)} images to subcategory {subcategory.id}")
            except Exception as e:
                logger.error(f"Failed to handle temporary images for subcategory {response.data['id']}: {str(e)}")
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
        
        # Add the new ID to the response data
        if response.status_code == 201:  # Created
            response.data['message'] = f"Subcategory created successfully with ID: {response.data['id']}"
        
        return response
    
    def perform_create(self, serializer):
        """
        Override to avoid client-related functionality until multi-tenancy is fully implemented.
        Assign a default client_id for now to satisfy the database constraint.
        Also set created_by and updated_by fields.
        Optionally set a specific ID for the new record.
        """
        # Get the tenant ID from the request
        tenant_id = getattr(self.request, 'tenant_id', 1)
        
        # Extract user_id from the user object to avoid type errors
        user_id = None
        if hasattr(self.request, 'user') and hasattr(self.request.user, 'id'):
            user_id = self.request.user.id
        elif hasattr(self.request, 'user') and hasattr(self.request.user, 'user_id'):
            user_id = self.request.user.user_id
        elif hasattr(self.request, 'user') and hasattr(self.request.user, '_user_id'):
            # For SimpleTenantUser which stores user_id as _user_id
            user_id = self.request.user._user_id
        
        # Use 1 as default user_id if none is available
        if not user_id:
            user_id = 1
            
        # Check if the user exists in the current tenant's schema
        from django.contrib.auth.models import User
        user_exists = User.objects.filter(id=user_id).exists() if user_id else False
        
        # Get the last ID in the records and increment it by 1, or use a specific starting ID
        last_subcategory = Subcategory.objects.order_by('-id').first()
        next_id = (last_subcategory.id + 1) if last_subcategory else 1
        
        serializer.save(
            client_id=tenant_id, 
            created_by_id=user_id if user_exists else None, 
            updated_by_id=user_id if user_exists else None, 
            company_id=1, 
            id=next_id
        )
    
    def perform_update(self, serializer):
        """
        Set updated_by field when updating an object.
        """
        # Extract user_id from the user object to avoid type errors
        user_id = None
        if hasattr(self.request, 'user') and hasattr(self.request.user, 'id'):
            user_id = self.request.user.id
        elif hasattr(self.request, 'user') and hasattr(self.request.user, 'user_id'):
            user_id = self.request.user.user_id
        elif hasattr(self.request, 'user') and hasattr(self.request.user, '_user_id'):
            # For SimpleTenantUser which stores user_id as _user_id
            user_id = self.request.user._user_id
    
        # Use 1 as default user_id if none is available
        if not user_id:
            user_id = 1
        
        # Check if the user exists in the current tenant's schema
        from django.contrib.auth.models import User
        user_exists = User.objects.filter(id=user_id).exists() if user_id else False
    
        # If user doesn't exist, set updated_by_id to None
        serializer.save(updated_by_id=user_id if user_exists else None, company_id=1)
     
    def update(self, request, *args, **kwargs):
        """
        Update a Subcategory instance.
        Also handles temporary images during updates and updates product visibility if
        customer group selling channel relationships change.
        """
        # Store temp_images data before calling super().update()
        temp_images = request.data.get('temp_images', [])
        logger.info(f"Subcategory update requested with temp_images: {temp_images}")
        
        # Check if the image has been explicitly deleted (set to null/empty)
        image_explicitly_deleted = 'image' in request.data and (request.data['image'] is None or request.data['image'] == '')
        logger.info(f"Image explicitly deleted: {image_explicitly_deleted}, image value: {request.data.get('image', 'not_set')}")
        
        # Call the parent update method
        response = super().update(request, *args, **kwargs)
        
        # If the update was successful and the image has been deleted without a replacement
        if response.status_code == 200 and image_explicitly_deleted and not temp_images:
            try:
                # Get the subcategory instance
                subcategory_id = response.data['id']
                subcategory = Subcategory.objects.get(id=subcategory_id)
                
                # Clear the image field if it hasn't been cleared already
                if subcategory.image:
                    logger.info(f"Explicitly clearing image for subcategory {subcategory_id}")
                    subcategory.image = None
                    subcategory.image_alt_text = ''
                    subcategory.save(update_fields=['image', 'image_alt_text'])
                    
                    # Update response data
                    response.data['image'] = None
                    response.data['image_alt_text'] = ''
            except Exception as e:
                logger.error(f"Failed to clear image for subcategory {kwargs.get('pk')}: {str(e)}")
        
        # Process temp_images if present and update was successful
        if response.status_code == 200 and temp_images:
            try:
                # Get the updated subcategory instance
                subcategory_id = response.data['id']
                subcategory = Subcategory.objects.get(id=subcategory_id)
                
                # Use our mock Redis implementation
                from products.mock_redis import mock_redis
                
                # Create a simple tenant-like object with an id attribute
                class TenantLike:
                    def __init__(self, tenant_id, company_id=1):
                        self.id = tenant_id
                        self.company_id = company_id
                
                # Get the client_id from the subcategory
                client_id = subcategory.client_id
                tenant_obj = TenantLike(client_id)
                
                # Import here to avoid circular imports
                from products.utils import link_temporary_images
                
                # Process temporary images and link them to the subcategory
                created_images = link_temporary_images(
                    owner_instance=subcategory,
                    owner_type='subcategory',  # Use 'subcategory' as the owner type
                    temp_image_data=temp_images,
                    tenant=tenant_obj,
                    redis_client=mock_redis
                )
                
                if created_images:
                    logger.info(f"Subcategory {subcategory.id} image was updated with new temp image")
                    # Refresh the data to show the updated image URL
                    updated_subcategory = Subcategory.objects.get(id=subcategory_id)
                    response.data['image'] = updated_subcategory.image
                
                logger.info(f"Successfully linked {len(created_images)} images to subcategory {subcategory.id} during update")
            except Exception as e:
                logger.error(f"Failed to handle temporary images for subcategory update {response.data['id']}: {str(e)}")
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
        
        # Update product visibility for all products in this subcategory if the update was successful
        if response.status_code == 200:
            try:
                subcategory_id = response.data['id']
                def update_visibility():
                    try:
                        update_subcategory_visibility(subcategory_id)
                    except Exception:
                        pass
                transaction.on_commit(update_visibility)
            except Exception:
                pass
        return response
     

class UnitOfMeasureViewSet(CORSMixin, TenantModelViewSet):
    """
    API endpoint for managing Units of Measure.
    
    Optional query parameters:
    - paginate: Set to 'false' to disable pagination and return all results
    """
    queryset = UnitOfMeasure.objects.all().order_by('id')
    serializer_class = UnitOfMeasureSerializer
    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter, DjangoFilterBackend]
    filterset_fields = ['is_active']  # Enable filtering by is_active
    search_fields = ['symbol', 'name']
    ordering_fields = ['id', 'name', 'symbol', 'created_at']
    ordering = ['id']
    
    def get_paginated_response(self, data, extra_data=None):
        """
        Override to include extra data in the paginated response.
        """
        response = super().get_paginated_response(data)
        if extra_data:
            response.data.update(extra_data)
        return response
        
    def list(self, request, *args, **kwargs):
        """
        Override list method to handle pagination toggle
        When paginate=false, returns a simple array of units
        When paginate=true, returns paginated response with counts and metadata
        """
        # Get base queryset (without filtering) for accurate counts
        base_queryset = UnitOfMeasure.objects.all()
        active_count = base_queryset.filter(is_active=True).count()
        inactive_count = base_queryset.filter(is_active=False).count()
        total_count = active_count + inactive_count
        
        # Get filtered queryset (with all filters applied)
        queryset = self.filter_queryset(self.get_queryset())
        filtered_count = queryset.count()
        
        # Check if pagination should be disabled
        paginate = request.query_params.get('paginate', 'true').lower()
        
        if paginate == 'false':
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        
        # Apply pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(
                serializer.data,
                extra_data={
                    'counts': {
                        'active': active_count,
                        'inactive': inactive_count,
                        'total': total_count
                    },
                    'filtered_count': filtered_count
                }
            )
        
        # Fallback for non-paginated response (shouldn't normally reach here)
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'results': serializer.data,
            'counts': {
                'active': active_count,
                'inactive': inactive_count,
                'total': total_count
            },
            'filtered_count': filtered_count
        })
    
    def perform_create(self, serializer):
        """
        Override to avoid client-related functionality until multi-tenancy is fully implemented.
        Assign a default client_id for now to satisfy the database constraint.
        Also set created_by and updated_by fields.
        Optionally set a specific ID for the new record.
        """
        # Get the tenant ID from the request
        tenant_id = getattr(self.request, 'tenant_id', 1)
        
        # Extract user_id from the user object to avoid type errors
        user_id = None
        if hasattr(self.request, 'user') and hasattr(self.request.user, 'id'):
            user_id = self.request.user.id
        elif hasattr(self.request, 'user') and hasattr(self.request.user, 'user_id'):
            user_id = self.request.user.user_id
        elif hasattr(self.request, 'user') and hasattr(self.request.user, '_user_id'):
            # For SimpleTenantUser which stores user_id as _user_id
            user_id = self.request.user._user_id
        
        # Use 1 as default user_id if none is available
        if not user_id:
            user_id = 1
            
        # Check if the user exists in the current tenant's schema
        from django.contrib.auth.models import User
        user_exists = User.objects.filter(id=user_id).exists() if user_id else False
        
        # Get the last ID in the records and increment it by 1, or use a specific starting ID
        last_uom = UnitOfMeasure.objects.order_by('-id').first()
        next_id = (last_uom.id + 1) if last_uom else 1
        
        serializer.save(
            client_id=tenant_id, 
            created_by_id=user_id if user_exists else None, 
            updated_by_id=user_id if user_exists else None, 
            company_id=1, 
            id=next_id
        )
    
    def perform_update(self, serializer):
        """
        Set updated_by field when updating an object.
        """
        # Extract user_id from the user object to avoid type errors
        user_id = None
        if hasattr(self.request, 'user') and hasattr(self.request.user, 'id'):
            user_id = self.request.user.id
        elif hasattr(self.request, 'user') and hasattr(self.request.user, 'user_id'):
            user_id = self.request.user.user_id
        elif hasattr(self.request, 'user') and hasattr(self.request.user, '_user_id'):
            # For SimpleTenantUser which stores user_id as _user_id
            user_id = self.request.user._user_id

        # Use 1 as default user_id if none is available
        if not user_id:
            user_id = 1
    
        # Check if the user exists in the current tenant's schema
        from django.contrib.auth.models import User
        user_exists = User.objects.filter(id=user_id).exists() if user_id else False

        # If user doesn't exist, set updated_by_id to None
        serializer.save(updated_by_id=user_id if user_exists else None, company_id=1)


class ProductStatusViewSet(CORSMixin, TenantModelViewSet):
    """
    API endpoint for managing Product Statuses.
    
    Optional query parameters:
    - paginate: Set to 'false' to disable pagination and return all results
    """
    queryset = ProductStatus.objects.all()
    serializer_class = ProductStatusSerializer
    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated]
    filterset_fields = ['is_active']  # Enable filtering by is_active
    filter_backends = [filters.SearchFilter, filters.OrderingFilter, DjangoFilterBackend]
    search_fields = ['name']
    ordering_fields = ['id', 'name', 'created_at']
    ordering = ['id']
    
    def get_paginated_response(self, data, extra_data=None):
        """
        Override to include extra data in the paginated response.
        """
        response = super().get_paginated_response(data)
        if extra_data:
            response.data.update(extra_data)
        return response
        
    
    def list(self, request, *args, **kwargs):
        """
        Override list method to handle pagination toggle
        When paginate=false, returns a simple array of statuses
        When paginate=true, returns paginated response with counts and metadata
        """
        # Get base queryset (without filtering) for accurate counts
        base_queryset = ProductStatus.objects.all()
        active_count = base_queryset.filter(is_active=True).count()
        inactive_count = base_queryset.filter(is_active=False).count()
        total_count = active_count + inactive_count
    
        # Get filtered queryset (with all filters applied)
        queryset = self.filter_queryset(self.get_queryset())
        filtered_count = queryset.count()
    
        # Check if pagination should be disabled
        paginate = request.query_params.get('paginate', 'true').lower()
    
        if paginate == 'false':
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
    
        # Apply pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(
                serializer.data,
                extra_data={
                    'counts': {
                        'active': active_count,
                        'inactive': inactive_count,
                        'total': total_count
                    },
                    'filtered_count': filtered_count
                }
            )
    
        # Fallback for non-paginated response (shouldn't normally reach here)
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'results': serializer.data,
            'counts': {
                'active': active_count,
                'inactive': inactive_count,
                'total': total_count
            },
            'filtered_count': filtered_count
        })
    
    def perform_create(self, serializer):
        """
        Override to avoid client-related functionality until multi-tenancy is fully implemented.
        Assign a default client_id for now to satisfy the database constraint.
        Also set created_by and updated_by fields.
        Optionally set a specific ID for the new record.
        """
        # Get the tenant ID from the request
        tenant_id = getattr(self.request, 'tenant_id', 1)
        
        # Extract user_id from the user object to avoid type errors
        user_id = None
        if hasattr(self.request, 'user') and hasattr(self.request.user, 'id'):
            user_id = self.request.user.id
        elif hasattr(self.request, 'user') and hasattr(self.request.user, 'user_id'):
            user_id = self.request.user.user_id
        elif hasattr(self.request, 'user') and hasattr(self.request.user, '_user_id'):
            # For SimpleTenantUser which stores user_id as _user_id
            user_id = self.request.user._user_id
        
        # Use 1 as default user_id if none is available
        if not user_id:
            user_id = 1
            
        # Check if the user exists in the current tenant's schema
        from django.contrib.auth.models import User
        user_exists = User.objects.filter(id=user_id).exists() if user_id else False
        
        # Get the last ID in the records and increment it by 1, or use a specific starting ID
        last_status = ProductStatus.objects.order_by('-id').first()
        next_id = (last_status.id + 1) if last_status else 1
        
        serializer.save(
            client_id=tenant_id, 
            created_by_id=user_id if user_exists else None, 
            updated_by_id=user_id if user_exists else None, 
            company_id=1, 
            id=next_id
        )
    
    def perform_update(self, serializer):
        """
        Set updated_by field when updating an object.
        """
        # Extract user_id from the user object to avoid type errors
        user_id = None
        if hasattr(self.request, 'user') and hasattr(self.request.user, 'id'):
            user_id = self.request.user.id
        elif hasattr(self.request, 'user') and hasattr(self.request.user, 'user_id'):
            user_id = self.request.user.user_id
        elif hasattr(self.request, 'user') and hasattr(self.request.user, '_user_id'):
            # For SimpleTenantUser which stores user_id as _user_id
            user_id = self.request.user._user_id

        # Use 1 as default user_id if none is available
        if not user_id:
            user_id = 1
    
        # Check if the user exists in the current tenant's schema
        from django.contrib.auth.models import User
        user_exists = User.objects.filter(id=user_id).exists() if user_id else False

        # If user doesn't exist, set updated_by_id to None
        serializer.save(updated_by_id=user_id if user_exists else None, company_id=1)


class ActiveDivisionHierarchyView(CORSMixin, APIView):
    """
    API endpoint to retrieve active divisions with their categories and subcategories.
    Only includes divisions that have active products.
    Returns id, name, image, and image_alt_text fields for each level of the hierarchy.
    Pagination is disabled for this endpoint.
    """
    authentication_classes = [TenantSchemaMiddleware]
    permission_classes = [permissions.AllowAny]

    def get(self, request, *args, **kwargs):
        # Import models here to avoid circular imports
        from products.models import Product, Category, Subcategory
        
        # Get active products
        active_products = Product.objects.filter(
            is_active=True,
            publication_status='ACTIVE'
        )
        
        # Get active divisions that have products
        active_division_ids = active_products.values_list('division_id', flat=True).distinct()
        
        # Get active categories that have products
        active_category_ids = active_products.values_list('category_id', flat=True).distinct()
        
        # Get active subcategories that have products
        active_subcategory_ids = active_products.values_list('subcategory_id', flat=True).distinct()
        
        # Get active divisions with their details
        active_divisions = Division.objects.filter(
            id__in=active_division_ids,
            is_active=True
        ).order_by('id').values('id', 'name', 'image', 'image_alt_text')
        
        result = []
        for division in active_divisions:
            # Convert image field to URL if it exists
            image_url = None
            if division['image']:
                image_url = default_storage.url(division['image'])
                
            division_data = {
                'id': division['id'],
                'name': division['name'],
                'image': image_url,
                'image_alt_text': division['image_alt_text'],
                'categories': []
            }
            
            # Get active categories for this division that have products
            categories = Category.objects.filter(
                id__in=active_category_ids,
                division_id=division['id'],
                is_active=True
            ).order_by('id').values('id', 'name', 'image', 'image_alt_text')

            for category in categories:
                # Convert image field to URL if it exists
                category_image_url = None
                if category['image']:
                    category_image_url = default_storage.url(category['image'])
                
                category_data = {
                    'id': category['id'],
                    'name': category['name'],
                    'image': category_image_url,
                    'image_alt_text': category['image_alt_text'],
                    'subcategories': []
                }

                # Get active subcategories for this category that have products
                subcategories = Subcategory.objects.filter(
                    id__in=active_subcategory_ids,
                    category_id=category['id'],
                    is_active=True
                ).order_by('id').values('id', 'name', 'image', 'image_alt_text')
                
                # Process subcategories to include image URLs
                subcategory_list = []
                for subcategory in subcategories:
                    subcategory_image_url = None
                    if subcategory['image']:
                        subcategory_image_url = default_storage.url(subcategory['image'])
                    
                    subcategory_list.append({
                        'id': subcategory['id'],
                        'name': subcategory['name'],
                        'image': subcategory_image_url,
                        'image_alt_text': subcategory['image_alt_text']
                    })

                # Add subcategories to the category
                category_data['subcategories'] = subcategory_list
                
                # Only add categories that have subcategories or are meant to be shown
                division_data['categories'].append(category_data)

# Only add divisions that have categories
            if division_data['categories']:
                result.append(division_data)

        return Response(result)


class DeleteImageView(CORSMixin, APIView):
    """
    API endpoint for deleting images from both database and GCS storage.

    This view handles deletion of images based on owner_type and image_id.
    It supports different owner types: 'division', 'category', 'subcategory', 'product', 'variant'.
    """
    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [permissions.AllowAny]  # Authentication temporarily disabled
    
    def delete(self, request, format=None):
        """
        Delete an image from both database and GCS storage.
        
        Required parameters:
        - owner_type: Type of the image owner ('division', 'category', 'subcategory')
        - image_id: ID of the image to delete
        
        Returns:
        - 200 OK: Image successfully deleted
        - 400 Bad Request: Invalid parameters
        - 404 Not Found: Image not found
        - 500 Internal Server Error: Error during deletion
        """
        try:
            # Get parameters from request data
            owner_type = request.data.get('owner_type')
            image_id = request.data.get('image_id')
            
            # Validate parameters
            if not owner_type or not image_id:
                return Response({
                    'status': 'error',
                    'message': 'Both owner_type and image_id are required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get tenant information from JWT authentication
            try:
                # Extract tenant info from the authenticated user
                tenant = request.tenant
                client_id = tenant.client_id
                company_id = tenant.id
                logger.info(f"Using tenant: {tenant.schema_name}, client_id: {client_id}, company_id: {company_id}")
            except Exception as e:
                # Fallback to default client_id for development
                logger.warning(f"Could not extract tenant info: {str(e)}. Using default client_id=1")
                client_id = 1
                company_id = 1
            
            # Check if image_id is a numeric ID or an image URL/path
            is_numeric = False
            try:
                numeric_id = int(image_id)
                is_numeric = True
            except (ValueError, TypeError):
                # Not a numeric ID, treat as an image URL or path
                is_numeric = False
                
            # Find and delete the image based on owner_type
            if owner_type.lower() == 'division':
                if is_numeric:
                    # Handle division image deletion by ID
                    division = get_object_or_404(Division, id=numeric_id, client_id=client_id)
                    image_path = division.image.name if division.image else None
                    # Only delete the image file, not the division record
                    if division.image:
                        division.image.delete(save=True)
                else:
                    # Clean the image_id to handle different formats
                    # First, check if it's a full path in the format 'divisions/filename.jpg'
                    if image_id.startswith('divisions/'):
                        # This is already in the right format
                        clean_image_id = image_id
                    else:
                        # Try to extract the filename and create the path
                        parts = image_id.split('/')
                        filename = parts[-1].split('?')[0]  # Remove any query parameters
                        clean_image_id = f'divisions/{filename}'
                        
                    logger.info(f"Looking for division with image path: {clean_image_id}")
                    
                    # First try exact match
                    divisions = Division.objects.filter(client_id=client_id, image=clean_image_id)
                    if not divisions.exists():
                        # Then try contains match
                        divisions = Division.objects.filter(client_id=client_id, image__contains=filename)
                        
                    if not divisions.exists():
                        return Response({
                            'status': 'error',
                            'message': f'No division found with image matching {clean_image_id}'
                        }, status=status.HTTP_404_NOT_FOUND)
                    
                    division = divisions.first()
                    image_path = division.image.name if division.image else None
                    logger.info(f"Found division with image: {image_path}")
                    
                    if division.image:
                        division.image.delete(save=True)
                        
            elif owner_type.lower() == 'category':
                if is_numeric:
                    # Handle category image deletion by ID
                    category = get_object_or_404(Category, id=numeric_id, client_id=client_id)
                    image_path = category.image.name if category.image else None
                    # Only delete the image file, not the category record
                    if category.image:
                        category.image.delete(save=True)
                else:
                    # Clean the image_id to handle different formats
                    # First, check if it's a full path in the format 'categories/filename.jpg'
                    if image_id.startswith('categories/'):
                        # This is already in the right format
                        clean_image_id = image_id
                    else:
                        # Try to extract the filename and create the path
                        parts = image_id.split('/')
                        filename = parts[-1].split('?')[0]  # Remove any query parameters
                        clean_image_id = f'categories/{filename}'
                        
                    logger.info(f"Looking for category with image path: {clean_image_id}")
                    
                    # First try exact match
                    categories = Category.objects.filter(client_id=client_id, image=clean_image_id)
                    if not categories.exists():
                        # Then try contains match
                        categories = Category.objects.filter(client_id=client_id, image__contains=filename)
                        
                    if not categories.exists():
                        return Response({
                            'status': 'error',
                            'message': f'No category found with image matching {clean_image_id}'
                        }, status=status.HTTP_404_NOT_FOUND)
                    
                    category = categories.first()
                    image_path = category.image.name if category.image else None
                    logger.info(f"Found category with image: {image_path}")
                    
                    if category.image:
                        category.image.delete(save=True)
                        
            elif owner_type.lower() == 'subcategory':
                if is_numeric:
                    # Handle subcategory image deletion by ID
                    subcategory = get_object_or_404(Subcategory, id=numeric_id, client_id=client_id)
                    image_path = subcategory.image.name if subcategory.image else None
                    # Only delete the image file, not the subcategory record
                    if subcategory.image:
                        subcategory.image.delete(save=True)
                else:
                    # Clean the image_id to handle different formats
                    # First, check if it's a full path in the format 'subcategories/filename.jpg'
                    if image_id.startswith('subcategories/'):
                        # This is already in the right format
                        clean_image_id = image_id
                    else:
                        # Try to extract the filename and create the path
                        parts = image_id.split('/')
                        filename = parts[-1].split('?')[0]  # Remove any query parameters
                        clean_image_id = f'subcategories/{filename}'
                        
                    logger.info(f"Looking for subcategory with image path: {clean_image_id}")
                    
                    # First try exact match
                    subcategories = Subcategory.objects.filter(client_id=client_id, image=clean_image_id)
                    if not subcategories.exists():
                        # Then try contains match
                        subcategories = Subcategory.objects.filter(client_id=client_id, image__contains=filename)
                        
                    if not subcategories.exists():
                        return Response({
                            'status': 'error',
                            'message': f'No subcategory found with image matching {clean_image_id}'
                        }, status=status.HTTP_404_NOT_FOUND)
                    
                    subcategory = subcategories.first()
                    image_path = subcategory.image.name if subcategory.image else None
                    logger.info(f"Found subcategory with image: {image_path}")
                    
                    if subcategory.image:
                        subcategory.image.delete(save=True)
            elif owner_type.lower() == 'product':
                if not is_numeric:
                    return Response({
                        'status': 'error',
                        'message': 'For product images, image_id must be a numeric ID of the ProductImage record'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Get the product image
                try:
                    product_image = ProductImage.objects.get(id=numeric_id, client_id=client_id)
                    image_path = product_image.image.name if product_image.image else None
                    
                    # Delete the product image record
                    product_image.delete()
                    logger.info(f"Deleted product image with ID: {numeric_id}")
                    
                except ProductImage.DoesNotExist:
                    return Response({
                        'status': 'error',
                        'message': f'No product image found with ID: {numeric_id}'
                    }, status=status.HTTP_404_NOT_FOUND)
                
            elif owner_type.lower() == 'variant':
                if not is_numeric:
                    return Response({
                        'status': 'error',
                        'message': 'For variant images, image_id must be a numeric ID of the ProductImage record'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Get the variant image (which is a ProductImage)
                try:
                    variant_image = ProductImage.objects.get(id=numeric_id, client_id=client_id)
                    
                    # Check if this image is used as a variant's default image
                    from products.models import ProductVariant
                    variants_using_image = ProductVariant.objects.filter(image=variant_image, product__client_id=client_id)
                    
                    if variants_using_image.exists():
                        # If this image is a variant's default image, clear the reference first
                        for variant in variants_using_image:
                            variant.image = None
                            variant.save()
                    
                    image_path = variant_image.image.name if variant_image.image else None
                    
                    # Delete the variant image record
                    variant_image.delete()
                    logger.info(f"Deleted variant image with ID: {numeric_id}")
                    
                except ProductImage.DoesNotExist:
                    return Response({
                        'status': 'error',
                        'message': f'No variant image found with ID: {numeric_id}'
                    }, status=status.HTTP_404_NOT_FOUND)
                
            else: 
                return Response({
                    'status': 'error',
                    'message': f'Invalid owner_type: {owner_type}. Supported types: division, category, subcategory, product, variant'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Delete the image file from GCS if it exists and wasn't already deleted by the model's delete method
            if image_path and default_storage.exists(image_path):
                try:
                    default_storage.delete(image_path)
                    logger.info(f"Deleted image file from GCS: {image_path}")
                except Exception as e:
                    logger.error(f"Error deleting image file from GCS: {str(e)}")
                    # Continue execution even if GCS deletion fails
            
            return Response({
                'status': 'success',
                'message': f'Image successfully deleted from {owner_type}',
                'image_path': image_path
            })
            
        except ValidationError as e:
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error in DeleteImageView: {str(e)}")
            return Response({
                'status': 'error',
                'message': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CategoryCustomerGroupSellingChannelsView(generics.GenericAPIView):
    """
    API endpoint to get customer group selling channel IDs for a given category/subcategory or product.
    
    Query parameters:
    - category_id: ID of the category (optional)
    - subcategory_id: ID of the subcategory (optional)
    - product_id: ID of the product (optional)
    - Exactly one of category_id or subcategory_id must be provided
    - product_id is optional and can be combined with either category_id or subcategory_id
    """
    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        category_id = request.query_params.get('category_id')
        subcategory_id = request.query_params.get('subcategory_id')
        product_id = request.query_params.get('product_id')
        
        # Validate that exactly one of category_id or subcategory_id is provided
        if not (bool(category_id) ^ bool(subcategory_id)):
            return Response({"error": "Exactly one of category_id or subcategory_id must be provided"}, 
                           status=status.HTTP_400_BAD_REQUEST)

        try:
            # Determine response type based on the input parameter
            response_type = "category" if category_id else "subcategory"
            
            # Use raw SQL for better performance and to ensure we get channels from all levels
            with connection.cursor() as cursor:
                query_params = []
                
                if category_id:
                    # Check if category exists and get its division
                    cursor.execute("""
                        SELECT id, division_id FROM products_category WHERE id = %s
                    """, [category_id])
                    category_result = cursor.fetchone()
                    
                    if not category_result:
                        return Response({"error": "Category not found"}, 
                                      status=status.HTTP_404_NOT_FOUND)
                    
                    division_id = category_result[1]
                    
                    # Build SQL to get all channels for this category and its division
                    sql = """
                        SELECT DISTINCT customer_group_selling_channel_id 
                        FROM (
                            -- Category channels
                            SELECT customer_group_selling_channel_id
                            FROM product_category_exclusions
                            WHERE category_id = %s AND is_active = TRUE
                    """
                    query_params.append(category_id)
                    
                    # Add division channels if division_id exists
                    if division_id:
                        sql += """
                            UNION
                            -- Division channels
                            SELECT customer_group_selling_channel_id
                            FROM product_division_exclusions
                            WHERE division_id = %s AND is_active = TRUE
                        """
                        query_params.append(division_id)
                    
                    sql += ") AS combined_channels"
                
                else:  # subcategory_id is provided
                    # Check if subcategory exists and get its category and division
                    cursor.execute("""
                        SELECT s.id, c.id, c.division_id 
                        FROM products_subcategory s
                        JOIN products_category c ON s.category_id = c.id
                        WHERE s.id = %s
                    """, [subcategory_id])
                    subcategory_result = cursor.fetchone()
                    
                    if not subcategory_result:
                        return Response({"error": "Subcategory not found"}, 
                                      status=status.HTTP_404_NOT_FOUND)
                    
                    # Extract data from result
                    _, category_id, division_id = subcategory_result
                    
                    # Build SQL to get all channels for this subcategory, its category, and division
                    sql = """
                        SELECT DISTINCT customer_group_selling_channel_id 
                        FROM (
                            -- Subcategory channels
                            SELECT customer_group_selling_channel_id
                            FROM product_subcategory_exclusions
                            WHERE subcategory_id = %s AND is_active = TRUE
                    """
                    query_params.append(subcategory_id)
                    
                    # Add category channels
                    if category_id:
                        sql += """
                            UNION
                            -- Category channels
                            SELECT customer_group_selling_channel_id
                            FROM product_category_exclusions
                            WHERE category_id = %s AND is_active = TRUE
                        """
                        query_params.append(category_id)
                    
                    # Add division channels
                    if division_id:
                        sql += """
                            UNION
                            -- Division channels
                            SELECT customer_group_selling_channel_id
                            FROM product_division_exclusions
                            WHERE division_id = %s AND is_active = TRUE
                        """
                        query_params.append(division_id)
                    
                    sql += ") AS combined_channels"
                
                # Execute the query to get channels from all levels
                cursor.execute(sql, query_params)
                channels_found = [row[0] for row in cursor.fetchall()]
                
                # Get product channels if product_id is provided
                product_channels = []
                if product_id:
                    cursor.execute("""
                        SELECT customer_group_selling_channel_id
                        FROM product_product_exclusions
                        WHERE product_id = %s AND is_active = TRUE
                    """, [product_id])
                    product_channels = [row[0] for row in cursor.fetchall()]
            
            response_data = {
                f"{response_type}_channels": channels_found,
                "product_channels": product_channels
            }
            
            return Response(response_data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)