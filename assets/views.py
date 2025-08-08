import os
import uuid
import json
from datetime import timedelta

from django.conf import settings
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

import redis

from .serializers import TemporaryUploadSerializer


# Connect to Redis if available, otherwise use a mock implementation
try:
    # Only connect to Redis if the URL is a valid Redis URL
    if settings.REDIS_URL.startswith('redis://') or settings.REDIS_URL.startswith('rediss://') or settings.REDIS_URL.startswith('unix://'):
        redis_client = redis.Redis.from_url(
            settings.REDIS_URL,
            decode_responses=True
        )
    else:
        # Create a mock Redis client for development
        from fakeredis import FakeRedis
        redis_client = FakeRedis(decode_responses=True)
        print("Using FakeRedis for assets app")
except (redis.ConnectionError, ImportError, ValueError):
    # Create a mock Redis client for development
    from fakeredis import FakeRedis
    redis_client = FakeRedis(decode_responses=True)
    print("Using FakeRedis for assets app due to connection error")


class TemporaryUploadView(GenericViewSet):
    """
    ViewSet for handling temporary file uploads.
    
    This view allows authenticated users to upload files to a temporary storage
    and returns a unique identifier that can be used later to reference the file.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    serializer_class = TemporaryUploadSerializer
    
    def create(self, request, *args, **kwargs):
        """
        Handle file upload to temporary storage.
        
        Steps:
        1. Validate the uploaded file
        2. Generate a unique ID
        3. Save the file to temporary storage
        4. Store metadata in Redis
        5. Return the unique ID
        
        Returns:
            Response with the temporary ID
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Get the uploaded file
        uploaded_file = serializer.validated_data['file']
        
        # Generate a unique ID
        temp_id = uuid.uuid4()
        
        # Get file extension
        _, file_extension = os.path.splitext(uploaded_file.name)
        
        # Create temporary uploads directory if it doesn't exist
        temp_dir = os.path.join(settings.MEDIA_ROOT, 'temp_uploads')
        if not os.path.exists(temp_dir):
            os.makedirs(temp_dir)
        
        # Determine file path
        file_path = os.path.join(temp_dir, f"{temp_id}{file_extension}")
        
        # Save the file
        try:
            with open(file_path, 'wb+') as destination:
                for chunk in uploaded_file.chunks():
                    destination.write(chunk)
        except Exception as e:
            return Response(
                {"error": f"Failed to save file: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Store metadata in Redis
        metadata = {
            "file_path": file_path,
            "original_filename": uploaded_file.name,
            "mime_type": uploaded_file.content_type,
            "size_bytes": uploaded_file.size,
            "tenant_id": request.tenant.id if hasattr(request, 'tenant') else None,
            "user_id": request.user.id
        }
        
        # Set Redis key with expiry (48 hours)
        redis_key = f"temp_upload:{temp_id}"
        redis_client.set(redis_key, json.dumps(metadata))
        redis_client.expire(redis_key, timedelta(hours=48))
        
        return Response(
            {"temp_id": str(temp_id)},
            status=status.HTTP_201_CREATED
        )
