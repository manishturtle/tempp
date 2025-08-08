from rest_framework import serializers


class TemporaryUploadSerializer(serializers.Serializer):
    """
    Serializer for handling temporary file uploads.
    
    This serializer validates the uploaded file and provides methods to check
    file size and type if needed.
    """
    file = serializers.FileField(write_only=True, required=True)
    
    def validate_file(self, value):
        """
        Validate the uploaded file.
        
        Checks:
        - File size (max 10MB by default)
        - File type (optional)
        
        Returns:
            The validated file object
        """
        # Check file size (10MB limit by default)
        max_size = 10 * 1024 * 1024  # 10MB in bytes
        if value.size > max_size:
            raise serializers.ValidationError(
                f"File size exceeds maximum limit of {max_size / (1024 * 1024)}MB"
            )
        
        # Optional: Check file type/extension
        # Example implementation:
        # allowed_extensions = ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx']
        # file_extension = os.path.splitext(value.name)[1].lower()
        # if file_extension not in allowed_extensions:
        #     raise serializers.ValidationError(
        #         f"Unsupported file type. Allowed types: {', '.join(allowed_extensions)}"
        #     )
        
        return value
