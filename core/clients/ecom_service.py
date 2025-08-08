"""
E-commerce Service Client.

This module provides a client for interacting with the external E-commerce platform.
It handles user profile updates and other e-commerce related operations.
"""
import logging
import uuid
import requests
from typing import Dict, Any, Optional, Tuple, Union
from django.conf import settings

logger = logging.getLogger(__name__)


class EcomApiClient:
    """
    Client for the external E-commerce platform API.
    
    This client handles communication with the external E-commerce platform,
    providing methods for updating user profiles and other e-commerce operations.
    """
    
    def __init__(self, base_url: Optional[str] = None):
        """
        Initialize the E-commerce API Client.
        
        Args:
            base_url: Optional base URL for the E-commerce service. If not provided,
                     it will be read from settings.ECOM_SERVICE_URL.
        """
        self.base_url = base_url or getattr(settings, 'ECOM_SERVICE_URL', 'http://ecom-service')
        self.timeout = getattr(settings, 'ECOM_SERVICE_TIMEOUT', 30)
    
    def update_user_profile(self, ecomm_user_id: Union[str, uuid.UUID], profile_data: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        """
        Update a user's profile in the E-commerce platform.
        
        Args:
            ecomm_user_id: The unique identifier for the user in the E-commerce platform
            profile_data: Dictionary containing the profile data to update
            
        Returns:
            Tuple of (success, response_data)
            
        Raises:
            APIClientError: If there is an error communicating with the E-commerce service
        """
        from core.clients import APIClientError
        
        # Convert UUID to string if needed
        if isinstance(ecomm_user_id, uuid.UUID):
            ecomm_user_id = str(ecomm_user_id)
        
        # Validate profile data
        if not profile_data:
            logger.warning("Empty profile data provided for user %s", ecomm_user_id)
            return True, {"message": "No profile data to update"}
        
        endpoint = f"{self.base_url}/api/users/{ecomm_user_id}/profile"
        
        try:
            response = requests.patch(
                endpoint, 
                json=profile_data, 
                timeout=self.timeout
            )
            response_data = response.json()
            
            if response.status_code == 200:
                logger.info("Successfully updated profile for user %s", ecomm_user_id)
                return True, response_data
            else:
                logger.error(
                    "Failed to update profile for user %s: %s (Status: %d)",
                    ecomm_user_id, response_data.get("error", "Unknown error"), response.status_code
                )
                return False, response_data
        except requests.RequestException as e:
            logger.exception("Error communicating with E-commerce service: %s", str(e))
            raise APIClientError(f"Error communicating with E-commerce service: {str(e)}")
        except Exception as e:
            logger.exception("Unexpected error updating user profile: %s", str(e))
            raise APIClientError(f"Unexpected error updating user profile: {str(e)}")
