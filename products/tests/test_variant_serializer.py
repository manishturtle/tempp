import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.exceptions import ValidationError
from unittest.mock import patch, MagicMock

from products.serializers import ProductVariantSerializer
from products.models import Product, ProductVariant, AttributeOption, Attribute
from products.utils import link_temporary_images

@pytest.fixture
def tenant(db):
    from tenants.models import Tenant
    return Tenant.objects.create(name="Test Tenant")

@pytest.fixture
def parent_product(db, tenant):
    return Product.objects.create(
        tenant=tenant,
        name="Test Product",
        product_type="PARENT"
    )

@pytest.fixture
def variant_attribute(db, tenant):
    return Attribute.objects.create(
        tenant=tenant,
        name="Size",
        code="size",
        data_type="SELECT",
        use_for_variants=True
    )

@pytest.fixture
def attribute_option(db, variant_attribute):
    return AttributeOption.objects.create(
        tenant=variant_attribute.tenant,
        attribute=variant_attribute,
        option_label="Large",
        option_value="L"
    )

@pytest.fixture
def mock_request(tenant):
    request = MagicMock()
    request.tenant = tenant
    return request

@pytest.fixture
def context(mock_request, parent_product):
    return {
        'request': mock_request,
        'view': MagicMock(kwargs={'product_pk': parent_product.id})
    }

class TestProductVariantSerializer:
    
    def test_create_variant_success(self, tenant, parent_product, attribute_option, context):
        """Test successful variant creation with options and temp images"""
        data = {
            'sku': 'TEST-SKU-001',
            'display_price': '99.99',
            'options': [attribute_option.id],
            'temp_images': [{
                'id': 'temp-uuid-1',
                'alt_text': 'Test Image',
                'sort_order': 0,
                'is_default': True
            }]
        }
        
        with patch('products.utils.link_temporary_images') as mock_link:
            serializer = ProductVariantSerializer(data=data, context=context)
            assert serializer.is_valid()
            variant = serializer.save()
            
            # Verify variant creation
            assert variant.sku == 'TEST-SKU-001'
            assert variant.tenant == tenant
            assert variant.product == parent_product
            assert list(variant.options.all()) == [attribute_option]
            
            # Verify image linking was called
            mock_link.assert_called_once_with(
                owner_instance=variant,
                owner_type='variant',
                temp_image_data=data['temp_images'],
                tenant=tenant
            )
    
    def test_update_variant_success(self, tenant, parent_product, attribute_option):
        """Test successful variant update with new images"""
        variant = ProductVariant.objects.create(
            tenant=tenant,
            product=parent_product,
            sku='OLD-SKU'
        )
        variant.options.add(attribute_option)
        
        data = {
            'sku': 'NEW-SKU',
            'temp_images': [{
                'id': 'temp-uuid-2',
                'alt_text': 'New Image',
                'sort_order': 0,
                'is_default': True
            }]
        }
        
        context = {
            'request': MagicMock(tenant=tenant),
            'view': MagicMock(kwargs={'product_pk': parent_product.id})
        }
        
        with patch('products.utils.link_temporary_images') as mock_link:
            serializer = ProductVariantSerializer(
                instance=variant,
                data=data,
                partial=True,
                context=context
            )
            assert serializer.is_valid()
            updated_variant = serializer.save()
            
            # Verify update
            assert updated_variant.sku == 'NEW-SKU'
            assert list(updated_variant.options.all()) == [attribute_option]
            
            # Verify image linking was called
            mock_link.assert_called_once_with(
                owner_instance=updated_variant,
                owner_type='variant',
                temp_image_data=data['temp_images'],
                tenant=tenant
            )
    
    def test_validate_options_uniqueness(self, tenant, parent_product, attribute_option, context):
        """Test that variants with duplicate option combinations are rejected"""
        # Create first variant
        ProductVariant.objects.create(
            tenant=tenant,
            product=parent_product,
            sku='SKU-1'
        ).options.add(attribute_option)
        
        # Try to create second variant with same options
        data = {
            'sku': 'SKU-2',
            'options': [attribute_option.id]
        }
        
        serializer = ProductVariantSerializer(data=data, context=context)
        with pytest.raises(ValidationError) as exc:
            serializer.is_valid(raise_exception=True)
        
        assert "combination of options already exists" in str(exc.value)
    
    def test_non_parent_product_rejection(self, tenant, context):
        """Test that variants cannot be created for non-PARENT products"""
        child_product = Product.objects.create(
            tenant=tenant,
            name="Child Product",
            product_type="CHILD"
        )
        
        context['view'].kwargs['product_pk'] = child_product.id
        
        data = {
            'sku': 'TEST-SKU',
            'options': []
        }
        
        serializer = ProductVariantSerializer(data=data, context=context)
        with pytest.raises(ValidationError) as exc:
            serializer.is_valid(raise_exception=True)
            serializer.save()
        
        assert "PARENT type products" in str(exc.value)
