from django.apps import AppConfig


class CustomersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "customers"
    
    def ready(self):
        """
        Initialize signal handlers when the app is ready.
        """
        # Import signal handlers to register them
        import customers.signals  # noqa
