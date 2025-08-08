from django.db import migrations

SELLING_CHANNELS = [
    {
        'name': 'Offline',
        'code': 'offline',
        'description': 'Offline point-of-sale at physical retail locations'
    },
    {
        'name': 'POS',
        'code': 'pos',
        'description': 'Point of Sale'
    },
    {
        'name': 'Web',
        'code': 'web',
        'description': 'Web-based point-of-sale system accessible through browsers'
    },
    {
        'name': 'Mobile',
        'code': 'mobile',
        'description': 'Mobile device-based POS system (e.g. tablets, smartphones)'
    },
]


def seed_selling_channels(apps, schema_editor):
    SellingChannel = apps.get_model('pricing', 'SellingChannel')
    for channel in SELLING_CHANNELS:
        # Check if channel exists by either name or code
        if not SellingChannel.objects.filter(client_id=1, name=channel['name']).exists() and \
           not SellingChannel.objects.filter(client_id=1, code=channel['code']).exists():
            SellingChannel.objects.create(
                name=channel['name'],
                code=channel['code'],
                description=channel['description'],
                is_active=True,
                client_id=1,
                company_id=1
            )

class Migration(migrations.Migration):
    dependencies = [
        ('pricing', '0005_add_unique_constraint_taxrateprofile'),
    ]

    operations = [
        migrations.RunPython(seed_selling_channels),
    ]
