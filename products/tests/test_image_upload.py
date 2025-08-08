import os
import json
import tempfile
from django.test import TestCase
from django.core.files import File
from django.conf import settings
from django.core.files.storage import default_storage
import redis
from products.models import Product, ProductImage
from products.utils import link_temporary_images
from django.contrib.auth import get_user_model

class MockTenant:
    def __init__(self, id=1):
        self.id = id
        self.company_id = 1

def create_temp_image(redis_client, tenant_id=1):
    """Helper function to create a temporary image and store its metadata in Redis"""
    # Create a temporary image file
    with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
        temp_file.write(b'dummy image content')
        temp_file_path = temp_file.name
    
    # Generate a temp ID
    temp_id = 'test_temp_123'
    
    # Store metadata in Redis
    metadata = {
        'file_path': temp_file_path,
        'original_filename': 'test_image.jpg',
        'mime_type': 'image/jpeg',
        'size_bytes': os.path.getsize(temp_file_path),
        'tenant_id': tenant_id,
        'user_id': 1
    }
    
    redis_key = f"temp_upload:{temp_id}"
    redis_client.set(redis_key, json.dumps(metadata))
    
    return temp_id, temp_file_path

class TestImageUpload(TestCase):
    def setUp(self):
        self.tenant = MockTenant()
        self.redis_client = redis.Redis.from_url(
            settings.REDIS_URL,
            decode_responses=True
        )
        
        # Create a test product
        self.product = Product.objects.create(
            client_id=self.tenant.id,
            company_id=self.tenant.company_id,
            name='Test Product',
            slug='test-product'
        )
        
        # Create a temporary image
        self.temp_id, self.temp_file_path = create_temp_image(self.redis_client)
    
    def tearDown(self):
        # Clean up any temporary files
        if hasattr(self, 'temp_file_path') and os.path.exists(self.temp_file_path):
            os.unlink(self.temp_file_path)
        
        # Clean up Redis keys
        if hasattr(self, 'temp_id'):
            self.redis_client.delete(f"temp_upload:{self.temp_id}")
    
    def test_link_temporary_images(self):
        """Test the complete flow of linking temporary images to a product"""
        temp_image_data = [{
            'id': self.temp_id,
            'alt_text': 'Test image',
            'sort_order': 1,
            'is_default': True
        }]
        
        # Link the temporary image
        created_images = link_temporary_images(
            owner_instance=self.product,
            owner_type='product',
            temp_image_data=temp_image_data,
            tenant=self.tenant
        )
        
        # Verify the results
        self.assertEqual(len(created_images), 1)
        image = created_images[0]
        
        # Check the ProductImage record
        self.assertEqual(image.product, self.product)
        self.assertEqual(image.alt_text, 'Test image')
        self.assertEqual(image.sort_order, 1)
        self.assertTrue(image.is_default)
        
        # Verify the file was uploaded to GCS
        self.assertTrue(default_storage.exists(image.image.name))
        
        # Verify the temporary file was cleaned up
        self.assertFalse(os.path.exists(self.temp_file_path))
        
        # Verify Redis key was cleaned up
        self.assertIsNone(self.redis_client.get(f"temp_upload:{self.temp_id}"))
    
    def test_invalid_temp_id(self):
        """Test handling of invalid temporary image ID"""
        temp_image_data = [{
            'id': 'nonexistent_id',
            'alt_text': 'Test image',
            'sort_order': 1,
            'is_default': True
        }]
        
        with self.assertRaises(serializers.ValidationError):
            link_temporary_images(
                owner_instance=self.product,
                owner_type='product',
                temp_image_data=temp_image_data,
                tenant=self.tenant
            )
    
    def test_tenant_mismatch(self):
        """Test handling of tenant mismatch"""
        # Create temp image for different tenant
        wrong_temp_id, wrong_temp_path = create_temp_image(self.redis_client, tenant_id=999)
        
        temp_image_data = [{
            'id': wrong_temp_id,
            'alt_text': 'Test image',
            'sort_order': 1,
            'is_default': True
        }]
        
        with self.assertRaises(serializers.ValidationError):
            link_temporary_images(
                owner_instance=self.product,
                owner_type='product',
                temp_image_data=temp_image_data,
                tenant=self.tenant
            )
        
        # Clean up
        if os.path.exists(wrong_temp_path):
            os.unlink(wrong_temp_path)
        self.redis_client.delete(f"temp_upload:{wrong_temp_id}")
