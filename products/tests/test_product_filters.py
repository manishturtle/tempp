import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from products.models import Product, PublicationStatus


@pytest.fixture
def tenant(db):
    from tenants.models import Tenant
    return Tenant.objects.create(name="Test Tenant")

@pytest.fixture
def api_client(tenant):
    client = APIClient()
    # Mock tenant middleware
    client.tenant = tenant
    return client

@pytest.fixture
def products(tenant):
    """Create test products with different publication statuses"""
    products = {
        'active': Product.objects.create(
            tenant=tenant,
            name="Active Product",
            sku="SKU-ACTIVE",
            publication_status=PublicationStatus.ACTIVE
        ),
        'draft': Product.objects.create(
            tenant=tenant,
            name="Draft Product",
            sku="SKU-DRAFT",
            publication_status=PublicationStatus.DRAFT
        ),
        'archived': Product.objects.create(
            tenant=tenant,
            name="Archived Product",
            sku="SKU-ARCHIVED",
            publication_status=PublicationStatus.ARCHIVED
        )
    }
    return products


class TestProductFilters:
    
    def test_default_publication_status_filter(self, api_client, products):
        """Test that only ACTIVE products are returned by default"""
        url = reverse('product-list')
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        # Should only return active products
        assert len(data) == 1
        assert data[0]['sku'] == 'SKU-ACTIVE'
    
    def test_explicit_publication_status_filter(self, api_client, products):
        """Test filtering by specific publication status"""
        url = reverse('product-list')
        
        # Test DRAFT filter
        response = api_client.get(f"{url}?publication_status={PublicationStatus.DRAFT}")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 1
        assert data[0]['sku'] == 'SKU-DRAFT'
        
        # Test ARCHIVED filter
        response = api_client.get(f"{url}?publication_status={PublicationStatus.ARCHIVED}")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 1
        assert data[0]['sku'] == 'SKU-ARCHIVED'
    
    def test_multiple_publication_status_filter(self, api_client, products):
        """Test filtering by multiple publication statuses"""
        url = reverse('product-list')
        statuses = f"{PublicationStatus.ACTIVE},{PublicationStatus.DRAFT}"
        
        response = api_client.get(f"{url}?publication_status={statuses}")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        # Should return both active and draft products
        assert len(data) == 2
        skus = {item['sku'] for item in data}
        assert skus == {'SKU-ACTIVE', 'SKU-DRAFT'}
    
    def test_invalid_publication_status_filter(self, api_client, products):
        """Test filtering with invalid publication status"""
        url = reverse('product-list')
        
        response = api_client.get(f"{url}?publication_status=INVALID")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
