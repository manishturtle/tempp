from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from products.models import Product, Division, Category, UnitOfMeasure, ProductStatus
from django.contrib.auth import get_user_model

class ProductAPITests(TestCase):
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Create a test user
        User = get_user_model()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        
        # Create required related objects
        self.division = Division.objects.create(
            name='Test Division',
            client_id=1,
            company_id=1
        )
        
        self.category = Category.objects.create(
            name='Test Category',
            client_id=1,
            company_id=1
        )
        
        self.uom = UnitOfMeasure.objects.create(
            name='Test UOM',
            code='TU',
            client_id=1,
            company_id=1
        )
        
        self.status = ProductStatus.objects.create(
            name='Active',
            client_id=1,
            company_id=1
        )

    def test_create_product(self):
        """Test creating a new product"""
        url = reverse('product-list')  # Make sure this matches your URL configuration
        
        payload = {
            'product_type': 'REGULAR',
            'name': 'Test 123',
            'slug': 'Mobile89',
            'division_id': self.division.id,
            'category': self.category.id,
            'subcategory': 1,
            'allow_reviews': True,
            'attribute_values_input': [],
            'backorders_allowed': True,
            'compare_at_price': 4333.98,
            'currency_code': 'USD',
            'default_tax_rate_profile': 5,
            'description': 'Test',
            'display_price': 4335,
            'faqs': [
                {
                    'id': 'faq_1',
                    'question': 'Test',
                    'answer': 'Test'
                }
            ],
            'inventory_tracking_enabled': True,
            'is_active': True,
            'is_lotted': True,
            'is_serialized': True,
            'is_tax_exempt': True,
            'pre_order_available': False,
            'productstatus': 1,
            'seo_description': 'Test',
            'seo_keywords': 'Test',
            'seo_title': 'Test',
            'short_description': 'Test',
            'sku': 'Test34',
            'status_id': 1,
            'tags': '',
            'uom_id': self.uom.id,
            'variant_defining_attributes': []
        }
        
        response = self.client.post(url, payload, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Product.objects.count(), 1)
        product = Product.objects.first()
        
        # Test basic fields
        self.assertEqual(product.name, 'Test 123')
        self.assertEqual(product.slug, 'Mobile89')
        self.assertEqual(product.division.id, self.division.id)
        self.assertEqual(product.uom.id, self.uom.id)
        self.assertEqual(product.sku, 'Test34')
        
        # Test boolean fields
        self.assertTrue(product.allow_reviews)
        self.assertTrue(product.backorders_allowed)
        self.assertTrue(product.inventory_tracking_enabled)
        self.assertTrue(product.is_active)
        self.assertTrue(product.is_lotted)
        self.assertTrue(product.is_serialized)
        self.assertTrue(product.is_tax_exempt)
        self.assertFalse(product.pre_order_available)
        
        # Test numeric fields
        self.assertEqual(float(product.compare_at_price), 4333.98)
        self.assertEqual(float(product.display_price), 4335.0)
        
        # Test text fields
        self.assertEqual(product.description, 'Test')
        self.assertEqual(product.short_description, 'Test')
        self.assertEqual(product.seo_description, 'Test')
        self.assertEqual(product.seo_keywords, 'Test')
        self.assertEqual(product.seo_title, 'Test')
        
        # Test JSON fields
        self.assertEqual(len(product.faqs), 1)
        self.assertEqual(product.faqs[0]['question'], 'Test')
        self.assertEqual(product.faqs[0]['answer'], 'Test')
