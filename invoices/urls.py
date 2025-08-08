# invoices/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AdminInvoiceViewSet

# Create a router and register our viewsets with it.
router = DefaultRouter()

# Admin endpoints (requires authentication)
router.register(
    r"(?P<tenant_slug>[^/.]+)/admin/invoices",
    AdminInvoiceViewSet,
    basename="admin-invoice",
)

admin_view_pdf_url = AdminInvoiceViewSet.as_view({"get": "view_pdf_url"})

# URL patterns for the invoices app
urlpatterns = [
    # Include router URLs
    path("", include(router.urls)),
    # Admin PDF viewing
    path(
        "admin/invoices/<int:pk>/view-pdf-url/",
        admin_view_pdf_url,
        name="admin-invoice-view-pdf-url",
    ),
]

# This allows the URLs to be included with or without a prefix
app_name = "invoices"
