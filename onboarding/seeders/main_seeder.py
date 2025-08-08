"""
Main seeder logic for tenant onboarding.

This module handles the seeding of master data and industry-specific data
for new tenants during the onboarding process.
"""

from django.db import transaction

# Import models from your project structure
from products.catalogue.models import Division, Category, Subcategory, UnitOfMeasure, ProductStatus
from attributes.models import AttributeGroup, Attribute, AttributeOption
from ecomm_inventory.models import AdjustmentReason
from order_management.models import TenantConfiguration

# Import the data dictionaries
from onboarding.seeders import universal_data
from onboarding.seeders import fashion_data
from onboarding.seeders import electronics_data
from onboarding.seeders import food_and_beverage_data
from onboarding.seeders import home_goods_data
from onboarding.seeders import health_and_beauty_data
from onboarding.seeders import tax_data
from onboarding.seeders.tax_data import seed_indian_tax_data


INDUSTRY_DATA_MAP = {
    'fashion': fashion_data,
    'electronics': electronics_data,
    'food_and_beverage': food_and_beverage_data,
    'home_goods': home_goods_data,
    "health_and_beauty": health_and_beauty_data

    # Add other industry modules as they are created
}


def seed_universal_data():
    """Seeds master data that is common to all tenants."""
    print('Seeding Universal Masters...')
    
    # Seed Product Statuses
    for data in universal_data.PRODUCT_STATUSES:
        ProductStatus.objects.get_or_create(
            name=data['name'],
            defaults={
                'description': data['description'],
                'is_active': True,
                'is_orderable': True
            }
        )

    # Seed Units of Measure
    for data in universal_data.UNITS_OF_MEASURE:
        UnitOfMeasure.objects.get_or_create(
            name=data['name'],
            defaults={
                'symbol': data['code'],  # Using code as symbol
                'description': data['description'],
                'is_active': True,
                'unit_type': 'COUNTABLE'  # Default to COUNTABLE
            }
        )
    
    # Seed Attribute Groups
    for data in universal_data.ATTRIBUTE_GROUPS:
        AttributeGroup.objects.get_or_create(
            name=data['name'],
            defaults={
                'display_order': data.get('sort_order', 0),
                'is_active': True
            }
        )
    
    # Seed Adjustment Reasons
    for data in universal_data.ADJUSTMENT_REASONS:
        AdjustmentReason.objects.get_or_create(
            name=data['name'],
            defaults={
                'description': data['description'],
                'is_active': True
            }
        )
    
    print('Universal Masters seeding complete.')


def seed_statutory_data(region):
    """
    Seeds region-specific tax data.
    
    Args:
        region (str): The region code (e.g., 'in' for India)
        
    Returns:
        TaxRateProfile: A default tax profile for the region, or None if not available
    """
    print(f'Seeding statutory data for region: {region}')
    
    # For India, seed the Indian GST tax data
    if region.lower() == 'in':
        print('Detected Indian region, seeding GST tax data...')
        tax_data.seed_indian_tax_data()
        
        # Return a default tax profile for India
        # This assumes the tax_data.seed_indian_tax_data() function creates the profiles
        # and we're getting one to use as default for categories
        from pricing.models import TaxRateProfile
        try:
            # Get a default profile for Indian GST (e.g., the first one for garments)
            default_profile = TaxRateProfile.objects.filter(
                country_code='IN',
                is_active=True
            ).first()
            
            if default_profile:
                print(f'Using default tax profile: {default_profile.profile_name}')
                return default_profile
            else:
                print('WARNING: No active tax profile found for India')
                return None
        except Exception as e:
            print(f'ERROR retrieving tax profile: {str(e)}')
            return None
    else:
        print(f'No specific tax data seeding implemented for region: {region}')
        return None


def seed_industry_data(industry_module, default_tax_profile=None):
    """
    Seeds industry-specific data, handling all relationships.
    
    Args:
        industry_module: The industry module containing the data
        default_tax_profile: A TaxRateProfile object to use as default for categories
    """
    print(f'Seeding data for industry module: {industry_module.__name__}')
    
    # Exit early if no default tax profile is available
    if not default_tax_profile:
        print("ERROR: Cannot seed industry data without a default tax profile")
        print("Please ensure seed_statutory_data is called before seed_industry_data")
        return
        
    print(f"Using default tax profile: {default_tax_profile.profile_name} (ID: {default_tax_profile.id})")
    
    # Seed Divisions first
    print('  - Seeding Divisions...')
    for division_data in industry_module.DIVISIONS:
        Division.objects.get_or_create(
            name=division_data['name'],
            defaults={
                'description': division_data.get('description', ''),
                'is_active': True
            }
        )
    
    # Seed Categories and Subcategories
    print('  - Seeding Product Categories...')
    for division_name, categories in industry_module.CATEGORIES.items():
        # Get the division object for these categories
        try:
            division = Division.objects.get(name=division_name)
        except Division.DoesNotExist:
            print(f"  WARNING: Division '{division_name}' not found. Skipping its categories.")
            continue
            
        for category_data in categories:
            # Create the category
            category_obj, created = Category.objects.get_or_create(
                name=category_data['name'],
                division=division,
                defaults={
                    'description': category_data.get('description', ''),
                    'is_active': True,
                    'sort_order': 0,
                    'default_tax_rate_profile': default_tax_profile,  # Add the tax profile
                    'tax_inclusive': False  # Set default value for tax_inclusive
                }
            )
            
            # Create subcategories if they exist
            for subcat_name in category_data.get('subcategories', []):
                Subcategory.objects.get_or_create(
                    name=subcat_name,
                    category=category_obj,
                    defaults={
                        'description': '',
                        'is_active': True,
                        'sort_order': 0
                    }
                )
    
    # Seed Attributes and Options
    print('  - Seeding Attributes...')
    for group_name, attributes in industry_module.ATTRIBUTES.items():
        # Get or create the attribute group
        group, _ = AttributeGroup.objects.get_or_create(
            name=group_name,
            defaults={'is_active': True}
        )
        
        # Create attributes in this group
        for attr_data in attributes:
            attribute_obj, created = Attribute.objects.get_or_create(
                name=attr_data['name'],
                defaults={
                    'code': attr_data['code'],
                    'label': attr_data.get('label', attr_data['name']),
                    'data_type': attr_data['data_type'],
                    'is_required': attr_data.get('is_required', False),
                    'is_filterable': attr_data.get('is_filterable', True),
                    'use_for_variants': attr_data.get('use_for_variants', False),
                    'show_on_pdp': attr_data.get('show_on_pdp', True),
                    'is_active': True
                }
            )
            
            # Add attribute to the group
            attribute_obj.groups.add(group)
            
            # Create attribute options if they exist
            for option_value in attr_data.get('options', []):
                # Ensure option_value doesn't exceed max_length (100)
                truncated_value = str(option_value)[:100]
                AttributeOption.objects.get_or_create(
                    attribute=attribute_obj,
                    option_value=truncated_value,
                    defaults={
                        'option_label': truncated_value,
                        'sort_order': 0
                    }
                )
    
    print('Industry-specific seeding complete.')


@transaction.atomic
def run_tenant_seeding(industry, region, tenant_schema):
    """
    Main entry point for seeding a new tenant, wrapped in a transaction.
    
    Args:
        industry (str): The industry type (e.g., 'fashion', 'electronics')
        region (str): The region for the tenant
        tenant_schema (str): The schema name of the tenant
    """
    print(f'--- Starting Seeding Process for Industry: {industry}, Region: {region} ---')
    
    industry_module = INDUSTRY_DATA_MAP.get(industry.lower())
    if not industry_module:
        print(f'Warning: No data for industry "{industry}". Skipping.')
        return
    
    # This function assumes the celery task has set the correct tenant context
    seed_universal_data()
    
    # IMPORTANT: Create tax profile first since Category requires it
    default_tax_profile = seed_statutory_data(region)
    
    # Only seed industry data if we have a tax profile
    if default_tax_profile:
        seed_industry_data(industry_module, default_tax_profile)
    else:
        print(f'CRITICAL ERROR: Failed to create default tax profile for {region}. '
              f'Cannot seed industry data.')
        return
    
    # Mark onboarding as complete
    try:
        config, created = TenantConfiguration.objects.get_or_create(
            tenant_ref=tenant_schema,
            defaults={'is_onboarding_completed': False}
        )
        if created:
            print(f'NOTE: Created new TenantConfiguration for schema: {tenant_schema}')
        
        config.is_onboarding_completed = True
        config.save(update_fields=['is_onboarding_completed', 'updated_at'])
        print(f'--- Seeding for Tenant {tenant_schema} Completed Successfully ---')
    except Exception as e:
        print(f'CRITICAL ERROR: Could not set onboarding flag for schema {tenant_schema}. Error: {e}')
        raise  # Re-raise the exception to ensure the task is marked as failed