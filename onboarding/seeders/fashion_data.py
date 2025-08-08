# tenants/seeders/fashion_data.py

DIVISIONS = [
    {
        'name': "Men's Fashion",
        'code': 'mens_fashion',
        'description': 'Fashion products for men'
    },
    {
        'name': "Women's Fashion",
        'code': 'womens_fashion',
        'description': 'Fashion products for women'
    },
    {
        'name': "Kids & Infants",
        'code': 'kids_infants',
        'description': 'Fashion products for children and infants'
    },
    {
        'name': "Footwear & Accessories",
        'code': 'footwear_accessories',
        'description': 'Footwear and fashion accessories'
    }
]

CATEGORIES = {
    "Men's Fashion": [
        {"name": "Tops", "subcategories": ["T-Shirts", "Formal Shirts", "Casual Shirts", "Polo Shirts", "Kurtas", "Vests", "Sweatshirts"]},
        {"name": "Bottoms", "subcategories": ["Jeans", "Trousers", "Shorts", "Track Pants", "Cargos", "Ethnic Bottoms"]},
        {"name": "Outerwear", "subcategories": ["Jackets", "Coats", "Blazers", "Waistcoats"]},
    ],
    "Women's Fashion": [
        {"name": "Ethnic & Fusion Wear", "subcategories": ["Kurtas & Kurtis", "Sarees", "Salwar Kameez Sets", "Lehengas", "Palazzos", "Blouses"]},
        {"name": "Western Wear", "subcategories": ["Dresses", "Tops, T-Shirts & Tunics", "Jeans & Jeggings", "Skirts", "Trousers & Capris", "Shrugs & Boleros"]},
        {"name": "Lingerie & Sleepwear", "subcategories": ["Bras", "Briefs", "Shapewear", "Nightdresses & Nighties"]},
    ],
    "Kids & Infants": [
        {"name": "Boys' Clothing", "subcategories": ["T-Shirts", "Shirts", "Jeans", "Shorts", "Dungarees"]},
        {"name": "Girls' Clothing", "subcategories": ["Dresses & Frocks", "Tops & T-shirts", "Skirts", "Leggings & Tights"]},
        {"name": "Infant Wear", "subcategories": ["Bodysuits & Rompers", "Clothing Sets", "Sleepsuits"]},
    ],
    "Footwear & Accessories": [
        {"name": "Men's Accessories", "subcategories": ["Belts", "Wallets", "Ties & Cufflinks", "Sunglasses", "Caps & Hats"]},
        {"name": "Women's Accessories", "subcategories": ["Handbags", "Clutches", "Scarves & Stoles", "Jewellery"]},
        {"name": "Men's Footwear", "subcategories": ["Sports Shoes", "Casual Shoes", "Formal Shoes", "Sandals & Floaters", "Boots"]},
        {"name": "Women's Footwear", "subcategories": ["Flats & Ballerinas", "Heels", "Wedges", "Sports Shoes", "Boots"]},
    ],
}

ATTRIBUTE_GROUPS = [
    {"name": "Key Details"},
    {"name": "Sizing & Fit"},
    {"name": "Material & Care"},
    {"name": "Occasion & Styling"},
    {"name": "Product Specifications"},
]

ATTRIBUTES = {
    "Key Details": [
        {"name": "Color", "code": "color", "data_type": "SELECT", "use_for_variants": True, "options": ["Red", "Blue", "Black", "White", "Green", "Yellow", "Pink", "Maroon", "Beige", "Grey"]},
        {"name": "Brand", "code": "brand", "data_type": "TEXT"},
        {"name": "Pattern", "code": "pattern", "data_type": "SELECT", "options": ["Solid", "Striped", "Checkered", "Printed", "Embroidered", "Floral"]},
    ],
    "Sizing & Fit": [
        {"name": "Size", "code": "size", "data_type": "SELECT", "use_for_variants": True, "options": ["XS", "S", "M", "L", "XL", "XXL", "Free Size"]},
        {"name": "Fit", "code": "fit", "data_type": "SELECT", "options": ["Slim Fit", "Regular Fit", "Loose Fit", "Tailored Fit"]},
        {"name": "Sleeve Length", "code": "sleeve_length", "data_type": "SELECT", "options": ["Full Sleeves", "Half Sleeves", "Sleeveless", "3/4th Sleeves"]},
    ],
    "Material & Care": [
        {"name": "Fabric", "code": "fabric", "data_type": "SELECT", "options": ["Cotton", "Polyester", "Silk", "Wool", "Denim", "Linen", "Viscose Rayon"]},
        {"name": "Wash Care", "code": "wash_care", "data_type": "SELECT", "options": ["Machine Wash", "Hand Wash", "Dry Clean Only"]},
    ],
    "Occasion & Styling": [
        {"name": "Occasion", "code": "occasion", "data_type": "SELECT", "options": ["Casual", "Formal", "Party", "Ethnic", "Wedding", "Sports"]},
        {"name": "Neck Type", "code": "neck_type", "data_type": "SELECT", "options": ["Round Neck", "V-Neck", "Polo Neck", "Turtleneck", "Collared"]},
    ],
    "Product Specifications": [
        {"name": "Country of Origin", "code": "origin_country", "data_type": "TEXT"},
        {"name": "Pack Contains", "code": "pack_contents", "data_type": "TEXT"},
    ]
}