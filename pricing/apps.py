"""
App configuration for the pricing app.
"""
from django.apps import AppConfig


class PricingConfig(AppConfig):
    """
    Configuration for the pricing app.
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'pricing'
