# tenants/seeders/electronics_data.py

DIVISIONS = [
    {"name": "Computers & Peripherals"},
    {"name": "Mobiles, Tablets & Wearables"},
    {"name": "TV, Audio & Home Entertainment"},
    {"name": "Cameras & Accessories"},
]

CATEGORIES = {
    "Computers & Peripherals": [
        {"name": "Laptops", "subcategories": ["Gaming Laptops", "Ultrabooks", "2-in-1 Laptops", "Chromebooks", "Business Laptops"]},
        {"name": "Desktops & All-in-Ones", "subcategories": ["Gaming Desktops", "All-in-One PCs", "Mini PCs", "Tower PCs"]},
        {"name": "Computer Components", "subcategories": ["Processors (CPU)", "Graphics Cards (GPU)", "RAM", "Motherboards", "Solid State Drives (SSD)", "Hard Disk Drives (HDD)", "Power Supply Units (PSU)"]},
        {"name": "Monitors", "subcategories": ["Gaming Monitors", "4K Monitors", "Curved Monitors", "IPS Monitors"]},
        {"name": "Keyboards & Mice", "subcategories": ["Mechanical Keyboards", "Wireless Keyboards", "Gaming Mice", "Ergonomic Mice"]},
    ],
    "Mobiles, Tablets & Wearables": [
        {"name": "Mobile Phones", "subcategories": ["Smartphones", "Feature Phones"]},
        {"name": "Tablets", "subcategories": ["Android Tablets", "iPads", "E-readers"]},
        {"name": "Wearable Technology", "subcategories": ["Smartwatches", "Fitness Bands", "Wireless Earbuds & Headphones"]},
    ],
    "TV, Audio & Home Entertainment": [
        {"name": "Televisions", "subcategories": ["Smart TVs", "OLED & QLED TVs", "4K UHD TVs", "8K TVs"]},
        {"name": "Audio Systems", "subcategories": ["Soundbars", "Home Theatre Systems", "Bluetooth Speakers", "Party Speakers"]},
        {"name": "Streaming Devices", "subcategories": ["Media Streaming Sticks", "Smart Set Top Boxes"]},
    ],
    "Cameras & Accessories": [
        {"name": "Cameras", "subcategories": ["DSLR Cameras", "Mirrorless Cameras", "Point & Shoot Cameras", "Action Cameras", "Drones"]},
        {"name": "Lenses", "subcategories": ["Prime Lenses", "Zoom Lenses", "Telephoto Lenses"]},
        {"name": "Camera Accessories", "subcategories": ["Tripods & Monopods", "Camera Bags", "Memory Cards", "Flashes"]},
    ]
}

ATTRIBUTE_GROUPS = [
    {"name": "General"},
    {"name": "Core Specifications"},
    {"name": "Display & Screen"},
    {"name": "Memory & Storage"},
    {"name": "Connectivity & Ports"},
    {"name": "Physical Dimensions"},
    {"name": "Warranty & In The Box"},
]

ATTRIBUTES = {
    "General": [
        {"name": "Brand", "code": "brand", "data_type": "TEXT"},
        {"name": "Model Name", "code": "model_name", "data_type": "TEXT"},
        {"name": "Color", "code": "color", "data_type": "SELECT", "use_for_variants": True, "options": ["Black", "Silver", "White", "Blue", "Gold"]},
    ],
    "Core Specifications": [
        {"name": "Processor Brand", "code": "cpu_brand", "data_type": "SELECT", "options": ["Intel", "AMD", "Apple", "Qualcomm"]},
        {"name": "Processor Name", "code": "cpu_model", "data_type": "TEXT"},
        {"name": "Graphics Processor", "code": "gpu", "data_type": "TEXT"},
        {"name": "Operating System", "code": "os", "data_type": "SELECT", "options": ["Windows", "macOS", "Android", "iOS", "Linux"]},
    ],
    "Display & Screen": [
        {"name": "Screen Size", "code": "screen_size", "data_type": "SELECT", "options": ["Below 13 inch", "13 - 14.9 inch", "15 - 16.9 inch", "17 inch & Above"]},
        {"name": "Screen Resolution", "code": "resolution", "data_type": "TEXT"},
        {"name": "Screen Type", "code": "panel_type", "data_type": "SELECT", "options": ["IPS LCD", "OLED", "AMOLED", "QLED"]},
        {"name": "Refresh Rate", "code": "refresh_rate", "data_type": "TEXT"},
    ],
    "Memory & Storage": [
        {"name": "RAM", "code": "ram", "data_type": "SELECT", "use_for_variants": True, "options": ["4GB", "8GB", "16GB", "32GB", "64GB"]},
        {"name": "Storage Type", "code": "storage_type", "data_type": "SELECT", "options": ["SSD", "HDD", "eMMC"]},
        {"name": "Storage Capacity", "code": "storage", "data_type": "SELECT", "use_for_variants": True, "options": ["128GB", "256GB", "512GB", "1TB", "2TB"]},
    ],
    "Connectivity & Ports": [
        {"name": "Wi-Fi Standard", "code": "wifi", "data_type": "TEXT"},
        {"name": "Bluetooth Version", "code": "bluetooth", "data_type": "TEXT"},
        {"name": "Ports", "code": "ports", "data_type": "TEXT"},
    ],
    "Physical Dimensions": [
        {"name": "Thickness", "code": "thickness", "data_type": "TEXT"},
        {"name": "Weight", "code": "weight", "data_type": "TEXT"},
    ],
    "Warranty & In The Box": [
        {"name": "Warranty", "code": "warranty", "data_type": "TEXT"},
        {"name": "In The Box", "code": "box_contents", "data_type": "TEXT"},
    ]
}