import pytest
from django.test import TestCase
from django.db import IntegrityError
from django.conf import settings
from products.catalogue.models import Division, Category, Subcategory, UnitOfMeasure, ProductStatus, UomType


@pytest.mark.django_db
class TestCatalogueModels(TestCase):
    """
    Test cases for the catalogue models.
    """
    
    def setUp(self):
        """Set up test data."""
        # Get the tenant model
        TenantModel = settings.TENANT_MODEL.split('.')
        tenant_app = TenantModel[0]
        tenant_model = TenantModel[1]
        
        # Dynamically import the tenant model
        module = __import__(tenant_app, fromlist=[tenant_model])
        TenantClass = getattr(module, tenant_model)
        
        # Create a test tenant
        self.tenant = TenantClass.objects.create(
            name="Test Tenant",
            schema_name="test_tenant"
        )
        
        # Create a division
        self.division = Division.objects.create(
            tenant=self.tenant,
            name="Test Division",
            description="Test division description"
        )
        
        # Create a category
        self.category = Category.objects.create(
            tenant=self.tenant,
            division=self.division,
            name="Test Category",
            description="Test category description"
        )
        
        # Create a subcategory
        self.subcategory = Subcategory.objects.create(
            tenant=self.tenant,
            category=self.category,
            name="Test Subcategory",
            description="Test subcategory description"
        )
        
        # Create a unit of measure
        self.uom = UnitOfMeasure.objects.create(
            tenant=self.tenant,
            code="PCS",
            name="Pieces",
            type=UomType.DISCRETE
        )
        
        # Create a product status
        self.status = ProductStatus.objects.create(
            tenant=self.tenant,
            name="Available",
            is_orderable=True
        )
    
    def test_division_str(self):
        """Test the string representation of a Division."""
        self.assertEqual(str(self.division), "Test Division")
    
    def test_category_str(self):
        """Test the string representation of a Category."""
        self.assertEqual(str(self.category), "Test Division > Test Category")
    
    def test_subcategory_str(self):
        """Test the string representation of a Subcategory."""
        self.assertEqual(str(self.subcategory), "Test Division > Test Category > Test Subcategory")
    
    def test_uom_str(self):
        """Test the string representation of a UnitOfMeasure."""
        self.assertEqual(str(self.uom), "Pieces")
    
    def test_product_status_str(self):
        """Test the string representation of a ProductStatus."""
        self.assertEqual(str(self.status), "Available")
    
    def test_unique_constraints(self):
        """Test that unique constraints are enforced."""
        # Test Division unique constraint
        with self.assertRaises(IntegrityError):
            Division.objects.create(
                tenant=self.tenant,
                name="Test Division"  # Same name as existing division
            )
        
        # Test Category unique constraint
        with self.assertRaises(IntegrityError):
            Category.objects.create(
                tenant=self.tenant,
                division=self.division,
                name="Test Category"  # Same name as existing category
            )
        
        # Test Subcategory unique constraint
        with self.assertRaises(IntegrityError):
            Subcategory.objects.create(
                tenant=self.tenant,
                category=self.category,
                name="Test Subcategory"  # Same name as existing subcategory
            )
        
        # Test UnitOfMeasure unique constraints
        with self.assertRaises(IntegrityError):
            UnitOfMeasure.objects.create(
                tenant=self.tenant,
                code="PCS",  # Same code as existing UOM
                name="Pieces New"
            )
        
        with self.assertRaises(IntegrityError):
            UnitOfMeasure.objects.create(
                tenant=self.tenant,
                code="NEW",
                name="Pieces"  # Same name as existing UOM
            )
        
        # Test ProductStatus unique constraint
        with self.assertRaises(IntegrityError):
            ProductStatus.objects.create(
                tenant=self.tenant,
                name="Available"  # Same name as existing status
            )
