from django.db import migrations

def create_default_checkout_config(apps, schema_editor):
    CheckoutConfiguration = apps.get_model('order_management', 'CheckoutConfiguration')
    
    # Create default configuration with all boolean fields set to True and fulfillment_type as 'both'
    CheckoutConfiguration.objects.create(
        min_order_value=0,
        allow_guest_checkout=True,
        allow_user_select_shipping=True,
        pickup_method_label='Store Pickup',
        enable_delivery_prefs=True,
        enable_preferred_date=True,
        enable_time_slots=True,
        currency='INR',
    )

def reverse_func(apps, schema_editor):
    # Revert function - delete the default config if needed
    CheckoutConfiguration = apps.get_model('order_management', 'CheckoutConfiguration')
    CheckoutConfiguration.objects.filter(customer_group_selling_channel__isnull=True).delete()

class Migration(migrations.Migration):
    dependencies = [
        ('order_management', '0009_checkoutconfiguration_and_more'),
    ]

    operations = [
        migrations.RunPython(
            create_default_checkout_config,
            reverse_code=reverse_func
        ),
    ]
