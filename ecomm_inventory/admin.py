from django.contrib import admin
from .models import (
    FulfillmentLocation,
    AdjustmentReason,
    Inventory,
    InventoryAdjustment,
    SerializedInventory,
    Lot
)

# Register your models here.

@admin.register(FulfillmentLocation)
class FulfillmentLocationAdmin(admin.ModelAdmin):
    list_display = ('name', 'location_type', 'is_active')
    list_filter = ('location_type', 'is_active')
    search_fields = ('name',)

@admin.register(AdjustmentReason)
class AdjustmentReasonAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name',)

@admin.register(Inventory)
class InventoryAdmin(admin.ModelAdmin):
    list_display = ('product', 'location', 'stock_quantity', 'reserved_quantity')
    list_filter = ('location',)
    search_fields = ('product__name', 'location__name')

@admin.register(InventoryAdjustment)
class InventoryAdjustmentAdmin(admin.ModelAdmin):
    list_display = ('inventory', 'adjustment_type', 'quantity_change', 'timestamp')
    list_filter = ('adjustment_type', 'reason')
    search_fields = ('inventory__product__name', 'notes')

@admin.register(SerializedInventory)
class SerializedInventoryAdmin(admin.ModelAdmin):
    list_display = ('product', 'serial_number', 'location', 'status')
    list_filter = ('status', 'location')
    search_fields = ('serial_number', 'product__name')

@admin.register(Lot)
class LotAdmin(admin.ModelAdmin):
    list_display = ('product', 'lot_number', 'location', 'quantity', 'status', 'expiry_date')
    list_filter = ('status', 'location', 'expiry_date')
    search_fields = ('lot_number', 'product__name')
