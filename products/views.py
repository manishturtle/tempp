from django.shortcuts import render
from django.db.models import Q
from rest_framework import viewsets, status, filters
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import os
import logging
from erp_backend.middleware import CustomJWTAuthentication, TenantSchemaMiddleware
from rest_framework.permissions import IsAuthenticated

logger = logging.getLogger(__name__)

from core.viewsets import TenantModelViewSet
from django.utils.text import slugify
from products.models import (
    Product,
    ProductImage,
    ProductVariant,
    KitComponent,
    PRODUCT_TYPE_CHOICES,
    PublicationStatus,
)
from products.serializers import (
    ProductSerializer,
    ProductImageSerializer,
    ProductVariantSerializer,
    KitComponentSerializer,
)
from products.filters import ProductFilter
from rest_framework import permissions


class ProductViewSet(TenantModelViewSet):
    """
    ViewSet for managing products.

    This viewset provides CRUD operations for the Product model,
    including related attribute values and images.
    """

    serializer_class = ProductSerializer
    # authentication_classes = [CustomJWTAuthentication]
    authentication_classes = [TenantSchemaMiddleware]
    permission_classes = [permissions.AllowAny]  # Authentication temporarily disabled
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_class = ProductFilter
    search_fields = [
        "name",
        "sku",
        "description",
        "short_description",
        "seo_title",
        "seo_description",
        "seo_keywords",
        "tags",
        "category__name",
        "subcategory__name",
        "variants__sku",  # Only include existing fields
    ]
    ordering_fields = ["name", "created_at", "updated_at", "display_price", "price"]
    ordering = ["id"]
    http_method_names = ["get", "post", "put", "patch", "delete", "head", "options"]

    def perform_update(self, serializer):
        """
        Override perform_update to handle product visibility updates.
        This method is called during PUT/PATCH operations.
        """
        # Call parent's perform_update to handle the basic update
        super().perform_update(serializer)

        # Get the updated instance
        instance = serializer.instance

        # Schedule product visibility calculation to run after transaction commit
        from django.db import transaction
        from products.product_visibility import update_product_visibility

        def calculate_visibility():
            try:
                logger.info(
                    f"Recalculating visibility for updated product {instance.id}"
                )
                # Use update_product_visibility for existing products
                update_product_visibility(instance.id)
                logger.info(
                    f"Visibility recalculation completed for product {instance.id}"
                )
            except Exception as e:
                logger.warning(f"Failed to recalculate product visibility: {str(e)}")

        # Register the function to run after the current transaction completes
        transaction.on_commit(calculate_visibility)

    @action(detail=False, methods=["get"], url_path="search")
    def search_products(self, request, *args, **kwargs):
        """
        Advanced product search endpoint that searches across all product fields.

        Query Parameters:
        - q: The search term (optional)
        - in_stock: Filter by in-stock status (true/false)
        - min_price: Minimum price filter
        - max_price: Maximum price filter
        - category: Filter by category ID
        - brand: Filter by brand ID
        - subcategory: Filter by subcategory ID
        - sort: Field to sort by (e.g., name, price, -created_at)
        - page: Page number for pagination
        - page_size: Number of items per page
        """
        try:
            # Get the base queryset with tenant filtering
            queryset = self.filter_queryset(self.get_queryset())
            search_term = request.query_params.get("q", "").strip()

            # Apply search filters if search term is provided
            if search_term:
                search_conditions = Q()
                search_fields = [
                    "name__icontains",
                    "description__icontains",
                    "short_description__icontains",
                    "sku__icontains",
                    "seo_title__icontains",
                    "seo_description__icontains",
                    "seo_keywords__icontains",
                    "tags__icontains",
                    "category__name__icontains",
                    "subcategory__name__icontains",
                    "variants__sku__icontains",
                ]

                # Create OR conditions for each search field
                for field in search_fields:
                    search_conditions |= Q(**{field: search_term})

                # Apply all search conditions with distinct to avoid duplicates
                queryset = queryset.filter(search_conditions).distinct()

            # Apply additional filters
            # 1. In-stock filter
            in_stock = request.query_params.get("in_stock")
            if in_stock is not None:
                in_stock = in_stock.lower() == "true"
                if in_stock:
                    queryset = queryset.filter(total_quantity__gt=0)
                else:
                    queryset = queryset.filter(total_quantity__lte=0)

            # 2. Price range filters
            min_price = request.query_params.get("min_price")
            if min_price is not None:
                try:
                    queryset = queryset.filter(price__gte=float(min_price))
                except (ValueError, TypeError):
                    pass

            max_price = request.query_params.get("max_price")
            if max_price is not None:
                try:
                    queryset = queryset.filter(price__lte=float(max_price))
                except (ValueError, TypeError):
                    pass

            # 3. Category filter
            category_id = request.query_params.get("category")
            if category_id is not None:
                try:
                    queryset = queryset.filter(category_id=int(category_id))
                except (ValueError, TypeError):
                    pass

            # 4. Brand filter
            brand_id = request.query_params.get("brand")
            if brand_id is not None:
                try:
                    queryset = queryset.filter(brand_id=int(brand_id))
                except (ValueError, TypeError):
                    pass

            # 5. Subcategory filter
            subcategory_id = request.query_params.get("subcategory")
            if subcategory_id is not None:
                try:
                    queryset = queryset.filter(subcategory_id=int(subcategory_id))
                except (ValueError, TypeError):
                    pass

            # Apply sorting
            sort_by = request.query_params.get("sort")
            if sort_by in [f[0] for f in self.ordering_fields]:
                queryset = queryset.order_by(sort_by)

            # Paginate the results
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)

            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)

        except Exception as e:
            logger.error(f"Error in search_products: {str(e)}", exc_info=True)
            return Response(
                {"error": "An error occurred while processing your request."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["post"], url_path="by-skus")
    def get_products_by_skus(self, request, *args, **kwargs):
        """
        Get products by a list of SKUs.

        Request body should be a JSON object with a 'skus' key containing an array of SKUs:
        {
            "skus": ["SKU1", "SKU2", "SKU3"]
        }
        """
        skus = request.data.get("skus", [])

        if not skus or not isinstance(skus, list):
            return Response(
                {"error": "Please provide a list of SKUs in the 'skus' field"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get products where either the main SKU or any variant SKU matches
        products = (
            self.get_queryset()
            .filter(Q(sku__in=skus) | Q(variants__sku__in=skus))
            .distinct()
        )

        page = self.paginate_queryset(products)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(products, many=True)
        return Response(serializer.data)

        # Apply additional filters
        in_stock = request.query_params.get("in_stock")
        if in_stock is not None:
            in_stock = in_stock.lower() == "true"
            if in_stock:
                queryset = queryset.filter(total_quantity__gt=0)
            else:
                queryset = queryset.filter(total_quantity__lte=0)

        min_price = request.query_params.get("min_price")
        if min_price is not None:
            try:
                queryset = queryset.filter(price__gte=float(min_price))
            except (ValueError, TypeError):
                pass

        max_price = request.query_params.get("max_price")
        if max_price is not None:
            try:
                queryset = queryset.filter(price__lte=float(max_price))
            except (ValueError, TypeError):
                pass

        category_id = request.query_params.get("category")
        if category_id is not None:
            queryset = queryset.filter(category_id=category_id)

        brand_id = request.query_params.get("brand")
        if brand_id is not None:
            queryset = queryset.filter(brand_id=brand_id)

        # Apply sorting
        sort_by = request.query_params.get("sort")
        if sort_by in [f[0] for f in self.ordering_fields]:
            queryset = queryset.order_by(sort_by)

        # Paginate the results
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def get_queryset(self):
        """
        Get the list of items for this view.

        This method should always be used rather than accessing self.queryset directly,
        as self.queryset gets evaluated only once, and those results are cached for all
        subsequent requests.
        """
        # Get the tenant from the request
        tenant = getattr(self.request, "tenant", None)

        # Extract client_id from tenant object or use default
        if hasattr(tenant, "id") and tenant.id:
            client_id = tenant.id
        else:
            # Default to client_id=1 for development
            client_id = 1
            logger.info(
                f"No valid tenant found in request, using default client_id={client_id}"
            )

        # Base filtering using client_id (ensure it's an integer)
        queryset = Product.objects.filter(client_id=int(client_id))

        # Apply necessary select_related/prefetch_related for performance
        queryset = queryset.select_related(
            "category", "subcategory", "productstatus", "uom"
        ).prefetch_related(
            "images",
            "attribute_values__attribute",
            "attribute_values__value_option",
            "attribute_values__multi_values__attribute_option",
            "attribute_groups",
            "variant_defining_attributes",
        )

        # Log the query and count for debugging
        logger.info(f"Product query: {queryset.query}")
        logger.info(f"Product count: {queryset.count()}")

        return queryset

    def list(self, request, *args, **kwargs):
        """
        List all products for the tenant.

        This method overrides the default list method to ensure proper pagination
        and to add additional debugging information.

        Parameters:
        - all_records: If set to 'true', returns all records without pagination
        """
        queryset = self.filter_queryset(self.get_queryset())

        # Log the filtered queryset count
        logger.info(f"Filtered product count: {queryset.count()}")

        # Check if all_records parameter is set to true
        all_records = request.query_params.get("all_records", "").lower() == "true"

        if not all_records:
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                logger.info(
                    f"Returning {len(serializer.data)} products with pagination"
                )
                return self.get_paginated_response(serializer.data)

        # Return all records if pagination is disabled or all_records=true
        serializer = self.get_serializer(queryset, many=True)
        logger.info(f"Returning {len(serializer.data)} products without pagination")
        return Response(serializer.data)

    def get_serializer_context(self):
        """
        Add client information to the serializer context.
        """
        context = super().get_serializer_context()

        # Attempt to get client from request
        try:
            # First try to get client from request
            client = self.request.tenant if hasattr(self.request, "tenant") else None
        except AttributeError:
            client = None

        # If no client found, try to get from authentication
        if (
            not client
            and hasattr(self.request, "user")
            and self.request.user.is_authenticated
        ):
            from tenants.models import Tenant

            try:
                client = Tenant.objects.filter(users=self.request.user).first()
            except Exception:
                client = None

        # If still no client, use a default
        if not client:
            from tenants.models import Tenant

            client = Tenant.objects.first()

        # Add client to context
        context["client"] = client
        context["request"] = self.request

        return context

    def create(self, request, *args, **kwargs):
        """
        Create a new product.

        POST /api/v1/products/

        Args:
            request (Request): Request object containing product data

        Returns:
            Response: Created product data with 201 status code
        """
        print(f"Received POST request to create product: {request.data}")

        # Get client information
        client = getattr(self.request, "tenant", None)
        client_id = getattr(client, "id", 1)
        company_id = getattr(client, "company_id", 1)

        # Handle foreign key fields with _id suffix
        data = request.data.copy()
        for field in ["division", "uom", "productstatus", "default_tax_rate_profile"]:
            field_id = f"{field}_id"
            if field_id in data:
                data[field] = data.pop(field_id)

        # Ensure default_tax_rate_profile is properly handled
        if "default_tax_rate_profile" in data:
            logger.info(
                f"Found default_tax_rate_profile in request data: {data['default_tax_rate_profile']}"
            )
            # Make sure it's treated as an integer
            try:
                data["default_tax_rate_profile"] = int(data["default_tax_rate_profile"])
                logger.info(
                    f"Converted default_tax_rate_profile to int: {data['default_tax_rate_profile']}"
                )
            except (ValueError, TypeError):
                if (
                    data["default_tax_rate_profile"] == ""
                    or data["default_tax_rate_profile"] is None
                ):
                    data["default_tax_rate_profile"] = None
                    logger.info("Set empty default_tax_rate_profile to None")

        # Generate unique slug and SKU
        name = data.get("name", "")
        base_slug = data.get("slug") or slugify(name)
        base_sku = data.get("sku")

        # Ensure slug uniqueness
        from products.models import Product

        counter = 1
        slug = base_slug

        while Product.objects.filter(client_id=client_id, slug=slug).exists():
            counter += 1
            slug = f"{base_slug}-{counter}"

        # If SKU is provided, ensure its uniqueness
        if base_sku:
            sku = base_sku
            counter = 1
            while Product.objects.filter(client_id=client_id, sku=sku).exists():
                counter += 1
                sku = f"{base_sku}-{counter}"
            data["sku"] = sku

        # Set the unique values and client info
        data["slug"] = slug
        data["sku"] = sku
        data["client_id"] = client_id
        data["company_id"] = company_id

        # Find the next available ID
        last_product = Product.objects.all().order_by("id").last()
        next_id = 1 if not last_product else last_product.id + 1

        # Add the ID to the data
        data["id"] = next_id

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)

        try:

            # Get user information for audit fields
            user = (
                self.request.user
                if hasattr(self.request, "user") and self.request.user.is_authenticated
                else None
            )
            if not user:
                # If no authenticated user, try to find a default admin user
                from django.contrib.auth import get_user_model

                User = get_user_model()
                user = User.objects.filter(is_superuser=True).first()
                if not user:
                    # If no admin user exists, create one
                    user = User.objects.create_superuser(
                        username="admin", email="admin@example.com", password="admin"
                    )

            # Get the validated data
            validated_data = serializer.validated_data

            # Create the product using Django ORM
            from products.models import Product
            import json

            # Prepare JSON fields
            tags = validated_data.get("tags", "")
            faqs = validated_data.get("faqs", [])

            # Get SEO fields (these can't be null in the database)
            name = validated_data.get("name", "")
            short_description = validated_data.get("short_description", "")
            seo_title = validated_data.get("seo_title", "") or request.data.get(
                "seo_title", ""
            )
            seo_description = validated_data.get(
                "seo_description", ""
            ) or request.data.get("seo_description", "")
            seo_keywords = validated_data.get("seo_keywords", "") or request.data.get(
                "seo_keywords", ""
            )

            # Use raw SQL to insert the product and bypass Django ORM's foreign key constraints
            from django.db import connection
            import json
            from psycopg2.extras import Json

            # Get the category ID
            category_id = (
                validated_data.get("category").id
                if validated_data.get("category")
                else None
            )

            # Get IDs for related objects
            subcategory_id = (
                validated_data.get("subcategory").id
                if validated_data.get("subcategory")
                else None
            )
            division_id = (
                validated_data.get("division").id
                if validated_data.get("division")
                else None
            )
            uom_id = validated_data.get("uom").id if validated_data.get("uom") else None
            productstatus_id = (
                validated_data.get("productstatus").id
                if validated_data.get("productstatus")
                else None
            )
            currency_code_id = (
                validated_data.get("currency_code").id
                if validated_data.get("currency_code", None)
                else None
            )

            # Debug logging for default_tax_rate_profile
            logger.info(
                f"Raw default_tax_rate_profile from request: {request.data.get('default_tax_rate_profile')}"
            )
            logger.info(f"validated_data keys: {validated_data.keys()}")
            logger.info(
                f"default_tax_rate_profile in validated_data: {validated_data.get('default_tax_rate_profile')}"
            )

            default_tax_rate_profile_id = None
            if validated_data.get("default_tax_rate_profile"):
                default_tax_rate_profile_id = validated_data.get(
                    "default_tax_rate_profile"
                ).id
                logger.info(
                    f"Setting default_tax_rate_profile_id to: {default_tax_rate_profile_id}"
                )

            # Convert JSON fields
            tags_json = Json(tags) if tags else Json([])
            faqs_json = Json(faqs) if faqs else Json([])

            # Insert directly into the database using raw SQL
            with connection.cursor() as cursor:
                query = """
                INSERT INTO products_product (
                    created_at, updated_at, created_by_id, updated_by_id, 
                    client_id, company_id, product_type, publication_status,
                    name, slug, sku, description, short_description,
                    category_id, subcategory_id, division_id, uom_id,
                    productstatus_id, currency_code_id, default_tax_rate_profile_id,
                    is_tax_exempt, display_price, compare_at_price, is_active, allow_reviews,
                    inventory_tracking_enabled, backorders_allowed,
                    quantity_on_hand, is_serialized, is_lotted,
                    pre_order_available, pre_order_date, seo_title,
                    seo_description, seo_keywords, tags, faqs, workflow_flow_id,
                    low_stock_count, min_count, max_count,
                    cost_price, active_from_date, active_to_date
                ) VALUES (
                    NOW(), NOW(), %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                ) RETURNING id
                """

                # Check if the user exists in the current tenant schema
                user_exists_query = "SELECT COUNT(*) FROM auth_user WHERE id = %s"
                cursor.execute(user_exists_query, [user.id])
                user_exists = cursor.fetchone()[0] > 0

                # Use user ID if the user exists in the tenant schema, otherwise use NULL
                created_by_id = user.id if user_exists else None
                updated_by_id = user.id if user_exists else None

                logger.info(
                    f"User ID: {user.id}, Exists in schema: {user_exists}, Using created_by_id: {created_by_id}"
                )

                # Get workflow_flow_id from request data
                workflow_flow_id = request.data.get("workflow_flow_id")
                logger.info(f"workflow_flow_id from request: {workflow_flow_id}")

                cursor.execute(
                    query,
                    [
                        created_by_id,
                        updated_by_id,
                        client_id,
                        company_id,
                        validated_data.get("product_type", "REGULAR"),
                        validated_data.get("publication_status", "DRAFT"),
                        name,
                        validated_data.get("slug", ""),
                        validated_data.get("sku", ""),
                        validated_data.get("description", ""),
                        short_description,
                        category_id,
                        subcategory_id,
                        division_id,
                        uom_id,
                        productstatus_id,
                        currency_code_id,
                        default_tax_rate_profile_id,  # Use the variable we prepared earlier
                        validated_data.get("is_tax_exempt", False),
                        validated_data.get("display_price", 0),
                        validated_data.get("compare_at_price", 0),
                        validated_data.get("is_active", True),
                        validated_data.get("allow_reviews", True),
                        validated_data.get("inventory_tracking_enabled", False),
                        validated_data.get("backorders_allowed", False),
                        10,  # Always force quantity_on_hand to be 10
                        validated_data.get("is_serialized", False),
                        validated_data.get("is_lotted", False),
                        validated_data.get("pre_order_available", False),
                        validated_data.get("pre_order_date"),
                        seo_title,
                        seo_description,
                        seo_keywords,
                        tags_json,
                        faqs_json,
                        workflow_flow_id,  # Add workflow_flow_id to the query parameters
                        validated_data.get("low_stock_count", 0),
                        validated_data.get("min_count", 1),
                        validated_data.get("max_count"),
                        validated_data.get("cost_price"),
                        validated_data.get("active_from_date"),
                        validated_data.get("active_to_date"),
                    ],
                )

                # Get the ID of the newly created product
                product_id = cursor.fetchone()[0]

            # Fetch the created product
            product = Product.objects.get(id=product_id)

            # Handle attribute values if present in the request
            attribute_values_input = request.data.get("attribute_values_input", [])
            if attribute_values_input:
                from products.models import (
                    ProductAttributeValue,
                    ProductAttributeMultiValue,
                )
                from attributes.models import Attribute, AttributeOption

                for attr_data in attribute_values_input:
                    attribute_id = attr_data.get("attribute")
                    attribute = Attribute.objects.get(id=attribute_id)

                    # Create the base attribute value
                    attr_value = ProductAttributeValue.objects.create(
                        client_id=client_id,
                        company_id=company_id,
                        product=product,
                        attribute=attribute,
                    )

                    # Set the appropriate value field based on attribute type
                    if attribute.data_type == "TEXT":
                        attr_value.value_text = attr_data.get("value")
                    elif attribute.data_type == "NUMBER":
                        attr_value.value_number = attr_data.get("value")
                    elif attribute.data_type == "BOOLEAN":
                        attr_value.value_boolean = attr_data.get("value")
                    elif attribute.data_type == "DATE":
                        attr_value.value_date = attr_data.get("value")
                    elif attribute.data_type == "SELECT":
                        option_id = attr_data.get("value")
                        if option_id:
                            attr_value.value_option = AttributeOption.objects.get(
                                id=option_id
                            )
                    elif attribute.data_type == "MULTI_SELECT":
                        option_ids = attr_data.get("value", [])
                        attr_value.save()  # Save first to get an ID
                        # Create multi-value entries
                        for option_id in option_ids:
                            option = AttributeOption.objects.get(id=option_id)
                            ProductAttributeMultiValue.objects.create(
                                product_attribute_value=attr_value,
                                attribute_option=option,
                            )

                    attr_value.save()

            # Handle attribute_groups if present in the request
            attribute_groups = request.data.get("attribute_groups", [])
            if attribute_groups:
                from attributes.models import AttributeGroup

                # Add attribute groups to the product
                for group_id in attribute_groups:
                    try:
                        group = AttributeGroup.objects.get(id=group_id)
                        product.attribute_groups.add(group)
                    except AttributeGroup.DoesNotExist:
                        logger.warning(
                            f"AttributeGroup with ID {group_id} does not exist"
                        )

            # Handle variant_defining_attributes if present in the request
            variant_defining_attributes = request.data.get(
                "variant_defining_attributes", []
            )
            if variant_defining_attributes:
                from attributes.models import Attribute

                # Add variant defining attributes to the product
                for attr_id in variant_defining_attributes:
                    try:
                        attr = Attribute.objects.get(id=attr_id)
                        product.variant_defining_attributes.add(attr)
                    except Attribute.DoesNotExist:
                        logger.warning(f"Attribute with ID {attr_id} does not exist")

            # Handle customer_group_selling_channel_ids if present in the request
            customer_group_selling_channel_ids = request.data.get(
                "customer_group_selling_channel_ids", []
            )
            if customer_group_selling_channel_ids:
                from customers.models import CustomerGroupSellingChannel

                logger.info(
                    f"Processing customer group selling channels: {customer_group_selling_channel_ids}"
                )
                # Add customer group selling channels to the product
                for cgsc_id in customer_group_selling_channel_ids:
                    try:
                        cgsc = CustomerGroupSellingChannel.objects.get(id=cgsc_id)
                        product.customer_group_selling_channels.add(cgsc)
                        logger.info(
                            f"Added customer group selling channel {cgsc_id} to product {product.id}"
                        )
                    except CustomerGroupSellingChannel.DoesNotExist:
                        logger.warning(
                            f"CustomerGroupSellingChannel with ID {cgsc_id} does not exist"
                        )

            # Handle temporary images if present in the request
            temp_images = request.data.get("temp_images", [])
            if temp_images:
                try:
                    # Use our mock Redis implementation
                    from products.mock_redis import mock_redis

                    # Create a simple tenant-like object with an id attribute
                    class TenantLike:
                        def __init__(self, tenant_id, company_id=1):
                            self.id = tenant_id
                            self.company_id = company_id

                    # Use the client_id that's already defined at the beginning of the method
                    tenant_obj = TenantLike(client_id)

                    logger.info(
                        f"Processing {len(temp_images)} temporary images for product {product.id}"
                    )
                    logger.info(f"Temp images data: {temp_images}")

                    # Import here to avoid circular imports
                    from products.utils import link_temporary_images

                    # Process temporary images and link them to the product
                    created_images = link_temporary_images(
                        owner_instance=product,
                        owner_type="product",
                        temp_image_data=temp_images,
                        tenant=tenant_obj,
                        redis_client=mock_redis,
                    )

                    logger.info(
                        f"Successfully linked {len(created_images)} images to product {product.id}"
                    )
                except Exception as e:
                    logger.error(
                        f"Failed to handle temporary images for product {product.id}: {str(e)}"
                    )
                    import traceback

                    logger.error(f"Traceback: {traceback.format_exc()}")

            # Process zone restrictions if provided
            zone_restrictions_input = request.data.get("zone_restrictions_input", [])
            if zone_restrictions_input:
                try:
                    from products.models import ProductZoneRestriction
                    from shipping_zones.models import ShippingZone

                    logger.info(
                        f"Processing {len(zone_restrictions_input)} zone restrictions for product {product.id}"
                    )

                    for restriction_data in zone_restrictions_input:
                        zone_id = restriction_data.get("zone")
                        restriction_mode = restriction_data.get("restriction_mode")

                        # Validate inputs
                        if not zone_id:
                            logger.error("Zone ID is missing")
                            continue

                        if not restriction_mode or restriction_mode not in [
                            "INCLUDE",
                            "EXCLUDE",
                        ]:
                            logger.error(
                                f"Invalid restriction_mode: {restriction_mode}"
                            )
                            continue

                        # Check if zone exists
                        if not ShippingZone.objects.filter(id=zone_id).exists():
                            logger.warning(f"Zone with ID {zone_id} does not exist")
                            continue

                        # Create zone restriction
                        try:
                            # Create the zone restriction with required fields only
                            restriction = ProductZoneRestriction.objects.create(
                                product=product,
                                zone_id=zone_id,
                                restriction_mode=restriction_mode,
                                client_id=client_id,
                                company_id=company_id,
                            )
                            logger.info(
                                f"Created zone restriction with ID: {restriction.id}"
                            )
                        except Exception as e:
                            logger.error(f"Failed to create zone restriction: {str(e)}")
                except Exception as e:
                    logger.error(f"Error processing zone restrictions: {str(e)}")

            # Schedule product visibility calculation to run after transaction commit
            # This ensures the API can return quickly without waiting for visibility calculation
            from django.db import transaction
            from products.product_visibility import create_product_visibility

            def calculate_visibility():
                try:
                    logger.info(f"Calculating visibility for product {product.id}")
                    # Use create_product_visibility for new products
                    create_product_visibility(product.id)
                    logger.info(
                        f"Visibility calculation completed for product {product.id}"
                    )
                except Exception as e:
                    logger.warning(f"Failed to calculate product visibility: {str(e)}")

            # Register the function to run after the current transaction completes
            transaction.on_commit(calculate_visibility)

            # Return the serialized product
            serializer = self.get_serializer(product)

        except Exception as e:
            print(f"Error creating product: {str(e)}")
            raise

        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )


class ProductVariantViewSet(TenantModelViewSet):
    """
    ViewSet for managing product variants.

    This viewset provides CRUD operations for the ProductVariant model,
    with automatic association to the parent product.
    """

    serializer_class = ProductVariantSerializer
    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Get the list of variants for this view, filtered by product and tenant.
        """
        product_id = self.kwargs.get("product_pk")

        # For development/testing, use client_id filtering instead of tenant
        client_id = getattr(self.request, "tenant", None)

        if client_id is None:
            # Default to client_id=1 for development
            client_id = 1
            logger.info(
                f"No tenant found in request, using default client_id={client_id}"
            )

        return (
            ProductVariant.objects.filter(product_id=product_id, client_id=client_id)
            .select_related("product")
            .prefetch_related("options", "images")
        )

    def perform_create(self, serializer):
        """
        Create a new product variant, automatically setting the product and tenant.
        """
        product_id = self.kwargs.get("product_pk")

        # For development/testing, use client_id filtering instead of tenant
        client_id = getattr(self.request, "tenant", None)

        if client_id is None:
            # Default to client_id=1 for development
            client_id = 1
            logger.info(
                f"No tenant found in request, using default client_id={client_id}"
            )

        product = Product.objects.get(id=product_id, client_id=client_id)

        if product.product_type != "PARENT":
            raise ValidationError(
                "Variants can only be created for PARENT type products."
            )

        serializer.save(product=product, client_id=client_id)

    def perform_update(self, serializer):
        """
        Update a product variant, ensuring the parent product is of PARENT type.
        """
        product = serializer.instance.product
        if product.product_type != "PARENT":
            raise ValidationError(
                "Variants can only be updated for PARENT type products."
            )

        serializer.save()


class ProductImageViewSet(TenantModelViewSet):
    """
    ViewSet for managing product images.

    This viewset provides CRUD operations for the ProductImage model,
    with automatic association to the parent product.
    """

    serializer_class = ProductImageSerializer
    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        """
        Get the queryset for product images, filtered by product and client.
        """
        # Get the product ID from the URL
        product_pk = self.kwargs.get("product_pk")

        # For development/testing, use client_id filtering instead of tenant
        client_id = getattr(self.request, "tenant", None)

        if client_id is None:
            # Default to client_id=1 for development
            client_id = 1
            logger.info(
                f"No tenant found in request, using default client_id={client_id}"
            )

        # Filter by product and client
        return ProductImage.objects.filter(product_id=product_pk, client_id=client_id)

    def perform_create(self, serializer):
        """
        Create a new product image, automatically setting the product and client.
        """
        # Get the product ID from the URL
        product_pk = self.kwargs.get("product_pk")

        # For development/testing, use client_id filtering instead of tenant
        client_id = getattr(self.request, "tenant", None)

        if client_id is None:
            # Default to client_id=1 for development
            client_id = 1
            logger.info(
                f"No tenant found in request, using default client_id={client_id}"
            )

        # Get the product
        product = Product.objects.get(id=product_pk, client_id=client_id)

        # Save with the product and client
        serializer.save(
            product=product,
            client_id=client_id,
            company_id=(
                getattr(client_id, "company_id", 1)
                if hasattr(client_id, "company_id")
                else 1
            ),
        )


class KitComponentViewSet(TenantModelViewSet):
    """
    ViewSet for managing kit components.

    This viewset provides CRUD operations for the KitComponent model,
    with automatic association to the parent kit product.
    """

    serializer_class = KitComponentSerializer
    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Get the queryset for kit components, filtered by kit product and client.
        """
        # Get the product ID from the URL
        product_pk = self.kwargs.get("product_pk")

        # For development/testing, use client_id filtering instead of tenant
        client_id = getattr(self.request, "tenant", None)

        if client_id is None:
            # Default to client_id=1 for development
            client_id = 1
            logger.info(
                f"No tenant found in request, using default client_id={client_id}"
            )

        # Filter by kit product and client
        return KitComponent.objects.filter(
            kit_product_id=product_pk, client_id=client_id
        ).select_related("component_product", "component_variant")

    def perform_create(self, serializer):
        """
        Create a new kit component, automatically setting the kit product and client.
        Also ensure the parent product is of KIT type.
        """
        # Get the product ID from the URL
        product_pk = self.kwargs.get("product_pk")

        # For development/testing, use client_id filtering instead of tenant
        client_id = getattr(self.request, "tenant", None)

        if client_id is None:
            # Default to client_id=1 for development
            client_id = 1
            logger.info(
                f"No tenant found in request, using default client_id={client_id}"
            )

        # Get the kit product
        kit_product = Product.objects.get(id=product_pk, client_id=client_id)

        # Ensure the product is of KIT type
        if kit_product.product_type != "KIT":
            raise ValidationError("Components can only be added to KIT type products.")

        # Save with the kit product and client
        serializer.save(
            kit_product=kit_product,
            client_id=client_id,
            company_id=(
                getattr(client_id, "company_id", 1)
                if hasattr(client_id, "company_id")
                else 1
            ),
        )

    def perform_update(self, serializer):
        """
        Update a kit component, ensuring the parent product is of KIT type.
        """
        # Get the product ID from the URL
        product_pk = self.kwargs.get("product_pk")

        # For development/testing, use client_id filtering instead of tenant
        client_id = getattr(self.request, "tenant", None)

        if client_id is None:
            # Default to client_id=1 for development
            client_id = 1
            logger.info(
                f"No tenant found in request, using default client_id={client_id}"
            )

        # Ensure the parent product is of KIT type
        try:
            kit_product = Product.objects.get(id=product_pk, client_id=client_id)
            if kit_product.product_type != "KIT":
                raise ValidationError(
                    "Components can only be updated for products of KIT type."
                )
        except Product.DoesNotExist:
            raise ValidationError("Kit product does not exist.")

        # Save the kit component
        serializer.save(
            client_id=client_id,
            company_id=(
                getattr(client_id, "company_id", 1)
                if hasattr(client_id, "company_id")
                else 1
            ),
        )


class GcsTestView(viewsets.ViewSet):
    def test_gcs(self, request):
        try:
            # Test writing a file
            test_content = "This is a test file for GCS"
            test_path = "catalogue-images/test/test_file.txt"

            # Write to GCS
            with default_storage.open(test_path, "w") as f:
                f.write(test_content)

            # Test reading the file
            with default_storage.open(test_path, "r") as f:
                content = f.read()

            # Clean up
            default_storage.delete(test_path)

            return Response(
                {
                    "status": "success",
                    "message": "GCS configuration is working correctly!",
                    "file_content": content,
                }
            )

        except Exception as e:
            return Response(
                {"status": "error", "message": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
