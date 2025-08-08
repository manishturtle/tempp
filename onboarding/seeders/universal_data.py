"""
Universal data for all industries.
Contains common data like product statuses, selling channels, etc.
"""

PRODUCT_STATUSES = [
    {
        'name': 'Active',
        'code': 'active',
        'description': 'Product is available for sale'
    },
    {
        'name': 'Inactive',
        'code': 'inactive',
        'description': 'Product is temporarily unavailable'
    },
    {
        'name': 'Draft',
        'code': 'draft',
        'description': 'Product is in draft state'
    },
    {
        'name': 'Discontinued',
        'code': 'discontinued',
        'description': 'Product has been permanently discontinued'
    }
]

# Units of Measure
UNITS_OF_MEASURE = [
    {
        'name': 'Piece',
        'code': 'pc',
        'description': 'Individual units'
    },
    {
        'name': 'Pair',
        'code': 'pair',
        'description': 'Set of two matching items'
    },
    {
        'name': 'Kilogram',
        'code': 'kg',
        'description': 'Weight in kilograms'
    },
    {
        'name': 'Gram',
        'code': 'g',
        'description': 'Weight in grams'
    },
    {
        'name': 'Meter',
        'code': 'm',
        'description': 'Length in meters'
    },
    {
        'name': 'Centimeter',
        'code': 'cm',
        'description': 'Length in centimeters'
    },
    {
        'name': 'Box',
        'code': 'box',
        'description': 'Standard box unit'
    },
    {
        'name': 'Pack',
        'code': 'pack',
        'description': 'Standard pack unit'
    }
]

# Attribute Groups
ATTRIBUTE_GROUPS = [
    {
        'name': 'Basic Information',
        'code': 'basic_info',
        'description': 'Essential product details',
        'sort_order': 1
    },
    {
        'name': 'Physical Attributes',
        'code': 'physical',
        'description': 'Physical characteristics of the product',
        'sort_order': 2
    },
    {
        'name': 'Technical Specifications',
        'code': 'technical',
        'description': 'Technical details and specifications',
        'sort_order': 3
    },
    {
        'name': 'Additional Features',
        'code': 'features',
        'description': 'Extra features and characteristics',
        'sort_order': 4
    }
]

# Inventory Adjustment Reasons
ADJUSTMENT_REASONS = [
    {
        'name': 'Stock Count',
        'code': 'stock_count',
        'description': 'Adjustment after physical inventory count',
        'affects_cost': True
    },
    {
        'name': 'Damaged Goods',
        'code': 'damaged',
        'description': 'Items damaged in storage',
        'affects_cost': True
    },
    {
        'name': 'Quality Control',
        'code': 'quality_control',
        'description': 'Failed quality inspection',
        'affects_cost': True
    },
    {
        'name': 'System Correction',
        'code': 'system_correction',
        'description': 'System data correction',
        'affects_cost': False
    },
    {
        'name': 'Returns',
        'code': 'returns',
        'description': 'Customer returns to inventory',
        'affects_cost': True
    }
]
