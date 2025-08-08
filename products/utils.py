"""
Utility functions for the products app.

This module provides helper functions for product-related operations,
such as SKU generation, validation, and data transformation.
"""

import uuid
import re
import os
import json
import shutil
from django.utils.text import slugify
from django.db import transaction
from rest_framework import serializers
import redis
from django.conf import settings
import logging
from contextlib import contextmanager
from django.core.files import File
from django.core.files.storage import default_storage

from products.models import Product, ProductVariant, ProductImage
from products.placeholder_images import get_placeholder_for_product

logger = logging.getLogger(__name__)

def generate_unique_sku(tenant, product_data=None):
    """
    Generate a unique SKU for a product based on tenant settings.
    
    Args:
        tenant: The tenant object for which the SKU is being generated.
        product_data (dict, optional): Dictionary containing product data like name, category, etc.
            This can be used for generating SKUs based on product attributes.
            
    Returns:
        str: A unique SKU string that doesn't exist for the tenant.
    """
    # Default SKU format if tenant settings don't specify one
    sku_prefix = "PRD"
    sku_format = "{prefix}-{uuid}"
    
    # Try to get SKU settings from tenant settings
    try:
        tenant_settings = tenant.settings.get(key='product_sku_settings', default={})
        sku_prefix = tenant_settings.get('sku_prefix', sku_prefix)
        sku_format = tenant_settings.get('sku_format', sku_format)
    except (AttributeError, Exception):
        # If tenant.settings is not available or any other error occurs, use defaults
        pass
    
    # Generate a base SKU using the format
    base_sku = sku_format
    
    # Replace placeholders in the format
    if '{prefix}' in base_sku:
        base_sku = base_sku.replace('{prefix}', sku_prefix)
    
    if '{product_id}' in base_sku and product_data and 'id' in product_data:
        base_sku = base_sku.replace('{product_id}', str(product_data['id']))
    
    if '{category}' in base_sku and product_data and 'category' in product_data:
        from products.models import ProductCategory
        try:
            category = ProductCategory.objects.get(pk=product_data['category'])
            category_code = slugify(category.category_name)[:3].upper()
            base_sku = base_sku.replace('{category}', category_code)
        except ProductCategory.DoesNotExist:
            base_sku = base_sku.replace('{category}', 'CAT')
    
    if '{name}' in base_sku and product_data and 'name' in product_data:
        name_code = slugify(product_data['name'])[:5].upper()
        base_sku = base_sku.replace('{name}', name_code)
    
    # Replace {uuid} with a short UUID (first 8 chars)
    if '{uuid}' in base_sku:
        short_uuid = str(uuid.uuid4())[:8]
        base_sku = base_sku.replace('{uuid}', short_uuid)
    
    # Check if the generated SKU already exists
    counter = 1
    generated_sku = base_sku
    
    # Keep checking and modifying until we find a unique SKU
    while (Product.objects.filter(client_id=tenant.id, sku=generated_sku).exists() or 
           ProductVariant.objects.filter(client_id=tenant.id, sku=generated_sku).exists()):
        # If the SKU already has a counter suffix, increment it
        if re.search(r'-\d+$', generated_sku):
            generated_sku = re.sub(r'-\d+$', f'-{counter}', generated_sku)
        else:
            # Otherwise, append the counter
            generated_sku = f"{base_sku}-{counter}"
        counter += 1
    
    return generated_sku


@contextmanager
def cleanup_context(temp_file_path: str, redis_client, redis_key: str):
    """Context manager to ensure cleanup of temporary files and Redis keys."""
    try:
        yield
    finally:
        try:
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
                logger.debug(f"Cleaned up temporary file: {temp_file_path}")
        except OSError as e:
            logger.warning(f"Failed to remove temporary file {temp_file_path}: {e}")
        
        try:
            redis_client.delete(redis_key)
            logger.debug(f"Cleaned up Redis key: {redis_key}")
        except Exception as e:
            logger.warning(f"Failed to delete Redis key {redis_key}: {e}")


def link_temporary_images(*, owner_instance, owner_type: str, temp_image_data: list, tenant, redis_client=None):
    """
    Link temporary images to a product, variant, or division.
    
    This function creates ProductImage instances linked to the specified owner (product, variant, or division).
    It processes temporary image files and uploads them to Google Cloud Storage.
    
    Args:
        owner_instance: The product, variant, or division instance to link images to
        owner_type: One of 'product', 'variant', or 'division'
        temp_image_data: List of dictionaries with temp image metadata
            Format: [{'id': temp_id, 'alt_text': '...', 'sort_order': 0, 'is_default': False}, ...]
        tenant: The tenant object or tenant ID
        redis_client: Optional Redis client instance (for testing)
        
    Returns:
        list: List of created ProductImage instances
    
    Raises:
        ValidationError: If validation fails
    """
    created_images = []
    
    # Handle tenant parameter which could be an object or just an ID
    tenant_id = tenant.id if hasattr(tenant, 'id') else tenant  # Extract ID if tenant is an object, otherwise use as is
    
    # Debug logging
    logger.info(f"Starting link_temporary_images with {len(temp_image_data)} images")
    logger.info(f"Tenant info - ID: {tenant_id}, Original tenant: {tenant}")
    logger.info(f"Owner instance: {owner_instance}, Owner type: {owner_type}")
    
    # Validate owner_type
    if owner_type not in ('product', 'variant', 'division', 'category', 'subcategory'):
        raise serializers.ValidationError("owner_type must be one of 'product', 'variant', 'division', 'category', or 'subcategory'")
    
    for img_data in temp_image_data:
        temp_id = img_data['id']
        logger.info(f"Processing image with ID: {temp_id}")
        
        try:
            # Get metadata for the temporary image
            metadata_path = os.path.join(settings.MEDIA_ROOT, 'temp_metadata', f"{temp_id}.json")
            
            if not os.path.exists(metadata_path):
                logger.error(f"Metadata file not found for temp ID: {temp_id}")
                continue
            
            # Read the metadata file
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
            
            # Get the file path from metadata
            temp_file_path = metadata.get('file_path')
            original_filename = metadata.get('original_filename')
            
            if not temp_file_path or not os.path.exists(temp_file_path):
                logger.error(f"Temporary file not found at: {temp_file_path}")
                continue
            
            # Create the image instance with common fields
            image_instance = ProductImage(
                client_id=tenant_id,
                company_id=getattr(tenant, 'company_id', 1) if hasattr(tenant, 'company_id') else 1,
                alt_text=img_data.get('alt_text', ''),
                sort_order=img_data.get('sort_order', 0),
                is_default=img_data.get('is_default', False)
            )
            
            # Set the appropriate relationship based on owner_type
            if owner_type == 'product':
                image_instance.product = owner_instance
                image_instance.variant = None
                logger.info(f"Linking image to product ID: {owner_instance.id}")
            elif owner_type == 'variant':
                image_instance.variant = owner_instance
                image_instance.product = None
                logger.info(f"Linking image to variant ID: {owner_instance.id}")
            elif owner_type == 'division':
                # For division, we don't set product or variant, just create the image
                image_instance.product = None
                image_instance.variant = None
                logger.info(f"Creating image for division ID: {owner_instance.id}")
            elif owner_type == 'category':
                # For category, we don't set product or variant, just create the image
                image_instance.product = None
                image_instance.variant = None
                logger.info(f"Creating image for category ID: {owner_instance.id}")
            elif owner_type == 'subcategory':
                # For subcategory, we don't set product or variant, just create the image
                image_instance.product = None
                image_instance.variant = None
                logger.info(f"Creating image for subcategory ID: {owner_instance.id}")
            
            # Open and attach the image file to the model
            with open(temp_file_path, 'rb') as f:
                # Create a unique filename for storage
                storage_filename = f"{owner_type}_{getattr(owner_instance, 'id')}_{uuid.uuid4()}_{original_filename}"
                
                # Special handling for division, category, and subcategory images
                if owner_type == 'division':
                    # For division images, directly update the division's image field
                    # This will use the Division model's upload_to='divisions/' setting
                    logger.info(f"Directly updating division image for division ID: {owner_instance.id}")
                    # Save the file to the division's image field
                    owner_instance.image.save(storage_filename, File(f), save=True)
                    
                    # Also save to ProductImage for consistency
                    image_instance.image.save(storage_filename, File(f), save=False)
                    logger.info(f"Division image will be saved to: {owner_instance.image.name}")
                elif owner_type == 'category':
                    # For category images, directly update the category's image field
                    # This will use the Category model's upload_to='categories/' setting
                    logger.info(f"Directly updating category image for category ID: {owner_instance.id}")
                    # Save the file to the category's image field
                    owner_instance.image.save(storage_filename, File(f), save=True)
                    
                    # Also save to ProductImage for consistency
                    image_instance.image.save(storage_filename, File(f), save=False)
                    logger.info(f"Category image will be saved to: {owner_instance.image.name}")
                elif owner_type == 'subcategory':
                    # For subcategory images, directly update the subcategory's image field
                    # This will use the Subcategory model's upload_to='subcategories/' setting
                    logger.info(f"Directly updating subcategory image for subcategory ID: {owner_instance.id}")
                    # Save the file to the subcategory's image field
                    owner_instance.image.save(storage_filename, File(f), save=True)
                    
                    # Also save to ProductImage for consistency
                    image_instance.image.save(storage_filename, File(f), save=False)
                    logger.info(f"Subcategory image will be saved to: {owner_instance.image.name}")
                elif owner_type == 'variant':
                    # For variant images
                    image_instance.image.field.upload_to = 'variants/'
                    image_instance.image.save(storage_filename, File(f), save=False)
                    logger.info(f"Variant image will be saved to: {image_instance.image.name}")
                else:  # product
                    # For product images
                    image_instance.image.field.upload_to = 'products/'
                    image_instance.image.save(storage_filename, File(f), save=False)
                    logger.info(f"Product image will be saved to: {image_instance.image.name}")
                
                logger.info(f"File attached to model, will be saved to: {image_instance.image.name}")
            
            # Save the image instance with the file
            image_instance.save()
            logger.info(f"Successfully saved ProductImage with ID: {image_instance.id}")
            
            # Clean up temporary files
            try:
                # Remove the temporary file
                if os.path.exists(temp_file_path):
                    os.remove(temp_file_path)
                    logger.info(f"Removed temporary file: {temp_file_path}")
                
                # Remove the metadata file
                if os.path.exists(metadata_path):
                    os.remove(metadata_path)
                    logger.info(f"Removed metadata file: {metadata_path}")
                    
            except Exception as cleanup_error:
                logger.warning(f"Failed to clean up temporary files: {str(cleanup_error)}")
            
            created_images.append(image_instance)
            
        except Exception as e:
            logger.error(f"Failed to process temporary image {temp_id}: {str(e)}")
            logger.exception("Exception details:")
            continue
    
    logger.info(f"Completed link_temporary_images, created {len(created_images)} images")
    return created_images
