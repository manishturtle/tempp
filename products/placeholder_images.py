import io
import os
import random
from PIL import Image, ImageDraw, ImageFont
from django.core.files.base import ContentFile

def generate_placeholder_image(width=800, height=600, text=None, bg_color=None, text_color=(255, 255, 255)):
    """
    Generate a placeholder image with optional text.
    
    Args:
        width: Width of the image in pixels
        height: Height of the image in pixels
        text: Optional text to display on the image
        bg_color: Background color as RGB tuple, random if None
        text_color: Text color as RGB tuple
        
    Returns:
        ContentFile: A Django ContentFile containing the image data
    """
    # Generate a random background color if none provided
    if bg_color is None:
        bg_color = (
            random.randint(50, 200),
            random.randint(50, 200),
            random.randint(50, 200)
        )
    
    # Create a new image with the given background color
    image = Image.new('RGB', (width, height), color=bg_color)
    draw = ImageDraw.Draw(image)
    
    # Add text if provided, otherwise use dimensions
    if text is None:
        text = f"{width}x{height}"
    
    # Try to load a font, fall back to default if not available
    try:
        # Adjust font size based on image dimensions
        font_size = min(width, height) // 10
        font = ImageFont.truetype("arial.ttf", font_size)
    except IOError:
        # Use default font if arial.ttf is not available
        font = ImageFont.load_default()
    
    # Calculate text position (centered)
    # PIL 9.0+ uses textbbox, older versions use getsize
    if hasattr(font, 'getbbox'):
        # PIL 9.0+
        bbox = font.getbbox(text)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
    elif hasattr(font, 'getsize'):
        # PIL 8.x and earlier
        text_width, text_height = font.getsize(text)
    else:
        # Fallback
        text_width, text_height = width//3, height//10
    
    position = ((width - text_width) // 2, (height - text_height) // 2)
    
    # Draw the text
    draw.text(position, text, fill=text_color, font=font)
    
    # Add a border
    draw.rectangle([(0, 0), (width-1, height-1)], outline=(200, 200, 200))
    
    # Convert to bytes
    img_byte_array = io.BytesIO()
    image.save(img_byte_array, format='JPEG')
    img_byte_array.seek(0)
    
    # Return as ContentFile
    return ContentFile(img_byte_array.getvalue())

def get_placeholder_for_product(product_id, image_id, width=800, height=600):
    """
    Get a placeholder image for a product.
    
    Args:
        product_id: ID of the product
        image_id: ID of the image
        width: Width of the image
        height: Height of the image
        
    Returns:
        ContentFile: A Django ContentFile containing the image data
    """
    # Create a unique but consistent color based on product_id
    r = (product_id * 13) % 200 + 55
    g = (product_id * 17) % 200 + 55
    b = (product_id * 19) % 200 + 55
    
    bg_color = (r, g, b)
    
    # Create text for the image
    text = f"Product {product_id}\nImage {image_id}"
    
    return generate_placeholder_image(width, height, text, bg_color)
