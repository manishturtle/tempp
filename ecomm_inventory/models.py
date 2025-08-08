from django.db import models, connection
from django.db.models import Sum, F, Q
from django.conf import settings
from django.core.validators import MinValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from core.models import BaseTenantModel

# Using BaseTenantModel from core.models instead of a custom BaseModel

# Helper methods for database operations
class DatabaseHelper:
    @staticmethod
    def create_table_if_not_exists(cls):
        """
        Create the table in the current tenant schema if it doesn't exist.
        Dynamically generates SQL for creating tables based on model definition.
        """
        from django.db import connection
        from django.db import models
        import logging
        
        logger = logging.getLogger(__name__)
        
        # Get the current schema name
        schema_name = connection.schema_name
        logger.info(f"Checking if table exists in schema {schema_name}")
        
        # Get the table name
        table_name = cls._meta.db_table
        
        # Check if the table exists in the current schema
        with connection.cursor() as cursor:
            # Format the query to check if the table exists in the current schema
            query = """
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = %s
                    AND table_name = %s
                );
            """
            cursor.execute(query, [schema_name, table_name])
            table_exists = cursor.fetchone()[0]
            
            if not table_exists:
                logger.info(f"Table {table_name} does not exist in schema {schema_name}. Creating it now.")
                
                try:
                    # Dynamically generate table creation SQL
                    columns = []
                    fk_constraints = []
                    
                    # Always add common InventoryAwareModel fields
                    columns.extend([
                        '"id" serial NOT NULL PRIMARY KEY',
                        '"created_at" timestamp with time zone NOT NULL',
                        '"updated_at" timestamp with time zone NOT NULL',
                        '"client_id" integer NOT NULL',
                        '"company_id" integer NOT NULL',
                        '"created_by_id" integer NULL',
                        '"updated_by_id" integer NULL'
                    ])
                    
                    # Add foreign key constraints for created_by and updated_by
                    fk_constraints.extend([
                        f'ADD CONSTRAINT "{table_name}_created_by_id_fkey" '
                        f'FOREIGN KEY ("created_by_id") REFERENCES "{schema_name}"."auth_user" ("id") '
                        'DEFERRABLE INITIALLY DEFERRED',
                        f'ADD CONSTRAINT "{table_name}_updated_by_id_fkey" '
                        f'FOREIGN KEY ("updated_by_id") REFERENCES "{schema_name}"."auth_user" ("id") '
                        'DEFERRABLE INITIALLY DEFERRED'
                    ])
                    
                    # Dynamically add model-specific fields
                    for field in cls._meta.fields:
                        # Skip fields already added or primary key
                        if field.column in [col.split()[0].strip('"') for col in columns] or field.primary_key:
                            continue
                        
                        # Map Django field types to PostgreSQL types
                        if isinstance(field, models.IntegerField):
                            col_type = 'integer'
                        elif isinstance(field, models.PositiveIntegerField):
                            col_type = 'integer CHECK (value >= 0)'
                        elif isinstance(field, models.CharField):
                            col_type = f'varchar({field.max_length or 255})'
                        elif isinstance(field, models.TextField):
                            col_type = 'text'
                        elif isinstance(field, models.DateTimeField):
                            col_type = 'timestamp with time zone'
                        elif isinstance(field, models.DateField):
                            col_type = 'date'
                        elif isinstance(field, models.BooleanField):
                            col_type = 'boolean'
                        elif isinstance(field, models.DecimalField):
                            col_type = f'numeric({field.max_digits or 10},{field.decimal_places or 2})'
                        elif isinstance(field, (models.ForwardManyToOneDescriptor, models.ForwardOneToOneDescriptor, models.ReverseOneToOneDescriptor)):
                            # Foreign key
                            related_table = field.related_model._meta.db_table
                            col_type = 'integer'
                            fk_constraints.append(
                                f'ADD CONSTRAINT "{table_name}_{field.column}_fkey" '
                                f'FOREIGN KEY ("{field.column}") REFERENCES "{schema_name}"."{related_table}" ("id") '
                                'DEFERRABLE INITIALLY DEFERRED'
                            )
                        elif isinstance(field, models.ForeignKey):
                            # Foreign key
                            related_table = field.related_model._meta.db_table
                            col_type = 'integer'
                            fk_constraints.append(
                                f'ADD CONSTRAINT "{table_name}_{field.column}_fkey" '
                                f'FOREIGN KEY ("{field.column}") REFERENCES "{schema_name}"."{related_table}" ("id") '
                                'DEFERRABLE INITIALLY DEFERRED'
                            )
                        else:
                            # Fallback for unsupported types
                            col_type = 'text'
                        
                        # Determine nullability
                        null_constraint = 'NULL' if field.null else 'NOT NULL'
                        
                        # Add column definition
                        columns.append(f'"{field.column}" {col_type} {null_constraint}')
                    
                    # Create table SQL
                    create_table_sql = f"""
                    CREATE TABLE "{schema_name}"."{table_name}" (
                        {','.join(columns)}
                    );
                    """
                    
                    # Execute table creation
                    cursor.execute(create_table_sql)
                    
                    # Add foreign key constraints
                    for constraint in fk_constraints:
                        try:
                            cursor.execute(f"""
                            ALTER TABLE "{schema_name}"."{table_name}" 
                            {constraint};
                            """)
                        except Exception as e:
                            logger.warning(f"Could not create foreign key constraint: {str(e)}")
                    
                    logger.info(f"Successfully created table {table_name} in schema {schema_name}")
                    return True
                
                except Exception as e:
                    logger.error(f"Error creating table {table_name} in schema {schema_name}: {str(e)}")
                    return False
            else:
                logger.info(f"Table {table_name} already exists in schema {schema_name}")
        
        return True


    @staticmethod
    def get_db_table(cls):
        """
        Returns the database table name.
        """
        return cls._meta.db_table
    
    @staticmethod
    def check_table_exists(cls):
        """
        Check if the table exists.
        """
        with connection.cursor() as cursor:
            cursor.execute(f"""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = %s
                )
            """, [cls._meta.db_table])
            return cursor.fetchone()[0]
    
    @staticmethod
    def get_table_name(instance):
        """
        Returns the fully qualified table name for this model instance.
        """
        return instance.__class__._meta.db_table
        
    @staticmethod
    def save_with_tenant_context(instance, *args, **kwargs):
        # Set the current time for created_at and updated_at
        if not instance.pk:
            instance.created_at = timezone.now()
        instance.updated_at = timezone.now()
        
        # Set client_id based on the current schema if not already set
        if not hasattr(instance, 'client_id') or not instance.client_id:
            if hasattr(connection, 'schema_name') and connection.schema_name != 'public':
                # Get the tenant ID based on the schema name
                with connection.cursor() as cursor:
                    cursor.execute("SELECT id FROM public.tenants_tenant WHERE schema_name = %s", [connection.schema_name])
                    result = cursor.fetchone()
                    if result:
                        instance.client_id = result[0]
        
        # Set company_id to default value of 1 if not set
        if hasattr(instance, 'company_id') and not instance.company_id:
            instance.company_id = 1
            
        # Use the tenant schema for saving
        with connection.cursor() as cursor:
            # Set search path to prioritize tenant schema
            cursor.execute(f'SET search_path TO "{connection.schema_name}", public')

class LocationType(models.TextChoices):
    WAREHOUSE = 'WAREHOUSE', 'Warehouse'
    STORE = 'STORE', 'Store'
    FULFILLMENT_CENTER = 'FULFILLMENT_CENTER', 'Fulfillment Center'
    DROPSHIP = 'DROPSHIP', 'Dropship'
    SUPPLIER = 'SUPPLIER', 'Supplier'
    OTHER = 'OTHER', 'Other'

class AdjustmentType(models.TextChoices):
    ADDITION = 'ADD', 'Addition'
    SUBTRACTION = 'SUB', 'Subtraction'
    RESERVATION = 'RES', 'Reservation'
    RELEASE_RESERVATION = 'REL_RES', 'Release Reservation'
    NON_SALEABLE = 'NON_SALE', 'Mark Non-Saleable'
    RECEIVE_ORDER = 'RECV_PO', 'Receive Purchase Order'
    SHIP_ORDER = 'SHIP_ORD', 'Ship Sales Order'
    RETURN_TO_STOCK = 'RET_STOCK', 'Return to Stock'
    MOVE_TO_NON_SALEABLE = 'RET_NON_SALE', 'Return to Non-Saleable'
    HOLD = 'HOLD', 'Place on Hold'
    RELEASE_HOLD = 'REL_HOLD', 'Release from Hold'
    CYCLE_COUNT = 'CYCLE', 'Cycle Count Adjustment'
    INITIAL_STOCK = 'INIT', 'Initial Stock Load'

class SerialNumberStatus(models.TextChoices):
    AVAILABLE = 'AVAILABLE', 'Available'
    RESERVED = 'RESERVED', 'Reserved (Order Pending)'
    SOLD = 'SOLD', 'Sold (Shipped)'
    IN_TRANSIT = 'IN_TRANSIT', 'In Transit (Transfer)'
    RETURNED = 'RETURNED', 'Returned (Pending Inspection)'
    DAMAGED = 'DAMAGED', 'Damaged / Non-Saleable'

class LotStatus(models.TextChoices):
    AVAILABLE = 'AVAILABLE', 'Available'
    RESERVED = 'RESERVED', 'Reserved (Order Pending)'
    EXPIRED = 'EXPIRED', 'Expired'
    QUARANTINE = 'QUARANTINE', 'In Quarantine'
    DAMAGED = 'DAMAGED', 'Damaged / Non-Saleable'

class FulfillmentLocation(BaseTenantModel):
    name = models.CharField(max_length=255)
    location_type = models.CharField(max_length=50, choices=LocationType.choices)
    address_line_1 = models.CharField(max_length=255, blank=True, null=True)
    address_line_2 = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state_province = models.CharField(max_length=100, blank=True, null=True)
    postal_code = models.CharField(max_length=20, blank=True, null=True)
    country_code = models.CharField(max_length=2, blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Fulfillment Location"
        verbose_name_plural = "Fulfillment Locations"
        ordering = ['name']
        unique_together = [('client_id', 'name')]

    def __str__(self):
        return self.name

class AdjustmentReason(BaseTenantModel):
    name = models.CharField(
        max_length=100, 
        help_text="Short name for the reason (e.g., 'Cycle Count Discrepancy')"
    )
    description = models.TextField(
        blank=True, 
        null=True, 
        help_text="Optional longer description"
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Inventory Adjustment Reason'
        verbose_name_plural = 'Inventory Adjustment Reasons'
        ordering = ['name']
        unique_together = [('client_id', 'name')]

    def __str__(self):
        return self.name

class Inventory(BaseTenantModel):
    product = models.ForeignKey(
        'products.Product', 
        on_delete=models.CASCADE, 
        related_name='inventory_levels'
    )
    location = models.ForeignKey(
        FulfillmentLocation, 
        on_delete=models.CASCADE, 
        related_name='inventory_levels'
    )
    stock_quantity = models.PositiveIntegerField(
        default=0,
        validators=[MinValueValidator(0)]
    )
    reserved_quantity = models.PositiveIntegerField(
        default=0,
        validators=[MinValueValidator(0)]
    )
    non_saleable_quantity = models.PositiveIntegerField(
        default=0,
        validators=[MinValueValidator(0)]
    )
    on_order_quantity = models.PositiveIntegerField(
        default=0,
        validators=[MinValueValidator(0)]
    )
    in_transit_quantity = models.PositiveIntegerField(
        default=0,
        validators=[MinValueValidator(0)]
    )
    returned_quantity = models.PositiveIntegerField(
        default=0,
        validators=[MinValueValidator(0)]
    )
    hold_quantity = models.PositiveIntegerField(
        default=0,
        validators=[MinValueValidator(0)]
    )
    backorder_quantity = models.PositiveIntegerField(
        default=0,
        validators=[MinValueValidator(0)]
    )
    low_stock_threshold = models.PositiveIntegerField(
        null=True, 
        blank=True,
        validators=[MinValueValidator(0)]
    )
    reorder_point = models.PositiveIntegerField(
        default=10,
        validators=[MinValueValidator(0)],
        help_text="Stock level at which to trigger a reorder"
    )
    reorder_quantity = models.PositiveIntegerField(
        default=20,
        validators=[MinValueValidator(0)],
        help_text="Quantity to order when stock reaches reorder point"
    )

    class Meta:
        unique_together = [('client_id', 'product', 'location')]
        verbose_name_plural = 'Inventories'
        ordering = ['product__name', 'location__name']

    # Calculate available to promise
    def get_available_to_promise(self):
        return max(0, self.stock_quantity - self.reserved_quantity)

    def __str__(self):
        return f"{self.product} at {self.location}"

class SerializedInventory(BaseTenantModel):
    product = models.ForeignKey(
        'products.Product', 
        on_delete=models.CASCADE, 
        related_name='serial_numbers',
        limit_choices_to={'is_serialized': True}
    )
    location = models.ForeignKey(
        'FulfillmentLocation', 
        on_delete=models.CASCADE, 
        related_name='serial_numbers'
    )
    inventory_record = models.ForeignKey(
        'Inventory', 
        on_delete=models.CASCADE, 
        related_name='serial_numbers', 
        null=True, 
        blank=True,
        help_text="Link to the main Inventory record for this product/location"
    )
    serial_number = models.CharField(
        max_length=255, 
        db_index=True,
        help_text="Unique serial number for this product unit"
    )
    status = models.CharField(
        max_length=20, 
        choices=SerialNumberStatus.choices,
        default=SerialNumberStatus.AVAILABLE,
        db_index=True
    )
    notes = models.TextField(
        blank=True,
        null=True,
        help_text="Optional notes about this serial number (e.g., damage details)"
    )
    # Remove received_date and last_updated as they're already in InventoryAwareModel as created_at and updated_at

    class Meta:
        verbose_name = "Serialized Inventory Item"
        verbose_name_plural = "Serialized Inventory Items"
        unique_together = [('client_id', 'product', 'serial_number')]
        ordering = ['product__name', 'serial_number']
        indexes = [
            models.Index(fields=['product', 'serial_number']),
            models.Index(fields=['status', 'location']),
        ]

    def clean(self):
        if not self.product.is_serialized:
            raise ValidationError(
                f"Cannot create serial number for non-serialized product {self.product}"
            )
        
        if self.inventory_record and (
            self.inventory_record.product != self.product or 
            self.inventory_record.location != self.location
        ):
            raise ValidationError(
                "Inventory record must match the product and location"
            )

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.product.name} - SN: {self.serial_number} @ {self.location.name} ({self.status})"

class Lot(BaseTenantModel):
    """
    Represents a specific batch or lot of a product.
    Lots are used for tracking products with expiry dates, manufacturing dates,
    or other batch-specific attributes.
    """
    product = models.ForeignKey(
        'products.Product', 
        on_delete=models.CASCADE, 
        related_name='lots',
        limit_choices_to={'is_lotted': True}
    )
    location = models.ForeignKey(
        'FulfillmentLocation',
        on_delete=models.CASCADE,
        related_name='lots'
    )
    inventory_record = models.ForeignKey(
        'Inventory', 
        on_delete=models.CASCADE, 
        related_name='lots', 
        null=True, 
        blank=True,
        help_text="Link to the main Inventory record for this product/location"
    )
    lot_number = models.CharField(
        max_length=100, 
        db_index=True, 
        help_text="Identifier for the batch/lot"
    )
    quantity = models.PositiveIntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Quantity of this product from this lot at this location"
    )
    status = models.CharField(
        max_length=20,
        choices=LotStatus.choices,
        default=LotStatus.AVAILABLE,
        db_index=True
    )
    expiry_date = models.DateField(
        null=True, 
        blank=True, 
        db_index=True, 
        help_text="Expiry date for this lot, if applicable"
    )
    manufacturing_date = models.DateField(
        null=True,
        blank=True,
        help_text="Manufacturing date for this lot"
    )
    # Removing received_date as it's redundant with created_at from InventoryAwareModel
    cost_price_per_unit = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Cost price per unit for this lot"
    )
    notes = models.TextField(
        blank=True,
        null=True,
        help_text="Optional notes about this lot"
    )
    # parent_lot field already exists in the database
    parent_lot = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='child_lots',
        help_text="Parent lot if this was split from another lot"
    )

    class Meta:
        verbose_name = "Inventory Lot/Batch"
        verbose_name_plural = "Inventory Lots/Batches"
        unique_together = [('client_id', 'product', 'location', 'lot_number', 'status')]
        ordering = ['product', 'location', 'created_at', 'expiry_date']
        indexes = [
            models.Index(fields=['product', 'lot_number']),
            models.Index(fields=['status', 'location']),
            models.Index(fields=['expiry_date']),
        ]

    def clean(self):
        if self.quantity < 0:
            raise ValidationError("Lot quantity cannot be negative.")
        
        if self.product_id:
            try:
                from products.models import Product
                product = Product.objects.get(id=self.product_id)
                if not product.is_lotted:
                    raise ValidationError(f"Product {product.sku} is not marked for lot tracking.")
            except Product.DoesNotExist:
                pass  # Let the database handle this error
            
        if self.expiry_date and self.manufacturing_date:
            if self.expiry_date <= self.manufacturing_date:
                raise ValidationError("Expiry date must be after manufacturing date.")

    def save(self, *args, **kwargs):
        # Update status if expired
        if self.expiry_date and self.expiry_date < timezone.now().date():
            self.status = LotStatus.EXPIRED
            
        # Call the InventoryAwareModel save method which handles schema
        super().save(*args, **kwargs)

    def is_expired(self):
        if not self.expiry_date:
            return False
        return self.expiry_date < timezone.now().date()

    def __str__(self):
        status_str = f" [{self.status}]" if self.status != LotStatus.AVAILABLE else ""
        expiry_str = f", Expires: {self.expiry_date}" if self.expiry_date else ""
        return f"Lot: {self.lot_number} ({self.product.name} @ {self.location.name}) - Qty: {self.quantity}{status_str}{expiry_str}"

class InventoryAdjustment(BaseTenantModel):
    inventory = models.ForeignKey(
        Inventory, 
        on_delete=models.CASCADE, 
        related_name='adjustments'
    )
    adjustment_type = models.CharField(
        max_length=20, 
        choices=AdjustmentType.choices
    )
    quantity_change = models.IntegerField(
        help_text="The change in quantity (positive for additions, negative for subtractions)"
    )
    reason = models.ForeignKey(
        AdjustmentReason,
        on_delete=models.PROTECT,
        related_name='adjustments'
    )
    notes = models.TextField(
        blank=True, 
        null=True, 
        help_text="Optional additional details for the adjustment"
    )
    new_stock_quantity = models.IntegerField(
        help_text="The stock_quantity AFTER this adjustment"
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    custom_fields = models.JSONField(default=dict, null=True, blank=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = "Inventory Adjustment"
        verbose_name_plural = "Inventory Adjustments"

    def __str__(self):
        return f"{self.adjustment_type} {self.quantity_change} of {self.inventory.product.name} at {self.inventory.location.name}"
