# tenants/seeders/food_and_beverage_data.py

DIVISIONS = [
    {"name": "Groceries & Staples"},
    {"name": "Snacks & Packaged Foods"},
    {"name": "Beverages"},
    {"name": "Dairy, Frozen & Desserts"},
]

CATEGORIES = {
    "Groceries & Staples": [
        {"name": "Grains & Rice", "subcategories": ["Basmati Rice", "Brown Rice", "Quinoa", "Millets"]},
        {"name": "Flours & Atta", "subcategories": ["Whole Wheat Atta", "Gram Flour (Besan)", "Rice Flour"]},
        {"name": "Dals & Pulses", "subcategories": ["Toor Dal", "Moong Dal", "Urad Dal", "Chana Dal"]},
        {"name": "Spices & Masalas", "subcategories": ["Whole Spices", "Powdered Spices", "Ready Mix Masalas"]},
        {"name": "Oils & Ghee", "subcategories": ["Sunflower Oil", "Mustard Oil", "Ghee", "Olive Oil"]},
    ],
    "Snacks & Packaged Foods": [
        {"name": "Biscuits & Cookies", "subcategories": ["Sweet Biscuits", "Savoury Biscuits", "Cream Biscuits"]},
        {"name": "Chips & Namkeen", "subcategories": ["Potato Chips", "Namkeen Mixtures", "Papad"]},
        {"name": "Noodles & Pasta", "subcategories": ["Instant Noodles", "Pasta", "Vermicelli"]},
        {"name": "Breakfast Cereals", "subcategories": ["Oats", "Muesli", "Corn Flakes"]},
    ],
    "Beverages": [
        {"name": "Tea & Coffee", "subcategories": ["Tea Bags", "Loose Tea Leaves", "Instant Coffee", "Ground Coffee"]},
        {"name": "Juices & Drinks", "subcategories": ["Fruit Juices", "Health Drinks", "Soft Drinks", "Energy Drinks"]},
        {"name": "Health & Nutrition", "subcategories": ["Protein Powders", "Meal Replacement Shakes"]},
    ],
    "Dairy, Frozen & Desserts": [
        {"name": "Dairy Products", "subcategories": ["Milk", "Cheese", "Butter", "Yogurt"]},
        {"name": "Frozen Foods", "subcategories": ["Frozen Vegetables", "Frozen Snacks", "Frozen Breads"]},
        {"name": "Ice Creams & Desserts", "subcategories": ["Ice Cream Tubs", "Kulfi", "Chocolates", "Sweets"]},
    ]
}

ATTRIBUTE_GROUPS = [
    {"name": "General Information"},
    {"name": "Dietary & Allergen Information"},
    {"name": "Nutritional Facts"},
    {"name": "Ingredients"},
    {"name": "Storage & Usage"},
]

ATTRIBUTES = {
    "General Information": [
        {"name": "Brand", "code": "brand", "data_type": "TEXT"},
        {"name": "Net Quantity", "code": "quantity", "data_type": "TEXT"},
        {"name": "Maximum Shelf Life", "code": "shelf_life", "data_type": "TEXT"},
        {"name": "Country of Origin", "code": "origin_country", "data_type": "TEXT"},
    ],
    "Dietary & Allergen Information": [
        {"name": "Food Preference", "code": "food_pref", "data_type": "SELECT", "options": ["Vegetarian", "Non-Vegetarian", "Eggetarian"]},
        {"name": "Is Vegan", "code": "is_vegan", "data_type": "BOOLEAN"},
        {"name": "Is Gluten-Free", "code": "is_gluten_free", "data_type": "BOOLEAN"},
        {"name": "Allergen Information", "code": "allergens", "data_type": "TEXT"},
    ],
    "Nutritional Facts": [
        {"name": "Energy per 100g", "code": "energy_kcal", "data_type": "TEXT"},
        {"name": "Protein per 100g", "code": "protein_g", "data_type": "TEXT"},
        {"name": "Carbohydrates per 100g", "code": "carbs_g", "data_type": "TEXT"},
        {"name": "Fat per 100g", "code": "fat_g", "data_type": "TEXT"},
    ],
    "Ingredients": [
        {"name": "Ingredients List", "code": "ingredients", "data_type": "TEXT"},
    ],
    "Storage & Usage": [
        {"name": "Storage Instructions", "code": "storage_info", "data_type": "TEXT"},
        {"name": "Cooking Instructions", "code": "cooking_info", "data_type": "TEXT"},
    ]
}