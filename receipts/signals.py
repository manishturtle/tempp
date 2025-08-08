# payments/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Receipt, AuditTrail


@receiver(post_save, sender=Receipt)
def create_receipt_audit_trail(sender, instance, created, **kwargs):
    """
    Automatically creates an AuditTrail entry when a new Receipt is created.
    """
    if created:
        # This logic assumes you have a way to get the current user.
        # A common practice is to use middleware to store the user in thread-local storage.
        # For this example, we'll assume user_id is conceptually available.
        user_id = None  # Replace with your logic to get current user

        change_details = {
            "receipt_number": instance.receipt_number,
            "amount_received": float(instance.amount_received),
            "account_id": instance.account.id,
            "receipt_date": instance.receipt_date.strftime("%Y-%m-%d"),
        }

        AuditTrail.objects.create(
            user_id=user_id,
            action_type=AuditTrail.ActionType.CREATE,
            record_type="Receipt",
            record_id=instance.id,
            change_details=change_details,
        )
