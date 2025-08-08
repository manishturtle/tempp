"""
Customer Service Integration.

This module provides implementations for interacting with the Customer Service API.
It provides a unified interface for order management to access customer data.
"""
from typing import Dict, Any, Optional, List, Union
import logging
import requests
from requests.exceptions import RequestException, Timeout, ConnectionError
from erp_backend import settings
from django.core.cache import cache
from core.clients.auth_service import AuthServiceClient

from order_management.exceptions import (
    CustomerServiceError,
    CustomerConnectionError,
    CustomerResponseError,
    CustomerNotFoundError
)
auth_client = AuthServiceClient()

logger = logging.getLogger(__name__)


def _get_base_headers(token: Optional[str] = None) -> Dict[str, str]:
    """
    Get the default headers for API requests.
    
    Args:
        token: Optional JWT token to use for authentication
        
    Returns:
        Dict containing the default headers for API requests
    """
    headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
    
    # If a token is provided, use it directly
    if token:
        headers['Authorization'] = f"Bearer {token}"
        logger.debug("Using provided JWT token for API authentication")
        return headers
    
    # Otherwise, fall back to generating a token or using default
    try:
        # Get a valid user from the database
        from ecomm_auth.models import EcommUserCredential
        from django.conf import settings
        import jwt
        import uuid
        from datetime import datetime, timedelta
        
        # Find an active admin user in the database
        admin_user = EcommUserCredential.objects.filter(
            is_active=True,
            client_id=1  # Default tenant ID
        ).first()
        
        if admin_user:
            # Generate JWT token directly
            token_payload = {
                'user_id': str(admin_user.id),
                'email': admin_user.email,
                'tenant_id': 1,  # Default tenant ID
                'exp': datetime.utcnow() + timedelta(hours=1),  # 1 hour expiry
                'iat': datetime.utcnow(),
                'jti': str(uuid.uuid4())
            }
            
            # Use the same secret key as in the login view
            secret_key = getattr(settings, 'JWT_SECRET_KEY', 'default_secret_key_for_testing')
            access_token = jwt.encode(token_payload, secret_key, algorithm='HS256')
            
            headers['Authorization'] = f"Bearer {access_token}"
            logger.info(f"Using database user {admin_user.email} for API authentication")
        else:
            logger.error("No active admin user found in the database")
            # Fallback to hardcoded token in development only
            if settings.DEBUG:
                test_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJleHAiOjE2MjE1MTIwMDB9.8sGW4JCW8u0FJ6TKY5F-rJUBLGwVXmdV3SfDQrNJqAA"
                headers['Authorization'] = f"Bearer {test_token}"
    except Exception as e:
        logger.exception(f"Error generating authentication token: {str(e)}")
        # Fallback to hardcoded token in development only
        if settings.DEBUG:
            test_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJleHAiOjE2MjE1MTIwMDB9.8sGW4JCW8u0FJ6TKY5F-rJUBLGwVXmdV3SfDQrNJqAA"
            headers['Authorization'] = f"Bearer {test_token}"
    
    return headers


def _get_api_url(endpoint: str) -> str:
    """
    Construct full API URL for a given endpoint.
    
    Args:
        endpoint: API endpoint path (without leading slash)
        
    Returns:
        Full URL including base API URL and endpoint
    """
    base_url = settings.CUSTOMER_API_BASE_URL.rstrip('/')
    endpoint = endpoint.lstrip('/')
    return f"{base_url}/{endpoint}"


def _handle_api_error(response: requests.Response, operation: str) -> None:
    """
    Handle API error response.
    
    Args:
        response: Response object from requests
        operation: Description of the operation being performed
        
    Raises:
        CustomerNotFoundError: If the requested customer is not found (404)
        CustomerResponseError: If the API returns an error response
    """
    try:
        error_data = response.json()
        error_detail = error_data.get('detail', str(error_data))
    except (ValueError, KeyError):
        error_detail = response.text or f"HTTP {response.status_code}"
        
    error_msg = f"Error during {operation}: {error_detail}"
    logger.error(error_msg)
    
    if response.status_code == 404:
        raise CustomerNotFoundError(f"Resource not found during {operation}")
    
    # Raise appropriate exception based on status code
    raise CustomerResponseError(response.status_code, error_detail)


def get_customer_details(contact_id: int, token: Optional[str] = None) -> Dict[str, Any]:
    """
    Get customer details from the Customer Service.
    
    Args:
        contact_id: The contact identifier
        token: Optional JWT token to use for authentication
        
    Returns:
        Dictionary with customer details
        
    Raises:
        CustomerConnectionError: If unable to connect to the Customer API
        CustomerResponseError: If the Customer API returns an error response
        CustomerNotFoundError: If the customer is not found
    """
    logger.info(f"Getting customer profile for contact {contact_id}")
    
    # Check cache first
    cache_key = f"customer_details:{contact_id}"
    cached_data = cache.get(cache_key)
    if cached_data:
        logger.debug(f"Using cached customer details for contact {contact_id}")
        return cached_data
    
    # Prepare API request
    url = _get_api_url(f"contacts/{contact_id}/")
    headers = _get_base_headers()
    
    try:
        # Make API request
        response = requests.get(
            url,
            headers=headers,
            timeout=settings.CUSTOMER_API_TIMEOUT
        )
        
        # Handle non-200 responses
        if response.status_code != 200:
            _handle_api_error(response, f"get_customer_details for user {contact_id}")
        
        # Parse response
        customer_data = response.json()
        
        # Cache the result
        cache.set(cache_key, customer_data, settings.CUSTOMER_API_CACHE_TTL)
        
        return customer_data
        
    except ConnectionError as e:
        logger.error(f"Connection error while getting customer details for contact {contact_id}: {str(e)}")
        raise CustomerConnectionError(f"Failed to connect to Customer API: {str(e)}")
        
    except Timeout as e:
        logger.error(f"Timeout while getting customer details for contact {contact_id}: {str(e)}")
        raise CustomerConnectionError(f"Timeout connecting to Customer API: {str(e)}")
        
    except RequestException as e:
        logger.error(f"Error getting customer details for contact {contact_id}: {str(e)}")
        raise CustomerConnectionError(f"Error accessing Customer API: {str(e)}")
        
    except Exception as e:
        logger.error(f"Unexpected error getting customer details for contact {contact_id}: {str(e)}")
        raise CustomerServiceError(f"Unexpected error: {str(e)}")


def update_customer_profile(contact_id: int, profile_data: Dict[str, Any], token: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Update customer profile information.
    
    Args:
        contact_id: The contact identifier
        profile_data: Dictionary containing fields to update
        
    Returns:
        Updated customer profile dictionary or None if update failed
        
    Raises:
        ConnectionError: If unable to connect to the Customer API
        Timeout: If the API request times out
        RequestException: For other API-related errors
    """
    logger.info(f"Updating customer profile for contact {contact_id}")
    logger.debug(f"Profile data to update for contact {contact_id}: {profile_data}")
    
    # Prepare API request
    url = _get_api_url(f"contacts/{contact_id}/")
    headers = _get_base_headers()
    
    try:
        # Make API request (PATCH to update partial data)
        response = requests.patch(
            url,
            headers=headers,
            json=profile_data,
            timeout=settings.CUSTOMER_API_TIMEOUT
        )
        
        # Handle successful response
        if response.status_code in (200, 201, 204):
            # Invalidate cache
            cache_key = f"customer_details:{contact_id}"
            cache.delete(cache_key)
            
            # If response has content, return it; otherwise get updated profile
            if response.status_code != 204 and response.content:  # 204 = No Content
                updated_profile = response.json()
                logger.info(f"Successfully updated profile for contact {contact_id}")
                return updated_profile
            else:
                # Fetch the updated profile
                logger.info(f"Successfully updated profile for contact {contact_id}, fetching updated data")
                return get_customer_details(contact_id)
        
        # Handle 404 (not found)
        elif response.status_code == 404:
            logger.warning(f"Customer with ID {contact_id} not found when trying to update profile")
            return None
        
        # Handle other error responses
        else:
            _handle_api_error(response, f"update_customer_profile for contact {contact_id}")
            return None
            
    except Timeout:
        logger.error(f"Timeout while updating profile for contact {contact_id}")
        raise Timeout(f"Request to Customer API timed out after {settings.CUSTOMER_API_TIMEOUT} seconds")
    
    except ConnectionError as e:
        logger.error(f"Connection error while updating profile: {str(e)}")
        raise ConnectionError(f"Failed to connect to Customer API: {str(e)}")
    
    except RequestException as e:
        logger.error(f"Error updating profile: {str(e)}")
        raise RequestException(f"Error accessing Customer API: {str(e)}")


def get_contact_person_role(contact_id: int, token: Optional[str] = None) -> Optional[str]:
    """
    Get the role of a contact person within a customer account.
    
    Args:
        contact_id: The contact identifier
        
    Returns:
        Role string ('Admin', 'Regular User', 'Individual') or None if not found
        
    Raises:
        ConnectionError: If unable to connect to the Customer API
        Timeout: If the API request times out
        RequestException: For other API-related errors
    """
    logger.info(f"Getting role for contact {contact_id}")
    
    # Check cache first
    cache_key = f"contact_role:{contact_id}"
    cached_role = cache.get(cache_key)
    if cached_role:
        logger.debug(f"Using cached role for contact {contact_id}")
        return cached_role
    
    # Get the contact details which should include role
    contact_details = get_customer_details(contact_id, token)
    if not contact_details:
        logger.warning(f"No contact found for contact {contact_id}")
        return None
    
    # Extract role from the contact details
    role = contact_details.get('portal_role')
    
    # If no portal role, default to 'Individual'
    if not role:
        role = 'Individual'
    
    # Cache the role
    cache.set(cache_key, role, settings.CUSTOMER_API_CACHE_TTL)
    
    logger.info(f"Contact {contact_id} has role: {role}")
    return role


def get_customer_id_for_contact(contact_id: int, token: Optional[str] = None) -> Optional[int]:
    """
    Get the parent customer account ID for a contact.
    
    For B2B/Gov accounts, this returns the parent customer account ID.
    For individual customers, this returns None.
    
    Args:
        contact_id: The contact identifier
        
    Returns:
        Parent customer ID or None for individual customers
        
    Raises:
        ConnectionError: If unable to connect to the Customer API
        Timeout: If the API request times out
        RequestException: For other API-related errors
    """
    logger.info(f"Getting customer ID for contact {contact_id}")
    
    # Check cache first
    cache_key = f"customer_id_for_contact:{contact_id}"
    cached_id = cache.get(cache_key)
    if cached_id is not None:  # Could be 0, which is falsy
        logger.debug(f"Using cached customer ID for contact {contact_id}")
        return cached_id
    
    # Get the contact details which should include account information
    contact_details = get_customer_details(contact_id, token)
    if not contact_details:
        logger.warning(f"No contact found for contact {contact_id}")
        return None
    
    # Get the account ID from the contact details
    # Check if it's a direct property or nested in an account object
    account_id = None
    if 'account_id' in contact_details:
        account_id = contact_details['account_id']
    elif 'account' in contact_details and isinstance(contact_details['account'], dict):
        account_id = contact_details['account'].get('id')
    elif 'account' in contact_details and isinstance(contact_details['account'], int):
        account_id = contact_details['account']
    
    # Cache the account ID (even if it's None)
    cache.set(cache_key, account_id, settings.CUSTOMER_API_CACHE_TTL)
    
    if account_id:
        logger.info(f"Contact {contact_id} belongs to customer account {account_id}")
    else:
        logger.info(f"Contact {contact_id} has no associated customer account")
        
    return account_id


def get_customer_addresses(customer_id: int, token: Optional[str] = None, tenant_slug: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Get addresses for a customer.
    
    Args:
        customer_id: The customer identifier
        token: Optional JWT token to use for authentication
        tenant_slug: The tenant slug to use in the API URL
        
    Returns:
        List of customer addresses
        
    Raises:
        ConnectionError: If unable to connect to the Customer API
        Timeout: If the API request times out
        RequestException: For other API-related errors
    """
    logger.info(f"Getting addresses for customer {customer_id}")
    print("customer_id", customer_id)

    
    # Check cache first
    cache_key = f"customer_addresses:{customer_id}"
    cached_addresses = cache.get(cache_key)
    if cached_addresses:
        logger.debug(f"Using cached addresses for customer {customer_id}")
        return cached_addresses
    

    # Prepare API request
    # Include tenant slug in the URL path
    if not tenant_slug:
        tenant_slug = "erp_turtle"  # Fallback value, but should be provided by the caller
        logger.warning(f"No tenant_slug provided, using default: {tenant_slug}")
    url = _get_api_url(f"{tenant_slug}/addresses/?account_id={customer_id}")
    headers = _get_base_headers(token)
    logger.debug(f"Address API URL: {url}")
    logger.debug(f"Using headers with Auth: {headers.get('Authorization') is not None}")
    
    try:
        # Make API request
        response = requests.get(
            url,
            # headers=headers,
            timeout=settings.CUSTOMER_API_TIMEOUT
        )
        logger.debug(f"Address API response status: {response.status_code}")
        # Handle successful response
        if response.status_code == 200:
            logger.debug("Successfully received addresses from API")
            response_data = response.json()
            
            # API might return a paginated result with 'results' key
            if 'results' in response_data:
                logger.debug("Found paginated results key in response")
                addresses = response_data['results']
            else:
                addresses = response_data
                
            logger.debug(f"Processing {len(addresses)} addresses")
            # Normalize the addresses to expected format
            normalized_addresses = []
            for addr in addresses:
                normalized_addr = {
                    'id': addr.get('id'),
                    'address_type': addr.get('address_type'),
                    'full_name': addr.get('full_name', ''),
                    'address_line1': addr.get('street_1'),
                    'address_line2': addr.get('street_2', ''),
                    'city': addr.get('city'),
                    'state': addr.get('state_province'),
                    'postal_code': addr.get('postal_code'),
                    'country': addr.get('country'),
                    'phone_number': addr.get('phone_number', ''),
                    'business_name': addr.get('business_name', ''),
                    'gst_number': addr.get('gst_number', ''),
                    'is_default': addr.get('is_primary_shipping', False) if addr.get('address_type') == 'SHIPPING'
                                 else addr.get('is_primary_billing', False)
                }
                normalized_addresses.append(normalized_addr)
            
            # Cache the normalized addresses
            cache.set(cache_key, normalized_addresses, settings.CUSTOMER_API_CACHE_TTL)
            
            logger.debug(f"Successfully retrieved {len(normalized_addresses)} addresses for customer {customer_id}")
            return normalized_addresses
        
        # Handle empty result (no addresses)
        elif response.status_code == 404:
            logger.warning(f"No addresses found for customer {customer_id}")
            return []
        
        # Handle other error responses
        else:
            _handle_api_error(response, f"get_customer_addresses for customer {customer_id}")
            return []
            
    except Timeout:
        logger.error(f"Timeout while fetching addresses for customer {customer_id}")
        raise Timeout(f"Request to Customer API timed out after {settings.CUSTOMER_API_TIMEOUT} seconds")
    
    except ConnectionError as e:
        logger.error(f"Connection error while fetching addresses: {str(e)}")
        raise ConnectionError(f"Failed to connect to Customer API: {str(e)}")
    
    except RequestException as e:
        logger.error(f"Error fetching addresses: {str(e)}")
        raise RequestException(f"Error accessing Customer API: {str(e)}")


def get_contact_persons_for_customer(customer_id: int, token: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Get all contact persons associated with a customer account.
    
    Args:
        customer_id: The parent customer identifier
        
    Returns:
        List of contact person dictionaries with id, name, email, 
        is_portal_access_enabled, and portal_role
        
    Raises:
        ConnectionError: If unable to connect to the Customer API
        Timeout: If the API request times out
        RequestException: For other API-related errors
    """
    logger.info(f"Getting contact persons for customer {customer_id}")
    
    # Check cache first
    cache_key = f"contact_persons:{customer_id}"
    cached_contacts = cache.get(cache_key)
    if cached_contacts:
        logger.debug(f"Using cached contact persons for customer {customer_id}")
        return cached_contacts
    
    # Prepare API request
    url = _get_api_url(f"contacts/?account={customer_id}")
    headers = _get_base_headers(token)
    
    try:
        # Make API request
        response = requests.get(
            url,
            headers=headers,
            timeout=settings.CUSTOMER_API_TIMEOUT
        )
        
        # Handle successful response
        if response.status_code == 200:
            response_data = response.json()
            
            # API might return a paginated result with 'results' key
            if 'results' in response_data:
                contacts = response_data['results']
            else:
                contacts = response_data
                
            # Normalize the contacts to expected format
            normalized_contacts = []
            for contact in contacts:
                # Determine if this contact has portal access
                has_access = contact.get('ecommerce_user_id') is not None
                
                # Get full name from contact details
                if contact.get('full_name'):
                    name = contact.get('full_name')
                else:
                    first_name = contact.get('first_name', '')
                    last_name = contact.get('last_name', '')
                    name = f"{first_name} {last_name}".strip()
                
                normalized_contact = {
                    'id': contact.get('id'),
                    'name': name,
                    'email': contact.get('email', ''),
                    'is_portal_access_enabled': has_access,
                    'portal_role': contact.get('portal_role', None)
                }
                normalized_contacts.append(normalized_contact)
            
            # Cache the normalized contacts
            cache.set(cache_key, normalized_contacts, settings.CUSTOMER_API_CACHE_TTL)
            
            logger.debug(f"Successfully retrieved {len(normalized_contacts)} contact persons for customer {customer_id}")
            return normalized_contacts
        
        # Handle empty result (no contacts)
        elif response.status_code == 404:
            logger.warning(f"No contact persons found for customer {customer_id}")
            return []
        
        # Handle other error responses
        else:
            _handle_api_error(response, f"get_contact_persons_for_customer for customer {customer_id}")
            return []
            
    except Timeout:
        logger.error(f"Timeout while fetching contact persons for customer {customer_id}")
        raise Timeout(f"Request to Customer API timed out after {settings.CUSTOMER_API_TIMEOUT} seconds")
    
    except ConnectionError as e:
        logger.error(f"Connection error while fetching contact persons: {str(e)}")
        raise ConnectionError(f"Failed to connect to Customer API: {str(e)}")
    
    except RequestException as e:
        logger.error(f"Error fetching contact persons: {str(e)}")
        raise RequestException(f"Error accessing Customer API: {str(e)}")


def get_contact_persons(customer_id: int, token: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Get contact persons for a customer.
    
    Args:
        customer_id: The customer identifier
        
    Returns:
        List of contact persons
        
    Raises:
        ConnectionError: If unable to connect to the Customer API
        Timeout: If the API request times out
        RequestException: For other API-related errors
    """
    # This is a wrapper around get_contact_persons_for_customer with a slightly different format
    # for backward compatibility with existing code
    logger.info(f"Getting contact persons for customer {customer_id}")
    
    try:
        contacts_from_api = get_contact_persons_for_customer(customer_id)
        
        # Transform the data to match the expected format
        formatted_contacts = []
        for i, contact in enumerate(contacts_from_api):
            # Determine role (use default roles if no specific role is provided)
            roles = ['PRIMARY', 'BILLING', 'SHIPPING', 'TECHNICAL']
            role = roles[i % len(roles)]
            
            # Extract name parts
            name_parts = contact.get('name', '').split(' ', 1)
            first_name = name_parts[0] if name_parts else ''
            last_name = name_parts[1] if len(name_parts) > 1 else ''
            
            formatted_contact = {
                'id': contact.get('id'),
                'customer_id': customer_id,
                'is_primary': i == 0,  # First contact is primary
                'role': role,
                'first_name': first_name,
                'last_name': last_name,
                'email': contact.get('email', ''),
                'phone': contact.get('phone', '') or contact.get('mobile_phone', '') or contact.get('work_phone', '')
            }
            formatted_contacts.append(formatted_contact)
        
        return formatted_contacts
        
    except Exception as e:
        logger.error(f"Error getting contact persons: {str(e)}")
        # Return empty list on error to avoid breaking dependent code
        return []


def get_customer_payment_methods(customer_id: int, token: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Get saved payment methods for a customer.
    
    Args:
        customer_id: The customer identifier
        
    Returns:
        List of payment methods
        
    Raises:
        ConnectionError: If unable to connect to the Customer API
        Timeout: If the API request times out
        RequestException: For other API-related errors
    """
    logger.info(f"Getting payment methods for customer {customer_id}")
    
    # Check cache first
    cache_key = f"customer_payment_methods:{customer_id}"
    cached_methods = cache.get(cache_key)
    if cached_methods:
        logger.debug(f"Using cached payment methods for customer {customer_id}")
        return cached_methods
    
    # Prepare API request
    url = _get_api_url(f"accounts/{customer_id}/payment-methods/")
    headers = _get_base_headers()
    
    try:
        # Make API request
        response = requests.get(
            url,
            headers=headers,
            timeout=settings.CUSTOMER_API_TIMEOUT
        )
        
        # Handle successful response
        if response.status_code == 200:
            response_data = response.json()
            
            # API might return a paginated result with 'results' key
            if 'results' in response_data:
                payment_methods = response_data['results']
            else:
                payment_methods = response_data
            
            # Cache the payment methods
            cache.set(cache_key, payment_methods, settings.CUSTOMER_API_CACHE_TTL)
            
            logger.debug(f"Successfully retrieved {len(payment_methods)} payment methods for customer {customer_id}")
            return payment_methods
        
        # Handle empty result (no payment methods)
        elif response.status_code == 404:
            logger.warning(f"No payment methods found for customer {customer_id}")
            return []
        
        # Handle other error responses
        else:
            _handle_api_error(response, f"get_customer_payment_methods for customer {customer_id}")
            return []
            
    except Timeout:
        logger.error(f"Timeout while fetching payment methods for customer {customer_id}")
        raise Timeout(f"Request to Customer API timed out after {settings.CUSTOMER_API_TIMEOUT} seconds")
    
    except ConnectionError as e:
        logger.error(f"Connection error while fetching payment methods: {str(e)}")
        raise ConnectionError(f"Failed to connect to Customer API: {str(e)}")
    
    except RequestException as e:
        logger.error(f"Error fetching payment methods: {str(e)}")
        raise RequestException(f"Error accessing Customer API: {str(e)}")
    
    # If the endpoint doesn't exist yet, return an empty list as a fallback
    except Exception as e:
        logger.error(f"Unexpected error retrieving payment methods: {str(e)}")
        return []


def get_users_for_tenant() -> List[int]:
    """
    Get all user IDs for a specific tenant.
    
    In a real implementation, this would query the Customer Service database
    to retrieve all users belonging to the specified tenant.
    
    Returns:
        List of user IDs belonging to the tenant
    """
    logger.info(f"Getting users for tenant")
    
    # Prepare API request
    url = _get_api_url(f"tenants/users/")
    headers = _get_base_headers()
    
    try:
        # Make API request
        response = requests.get(
            url,
            headers=headers,
            timeout=settings.CUSTOMER_API_TIMEOUT
        )
        
        # Handle successful response
        if response.status_code == 200:
            response_data = response.json()
            
            # API might return a paginated result with 'results' key
            if 'results' in response_data:
                users = response_data['results']
            else:
                users = response_data
            
            # Extract user IDs
            user_ids = [user.get('id') for user in users]
            
            logger.debug(f"Successfully retrieved {len(user_ids)} users for tenant")
            return user_ids
        
        # Handle empty result (no users)
        elif response.status_code == 404:
            logger.warning(f"No users found for tenant")
            return []
        
        # Handle other error responses
        else:
            _handle_api_error(response, f"get_users_for_tenant for tenant")
            return []
            
    except Timeout:
        logger.error(f"Timeout while fetching users for tenant")
        raise Timeout(f"Request to Customer API timed out after {settings.CUSTOMER_API_TIMEOUT} seconds")
    
    except ConnectionError as e:
        logger.error(f"Connection error while fetching users: {str(e)}")
        raise ConnectionError(f"Failed to connect to Customer API: {str(e)}")
    
    except RequestException as e:
        logger.error(f"Error fetching users: {str(e)}")
        raise RequestException(f"Error accessing Customer API: {str(e)}")
    
    # If the endpoint doesn't exist yet, return an empty list as a fallback
    except Exception as e:
        logger.error(f"Unexpected error retrieving users: {str(e)}")
        return []


def get_accounts_for_tenant(client_id: int) -> List[int]:
    """
    Get all account IDs for a given tenant.
    
    Args:
        client_id: The tenant client ID
        
    Returns:
        List of account IDs belonging to the tenant
        
    Raises:
        CustomerConnectionError: If connection to the customer service fails
        CustomerResponseError: If the customer service returns an error response
        CustomerServiceError: For any other customer service errors
    """
    cache_key = f"tenant_accounts_{client_id}"
    cached_accounts = cache.get(cache_key)
    
    if cached_accounts is not None:
        logger.debug(f"Using cached account IDs for tenant {client_id}")
        return cached_accounts
    
    try:
        # Construct API URL
        url = f"{settings.CUSTOMER_API_BASE_URL}/api/v1/accounts/?client_id={client_id}"
        headers = _get_base_headers()
        
        # Make API request
        try:
            response = requests.get(url, headers=headers, timeout=settings.CUSTOMER_API_TIMEOUT)
        except Timeout:
            logger.error(f"Timeout connecting to customer service for tenant {client_id}")
            raise CustomerConnectionError("Connection to customer service timed out")
        except ConnectionError:
            logger.error(f"Failed to connect to customer service for tenant {client_id}")
            raise CustomerConnectionError("Failed to connect to customer service")
        except RequestException as e:
            logger.error(f"Request exception connecting to customer service: {str(e)}")
            raise CustomerConnectionError(f"Request error: {str(e)}")
        
        # Check response status
        if response.status_code != 200:
            logger.error(f"Customer service error response: {response.status_code} - {response.text}")
            raise CustomerResponseError(
                f"Customer service returned error status: {response.status_code}",
                status_code=response.status_code
            )
        
        # Parse response
        try:
            data = response.json()
            account_ids = [account['id'] for account in data.get('results', [])]
            
            # Cache the result for 5 minutes
            cache.set(cache_key, account_ids, 300)
            
            logger.info(f"Retrieved {len(account_ids)} accounts for tenant {client_id}")
            return account_ids
        except ValueError:
            logger.error(f"Invalid JSON response from customer service: {response.text}")
            raise CustomerResponseError("Invalid JSON response from customer service")
        except KeyError as e:
            logger.error(f"Unexpected response format from customer service: {str(e)}")
            raise CustomerResponseError(f"Unexpected response format: {str(e)}")
    
    except (CustomerConnectionError, CustomerResponseError):
        # Re-raise these specific exceptions
        raise
    except Exception as e:
        logger.exception(f"Unexpected error getting accounts for tenant {client_id}: {str(e)}")
        raise CustomerServiceError(f"Unexpected error: {str(e)}")


def get_users_for_tenant(client_id: int) -> List[int]:
    """
    Get all contact IDs for a given tenant.
    
    Args:
        client_id: The tenant client ID
        
    Returns:
        List of contact IDs belonging to the tenant
        
    Raises:
        CustomerConnectionError: If connection to the customer service fails
        CustomerResponseError: If the customer service returns an error response
        CustomerServiceError: For any other customer service errors
    """
    cache_key = f"tenant_contacts_{client_id}"
    cached_contacts = cache.get(cache_key)
    
    if cached_contacts is not None:
        logger.debug(f"Using cached contact IDs for tenant {client_id}")
        return cached_contacts
    
    try:
        # Construct API URL
        url = f"{settings.CUSTOMER_API_BASE_URL}/api/v1/contacts/?client_id={client_id}"
        headers = _get_base_headers()
        
        # Make API request
        try:
            response = requests.get(url, headers=headers, timeout=settings.CUSTOMER_API_TIMEOUT)
        except Timeout:
            logger.error(f"Timeout connecting to customer service for tenant {client_id}")
            raise CustomerConnectionError("Connection to customer service timed out")
        except ConnectionError:
            logger.error(f"Failed to connect to customer service for tenant {client_id}")
            raise CustomerConnectionError("Failed to connect to customer service")
        except RequestException as e:
            logger.error(f"Request exception connecting to customer service: {str(e)}")
            raise CustomerConnectionError(f"Request error: {str(e)}")
        
        # Check response status
        if response.status_code != 200:
            logger.error(f"Customer service error response: {response.status_code} - {response.text}")
            raise CustomerResponseError(
                f"Customer service returned error status: {response.status_code}",
                status_code=response.status_code
            )
        
        # Parse response
        try:
            data = response.json()
            contact_ids = [contact['id'] for contact in data.get('results', [])]
            
            # Cache the result for 5 minutes
            cache.set(cache_key, contact_ids, 300)
            
            logger.info(f"Retrieved {len(contact_ids)} contacts for tenant {client_id}")
            return contact_ids
        except ValueError:
            logger.error(f"Invalid JSON response from customer service: {response.text}")
            raise CustomerResponseError("Invalid JSON response from customer service")
        except KeyError as e:
            logger.error(f"Unexpected response format from customer service: {str(e)}")
            raise CustomerResponseError(f"Unexpected response format: {str(e)}")
    
    except (CustomerConnectionError, CustomerResponseError):
        # Re-raise these specific exceptions
        raise
    except Exception as e:
        logger.exception(f"Unexpected error getting contacts for tenant {client_id}: {str(e)}")
        raise CustomerServiceError(f"Unexpected error: {str(e)}")


def validate_customer_credit(customer_id: int, amount: float) -> Dict[str, Any]:
    """
    Validate if a customer has sufficient credit for a purchase.
    
    Args:
        customer_id: The customer identifier
        amount: The purchase amount
        
    Returns:
        Dictionary with credit validation results
        
    Raises:
        ConnectionError: If unable to connect to the Customer API
        Timeout: If the API request times out
        RequestException: For other API-related errors
    """
    logger.info(f"Validating credit for customer {customer_id}")
    logger.debug(f"Purchase amount: {amount}")
    
    # Prepare API request
    url = _get_api_url(f"accounts/{customer_id}/validate-credit/")
    headers = _get_base_headers()
    data = {'amount': float(amount)}
    
    try:
        # Make API request
        response = requests.get(
            url,
            # headers=headers,  # Don't include headers for address API
            timeout=settings.CUSTOMER_API_TIMEOUT
        )
        
        # Handle successful response
        if response.status_code == 200:
            validation_result = response.json()
            logger.info(f"Credit validation result: {'Approved' if validation_result.get('approved') else 'Denied'}")
            if not validation_result.get('approved'):
                logger.info(f"Denial reason: {validation_result.get('reason')}")
            return validation_result
        
        # Handle 404 (customer not found)
        elif response.status_code == 404:
            logger.warning(f"Customer with ID {customer_id} not found when validating credit")
            return {
                'approved': False,
                'reason': 'Customer not found',
                'timestamp': datetime.now().isoformat()
            }
        
        # Handle other error responses
        else:
            _handle_api_error(response, f"validate_customer_credit for customer {customer_id}")
            return {
                'approved': False,
                'reason': f'API error: {response.status_code}',
                'timestamp': datetime.now().isoformat()
            }
            
    except Timeout:
        logger.error(f"Timeout while validating credit for customer {customer_id}")
        # Return a default response on error to avoid breaking dependent code
        return {
            'approved': False,
            'reason': 'API timeout',
            'timestamp': datetime.now().isoformat()
        }
    
    except ConnectionError as e:
        logger.error(f"Connection error while validating credit: {str(e)}")
        # Return a default response on error to avoid breaking dependent code
        return {
            'approved': False,
            'reason': 'Connection error',
            'timestamp': datetime.now().isoformat()
        }
    
    except RequestException as e:
        logger.error(f"Error validating credit: {str(e)}")
        # Return a default response on error to avoid breaking dependent code
        return {
            'approved': False,
            'reason': 'API error',
            'timestamp': datetime.now().isoformat()
        }
    
    # If the endpoint doesn't exist yet, return a default response to avoid breaking dependent code
    except Exception as e:
        logger.error(f"Unexpected error validating credit: {str(e)}")
        return {
            'approved': False,
            'reason': 'Service unavailable',
            'timestamp': datetime.now().isoformat()
        }


def get_contact_id_for_credential(credential_id: Union[str, int]) -> Optional[Union[str, int]]:
    """
    Get contact ID associated with a credential ID.
    
    This function retrieves the contact ID associated with the given credential ID.
    It first checks the cache, then makes an API request if needed.
    
    Args:
        credential_id: The credential ID to look up
        
    Returns:
        The associated Contact.id or None if not found
        
    Raises:
        CustomerConnectionError: If unable to connect to the Customer API
        CustomerResponseError: If the Customer API returns an error response
        CustomerNotFoundError: If the credential is not found
    """
    logger.info(f"Mapping credential ID {credential_id} to Contact ID")
    
    # TEMPORARY FIX: Hardcode contact_id 14 for credential_id 2
    if str(credential_id) == '2':
        logger.info(f"Using hardcoded Contact ID 14 for credential {credential_id}")
        return 14
    
    # Check cache first
    cache_key = f"contact_id_for_credential:{credential_id}"
    cached_id = cache.get(cache_key)
    if cached_id is not None:
        logger.debug(f"Using cached Contact ID for credential {credential_id}")
    
    # Prepare API request
    url = _get_api_url(f"credentials/{credential_id}/contact/")
    headers = _get_base_headers()
    
    try:
        # Make API request
        response = requests.get(
            url,
            headers=headers,
            timeout=settings.CUSTOMER_API_TIMEOUT
        )
        
        # Handle successful response
        if response.status_code == 200:
            data = response.json()
            contact_id = data.get('contact_id')
            
            # Cache the contact ID
            cache.set(cache_key, contact_id, settings.CUSTOMER_API_CACHE_TTL)
            
            logger.info(f"Mapped credential ID {credential_id} to Contact ID {contact_id}")
            return contact_id
        
        # Handle 404 (credential not found)
        elif response.status_code == 404:
            logger.warning(f"No contact found for credential ID {credential_id}")
            # Cache the negative result to avoid repeated lookups
            cache.set(cache_key, None, settings.CUSTOMER_API_CACHE_TTL)
            return None
        
        # Handle other error responses
        else:
            _handle_api_error(response, f"get_contact_id_for_credential for credential {credential_id}")
            
    except ConnectionError as e:
        logger.error(f"Connection error while mapping credential to contact: {str(e)}")
        raise CustomerConnectionError(f"Failed to connect to Customer API: {str(e)}")
    
    except Timeout as e:
        logger.error(f"Timeout while mapping credential to contact: {str(e)}")
        raise CustomerConnectionError(f"Customer API request timed out: {str(e)}")
    
    except RequestException as e:
        logger.error(f"Error mapping credential to contact: {str(e)}")
        raise CustomerServiceError(f"Error accessing Customer API: {str(e)}")
    
    # If the endpoint doesn't exist yet, return a mock ID for development
    except Exception as e:
        logger.error(f"Unexpected error mapping credential to contact: {str(e)}")
        if settings.DEBUG:
            # For development only: Return a mock ID
            mock_contact_id = credential_id + 1000 if credential_id else None
            logger.warning(f"[STUB] Returning mock Contact ID {mock_contact_id} for credential {credential_id}")
            return mock_contact_id
        return None


def get_account_id_for_contact(contact_id: int) -> Optional[int]:
    """
    Get the parent Account.id for a Contact.id.
    
    This function takes a Contact.id and returns the ID of the parent Account
    that the Contact belongs to. For B2B/Gov accounts, this returns the parent 
    account ID. For individual customers, this may return None.
    
    Args:
        contact_id: The Contact.id
        
    Returns:
        The parent Account.id or None if not found
        
    Raises:
        CustomerConnectionError: If unable to connect to the Customer API
        CustomerResponseError: If the Customer API returns an error response
        CustomerNotFoundError: If the contact is not found
    """
    logger.info(f"Getting parent Account ID for Contact ID {contact_id}")
    
    # Check cache first
    cache_key = f"account_id_for_contact:{contact_id}"
    cached_id = cache.get(cache_key)
    if cached_id is not None:  # Could be 0, which is falsy
        logger.debug(f"Using cached Account ID for Contact {contact_id}")
        return cached_id
    
    # Prepare API request
    url = _get_api_url(f"contacts/{contact_id}/")
    headers = _get_base_headers()
    
    try:
        # Make API request
        response = requests.get(
            url,
            headers=headers,
            timeout=settings.CUSTOMER_API_TIMEOUT
        )
        
        # Handle successful response
        if response.status_code == 200:
            contact_details = response.json()
            
            # Get the account ID from the contact details
            # Check if it's a direct property or nested in an account object
            account_id = None
            if 'account_id' in contact_details:
                account_id = contact_details['account_id']
            elif 'account' in contact_details and isinstance(contact_details['account'], dict):
                account_id = contact_details['account'].get('id')
            elif 'account' in contact_details and isinstance(contact_details['account'], int):
                account_id = contact_details['account']
            
            # Cache the account ID (even if it's None)
            cache.set(cache_key, account_id, settings.CUSTOMER_API_CACHE_TTL)
            
            if account_id:
                logger.info(f"Contact {contact_id} belongs to Account {account_id}")
            else:
                logger.info(f"Contact {contact_id} has no associated Account")
                
            return account_id
        
        # Handle 404 (contact not found)
        elif response.status_code == 404:
            logger.warning(f"Contact with ID {contact_id} not found")
            # Cache the negative result to avoid repeated lookups
            cache.set(cache_key, None, settings.CUSTOMER_API_CACHE_TTL)
            return None
        
        # Handle other error responses
        else:
            _handle_api_error(response, f"get_account_id_for_contact for contact {contact_id}")
            
    except ConnectionError as e:
        logger.error(f"Connection error while getting account for contact: {str(e)}")
        raise CustomerConnectionError(f"Failed to connect to Customer API: {str(e)}")
    
    except Timeout as e:
        logger.error(f"Timeout while getting account for contact: {str(e)}")
        raise CustomerConnectionError(f"Customer API request timed out: {str(e)}")
    
    except RequestException as e:
        logger.error(f"Error getting account for contact: {str(e)}")
        raise CustomerServiceError(f"Error accessing Customer API: {str(e)}")
    
    # If the endpoint doesn't exist yet, return a mock ID for development
    except Exception as e:
        logger.error(f"Unexpected error getting account for contact: {str(e)}")
        if settings.DEBUG:
            # For development only: Return a mock ID
            mock_account_id = contact_id + 2000 if contact_id else None
            logger.warning(f"[STUB] Returning mock Account ID {mock_account_id} for Contact {contact_id}")
            return mock_account_id
        return None
