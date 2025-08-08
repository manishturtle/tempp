"""
Product Service Integration.

This module provides implementations for the Product Service API.
These functions make HTTP requests to the Product Service API
to retrieve and manipulate product data.
"""
from typing import Dict, Any, Optional, List, Union
from decimal import Decimal
import logging
import requests
from urllib.parse import urljoin
import json
from django.conf import settings
from django.core.cache import cache
from requests.exceptions import RequestException, Timeout, ConnectionError

logger = logging.getLogger(__name__)

# Default timeout for API requests (in seconds)
DEFAULT_TIMEOUT = getattr(settings, 'PRODUCT_API_TIMEOUT', 5)

# Base URL for the Product API
PRODUCT_API_BASE_URL = getattr(settings, 'PRODUCT_API_BASE_URL', 'http://localhost:8045/api/')

# Cache settings
CACHE_TTL = getattr(settings, 'PRODUCT_API_CACHE_TTL', 1800)  # 30 minutes default
CACHE_TTL_BULK = getattr(settings, 'PRODUCT_API_CACHE_TTL_BULK', 3600)  # 1 hour default for bulk data
CACHE_TTL_ERROR = getattr(settings, 'PRODUCT_API_CACHE_TTL_ERROR', 60)  # 1 minute cache for errors

def get_api_headers() -> Dict[str, str]:
    """
    Get the headers required for Product API requests.
    
    Returns:
        Dictionary of HTTP headers
    """
    # Internal API auth token (if required)
    internal_token = getattr(settings, 'PRODUCT_API_AUTH_TOKEN', None)
    
    headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }
    
    if internal_token:
        headers['Authorization'] = f'Bearer {internal_token}'
        
    return headers

def handle_api_error(response, operation: str, resource_id: str = None) -> None:
    """
    Handle non-2xx API responses with appropriate logging.
    
    Args:
        response: The requests.Response object
        operation: Description of the operation being performed
        resource_id: Optional identifier of the resource being accessed
    """
    resource_str = f" (ID: {resource_id})" if resource_id else ""
    
    try:
        error_data = response.json()
        error_message = error_data.get('detail', str(error_data))
    except ValueError:
        error_message = response.text or f"HTTP {response.status_code}"
    
    logger.error(
        f"Product API error during {operation}{resource_str}: "

        f"Status: {response.status_code}, Message: {error_message}"
    )


def get_product_details(sku: str, tenant_slug: str) -> Optional[Dict[str, Any]]:
    """
    Get product details from the Product Service.
    
    Args:
        sku: The product SKU
        tenant_slug: The tenant slug for multi-tenant support
        
    Returns:
        Dictionary with product details or None if not found
    """
    # Default to 'erp_turtle' if no tenant_slug is provided for backward compatibility
    # tenant_slug = tenant_slug or 'erp_turtle'
    
    # Check cache first
    cache_key = f"product_details:{tenant_slug}:{sku}"
    cached_data = cache.get(cache_key)
    if cached_data:
        logger.debug(f"Cache hit for product details: SKU {sku} for tenant {tenant_slug}")
        return cached_data
    
    logger.info(f"Getting product details for SKU {sku} (tenant: {tenant_slug})")
    
    # Build the API URL with tenant slug
    list_url = urljoin(PRODUCT_API_BASE_URL, f"v1/{tenant_slug}/products/products/")
    
    try:
        # Make API request to the list endpoint with SKU filter
        list_response = requests.get(
            list_url,
            params={"sku": sku},
            # headers=get_api_headers(),
            timeout=DEFAULT_TIMEOUT
        )
        
        if list_response.status_code == 200:
            data = list_response.json()
            # print("data38",data)
            # Check if we have results
            if isinstance(data, dict) and 'results' in data and data['results']:
                # Return the first matching product
                product = data['results'][0]
                
                # Ensure price is formatted as string for Decimal conversion
                if 'price' in product and product['price'] is not None:
                    product['price'] = str(product['price'])
                elif 'display_price' in product and product['display_price'] is not None:
                    # If no price but display_price exists, set price from display_price for consistency
                    product['price'] = str(product['display_price'])
                
                # Cache the result
                cache.set(cache_key, product, CACHE_TTL)
                return product
        
        # If list endpoint didn't work, try the detail endpoint
        detail_url = urljoin(PRODUCT_API_BASE_URL, f"v1/{tenant_slug}/products/products/{sku}/")
        response = requests.get(
            detail_url,
            headers=get_api_headers(),
            timeout=DEFAULT_TIMEOUT
        )
        
        if response.status_code == 200:
            product = response.json()
            
            # Ensure price is formatted as string for Decimal conversion
            if 'price' in product and product['price'] is not None:
                product['price'] = str(product['price'])
            
            # Cache the result
            cache.set(cache_key, product, CACHE_TTL)
            return product
        elif response.status_code == 404:
            # Product not found - cache negative result
            logger.warning(f"Product not found: SKU {sku}")
            cache.set(cache_key, None, CACHE_TTL_ERROR)
            return None
        else:
            # Log other errors
            handle_api_error(response, "get_product_details", sku)
            return None
            
    except Timeout:
        logger.error(f"Timeout getting product details for SKU {sku}")
    except ConnectionError:
        logger.error(f"Connection error getting product details for SKU {sku}")
    except RequestException as e:
        logger.error(f"Request exception getting product details: {str(e)}")
    except Exception as e:
        logger.exception(f"Unexpected error getting product details: {str(e)}")
        
    # Return None on failure
    return None


def get_products_bulk(skus: List[str], tenant_slug: str = None) -> Dict[str, Dict[str, Any]]:
    """
    Get details for multiple products in a single request.
    
    This method optimizes product retrieval by:
    1. Checking the cache for each SKU first
    2. Making a single API call for all missing SKUs
    3. Updating the cache with the results
    
    Args:
        skus: List of product SKUs to retrieve
        tenant_slug: The tenant slug for multi-tenant support
        
    Returns:
        Dictionary mapping SKUs to their product details
    """
    if not skus:
        return {}
        
    # Default to 'erp_turtle' if no tenant_slug is provided for backward compatibility
    tenant_slug = tenant_slug or 'erp_turtle'
    
    # Remove duplicates while preserving order
    unique_skus = list(dict.fromkeys(skus))
    result = {}
    skus_to_fetch = []
    
    # Check cache first for each SKU
    for sku in unique_skus:
        cache_key = f"product_details:{tenant_slug}:{sku}"
        cached_data = cache.get(cache_key)
        if cached_data:
            result[sku] = cached_data
        else:
            skus_to_fetch.append(sku)
    
    # If all SKUs were in cache, return immediately
    if not skus_to_fetch:
        return result
    
    logger.info(f"Fetching {len(skus_to_fetch)} products in bulk for tenant {tenant_slug}")
    
    # Build the API URL for bulk fetch with tenant slug
    bulk_url = urljoin(PRODUCT_API_BASE_URL, f"v1/{tenant_slug}/products/bulk/")
    
    try:
        # Make a single API call for all missing SKUs
        response = requests.post(
            bulk_url,
            json={"skus": skus_to_fetch},
            headers=get_api_headers(),
            timeout=DEFAULT_TIMEOUT
        )
        
        if response.status_code == 200:
            products_data = response.json()
            
            # Update cache and results with the fetched data
            for product in products_data:
                sku = product.get('sku')
                if sku:
                    cache_key = f"product_details:{tenant_slug}:{sku}"
                    cache.set(cache_key, product, CACHE_TTL)
                    result[sku] = product
            
            return result
            
        handle_api_error(response, f"bulk fetching products for tenant {tenant_slug}")
        return result
        
    except (RequestException, Timeout, ConnectionError) as e:
        logger.error(f"Error during bulk product fetch for tenant {tenant_slug}: {str(e)}")
        # For SKUs we couldn't fetch, add None entries
        for sku in skus_to_fetch:
            if sku not in result:
                result[sku] = None
                cache_key = f"product_details:{tenant_slug}:{sku}"
                cache.set(cache_key, None, CACHE_TTL_ERROR)
        return result


def get_product_pricing(sku: str, quantity: int = 1, tenant_slug: str = None) -> Optional[Dict[str, Any]]:
    """
    Get product pricing information, including any applicable discounts.
    
    Args:
        sku: The product SKU
        quantity: The quantity being purchased
        tenant_slug: The tenant slug for multi-tenant support
        
    Returns:
        Dictionary with pricing details or None if not found
    """
    # Default to 'erp_turtle' if no tenant_slug is provided for backward compatibility
    tenant_slug = tenant_slug or 'erp_turtle'
    
    # Generate cache key with tenant context
    cache_key = f"product_pricing:{tenant_slug}:{sku}:{quantity}"
    
    # Check cache first
    cached_data = cache.get(cache_key)
    if cached_data:
        logger.debug(f"Cache hit for product pricing: SKU {sku}, quantity {quantity}")
        return cached_data
    
    logger.info(f"Getting product pricing for SKU {sku}, quantity {quantity}")
    
    # Construct API URL with tenant slug
    url = urljoin(PRODUCT_API_BASE_URL, f"v1/{tenant_slug}/products/products/{sku}/pricing/")
    
    try:
        # Make API request
        response = requests.get(
            url,
            params={'quantity': quantity},
            headers=get_api_headers(),
            timeout=DEFAULT_TIMEOUT
        )
        
        # Handle 404 Not Found
        if response.status_code == 404:
            logger.info(f"Product with SKU {sku} not found")
            return None
            
        # Handle other errors
        if response.status_code != 200:
            handle_api_error(response, "get_product_pricing", sku)
            return None
            
        # Parse response
        pricing_data = response.json()
        
        # Validate required fields (basic validation)
        if 'unit_price' not in pricing_data and 'display_price' not in pricing_data:
            logger.error(f"Invalid pricing data format for SKU {sku}: missing price field")
            return None
            
        # Normalize data - API might return display_price instead of unit_price
        if 'display_price' in pricing_data and 'unit_price' not in pricing_data:
            pricing_data['unit_price'] = pricing_data['display_price']
            
        # Convert price values to Decimal for consistency and calculations
        for field in ['unit_price', 'discount_amount', 'final_unit_price']:
            if field in pricing_data and pricing_data[field] is not None:
                pricing_data[field] = Decimal(str(pricing_data[field]))
                
        # If API doesn't provide a final price with discount, calculate it
        if 'discount_amount' in pricing_data and 'final_unit_price' not in pricing_data:
            pricing_data['final_unit_price'] = pricing_data['unit_price'] - pricing_data['discount_amount']
            
        # Cache the result
        cache.set(cache_key, pricing_data, CACHE_TTL)
        
        return pricing_data
        
    except Timeout:
        logger.error(f"Timeout getting product pricing for SKU {sku}")
    except ConnectionError:
        logger.error(f"Connection error getting product pricing for SKU {sku}")
    except RequestException as e:
        logger.error(f"Request exception getting product pricing for SKU {sku}: {str(e)}")
    except Exception as e:
        logger.exception(f"Unexpected error getting product pricing for SKU {sku}: {str(e)}")
        
    return None


def search_products(
    query: str, 
    filters: Optional[Dict[str, Any]] = None, 
    tenant_slug: str = None,
    page: int = 1,
    page_size: int = 20
) -> Dict[str, Any]:
    """
    Search for products matching the given criteria.
    
    Args:
        query: The search query string
        filters: Optional dictionary of filters (e.g., {'in_stock': True, 'min_price': 10})
        tenant_slug: The tenant slug for multi-tenant support (required)
        page: Page number for pagination (default: 1)
        page_size: Number of items per page (default: 20)
        
    Returns:
        Dictionary containing:
        - results: List of matching products
        - count: Total number of results
        - next: URL to next page if exists
        - previous: URL to previous page if exists
        
    Raises:
        ValueError: If tenant_slug is not provided
    """
    if not tenant_slug:
        raise ValueError("tenant_slug is required")
        
    if not query.strip():
        return {
            'results': [],
            'count': 0,
            'next': None,
            'previous': None
        }
        
    filters = filters or {}
    
    # Generate cache key with tenant context and pagination
    cache_key = (
        f"product_search:{tenant_slug}:"
        f"{query}:{page}:{page_size}:"
        f"{hash(frozenset(sorted(filters.items())))}"
    )
    
    # Check cache first
    cached_data = cache.get(cache_key)
    if cached_data:
        logger.debug(f"Cache hit for product search: '{query}'")
        return cached_data
    
    logger.info(f"Searching products with query: '{query}', page: {page}, page_size: {page_size}, filters: {filters}")
    
    # Construct API URL with tenant slug
    url = urljoin(PRODUCT_API_BASE_URL, f"v1/{tenant_slug}/products/products/search/")
    
    # Prepare request parameters
    params = {'q': query, 'page': page, 'page_size': page_size}
    
    # Add filters if provided
    if filters:
        params.update(filters)
    
    try:
        # Make API request with timeout
        response = requests.get(
            url,
            params=params,
            timeout=DEFAULT_TIMEOUT
        )
        
        # Handle errors
        if response.status_code != 200:
            handle_api_error(response, "search_products")
            return {
                'results': [],
                'count': 0,
                'next': None,
                'previous': None
            }
        
        # Parse and validate response
        data = response.json()
        
        # Ensure consistent response format
        result = {
            'results': data.get('results', []),
            'count': data.get('count', 0),
            'next': data.get('next'),
            'previous': data.get('previous')
        }
        
        # Convert prices to Decimal for consistency
        for product in result['results']:
            if 'display_price' in product:
                product['price'] = Decimal(str(product['display_price']))
                
        # Cache the result
        cache.set(cache_key, products, CACHE_TTL)
        
        return products
        
    except Timeout:
        logger.error(f"Timeout searching products with query '{query}'")
    except ConnectionError:
        logger.error(f"Connection error searching products with query '{query}'")
    except RequestException as e:
        logger.error(f"Request exception searching products: {str(e)}")
    except Exception as e:
        logger.exception(f"Unexpected error searching products: {str(e)}")
        
    # Return empty list on failure
    return []


def list_products(**kwargs) -> List[Dict[str, Any]]:
    """
    List all products with optional filtering and pagination.
    
    Args:
        **kwargs: Optional filters and pagination parameters
            - page: Page number (default: 1)
            - page_size: Items per page (default: 20)
            - category: Filter by category
            - is_active: Filter by active status
            - sort_by: Field to sort by
            - sort_order: 'asc' or 'desc'
            - Additional parameters passed directly to the API
        
    Returns:
        List of products
    """
    # Generate cache key from kwargs
    cache_key_parts = ["products_list"]
    for key, value in sorted(kwargs.items()):
        cache_key_parts.append(f"{key}:{value}")
    cache_key = ":".join(cache_key_parts)
    
    # Check cache first
    cached_data = cache.get(cache_key)
    if cached_data:
        logger.debug(f"Cache hit for products list")
        return cached_data
    
    # Get tenant_slug from kwargs and remove it to avoid sending as query param
    tenant_slug = kwargs.pop('tenant_slug', 'erp_turtle')
    
    # Construct API URL with the actual tenant_slug
    url = urljoin(PRODUCT_API_BASE_URL, f"v1/{tenant_slug}/products/products/")
    
    # Log request details
    logger.info(f"Listing products with filters: {kwargs}")
    
    try:
        # Make API request
        response = requests.get(
            url,
            params=kwargs,  # Pass all kwargs as query parameters
            headers=get_api_headers(),
            timeout=DEFAULT_TIMEOUT
        )
        print("response28",response)  
        
        # Handle errors
        if response.status_code != 200:
            handle_api_error(response, "list_products")
            return []
            
        # Parse response - handle both list and paginated responses
        data = response.json()
        
        # Handle paginated response
        if isinstance(data, dict) and 'results' in data:
            products = data['results']
        else:
            # Direct list response
            products = data
            
        # Validate product list
        if not isinstance(products, list):
            logger.error(f"Invalid product list response format: {type(products)}")
            return []
            
        # Convert prices to Decimal for consistency
        for product in products:
            if 'display_price' in product:
                product['price'] = Decimal(str(product['display_price']))
                
        # Cache the result
        cache.set(cache_key, products, CACHE_TTL)
        
        return products
        
    except Timeout:
        logger.error(f"Timeout listing products")
    except ConnectionError:
        logger.error(f"Connection error listing products")
    except RequestException as e:
        logger.error(f"Request exception listing products: {str(e)}")
    except Exception as e:
        logger.exception(f"Unexpected error listing products: {str(e)}")
        
    # Return empty list on failure
    return []
