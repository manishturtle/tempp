from rest_framework import viewsets, permissions, status, views, mixins, generics
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import views, status, permissions
from django.utils.translation import gettext_lazy as _
from django.shortcuts import get_object_or_404
from django.conf import settings
import os
import uuid
from datetime import datetime
from django.core.files.storage import default_storage
from django.conf import settings
from django.http import HttpResponse
from urllib.parse import urlparse
import logging
from google.cloud import storage
import datetime as dt
from urllib.parse import quote

logger = logging.getLogger(__name__)

# Initialize GCS client
storage_client = storage.Client.from_service_account_json(settings.GS_CREDENTIALS_FILE)
from .models import LandingPage, ContentBlock
from .serializers import (
    LandingPageSerializer,
    ContentBlockSerializer,
    ContentBlockCreateUpdateSerializer,
    ContentBlockOrderSerializer,
)
from typing import Dict, Any, List, Optional, Union
from django.db import transaction
from erp_backend.middleware import CustomJWTAuthentication, TenantSchemaMiddleware
from rest_framework.permissions import IsAuthenticated


class LandingPageImageUploadView(views.APIView):
    """
    API endpoint for uploading images for landing pages and storing them in Google Cloud Storage.
    Returns the complete URL to access the uploaded image.
    """

    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs) -> Response:
        """
        Upload an image for landing pages to Google Cloud Storage.

        Returns:
            Response with the complete URL to access the uploaded image.
        """
        if "image" not in request.FILES:
            return Response(
                {"detail": _("No image file provided")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        image_file = request.FILES["image"]
        client_id = getattr(request, "tenant", {}).get("client_id", 1)

        # Generate a unique filename with timestamp and UUID
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        unique_id = str(uuid.uuid4())[:8]  # Use first 8 characters of UUID
        filename_parts = os.path.splitext(image_file.name)
        safe_filename = f"{filename_parts[0].replace(' ', '_')}_{timestamp}_{unique_id}{filename_parts[1]}"

        # Define folder structure: landingpage/{client_id}/images/
        destination_path = f"landingpage/{client_id}/images/{safe_filename}"

        try:
            # Save using Django's storage (which uses GCS)
            path = default_storage.save(destination_path, image_file)

            # Get the public URL with the default storage
            image_url = default_storage.url(path)
            return Response({"gcs_path": path, "url": image_url}, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {"detail": _("Error uploading image: {}").format(str(e))},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class LandingPageImageDeleteView(views.APIView):
    """
    API endpoint for deleting images from Google Cloud Storage.
    Accepts a URL and deletes the corresponding file.
    """

    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def _extract_gcs_path(self, url: str) -> str:
        """
        Extract the GCS path from a GCS URL.

        Args:
            url: The GCS URL of the file

        Returns:
            str: The extracted GCS path
        """
        try:
            # Handle storage.googleapis.com URLs
            if "storage.googleapis.com" in url:
                # Extract the part after the bucket name but before any query parameters
                parts = (
                    url.split("storage.googleapis.com/")[-1].split("?")[0].split("/")
                )

                # The first part is the bucket name, we need everything after that
                if len(parts) > 1 and parts[0] == settings.GS_BUCKET_NAME:
                    # Join all parts except the bucket name
                    path = "/".join(parts[1:])
                    print(f"Extracted path without bucket: {path}")
                    return path
                elif len(parts) > 1:
                    path = "/".join(parts)
                    print(f"Extracted complete path: {path}")
                    return path

            # For an explicit path like 'catalogue-images/landingpage/1/images/file.png'
            if url.startswith("catalogue-images/"):
                return url

            # For a direct path provided
            return url
        except Exception as e:
            print(f"Error extracting path: {str(e)}")
            # As a fallback, just return the URL as is
            return url

    def post(self, request, *args, **kwargs) -> Response:
        """
        Delete an image from Google Cloud Storage.

        Request body:
            - url: The URL or path of the image to delete

        Returns:
            Response indicating success or failure.
        """
        url = request.data.get("url")

        if not url:
            return Response(
                {"detail": _("No image URL provided")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Extract path components from URL
            if "storage.googleapis.com" in url:
                # For a full storage URL with query parameters
                path_part = url.split("storage.googleapis.com/")[-1].split("?")[0]
                print(f"Path part from URL: {path_part}")

                # Check if the path includes the bucket name
                if path_part.startswith(f"{settings.GS_BUCKET_NAME}/"):
                    # Remove the bucket name from the path
                    path = path_part[len(settings.GS_BUCKET_NAME) + 1 :]
                else:
                    path = path_part
            else:
                # If it's not a storage URL, use the path as is
                path = url

            print(f"Attempting to delete file at path: {path}")

            # Try direct deletion
            if default_storage.exists(path):
                default_storage.delete(path)
                return Response(
                    {"detail": _("Image deleted successfully")},
                    status=status.HTTP_200_OK,
                )

            # Try finding the file by filename only (fallback)
            filename = path.split("/")[-1] if "/" in path else path
            client_id = getattr(request, "tenant", {}).get("client_id", 1)
            alternate_paths = [
                f"catalogue-images/landingpage/{client_id}/images/{filename}",
                f"landingpage/{client_id}/images/{filename}",
                filename,
            ]

            for alt_path in alternate_paths:
                print(f"Trying alternate path: {alt_path}")
                if default_storage.exists(alt_path):
                    default_storage.delete(alt_path)
                    return Response(
                        {
                            "detail": _("Image deleted successfully from {}").format(
                                alt_path
                            )
                        },
                        status=status.HTTP_200_OK,
                    )

            # If we get here, we couldn't find the file
            return Response(
                {
                    "detail": _("Image not found. Tried paths: {} and {}").format(
                        path, ", ".join(alternate_paths)
                    )
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        except Exception as e:
            import traceback

            traceback.print_exc()
            return Response(
                {"detail": _("Error deleting image: {}").format(str(e))},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class LandingPageView(views.APIView):
    """
    API endpoint for retrieving landing page data with all content blocks by ID.
    This is a public endpoint that provides the page structure for rendering.
    """

    authentication_classes = [TenantSchemaMiddleware]
    permission_classes = [permissions.AllowAny]

    def get(
        self, request, tenant_slug: str = None, page_id: int = None, *args, **kwargs
    ) -> Response:
        """
        Get the landing page with its content blocks by page ID and tenant.

        Args:
            tenant_slug: The tenant schema identifier
            page_id: The ID of the landing page to retrieve.
        """
        if not page_id or not tenant_slug:
            return Response(
                {"detail": _("Tenant slug and page ID are required")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get client_id from request tenant or default to 1
        tenant = getattr(request, "tenant", None)
        client_id = getattr(tenant, "client_id", 1) if tenant else 1

        try:
            # Get the landing page by ID and client_id
            landing_page = LandingPage.objects.get(
                id=page_id, client_id=client_id, is_active=True
            )
        except (LandingPage.DoesNotExist, ValueError):
            return Response(
                {"detail": _("Landing page not found")},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Serialize the landing page with its blocks
        serializer = LandingPageSerializer(landing_page)
        return Response(serializer.data)


class AdminLandingPageViewSet(viewsets.ModelViewSet):
    """
    API endpoint for admin users to manage landing pages.
    This is a protected endpoint that requires admin privileges.
    """

    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = LandingPageSerializer
    lookup_field = "slug"

    def get_queryset(self):
        # Get client_id from request or default to 1
        client_id = getattr(self.request, "tenant", {}).get("client_id", 1)
        queryset = LandingPage.objects.filter(client_id=client_id)
        logger.info("[AdminLandingPageViewSet] get_queryset for user %s, client_id %s: count=%d, SQL=%s", self.request.user, client_id, queryset.count(), str(queryset.query))
        return queryset

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        # Only use the serializer, which now handles signed URLs for all HERO_CAROUSEL images
        return Response(serializer.data)

    
    def _generate_signed_url(self, gcs_path):
        """
        Generate a signed URL for a GCS path
        """
        try:
            if not gcs_path:
                return gcs_path
            
            # Get the bucket name from settings
            bucket_name = settings.GS_BUCKET_NAME
            
            # If it's already a full URL, extract the blob name
            if gcs_path.startswith('https://storage.googleapis.com/'):
                blob_name = gcs_path.replace(f"https://storage.googleapis.com/{bucket_name}/", "")
            else:
                # It's already a blob path
                blob_name = gcs_path
            
            # Get the bucket and blob
            bucket = storage_client.bucket(bucket_name)
            blob = bucket.blob(blob_name)
            
            # Check if the blob exists
            if blob.exists():
                # Generate a signed URL with 7-day expiry
                signed_url = blob.generate_signed_url(
                    version="v4",
                    expiration=dt.timedelta(days=7),
                    method="GET"
                )
                return signed_url
            else:
                logger.warning(f"Blob does not exist: {blob_name}")
                return gcs_path
                
        except Exception as e:
            logger.error(f"Error generating signed URL for {gcs_path}: {str(e)}")
            return gcs_path
    def perform_create(self, serializer):
        # Get client_id from request or default to 1
        client_id = getattr(self.request, "tenant", {}).get("client_id", 1)
        company_id = getattr(self.request, "tenant", {}).get("company_id", 1)

        # Set the client_id and company_id values
        serializer.save(client_id=client_id, company_id=company_id)



class AdminContentBlockViewSet(viewsets.ModelViewSet):
    """
    API endpoint for admin users to manage content blocks.
    This is a protected endpoint that requires admin privileges.
    """

    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Get client_id from request or default to 1
        client_id = getattr(self.request, "tenant", {}).get("client_id", 1)

        # Filter by page_id if provided
        page_id = self.request.query_params.get("page_id")
        if page_id:
            return ContentBlock.objects.filter(
                client_id=client_id, page_id=page_id
            ).order_by("order")

        return ContentBlock.objects.filter(client_id=client_id).order_by(
            "page", "order"
        )

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return ContentBlockCreateUpdateSerializer
        return ContentBlockSerializer

    def perform_create(self, serializer):
        # Get client_id from request or default to 1
        client_id = getattr(self.request, "tenant", {}).get("client_id", 1)
        company_id = getattr(self.request, "tenant", {}).get("company_id", 1)

        # Set the client_id and company_id values
        serializer.save(client_id=client_id, company_id=company_id)

    @action(detail=False, methods=["post"], url_path="reorder")
    def reorder_blocks(self, request):
        """
        Reorder content blocks for a page.

        Accepts:
        {
            "page_id": 1,
            "block_orders": [
                {"id": 1, "order": 3},
                {"id": 2, "order": 1},
                ...
            ]
        }
        """
        # Get client_id from request or default to 1
        client_id = getattr(request, "tenant", {}).get("client_id", 1)

        # Get page_id from request data
        page_id = request.data.get("page_id")
        if not page_id:
            return Response(
                {"detail": _("page_id is required")}, status=status.HTTP_400_BAD_REQUEST
            )

        # Validate page exists for this client
        try:
            page = LandingPage.objects.get(id=page_id, client_id=client_id)
        except LandingPage.DoesNotExist:
            return Response(
                {"detail": _("Landing page not found")},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Validate the block orders
        serializer = ContentBlockOrderSerializer(
            data=request.data, context={"client_id": client_id, "page_id": page_id}
        )
        serializer.is_valid(raise_exception=True)

        # Get the validated block orders
        block_orders = serializer.validated_data.get("block_orders", [])

        # Update the block orders in a transaction
        with transaction.atomic():
            for item in block_orders:
                block_id = item.get("id")
                new_order = item.get("order")

                ContentBlock.objects.filter(
                    id=block_id, client_id=client_id, page_id=page_id
                ).update(order=new_order)

        # Return the updated blocks
        blocks = ContentBlock.objects.filter(
            page_id=page_id, client_id=client_id
        ).order_by("order")

        return Response(ContentBlockSerializer(blocks, many=True).data)


class BatchProductsView(views.APIView):
    """
    API endpoint for fetching data for multiple products by ID.
    Used by the Recently Viewed Products block to get product data.
    """

    authentication_classes = [TenantSchemaMiddleware]
    permission_classes = [permissions.AllowAny]

    def get(self, request, *args, **kwargs) -> Response:
        """
        Get products by a comma-separated list of IDs.

        Query params:
            ids: Comma-separated list of product IDs (e.g., ?ids=1,5,23)
        """
        # Get client_id from request or default to 1
        client_id = getattr(request, "tenant", {}).get("client_id", 1)

        # Get product IDs from query params
        id_param = request.query_params.get("ids", "")
        if not id_param:
            return Response([])  # Empty list if no IDs provided

        try:
            # Convert comma-separated string to list of integers
            id_list = [int(x.strip()) for x in id_param.split(",") if x.strip()]
        except ValueError:
            return Response(
                {"detail": _("Invalid product ID format")},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Import Product model here to avoid circular imports
        from products.models import Product

        # Get products by IDs, filtering by active status and client_id
        products = Product.objects.filter(
            id__in=id_list, client_id=client_id, publication_status="ACTIVE"
        )

        # Import the appropriate serializer
        from products.serializers import ProductLightSerializer

        # Return products in the same order as requested
        # This preserves the order from localStorage (most recent first)
        ordered_products = sorted(
            products,
            key=lambda p: id_list.index(p.id) if p.id in id_list else len(id_list),
        )

        return Response(ProductLightSerializer(ordered_products, many=True).data)
