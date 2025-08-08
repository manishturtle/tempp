from decimal import Decimal
from typing import Optional, Tuple

from django.db import transaction
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.db.models import F, Sum

from datetime import date, datetime

# Import models
from .models import (
    Inventory,
    InventoryAdjustment,
    AdjustmentReason,
    AdjustmentType,
    FulfillmentLocation,
    SerializedInventory,
    SerialNumberStatus,
    Lot,
    LotStatus
)
from products.models import Product
from django.contrib.auth import get_user_model

User = get_user_model()

# Custom service exceptions
class InventoryServiceError(Exception):
    """Base exception for inventory service errors."""
    pass

class InsufficientStockError(InventoryServiceError):
    """Raised when there is insufficient stock for an operation."""
    pass

class InvalidAdjustmentError(InventoryServiceError):
    """Raised when an adjustment is invalid."""
    pass

@transaction.atomic
def perform_inventory_adjustment(
    *, 
    user: User,
    inventory: Inventory,
    adjustment_type: str,
    quantity_change: int,
    reason: AdjustmentReason,
    notes: Optional[str] = None,
    serial_number: Optional[str] = None,
    lot_number: Optional[str] = None,
    expiry_date: Optional[date] = None,
    lot_strategy: str = 'FEFO',  # 'FEFO' or 'FIFO'
    cost_price_per_unit: Optional[Decimal] = None
) -> InventoryAdjustment:
    """
    Perform an inventory adjustment with proper locking and validation.
    
    This function handles all types of inventory adjustments, ensuring data integrity
    through locking and transactions. It validates stock levels based on adjustment type
    and creates an audit record of the adjustment.
    
    Args:
        user: The user performing the adjustment
        inventory: The inventory record to adjust
        adjustment_type: Type of adjustment (ADD, SUB, RES, REL_RES, etc.)
        quantity_change: The quantity to adjust by (always positive)
        reason: The reason for the adjustment
        notes: Optional notes about the adjustment
        serial_number: Optional serial number for serialized inventory adjustments
        lot_number: Optional lot number for lot-tracked inventory adjustments
        expiry_date: Optional expiry date for lot-tracked inventory
        lot_strategy: Strategy for lot consumption ('FEFO' or 'FIFO')
        cost_price_per_unit: Optional cost price per unit for new lots
        
    Returns:
        The created InventoryAdjustment record
        
    Raises:
        ValidationError: If the adjustment is invalid (e.g., insufficient stock)
    """
    # --- 1. Lock Inventory Record & Get Product Info ---
    inventory_locked = Inventory.objects.select_for_update().get(pk=inventory.pk)
    product = inventory_locked.product
    is_serialized_product = product.is_serialized
    is_lotted_product = product.is_lotted
    
    # --- 2. Perform Initial Validations ---
    # Validate the adjustment type
    if adjustment_type not in dict(AdjustmentType.choices):
        raise ValidationError(f"Invalid adjustment type: {adjustment_type}")
    # Validate quantity change is positive
    if quantity_change <= 0:
        raise ValidationError("Quantity change must be a positive number")
    
    # Validate that we're not trying to handle both serialized and lotted at the same time
    if is_serialized_product and is_lotted_product:
        raise ValidationError("Product cannot be both serialized and lot-tracked")
    
    # --- 3. Validate Serial/Lot Details Based on Product Type and Adjustment Type ---
    target_serial: Optional[SerializedInventory] = None
    
    # Special handling for serialized inventory
    if is_serialized_product:
        # These adjustment types require a serial number
        if adjustment_type in ['ADD', 'SUB', 'RES', 'REL_RES', 'NON_SALE', 'HOLD', 'REL_HOLD', 'SHIP_ORD'] and not serial_number:
            raise ValidationError(f"Serial number is required for {adjustment_type} adjustment on serialized products")
        
        # For serialized inventory, we typically operate on one item at a time
        if quantity_change != 1:
            raise ValidationError("Serialized inventory adjustments must be for a quantity of 1")
        
        # Validate the serial number exists for operations that require an existing serial
        if serial_number and adjustment_type in ['SUB', 'RES', 'REL_RES', 'NON_SALE', 'HOLD', 'REL_HOLD', 'SHIP_ORD']:
            try:
                target_serial = SerializedInventory.objects.get(
                    serial_number=serial_number,
                    product=product,
                    location=inventory_locked.location
                )
            except SerializedInventory.DoesNotExist:
                raise ValidationError(f"Serial number '{serial_number}' not found for product '{product.sku}' at location '{inventory_locked.location.name}'")
            
            # Additional validation based on current status and target adjustment
            if adjustment_type == 'RES' and target_serial.status != SerialNumberStatus.AVAILABLE:
                raise ValidationError(f"Cannot reserve serial number '{serial_number}' because it is not in AVAILABLE status")
            
            if adjustment_type == 'REL_RES' and target_serial.status != SerialNumberStatus.RESERVED:
                raise ValidationError(f"Cannot release reservation for serial number '{serial_number}' because it is not in RESERVED status")
            
            if adjustment_type == 'REL_HOLD' and target_serial.status != SerialNumberStatus.ON_HOLD:
                raise ValidationError(f"Cannot release hold for serial number '{serial_number}' because it is not in ON_HOLD status")
    
    # Special handling for lot-tracked inventory
    if is_lotted_product:
        # These adjustment types require a lot number
        if adjustment_type in ['ADD', 'RECV_PO', 'RET_STOCK'] and not lot_number:
            raise ValidationError(f"Lot number is required for {adjustment_type} adjustment on lot-tracked products")
        
        # For release reservation, we need to validate the lot exists and is reserved
        if adjustment_type == 'REL_RES' and lot_number:
            try:
                reserved_lot = Lot.objects.get(
                    inventory_record=inventory_locked,
                    lot_number=lot_number,
                    status=LotStatus.RESERVED
                )
            except Lot.DoesNotExist:
                raise ValidationError(f"Reserved lot with number '{lot_number}' not found")
    
    # --- 4. Pre-computation/Validation (Consumption Logic) ---
    lots_to_consume_details: list[Tuple[Lot, int]] = []
    serial_to_reserve: Optional[SerializedInventory] = None
    
    # For lot-tracked products, find lots to consume from or reserve
    if is_lotted_product and adjustment_type in ['SUB', 'RES', 'SHIP_ORD', 'NON_SALE', 'HOLD']:
        try:
            lots_to_consume_details = find_lots_for_consumption(
                inventory=inventory_locked,
                quantity_needed=quantity_change,
                strategy=lot_strategy
            )
            
            if not lots_to_consume_details:
                raise ValidationError(f"Not enough available quantity to perform {adjustment_type} for {quantity_change} units")
        except ValidationError as e:
            raise ValidationError(f"Cannot perform '{adjustment_type}': {str(e)}")
    
    # For serialized products, find a serial to reserve if not specified
    if is_serialized_product and adjustment_type == 'RES' and not target_serial:
        serial_to_reserve = find_available_serial_for_reservation(inventory=inventory_locked)
        if not serial_to_reserve:
            raise ValidationError(f"Cannot perform '{adjustment_type}': No available serial number found for reservation")
    
    # --- 5. Process Based on Adjustment Type ---
    newly_created_serial: Optional[SerializedInventory] = None
    newly_created_or_updated_lot: Optional[Lot] = None
    
    if adjustment_type == 'ADD' or adjustment_type == 'RECV_PO' or adjustment_type == 'RET_STOCK':
        if is_serialized_product and serial_number:
            # Use the receive_serialized_item function for serialized products
            newly_created_serial = receive_serialized_item(
                inventory=inventory_locked, 
                serial_number=serial_number,
                status=SerialNumberStatus.AVAILABLE,
                user=user
            )
            # The receive_serialized_item function already updates the inventory quantity
            new_stock_quantity = inventory_locked.quantity  # Already updated by receive_serialized_item
        elif is_lotted_product and lot_number:
            # Use the add_quantity_to_lot function for lot-tracked products
            newly_created_or_updated_lot = add_quantity_to_lot(
                inventory=inventory_locked,
                lot_number=lot_number,
                quantity_to_add=quantity_change,
                expiry_date=expiry_date,
                cost_price_per_unit=cost_price_per_unit,
                user=user
            )
            # Update the inventory stock quantity
            inventory_locked.stock_quantity += quantity_change
            new_stock_quantity = inventory_locked.stock_quantity
        else:
            # For non-serialized, non-lotted products, just add to stock quantity
            inventory_locked.stock_quantity += quantity_change
            new_stock_quantity = inventory_locked.stock_quantity
    
    elif adjustment_type == 'SUB':
        # For subtraction, check if there's enough stock
        if is_serialized_product and target_serial:
            # Check if the serial number exists and is available
            if target_serial.status != SerialNumberStatus.AVAILABLE:
                raise ValidationError(
                    f"Serial number {serial_number} is not available (status: {target_serial.status})"
                )
            
            # Update the serial number status to SOLD or other appropriate status
            update_serialized_status(
                serial_item=target_serial,
                new_status=SerialNumberStatus.SOLD,
                user=user
            )
            
            # Update inventory quantities
            inventory_locked.stock_quantity -= 1
            new_stock_quantity = inventory_locked.stock_quantity
        elif is_lotted_product:
            # For lot-tracked products, find the appropriate lots to consume from
            lots_to_consume_details = find_lots_for_consumption(
                inventory=inventory_locked,
                quantity_needed=quantity_change,
                strategy=lot_strategy
            )
            
            # Check if we have enough quantity across all lots
            total_available = sum(qty for _, qty in lots_to_consume_details)
            if total_available < quantity_change:
                raise ValidationError(
                    f"Insufficient quantity across lots. Available: {total_available}, Requested: {quantity_change}"
                )
            
            # Track original quantity_change for audit purposes
            original_quantity_change = quantity_change
            
            # Consume from each lot
            for lot_tuple in lots_to_consume_details:
                lot, qty_available = lot_tuple  # Unpack the tuple
                qty_to_consume = min(quantity_change, qty_available)
                consume_quantity_from_lot(
                    lot=lot,
                    quantity_to_consume=qty_to_consume,
                    user=user
                )
                quantity_change -= qty_to_consume
                if quantity_change <= 0:
                    break
            
            # Update stock quantity - this is already handled by consume_quantity_from_lot
            # The inventory stock quantity is already updated, so we don't need to subtract again
            inventory_locked.stock_quantity -= original_quantity_change
            new_stock_quantity = inventory_locked.stock_quantity
        else:
            # Check if there's enough stock
            if inventory_locked.stock_quantity < quantity_change:
                raise ValidationError(
                    f"Insufficient stock. Current: {inventory_locked.stock_quantity}, Requested: {quantity_change}"
                )
            
            # Update stock quantity
            inventory_locked.stock_quantity -= quantity_change
            new_stock_quantity = inventory_locked.stock_quantity
    
    elif adjustment_type == 'RES':
        if is_serialized_product:
            # Use the specified serial or find an available one
            serial_item_to_reserve = target_serial or serial_to_reserve
            
            # Reserve the serialized item
            reserve_serialized_item(
                serial_item=serial_item_to_reserve,
                user=user
            )
            
            # The reserve_serialized_item function already updates the inventory quantities
            new_stock_quantity = inventory_locked.stock_quantity
        elif is_lotted_product:
            # For lot-tracked products, reserve from the appropriate lots
            remaining_to_reserve = quantity_change
            for lot_tuple in lots_to_consume_details:
                lot, qty_available = lot_tuple  # Unpack the tuple
                reserve_qty = min(remaining_to_reserve, qty_available)
                reserved_lot = reserve_lot_quantity(
                    lot=lot,
                    quantity_to_reserve=reserve_qty,
                    user=user
                )
                newly_created_or_updated_lot = reserved_lot  # Store the last reserved lot
                remaining_to_reserve -= reserve_qty
                if remaining_to_reserve <= 0:
                    break
            
            # Update inventory quantities
            inventory_locked.stock_quantity -= quantity_change
            inventory_locked.reserved_quantity += quantity_change
            new_stock_quantity = inventory_locked.stock_quantity
        else:
            # For regular inventory, just update the quantities
            if inventory_locked.stock_quantity < quantity_change:
                raise ValidationError(f"Not enough available quantity to reserve {quantity_change} units")
            
            inventory_locked.stock_quantity -= quantity_change
            inventory_locked.reserved_quantity += quantity_change
            new_stock_quantity = inventory_locked.stock_quantity
    
    elif adjustment_type == 'REL_RES':
        if is_serialized_product and target_serial:
            # Release the serialized item reservation
            update_serialized_status(
                serial_item=target_serial,
                new_status=SerialNumberStatus.AVAILABLE,
                user=user
            )
            
            # Update inventory quantities
            inventory_locked.stock_quantity += 1
            inventory_locked.reserved_quantity -= 1
            new_stock_quantity = inventory_locked.stock_quantity
        elif is_lotted_product and lot_number:
            # Find the reserved lot
            try:
                reserved_lot = Lot.objects.get(
                    inventory_record=inventory_locked,
                    lot_number=lot_number,
                    status=LotStatus.RESERVED
                )
            except Lot.DoesNotExist:
                raise ValidationError(f"Reserved lot with number {lot_number} not found")
            
            # Release the reservation
            release_lot_reservation(
                reserved_lot=reserved_lot,
                quantity_to_release=quantity_change,
                user=user
            )
            
            # Update inventory quantities
            inventory_locked.stock_quantity += quantity_change
            inventory_locked.reserved_quantity -= quantity_change
            new_stock_quantity = inventory_locked.stock_quantity
        else:
            # For regular inventory, just update the quantities
            if inventory_locked.reserved_quantity < quantity_change:
                raise ValidationError(f"Not enough reserved quantity to release {quantity_change} units")
            
            inventory_locked.stock_quantity += quantity_change
            inventory_locked.reserved_quantity -= quantity_change
            new_stock_quantity = inventory_locked.stock_quantity
    
    elif adjustment_type == 'NON_SALE':
        if is_serialized_product and target_serial:
            # Mark the serialized item as non-saleable
            update_serialized_status(
                serial_item=target_serial,
                new_status=SerialNumberStatus.NON_SALEABLE,
                user=user
            )
            
            # Update inventory quantities
            inventory_locked.stock_quantity -= 1
            inventory_locked.non_saleable_quantity += 1
            new_stock_quantity = inventory_locked.stock_quantity
        elif is_lotted_product:
            # For lot-tracked products, mark the appropriate lots as non-saleable
            # This is a simplified approach - in a real system, you might need to track
            # which specific lots were marked as non-saleable
            for lot_tuple in lots_to_consume_details:
                lot, qty_available = lot_tuple  # Unpack the tuple
                # Mark the lot as non-saleable
                lot.status = LotStatus.NON_SALEABLE
                lot.updated_by = user
                lot.save(update_fields=['status', 'last_updated', 'updated_by'])
            
            # Update inventory quantities
            inventory_locked.stock_quantity -= quantity_change
            inventory_locked.non_saleable_quantity += quantity_change
            new_stock_quantity = inventory_locked.stock_quantity
        else:
            # For regular inventory, just update the quantities
            if inventory_locked.stock_quantity < quantity_change:
                raise ValidationError(
                    f"Insufficient stock to mark as non-saleable. Current: {inventory_locked.stock_quantity}, Requested: {quantity_change}"
                )
            
            inventory_locked.stock_quantity -= quantity_change
            inventory_locked.non_saleable_quantity += quantity_change
            new_stock_quantity = inventory_locked.stock_quantity
    
    elif adjustment_type == 'HOLD':
        if is_serialized_product and target_serial:
            # Place the serialized item on hold
            update_serialized_status(
                serial_item=target_serial,
                new_status=SerialNumberStatus.ON_HOLD,
                user=user
            )
            
            # Update inventory quantities
            inventory_locked.stock_quantity -= 1
            inventory_locked.on_hold_quantity += 1
            new_stock_quantity = inventory_locked.stock_quantity
        elif is_lotted_product:
            # For lot-tracked products, place the appropriate lots on hold
            # This is a simplified approach - in a real system, you might need to track
            # which specific lots were placed on hold
            for lot_tuple in lots_to_consume_details:
                lot, qty_available = lot_tuple  # Unpack the tuple
                # Place the lot on hold
                lot.status = LotStatus.ON_HOLD
                lot.updated_by = user
                lot.save(update_fields=['status', 'last_updated', 'updated_by'])
            
            # Update inventory quantities
            inventory_locked.stock_quantity -= quantity_change
            inventory_locked.on_hold_quantity += quantity_change
            new_stock_quantity = inventory_locked.stock_quantity
        else:
            # For regular inventory, just update the quantities
            if inventory_locked.stock_quantity < quantity_change:
                raise ValidationError(
                    f"Insufficient stock to place on hold. Current: {inventory_locked.stock_quantity}, Requested: {quantity_change}"
                )
            
            inventory_locked.stock_quantity -= quantity_change
            inventory_locked.on_hold_quantity += quantity_change
            new_stock_quantity = inventory_locked.stock_quantity
    
    elif adjustment_type == 'REL_HOLD':
        if is_serialized_product and target_serial:
            # Release the serialized item from hold
            update_serialized_status(
                serial_item=target_serial,
                new_status=SerialNumberStatus.AVAILABLE,
                user=user
            )
            
            # Update inventory quantities
            inventory_locked.stock_quantity += 1
            inventory_locked.on_hold_quantity -= 1
            new_stock_quantity = inventory_locked.stock_quantity
        elif is_lotted_product:
            # For lot-tracked products, release the appropriate lots from hold
            # This requires knowing which lots are on hold
            on_hold_lots = Lot.objects.filter(
                inventory_record=inventory_locked,
                status=LotStatus.ON_HOLD
            ).order_by('created_at')
            
            remaining_to_release = quantity_change
            for lot in on_hold_lots:
                release_qty = min(remaining_to_release, lot.quantity)
                # Release the lot from hold
                lot.status = LotStatus.AVAILABLE
                lot.updated_by = user
                lot.save(update_fields=['status', 'last_updated', 'updated_by'])
                remaining_to_release -= release_qty
                if remaining_to_release <= 0:
                    break
            
            # Update inventory quantities
            inventory_locked.stock_quantity += quantity_change
            inventory_locked.on_hold_quantity -= quantity_change
            new_stock_quantity = inventory_locked.stock_quantity
        else:
            # For regular inventory, just update the quantities
            if inventory_locked.on_hold_quantity < quantity_change:
                raise ValidationError(
                    f"Insufficient on-hold stock to release. Current: {inventory_locked.on_hold_quantity}, Requested: {quantity_change}"
                )
            
            inventory_locked.stock_quantity += quantity_change
            inventory_locked.on_hold_quantity -= quantity_change
            new_stock_quantity = inventory_locked.stock_quantity
    
    elif adjustment_type == 'CYCLE':
        # Cycle count adjustments are special - they set the absolute quantity rather than adjusting
        # This is a simplified implementation - in a real system, you might need to handle
        # serialized and lotted items differently
        old_quantity = inventory_locked.stock_quantity
        inventory_locked.stock_quantity = quantity_change
        new_stock_quantity = inventory_locked.stock_quantity
        
        # Add a note about the change
        if notes:
            notes += f" | Adjusted from {old_quantity} to {quantity_change}"
        else:
            notes = f"Cycle count adjustment from {old_quantity} to {quantity_change}"
    
    else:
        # This should never happen due to the validation above
        raise ValidationError(f"Unhandled adjustment type: {adjustment_type}")
    
    # --- 6. Save the Inventory Changes ---
    inventory_locked.last_updated = timezone.now()
    inventory_locked.save()
    
    # --- 7. Create an Adjustment Record ---
    adjustment_notes = notes or ""
    
    # Add information about the specific serial/lot affected
    if is_serialized_product and (target_serial or newly_created_serial):
        serial_info = target_serial or newly_created_serial
        adjustment_notes += f" | Serial: {serial_info.serial_number}"
    
    if is_lotted_product and newly_created_or_updated_lot:
        adjustment_notes += f" | Lot: {newly_created_or_updated_lot.lot_number}"
    
    adjustment = InventoryAdjustment.objects.create(
        inventory=inventory_locked,
        user=user,
        adjustment_type=adjustment_type,
        quantity_change=quantity_change,
        reason=reason,
        notes=adjustment_notes,
        new_stock_quantity=new_stock_quantity
    )
    
    return adjustment

# Additional service functions can be added below
def get_available_inventory(product_id: int, location_id: Optional[int] = None) -> int:
    """
    Get the available inventory quantity for a product, optionally at a specific location.
    
    Args:
        product_id: The ID of the product
        location_id: Optional location ID to filter by
    
    Returns:
        int: The total available quantity
    """
    query = Inventory.objects.filter(product_id=product_id)
    
    if location_id:
        query = query.filter(location_id=location_id)
    
    # Calculate available inventory (total - reserved - non_saleable - hold)
    total_available = query.aggregate(
        available=Sum(
            F('stock_quantity') - F('reserved_quantity') - F('non_saleable_quantity') - F('hold_quantity')
        )
    )['available'] or 0
    
    return total_available

# Serialized Inventory Service Functions
def receive_serialized_item(
    *,
    inventory: Inventory, 
    serial_number: str,
    status: str = SerialNumberStatus.AVAILABLE,
    # cost_price: Optional[Decimal] = None # Add if tracking cost per serial
    # Optional: Link to source document
) -> SerializedInventory:
    """
    Creates a new SerializedInventory record upon receiving.
    Assumes product/location validation done beforehand or via inventory record.
    Does NOT update the summary Inventory quantity itself.
    """
    if not inventory.product.is_serialized:
        raise ValidationError(f"Product '{inventory.product.sku}' is not tracked by serial number.")

    # Check for duplicates for the same product (unique_together should also enforce)
    if SerializedInventory.objects.filter(product=inventory.product, serial_number=serial_number).exists():
        raise ValidationError(f"Serial number '{serial_number}' already exists for product '{inventory.product.sku}'.")

    item = SerializedInventory.objects.create(
        product=inventory.product,
        location=inventory.location,
        inventory_record=inventory, 
        serial_number=serial_number,
        status=status,
        # cost_price=cost_price,
    )
    # Consider adding logging here if desired
    # print(f"Serialized item {serial_number} received for {inventory.product.sku} at {inventory.location.name}.")
    return item

def update_serialized_status(
    *,
    serial_item: SerializedInventory,
    new_status: str,
    # Optional: Link to related document (order, adjustment)
    # related_adjustment: Optional[InventoryAdjustment] = None
) -> SerializedInventory:
    """
    Updates the status of a specific SerializedInventory item.
    Performs basic validation on status transitions.
    """
    if new_status not in SerialNumberStatus.values:
        raise ValidationError(f"Invalid target status '{new_status}' provided.")

    current_status = serial_item.status
    if current_status == new_status:
        return serial_item # No change needed

    # --- Add Status Transition Validation Logic ---
    # Example: Cannot move from SOLD back to AVAILABLE directly
    if current_status == SerialNumberStatus.SOLD and new_status == SerialNumberStatus.AVAILABLE:
        raise ValidationError("Cannot change status directly from SOLD to AVAILABLE. Use return process.")
    # Example: Cannot reserve if not available
    if new_status == SerialNumberStatus.RESERVED and current_status != SerialNumberStatus.AVAILABLE:
         raise ValidationError(f"Cannot reserve item. Status is '{current_status}', not '{SerialNumberStatus.AVAILABLE}'.")
    # Example: Cannot ship if not reserved/available (based on business rules)
    if new_status == SerialNumberStatus.SOLD and current_status not in [SerialNumberStatus.RESERVED, SerialNumberStatus.AVAILABLE]:
         raise ValidationError(f"Cannot ship item. Status is '{current_status}'.")
    # Add more rules based on your defined statuses and workflows

    serial_item.status = new_status
    # Ensure last_updated is handled (auto_now=True on model field is typical)
    serial_item.save(update_fields=['status']) # Only save status field if last_updated is auto
    # Consider adding logging here if desired
    # print(f"Status for SN {serial_item.serial_number} updated from {current_status} to {new_status}.")
    return serial_item

def find_available_serial_for_reservation(
    *,
    inventory: Inventory,
) -> Optional[SerializedInventory]:
    """
    Finds an available serial number for a given inventory record (product/location).
    Returns None if product isn't serialized or no serials are available.
    """
    if not inventory.product.is_serialized:
        return None # Not applicable

    # Simple: find the first available one using FIFO based on created_at.
    # Adjust order_by for LIFO or other strategies if needed.
    available_serial = SerializedInventory.objects.filter(
        inventory_record=inventory, 
        status=SerialNumberStatus.AVAILABLE
    ).order_by('created_at').first() # Example FIFO

    return available_serial

def reserve_serialized_item(
    *,
    serial_item: SerializedInventory,
    # order_line: OrderLine # Consider adding link to order line causing reservation
) -> SerializedInventory:
    """Marks a specific serialized item as RESERVED, validating current status."""
    # Validation moved into update_serialized_status example, but can be explicit here too
    # if serial_item.status != SerialNumberStatus.AVAILABLE:
    #     raise ValidationError(f"Serial number {serial_item.serial_number} is not AVAILABLE for reservation (Status: {serial_item.status}).")

    # Use the central status update function
    return update_serialized_status(serial_item=serial_item, new_status=SerialNumberStatus.RESERVED)

def ship_serialized_item(
    *,
    serial_item: SerializedInventory,
    # order_line: OrderLine # Consider adding link to order line being shipped
) -> SerializedInventory:
    """Marks a specific serialized item as SOLD (or shipped), validating current status."""
    # Validation moved into update_serialized_status example
    # if serial_item.status not in [SerialNumberStatus.RESERVED, SerialNumberStatus.AVAILABLE]:
    #     raise ValidationError(f"Serial number {serial_item.serial_number} cannot be shipped (Status: {serial_item.status}).")

    # Use the central status update function
    return update_serialized_status(serial_item=serial_item, new_status=SerialNumberStatus.SOLD)

def release_serialized_item_reservation(
    *,
    inventory: Inventory,
    serial_number: str,
    user: User
) -> SerializedInventory:
    """Releases a serialized item reservation."""
    try:
        serialized_item = SerializedInventory.objects.get(
            serial_number=serial_number,
            product=inventory.product,
            location=inventory.location,
            status=SerialNumberStatus.RESERVED
        )
    except SerializedInventory.DoesNotExist:
        raise ValidationError(f"Reserved serialized item with serial number {serial_number} not found")

    # Update the status back to AVAILABLE
    return update_serialized_status(serial_item=serialized_item, new_status=SerialNumberStatus.AVAILABLE)

# Lot Inventory Service Functions
@transaction.atomic
def add_quantity_to_lot(
    *,
    inventory: Inventory,
    lot_number: str,
    quantity_to_add: int,
    expiry_date: Optional[date] = None,
    # Removing received_date parameter as we'll use created_at from the model
    cost_price_per_unit: Optional[Decimal] = None,  # Optional
    user: Optional[settings.AUTH_USER_MODEL] = None  # For tracking who made the change
) -> Lot:
    """
    Adds quantity to a specific lot, creating the lot if it doesn't exist.
    Called during receiving processes.
    
    Args:
        inventory: The inventory record to add the lot to
        lot_number: The lot number identifier
        quantity_to_add: The quantity to add (must be positive)
        expiry_date: Optional expiry date for the lot
        cost_price_per_unit: Optional cost price per unit
        user: Optional user who performed the action
        
    Returns:
        The updated or created Lot instance
        
    Raises:
        ValidationError: If the product is not lot-tracked or quantity is invalid
    """
    from django.db import connection
    
    if quantity_to_add <= 0:
        raise ValidationError("Quantity to add must be positive.")
    
    if not inventory.product.is_lotted:
        raise ValidationError("Product is not tracked by lot number.")
    
    # Ensure we're using the inventory schema in the search path
    if hasattr(connection, 'inventory_schema') and hasattr(connection, 'schema_name'):
        with connection.cursor() as cursor:
            # Explicitly set search path to prioritize inventory schema
            cursor.execute(f'SET search_path TO "{connection.inventory_schema}", "{connection.schema_name}", public')
            
            # Log the current search path for debugging
            cursor.execute("SHOW search_path")
            current_search_path = cursor.fetchone()[0]
            print(f"Current search path for add_quantity_to_lot: {current_search_path}")
            
            # Check if the lot table exists in the inventory schema
            cursor.execute(f"""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = '{connection.inventory_schema}'
                    AND table_name = 'inventory_lot'
                )
            """)
            table_exists = cursor.fetchone()[0]
            if not table_exists:
                print(f"WARNING: inventory_lot table does not exist in {connection.inventory_schema} schema!")
    
    # Lock the inventory record to prevent race conditions
    inventory = Inventory.objects.select_for_update().get(pk=inventory.pk)
    
    # Check if the lot already exists - use direct SQL to ensure correct schema
    lot = None
    created = False
    
    if hasattr(connection, 'inventory_schema'):
        with connection.cursor() as cursor:
            # Try to find the lot in the inventory schema
            cursor.execute(f"""
                SELECT id FROM "{connection.inventory_schema}"."inventory_lot"
                WHERE inventory_record_id = %s
                AND product_id = %s
                AND location_id = %s
                AND lot_number = %s
                AND status = 'AVAILABLE'
            """, [inventory.id, inventory.product.id, inventory.location.id, lot_number])
            
            result = cursor.fetchone()
            if result:
                # Lot exists, get it
                lot_id = result[0]
                try:
                    lot = Lot.objects.get(pk=lot_id)
                    created = False
                except Lot.DoesNotExist:
                    print(f"WARNING: Found lot ID {lot_id} in database but couldn't retrieve via ORM!")
            else:
                # Create new lot directly in the inventory schema
                created = True
                lot = Lot(
                    inventory_record=inventory,
                    product=inventory.product,
                    location=inventory.location,
                    lot_number=lot_number,
                    quantity=quantity_to_add,
                    expiry_date=expiry_date,
                    cost_price_per_unit=cost_price_per_unit,
                    updated_by=user
                )
                lot.save()
    else:
        # Fallback if no inventory schema is set
        try:
            lot = Lot.objects.get(
                inventory_record=inventory,
                product=inventory.product,
                location=inventory.location,
                lot_number=lot_number,
                status=LotStatus.AVAILABLE
            )
            created = False
        except Lot.DoesNotExist:
            # Create new lot
            lot = Lot(
                inventory_record=inventory,
                product=inventory.product,
                location=inventory.location,
                lot_number=lot_number,
                quantity=quantity_to_add,
                expiry_date=expiry_date,
                cost_price_per_unit=cost_price_per_unit,
                updated_by=user
            )
            lot.save()
            created = True
    
    if not created:
        # Lot exists, add quantity atomically
        # Ensure expiry/received dates match if needed, or handle updates
        if expiry_date and lot.expiry_date != expiry_date:
            # Log the change but don't update the expiry date of existing lot
            # This is a business decision - some companies update, others create new lots
            print(f"Warning: Existing Lot {lot_number} has different expiry date than provided.")
        
        # Update the quantity directly instead of using F()
        lot.quantity += quantity_to_add
        lot.updated_by = user
        lot.save(update_fields=['quantity', 'last_updated', 'updated_by'])
        lot.refresh_from_db()  # Get the updated quantity
    
    # Verify the lot was saved in the correct schema
    if hasattr(connection, 'inventory_schema'):
        with connection.cursor() as cursor:
            cursor.execute(f"""
                SELECT EXISTS (
                    SELECT 1 FROM "{connection.inventory_schema}"."inventory_lot"
                    WHERE id = %s
                )
            """, [lot.id])
            exists_in_inventory_schema = cursor.fetchone()[0]
            
            if exists_in_inventory_schema:
                print(f"Lot {lot.id} exists in the inventory schema {connection.inventory_schema}")
            else:
                print(f"WARNING: Lot {lot.id} does NOT exist in the inventory schema {connection.inventory_schema}!")
                
                # Check if it exists in the public schema
                cursor.execute(f"""
                    SELECT EXISTS (
                        SELECT 1 FROM public.inventory_lot
                        WHERE id = %s
                    )
                """, [lot.id])
                exists_in_public = cursor.fetchone()[0]
                
                if exists_in_public:
                    print(f"WARNING: Lot {lot.id} exists in the PUBLIC schema instead!")
    
    # Note: This doesn't increase Inventory summary quantity.
    # That should be done via perform_inventory_adjustment(type='ADD').
    print(f"Added {quantity_to_add} to Lot {lot_number} ({inventory.product.sku}). New Qty: {lot.quantity}.")
    return lot


@transaction.atomic
def consume_quantity_from_lot(
    *,
    lot: Lot,
    quantity_to_consume: int,
    user: Optional[settings.AUTH_USER_MODEL] = None  # For tracking who made the change
) -> Lot:
    """
    Decreases the quantity of a specific lot.
    Called during shipping, subtraction adjustments, etc.
    
    Args:
        lot: The lot to consume from
        quantity_to_consume: The quantity to consume (must be positive)
        user: Optional user who performed the action
        
    Returns:
        The updated Lot instance
        
    Raises:
        ValidationError: If the quantity to consume exceeds available quantity
    """
    from django.db import connection
    
    if quantity_to_consume <= 0:
        raise ValidationError("Quantity to consume must be positive.")
    
    if quantity_to_consume > lot.quantity:
        raise ValidationError(f"Cannot consume {quantity_to_consume} from lot {lot.lot_number}. Only {lot.quantity} available.")
    
    # Ensure we're using the inventory schema in the search path
    if hasattr(connection, 'inventory_schema') and hasattr(connection, 'schema_name'):
        with connection.cursor() as cursor:
            cursor.execute(f'SET search_path TO "{connection.inventory_schema}", "{connection.schema_name}", public')
    
    # Lock the lot record to prevent race conditions
    lot = Lot.objects.select_for_update().get(pk=lot.pk)
    
    # Update the quantity
    lot.quantity -= quantity_to_consume
    lot.updated_by = user
    
    # If quantity is now zero, mark as consumed
    if lot.quantity == 0:
        lot.status = LotStatus.CONSUMED
    
    lot.save(update_fields=['quantity', 'status', 'last_updated', 'updated_by'])
    lot.refresh_from_db()  # Get the updated quantity
    
    print(f"Consumed {quantity_to_consume} from Lot {lot.lot_number} ({lot.product.sku}). Remaining: {lot.quantity}.")
    return lot


def find_lots_for_consumption(
    *,
    inventory: Inventory,
    quantity_needed: int,
    strategy: str = 'FEFO'  # 'FEFO' or 'FIFO'
) -> list[Tuple[Lot, int]]:
    """
    Finds which lots to consume from to fulfill the quantity_needed,
    based on the specified strategy (FEFO or FIFO).
    
    Args:
        inventory: The inventory record to find lots for
        quantity_needed: The total quantity needed
        strategy: The allocation strategy ('FEFO' or 'FIFO')
        
    Returns:
        A list of tuples: [(lot_instance, quantity_to_consume_from_this_lot), ...]
        Returns an empty list if sufficient quantity isn't available across valid lots.
        
    Raises:
        ValidationError: If the product is not lot-tracked or insufficient quantity is available
    """
    if not inventory.product.is_lotted:
        raise ValidationError("Product is not lot tracked.")
    
    if quantity_needed <= 0:
        return []
    
    # Base queryset: lots for this inventory item with quantity > 0
    lot_queryset = Lot.objects.filter(
        inventory_record=inventory,
        quantity__gt=0,
        status=LotStatus.AVAILABLE  # Only consider available lots
    )
    
    # Apply strategy for ordering
    if strategy == 'FEFO':
        # Prioritize lots with earliest expiry date, then earliest created date
        # Handle null expiry dates (treat them as potentially non-expiring or last priority)
        lot_queryset = lot_queryset.order_by(
            F('expiry_date').asc(nulls_last=True),
            'created_at'
        )
    elif strategy == 'FIFO':
        # Prioritize lots with earliest created date
        lot_queryset = lot_queryset.order_by('created_at')
    else:
        raise ValidationError("Invalid consumption strategy. Use 'FEFO' or 'FIFO'.")
    
    lots_to_consume = []
    quantity_allocated = 0
    
    # First, check if we have enough total quantity
    available_total = lot_queryset.aggregate(total=Sum('quantity'))['total'] or 0
    
    if available_total < quantity_needed:
        raise ValidationError(
            f"Insufficient total lot quantity ({available_total}) to fulfill request for {quantity_needed}."
        )
    
    # Now allocate from individual lots
    for lot in lot_queryset:
        # Skip expired lots if using FEFO
        if strategy == 'FEFO' and lot.is_expired():
            continue
        
        qty_from_this_lot = min(lot.quantity, quantity_needed - quantity_allocated)
        if qty_from_this_lot > 0:
            lots_to_consume.append((lot, qty_from_this_lot))
            quantity_allocated += qty_from_this_lot
        
        if quantity_allocated >= quantity_needed:
            break  # We have allocated enough
    
    # Double check allocation matches needed quantity
    if quantity_allocated < quantity_needed:
        # This indicates an issue with our allocation logic or filtering
        raise ValidationError(
            f"Internal Error: Failed to allocate sufficient lot quantity ({quantity_allocated}/{quantity_needed})."
        )
    
    return lots_to_consume


@transaction.atomic
def reserve_lot_quantity(
    *,
    lot: Lot,
    quantity_to_reserve: int,
    user: Optional[settings.AUTH_USER_MODEL] = None
) -> Lot:
    """
    Reserves a quantity from a specific lot.
    Updates the lot status to RESERVED if the entire quantity is reserved.
    
    Args:
        lot: The lot to reserve from
        quantity_to_reserve: The quantity to reserve
        user: Optional user who performed the action
        
    Returns:
        The updated Lot instance
    """
    from django.db import connection
    
    if quantity_to_reserve <= 0:
        raise ValidationError("Quantity to reserve must be positive.")
    
    if quantity_to_reserve > lot.quantity:
        raise ValidationError(f"Cannot reserve {quantity_to_reserve} from lot {lot.lot_number}. Only {lot.quantity} available.")
    
    # Ensure we're using the inventory schema in the search path
    if hasattr(connection, 'inventory_schema') and hasattr(connection, 'schema_name'):
        with connection.cursor() as cursor:
            cursor.execute(f'SET search_path TO "{connection.inventory_schema}", "{connection.schema_name}", public')
    
    # Lock the lot record to prevent race conditions
    lot = Lot.objects.select_for_update().get(pk=lot.pk)
    
    # Create a new reserved lot with the same properties but RESERVED status
    reserved_lot = Lot.objects.create(
        product=lot.product,
        location=lot.location,
        inventory_record=lot.inventory_record,
        lot_number=lot.lot_number,
        quantity=quantity_to_reserve,
        expiry_date=lot.expiry_date,
        cost_price_per_unit=lot.cost_price_per_unit,
        status=LotStatus.RESERVED,
        parent_lot=lot,
        updated_by=user
    )
    
    # Decrease the quantity in the original lot
    lot.quantity -= quantity_to_reserve
    lot.updated_by = user
    
    # If all quantity is now reserved, mark the original lot as consumed
    if lot.quantity == 0:
        lot.status = LotStatus.CONSUMED
    
    lot.save(update_fields=['quantity', 'status', 'last_updated', 'updated_by'])
    
    print(f"Reserved {quantity_to_reserve} from Lot {lot.lot_number}. Original lot remaining: {lot.quantity}.")
    return reserved_lot


@transaction.atomic
def release_lot_reservation(
    *,
    reserved_lot: Lot,
    quantity_to_release: int,
    user: Optional[settings.AUTH_USER_MODEL] = None
) -> Lot:
    """
    Releases a reservation on a lot, making the quantity available again.
    
    Args:
        reserved_lot: The reserved lot
        quantity_to_release: The quantity to release back to available
        user: Optional user who performed the action
        
    Returns:
        The updated available Lot instance
    """
    from django.db import connection
    
    if quantity_to_release <= 0:
        raise ValidationError("Quantity to release must be positive.")
    
    if reserved_lot.status != LotStatus.RESERVED:
        raise ValidationError(f"Cannot release reservation on lot with status {reserved_lot.status}.")
    
    if quantity_to_release > reserved_lot.quantity:
        raise ValidationError(
            f"Cannot release {quantity_to_release} from reserved lot {reserved_lot.lot_number}. "
            f"Only {reserved_lot.quantity} reserved."
        )
    
    # Ensure we're using the inventory schema in the search path
    if hasattr(connection, 'inventory_schema') and hasattr(connection, 'schema_name'):
        with connection.cursor() as cursor:
            cursor.execute(f'SET search_path TO "{connection.inventory_schema}", "{connection.schema_name}", public')
    
    # Lock the reserved lot record to prevent race conditions
    reserved_lot = Lot.objects.select_for_update().get(pk=reserved_lot.pk)
    
    # Find or create the available lot with the same properties
    available_lot, created = Lot.objects.get_or_create(
        product=reserved_lot.product,
        location=reserved_lot.location,
        inventory_record=reserved_lot.inventory_record,
        lot_number=reserved_lot.lot_number,
        status=LotStatus.AVAILABLE,
        defaults={
            'quantity': 0,
            'expiry_date': reserved_lot.expiry_date,
            'cost_price_per_unit': reserved_lot.cost_price_per_unit,
            'updated_by': user
        }
    )
    
    # Update the quantities
    available_lot.quantity += quantity_to_release
    available_lot.updated_by = user
    available_lot.save(update_fields=['quantity', 'last_updated', 'updated_by'])
    
    # Update the reserved lot
    reserved_lot.quantity -= quantity_to_release
    reserved_lot.updated_by = user
    
    if reserved_lot.quantity == 0:
        # If all quantity is released, delete the reserved lot
        reserved_lot.delete()
        print(f"Released all {quantity_to_release} from reserved Lot {reserved_lot.lot_number}. Reserved lot deleted.")
    else:
        # Otherwise just update the quantity
        reserved_lot.save(update_fields=['quantity', 'last_updated', 'updated_by'])
        print(f"Released {quantity_to_release} from reserved Lot {reserved_lot.lot_number}. "
              f"Reserved quantity remaining: {reserved_lot.quantity}.")
    
    return available_lot


@transaction.atomic
def mark_lot_as_expired(
    *,
    lot: Lot,
    user: Optional[settings.AUTH_USER_MODEL] = None
) -> Lot:
    """
    Marks a lot as expired.
    
    Args:
        lot: The lot to mark as expired
        user: Optional user who performed the action
        
    Returns:
        The updated Lot instance
    """
    # Lock the lot record
    lot = Lot.objects.select_for_update().get(pk=lot.pk)
    
    if lot.status == LotStatus.EXPIRED:
        return lot  # Already expired
    
    lot.status = LotStatus.EXPIRED
    lot.updated_by = user
    lot.save()
    
    return lot


# --- Integration with Adjustments (Conceptual) ---
"""
Integration Notes for Lot and Serialized Inventory Management

1. Inventory Adjustment Integration
   The perform_inventory_adjustment function has been enhanced to handle both serialized
   and lot-tracked inventory items. It now accepts additional parameters:
   
   - serial_number: For serialized inventory operations
   - lot_number: For lot-tracked inventory operations
   - expiry_date: For setting expiry dates on new lots
   - lot_strategy: 'FEFO' (First-Expired, First-Out) or 'FIFO' (First-In, First-Out)
   - cost_price_per_unit: For tracking cost basis of inventory

2. Serialized Inventory Flow
   - When receiving: Use receive_serialized_item to create a new serialized record
   - When reserving: Use reserve_serialized_item to mark an item as reserved
   - When shipping: Use ship_serialized_item to mark an item as sold/shipped
   - When updating status: Use update_serialized_status for any status change

3. Lot Inventory Flow
   - When receiving: Use add_quantity_to_lot to add quantity to a specific lot
   - When consuming: Use consume_quantity_from_lot to reduce quantity from a lot
   - When allocating: Use find_lots_for_consumption to determine which lots to use
   - When reserving: Use reserve_lot_quantity to reserve quantity from a lot
   - When releasing: Use release_lot_reservation to release reserved quantity

4. API Integration Considerations
   - API endpoints should accept lot/serial parameters when needed
   - For lot-tracked products, consider exposing lot selection strategy as an option
   - Validate lot numbers and serial numbers at the API level
   - Consider implementing batch operations for efficiency

5. Business Rules
   - FEFO (First-Expired, First-Out): Prioritize lots with earliest expiry dates
   - FIFO (First-In, First-Out): Prioritize lots received earliest
   - Expired lots should be automatically detected and marked
   - Consider implementing automatic lot status updates based on expiry dates
"""
