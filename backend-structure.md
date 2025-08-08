# eCommerce Server Project Structure

This document provides a comprehensive overview of the eCommerce server application structure, detailing the Django-based backend architecture with its multi-tenant approach.

## Root Directory Structure

```
Server/
├── .dockerignore
├── .env
├── .env.example
├── .env.test
├── .gitignore
├── Backup/
├── Dockerfile
├── README.md
├── activities/
├── add_created_by_column.sql
├── add_tenant_fields.sql
├── add_tenant_fields_adjustment.sql
├── add_tenant_fields_inventory.sql
├── add_tenant_fields_lot.sql
├── add_tenant_fields_serialized.sql
├── add_tenant_fk_constraints.sql
├── all_models.txt
├── api/                      # API versioning directory
│   ├── __init__.py
│   ├── __pycache__/
│   └── v1/                   # API v1 endpoints
├── assets/                   # Asset management module
├── attributes/               # Product attributes module
├── check_celery.py           # Celery check utility
├── check_db.py               # Database check utility
├── check_fields.py           # Field check utility
├── core/                     # Core functionality module
│   ├── __init__.py
│   ├── __pycache__/
│   ├── admin.py
│   ├── apps.py
│   ├── auth.py               # Authentication utilities
│   ├── celery.py             # Celery configuration
│   ├── clients/              # Client management 
│   ├── clients.py            # Client handling logic
│   ├── decorators.py         # Custom decorators
│   ├── logging.py            # Logging configuration
│   ├── management/           # Management commands
│   ├── middleware.py         # Custom middleware
│   ├── migrations/           # Database migrations
│   ├── models/               # Core models
│   ├── models.py             # Core model definitions
│   ├── pagination.py         # Custom pagination
│   ├── tenant_urls.py        # Tenant-specific URLs
│   ├── tests/                # Test directory
│   ├── tests.py              # Test cases
│   ├── urls.py               # URL routing
│   ├── utils/                # Utility functions
│   ├── utils.py              # Shared utilities
│   ├── views.py              # Core views
│   └── viewsets.py           # Core viewsets
├── create_invoice_table.sql
├── create_invoice_table_simple.sql
├── customergroup_model.txt
├── customers/                # Customer management module
├── docker-compose.yml
├── docs/                     # Documentation
├── ecomm_auth/               # Authentication module
│   ├── __init__.py
│   ├── __pycache__/
│   ├── admin.py
│   ├── apps.py
│   ├── migrations/
│   ├── models.py             # Auth models
│   ├── serializers.py        # Auth serializers
│   ├── tasks.py              # Auth-related Celery tasks
│   ├── tests/
│   ├── tests.py
│   ├── urls.py               # Auth endpoints
│   └── views.py              # Auth views
├── ecomm_inventory/          # Inventory module
├── erp_backend/              # Main Django project directory
│   ├── __init__.py
│   ├── __pycache__/
│   ├── asgi.py               # ASGI configuration
│   ├── management/
│   ├── middleware.py         # App middleware
│   ├── public_urls.py        # Public API endpoints
│   ├── router.py             # URL routing
│   ├── settings.py           # Django settings
│   ├── tenant_urls.py        # Tenant-specific URLs
│   ├── urls.py               # Main URL configuration
│   ├── utils.py              # Utility functions
│   ├── views.py              # Main views
│   └── wsgi.py               # WSGI configuration
├── execute_sql_files.py
├── field_check_results.txt
├── fix_invoice_columns.sql
├── gcs-credentials.json
├── inventory/                # Inventory management module
├── invoices/                 # Invoice management module
├── logs/                     # Application logs
├── manage.py                 # Django management script
├── master_data_fields.md
├── mediafiles/               # Uploaded media files
├── migration_log.txt
├── order_management/         # Order management module
│   ├── __init__.py
│   ├── __pycache__/
│   ├── admin.py
│   ├── api/                  # Order API
│   ├── apps.py
│   ├── cart_utils.py         # Shopping cart utilities
│   ├── checkout_session.py   # Checkout functionality
│   ├── exceptions.py         # Order exceptions
│   ├── filters.py            # Query filters
│   ├── integrations/         # Third-party integrations
│   ├── migrations/           # Database migrations
│   ├── models.py             # Order models
│   ├── services/             # Order services
│   ├── tasks.py              # Order-related Celery tasks
│   ├── tests.py              # Order tests
│   ├── utils/                # Order utilities
│   └── views.py              # Order views
├── pricing/                  # Pricing module
├── products/                 # Products module
│   ├── __init__.py
│   ├── __pycache__/
│   ├── admin.py
│   ├── apps.py
│   ├── catalogue/            # Product catalogue
│   ├── filters.py            # Product filters
│   ├── management/           # Management commands
│   ├── migrations/           # Database migrations
│   ├── mock_redis.py         # Redis mock for testing
│   ├── models.py             # Product models
│   ├── placeholder_images.py # Default images
│   ├── serializers.py        # Product serializers
│   ├── tasks.py              # Product-related tasks
│   ├── tests/                # Test directory
│   ├── tests.py              # Product tests
│   ├── urls.py               # Product URLs
│   ├── utils.py              # Product utilities
│   └── views.py              # Product views
├── pyproject.toml
├── pytest.ini
├── query
├── requirements-temp.txt
├── requirements.txt          # Python dependencies
├── reset_output.txt
├── run_sql.py
├── sample_accounts.csv
├── schema.yaml
├── shared/                   # Shared functionality
│   ├── __init__.py
│   ├── __pycache__/
│   ├── apps.py
│   ├── backups/              # Backup functionality
│   ├── data_loader.py        # Data import utilities
│   ├── management/           # Shared management commands
│   ├── migrations/           # Shared migrations
│   ├── models.py             # Shared models
│   ├── serializers.py        # Shared serializers
│   ├── urls.py               # Shared URLs
│   └── views.py              # Shared views
├── simple_cart_test.html
├── static/                   # Static files
├── tenants/                  # Multi-tenancy module
├── test_cart.html
├── update_password.py
├── users/                    # User management
└── venv/                     # Python virtual environment
```

## Key Architecture Components

### Core Components

The server architecture is built around these key components:

1. **Core Module** - Contains essential functionality:
   - Authentication utilities and middleware
   - Multi-tenant support (schema per tenant)
   - Custom decorators and middleware
   - Base models and viewsets

2. **erp_backend** - Main Django project configuration:
   - Settings with environment-specific configurations
   - URL routing with tenant-specific handling
   - Middleware for request/response processing
   - ASGI/WSGI configurations for deployment

3. **API Module** - API versioning framework:
   - Versioned API endpoints (currently v1)
   - RESTful architecture

### Domain-Specific Modules

The application functionality is divided into domain-specific modules:

1. **ecomm_auth** - Authentication and authorization:
   - User authentication models and views
   - JWT token handling
   - Permissions and access control

2. **products** - Product management:
   - Product models, serializers and views
   - Product catalogue handling
   - Product attributes and categories

3. **order_management** - Order processing:
   - Order models and workflow
   - Shopping cart functionality
   - Checkout process
   - Order fulfillment

4. **inventory** - Inventory management:
   - Stock tracking
   - Inventory adjustments
   - Warehouse management

5. **customers** - Customer relationship management:
   - Customer profiles
   - Address management
   - Customer grouping

6. **pricing** - Pricing engine:
   - Price rules and strategies
   - Discounts and promotions
   - Tax handling

7. **invoices** - Invoice management:
   - Invoice generation
   - Payment tracking

### Cross-Cutting Concerns

Several modules handle cross-cutting concerns:

1. **shared** - Shared functionality:
   - Data loading utilities
   - Common models and serializers
   - Backup functionality

2. **assets** - Asset management:
   - File uploads
   - Media handling

### Multi-Tenant Architecture

The backend follows a schema-per-tenant approach in PostgreSQL:

1. **tenants** module handles tenant management
2. URL routing includes tenant-specific paths
3. Middleware identifies the current tenant based on request
4. Database operations are scoped to the tenant's schema
5. Shared schema contains tenant registration data

### Authentication System

Authentication is handled through:

1. JWT tokens with tenant-specific identifiers
2. Token payload includes user_id, client_id, account_id, contact_id
3. Custom middleware for token validation and tenant identification
4. Role-based permission system

### Asynchronous Processing

Background tasks are handled through:

1. Celery for asynchronous task processing
2. Redis as the message broker
3. Task definitions in individual app modules (tasks.py)
4. Scheduled tasks for periodic operations

### Database Structure

Database migrations are managed through Django's ORM:

1. Each app has its own migrations directory
2. SQL scripts for complex database operations
3. Multi-tenant database design with schema isolation

## Django App Organization

Each Django app follows a consistent structure:

```
app_name/
├── __init__.py
├── admin.py           # Django admin configuration
├── apps.py            # App configuration
├── migrations/        # Database migrations
├── models.py          # Data models
├── serializers.py     # API serializers
├── urls.py            # URL routing
├── views.py           # View controllers
├── tasks.py           # Celery tasks
├── tests/             # Test cases
├── utils.py           # Utility functions
└── filters.py         # Query filters
```

Some larger apps include additional organization:

```
large_app_name/
├── api/               # API-specific code
├── management/        # Management commands
│   └── commands/      # Custom Django commands
├── services/          # Business logic services
└── utils/             # Utility modules
```

## Technology Stack

The backend is built with:

1. **Django 4.2** - Web framework
2. **Django REST Framework** - API development
3. **PostgreSQL 17** - Database (schema-per-tenant)
4. **Celery** - Task queue
5. **Redis** - Message broker and caching
6. **OAuth2 with JWT** - Authentication
