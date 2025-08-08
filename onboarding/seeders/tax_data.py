"""
Tax data for Indian GST system.
Contains tax rates and tax rate profiles for various industries and scenarios.
"""

# Tax Rates - Master data for all tax types
TAX_RATES = [
    # CGST Rates
    {
        'rate_name': 'CGST 0.125%',
        'tax_type_code': 'CGST_0_125',
        'rate_percentage': 0.125,
        'effective_from': '2024-01-01T00:00:00Z',
        'effective_to': '2074-01-01T00:00:00Z',
        'country_code': 'IN',
        'is_active': True
    },
    {
        'rate_name': 'CGST 1.5%',
        'tax_type_code': 'CGST_1_5',
        'rate_percentage': 1.5,
        'effective_from': '2024-01-01T00:00:00Z',
        'effective_to': '2074-01-01T00:00:00Z',
        'country_code': 'IN',
        'is_active': True
    },
    {
        'rate_name': 'CGST 2.5%',
        'tax_type_code': 'CGST_2_5',
        'rate_percentage': 2.5,
        'effective_from': '2024-01-01T00:00:00Z',
        'effective_to': '2074-01-01T00:00:00Z',
        'country_code': 'IN',
        'is_active': True
    },
    {
        'rate_name': 'CGST 6%',
        'tax_type_code': 'CGST_6',
        'rate_percentage': 6.0,
        'effective_from': '2024-01-01T00:00:00Z',
        'effective_to': '2074-01-01T00:00:00Z',
        'country_code': 'IN',
        'is_active': True
    },
    {
        'rate_name': 'CGST 9%',
        'tax_type_code': 'CGST_9',
        'rate_percentage': 9.0,
        'effective_from': '2024-01-01T00:00:00Z',
        'effective_to': '2074-01-01T00:00:00Z',
        'country_code': 'IN',
        'is_active': True
    },
    {
        'rate_name': 'CGST 14%',
        'tax_type_code': 'CGST_14',
        'rate_percentage': 14.0,
        'effective_from': '2024-01-01T00:00:00Z',
        'effective_to': '2074-01-01T00:00:00Z',
        'country_code': 'IN',
        'is_active': True
    },
    
    # SGST Rates
    {
        'rate_name': 'SGST 0.125%',
        'tax_type_code': 'SGST_0_125',
        'rate_percentage': 0.125,
        'effective_from': '2024-01-01T00:00:00Z',
        'effective_to': '2074-01-01T00:00:00Z',
        'country_code': 'IN',
        'is_active': True
    },
    {
        'rate_name': 'SGST 1.5%',
        'tax_type_code': 'SGST_1_5',
        'rate_percentage': 1.5,
        'effective_from': '2024-01-01T00:00:00Z',
        'effective_to': '2074-01-01T00:00:00Z',
        'country_code': 'IN',
        'is_active': True
    },
    {
        'rate_name': 'SGST 2.5%',
        'tax_type_code': 'SGST_2_5',
        'rate_percentage': 2.5,
        'effective_from': '2024-01-01T00:00:00Z',
        'effective_to': '2074-01-01T00:00:00Z',
        'country_code': 'IN',
        'is_active': True
    },
    {
        'rate_name': 'SGST 6%',
        'tax_type_code': 'SGST_6',
        'rate_percentage': 6.0,
        'effective_from': '2024-01-01T00:00:00Z',
        'effective_to': '2074-01-01T00:00:00Z',
        'country_code': 'IN',
        'is_active': True
    },
    {
        'rate_name': 'SGST 9%',
        'tax_type_code': 'SGST_9',
        'rate_percentage': 9.0,
        'effective_from': '2024-01-01T00:00:00Z',
        'effective_to': '2074-01-01T00:00:00Z',
        'country_code': 'IN',
        'is_active': True
    },
    {
        'rate_name': 'SGST 14%',
        'tax_type_code': 'SGST_14',
        'rate_percentage': 14.0,
        'effective_from': '2024-01-01T00:00:00Z',
        'effective_to': '2074-01-01T00:00:00Z',
        'country_code': 'IN',
        'is_active': True
    },
    
    # IGST Rates
    {
        'rate_name': 'IGST 0.25%',
        'tax_type_code': 'IGST_0_25',
        'rate_percentage': 0.25,
        'effective_from': '2024-01-01T00:00:00Z',
        'effective_to': '2074-01-01T00:00:00Z',
        'country_code': 'IN',
        'is_active': True
    },
    {
        'rate_name': 'IGST 3%',
        'tax_type_code': 'IGST_3',
        'rate_percentage': 3.0,
        'effective_from': '2024-01-01T00:00:00Z',
        'effective_to': '2074-01-01T00:00:00Z',
        'country_code': 'IN',
        'is_active': True
    },
    {
        'rate_name': 'IGST 5%',
        'tax_type_code': 'IGST_5',
        'rate_percentage': 5.0,
        'effective_from': '2024-01-01T00:00:00Z',
        'effective_to': '2074-01-01T00:00:00Z',
        'country_code': 'IN',
        'is_active': True
    },
    {
        'rate_name': 'IGST 12%',
        'tax_type_code': 'IGST_12',
        'rate_percentage': 12.0,
        'effective_from': '2024-01-01T00:00:00Z',
        'effective_to': '2074-01-01T00:00:00Z',
        'country_code': 'IN',
        'is_active': True
    },
    {
        'rate_name': 'IGST 18%',
        'tax_type_code': 'IGST_18',
        'rate_percentage': 18.0,
        'effective_from': '2024-01-01T00:00:00Z',
        'effective_to': '2074-01-01T00:00:00Z',
        'country_code': 'IN',
        'is_active': True
    },
    {
        'rate_name': 'IGST 28%',
        'tax_type_code': 'IGST_28',
        'rate_percentage': 28.0,
        'effective_from': '2024-01-01T00:00:00Z',
        'effective_to': '2074-01-01T00:00:00Z',
        'country_code': 'IN',
        'is_active': True
    },
    
    # GST 0% for exports/exempted items
    {
        'rate_name': 'GST 0%',
        'tax_type_code': 'GST_0',
        'rate_percentage': 0.0,
        'effective_from': '2024-01-01T00:00:00Z',
        'effective_to': '2074-01-01T00:00:00Z',
        'country_code': 'IN',
        'is_active': True
    }
]

# Tax Rate Profiles - Complex tax rules for different industries
TAX_RATE_PROFILES = [
    {
        'profile_name': 'Tax treatment for Readymade Garments',
        'description': 'This profile contains all GST rules for readymade garments, covering different price points and all types of supply.',
        'country_code': 'IN',
        'is_active': True,
        'rules': [
            {
                'priority': 1,
                'is_active': True,
                'effective_from': '2024-01-01T00:00:00Z',
                'effective_to': '2074-01-01T00:00:00Z',
                'conditions': [
                    {
                        'attribute_name': 'Selling Price',
                        'operator': '<',
                        'condition_value': '1000'
                    },
                    {
                        'attribute_name': 'Market',
                        'operator': '=',
                        'condition_value': 'Domestic'
                    },
                    {
                        'attribute_name': 'Supply Jurisdiction',
                        'operator': '=',
                        'condition_value': 'Within same state'
                    }
                ],
                'outcomes': [
                    {'tax_rate_code': 'CGST_2_5'},
                    {'tax_rate_code': 'SGST_2_5'}
                ]
            },
            {
                'priority': 2,
                'is_active': True,
                'effective_from': '2024-01-01T00:00:00Z',
                'effective_to': '2074-01-01T00:00:00Z',
                'conditions': [
                    {
                        'attribute_name': 'Selling Price',
                        'operator': '<',
                        'condition_value': '1000'
                    },
                    {
                        'attribute_name': 'Market',
                        'operator': '=',
                        'condition_value': 'Domestic'
                    },
                    {
                        'attribute_name': 'Supply Jurisdiction',
                        'operator': '=',
                        'condition_value': 'To a different state'
                    }
                ],
                'outcomes': [
                    {'tax_rate_code': 'IGST_5'}
                ]
            },
            {
                'priority': 3,
                'is_active': True,
                'effective_from': '2024-01-01T00:00:00Z',
                'effective_to': '2074-01-01T00:00:00Z',
                'conditions': [
                    {
                        'attribute_name': 'Selling Price',
                        'operator': '>=',
                        'condition_value': '1000'
                    },
                    {
                        'attribute_name': 'Market',
                        'operator': '=',
                        'condition_value': 'Domestic'
                    },
                    {
                        'attribute_name': 'Supply Jurisdiction',
                        'operator': '=',
                        'condition_value': 'Within same state'
                    }
                ],
                'outcomes': [
                    {'tax_rate_code': 'CGST_6'},
                    {'tax_rate_code': 'SGST_6'}
                ]
            },
            {
                'priority': 4,
                'is_active': True,
                'effective_from': '2024-01-01T00:00:00Z',
                'effective_to': '2074-01-01T00:00:00Z',
                'conditions': [
                    {
                        'attribute_name': 'Selling Price',
                        'operator': '>=',
                        'condition_value': '1000'
                    },
                    {
                        'attribute_name': 'Market',
                        'operator': '=',
                        'condition_value': 'Domestic'
                    },
                    {
                        'attribute_name': 'Supply Jurisdiction',
                        'operator': '=',
                        'condition_value': 'To a different state'
                    }
                ],
                'outcomes': [
                    {'tax_rate_code': 'IGST_12'}
                ]
            },
            {
                'priority': 5,
                'is_active': True,
                'effective_from': '2024-01-01T00:00:00Z',
                'effective_to': '2074-01-01T00:00:00Z',
                'conditions': [
                    {
                        'attribute_name': 'Market',
                        'operator': '=',
                        'condition_value': 'International'
                    }
                ],
                'outcomes': [
                    {'tax_rate_code': 'GST_0'}
                ]
            }
        ]
    },
    {
        'profile_name': 'Tax treatment for Footwear',
        'description': 'This profile contains all GST rules for footwear, covering different price points and all types of supply.',
        'country_code': 'IN',
        'is_active': True,
        'rules': [
            {
                'priority': 1,
                'is_active': True,
                'effective_from': '2024-01-01T00:00:00Z',
                'effective_to': '2074-01-01T00:00:00Z',
                'conditions': [
                    {
                        'attribute_name': 'Selling Price',
                        'operator': '<',
                        'condition_value': '1000'
                    },
                    {
                        'attribute_name': 'Market',
                        'operator': '=',
                        'condition_value': 'Domestic'
                    },
                    {
                        'attribute_name': 'Supply Jurisdiction',
                        'operator': '=',
                        'condition_value': 'Within same state'
                    }
                ],
                'outcomes': [
                    {'tax_rate_code': 'CGST_6'},
                    {'tax_rate_code': 'SGST_6'}
                ]
            },
            {
                'priority': 2,
                'is_active': True,
                'effective_from': '2024-01-01T00:00:00Z',
                'effective_to': '2074-01-01T00:00:00Z',
                'conditions': [
                    {
                        'attribute_name': 'Selling Price',
                        'operator': '<',
                        'condition_value': '1000'
                    },
                    {
                        'attribute_name': 'Market',
                        'operator': '=',
                        'condition_value': 'Domestic'
                    },
                    {
                        'attribute_name': 'Supply Jurisdiction',
                        'operator': '=',
                        'condition_value': 'To a different state'
                    }
                ],
                'outcomes': [
                    {'tax_rate_code': 'IGST_12'}
                ]
            },
            {
                'priority': 3,
                'is_active': True,
                'effective_from': '2024-01-01T00:00:00Z',
                'effective_to': '2074-01-01T00:00:00Z',
                'conditions': [
                    {
                        'attribute_name': 'Selling Price',
                        'operator': '>=',
                        'condition_value': '1000'
                    },
                    {
                        'attribute_name': 'Market',
                        'operator': '=',
                        'condition_value': 'Domestic'
                    },
                    {
                        'attribute_name': 'Supply Jurisdiction',
                        'operator': '=',
                        'condition_value': 'Within same state'
                    }
                ],
                'outcomes': [
                    {'tax_rate_code': 'CGST_9'},
                    {'tax_rate_code': 'SGST_9'}
                ]
            },
            {
                'priority': 4,
                'is_active': True,
                'effective_from': '2024-01-01T00:00:00Z',
                'effective_to': '2074-01-01T00:00:00Z',
                'conditions': [
                    {
                        'attribute_name': 'Selling Price',
                        'operator': '>=',
                        'condition_value': '1000'
                    },
                    {
                        'attribute_name': 'Market',
                        'operator': '=',
                        'condition_value': 'Domestic'
                    },
                    {
                        'attribute_name': 'Supply Jurisdiction',
                        'operator': '=',
                        'condition_value': 'To a different state'
                    }
                ],
                'outcomes': [
                    {'tax_rate_code': 'IGST_18'}
                ]
            },
            {
                'priority': 5,
                'is_active': True,
                'effective_from': '2024-01-01T00:00:00Z',
                'effective_to': '2074-01-01T00:00:00Z',
                'conditions': [
                    {
                        'attribute_name': 'Market',
                        'operator': '=',
                        'condition_value': 'International'
                    }
                ],
                'outcomes': [
                    {'tax_rate_code': 'GST_0'}
                ]
            }
        ]
    },
    {
        'profile_name': 'GST Slab - 5% (Standard Rate)',
        'description': 'This profile applies to all essential items and products taxed at a flat 5% GST rate, without any price-based variations.',
        'country_code': 'IN',
        'is_active': True,
        'rules': [
            {
                'priority': 1,
                'is_active': True,
                'effective_from': '2024-01-01T00:00:00Z',
                'effective_to': '2074-01-01T00:00:00Z',
                'conditions': [
                    {
                        'attribute_name': 'Market',
                        'operator': '=',
                        'condition_value': 'Domestic'
                    },
                    {
                        'attribute_name': 'Supply Jurisdiction',
                        'operator': '=',
                        'condition_value': 'Within same state'
                    }
                ],
                'outcomes': [
                    {'tax_rate_code': 'CGST_2_5'},
                    {'tax_rate_code': 'SGST_2_5'}
                ]
            },
            {
                'priority': 2,
                'is_active': True,
                'effective_from': '2024-01-01T00:00:00Z',
                'effective_to': '2074-01-01T00:00:00Z',
                'conditions': [
                    {
                        'attribute_name': 'Market',
                        'operator': '=',
                        'condition_value': 'Domestic'
                    },
                    {
                        'attribute_name': 'Supply Jurisdiction',
                        'operator': '=',
                        'condition_value': 'To a different state'
                    }
                ],
                'outcomes': [
                    {'tax_rate_code': 'IGST_5'}
                ]
            },
            {
                'priority': 3,
                'is_active': True,
                'effective_from': '2024-01-01T00:00:00Z',
                'effective_to': '2074-01-01T00:00:00Z',
                'conditions': [
                    {
                        'attribute_name': 'Market',
                        'operator': '=',
                        'condition_value': 'International'
                    }
                ],
                'outcomes': [
                    {'tax_rate_code': 'GST_0'}
                ]
            }
        ]
    },
    {
        'profile_name': 'GST Slab - 18% (Standard Rate)',
        'description': 'This profile serves as a standard for the vast majority of goods and services that are taxed at a flat 18% GST rate, with no price differentiation.',
        'country_code': 'IN',
        'is_active': True,
        'rules': [
            {
                'priority': 1,
                'is_active': True,
                'effective_from': '2024-01-01T00:00:00Z',
                'effective_to': '2074-01-01T00:00:00Z',
                'conditions': [
                    {
                        'attribute_name': 'Market',
                        'operator': '=',
                        'condition_value': 'Domestic'
                    },
                    {
                        'attribute_name': 'Supply Jurisdiction',
                        'operator': '=',
                        'condition_value': 'Within same state'
                    }
                ],
                'outcomes': [
                    {'tax_rate_code': 'CGST_9'},
                    {'tax_rate_code': 'SGST_9'}
                ]
            },
            {
                'priority': 2,
                'is_active': True,
                'effective_from': '2024-01-01T00:00:00Z',
                'effective_to': '2074-01-01T00:00:00Z',
                'conditions': [
                    {
                        'attribute_name': 'Market',
                        'operator': '=',
                        'condition_value': 'Domestic'
                    },
                    {
                        'attribute_name': 'Supply Jurisdiction',
                        'operator': '=',
                        'condition_value': 'To a different state'
                    }
                ],
                'outcomes': [
                    {'tax_rate_code': 'IGST_18'}
                ]
            },
            {
                'priority': 3,
                'is_active': True,
                'effective_from': '2024-01-01T00:00:00Z',
                'effective_to': '2074-01-01T00:00:00Z',
                'conditions': [
                    {
                        'attribute_name': 'Market',
                        'operator': '=',
                        'condition_value': 'International'
                    }
                ],
                'outcomes': [
                    {'tax_rate_code': 'GST_0'}
                ]
            }
        ]
    },
    {
        'profile_name': 'GST Slab - 28% (Standard Rate)',
        'description': 'This profile applies to all essential items and products taxed at a flat 28% GST rate, without any price-based variations.',
        'country_code': 'IN',
        'is_active': True,
        'rules': [
            {
                'priority': 1,
                'is_active': True,
                'effective_from': '2024-01-01T00:00:00Z',
                'effective_to': '2074-01-01T00:00:00Z',
                'conditions': [
                    {
                        'attribute_name': 'Market',
                        'operator': '=',
                        'condition_value': 'Domestic'
                    },
                    {
                        'attribute_name': 'Supply Jurisdiction',
                        'operator': '=',
                        'condition_value': 'Within same state'
                    }
                ],
                'outcomes': [
                    {'tax_rate_code': 'CGST_14'},
                    {'tax_rate_code': 'SGST_14'}
                ]
            },
            {
                'priority': 2,
                'is_active': True,
                'effective_from': '2024-01-01T00:00:00Z',
                'effective_to': '2074-01-01T00:00:00Z',
                'conditions': [
                    {
                        'attribute_name': 'Market',
                        'operator': '=',
                        'condition_value': 'Domestic'
                    },
                    {
                        'attribute_name': 'Supply Jurisdiction',
                        'operator': '=',
                        'condition_value': 'To a different state'
                    }
                ],
                'outcomes': [
                    {'tax_rate_code': 'IGST_28'}
                ]
            },
            {
                'priority': 3,
                'is_active': True,
                'effective_from': '2024-01-01T00:00:00Z',
                'effective_to': '2074-01-01T00:00:00Z',
                'conditions': [
                    {
                        'attribute_name': 'Market',
                        'operator': '=',
                        'condition_value': 'International'
                    }
                ],
                'outcomes': [
                    {'tax_rate_code': 'GST_0'}
                ]
            }
        ]
    },
    {
        'profile_name': 'Tax treatment for Precious Metals',
        'description': 'This profile covers all the special, low tax rates for precious goods like gold, silver and platinum',
        'country_code': 'IN',
        'is_active': True,
        'rules': [
            {
                'priority': 1,
                'is_active': True,
                'effective_from': '2024-01-01T00:00:00Z',
                'effective_to': '2074-01-01T00:00:00Z',
                'conditions': [
                    {
                        'attribute_name': 'Market',
                        'operator': '=',
                        'condition_value': 'Domestic'
                    },
                    {
                        'attribute_name': 'Supply Jurisdiction',
                        'operator': '=',
                        'condition_value': 'Within same state'
                    }
                ],
                'outcomes': [
                    {'tax_rate_code': 'CGST_1_5'},
                    {'tax_rate_code': 'SGST_1_5'}
                ]
            },
            {
                'priority': 2,
                'is_active': True,
                'effective_from': '2024-01-01T00:00:00Z',
                'effective_to': '2074-01-01T00:00:00Z',
                'conditions': [
                    {
                        'attribute_name': 'Market',
                        'operator': '=',
                        'condition_value': 'Domestic'
                    },
                    {
                        'attribute_name': 'Supply Jurisdiction',
                        'operator': '=',
                        'condition_value': 'To a different state'
                    }
                ],
                'outcomes': [
                    {'tax_rate_code': 'IGST_3'}
                ]
            },
            {
                'priority': 3,
                'is_active': True,
                'effective_from': '2024-01-01T00:00:00Z',
                'effective_to': '2074-01-01T00:00:00Z',
                'conditions': [
                    {
                        'attribute_name': 'Market',
                        'operator': '=',
                        'condition_value': 'International'
                    }
                ],
                'outcomes': [
                    {'tax_rate_code': 'GST_0'}
                ]
            }
        ]
    },
    {
        'profile_name': 'Tax treatment for Precious Gems and Diamonds',
        'description': 'This profile covers all the special, low tax rates for precious goods gems, polished and rough diamonds.',
        'country_code': 'IN',
        'is_active': True,
        'rules': [
            {
                'priority': 1,
                'is_active': True,
                'effective_from': '2024-01-01T00:00:00Z',
                'effective_to': '2074-01-01T00:00:00Z',
                'conditions': [
                    {
                        'attribute_name': 'Market',
                        'operator': '=',
                        'condition_value': 'Domestic'
                    },
                    {
                        'attribute_name': 'Supply Jurisdiction',
                        'operator': '=',
                        'condition_value': 'Within same state'
                    }
                ],
                'outcomes': [
                    {'tax_rate_code': 'CGST_0_125'},
                    {'tax_rate_code': 'SGST_0_125'}
                ]
            },
            {
                'priority': 2,
                'is_active': True,
                'effective_from': '2024-01-01T00:00:00Z',
                'effective_to': '2074-01-01T00:00:00Z',
                'conditions': [
                    {
                        'attribute_name': 'Market',
                        'operator': '=',
                        'condition_value': 'Domestic'
                    },
                    {
                        'attribute_name': 'Supply Jurisdiction',
                        'operator': '=',
                        'condition_value': 'To a different state'
                    }
                ],
                'outcomes': [
                    {'tax_rate_code': 'IGST_0_25'}
                ]
            },
            {
                'priority': 3,
                'is_active': True,
                'effective_from': '2024-01-01T00:00:00Z',
                'effective_to': '2074-01-01T00:00:00Z',
                'conditions': [
                    {
                        'attribute_name': 'Market',
                        'operator': '=',
                        'condition_value': 'International'
                    }
                ],
                'outcomes': [
                    {'tax_rate_code': 'GST_0'}
                ]
            }
        ]
    }
]

def seed_indian_tax_data():
    """
    Seeds Indian GST tax data into the database.
    
    This function is called during the onboarding process for Indian tenants.
    """
    import logging
    from django.db import transaction
    from pricing.models import TaxRate, TaxRateProfile, Rule as TaxRateRule, RuleCondition as TaxRuleCondition, RuleOutcome as TaxRuleOutcome
    
    logger = logging.getLogger(__name__)
    logger.info("Starting to seed Indian GST tax data")
    
    try:
        with transaction.atomic():
            # Step 1: Create all tax rates
            tax_rates = {}
            for rate_data in TAX_RATES:
                tax_rate, created = TaxRate.objects.get_or_create(
                    tax_type_code=rate_data['tax_type_code'],
                    defaults={
                        'rate_name': rate_data['rate_name'],
                        'rate_percentage': rate_data['rate_percentage'],
                        'effective_from': rate_data['effective_from'],
                        'effective_to': rate_data['effective_to'],
                        'country_code': rate_data['country_code'],
                        'is_active': rate_data['is_active'],
                        'client_id': 1,  # Default client ID
                        'company_id': 1  # Default company ID
                        # created_by and updated_by will be NULL by default
                    }
                )
                tax_rates[rate_data['tax_type_code']] = tax_rate
                if created:
                    logger.info(f"Created tax rate: {tax_rate.rate_name}")
                else:
                    logger.info(f"Tax rate already exists: {tax_rate.rate_name}")
            
            # Step 2: Create tax rate profiles with rules, conditions, and outcomes
            for profile_data in TAX_RATE_PROFILES:
                # Create the profile
                profile, created = TaxRateProfile.objects.get_or_create(
                    profile_name=profile_data['profile_name'],
                    defaults={
                        'description': profile_data['description'],
                        'country_code': profile_data['country_code'],
                        'is_active': profile_data['is_active'],
                        'client_id': 1,  # Default client ID
                        'company_id': 1  # Default company ID
                        # created_by and updated_by will be NULL by default
                    }
                )
                
                if created:
                    logger.info(f"Created tax rate profile: {profile.profile_name}")
                else:
                    logger.info(f"Tax rate profile already exists: {profile.profile_name}")
                    # Skip creating rules for existing profiles to avoid duplicates
                    continue
                
                # Create rules for this profile
                for rule_data in profile_data['rules']:
                    rule = TaxRateRule.objects.create(
                        taxability_profile=profile,  # Note: field name changed from tax_rate_profile to taxability_profile
                        priority=rule_data['priority'],
                        is_active=rule_data['is_active'],
                        effective_from=rule_data['effective_from'],
                        effective_to=rule_data['effective_to'],
                        client_id=1,  # Default client ID
                        company_id=1  # Default company ID
                        # created_by and updated_by will be NULL by default
                    )
                    logger.info(f"Created tax rule with priority {rule.priority} for profile {profile.profile_name}")
                    
                    # Create conditions for this rule
                    for condition_data in rule_data['conditions']:
                        TaxRuleCondition.objects.create(
                            rule=rule,  # Note: field name changed from tax_rate_rule to rule
                            attribute_name=condition_data['attribute_name'],
                            operator=condition_data['operator'],
                            condition_value=condition_data['condition_value'],
                            client_id=1,  # Default client ID
                            company_id=1  # Default company ID
                            # created_by and updated_by will be NULL by default
                        )
                    
                    # Create outcomes for this rule
                    for outcome_data in rule_data['outcomes']:
                        tax_rate_code = outcome_data['tax_rate_code']
                        if tax_rate_code in tax_rates:
                            TaxRuleOutcome.objects.create(
                                rule=rule,  # Note: field name changed from tax_rate_rule to rule
                                tax_rate=tax_rates[tax_rate_code],
                                client_id=1,  # Default client ID
                                company_id=1  # Default company ID
                                # created_by and updated_by will be NULL by default
                            )
                        else:
                            logger.error(f"Tax rate code {tax_rate_code} not found for rule outcome")
            
            logger.info("Successfully seeded all Indian GST tax data")
            return True
    except Exception as e:
        logger.error(f"Error seeding Indian GST tax data: {str(e)}")
        return False  # Return failure to indicate problem with tax data
