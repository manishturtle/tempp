from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from django.utils import timezone
from decimal import Decimal
import json

# Import models
from .models import (
    FulfillmentLocation,
    AdjustmentReason,
    Inventory,
    InventoryAdjustment,
    SerializedInventory,
    Lot,
    AdjustmentType
)


class InventoryAPITests(TestCase):
    """Test cases for Inventory API endpoints."""
    
    def setUp(self):
        """Set up test data for inventory API tests."""
        # This is a documentation-style test case to outline what should be tested
        # These tests won't actually run in the tenant context
        
        # In a real test environment, you would need:
        # 1. A tenant context
        # 2. Authentication credentials
        # 3. Test data setup
        
        # Example of how to set up test data:
        # Create test products
        # self.product = Product.objects.create(name='Test Product', sku='TP001')
        
        # Create fulfillment locations
        # self.location = FulfillmentLocation.objects.create(name='Warehouse 1', address='123 Test St')
        
        # Create adjustment reasons
        # self.reason = AdjustmentReason.objects.create(
        #     name='Receipt', 
        #     description='Inventory receipt',
        #     adjustment_type=AdjustmentType.ADD
        # )
        
        # Create initial inventory
        # self.inventory = Inventory.objects.create(
        #     product=self.product,
        #     location=self.location,
        #     quantity=100
        # )
        
        # Set up client with tenant domain and authentication
        # self.client.defaults['HTTP_HOST'] = 'tenant.example.com'
        # self.client.credentials(HTTP_AUTHORIZATION='Bearer token')
        pass
    
    def test_list_inventory(self):
        """Test listing inventory records."""
        # GET /api/inventory/
        # Expected response: 200 OK with list of inventory records
        # url = reverse('inventory:inventory-list')
        # response = self.client.get(url)
        # self.assertEqual(response.status_code, status.HTTP_200_OK)
        # self.assertGreater(len(response.data['results']), 0)
        pass
    
    def test_get_inventory_detail(self):
        """Test retrieving a specific inventory record."""
        # GET /api/inventory/{id}/
        # Expected response: 200 OK with inventory details
        # url = reverse('inventory:inventory-detail', args=[self.inventory.id])
        # response = self.client.get(url)
        # self.assertEqual(response.status_code, status.HTTP_200_OK)
        # self.assertEqual(response.data['product'], self.product.id)
        pass
    
    def test_add_inventory_endpoint(self):
        """Test the add_inventory custom endpoint.
        
        Endpoint: /api/v1/inventory/add_inventory/
        Method: POST
        Required Fields:
          * product_id: ID of the product
          * location_id: ID of the fulfillment location
          * quantity: Quantity to add
          * adjustment_reason_id: ID of the adjustment reason
        Optional Fields:
          * notes: Additional notes about the inventory addition
        Returns:
          * Updated inventory record
          * Inventory adjustment record
        """
        # POST /api/inventory/add_inventory/
        # url = reverse('inventory:inventory-add-inventory')
        # data = {
        #     'product_id': self.product.id,
        #     'location_id': self.location.id,
        #     'quantity': 50,
        #     'adjustment_reason_id': self.reason.id,
        #     'notes': 'Test inventory addition'
        # }
        # response = self.client.post(url, data, format='json')
        # self.assertEqual(response.status_code, status.HTTP_200_OK)
        # 
        # # Verify inventory was updated
        # self.inventory.refresh_from_db()
        # self.assertEqual(self.inventory.quantity, 150)  # 100 + 50
        # 
        # # Verify adjustment record was created
        # adjustment = InventoryAdjustment.objects.latest('created_at')
        # self.assertEqual(adjustment.inventory.id, self.inventory.id)
        # self.assertEqual(adjustment.quantity_change, 50)
        # self.assertEqual(adjustment.reason.id, self.reason.id)
        pass
    
    def test_add_inventory_with_invalid_data(self):
        """Test add_inventory endpoint with invalid data."""
        # Test cases should include:
        # 1. Missing required fields
        # 2. Invalid product ID
        # 3. Invalid location ID
        # 4. Invalid reason ID
        # 5. Negative or zero quantity
        pass
    
    def test_add_inventory_unauthorized(self):
        """Test add_inventory endpoint with unauthorized user."""
        # Test with unauthenticated user
        # Test with authenticated but unauthorized user
        pass
    
    def test_inventory_adjustment_creation(self):
        """Test creating an inventory adjustment record."""
        # Test direct creation of adjustment records
        # Verify inventory quantity is updated accordingly
        pass
    
    def test_serialized_inventory(self):
        """Test serialized inventory operations."""
        # Test operations on serialized inventory:
        # 1. Adding serialized inventory with serial numbers
        # 2. Retrieving serialized inventory
        # 3. Updating serialized inventory status
        pass
    
    def test_lot_inventory(self):
        """Test lot-tracked inventory operations."""
        # Test operations on lot-tracked inventory:
        # 1. Adding inventory to specific lots
        # 2. Retrieving lot information
        # 3. Consuming from lots
        pass


class InventoryAPITestCase(InventoryTestCase):
    """Test case for Inventory API endpoints."""
    
    def setUp(self):
        super().setUp()
        
        # Create test data
        self.category = Category.objects.create(
            name='Test Category',
            slug='test-category',
            description='Test Category Description'
        )
        
        # Create test products
        self.product1 = Product.objects.create(
            name='Test Product 1',
            sku='TP001',
            description='Test Product 1 Description',
            category=self.category,
            price=Decimal('10.00'),
            is_active=True
        )
        
        self.product2 = Product.objects.create(
            name='Test Product 2',
            sku='TP002',
            description='Test Product 2 Description',
            category=self.category,
            price=Decimal('20.00'),
            is_active=True,
            is_serialized=True
        )
        
        self.product3 = Product.objects.create(
            name='Test Product 3',
            sku='TP003',
            description='Test Product 3 Description',
            category=self.category,
            price=Decimal('30.00'),
            is_active=True,
            is_lotted=True
        )
        
        # Create fulfillment locations
        self.location1 = FulfillmentLocation.objects.create(
            name='Warehouse 1',
            address='123 Warehouse St',
            is_active=True
        )
        
        self.location2 = FulfillmentLocation.objects.create(
            name='Warehouse 2',
            address='456 Storage Ave',
            is_active=True
        )
        
        # Create adjustment reasons
        self.reason_receipt = AdjustmentReason.objects.create(
            name='Receipt',
            description='Inventory receipt',
            adjustment_type=AdjustmentType.ADD,
            is_active=True
        )
        
        self.reason_sale = AdjustmentReason.objects.create(
            name='Sale',
            description='Sale adjustment',
            adjustment_type=AdjustmentType.SUB,
            is_active=True
        )
        
        self.reason_damage = AdjustmentReason.objects.create(
            name='Damage',
            description='Damaged inventory',
            adjustment_type=AdjustmentType.SUB,
            is_active=True
        )
        
        # Create initial inventory records
        self.inventory1 = Inventory.objects.create(
            product=self.product1,
            location=self.location1,
            quantity=100
        )
        
        self.inventory2 = Inventory.objects.create(
            product=self.product2,
            location=self.location1,
            quantity=50
        )
        
        self.inventory3 = Inventory.objects.create(
            product=self.product3,
            location=self.location1,
            quantity=75
        )
    
    def test_list_inventory(self):
        """Test listing inventory records."""
        url = reverse('inventory:inventory-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 3)
    
    def test_get_inventory_detail(self):
        """Test retrieving a specific inventory record."""
        url = reverse('inventory:inventory-detail', args=[self.inventory1.id])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['product'], self.product1.id)
        self.assertEqual(response.data['location'], self.location1.id)
        self.assertEqual(response.data['quantity'], 100)
    
    def test_create_inventory(self):
        """Test creating a new inventory record."""
        url = reverse('inventory:inventory-list')
        data = {
            'product': self.product1.id,
            'location': self.location2.id,
            'quantity': 50
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Inventory.objects.count(), 4)
        
        # Verify the created inventory record
        new_inventory = Inventory.objects.get(product=self.product1, location=self.location2)
        self.assertEqual(new_inventory.quantity, 50)
    
    def test_update_inventory(self):
        """Test updating an existing inventory record."""
        url = reverse('inventory:inventory-detail', args=[self.inventory1.id])
        data = {
            'product': self.product1.id,
            'location': self.location1.id,
            'quantity': 150
        }
        
        response = self.client.put(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify the updated inventory record
        self.inventory1.refresh_from_db()
        self.assertEqual(self.inventory1.quantity, 150)
    
    def test_delete_inventory(self):
        """Test deleting an inventory record."""
        # Create a new inventory record to delete
        inventory_to_delete = Inventory.objects.create(
            product=self.product1,
            location=self.location2,
            quantity=25
        )
        
        url = reverse('inventory:inventory-detail', args=[inventory_to_delete.id])
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Inventory.objects.count(), 3)
        
        # Verify the inventory record was deleted
        with self.assertRaises(Inventory.DoesNotExist):
            Inventory.objects.get(id=inventory_to_delete.id)
    
    def test_add_inventory_endpoint(self):
        """Test the add_inventory custom endpoint."""
        url = reverse('inventory:inventory-add-inventory')
        data = {
            'product_id': self.product1.id,
            'location_id': self.location1.id,
            'quantity': 50,
            'adjustment_reason_id': self.reason_receipt.id,
            'notes': 'Test inventory addition'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify inventory was updated
        self.inventory1.refresh_from_db()
        self.assertEqual(self.inventory1.quantity, 150)  # 100 + 50
        
        # Verify adjustment record was created
        adjustment = InventoryAdjustment.objects.latest('created_at')
        self.assertEqual(adjustment.inventory, self.inventory1)
        self.assertEqual(adjustment.quantity_change, 50)
        self.assertEqual(adjustment.reason, self.reason_receipt)
        self.assertEqual(adjustment.notes, 'Test inventory addition')
    
    def test_add_inventory_with_invalid_data(self):
        """Test add_inventory endpoint with invalid data."""
        url = reverse('inventory:inventory-add-inventory')
        
        # Test with missing required fields
        data = {
            'product_id': self.product1.id,
            'location_id': self.location1.id,
            # Missing quantity
            'adjustment_reason_id': self.reason_receipt.id
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Test with invalid product ID
        data = {
            'product_id': 9999,  # Non-existent product
            'location_id': self.location1.id,
            'quantity': 50,
            'adjustment_reason_id': self.reason_receipt.id
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Test with negative quantity
        data = {
            'product_id': self.product1.id,
            'location_id': self.location1.id,
            'quantity': -10,  # Negative quantity
            'adjustment_reason_id': self.reason_receipt.id
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_add_inventory_unauthorized(self):
        """Test add_inventory endpoint with unauthorized user."""
        # Create a new client without authentication
        unauthorized_client = APIClient()
        unauthorized_client.defaults['HTTP_HOST'] = f'{self.tenant.schema_name}.localhost'
        
        # Or use the regular user if available
        # unauthorized_client.force_authenticate(user=self.regular_user)
        
        url = reverse('inventory:inventory-add-inventory')
        data = {
            'product_id': self.product1.id,
            'location_id': self.location1.id,
            'quantity': 50,
            'adjustment_reason_id': self.reason_receipt.id
        }
        
        response = unauthorized_client.post(url, data, format='json')
        
        # Endpoint should require authentication
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])
    
    def test_inventory_adjustment_creation(self):
        """Test creating an inventory adjustment record."""
        url = reverse('inventory:inventoryadjustment-list')
        data = {
            'inventory': self.inventory1.id,
            'adjustment_type': AdjustmentType.SUB,
            'quantity_change': 25,
            'reason': self.reason_sale.id,
            'notes': 'Test sale adjustment'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify inventory was updated
        self.inventory1.refresh_from_db()
        self.assertEqual(self.inventory1.quantity, 75)  # 100 - 25
        
        # Verify adjustment record was created
        adjustment = InventoryAdjustment.objects.latest('created_at')
        self.assertEqual(adjustment.inventory, self.inventory1)
        self.assertEqual(adjustment.quantity_change, 25)
        self.assertEqual(adjustment.reason, self.reason_sale)
        self.assertEqual(adjustment.notes, 'Test sale adjustment')


class SerializedInventoryAPITestCase(InventoryTestCase):
    """Test case for Serialized Inventory API endpoints."""
    
    def setUp(self):
        super().setUp()
        
        # Create test data
        self.category = Category.objects.create(
            name='Electronics',
            slug='electronics',
            description='Electronic products'
        )
        
        # Create a serialized product
        self.serialized_product = Product.objects.create(
            name='Laptop',
            sku='LAP001',
            description='High-end laptop',
            category=self.category,
            price=Decimal('1200.00'),
            is_active=True,
            is_serialized=True
        )
        
        # Create fulfillment location
        self.location = FulfillmentLocation.objects.create(
            name='Main Warehouse',
            address='100 Main St',
            is_active=True
        )
        
        # Create adjustment reasons
        self.reason_receipt = AdjustmentReason.objects.create(
            name='Receipt',
            description='Inventory receipt',
            adjustment_type=AdjustmentType.ADD,
            is_active=True
        )
        
        self.reason_sale = AdjustmentReason.objects.create(
            name='Sale',
            description='Sale adjustment',
            adjustment_type=AdjustmentType.SUB,
            is_active=True
        )
        
        # Create inventory record for serialized product
        self.serialized_inventory = Inventory.objects.create(
            product=self.serialized_product,
            location=self.location,
            quantity=0  # Initially 0 as we'll add serialized items
        )
        
        # Create serialized inventory items
        self.serial_numbers = ['SN001', 'SN002', 'SN003']
        for sn in self.serial_numbers:
            SerializedInventory.objects.create(
                inventory=self.serialized_inventory,
                serial_number=sn,
                status='AVAILABLE'
            )
        
        # Update the inventory quantity to match serialized items
        self.serialized_inventory.quantity = len(self.serial_numbers)
        self.serialized_inventory.save()
    
    def test_list_serialized_inventory(self):
        """Test listing serialized inventory records."""
        url = reverse('inventory:serializedinventory-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 3)
    
    def test_get_serialized_inventory_detail(self):
        """Test retrieving a specific serialized inventory record."""
        serialized_item = SerializedInventory.objects.get(serial_number='SN001')
        url = reverse('inventory:serializedinventory-detail', args=[serialized_item.id])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['serial_number'], 'SN001')
        self.assertEqual(response.data['status'], 'AVAILABLE')
    
    def test_create_serialized_inventory(self):
        """Test creating a new serialized inventory record."""
        url = reverse('inventory:serializedinventory-list')
        data = {
            'inventory': self.serialized_inventory.id,
            'serial_number': 'SN004',
            'status': 'AVAILABLE'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(SerializedInventory.objects.count(), 4)
        
        # Verify the serialized inventory was created
        serialized_item = SerializedInventory.objects.get(serial_number='SN004')
        self.assertEqual(serialized_item.inventory, self.serialized_inventory)
        self.assertEqual(serialized_item.status, 'AVAILABLE')
        
        # Verify inventory quantity was updated
        self.serialized_inventory.refresh_from_db()
        self.assertEqual(self.serialized_inventory.quantity, 4)


class LotInventoryAPITestCase(InventoryTestCase):
    """Test case for Lot Inventory API endpoints."""
    
    def setUp(self):
        super().setUp()
        
        # Create test data
        self.category = Category.objects.create(
            name='Pharmaceuticals',
            slug='pharmaceuticals',
            description='Pharmaceutical products'
        )
        
        # Create a lot-tracked product
        self.lotted_product = Product.objects.create(
            name='Medicine',
            sku='MED001',
            description='Generic medicine',
            category=self.category,
            price=Decimal('15.00'),
            is_active=True,
            is_lotted=True
        )
        
        # Create fulfillment location
        self.location = FulfillmentLocation.objects.create(
            name='Pharmacy Warehouse',
            address='200 Pharma St',
            is_active=True
        )
        
        # Create adjustment reasons
        self.reason_receipt = AdjustmentReason.objects.create(
            name='Receipt',
            description='Inventory receipt',
            adjustment_type=AdjustmentType.ADD,
            is_active=True
        )
        
        # Create inventory record for lotted product
        self.lotted_inventory = Inventory.objects.create(
            product=self.lotted_product,
            location=self.location,
            quantity=0  # Initially 0 as we'll add lots
        )
        
        # Create lot records
        self.lot1 = Lot.objects.create(
            product=self.lotted_product,
            location=self.location,
            inventory_record=self.lotted_inventory,
            lot_number='LOT001',
            quantity=50,
            status='AVAILABLE',
            expiry_date=timezone.now() + timezone.timedelta(days=180)
        )
        
        self.lot2 = Lot.objects.create(
            product=self.lotted_product,
            location=self.location,
            inventory_record=self.lotted_inventory,
            lot_number='LOT002',
            quantity=30,
            status='AVAILABLE',
            expiry_date=timezone.now() + timezone.timedelta(days=365)
        )
        
        # Update the inventory quantity to match lot quantities
        self.lotted_inventory.quantity = self.lot1.quantity + self.lot2.quantity
        self.lotted_inventory.save()
    
    def test_list_lots(self):
        """Test listing lot records."""
        url = reverse('inventory:lot-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
    
    def test_get_lot_detail(self):
        """Test retrieving a specific lot record."""
        url = reverse('inventory:lot-detail', args=[self.lot1.id])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['lot_number'], 'LOT001')
        self.assertEqual(response.data['quantity'], 50)
    
    def test_create_lot(self):
        """Test creating a new lot record."""
        url = reverse('inventory:lot-list')
        expiry_date = (timezone.now() + timezone.timedelta(days=270)).strftime('%Y-%m-%d')
        data = {
            'product': self.lotted_product.id,
            'location': self.location.id,
            'inventory_record': self.lotted_inventory.id,
            'lot_number': 'LOT003',
            'quantity': 25,
            'status': 'AVAILABLE',
            'expiry_date': expiry_date
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Lot.objects.count(), 3)
        
        # Verify the lot was created
        lot = Lot.objects.get(lot_number='LOT003')
        self.assertEqual(lot.quantity, 25)
        
        # Verify inventory quantity was updated
        self.lotted_inventory.refresh_from_db()
        self.assertEqual(self.lotted_inventory.quantity, 105)  # 50 + 30 + 25
    
    def test_inventory_lots_endpoint(self):
        """Test the inventory/{id}/lots/ endpoint."""
        url = reverse('inventory:inventory-lots', args=[self.lotted_inventory.id])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        
        # Verify lot data is correct
        lot_numbers = [lot['lot_number'] for lot in response.data]
        self.assertIn('LOT001', lot_numbers)
        self.assertIn('LOT002', lot_numbers)
    
    def test_add_lot_endpoint(self):
        """Test the inventory/{id}/add_lot/ endpoint."""
        url = reverse('inventory:inventory-add-lot', args=[self.lotted_inventory.id])
        expiry_date = (timezone.now() + timezone.timedelta(days=270)).strftime('%Y-%m-%d')
        data = {
            'lot_number': 'LOT004',
            'quantity': 40,
            'expiry_date': expiry_date,
            'cost_price_per_unit': '12.50'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify the lot was created
        lot = Lot.objects.get(lot_number='LOT004')
        self.assertEqual(lot.quantity, 40)
        self.assertEqual(lot.cost_price_per_unit, Decimal('12.50'))
        
        # Verify inventory quantity was updated
        self.lotted_inventory.refresh_from_db()
        self.assertEqual(self.lotted_inventory.quantity, 120)  # 50 + 30 + 40
