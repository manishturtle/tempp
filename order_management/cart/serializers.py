"""
Cart Serializers for Order Management API.

This module contains serializers for cart-related functionality including
cart items, cart operations, and validation.
"""


from decimal import Decimal

from django.db import models
from rest_framework import serializers

from order_management.models import (
    Cart,
    CartItem,
)
from products.models import Product
from order_management.api.serializers import BaseTenantModelSerializer


def evaluate_matching_tax_rule(product, quantity, context):
    """
    Evaluate the first matching tax rule for a product and return (matching_rule, taxes_for_item).
    Returns:
        matching_rule: The matched rule object (or None)
        taxes_for_item: List of dicts [{tax_id, tax_code, tax_rate, tax_amount}]
    """
    rules = list(product.default_tax_rate_profile.rules.filter(is_active=True).order_by('priority')) if product.default_tax_rate_profile else []
    tenant_country = context.get("tenant_country")
    tenant_state = context.get("tenant_state")
    country = context.get("country")
    state = context.get("state")
    # Market - using iso_code or name matching
    def _country_matches(val1, val2):
        from shared.models import Country
        if not val1 or not val2:
            return False
        val1 = val1.strip().lower()
        val2 = val2.strip().lower()
        try:
            c1 = Country.objects.filter(models.Q(iso_code__iexact=val1) | models.Q(name__iexact=val1)).first()
            c2 = Country.objects.filter(models.Q(iso_code__iexact=val2) | models.Q(name__iexact=val2)).first()
            if c1 and c2 and c1.id == c2.id:
                return True
        except Exception:
            pass
        return val1 == val2  # fallback to direct string match
    
    if tenant_country and country and _country_matches(tenant_country, country):
        market = "Domestic"
    else:
        market = "International"
    # Supply Jurisdiction
    if tenant_state and state and tenant_state.lower() == state.lower():
        supply_jurisdiction = "Within same state"
    else:
        supply_jurisdiction = "To a different state"
    selling_price = float(product.display_price if hasattr(product, 'display_price') else product.price)
    matching_rule = None
    for rule in rules:
        rule_matches = True
        for condition in rule.conditions.all():
            normalized_name = condition.attribute_name.strip().lower().replace(' ', '_')
            if normalized_name == 'market':
                actual_value = market
            elif normalized_name in ('supply_jurisdiction', 'place_of_supply_context'):
                actual_value = supply_jurisdiction
            elif normalized_name in ('selling_price', 'transactional_price'):
                actual_value = selling_price
            else:
                actual_value = None
            op = condition.operator
            expected = condition.condition_value
            if actual_value is None:
                rule_matches = False
                break
            if op == '=' and not (str(actual_value) == str(expected)):
                rule_matches = False
                break
            elif op == '!=' and not (str(actual_value) != str(expected)):
                rule_matches = False
                break
            elif op in ('<', '<=', '>', '>='):
                try:
                    actual_num = float(actual_value)
                    expected_num = float(expected)
                    if op == '<' and not (actual_num < expected_num):
                        rule_matches = False
                        break
                    elif op == '<=' and not (actual_num <= expected_num):
                        rule_matches = False
                        break
                    elif op == '>' and not (actual_num > expected_num):
                        rule_matches = False
                        break
                    elif op == '>=' and not (actual_num >= expected_num):
                        rule_matches = False
                        break
                except Exception:
                    rule_matches = False
                    break
        if rule_matches:
            matching_rule = rule
            break
    taxes_for_item = []
    if matching_rule:
        for outcome in matching_rule.outcomes.all():
            tax_rate_obj = outcome.tax_rate
            try:
                rate_percentage = float(tax_rate_obj.rate_percentage)
                tax_amount = selling_price * quantity * rate_percentage / 100
                taxes_for_item.append({
                    "tax_id": tax_rate_obj.id,
                    "tax_code": tax_rate_obj.tax_type_code,
                    "tax_rate": str(tax_rate_obj.rate_percentage),
                    "tax_amount": f"{tax_amount:.2f}",
                })
            except Exception:
                continue
    return matching_rule, taxes_for_item




class CartItemInputSerializer(serializers.Serializer):
    """
    Serializer for creating new cart items.

    Used when adding a new item to a cart, with validation to ensure:
    - Product SKU format is valid (alphanumeric with - and _ allowed)
    - Quantity is a valid positive integer

    This serializer validates input data before it's processed by the CartViewSet
    and handles proper error messaging for invalid inputs.
    """

    product_sku = serializers.CharField(
        max_length=100,
        min_length=3,
        help_text="Product SKU/identifier of the item to add to cart",
        error_messages={
            "required": "Product SKU is required",
            "blank": "Product SKU cannot be blank",
            "min_length": "Product SKU must be at least 3 characters",
            "max_length": "Product SKU cannot exceed 100 characters",
        },
    )
    quantity = serializers.IntegerField(
        min_value=1,
        max_value=999,
        help_text="Quantity of the product to add (minimum 1, maximum 999)",
        error_messages={
            "required": "Quantity is required",
            "min_value": "Quantity must be at least 1",
            "max_value": "Quantity cannot exceed 999",
            "invalid": "Quantity must be a valid integer",
        },
    )

    def validate_product_sku(self, value):
        """
        Validate product SKU format.

        Args:
            value: The product SKU to validate

        Returns:
            Validated product SKU

        Raises:
            ValidationError: If product SKU format is invalid
        """
        # Basic validation to ensure SKU doesn't contain special characters except - and _
        import re

        if re.search(r"[^a-zA-Z0-9\-_]", value):
            raise serializers.ValidationError("Product SKU contains invalid characters")

        return value


class CartItemUpdateSerializer(serializers.Serializer):
    """
    Serializer for updating existing cart item quantities.

    Used specifically for the update_item action in CartViewSet to validate
    quantity changes for items already in the cart. Setting quantity to 0
    is allowed and will trigger item removal from cart.
    """

    quantity = serializers.IntegerField(
        min_value=0,
        max_value=999,
        help_text="New quantity for the cart item (0 to remove item from cart)",
        error_messages={
            "required": "Quantity is required",
            "min_value": "Quantity must be at least 0",
            "max_value": "Quantity cannot exceed 999",
            "invalid": "Quantity must be a valid integer",
        },
    )


class CartItemSerializer(BaseTenantModelSerializer):
    """
    Serializer for CartItem model representation in API responses.

    This serializer enriches cart item data with product details from the product service,
    providing a complete representation of items in the cart including current pricing,
    availability, and product information.

    The product_details field is dynamically populated using the get_product_details method,
    which fetches data from the product service for each cart item.
    """

    product_details = serializers.SerializerMethodField(read_only=True)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Insert taxes at the root if available
        taxes = getattr(self, '_taxes_for_item', None)
        if taxes is not None:
            data["taxes"] = taxes
        return data

    class Meta:
        model = CartItem
        fields = [
            "id",
            "product_sku",
            "quantity",
            "product_details",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_product_details(self, obj):
        """
        Get product details from direct Product model.

        Args:
            obj: The CartItem instance

        Returns:
            Dictionary with product details or None if not found
        """
        try:
            # Get product with related data
            product = Product.objects.select_related(
                'category',
                'subcategory', 
                'division',
                'uom',
                'default_tax_rate_profile',
            ).prefetch_related(
                'images',
                'attribute_values__attribute',
                'default_tax_rate_profile__rules__conditions',
                'default_tax_rate_profile__rules__outcomes__tax_rate',
            ).get(sku=obj.product_sku, is_active=True)
        except Product.DoesNotExist:
            return None

        # Serialize images with fallback logic (same as products module)
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
        
        # Get UOM details
        uom_details = {
            "name": product.uom.name if product.uom else "N/A"
        }

        # Check delivery eligibility FIRST (includes visibility check)
        delivery_status = None
        pincode = self.context.get('pincode')
        country = self.context.get('country')
        customer_group_selling_channel_id = self.context.get('customer_group_selling_channel_id')
        
        if pincode and country and customer_group_selling_channel_id:
            delivery_status = self._check_delivery_eligibility(
                product.id, pincode, country, customer_group_selling_channel_id
            )
            
            # If product is not eligible (including not visible), skip all tax calculations
            if delivery_status and not delivery_status.get('eligible', True):
                print(f"[PRODUCT_DETAILS] Skipping tax calculations for product {obj.product_sku} - not eligible: {delivery_status.get('message', 'Unknown reason')}")
                
                # Return basic product details without tax information
                product_details = {
                    "id": product.id,
                    "name": product.name,
                    "price": str(product.display_price) if hasattr(product, 'display_price') else str(product.price),
                    "images": images,
                    "unit_name": uom_details.get("name", "N/A"),
                    "min_count": product.min_count,
                    "max_count": product.max_count,
                    "delivery_eligible": delivery_status["eligible"],
                    "delivery_error": delivery_status["message"]
                }
                
                # Add quantity error if out of allowed range
                quantity_error = None
                quantity = getattr(obj, 'quantity', 1)
                if product.min_count is not None and quantity < product.min_count:
                    quantity_error = f"Minimum allowed quantity is {product.min_count}"
                elif product.max_count is not None and product.max_count > 0 and quantity > product.max_count:
                    quantity_error = f"Maximum allowed quantity is {product.max_count}"
                if quantity_error:
                    product_details["quantity_error"] = quantity_error
                    
                return product_details

        # --- MARKET & SUPPLY JURISDICTION LOGIC ---
        # Only proceed with tax calculations if product is visible and eligible
        tenant_country = self.context.get('tenant_country')
        tenant_state = self.context.get('tenant_state')
        country = self.context.get('country')
        state = self.context.get('state')

        # Determine Market
        def _country_matches(val1, val2):
            from shared.models import Country
            if not val1 or not val2:
                return False
            val1 = val1.strip().lower()
            val2 = val2.strip().lower()
            try:
                c1 = Country.objects.filter(models.Q(iso_code__iexact=val1) | models.Q(name__iexact=val1)).first()
                c2 = Country.objects.filter(models.Q(iso_code__iexact=val2) | models.Q(name__iexact=val2)).first()
                if c1 and c2 and c1.id == c2.id:
                    return True
            except Exception:
                pass
            return val1 == val2  # fallback to direct string match

        if tenant_country and country and _country_matches(tenant_country, country):
            market = "Domestic"
        else:
            market = "International"

        # Determine Supply Jurisdiction
        if tenant_state and state and tenant_state.lower() == state.lower():
            supply_jurisdiction = "Within same state"
        else:
            supply_jurisdiction = "To a different state"

        # Print these values for debugging
        print(f"\n=== MARKET & SUPPLY JURISDICTION ===")
        print(f"Market: {market}")
        print(f"Supply Jurisdiction: {supply_jurisdiction}")
        print(f"Tenant Country: {tenant_country}, Country: {country}")
        print(f"Tenant State: {tenant_state}, State: {state}")
        print(f"=== END MARKET & SUPPLY JURISDICTION ===\n")

        # Get tax rate profile information for logging (not included in response)
        if product.default_tax_rate_profile:
            profile = product.default_tax_rate_profile
            
            # Serialize rules with conditions and outcomes for logging
            rules = []
            for rule in profile.rules.filter(is_active=True).order_by('priority'):
                rule_data = {
                    "id": rule.id,
                    "priority": rule.priority,
                    "is_active": rule.is_active,
                    "effective_from": rule.effective_from.isoformat() if rule.effective_from else None,
                    "effective_to": rule.effective_to.isoformat() if rule.effective_to else None,
                    "conditions": [
                        {
                            "id": condition.id,
                            "attribute_name": condition.attribute_name,
                            "operator": condition.operator,
                            "condition_value": condition.condition_value,
                        }
                        for condition in rule.conditions.all()
                    ],
                    "outcomes": [
                        {
                            "id": outcome.id,
                            "tax_rate": {
                                "id": outcome.tax_rate.id,
                                "rate_name": outcome.tax_rate.rate_name,
                                "tax_type_code": outcome.tax_rate.tax_type_code,
                                "rate_percentage": str(outcome.tax_rate.rate_percentage),
                                "effective_from": outcome.tax_rate.effective_from.isoformat() if outcome.tax_rate.effective_from else None,
                                "effective_to": outcome.tax_rate.effective_to.isoformat() if outcome.tax_rate.effective_to else None,
                                "country_code": outcome.tax_rate.country_code,
                                "is_active": outcome.tax_rate.is_active,
                            }
                        }
                        for outcome in rule.outcomes.all()
                    ],
                }
                rules.append(rule_data)
            
            tax_rate_profile_data = {
                "id": profile.id,
                "profile_name": profile.profile_name,
                "description": profile.description,
                "country_code": profile.country_code,
                "is_active": profile.is_active,
                "rules": rules,
            }
            
            # Evaluate which rules match current conditions
            selling_price = float(product.display_price if hasattr(product, 'display_price') else product.price)
            
            print(f"\n=== RULE EVALUATION FOR PRODUCT {obj.product_sku} ===")
            print(f"Current Values - Market: {market}, Supply Jurisdiction: {supply_jurisdiction}, Selling Price: {selling_price}")
            
            matching_rule = None
            checked_rules = 0
            for rule_data in rules:
                rule_matches = True
                condition_results = []
                
                for condition in rule_data['conditions']:
                    attribute_name = condition['attribute_name']
                    operator = condition['operator']
                    condition_value = condition['condition_value']
                    
                    # Normalize attribute name for flexible matching
                    normalized_name = attribute_name.strip().lower().replace(' ', '_')
                    if normalized_name == 'market':
                        actual_value = market
                    elif normalized_name in ('supply_jurisdiction', 'place_of_supply_context'):
                        actual_value = supply_jurisdiction
                    elif normalized_name in ('selling_price', 'transactional_price'):
                        actual_value = selling_price
                    else:
                        actual_value = None
                        condition_results.append(f"  ❌ {attribute_name} {operator} {condition_value} (Unknown attribute)")
                        rule_matches = False
                        continue
                    
                    # Evaluate the condition
                    condition_satisfied = False
                    try:
                        if operator == '=':
                            if isinstance(actual_value, str):
                                condition_satisfied = actual_value.lower() == condition_value.lower()
                            else:
                                condition_satisfied = float(actual_value) == float(condition_value)
                        elif operator == '!=':
                            if isinstance(actual_value, str):
                                condition_satisfied = actual_value.lower() != condition_value.lower()
                            else:
                                condition_satisfied = float(actual_value) != float(condition_value)
                        elif operator == '<':
                            condition_satisfied = float(actual_value) < float(condition_value)
                        elif operator == '<=':
                            condition_satisfied = float(actual_value) <= float(condition_value)
                        elif operator == '>':
                            condition_satisfied = float(actual_value) > float(condition_value)
                        elif operator == '>=':
                            condition_satisfied = float(actual_value) >= float(condition_value)
                        else:
                            condition_satisfied = False
                    except (ValueError, TypeError):
                        condition_satisfied = False
                    
                    # Record condition result
                    status_icon = "✅" if condition_satisfied else "❌"
                    condition_results.append(f"  {status_icon} {attribute_name} {operator} {condition_value} (Actual: {actual_value})")
                    
                    if not condition_satisfied:
                        rule_matches = False
                
                # Print rule evaluation result
                rule_status = "✅ MATCHES" if rule_matches else "❌ NO MATCH"
                print(f"\nRule {rule_data['priority']} (ID: {rule_data['id']}) - {rule_status}:")
                for condition_result in condition_results:
                    print(condition_result)
                checked_rules += 1
                if rule_matches:
                    matching_rule = rule_data
                    print(f"  🎯 Tax Rates Applied: {', '.join([outcome['tax_rate']['rate_name'] for outcome in rule_data['outcomes']])}")
                    # Calculate and log tax for 1 quantity and for total quantity
                    # Use the first outcome's tax_rate for this calculation
                    if rule_data['outcomes']:
                        tax_rate_obj = rule_data['outcomes'][0]['tax_rate']
                        try:
                            rate_percentage = float(tax_rate_obj.get('rate_percentage', '0'))
                            price = float(product.display_price if hasattr(product, 'display_price') else product.price)
                            quantity = getattr(obj, 'quantity', 1)
                            tax_for_1 = price * rate_percentage / 100
                            tax_for_qty = price * quantity * rate_percentage / 100
                            print(f"  🧮 Tax Calculation:")
                            print(f"    • For 1 quantity: {price} x {rate_percentage}% = {tax_for_1:.2f}")
                            print(f"    • For {quantity} quantity: {price} x {quantity} x {rate_percentage}% = {tax_for_qty:.2f}")
                        except Exception as e:
                            print(f"    ⚠️ Tax calculation error: {e}")
                    break  # Stop after first match
            
            print(f"\n📊 Summary: {1 if matching_rule else 0} out of {checked_rules} rules match the current conditions")
            if matching_rule:
                print(f"🏆 Highest Priority Matching Rule: Rule {matching_rule['priority']} (ID: {matching_rule['id']})")
            print("=== END RULE EVALUATION ===\n")
            
            # Print tax rate profile data to terminal for debugging in JSON format
            import json
            print(f"=== TAX RATE PROFILE FOR PRODUCT {obj.product_sku} ===")
            print(json.dumps(tax_rate_profile_data, indent=2))
            print("=== END TAX RATE PROFILE ===")

        # --- Tax Calculation for API Output (Unified) ---
        quantity = getattr(obj, 'quantity', 1)
        context = {
            "tenant_country": self.context.get("tenant_country"),
            "tenant_state": self.context.get("tenant_state"),
            "country": self.context.get("country"),
            "state": self.context.get("state"),
        }
        matching_rule, taxes_for_item = evaluate_matching_tax_rule(product, quantity, context)
        unit_tax = None
        if taxes_for_item:
            unit_tax_sum = sum(float(tax["tax_amount"]) / quantity for tax in taxes_for_item)
            unit_tax = f"{unit_tax_sum:.2f}"
        
        product_details = {
            "id": product.id,
            "name": product.name,
            "price": str(product.display_price) if hasattr(product, 'display_price') else str(product.price),
            "images": images,  # Full images array with fallback logic
            "unit_name": uom_details.get("name", "N/A"),
            "min_count": product.min_count,
            "max_count": product.max_count
        }
        if unit_tax is not None:
            product_details["unit_tax"] = unit_tax

        # Save taxes_for_item on the serializer instance for to_representation
        self._taxes_for_item = taxes_for_item

        
        # Add delivery status if checked
        if delivery_status is not None:
            product_details["delivery_eligible"] = delivery_status["eligible"]
            if not delivery_status["eligible"]:
                product_details["delivery_error"] = delivery_status["message"]
        
        # Add quantity error if out of allowed range
        quantity_error = None
        quantity = getattr(obj, 'quantity', 1)
        if product.min_count is not None and quantity < product.min_count:
            quantity_error = f"Minimum allowed quantity is {product.min_count}"
        elif product.max_count is not None and product.max_count > 0 and quantity > product.max_count:
            quantity_error = f"Maximum allowed quantity is {product.max_count}"
        if quantity_error:
            product_details["quantity_error"] = quantity_error
        return product_details
    
    # Class-level cache for product visibility results
    _visibility_cache = {}
    
    def _check_delivery_eligibility(self, product_id, pincode, country, customer_group_selling_channel_id):
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
            from products.models import ProductZoneRestriction, ProductVisibility
            from shipping_zones.models import PincodeZoneAssignment
            from order_management.models import FeatureToggleSettings
            from order_management.products.selector import get_country_code
            
            # First check product visibility for the customer group selling channel
            if customer_group_selling_channel_id:
                # Create a cache key for this product-channel combination
                cache_key = f"{product_id}_{customer_group_selling_channel_id}"
                
                # Check if we already have a cached result
                if cache_key in CartItemSerializer._visibility_cache:
                    visibility_result = CartItemSerializer._visibility_cache[cache_key]
                    print(f"[CACHED] Product ID {product_id} visibility for customer_group_selling_channel_id {customer_group_selling_channel_id}: {visibility_result}")
                    if not visibility_result:
                        return {"eligible": False, "message": "This product is not available for delivery"}
                else:
                    # Not in cache, need to query the database
                    try:
                        visibility_record = ProductVisibility.objects.get(
                            product_id=product_id,
                            customer_group_selling_channel_id=customer_group_selling_channel_id
                        )
                        # Cache the result
                        CartItemSerializer._visibility_cache[cache_key] = visibility_record.is_visible
                        
                        print(f"[DB QUERY] Product ID {product_id} visibility for customer_group_selling_channel_id {customer_group_selling_channel_id}: {visibility_record.is_visible}")
                        if not visibility_record.is_visible:
                            print(f"Product ID {product_id} is NOT VISIBLE to customer group selling channel {customer_group_selling_channel_id}")
                            return {"eligible": False, "message": "This product is not available for delivery"}
                        else:
                            print(f"Product ID {product_id} is VISIBLE to customer group selling channel {customer_group_selling_channel_id}")
                    except ProductVisibility.DoesNotExist:
                        # If no visibility record exists, assume product is not visible
                        # Cache the negative result
                        CartItemSerializer._visibility_cache[cache_key] = False
                        
                        print(f"No visibility record found for Product ID {product_id} and customer_group_selling_channel_id {customer_group_selling_channel_id}")
                        return {"eligible": False, "message": "This product is not available for delivery"}
            else:
                # If no customer_group_selling_channel_id provided, assume not eligible
                print(f"No customer_group_selling_channel_id provided for Product ID {product_id}")
                return {"eligible": False, "message": "This product is not available for delivery"}
            
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
                    # First try to get settings for specific customer_group_selling_channel_id
                    feature_settings = FeatureToggleSettings.objects.get(
                        customer_group_selling_channel_id=customer_group_selling_channel_id
                    )
                except FeatureToggleSettings.DoesNotExist:
                    # Fallback to default settings (is_default=True)
                    try:
                        feature_settings = FeatureToggleSettings.objects.get(is_default=True)
                    except FeatureToggleSettings.DoesNotExist:
                        return {"eligible": False, "message": "Delivery settings not configured for this channel"}
                
                default_zone = feature_settings.default_delivery_zone
                
                if default_zone == "All over world":
                    return {"eligible": True, "message": ""}
                elif default_zone == country:
                    return {"eligible": True, "message": ""}
                else:
                    return {"eligible": False, "message": f"Product only available for delivery to {default_zone}"}
                    
        except Exception as e:
            # On error, assume product is eligible
            return {"eligible": True, "message": ""}


class CartSerializer(BaseTenantModelSerializer):
    """
    Serializer for Cart model representation in API responses.

    This serializer provides a complete representation of a shopping cart,
    including all items with their product details, calculated totals,
    and cart status information. It's used primarily by the CartViewSet
    to present cart data to clients.

    Features:
    - Includes nested CartItem serializers for all items in the cart
    - Calculates and includes total quantity across all items
    - Calculates and includes subtotal amount based on current product prices
    - Handles both authenticated user carts and guest carts
    """

    items = CartItemSerializer(
        many=True,
        read_only=True,
        help_text="List of items in the cart with product details",
    )
    total_quantity = serializers.SerializerMethodField(
        read_only=True, help_text="Total quantity of all items in the cart"
    )
    subtotal_amount = serializers.SerializerMethodField(
        read_only=True,
        help_text="Calculated subtotal amount based on current product prices",
    )
    total_tax = serializers.SerializerMethodField(read_only=True, help_text="Total tax for all items in cart")
    total_amount = serializers.SerializerMethodField(read_only=True, help_text="Total amount (subtotal + tax)")

    class Meta:
        model = Cart
        fields = [
            "id",
            "status",
            "items",
            "total_quantity",
            "subtotal_amount",
            "total_tax",
            "total_amount",

            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "status", "created_at", "updated_at"]

    def get_total_quantity(self, obj: Cart) -> int:
        """
        Get total quantity of items in cart.

        Uses the Cart model's get_total_quantity method.

        Args:
            obj: The Cart instance

        Returns:
            Total quantity of items in cart
        """
        return obj.get_total_quantity()

    def get_subtotal_amount(self, obj: Cart) -> str:
        """
        Get subtotal amount of deliverable items in cart (sum of price * quantity, no tax).
        """
        subtotal = 0.0
        context = self.context
        for item in obj.items.all():
            try:
                # First get the product
                product = Product.objects.get(sku=item.product_sku, is_active=True)
                
                # Check if the product is visible to this customer group selling channel
                # If not visible, skip price calculation entirely
                customer_group_selling_channel_id = context.get('customer_group_selling_channel_id')
                if customer_group_selling_channel_id:
                    # Use the cache key format from CartItemSerializer
                    cache_key = f"{product.id}_{customer_group_selling_channel_id}"
                    
                    # Check if we have a cached visibility result
                    if cache_key in CartItemSerializer._visibility_cache:
                        is_visible = CartItemSerializer._visibility_cache[cache_key]
                        if not is_visible:
                            print(f"[SUBTOTAL] Skipping price calculation for product {item.product_sku} - not visible to customer group selling channel {customer_group_selling_channel_id}")
                            continue
                
                # Check delivery eligibility using CartItemSerializer logic
                delivery_status = CartItemSerializer(context=context)._check_delivery_eligibility(
                    product.id,
                    context.get('pincode'),
                    context.get('country'),
                    customer_group_selling_channel_id,
                )
                if not delivery_status.get('eligible', True):
                    print(f"[SUBTOTAL] Skipping price calculation for product {item.product_sku} - not eligible for delivery")
                    continue
                
                print(f"[SUBTOTAL] Calculating price for product {item.product_sku} - visible and eligible for delivery")
                price = float(product.display_price if hasattr(product, 'display_price') else product.price)
                quantity = item.quantity
                subtotal += price * quantity
            except Exception as e:
                print(f"[SUBTOTAL] Error calculating price for product {item.product_sku}: {str(e)}")
                continue
        return f"{subtotal:.2f}"

    def get_total_tax(self, obj: Cart) -> str:
        """
        Get total tax for deliverable items in cart (using unified tax rule logic).
        """
        total_tax = 0.0
        context = self.context
        tax_context = {
            "tenant_country": context.get("tenant_country"),
            "tenant_state": context.get("tenant_state"),
            "country": context.get("country"),
            "state": context.get("state"),
        }
        for item in obj.items.all():
            try:
                # First get the product
                product = Product.objects.select_related('default_tax_rate_profile').prefetch_related('default_tax_rate_profile__rules__conditions', 'default_tax_rate_profile__rules__outcomes__tax_rate').get(sku=item.product_sku, is_active=True)
                
                # Check if the product is visible to this customer group selling channel
                # If not visible, skip tax calculation entirely
                customer_group_selling_channel_id = context.get('customer_group_selling_channel_id')
                if customer_group_selling_channel_id:
                    # Use the cache key format from CartItemSerializer
                    cache_key = f"{product.id}_{customer_group_selling_channel_id}"
                    
                    # Check if we have a cached visibility result
                    if cache_key in CartItemSerializer._visibility_cache:
                        is_visible = CartItemSerializer._visibility_cache[cache_key]
                        if not is_visible:
                            print(f"[TAX] Skipping tax calculation for product {item.product_sku} - not visible to customer group selling channel {customer_group_selling_channel_id}")
                            continue
                delivery_status = CartItemSerializer(context=context)._check_delivery_eligibility(
                    product.id,
                    context.get('pincode'),
                    context.get('country'),
                    customer_group_selling_channel_id,
                )
                if not delivery_status.get('eligible', True):
                    print(f"[TAX] Skipping tax calculation for product {item.product_sku} - not eligible for delivery")
                    continue
                
                print(f"[TAX] Calculating tax for product {item.product_sku} - visible and eligible for delivery")
                _, taxes_for_item = evaluate_matching_tax_rule(product, item.quantity, tax_context)
                for tax in taxes_for_item:
                    total_tax += float(tax["tax_amount"])
            except Exception as e:
                print(f"[TAX] Error calculating tax for product {item.product_sku}: {str(e)}")
                continue
        return f"{total_tax:.2f}"

    def get_total_amount(self, obj: Cart) -> str:
        """
        Get total amount (subtotal + total tax).
        """
        subtotal = float(self.get_subtotal_amount(obj))
        total_tax = float(self.get_total_tax(obj))
        return f"{subtotal + total_tax:.2f}"


