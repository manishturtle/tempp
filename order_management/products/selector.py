# products/selectors.py

import logging
import math
from django.db import models
from django.db.models import Prefetch, Subquery, OuterRef, Min, Max, F, Q, Case, When, Value, Count, CharField, Exists
from django.utils import timezone
from products.models import Product, ProductVariant, ProductImage, ProductAttributeValue, ProductVisibility, ProductZoneRestriction
from shipping_zones.models import ShippingZone, PincodeZoneAssignment, PincodeMaster
from order_management.models import FeatureToggleSettings
from typing import Dict, Any, Optional

# Configure logger
logger = logging.getLogger(__name__)

# Country name to code mapping
COUNTRY_NAME_TO_CODE = {
    'India': 'IN',
    'United States': 'US',
    'United Kingdom': 'GB',
    'Canada': 'CA',
    'Australia': 'AU',
    'Germany': 'DE',
    'France': 'FR',
    'Japan': 'JP',
    'China': 'CN',
    'Brazil': 'BR',
    # Add more mappings as needed
}

def get_country_code(country_input: str) -> str:
    """
    Convert country name to country code if needed.
    If input is already a country code (2 characters), return as is.
    If input is a country name, convert to code.
    """
    if len(country_input) == 2:
        # Assume it's already a country code
        return country_input.upper()
    else:
        # Try to convert from country name to code
        return COUNTRY_NAME_TO_CODE.get(country_input, country_input)

# Note: The logic for 'KIT' product types is commented out as per our agreement
# to keep it out of the current scope. The framework to support it is here.
#
# Assumed Model for Kit Products for the logic to work
# class KitComponent(models.Model):
#     kit_product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='kit_components')
#     component_product = models.ForeignKey(Product, on_delete=models.CASCADE)
#     quantity_required = models.PositiveIntegerField(default=1)

def get_filters_for_products(queryset: models.QuerySet) -> dict:
    """
    Generates a complete dictionary of available filters (facets) with counts
    based on the provided (already filtered) product queryset.
    This version correctly handles all catalogue levels and attributes for all product types.
    """
    if not queryset.exists():
        logger.info("Empty queryset received in get_filters_for_products, returning empty filters")
        return {}
        


    # 1. Generate counts for all catalogue levels from the current product set.
    divisions = queryset.values('division__id', 'division__name').annotate(count=Count('id')).order_by('-count')
    categories = queryset.values('category__id', 'category__name').annotate(count=Count('id')).order_by('-count')
    subcategories = queryset.values('subcategory__id', 'subcategory__name').annotate(count=Count('id')).order_by('-count')

    # 2. Generate attribute facets, combining variants and simple products.
    attributes_facet = {}
    
    # Get facets from PARENT products (via variants)
    variant_options = ProductVariant.objects.filter(
        product__in=queryset.filter(product_type='PARENT'), 
        is_active=True,
        options__attribute__is_filterable=True
    ).values('options__attribute__name', 'options__option_label', 'options__id').annotate(count=Count('id'))
    


    for option in variant_options:
        attr_name = option['options__attribute__name']
        if attr_name not in attributes_facet:
            attributes_facet[attr_name] = {}
        label = option['options__option_label']
        if label not in attributes_facet[attr_name]:
            attributes_facet[attr_name][label] = {'id': option['options__id'], 'count': 0, 'label': label}
        attributes_facet[attr_name][label]['count'] += option['count']

    # Get facets from SIMPLE products (via ProductAttributeValue)
    regular_products = queryset.filter(product_type='REGULAR')

    
    # First, check if any attributes exist at all without filtering
    all_attrs = ProductAttributeValue.objects.filter(
        product__in=regular_products
    )

    
    # Log the actual attribute values for debugging

    
    # Get attributes with text values (which is how your data is stored)
    simple_attrs = ProductAttributeValue.objects.filter(
        product__in=regular_products,
        attribute__is_filterable=True,
        value_text__isnull=False
    ).values('attribute__name', 'attribute__id', 'value_text').annotate(count=Count('id'))
    


    for attr in simple_attrs:

        attr_name = attr['attribute__name']
        if attr_name not in attributes_facet:
            attributes_facet[attr_name] = {}
        # Use the text value directly as the label
        label = attr['value_text']
        if label not in attributes_facet[attr_name]:
            attributes_facet[attr_name][label] = {'id': attr['attribute__id'], 'count': 0, 'label': label}
        attributes_facet[attr_name][label]['count'] += attr['count']

    # Convert the processed dictionary to the final list format, sorted for consistent display
    final_attributes = {name: sorted(list(options.values()), key=lambda x: x['label']) for name, options in attributes_facet.items()}
    


    return {
        'divisions': list(divisions),
        'categories': list(categories),
        'subcategories': list(subcategories),
        'attributes': final_attributes
    }


def get_storefront_products(filters: dict, page: int = 1, page_size: int = 24) -> (list[dict], dict, dict):
    """
    The definitive selector function to fetch, filter, and prepare products for storefront display.
    """

    # --- Filter by customer_group_selling_channel_id and is_visible ---
    customer_group_selling_channel_id = filters.get('customer_group_selling_channel_id')
    visible_product_ids = None
    if customer_group_selling_channel_id:
        visible_product_ids = ProductVisibility.objects.filter(
            customer_group_selling_channel_id=customer_group_selling_channel_id,
            is_visible=True
        ).values_list('product_id', flat=True)
        print(f"Visible product IDs for customer_group_selling_channel_id={customer_group_selling_channel_id}: {list(visible_product_ids)}")

    now = timezone.now()
    show_out_of_stock = filters.get('show_out_of_stock', False)


    # STEP 1: Define Base Visibility Rules (including pre-orders and active dates)
    active_now_q = Q(is_active=True) & (Q(active_from_date__isnull=True) | Q(active_from_date__lte=now))
    preorder_q = Q(is_active=True, pre_order_available=True, active_from_date__gt=now, pre_order_date__gte=now)

    base_qs = Product.objects.filter(
        (active_now_q | preorder_q),
        publication_status='ACTIVE', # Assumes 'PUBLISHED' is the status for live products
        division__is_active=True,
        category__is_active=True,
        subcategory__is_active=True
    )
    # Restrict to visible products for this customer group/channel if applicable
    if visible_product_ids is not None:
        base_qs = base_qs.filter(id__in=visible_product_ids)

    # --- Filter by pincode and country for shipping zone availability ---
    pincode = filters.get('pincode')
    country = filters.get('country')
    if pincode and country and customer_group_selling_channel_id:
        try:
            # Get products that have zone restrictions
            products_with_zones = ProductZoneRestriction.objects.values_list('product_id', flat=True).distinct()
            
            # Case 1: For products with zones, check if pincode matches in PincodeZoneAssignment
            valid_zone_product_ids = []
            if products_with_zones:
                # Find the zone for this pincode
                try:
                    # Convert country name to country code if needed
                    country_code = get_country_code(country)
                    print(f"Country conversion: '{country}' -> '{country_code}'")
                    pincode_assignment = PincodeZoneAssignment.objects.get(
                        pincode__pincode=pincode,
                        pincode__country_code=country_code
                    )
                    user_zone_id = pincode_assignment.zone_id
                    
                    # Get products that have this zone in their restrictions
                    for product_id in products_with_zones:
                        product_zones = ProductZoneRestriction.objects.filter(product_id=product_id)
                        include_restrictions = product_zones.filter(restriction_mode='INCLUDE')
                        exclude_restrictions = product_zones.filter(restriction_mode='EXCLUDE')
                        
                        if include_restrictions.exists():
                            include_match = include_restrictions.filter(zone_id=user_zone_id)
                            include_check = include_match.exists()
                            relation_ids = list(include_match.values_list('id', flat=True)) if include_check else []
                            print(f"[L178][Product {product_id}] INCLUDE restriction: user_zone_id in include list? {include_check}, matching ProductZoneRestriction id(s): {relation_ids}")
                            if include_check:
                                valid_zone_product_ids.append(product_id)
                        elif exclude_restrictions.exists():
                            exclude_match = exclude_restrictions.filter(zone_id=user_zone_id)
                            exclude_check = not exclude_match.exists()
                            relation_ids = list(exclude_match.values_list('id', flat=True)) if not exclude_check else []
                            print(f"[L183][Product {product_id}] EXCLUDE restriction: user_zone_id NOT in exclude list? {exclude_check}, checked ProductZoneRestriction id(s): {relation_ids}")
                            if exclude_check:
                                valid_zone_product_ids.append(product_id)
                        else:
                            print(f"[L187][Product {product_id}] No restrictions: Not available")
                    print(f"[L188] Products with pincode match: {valid_zone_product_ids}")
                except PincodeZoneAssignment.DoesNotExist:
                    print(f"Pincode {pincode} with country {country} not found in PincodeZoneAssignment.")
                    valid_zone_product_ids = []
            
            # Case 2: For products without zones, check default_delivery_zone
            valid_no_zone_product_ids = []
            products_without_zones = base_qs.exclude(id__in=products_with_zones).values_list('id', flat=True)
            
            if products_without_zones:
                try:
                    # First try to get settings for specific customer_group_selling_channel_id
                    feature_settings = FeatureToggleSettings.objects.get(
                        customer_group_selling_channel_id=customer_group_selling_channel_id
                    )
                    print(f"Found specific FeatureToggleSettings for customer_group_selling_channel_id={customer_group_selling_channel_id}")
                except FeatureToggleSettings.DoesNotExist:
                    # Fallback to default settings (is_default=True)
                    try:
                        feature_settings = FeatureToggleSettings.objects.get(is_default=True)
                        print(f"No specific FeatureToggleSettings found for customer_group_selling_channel_id={customer_group_selling_channel_id}, using default settings (id={feature_settings.id})")
                    except FeatureToggleSettings.DoesNotExist:
                        print(f"No FeatureToggleSettings found for customer_group_selling_channel_id={customer_group_selling_channel_id} and no default settings available")
                        valid_no_zone_product_ids = []
                        feature_settings = None
                
                if feature_settings:
                    default_zone = feature_settings.default_delivery_zone
                    
                    if default_zone == "All over world":
                        print(f"default_delivery_zone is 'All over world': True")
                        valid_no_zone_product_ids = list(products_without_zones)
                    elif default_zone == country:
                        print(f"default_delivery_zone == country ({country}): True")
                        valid_no_zone_product_ids = list(products_without_zones)
                    else:
                        print(f"default_delivery_zone == country ({country}): False")
            
            # Combine both lists and filter base_qs
            all_valid_product_ids = valid_zone_product_ids + valid_no_zone_product_ids
            print(f"Final valid product IDs: {all_valid_product_ids}")
            if all_valid_product_ids:
                base_qs = base_qs.filter(id__in=all_valid_product_ids)
            else:
                print("No products are deliverable to this pincode/country.")
                base_qs = base_qs.none()
                
        except Exception as e:
            logger.error(f"Error filtering products by pincode/country: {str(e)}")
            print(f"Exception occurred: {str(e)}")
            # On error, don't filter by pincode (show all products)
            pass

    # STEP 2: Apply User-Selected Filters from the request

    if 'division_id' in filters:
        div_id = filters['division_id']

        if isinstance(div_id, list):
            base_qs = base_qs.filter(division_id__in=div_id)
        else:
            base_qs = base_qs.filter(division_id=div_id)
            
    if 'category_id' in filters:
        cat_id = filters['category_id']

        if isinstance(cat_id, list):
            base_qs = base_qs.filter(category_id__in=cat_id)
        else:
            base_qs = base_qs.filter(category_id=cat_id)
            
    if 'subcategory_id' in filters:
        subcat_id = filters['subcategory_id']

        if isinstance(subcat_id, list):
            base_qs = base_qs.filter(subcategory_id__in=subcat_id)
        else:
            base_qs = base_qs.filter(subcategory_id=subcat_id)
    # Slug-based filtering removed as it's not needed

    
    # Apply attribute filters if present
    if 'attributes' in filters and filters['attributes']:

        
        # For each attribute, filter products that have matching attribute values
        for attr_name, attr_value in filters['attributes'].items():

            
            # Based on the database structure, we're filtering by attribute_id
            # The URL parameter format is attribute_<name>=<attribute_id>
            try:
                # Convert attribute name to database field format if needed
                db_attr_name = attr_name.replace('-', '_').lower()
                attr_id = int(attr_value)
                

                
                # Filter products that have this specific attribute ID
                filtered_products = base_qs.filter(
                    Q(product_type='PARENT', variants__options__attribute__id=attr_id) |
                    Q(product_type='REGULAR', attribute_values__attribute__id=attr_id)
                )
                
                # Update the base queryset
                base_qs = filtered_products
                

                
            except ValueError:
                logger.error(f"Invalid attribute value: {attr_value}. Expected an integer.")
            


    # STEP 3: Annotate with Stock Status for ALL Product Types
    buyable_variants_exist = Exists(ProductVariant.objects.filter(
        product=OuterRef('pk'), 
        is_active=True
    ).filter(
        Q(quantity_on_hand__gte=1) | Q(product__backorders_allowed=True)
    ))
    # unavailable_component_exists = Exists(KitComponent.objects.filter(kit_product=OuterRef('pk'), component_product__quantity_on_hand__lt=F('quantity_required')))

    products_with_status = base_qs.annotate(
        stock_status=Case(
            When(product_type='PARENT', then=Case(When(buyable_variants_exist, then=Value('IN_STOCK')), default=Value('OUT_OF_STOCK'))),
            # When(product_type='KIT', then=Case(When(unavailable_component_exists, then=Value('OUT_OF_STOCK')), default=Value('IN_STOCK'))),
            default=Case(
                # First check if quantity is 0 - always OUT_OF_STOCK
                When(Q(quantity_on_hand__lte=0), then=Value('OUT_OF_STOCK')),
                # Then check inventory tracking and min_count rules
                When(Q(inventory_tracking_enabled=True, quantity_on_hand__lte=F('min_count'), backorders_allowed=True), then=Value('BACKORDER')),
                When(Q(inventory_tracking_enabled=True, quantity_on_hand__lte=F('min_count'), backorders_allowed=False), then=Value('OUT_OF_STOCK')),
                # Check for LOW_STOCK: when low_stock_count > 0 and quantity_on_hand <= low_stock_count
                When(Q(low_stock_count__gt=0, quantity_on_hand__lte=F('low_stock_count'), quantity_on_hand__gt=F('min_count')), then=Value('LOW_STOCK')),
                default=Value('IN_STOCK')
            ),
            output_field=CharField(),
        )
    )

    # STEP 4: Exclude Out of Stock Items if Requested

    if not show_out_of_stock:
        count_before = products_with_status.count()
        products_with_status = products_with_status.exclude(stock_status='OUT_OF_STOCK')


    # STEP 5: Annotate with Final Price Information for all product types
    min_price_sq = Subquery(ProductVariant.objects.filter(product=OuterRef('pk'), is_active=True).values('product').annotate(min_p=Min('display_price')).values('min_p'))
    max_price_sq = Subquery(ProductVariant.objects.filter(product=OuterRef('pk'), is_active=True).values('product').annotate(max_p=Max('display_price')).values('max_p'))
    products_with_prices = products_with_status.annotate(
        final_min_price=Case(When(product_type='PARENT', then=min_price_sq), default=F('display_price')),
        final_max_price=Case(When(product_type='PARENT', then=max_price_sq), default=F('display_price'))
    ).filter(final_min_price__isnull=False)

    # STEP 6: Apply Price Range Filter
    price_gte, price_lte = filters.get('price__gte'), filters.get('price__lte')
    if price_gte is not None:
        products_with_prices = products_with_prices.filter(final_max_price__gte=price_gte)
    if price_lte is not None:
        products_with_prices = products_with_prices.filter(final_min_price__lte=price_lte)

    # STEP 7: Eager Load All Remaining Data for Serialization
    final_qs = products_with_prices.select_related(
        'division', 'category', 'subcategory', 'currency_code'
    ).prefetch_related(
        Prefetch('images', queryset=ProductImage.objects.order_by('-is_default', 'sort_order'))
    ).order_by('-created_at')

    # STEP 8: Generate Filters and Price Range for the UI
    available_filters = get_filters_for_products(final_qs)
    if final_qs.exists():
        price_range = final_qs.aggregate(min=Min('final_min_price'), max=Max('final_max_price'))
        available_filters['price_range'] = price_range
    else:
        available_filters['price_range'] = None

    # STEP 9: Apply Pagination
    total_count = final_qs.count()
    start_index = (page - 1) * page_size
    end_index = start_index + page_size
    paginated_products = final_qs[start_index:end_index]
    pagination_data = {'total_count': total_count, 'current_page': page, 'page_size': page_size, 'total_pages': (total_count + page_size - 1) // page_size}

    # STEP 10: Serialize Final Data for the Response
    serialized_data = [serialize_product(p) for p in paginated_products]


    return serialized_data, pagination_data, available_filters


def serialize_product(product: Product) -> Dict[str, Any]:
    """
    Serializes a single product object into a detailed JSON structure.
    
    Args:
        product: The Product instance to serialize
        
    Returns:
        Dict containing the serialized product data
    """
    # Safely handle image serialization
    serialized_images = []
    if hasattr(product, 'images') and product.images.exists():
        try:
            serialized_images = [
                {
                    "id": img.id,
                    "client_id": img.client_id,
                    "company_id": img.company_id,
                    "product": img.product_id,
                    "image": img.image.url if img and hasattr(img, 'image') and img.image else None,
                    "alt_text": img.alt_text if hasattr(img, 'alt_text') else "",
                    "sort_order": img.sort_order if hasattr(img, 'sort_order') else 0,
                    "is_default": img.is_default if hasattr(img, 'is_default') else False,
                    "created_at": img.created_at.isoformat() if hasattr(img, 'created_at') and img.created_at else None,
                    "updated_at": img.updated_at.isoformat() if hasattr(img, 'updated_at') and img.updated_at else None
                } 
                for img in product.images.all()  # Using .all() to evaluate the queryset
            ]
        except Exception as e:
            # Log error but don't fail the entire serialization
            import logging
            logging.error(f"Error serializing product images: {str(e)}")
            serialized_images = []

    # Safely access related fields with None checks
    currency_code = None
    if hasattr(product, 'currency_code') and product.currency_code:
        currency_code = product.currency_code.code if hasattr(product.currency_code, 'code') else None

    category_id = product.category.id if hasattr(product, 'category') and product.category else None
    subcategory_id = product.subcategory.id if hasattr(product, 'subcategory') and product.subcategory else None

    # # Initialize empty zones array - will only be populated if there are explicit restrictions
    # zones = []
    # try:
    #     # Get all zone restrictions for this product
    #     zone_restrictions = ProductZoneRestriction.objects.filter(product=product)
    #     include_restrictions = zone_restrictions.filter(restriction_mode='INCLUDE')
    #     exclude_restrictions = zone_restrictions.filter(restriction_mode='EXCLUDE')

    #     match (include_restrictions.exists(), exclude_restrictions.exists()):
    #         case (True, _):
    #             # If INCLUDE restrictions exist, only show those zones
    #             zones = list(include_restrictions.values_list('zone_id', flat=True))
    #         case (False, True):
    #             # If EXCLUDE restrictions exist, show all active zones except excluded ones
    #             excluded_zone_ids = list(exclude_restrictions.values_list('zone_id', flat=True))
    #             all_active_zones = ShippingZone.objects.filter(is_active=True).values_list('id', flat=True)
    #             zones = [zone_id for zone_id in all_active_zones if zone_id not in excluded_zone_ids]
    #         case _:
    #             # No restrictions, zones remains empty
    #             zones = []
    # except Exception as e:
    #     logger.error(f"Error calculating shipping zones for product {product.id}: {str(e)}")
    #     zones = []

    return {
        "id": product.id,
        "client_id": product.client_id,
        "company_id": product.company_id,
        "sku": product.sku if hasattr(product, 'sku') else "",
        "name": product.name if hasattr(product, 'name') else "",
        "product_type": product.product_type if hasattr(product, 'product_type') else "SIMPLE",
        "publication_status": product.publication_status if hasattr(product, 'publication_status') else "DRAFT",
        "is_active": product.is_active if hasattr(product, 'is_active') else False,
        "category": category_id,
        "subcategory": subcategory_id,
        "price": {
            "min": product.final_min_price if hasattr(product, 'final_min_price') else 0,
            "max": product.final_max_price if hasattr(product, 'final_max_price') else 0
        },
        "compare_at_price": product.compare_at_price if hasattr(product, 'compare_at_price') else None,
        "currency_code": currency_code,
        "images": serialized_images,
        "stock_status": product.stock_status if hasattr(product, 'stock_status') else "OUT_OF_STOCK",
        "atp_quantity": product.quantity_on_hand if hasattr(product, 'quantity_on_hand') else 0,
        "low_stock_count": product.low_stock_count if hasattr(product, 'low_stock_count') else 0,
        "short_description": product.short_description if hasattr(product, 'short_description') else "",
        "key_features": product.key_features if hasattr(product, 'key_features') else [],
        "created_at": product.created_at.isoformat() if hasattr(product, 'created_at') and product.created_at else None,
        "updated_at": product.updated_at.isoformat() if hasattr(product, 'updated_at') and product.updated_at else None,
        # "zones": zones
    }


def get_product_detail_with_delivery(
    sku: str,
    pincode: Optional[str] = None,
    country: Optional[str] = None,
    customer_group_selling_channel_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get detailed product information including delivery eligibility.
    
    Args:
        sku: Product SKU to fetch
        pincode: Delivery pincode (optional)
        country: Delivery country (optional)
        customer_group_selling_channel_id: Customer group selling channel ID (optional)
        
    Returns:
        Dict containing detailed product data with delivery eligibility
    """
    try:
        # Fetch product with all related data
        product = Product.objects.select_related(
            'category',
            'subcategory', 
            'division',
            'uom',
            'productstatus',
        ).prefetch_related(
            'images',
            'attribute_values__attribute',
            'variants',
            'zone_restrictions'
        ).get(sku=sku, is_active=True)
        
        # Serialize basic product data
        product_data = serialize_product_detail(product)
        
        # Add delivery eligibility if location parameters are provided
        if pincode and country and customer_group_selling_channel_id:
            delivery_status = check_delivery_eligibility(
                product.id, pincode, country, customer_group_selling_channel_id
            )
            product_data["delivery_eligible"] = delivery_status["eligible"]
            product_data["delivery_error"] = delivery_status["message"] if not delivery_status["eligible"] else None
        
        return product_data
        
    except Product.DoesNotExist:
        logger.error(f"Product with SKU {sku} not found")
        return None
    except Exception as e:
        logger.error(f"Error fetching product detail for SKU {sku}: {str(e)}")
        return None


def serialize_product_detail(product: Product) -> Dict[str, Any]:
    """
    Serialize a product for detailed view with all fields.
    
    Args:
        product: The Product instance to serialize
        
    Returns:
        Dict containing detailed product data
    """
    # Only include related ids, not details, as per user request
    category_id = product.category.id if product.category else None
    subcategory_id = product.subcategory.id if product.subcategory else None
    division_id = product.division.id if product.division else None
    
    uom_details = None
    if product.uom:
        uom_details = {
            "name": product.uom.name,
            "symbol": product.uom.symbol,
            "description": product.uom.description or ""
        }
    
    # Removed productstatus_details as per user request
    
    # Serialize images with fallback logic
    images = []
    for image in product.images.all():
        images.append({
            "id": image.id,
            "image": image.image.url if image.image else None,
            "alt_text": image.alt_text or "",
            "sort_order": image.sort_order,
            "is_default": image.is_default
        })
    
    # If no product images, use fallback hierarchy: subcategory -> category -> division
    if not images:
        fallback_image = None
        fallback_alt_text = ""
        
        # Try subcategory image first
        if product.subcategory and product.subcategory.image:
            fallback_image = product.subcategory.image.url
            fallback_alt_text = product.subcategory.image_alt_text or ""
        # Then try category image
        elif product.category and product.category.image:
            fallback_image = product.category.image.url
            fallback_alt_text = product.category.image_alt_text or ""
        # Finally try division image
        elif product.division and product.division.image:
            fallback_image = product.division.image.url
            fallback_alt_text = product.division.image_alt_text or ""
        
        # Add fallback image if found
        if fallback_image:
            images.append({
                "id": None,  # No specific image ID for fallback
                "image": fallback_image,
                "alt_text": fallback_alt_text,
                "sort_order": 0,
                "is_default": True
            })
    
    # Serialize attribute values
    attribute_values = []
    for attr_value in product.attribute_values.all():
        attribute_values.append({
            "id": attr_value.id,
            "attribute_name": attr_value.attribute.name,
            "attribute_code": attr_value.attribute.code,
            "value_text": attr_value.value_text,
            "value_number": str(attr_value.value_number) if attr_value.value_number is not None else None,
            "value_boolean": attr_value.value_boolean,
            "value_date": attr_value.value_date.isoformat() if attr_value.value_date else None,
            "value_option": attr_value.value_option.option_label if attr_value.value_option else None
        })
    
    # Serialize zone restrictions
    zone_restrictions = []
    for restriction in product.zone_restrictions.all():
        zone_restrictions.append({
            "id": restriction.id,
            "product": restriction.product_id,
            "zone": restriction.zone_id,
            "restriction_mode": restriction.restriction_mode
        })
    
    return {
        "id": product.id,
        "product_type": product.product_type,
        "name": product.name,
        "slug": product.slug,
        "sku": product.sku,
        "description": product.description or "",
        "short_description": product.short_description or "",
        "category": category_id,
        "subcategory": subcategory_id,
        "division": division_id,
        "uom": product.uom_id,
        "uom_details": uom_details,
        "currency_code": getattr(product.currency_code, 'code', None) if product.currency_code else None,
        "default_tax_rate_profile": product.default_tax_rate_profile_id,
        "is_tax_exempt": product.is_tax_exempt,
        "display_price": str(product.display_price),
        "compare_at_price": str(product.compare_at_price) if product.compare_at_price else None,
        "is_active": product.is_active,
        "allow_reviews": product.allow_reviews,
        "inventory_tracking_enabled": product.inventory_tracking_enabled,
        "backorders_allowed": product.backorders_allowed,
        "quantity_on_hand": product.quantity_on_hand,
        "pre_order_available": product.pre_order_available,
        "pre_order_date": product.pre_order_date.isoformat() if product.pre_order_date else None,
        "publication_status": product.publication_status,
        "seo_title": product.seo_title or "",
        "seo_description": product.seo_description or "",
        "seo_keywords": product.seo_keywords or "",
        "tags": product.tags or [],
        "faqs": product.faqs or [],
        "key_features": product.key_features or [],
        "images": images,
        "attribute_values": attribute_values,
        "workflow_flow_id": product.workflow_flow_id,
        "zone_restrictions": zone_restrictions,
        "price": str(product.display_price),
        "atp_quantity": product.quantity_on_hand,  # TODO: Get from inventory service
        "stock_status": "IN_STOCK" if product.quantity_on_hand > 0 else "OUT_OF_STOCK"
    }


def check_delivery_eligibility(
    product_id: int,
    pincode: str,
    country: str,
    customer_group_selling_channel_id: str
) -> Dict[str, Any]:
    """
    Check if a product is deliverable to the given pincode/country.
    
    Args:
        product_id: The product ID
        pincode: The delivery pincode
        country: The delivery country
        customer_group_selling_channel_id: The customer group selling channel ID
        
    Returns:
        Dictionary with 'eligible' boolean and 'message' string
    """
    try:
        # Convert country name to country code if needed
        country_code = get_country_code(country)
        
        # Check if product has zone restrictions
        products_with_zones = ProductZoneRestriction.objects.filter(product_id=product_id).exists()
        
        if products_with_zones:
            # Case 1: Product has zone restrictions - check pincode zone assignment
            try:
                pincode_assignment = PincodeZoneAssignment.objects.get(
                    pincode__pincode=pincode,
                    pincode__country_code=country_code
                )
                user_zone_id = pincode_assignment.zone_id
                
                # Check product zone restrictions
                product_zones = ProductZoneRestriction.objects.filter(product_id=product_id)
                include_restrictions = product_zones.filter(restriction_mode='INCLUDE')
                exclude_restrictions = product_zones.filter(restriction_mode='EXCLUDE')
                
                if include_restrictions.exists():
                    # If INCLUDE restrictions exist, zone must be in the included list
                    if include_restrictions.filter(zone_id=user_zone_id).exists():
                        return {"eligible": True, "message": ""}
                    else:
                        return {"eligible": False, "message": "Product not available for delivery to this location"}
                elif exclude_restrictions.exists():
                    # If EXCLUDE restrictions exist, zone must NOT be in the excluded list
                    if not exclude_restrictions.filter(zone_id=user_zone_id).exists():
                        return {"eligible": True, "message": ""}
                    else:
                        return {"eligible": False, "message": "Product not available for delivery to this location"}
                else:
                    return {"eligible": False, "message": "Product has no delivery zones configured"}
                    
            except PincodeZoneAssignment.DoesNotExist:
                return {"eligible": False, "message": f"Delivery not available to pincode {pincode}"}
        else:
            # Case 2: Product has no zone restrictions - check default_delivery_zone
            try:
                feature_settings = FeatureToggleSettings.objects.get(
                    customer_group_selling_channel_id=customer_group_selling_channel_id
                )
                default_zone = feature_settings.default_delivery_zone
                
                if default_zone == "All over world":
                    return {"eligible": True, "message": ""}
                elif default_zone == country:
                    return {"eligible": True, "message": ""}
                else:
                    return {"eligible": False, "message": f"Product only available for delivery to {default_zone}"}
                    
            except FeatureToggleSettings.DoesNotExist:
                return {"eligible": False, "message": "Delivery settings not configured for this channel"}
                
    except Exception as e:
        # On error, assume product is eligible but log the error
        logger.error(f"Error checking delivery eligibility for product {product_id}: {str(e)}")
        return {"eligible": True, "message": ""}