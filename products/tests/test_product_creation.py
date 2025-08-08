"""
Tests for product creation with attributes and images.
"""

import pytest
import json
from django.urls import reverse
from rest_framework.test import APIClient
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils.text import slugify
from decimal import Decimal
from datetime import date

from products.models import Product
from products.catalogue.models import Category, Division, Subcategory, UnitOfMeasure, ProductStatus
from attributes.models import Attribute, AttributeGroup, AttributeOption
from shared.models import Currency
from tenants.models import Tenant, Domain

pytestmark = pytest.mark.django_db

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def test_data():
    with open('products/tests/test_data/create_product.json', 'r') as f:
        return json.load(f)

@pytest.fixture
def tenant():
    tenant = Tenant.objects.create(
        name="Test Tenant",
        schema_name="test_tenant"
    )
    Domain.objects.create(
        domain="test.localhost",
        tenant=tenant,
        is_primary=True
    )
    return tenant

@pytest.fixture
def category(tenant):
    return Category.objects.create(
        tenant=tenant,
        name="Test Category",
        description="Test Category Description"
    )

@pytest.fixture
def division(tenant):
    return Division.objects.create(
        tenant=tenant,
        name="Test Division"
    )

@pytest.fixture
def subcategory(tenant, category):
    return Subcategory.objects.create(
        tenant=tenant,
        category=category,
        name="Test Subcategory"
    )

@pytest.fixture
def uom(tenant):
    return UnitOfMeasure.objects.create(
        tenant=tenant,
        name="Piece",
        code="PCS"
    )

@pytest.fixture
def product_status(tenant):
    return ProductStatus.objects.create(
        tenant=tenant,
        name="In Stock",
        code="IN_STOCK"
    )

@pytest.fixture
def currency():
    return Currency.objects.create(
        code="USD",
        name="US Dollar",
        symbol="$"
    )

class TestProductCreation:
    
    def test_create_and_get_product(
        self, api_client, tenant, category, division, subcategory, 
        uom, product_status, currency, test_data
    ):
        # Set up test data
        # Create attribute groups as specified in test data
        for group_id in test_data['attribute_groups']:
            AttributeGroup.objects.create(
                tenant=tenant,
                name=f"Test Group {group_id}",
                display_order=group_id
            )
        
        # Use specific attribute IDs from your database
        # Based on the attribute list you provided
        attributes = {
            'TEXT': 16,  # Yp Text (id: 16)
            'NUMBER': 7,  # yy (id: 7)
            'BOOLEAN': 5,  # Test (id: 5)
            'DATE': 14,  # Visa Validity (id: 14)
            'SELECT': 6,  # Testyy (id: 6)
            'MULTI_SELECT': 15  # Visa Date (id: 15)
        }
        
        # Update the test data to use the actual attribute IDs
        for attr_value in test_data['attribute_values_input']:
            if isinstance(attr_value['value'], str):
                attr_value['attribute'] = attributes['TEXT']
            elif isinstance(attr_value['value'], (int, float)):
                attr_value['attribute'] = attributes['NUMBER']
            elif isinstance(attr_value['value'], bool):
                attr_value['attribute'] = attributes['BOOLEAN']
            elif isinstance(attr_value['value'], str) and attr_value['value'].count('-') == 2:  # Assuming date format
                attr_value['attribute'] = attributes['DATE']
            elif isinstance(attr_value['value'], int):  # Single select
                attr_value['attribute'] = attributes['SELECT']
            elif isinstance(attr_value['value'], list):  # Multi select
                attr_value['attribute'] = attributes['MULTI_SELECT']

        # Add tenant ID to test data
        test_data['tenant'] = tenant.id
        
        # Create product using API
        url = reverse('product-list')
        response = api_client.post(url, test_data, format='json')
        assert response.status_code == 201, f"Failed to create product: {response.data}"
        
        # Get the created product
        product_id = response.data['id']
        get_url = reverse('product-detail', args=[product_id])
        get_response = api_client.get(get_url)
        assert get_response.status_code == 200
        
        # Verify all fields
        product_data = get_response.data
        
        # Basic info
        assert product_data['name'] == test_data['name']
        assert product_data['description'] == test_data['description']
        assert product_data['sku'] == test_data['sku']
        
        # Pricing
        assert product_data['display_price'] == test_data['display_price']
        assert product_data['compare_at_price'] == test_data['compare_at_price']
        assert product_data['currency_code'] == test_data['currency_code']
        
        # Status
        assert product_data['publication_status'] == test_data['publication_status']
        assert product_data['is_active'] == test_data['is_active']
        
        # Inventory
        assert product_data['inventory_tracking_enabled'] == test_data['inventory_tracking_enabled']
        assert product_data['quantity_on_hand'] == test_data['quantity_on_hand']
        
        # SEO
        assert product_data['seo_title'] == test_data['seo_title']
        assert product_data['seo_description'] == test_data['seo_description']
        assert product_data['seo_keywords'] == test_data['seo_keywords']
        
        # Flags
        assert product_data['is_digital'] == test_data['is_digital']
        assert product_data['is_subscription'] == test_data['is_subscription']
        assert product_data['is_taxable'] == test_data['is_taxable']
        assert product_data['tax_inclusive'] == test_data['tax_inclusive']
        assert product_data['requires_shipping'] == test_data['requires_shipping']
        assert product_data['track_inventory'] == test_data['track_inventory']
        
        # Quantities
        assert product_data['minimum_order_quantity'] == test_data['minimum_order_quantity']
        assert product_data['maximum_order_quantity'] == test_data['maximum_order_quantity']
        
        # Attribute groups
        assert set(product_data['attribute_groups']) == set(test_data['attribute_groups'])
        
        # Images
        assert len(product_data['images']) == len(test_data['temp_images'])
        for image in product_data['images']:
            assert image['alt_text'] in [img['alt_text'] for img in test_data['temp_images']]
            
        # Attribute values
        assert len(product_data['attribute_values']) == len(test_data['attribute_values_input'])
        for attr_value in product_data['attribute_values']:
            input_value = next(
                v for v in test_data['attribute_values_input'] 
                if v['attribute'] == attr_value['attribute']
            )
            # Verify the value based on attribute type
            if attr_value['attribute_type'] == 'TEXT':
                assert attr_value['value'] == input_value['value']
            elif attr_value['attribute_type'] == 'NUMBER':
                assert float(attr_value['value']) == float(input_value['value'])
            elif attr_value['attribute_type'] == 'BOOLEAN':
                assert attr_value['value'] == input_value['value']
            elif attr_value['attribute_type'] == 'DATE':
                assert attr_value['value'] == input_value['value']
            elif attr_value['attribute_type'] == 'SELECT':
                assert attr_value['value'] == input_value['value']
            elif attr_value['attribute_type'] == 'MULTI_SELECT':
                assert set(attr_value['value']) == set(input_value['value'])

        # FAQs
        assert len(product_data['faqs']) == len(test_data['faqs'])
        for faq in product_data['faqs']:
            input_faq = next(
                f for f in test_data['faqs'] 
                if f['question'] == faq['question']
            )
            assert faq['answer'] == input_faq['answer']
