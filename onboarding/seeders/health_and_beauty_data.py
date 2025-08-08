# tenants/seeders/health_and_beauty_data.py

DIVISIONS = [
    {"name": "Skincare"},
    {"name": "Makeup"},
    {"name": "Haircare"},
    {"name": "Personal Care & Wellness"},
]

CATEGORIES = {
    "Skincare": [
        {"name": "Cleansers", "subcategories": ["Face Wash", "Cleansing Balms", "Micellar Water", "Face Scrubs & Exfoliators"]},
        {"name": "Moisturizers", "subcategories": ["Face Creams & Lotions", "Night Creams", "Face Gels", "Tinted Moisturizers"]},
        {"name": "Serums & Treatments", "subcategories": ["Face Serums", "Essences", "Acne Treatments", "Anti-Aging Treatments"]},
        {"name": "Masks & Peels", "subcategories": ["Sheet Masks", "Clay Masks", "Sleeping Masks", "Peels"]},
        {"name": "Suncare", "subcategories": ["Sunscreen Lotions", "Sunscreen Gels", "After-Sun Care"]},
    ],
    "Makeup": [
        {"name": "Face Makeup", "subcategories": ["Foundation", "Concealer", "Primer", "Compact & Powder", "Blush", "Highlighters & Contours"]},
        {"name": "Eye Makeup", "subcategories": ["Kajal & Eyeliner", "Mascara", "Eyeshadow", "Eyebrow Pencils"]},
        {"name": "Lip Makeup", "subcategories": ["Lipstick", "Liquid Lipstick", "Lip Gloss", "Lip Liner", "Lip Balms"]},
    ],
    "Haircare": [
        {"name": "Shampoo & Cleanser", "subcategories": ["Shampoo", "Dry Shampoo", "Clarifying Shampoo"]},
        {"name": "Conditioner & Treatments", "subcategories": ["Conditioner", "Hair Masks", "Leave-in Conditioners"]},
        {"name": "Hair Styling", "subcategories": ["Hair Gel & Wax", "Hair Spray", "Hair Serums"]},
    ],
    "Personal Care & Wellness": [
        {"name": "Bath & Body", "subcategories": ["Soaps", "Body Wash & Shower Gels", "Body Lotions", "Scrubs & Exfoliants"]},
        {"name": "Men's Grooming", "subcategories": ["Shaving Creams & Gels", "Beard Oils", "Face Wash for Men"]},
        {"name": "Health Supplements", "subcategories": ["Vitamins & Minerals", "Protein Supplements", "Herbal Supplements"]},
    ]
}

ATTRIBUTE_GROUPS = [
    {"name": "General Information"},
    {"name": "Key Benefits"},
    {"name": "Product Formulation"},
    {"name": "Applicator & Finish"},
    {"name": "Ingredients & Safety"},
]

ATTRIBUTES = {
    "General Information": [
        {"name": "Brand", "code": "brand", "data_type": "TEXT"},
        {"name": "Concern", "code": "concern", "data_type": "MULTI_SELECT", "options": ["Acne & Blemishes", "Anti-Aging", "Dryness", "Dullness", "Pigmentation", "Sun Protection"]},
        {"name": "Skin Type", "code": "skin_type", "data_type": "MULTI_SELECT", "options": ["Oily", "Dry", "Combination", "Normal", "Sensitive"]},
    ],
    "Key Benefits": [
        {"name": "Benefit 1", "code": "benefit_1", "data_type": "SELECT", "options": ["Hydrating", "Brightening", "Soothing", "Volumizing", "Long-lasting"]},
        {"name": "Benefit 2", "code": "benefit_2", "data_type": "SELECT", "options": ["Nourishing", "Mattifying", "Exfoliating", "Repairing"]},
    ],
    "Product Formulation": [
        {"name": "Formulation", "code": "formulation", "data_type": "SELECT", "options": ["Cream", "Gel", "Lotion", "Serum", "Liquid", "Powder", "Oil", "Foam"]},
        {"name": "Product Quantity", "code": "quantity", "data_type": "TEXT"},
    ],
    "Applicator & Finish": [
        {"name": "Finish", "code": "finish", "data_type": "SELECT", "options": ["Matte", "Glossy", "Satin", "Natural", "Shimmer", "Dewy"]},
        {"name": "Applicator Type", "code": "applicator", "data_type": "SELECT", "options": ["Wand", "Pump", "Dropper", "Tube", "Stick"]},
    ],
    "Ingredients & Safety": [
        {"name": "Specialty", "code": "specialty", "data_type": "MULTI_SELECT", "options": ["Paraben-Free", "Sulfate-Free", "Cruelty-Free", "Vegan", "Dermatologically Tested"]},
        {"name": "Key Ingredients", "code": "key_ingredients", "data_type": "TEXT"},
    ]
}