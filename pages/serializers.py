from rest_framework import serializers
from django.utils.translation import gettext_lazy as _
from .models import LandingPage, ContentBlock
from typing import Dict, Any, List
import datetime as dt

# GCS client for signed URL generation
from google.cloud import storage
from google.oauth2 import service_account
import os
from django.conf import settings

def generate_signed_url(gcs_path: str, expiration: int = 604800) -> str:
    """
    Generate a signed URL for a GCS object.
    
    Args:
        gcs_path (str): The GCS path to the object (e.g., 'path/to/file.jpg')
        expiration (int): Expiration time in seconds (default: 7 days)
    
    Returns:
        str: Signed URL or original path if generation fails
    """
    print(f"\n=== DEBUG: generate_signed_url called with path: {gcs_path} ===")
    
    if not gcs_path or not isinstance(gcs_path, str):
        print("DEBUG: Invalid GCS path provided")
        return gcs_path
    
    try:
        print("DEBUG: Successfully imported required modules")
        
        # Get GCS credentials from environment or settings
        credentials_path = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
        if not credentials_path and hasattr(settings, 'GS_CREDENTIALS_FILE'):
            credentials_path = settings.GS_CREDENTIALS_FILE
        
        print(f"DEBUG: Using credentials path: {credentials_path}")
        
        if not credentials_path or not os.path.exists(credentials_path):
            print("DEBUG: GCS credentials not found at the specified path")
            return gcs_path
        
        # Initialize the GCS client with explicit credentials
        print("DEBUG: Initializing GCS client with credentials...")
        credentials = service_account.Credentials.from_service_account_file(
            credentials_path,
            scopes=["https://www.googleapis.com/auth/devstorage.read_only"]
        )
        
        client = storage.Client(credentials=credentials)
        print("DEBUG: Successfully initialized GCS client")
        
        # Get bucket name from settings or environment variable
        bucket_name = getattr(settings, 'GS_BUCKET_NAME', os.environ.get('GCS_BUCKET_NAME'))
        print(f"DEBUG: Using bucket name: {bucket_name}")
        
        if not bucket_name:
            print("DEBUG: GCS bucket name not configured")
            return gcs_path
        
        print(f"DEBUG: Accessing bucket: {bucket_name}")
        bucket = client.bucket(bucket_name)
        
        # Handle full URLs by extracting the path
        if gcs_path.startswith('http'):
            from urllib.parse import urlparse
            parsed = urlparse(gcs_path)
            gcs_path = parsed.path.lstrip('/')
            if gcs_path.startswith(f"{bucket_name}/"):
                gcs_path = gcs_path[len(bucket_name)+1:]
            print(f"DEBUG: Extracted GCS path: {gcs_path}")
        
        # Add catalogue-images prefix if not present
        original_path = gcs_path
        if not gcs_path.startswith('catalogue-images/'):
            gcs_path = f"catalogue-images/{gcs_path}"
            print(f"DEBUG: Added catalogue-images prefix: {original_path} -> {gcs_path}")
        
        print(f"DEBUG: Creating blob reference for path: {gcs_path}")
        blob = bucket.blob(gcs_path)
        
        # Check if blob exists
        exists = blob.exists()
        print(f"DEBUG: Blob exists check: {exists}")
        
        if not exists:
            print(f"DEBUG: Blob does not exist at path: {gcs_path}")
            # Try without the catalogue-images prefix
            alt_path = original_path
            print(f"DEBUG: Trying original path without prefix: {alt_path}")
            blob = bucket.blob(alt_path)
            exists = blob.exists()
            print(f"DEBUG: Alternative blob exists check: {exists}")
            if not exists:
                # Try with different path variations
                alt_path2 = '/'.join(original_path.split('/')[2:]) if '/' in original_path else original_path
                print(f"DEBUG: Trying path without first two segments: {alt_path2}")
                blob = bucket.blob(alt_path2)
                exists = blob.exists()
                print(f"DEBUG: Second alternative blob exists check: {exists}")
                if not exists:
                    return original_path
                gcs_path = alt_path2
            else:
                gcs_path = alt_path
        
        # Generate the signed URL
        print(f"DEBUG: Generating signed URL for blob: {gcs_path}")
        signed_url = blob.generate_signed_url(
            version="v4",
            expiration=dt.timedelta(seconds=expiration),
            method="GET"
        )
        
        print(f"DEBUG: Successfully generated signed URL: {signed_url}")
        return signed_url
    
    except Exception as e:
        import traceback
        print(f"DEBUG: Error in generate_signed_url: {str(e)}")
        print("DEBUG: Stack trace:")
        print(traceback.format_exc())
        return gcs_path

class ContentBlockSerializer(serializers.ModelSerializer):
    """
    Serializer for the ContentBlock model.
    This serializes content blocks with their JSON configuration.
    """

    class Meta:
        model = ContentBlock
        fields = ["id", "order", "block_type", "title", "content", "is_active"]

    def to_representation(self, instance):
        import json
        print("DEBUG: ContentBlockSerializer to_representation CALLED for id:", instance.id)
        data = super().to_representation(instance)
        print("DEBUG: Initial data:", data)
        # Only process HERO_CAROUSEL blocks
        if data.get("block_type") == "HERO_CAROUSEL":
            content = data.get("content")
            # If content is a string, parse it
            if isinstance(content, str):
                try:
                    content = json.loads(content)
                except Exception:
                    print("DEBUG: Could not parse content as JSON. Content:", content)
                    content = None
            if content and "slides" in content:
                print("DEBUG: Slides before URL signing:", content["slides"])
                for slide in content["slides"]:
                    if "mobile_image_url" in slide:
                        slide["mobile_image_url"] = generate_signed_url(slide["mobile_image_url"])
                    if "desktop_image_url" in slide:
                        slide["desktop_image_url"] = generate_signed_url(slide["desktop_image_url"])
                print("DEBUG: Slides after URL signing:", content["slides"])
                data["content"] = content  # Update the data dict!
        print("DEBUG: Final data returned by ContentBlockSerializer:", data)
        return data


class LandingPageSerializer(serializers.ModelSerializer):
    """
    Serializer for the LandingPage model.
    Includes all content blocks, ordered by their position.
    """

    blocks = serializers.SerializerMethodField()

    class Meta:
        model = LandingPage
        fields = ["id", "slug", "title", "meta_description", "meta_keywords", "blocks"]

    def get_blocks(self, obj) -> List[Dict[str, Any]]:
        """
        Get all active content blocks for this landing page.
        Blocks are ordered by their 'order' field.
        """
        import json
        print(f"\n=== DEBUG: get_blocks called for LandingPage id: {obj.id} ===")
        blocks = ContentBlock.objects.filter(
            page=obj, client_id=obj.client_id, is_active=True
        ).order_by("order")
        
        # Get serialized data
        data = ContentBlockSerializer(blocks, many=True).data
        print(f"\n=== DEBUG: Initial data from ContentBlockSerializer ===")
        print(json.dumps(data, indent=2))

        # Process each block
        for i, block in enumerate(data):
            print(f"\n=== DEBUG: Processing block {i} of type: {block.get('block_type')} ===")
            
            if block.get("block_type") == "HERO_CAROUSEL":
                print("DEBUG: Found HERO_CAROUSEL block")
                content = block.get("content", {})
                
                # Parse content if it's a string
                if isinstance(content, str):
                    try:
                        content = json.loads(content)
                        print("DEBUG: Successfully parsed JSON content")
                    except json.JSONDecodeError as e:
                        print(f"DEBUG: Failed to parse JSON content: {e}")
                        content = {}
                
                # Process slides if they exist
                if isinstance(content, dict) and "slides" in content and isinstance(content["slides"], list):
                    print(f"DEBUG: Found {len(content['slides'])} slides to process")
                    
                    for j, slide in enumerate(content["slides"]):
                        print(f"\n--- Processing slide {j} ---")
                        
                        # Process mobile image URL
                        if "mobile_image_url" in slide and slide["mobile_image_url"]:
                            original_url = slide["mobile_image_url"]
                            print(f"DEBUG: Original mobile URL: {original_url}")
                            signed_url = generate_signed_url(original_url)
                            slide["mobile_image_url"] = signed_url
                            print(f"DEBUG: Updated mobile URL: {signed_url}")
                        else:
                            print("DEBUG: No mobile_image_url found in slide")
                        
                        # Process desktop image URL
                        if "desktop_image_url" in slide and slide["desktop_image_url"]:
                            original_url = slide["desktop_image_url"]
                            print(f"DEBUG: Original desktop URL: {original_url}")
                            signed_url = generate_signed_url(original_url)
                            slide["desktop_image_url"] = signed_url
                            print(f"DEBUG: Updated desktop URL: {signed_url}")
                        else:
                            print("DEBUG: No desktop_image_url found in slide")
                    
                    # Update the block's content with processed slides
                    block["content"] = content
                    print("\nDEBUG: Updated block content:")
                    print(json.dumps(block["content"], indent=2))
                else:
                    print("DEBUG: No valid slides found in content")
            else:
                print("DEBUG: Not a HERO_CAROUSEL block, skipping")
        
        print("\n=== DEBUG: Final data being returned by get_blocks ===")
        print(json.dumps(data, indent=2))
        return data


class ContentBlockCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating and updating ContentBlock instances.
    This provides validation for the JSON content based on block_type.
    """

    class Meta:
        model = ContentBlock
        fields = ["id", "page", "order", "block_type", "title", "content", "is_active"]

    def validate(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate that the content field contains the required fields
        for the specified block_type.
        """
        block_type = data.get("block_type")
        content = data.get("content", {})

        # Hero Carousel validation
        if block_type == ContentBlock.HERO_CAROUSEL:
            if "slides" not in content or not isinstance(content["slides"], list):
                raise serializers.ValidationError(
                    {"content": _("Hero Carousel must contain a 'slides' array.")}
                )

            for i, slide in enumerate(content["slides"]):
                required_fields = ["desktop_image_url", "mobile_image_url", "heading"]
                for field in required_fields:
                    if field not in slide:
                        raise serializers.ValidationError(
                            {
                                "content": _(
                                    f"Slide {i+1} is missing required field '{field}'."
                                )
                            }
                        )

        # Banner Ad Grid validation
        elif block_type == ContentBlock.BANNER_AD_GRID:
            required_fields = ["layout_style", "banners"]
            for field in required_fields:
                if field not in content:
                    raise serializers.ValidationError(
                        {
                            "content": _(
                                f"Banner Ad Grid is missing required field '{field}'."
                            )
                        }
                    )

            if not isinstance(content["banners"], list):
                raise serializers.ValidationError(
                    {"content": _("'banners' must be an array.")}
                )

            valid_layout_styles = [
                "oneColumn",
                "twoColumns",
                "threeColumns",
                "fourColumns",
            ]
            if content["layout_style"] not in valid_layout_styles:
                raise serializers.ValidationError(
                    {
                        "content": _(
                            f"layout_style must be one of {valid_layout_styles}."
                        )
                    }
                )

            for i, banner in enumerate(content["banners"]):
                required_banner_fields = ["image_url", "alt_text", "cta_action_type"]
                for field in required_banner_fields:
                    if field not in banner:
                        raise serializers.ValidationError(
                            {
                                "content": _(
                                    f"Banner {i+1} is missing required field '{field}'."
                                )
                            }
                        )

        # Recently Viewed validation
        elif block_type == ContentBlock.RECENTLY_VIEWED:
            if "heading" not in content:
                raise serializers.ValidationError(
                    {
                        "content": _(
                            "Recently Viewed block must contain a 'heading' field."
                        )
                    }
                )

        return data


class ContentBlockOrderSerializer(serializers.Serializer):
    """
    Serializer for updating the order of content blocks.
    """

    block_orders = serializers.ListField(
        child=serializers.DictField(
            child=serializers.IntegerField(), allow_empty=False
        ),
        help_text=_(
            "List of objects with block_id and new order. E.g., [{'id': 1, 'order': 3}]"
        ),
    )

    def validate_block_orders(
        self, value: List[Dict[str, int]]
    ) -> List[Dict[str, int]]:
        """
        Validate that all block IDs exist and belong to the same client and page.
        """
        client_id = self.context.get("client_id", 1)
        page_id = self.context.get("page_id")

        if not page_id:
            raise serializers.ValidationError(_("page_id is required in context."))

        # Extract block IDs
        block_ids = [item.get("id") for item in value if item.get("id")]

        # Ensure all block IDs exist and belong to this page and client
        blocks = ContentBlock.objects.filter(
            id__in=block_ids, client_id=client_id, page_id=page_id
        )

        if len(blocks) != len(block_ids):
            found_ids = set(block.id for block in blocks)
            missing_ids = set(block_ids) - found_ids
            raise serializers.ValidationError(
                _(
                    "The following block IDs do not exist or do not belong to this page: {}"
                ).format(list(missing_ids))
            )

        return value
