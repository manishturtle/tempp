"""API client classes for external service integration.

This module provides base classes and specific client implementations for
interacting with external services such as the Auth microservice and
Product/Inventory APIs.
"""
from typing import Any, Dict, List, Optional, TypeVar, Generic, Union
from enum import Enum
import json
from urllib.parse import urljoin

import httpx
from django.conf import settings
from pydantic import BaseModel, Field


# Base exceptions for API clients
class APIClientError(Exception):
    """Base exception for API client errors."""
    def __init__(self, message: str, status_code: Optional[int] = None, response: Optional[Any] = None):
        self.message = message
        self.status_code = status_code
        self.response = response
        super().__init__(self.message)


class APINotFoundError(APIClientError):
    """Exception raised when a resource is not found."""
    pass


class APIAuthenticationError(APIClientError):
    """Exception raised when authentication fails."""
    pass


class APIValidationError(APIClientError):
    """Exception raised when request validation fails."""
    pass


# Base API client class
class BaseApiClient(httpx.AsyncClient):
    """Base class for API clients.
    
    This class extends httpx.AsyncClient to provide common functionality for
    making API requests to external services.
    """
    def __init__(
        self, 
        base_url: str,
        timeout: float = 10.0,
        headers: Optional[Dict[str, str]] = None,
        **kwargs
    ):
        """Initialize the API client.
        
        Args:
            base_url: The base URL for the API
            timeout: Request timeout in seconds
            headers: Default headers for all requests
            **kwargs: Additional arguments passed to httpx.AsyncClient
        """
        self.base_url = base_url
        default_headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        }
        if headers:
            default_headers.update(headers)
            
        super().__init__(
            base_url=base_url,
            timeout=timeout,
            headers=default_headers,
            **kwargs
        )
    
    async def _request(
        self, 
        method: str, 
        endpoint: str, 
        **kwargs
    ) -> Dict[str, Any]:
        """Make a request to the API and handle common error cases.
        
        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint (will be joined with base_url)
            **kwargs: Additional arguments passed to httpx.AsyncClient.request
            
        Returns:
            Parsed JSON response
            
        Raises:
            APINotFoundError: If the resource is not found (404)
            APIAuthenticationError: If authentication fails (401, 403)
            APIValidationError: If request validation fails (422)
            APIClientError: For other client errors (4xx)
            APIClientError: For server errors (5xx)
        """
        url = urljoin(self.base_url, endpoint)
        
        try:
            response = await super().request(method, url, **kwargs)
            response.raise_for_status()
            
            if response.status_code == 204:  # No content
                return {}
                
            return response.json()
            
        except httpx.HTTPStatusError as e:
            status_code = e.response.status_code
            try:
                error_data = e.response.json()
            except json.JSONDecodeError:
                error_data = {"detail": e.response.text}
            
            error_message = error_data.get("detail", str(e))
            
            if status_code == 404:
                raise APINotFoundError(error_message, status_code, error_data)
            elif status_code in (401, 403):
                raise APIAuthenticationError(error_message, status_code, error_data)
            elif status_code == 422:
                raise APIValidationError(error_message, status_code, error_data)
            elif 400 <= status_code < 500:
                raise APIClientError(f"Client error: {error_message}", status_code, error_data)
            elif 500 <= status_code < 600:
                raise APIClientError(f"Server error: {error_message}", status_code, error_data)
            else:
                raise APIClientError(f"Unexpected error: {error_message}", status_code, error_data)
                
        except httpx.RequestError as e:
            raise APIClientError(f"Request failed: {str(e)}")


# Auth Service Client
class AuthServiceClient(BaseApiClient):
    """Client for interacting with the Auth microservice.
    
    This client provides methods for user registration, login, token validation,
    and password reset functionality.
    """
    def __init__(self, base_url: Optional[str] = None, **kwargs):
        """Initialize the Auth Service client.
        
        Args:
            base_url: The base URL for the Auth microservice API
            **kwargs: Additional arguments passed to BaseApiClient
        """
        base_url = base_url or settings.AUTH_SERVICE_URL
        super().__init__(base_url=base_url, **kwargs)
    
    async def register(self, email: str, password: str, **user_data) -> Dict[str, Any]:
        """Register a new user with the Auth microservice.
        
        Args:
            email: User's email address
            password: User's password
            **user_data: Additional user data (name, etc.)
            
        Returns:
            Response data from the Auth microservice
            
        Raises:
            APIValidationError: If registration validation fails
            APIClientError: For other errors
        """
        payload = {
            "email": email,
            "password": password,
            **user_data
        }
        
        return await self._request("POST", "/api/v1/auth/register/", json=payload)
    
    async def login(self, email: str, password: str) -> Dict[str, Any]:
        """Authenticate a user with the Auth microservice.
        
        Args:
            email: User's email address
            password: User's password
            
        Returns:
            Response data including authentication tokens
            
        Raises:
            APIAuthenticationError: If authentication fails
            APIClientError: For other errors
        """
        payload = {
            "email": email,
            "password": password
        }
        
        return await self._request("POST", "/api/v1/auth/login/", json=payload)
    
    async def validate_token(self, token: str) -> Dict[str, Any]:
        """Validate a JWT token with the Auth microservice.
        
        Args:
            token: JWT token to validate
            
        Returns:
            Response data including token validity and user info
            
        Raises:
            APIAuthenticationError: If the token is invalid
            APIClientError: For other errors
        """
        headers = {"Authorization": f"Bearer {token}"}
        
        return await self._request("POST", "/api/v1/auth/validate-token/", headers=headers)
    
    async def initiate_password_reset(self, email: str) -> Dict[str, Any]:
        """Initiate a password reset process for a user.
        
        Args:
            email: User's email address
            
        Returns:
            Response data from the Auth microservice
            
        Raises:
            APINotFoundError: If the user is not found
            APIClientError: For other errors
        """
        payload = {"email": email}
        
        return await self._request("POST", "/api/v1/auth/password-reset/", json=payload)
    
    async def complete_password_reset(self, token: str, new_password: str) -> Dict[str, Any]:
        """Complete a password reset process.
        
        Args:
            token: Password reset token
            new_password: New password
            
        Returns:
            Response data from the Auth microservice
            
        Raises:
            APIValidationError: If the token is invalid or password doesn't meet requirements
            APIClientError: For other errors
        """
        payload = {
            "token": token,
            "new_password": new_password
        }
        
        return await self._request("POST", "/api/v1/auth/password-reset/confirm/", json=payload)


# Product data models
class ProductData(BaseModel):
    """Data model for product information."""
    id: str
    name: str
    description: Optional[str] = None
    sku: Optional[str] = None
    price: float
    currency: str = "USD"
    is_active: bool = True
    attributes: Dict[str, Any] = Field(default_factory=dict)


# Product API client
class ProductClient(BaseApiClient):
    """Client for interacting with the external Product API.
    
    This client provides methods for retrieving product information.
    """
    def __init__(self, base_url: Optional[str] = None, **kwargs):
        """Initialize the Product API client.
        
        Args:
            base_url: The base URL for the Product API
            **kwargs: Additional arguments passed to BaseApiClient
        """
        base_url = base_url or settings.PRODUCT_API_URL
        super().__init__(base_url=base_url, **kwargs)
    
    async def get_product(self, product_id: str) -> ProductData:
        """Retrieve product information by ID.
        
        Args:
            product_id: The ID of the product to retrieve
            
        Returns:
            ProductData object with product information
            
        Raises:
            APINotFoundError: If the product is not found
            APIClientError: For other errors
        """
        response = await self._request("GET", f"/api/v1/products/{product_id}/")
        return ProductData(**response)
    
    async def search_products(self, query: str, **filters) -> List[ProductData]:
        """Search for products matching the given query and filters.
        
        Args:
            query: Search query string
            **filters: Additional filters (category, price_range, etc.)
            
        Returns:
            List of ProductData objects matching the search criteria
            
        Raises:
            APIClientError: If the request fails
        """
        params = {"q": query, **filters}
        response = await self._request("GET", "/api/v1/products/", params=params)
        
        return [ProductData(**item) for item in response.get("results", [])]


# Inventory data models
class InventoryData(BaseModel):
    """Data model for inventory information."""
    product_id: str
    quantity: int
    warehouse_id: Optional[str] = None
    is_in_stock: bool = Field(...)
    expected_restock_date: Optional[str] = None
    
    @property
    def is_in_stock(self) -> bool:
        """Check if the product is in stock."""
        return self.quantity > 0


# Inventory API client
class InventoryClient(BaseApiClient):
    """Client for interacting with the external Inventory API.
    
    This client provides methods for retrieving inventory information.
    """
    def __init__(self, base_url: Optional[str] = None, **kwargs):
        """Initialize the Inventory API client.
        
        Args:
            base_url: The base URL for the Inventory API
            **kwargs: Additional arguments passed to BaseApiClient
        """
        base_url = base_url or settings.INVENTORY_API_URL
        super().__init__(base_url=base_url, **kwargs)
    
    async def get_stock_level(self, product_id: str, warehouse_id: Optional[str] = None) -> InventoryData:
        """Retrieve stock level information for a product.
        
        Args:
            product_id: The ID of the product
            warehouse_id: Optional warehouse ID to filter by
            
        Returns:
            InventoryData object with stock level information
            
        Raises:
            APINotFoundError: If the product or warehouse is not found
            APIClientError: For other errors
        """
        params = {"product_id": product_id}
        if warehouse_id:
            params["warehouse_id"] = warehouse_id
            
        response = await self._request("GET", "/api/v1/inventory/", params=params)
        
        # Handle case where API returns a list of inventory items
        if isinstance(response, list) and response:
            return InventoryData(**response[0])
        # Handle case where API returns a single inventory item
        elif isinstance(response, dict):
            return InventoryData(**response)
        else:
            raise APINotFoundError(f"No inventory data found for product {product_id}")
    
    async def get_stock_levels_bulk(self, product_ids: List[str]) -> Dict[str, InventoryData]:
        """Retrieve stock level information for multiple products.
        
        Args:
            product_ids: List of product IDs
            
        Returns:
            Dictionary mapping product IDs to InventoryData objects
            
        Raises:
            APIClientError: If the request fails
        """
        params = {"product_ids": ",".join(product_ids)}
        response = await self._request("GET", "/api/v1/inventory/bulk/", params=params)
        
        result = {}
        for item in response:
            product_id = item.get("product_id")
            if product_id:
                result[product_id] = InventoryData(**item)
                
        return result
