# """
# URL configuration for the ecomm_auth app.

# This module defines URL patterns for e-commerce authentication operations
# such as signup, login, and password reset.
# """
# from django.urls import path

# from ecomm_auth.views import (
#     EcommSignupView,
#     EcommLoginView,
#     PasswordResetRequestView,
#     PasswordResetConfirmView,
#     EmailCheckView
# )

# app_name = 'ecomm_auth'

# urlpatterns = [
#     path('signup/', EcommSignupView.as_view(), name='signup'),
#     path('login/', EcommLoginView.as_view(), name='login'),
#     path('password-reset/', PasswordResetRequestView.as_view(), name='password-reset'),
#     path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
#     path('check-email/<str:tenant_slug>/', EmailCheckView.as_view(), name='check-email'),

# ]
