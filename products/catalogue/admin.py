from django.contrib import admin
from .models import Division, Category, Subcategory, UnitOfMeasure, ProductStatus


@admin.register(Division)
class DivisionAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'company_id', 'client', 'is_active', 'created_at', 'updated_at')
    list_filter = ('is_active', 'created_at', 'updated_at')
    search_fields = ('name', 'company_id', 'description')
    readonly_fields = ('company_id',)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'company_id', 'division', 'client', 'is_active', 'created_at', 'updated_at')
    list_filter = ('is_active', 'division', 'created_at', 'updated_at')
    search_fields = ('name', 'company_id', 'description')
    readonly_fields = ('company_id',)


@admin.register(Subcategory)
class SubcategoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'company_id', 'category', 'client', 'is_active', 'created_at', 'updated_at')
    list_filter = ('is_active', 'category', 'created_at', 'updated_at')
    search_fields = ('name', 'company_id', 'description')
    readonly_fields = ('company_id',)


@admin.register(UnitOfMeasure)
class UnitOfMeasureAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'company_id', 'symbol', 'unit_type', 'client', 'is_active', 'created_at', 'updated_at')
    list_filter = ('is_active', 'unit_type', 'created_at', 'updated_at')
    search_fields = ('name', 'company_id', 'symbol', 'description')
    readonly_fields = ('company_id',)


@admin.register(ProductStatus)
class ProductStatusAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'company_id', 'client', 'is_orderable', 'created_at', 'updated_at')
    list_filter = ('is_orderable', 'created_at', 'updated_at')
    search_fields = ('name', 'company_id')
    readonly_fields = ('company_id',)
