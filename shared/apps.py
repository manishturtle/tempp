"""
App configuration for the shared app.
"""
from django.apps import AppConfig
from django.db.models.signals import post_migrate


class SharedConfig(AppConfig):
    """
    Configuration for the shared app.
    
    This sets up signal handlers to load reference data after migrations.
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'shared'
    
    def ready(self):
        """
        Connect signal handlers when the app is ready.
        
        This sets up the post_migrate signal to load reference data 
        from backup files into the database after migrations.
        """
        # Connect post_migrate signal to load reference data
        post_migrate.connect(self._load_reference_data, sender=self)
    
    def _load_reference_data(self, sender, **kwargs):
        """
        Load reference data after migrations.
        
        This is the actual handler for the post_migrate signal.
        This method is reserved for future implementation of reference data loading.
        
        Args:
            sender: The app config that sent the signal
            **kwargs: Additional signal arguments
        """
        # Reference data loading functionality has been removed
        pass