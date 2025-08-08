from django.urls import path
from . import views

urlpatterns = [
    # Public header endpoint
    path('header/', views.HeaderConfigurationView.as_view(), name='header-config'),
    
    # Admin header configuration endpoint
    path('admin/header/', views.AdminHeaderConfigurationView.as_view(), name='admin-header-config'),
]
