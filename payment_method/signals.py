"""
Signals for the payment_method app.
"""
from django.db.models.signals import post_save, pre_save, pre_delete, post_delete
from django.dispatch import receiver

# Import models here when needed
# from .models import YourModel

# Example signal handler (uncomment and modify as needed):
# @receiver(post_save, sender=YourModel)
# def your_signal_handler(sender, instance, created, **kwargs):
#     """Handle post-save signal for YourModel."""
#     if created:
#         # Do something with the new instance
#         pass
