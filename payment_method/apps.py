from django.apps import AppConfig


class PaymentMethodConfig(AppConfig):
    """
    Application configuration for the payment_method app.
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'payment_method'
    verbose_name = 'Payment Method Management'
    
    def ready(self):
        """
        Import signals when the app is ready.
        """
        # Import signals to register them
        import payment_method.signals  # noqa
