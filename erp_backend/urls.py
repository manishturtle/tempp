"""
URL configuration for erp_backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from erp_backend.views import migrate_tenant_schema

# This file is not used directly - see public_urls.py and tenant_urls.py
# This is just a placeholder for Django's URL system

urlpatterns = [
    # These patterns will be included in both public_urls.py and tenant_urls.py
    path("admin/", admin.site.urls),
    # API endpoints - standard non-tenant-aware pattern (for backward compatibility)
    path(
        "api/v1/",
        include(
            [
                path("assets/", include("assets.urls")),
                # Support for tenant-specific product URLs
                path(
                    "<slug:tenant_slug>/",
                    include(
                        [
                            path("products/", include("products.urls")),
                        ]
                    ),
                ),
                # Support for non-tenant product URLs
                path("products/", include("products.urls")),
                path("products/attributes/", include("attributes.urls")),
                path("pricing/", include("pricing.urls")),
                path("shared/", include("shared.urls")),
                # Support for non-tenant inventory URLs
                path("inventory/", include("ecomm_inventory.urls")),
                # Support for tenant-specific inventory URLs
                path(
                    "<slug:tenant_slug>/",
                    include(
                        [
                            path("inventory/", include("ecomm_inventory.urls")),
                        ]
                    ),
                ),
                # Order Management endpoints
                path("<slug:tenant_slug>/om/", include("order_management.api.urls")),
                # Include all API v1 endpoints
                path("", include("api.v1.urls")),
                path("<slug:tenant_slug>/invoices/", include("invoices.urls")),
                path("<slug:tenant_slug>/admin/", include("receipts.urls")),
            ]
        ),
    ),
    # Tenant-aware API pattern for v1
    path("<slug:tenant_slug>/api/v1/", include("api.v1.urls")),
    # Manish code
    path(
        "api/tenant/migrate/", migrate_tenant_schema, name="migrate-tenant-schema"
    ),  # Tenant schema migration
    # path('api/management/', include('role_management.role_controles.urls')), # role
    # path('api/subscription/plan/', get_subscription_plan_by_tenant, name='get-subscription-plan-by-tenant'),
]

# Serve static and media files in development
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
