from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create a router for the ViewSets
router = DefaultRouter()
router.register(r'admin/pages', views.AdminLandingPageViewSet, basename='admin-landing-page')
router.register(r'admin/content-blocks', views.AdminContentBlockViewSet, basename='admin-content-block')

urlpatterns = [
    # Public page endpoint (ID-based only)
    path('pages/<int:page_id>/', views.LandingPageView.as_view(), name='landing-page'),
    
    # Image upload endpoint for landing pages
    path('admin/pages/upload-image/', views.LandingPageImageUploadView.as_view(), name='landing-page-image-upload'),
    
    # Image delete endpoint for landing pages
    path('admin/pages/delete-image/', views.LandingPageImageDeleteView.as_view(), name='landing-page-image-delete'),
    
    # Batch products endpoint for Recently Viewed block
    path('products/batch/', views.BatchProductsView.as_view(), name='batch-products'),
    
    # Include the router URLs
    path('', include(router.urls)),
]
