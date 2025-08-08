"""Core clients package.

This package provides clients for interacting with external services.
"""
from .auth_service import AuthServiceClient
from .ecom_service import EcomApiClient


class APIClientError(Exception):
    """Base exception for API client errors.
    
    This exception is raised when an API client encounters an error
    communicating with an external service.
    """
    
    def __init__(self, message, status_code=None):
        """Initialize the exception.
        
        Args:
            message: Error message
            status_code: Optional HTTP status code
        """
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


__all__ = ['AuthServiceClient', 'EcomApiClient', 'APIClientError']
