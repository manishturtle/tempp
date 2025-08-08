# Master Data Fields Documentation

This document provides a comprehensive overview of all master data models in the eCommerce system, including their fields, requirements, and descriptions.

## Table of Contents

1. [Product Catalogue](#product-catalogue)
   - [Division](#division)
   - [Category](#category)
   - [Subcategory](#subcategory)
   - [Unit of Measurement](#unit-of-measurement)
   - [Product Status](#product-status)

2. [Attributes](#attributes)
   - [Attribute Group](#attribute-group)
   - [Attribute](#attribute)
   - [Attribute Option](#attribute-option)

3. [Statutory Masters](#statutory-masters)
   - [Selling Channel](#selling-channel)
   - [Tax Region](#tax-region)
   - [Tax Rate](#tax-rate)
   - [Tax Rate Profile](#tax-rate-profile)

4. [Customer Masters](#customer-masters)
   - [Customer Group](#customer-group)

5. [Inventory Masters](#inventory-masters)
   - [Adjustment Reason](#adjustment-reason)
   - [Fulfillment Location](#fulfillment-location)

---

## Product Catalogue

### Division

**Description**: Represents the highest level in the product catalogue hierarchy.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| client_id | IntegerField | Yes | External client identifier (fixed value) |
| company_id | IntegerField | Yes | External company identifier (fixed value) |
| name | CharField(100) | Yes | Division name |
| description | TextField | No | Detailed description of the division |
| image | ImageField | No | Image representing the division |
| image_alt_text | CharField(255) | No | Alt text for the division image |
| is_active | BooleanField | Yes | Whether the division is active (default: True) |

**Notes**:
- Inherits from AuditableModel, which provides created_at, updated_at, created_by, updated_by fields
- Unique constraint: (client_id, name)
- Ordering: By ID

### Category

**Description**: Represents the middle level in the product catalogue hierarchy.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| client_id | IntegerField | Yes | External client identifier (fixed value) |
| company_id | IntegerField | Yes | External company identifier (fixed value) |
| division | ForeignKey(Division) | Yes | Parent division |
| name | CharField(100) | Yes | Category name |
| description | TextField | No | Detailed description |
| image | ImageField | No | Image representing the category |
| image_alt_text | CharField(255) | No | Alt text for the category image |
| default_tax_rate | DecimalField(6,2) | No | Default tax rate for products in this category |
| tax_inclusive | BooleanField | Yes | Whether prices include tax (default: False) |
| is_active | BooleanField | Yes | Whether the category is active (default: True) |
| sort_order | PositiveIntegerField | Yes | Order for display (default: 0) |

**Notes**:
- Inherits from AuditableModel
- Unique constraint: (client_id, division, name)
- Ordering: By division name, sort order, and name
- Table: products_category

### Subcategory

**Description**: Represents the lowest level in the product catalogue hierarchy.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| client_id | IntegerField | Yes | External client identifier (fixed value) |
| company_id | IntegerField | Yes | External company identifier (fixed value) |
| category | ForeignKey(Category) | Yes | Parent category |
| name | CharField(100) | Yes | Subcategory name |
| description | TextField | No | Detailed description |
| image | ImageField | No | Image representing the subcategory |
| image_alt_text | CharField(255) | No | Alt text for the subcategory image |
| workflow_flow_id | IntegerField | No | Future foreign key to workflow flow |
| is_active | BooleanField | Yes | Whether the subcategory is active (default: True) |
| sort_order | PositiveIntegerField | Yes | Order for display (default: 0) |

**Notes**:
- Inherits from AuditableModel
- Unique constraint: (client_id, category, name)
- Ordering: By ID

### Unit of Measurement

**Description**: Represents the units used to measure products.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| client_id | IntegerField | Yes | External client identifier (fixed value) |
| company_id | IntegerField | Yes | External company identifier (fixed value) |
| name | CharField(50) | Yes | Unit name (e.g., Pieces, Kilograms) |
| symbol | CharField(10) | Yes | Short symbol for unit (e.g., PCS, KG) |
| description | TextField | No | Detailed description |
| is_active | BooleanField | Yes | Whether the unit is active (default: True) |
| unit_type | CharField(10) | Yes | Either COUNTABLE or MEASURABLE |
| associated_value | DecimalField(10,4) | No | Numeric value associated with this unit |

**Notes**:
- Inherits from AuditableModel
- Unique constraints: (client_id, symbol) and (client_id, name)
- Ordering: By name
- UOM Types: COUNTABLE or MEASURABLE

### Product Status

**Description**: Represents the possible statuses of products.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| client_id | IntegerField | Yes | External client identifier (fixed value) |
| company_id | IntegerField | Yes | External company identifier (fixed value) |
| name | CharField(50) | Yes | Status name (e.g., New, Available) |
| description | TextField | No | Description of the product status |
| is_active | BooleanField | Yes | Whether this status is active (default: True) |
| is_orderable | BooleanField | Yes | Whether products with this status can be ordered (default: True) |

**Notes**:
- Inherits from AuditableModel
- Unique constraint: (client_id, name)
- Ordering: By ID

---

## Attributes

### Attribute Group

**Description**: Helps organize attributes into logical categories, such as "Technical Specifications", "Physical Dimensions", etc.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| client_id | IntegerField | Yes | Client identifier |
| company_id | IntegerField | Yes | Company identifier |
| name | CharField(100) | Yes | Group name |
| display_order | PositiveIntegerField | Yes | Order for display (default: 0) |
| is_active | BooleanField | Yes | Whether the group is active (default: True) |

**Notes**:
- Inherits from AuditableModel
- Unique constraint: (client_id, name)
- Ordering: By display_order, name

### Attribute

**Description**: Defines product characteristics such as color, size, material, etc. Each attribute has a data type and optional validation rules.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| client_id | IntegerField | Yes | Client identifier |
| company_id | IntegerField | Yes | Company identifier |
| name | CharField(100) | Yes | Attribute name |
| code | CharField(50) | Yes | Attribute code |
| label | CharField(100) | Yes | Display label |
| description | TextField | No | Detailed description |
| data_type | CharField(20) | Yes | Type of data (TEXT, NUMBER, BOOLEAN, DATE, SELECT, MULTI_SELECT) |
| validation_rules | JSONField | No | Validation rules as JSON |
| is_required | BooleanField | Yes | Whether attribute is required (default: False) |
| is_active | BooleanField | Yes | Whether attribute is active (default: True) |
| is_filterable | BooleanField | Yes | Whether attribute can be used in filters (default: False) |
| use_for_variants | BooleanField | Yes | Whether attribute is used for product variants (default: False) |
| show_on_pdp | BooleanField | Yes | Whether attribute is shown on product detail page (default: True) |
| groups | ManyToManyField(AttributeGroup) | No | Groups this attribute belongs to |

**Notes**:
- Inherits from AuditableModel
- Unique constraints: (client_id, name) and (client_id, code)
- Ordering: By name
- Data type choices: TEXT, NUMBER, BOOLEAN, DATE, SELECT, MULTI_SELECT

### Attribute Option

**Description**: Defines allowed values for attributes with data_type SELECT or MULTI_SELECT.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| client_id | IntegerField | Yes | Client identifier |
| company_id | IntegerField | Yes | Company identifier |
| attribute | ForeignKey(Attribute) | Yes | Parent attribute (must be SELECT or MULTI_SELECT type) |
| option_label | CharField(100) | Yes | Display label for the option |
| option_value | CharField(100) | Yes | Value stored in the database |
| sort_order | PositiveIntegerField | Yes | Order for display (default: 0) |

**Notes**:
- Inherits from AuditableModel
- Unique constraint: (client_id, attribute, option_value)
- Ordering: By attribute, sort_order, option_label

---

## Statutory Masters

### Selling Channel

**Description**: Represents different platforms or methods through which products are sold, such as website, mobile app, physical store, etc.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| client_id | BigIntegerField | Yes | Client identifier |
| company_id | BigIntegerField | Yes | Company identifier |
| name | CharField(100) | Yes | Channel name |
| code | CharField(20) | No | Channel code |
| description | TextField | No | Detailed description |
| is_active | BooleanField | Yes | Whether the channel is active (default: True) |
| created_by | ForeignKey(User) | No | User who created the record |
| updated_by | ForeignKey(User) | No | User who last updated the record |

**Notes**:
- Inherits from TimestampedModel
- Unique constraints: (client_id, name) and (client_id, code) when code is not empty
- Ordering: By ID

### Tax Region

**Description**: Defines geographical regions for tax purposes.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| client_id | BigIntegerField | Yes | Client identifier |
| company_id | BigIntegerField | Yes | Company identifier |
| name | CharField(100) | Yes | Region name |
| code | CharField(50) | No | Region code |
| description | TextField | No | Detailed description |
| is_active | BooleanField | Yes | Whether the region is active (default: True) |
| countries | ManyToManyField(Country) | No | Countries in this tax region |
| created_by | ForeignKey(User) | No | User who created the record |
| updated_by | ForeignKey(User) | No | User who last updated the record |

**Notes**:
- Inherits from TimestampedModel
- Unique constraint: (client_id, name)
- Ordering: By name

### Tax Rate

**Description**: Defines tax rates for different regions and categories.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| client_id | BigIntegerField | Yes | Client identifier |
| company_id | BigIntegerField | Yes | Company identifier |
| tax_regions | ManyToManyField(TaxRegion) | Yes | Regions where this tax rate applies |
| category_id | IntegerField | No | Optional category reference |
| tax_type | CharField(50) | Yes | Type of tax |
| tax_code | CharField(50) | Yes | Tax code |
| tax_percentage | DecimalField(5,2) | Yes | Tax percentage value |
| price_from | DecimalField(12,2) | No | Lower price threshold |
| price_to | DecimalField(12,2) | No | Upper price threshold |
| description | TextField | No | Detailed description |
| is_active | BooleanField | Yes | Whether the tax rate is active (default: True) |
| created_by | ForeignKey(User) | No | User who created the record |
| updated_by | ForeignKey(User) | No | User who last updated the record |

**Notes**:
- Inherits from TimestampedModel
- Ordering: By tax_code

### Tax Rate Profile

**Description**: Groups multiple tax rates together for easier assignment to products or categories.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| client_id | BigIntegerField | Yes | Client identifier |
| company_id | BigIntegerField | Yes | Company identifier |
| name | CharField(100) | Yes | Profile name |
| code | CharField(50) | No | Profile code |
| description | TextField | No | Detailed description |
| tax_rates | ManyToManyField(TaxRate) | No | Tax rates included in this profile |
| is_default | BooleanField | Yes | Whether this is the default profile (default: False) |
| is_active | BooleanField | Yes | Whether the profile is active (default: True) |
| created_by | ForeignKey(User) | No | User who created the record |
| updated_by | ForeignKey(User) | No | User who last updated the record |

**Notes**:
- Inherits from TimestampedModel
- Unique constraint: (client_id, name)
- Ordering: By name

---

## Customer Masters

### Customer Group

**Description**: Groups customers for pricing and other purposes. Used to define different pricing tiers, access levels, and other group-specific settings.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| group_name | CharField(100) | Yes | Unique name for the customer group |
| group_type | CharField(20) | Yes | Fundamental type (BUSINESS, INDIVIDUAL, GOVERNMENT) |
| is_active | BooleanField | Yes | Whether group is available for assignment (default: True) |

**Notes**:
- Inherits from BaseTenantModel (includes client_id, company_id, etc.)
- Unique constraint: (group_name)
- Ordering: By group_name
- Group types: BUSINESS, INDIVIDUAL, GOVERNMENT

---

## Inventory Masters

### Adjustment Reason

**Description**: Defines reasons for inventory adjustments.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | CharField(100) | Yes | Short name for the reason (e.g., 'Cycle Count Discrepancy') |
| description | TextField | No | Detailed description of the reason |
| is_active | BooleanField | Yes | Whether the reason is active (default: True) |

**Notes**:
- Inherits from BaseTenantModel
- Unique constraint: (client_id, name)
- Ordering: By name

### Fulfillment Location

**Description**: Represents physical locations where inventory is stored and orders are fulfilled.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | CharField(255) | Yes | Location name |
| location_type | CharField(50) | Yes | Type of location (WAREHOUSE, STORE, FULFILLMENT_CENTER) |
| address_line_1 | CharField(255) | No | Address line 1 |
| address_line_2 | CharField(255) | No | Address line 2 |
| city | CharField(100) | No | City |
| state | CharField(100) | No | State/Province |
| postal_code | CharField(20) | No | Postal/ZIP code |
| country | CharField(2) | No | Country code |
| is_active | BooleanField | Yes | Whether the location is active (default: True) |

**Notes**:
- Inherits from BaseTenantModel
- Unique constraint: (client_id, name)
- Ordering: By name
- Location types: WAREHOUSE, STORE, FULFILLMENT_CENTER

---

**Last Updated**: June 6, 2025
