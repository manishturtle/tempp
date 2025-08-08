# tenants/seeders/home_goods_data.py

DIVISIONS = [
    {"name": "Furniture"},
    {"name": "Home Decor & Furnishings"},
    {"name": "Kitchen & Dining"},
    {"name": "Large Appliances"},
]

CATEGORIES = {
    "Furniture": [
        {"name": "Living Room Furniture", "subcategories": ["Sofas & Couches", "Coffee Tables", "TV Units", "Bookshelves", "Recliners"]},
        {"name": "Bedroom Furniture", "subcategories": ["Beds", "Mattresses", "Wardrobes", "Bedside Tables", "Dressing Tables"]},
        {"name": "Office Furniture", "subcategories": ["Office Chairs", "Desks & Tables", "Filing Cabinets"]},
        {"name": "Outdoor Furniture", "subcategories": ["Balcony Sets", "Swings", "Garden Chairs"]},
    ],
    "Home Decor & Furnishings": [
        {"name": "Lighting", "subcategories": ["Floor Lamps", "Table Lamps", "Ceiling Lights", "Wall Lights", "String Lights"]},
        {"name": "Wall Decor", "subcategories": ["Paintings", "Clocks", "Mirrors", "Wall Shelves"]},
        {"name": "Home Furnishings", "subcategories": ["Curtains & Blinds", "Cushions & Covers", "Rugs & Carpets", "Bed Linen", "Bath Linen"]},
    ],
    "Kitchen & Dining": [
        {"name": "Cookware", "subcategories": ["Pots & Pans", "Pressure Cookers", "Bakeware", "Tawas"]},
        {"name": "Tableware & Dinnerware", "subcategories": ["Dinner Sets", "Plates & Bowls", "Cutlery", "Mugs & Glassware"]},
        {"name": "Kitchen Storage", "subcategories": ["Containers & Jars", "Spice Racks", "Lunch Boxes"]},
        {"name": "Small Appliances", "subcategories": ["Mixer Grinders", "Toasters & Sandwich Makers", "Electric Kettles", "Microwaves"]},
    ],
    "Large Appliances": [
        {"name": "Refrigerators", "subcategories": ["Single Door", "Double Door", "Side-by-Side"]},
        {"name": "Washing Machines", "subcategories": ["Semi-Automatic", "Top Load Fully Automatic", "Front Load Fully Automatic"]},
        {"name": "Air Conditioners", "subcategories": ["Split ACs", "Window ACs", "Inverter ACs"]},
    ]
}

ATTRIBUTE_GROUPS = [
    {"name": "General"},
    {"name": "Material & Finish"},
    {"name": "Dimensions & Weight"},
    {"name": "Assembly & Installation"},
    {"name": "Technical Specifications"},
    {"name": "Warranty"},
]

ATTRIBUTES = {
    "General": [
        {"name": "Brand", "code": "brand", "data_type": "TEXT"},
        {"name": "Color", "code": "color", "data_type": "SELECT", "use_for_variants": True, "options": ["Brown", "Black", "White", "Beige", "Silver", "Red"]},
        {"name": "Room Type", "code": "room_type", "data_type": "SELECT", "options": ["Living Room", "Bedroom", "Kitchen", "Dining Room", "Office"]},
    ],
    "Material & Finish": [
        {"name": "Primary Material", "code": "primary_material", "data_type": "SELECT", "use_for_variants": True, "options": ["Solid Wood", "Engineered Wood", "Metal", "Plastic", "Fabric", "Leatherette"]},
        {"name": "Finish Type", "code": "finish_type", "data_type": "SELECT", "options": ["Matte", "Glossy", "Natural", "Laminate"]},
        {"name": "Upholstery Material", "code": "upholstery", "data_type": "SELECT", "options": ["Fabric", "Leather", "Velvet"]},
    ],
    "Dimensions & Weight": [
        {"name": "Height", "code": "height", "data_type": "TEXT"},
        {"name": "Width", "code": "width", "data_type": "TEXT"},
        {"name": "Depth", "code": "depth", "data_type": "TEXT"},
        {"name": "Weight", "code": "weight", "data_type": "TEXT"},
    ],
    "Assembly & Installation": [
        {"name": "Assembly Required", "code": "assembly_req", "data_type": "BOOLEAN"},
        {"name": "Installation Details", "code": "installation", "data_type": "TEXT"},
    ],
    "Technical Specifications": [
        {"name": "Capacity", "code": "capacity", "data_type": "TEXT"},
        {"name": "Power Consumption", "code": "power", "data_type": "TEXT"},
        {"name": "Energy Rating", "code": "energy_rating", "data_type": "SELECT", "options": ["1 Star", "2 Star", "3 Star", "4 Star", "5 Star"]},
    ],
    "Warranty": [
        {"name": "Warranty Summary", "code": "warranty", "data_type": "TEXT"},
    ]
}