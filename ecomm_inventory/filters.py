import django_filters
from django.db.models import F, ExpressionWrapper, fields, Q
from .models import Inventory, FulfillmentLocation, SerializedInventory, Lot
from products.models import Product
from .models import SerialNumberStatus
from django.utils import timezone

class InventoryFilter(django_filters.FilterSet):
    """
    FilterSet for Inventory model with advanced filtering options.
    """
    # Product filters
    product_sku = django_filters.CharFilter(
        field_name='product__sku',
        lookup_expr='icontains',
        label='Product SKU contains'
    )
    product_name = django_filters.CharFilter(
        field_name='product__name',
        lookup_expr='icontains',
        label='Product Name contains'
    )
    product_active = django_filters.BooleanFilter(
        field_name='product__is_active',
        label='Product Active Status'
    )

    # Location filters
    location = django_filters.ModelChoiceFilter(
        queryset=FulfillmentLocation.objects.all(),
        label='Location'
    )
    location_type = django_filters.ChoiceFilter(
        field_name='location__location_type',
        choices=FulfillmentLocation._meta.get_field('location_type').choices,
        label='Location Type'
    )

    # Stock status filters
    STOCK_STATUS_CHOICES = (
        ('in_stock', 'In Stock'),
        ('out_of_stock', 'Out of Stock'),
        ('low_stock', 'Low Stock'),
    )
    stock_status = django_filters.ChoiceFilter(
        choices=STOCK_STATUS_CHOICES,
        method='filter_stock_status',
        label='Stock Status'
    )
    is_low_stock = django_filters.BooleanFilter(
        method='filter_low_stock',
        label='Is Low Stock?'
    )
    has_threshold = django_filters.BooleanFilter(
        field_name='low_stock_threshold',
        lookup_expr='isnull',
        exclude=True,
        label='Has Low Stock Threshold'
    )

    # Quantity filters
    min_stock = django_filters.NumberFilter(
        field_name='stock_quantity',
        lookup_expr='gte',
        label='Minimum Stock Quantity'
    )
    max_stock = django_filters.NumberFilter(
        field_name='stock_quantity',
        lookup_expr='lte',
        label='Maximum Stock Quantity'
    )
    has_backorders = django_filters.BooleanFilter(
        field_name='backorder_quantity',
        lookup_expr='gt',
        label='Has Backorders'
    )
    has_reserved = django_filters.BooleanFilter(
        field_name='reserved_quantity',
        lookup_expr='gt',
        label='Has Reserved Stock'
    )

    class Meta:
        model = Inventory
        fields = [
            'product_sku', 'product_name', 'product_active',
            'location', 'location_type',
            'stock_status', 'is_low_stock', 'has_threshold',
            'min_stock', 'max_stock',
            'has_backorders', 'has_reserved'
        ]

    def filter_low_stock(self, queryset, name, value):
        """
        Filter for items that are below their low stock threshold.
        """
        if value is None:
            return queryset

        # Calculate available quantity
        available_qty = ExpressionWrapper(
            F('stock_quantity') - F('reserved_quantity'),
            output_field=fields.IntegerField()
        )
        queryset = queryset.annotate(available_qty=available_qty)

        if value:  # Show low stock items
            return queryset.filter(
                low_stock_threshold__isnull=False,
                available_qty__lte=F('low_stock_threshold')
            )
        else:  # Show items not low stock
            return queryset.exclude(
                low_stock_threshold__isnull=False,
                available_qty__lte=F('low_stock_threshold')
            )

    def filter_stock_status(self, queryset, name, value):
        """
        Filter by stock status (in_stock, out_of_stock, low_stock).
        """
        if not value:
            return queryset

        # Calculate available quantity
        available_qty = ExpressionWrapper(
            F('stock_quantity') - F('reserved_quantity'),
            output_field=fields.IntegerField()
        )
        queryset = queryset.annotate(available_qty=available_qty)

        if value == 'in_stock':
            # Available > threshold (or no threshold) AND available > 0
            return queryset.filter(
                available_qty__gt=0
            ).exclude(
                low_stock_threshold__isnull=False,
                available_qty__lte=F('low_stock_threshold')
            )
        elif value == 'out_of_stock':
            # Available <= 0
            return queryset.filter(available_qty__lte=0)
        elif value == 'low_stock':
            # Available <= threshold AND available > 0
            return queryset.filter(
                low_stock_threshold__isnull=False,
                available_qty__lte=F('low_stock_threshold'),
                available_qty__gt=0
            )
        return queryset

class SerializedInventoryFilter(django_filters.FilterSet):
    product = django_filters.ModelChoiceFilter(
        queryset=Product.objects.filter(is_serialized=True),
        label='Product'
    )
    location = django_filters.ModelChoiceFilter(
        queryset=FulfillmentLocation.objects.all(),
        label='Location'
    )
    serial_number = django_filters.CharFilter(
        lookup_expr='icontains',
        label='Serial Number contains'
    )
    status = django_filters.ChoiceFilter(
        choices=SerialNumberStatus.choices,
        label='Status'
    )
    created_at = django_filters.DateFromToRangeFilter()

    class Meta:
        model = SerializedInventory
        fields = ['product', 'location', 'status', 'serial_number']

class LotFilter(django_filters.FilterSet):
    product = django_filters.ModelChoiceFilter(
        queryset=Product.objects.filter(is_lotted=True),
        label='Product'
    )
    location = django_filters.ModelChoiceFilter(
        queryset=FulfillmentLocation.objects.all(),
        label='Location'
    )
    lot_number = django_filters.CharFilter(
        lookup_expr='icontains',
        label='Lot Number contains'
    )
    expiry_date_before = django_filters.DateFilter(
        field_name='expiry_date',
        lookup_expr='lte',
        label='Expires Before or On'
    )
    expiry_date_after = django_filters.DateFilter(
        field_name='expiry_date',
        lookup_expr='gte',
        label='Expires On or After'
    )
    is_expired = django_filters.BooleanFilter(
        method='filter_expired',
        label='Is Expired?'
    )
    quantity_gt = django_filters.NumberFilter(
        field_name='quantity',
        lookup_expr='gt',
        label='Quantity Greater Than'
    )
    quantity_lt = django_filters.NumberFilter(
        field_name='quantity',
        lookup_expr='lt',
        label='Quantity Less Than'
    )

    class Meta:
        model = Lot
        fields = [
            'product', 'location', 'lot_number',
            'expiry_date_before', 'expiry_date_after'
        ]

    def filter_expired(self, queryset, name, value):
        if value is None:
            return queryset
        today = timezone.now().date()
        if value:  # True: show expired
            return queryset.filter(expiry_date__isnull=False, expiry_date__lt=today)
        else:  # False: show not expired (or no expiry date)
            return queryset.exclude(expiry_date__isnull=False, expiry_date__lt=today)
