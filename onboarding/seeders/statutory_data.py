"""
Statutory data for different regions.

This file contains the tax data presets for each supported region.
These presets are used during tenant onboarding to configure the appropriate
tax settings based on the tenant's region.
"""

STATUTORY_DATA = {
    "in": {
        "tax_region": {"name": "India", "code": "IN"},
        "tax_rates": [
            {"tax_type": "GST", "tax_code": "GST_5", "tax_percentage": 5.00},
            {"tax_type": "GST", "tax_code": "GST_12", "tax_percentage": 12.00},
            {"tax_type": "GST", "tax_code": "GST_18", "tax_percentage": 18.00},
            {"tax_type": "GST", "tax_code": "GST_28", "tax_percentage": 28.00},
            {"tax_type": "GST", "tax_code": "GST_0", "tax_percentage": 0.00},
        ],
        "tax_profile": {"name": "Default India GST Profile", "is_default": True}
    },
    "us": {
        "tax_region": {"name": "United States", "code": "US"},
        "tax_rates": [
            # US sales tax is state-specific and complex. We create a placeholder.
            # The guided tour should prompt the user to configure this properly.
            {"tax_type": "Sales Tax", "tax_code": "DEFAULT_SALES_TAX", "tax_percentage": 0.00},
        ],
        "tax_profile": {"name": "Default US Profile", "is_default": True}
    },
    "eu": {
        "tax_region": {"name": "European Union", "code": "EU"},
        "tax_rates": [
            # We provide common examples. Rates vary by country.
            {"tax_type": "VAT", "tax_code": "EU_VAT_STANDARD", "tax_percentage": 20.00},
            {"tax_type": "VAT", "tax_code": "EU_VAT_REDUCED", "tax_percentage": 5.00},
            {"tax_type": "VAT", "tax_code": "EU_VAT_ZERO", "tax_percentage": 0.00},
        ],
        "tax_profile": {"name": "Default EU VAT Profile", "is_default": True}
    },
    "ae": {
        "tax_region": {"name": "United Arab Emirates", "code": "AE"},
        "tax_rates": [
            {"tax_type": "VAT", "tax_code": "UAE_VAT", "tax_percentage": 5.00},
        ],
        "tax_profile": {"name": "Default UAE Profile", "is_default": True}
    },
    "uk": {
        "tax_region": {"name": "United Kingdom", "code": "GB"},
        "tax_rates": [
            {"tax_type": "VAT", "tax_code": "UK_VAT_STANDARD", "tax_percentage": 20.00},
            {"tax_type": "VAT", "tax_code": "UK_VAT_REDUCED", "tax_percentage": 5.00},
            {"tax_type": "VAT", "tax_code": "UK_VAT_ZERO", "tax_percentage": 0.00},
        ],
        "tax_profile": {"name": "Default UK VAT Profile", "is_default": True}
    },
    "au": {
        "tax_region": {"name": "Australia", "code": "AU"},
        "tax_rates": [
            {"tax_type": "GST", "tax_code": "GST_10", "tax_percentage": 10.00},
        ],
        "tax_profile": {"name": "Default Australia GST Profile", "is_default": True}
    }
}
