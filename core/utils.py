"""
Utility functions for the core app.

This module contains utility functions used throughout the application,
including custom exception handling for consistent error responses.
"""

from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    """
    Custom exception handler for DRF that formats errors with consistent error codes.
    
    This handler wraps the default DRF exception handler and reformats the response
    to include an error_code that can be used for frontend translation mapping.
    
    Args:
        exc: The exception that was raised
        context: The context of the exception
        
    Returns:
        Response: A formatted error response with error_code, message, and details
    """
    # Call DRF's default exception handler first to get the standard error response
    response = exception_handler(exc, context)
    
    # If response is None, then DRF didn't handle the exception
    # In this case, we let Django handle it (500 error)
    if response is None:
        return None
    
    # Default error code and message
    error_code = "SERVER_ERROR"
    message = "An unexpected error occurred."
    
    # Map status codes to error codes
    if response.status_code == 400:
        error_code = "VALIDATION_ERROR"
        message = "The request contains invalid parameters."
    elif response.status_code == 401:
        error_code = "AUTHENTICATION_FAILED"
        message = "Authentication credentials were not provided or are invalid."
    elif response.status_code == 403:
        error_code = "PERMISSION_DENIED"
        message = "You do not have permission to perform this action."
    elif response.status_code == 404:
        error_code = "NOT_FOUND"
        message = "The requested resource was not found."
    elif response.status_code == 405:
        error_code = "METHOD_NOT_ALLOWED"
        message = "The requested method is not allowed for this resource."
    elif response.status_code == 429:
        error_code = "RATE_LIMIT_EXCEEDED"
        message = "Too many requests. Please try again later."
    
    # Format the error response
    error_response = {
        "error_code": error_code,
        "message": message,
        "details": response.data
    }
    
    # Return the formatted error response
    return Response(error_response, status=response.status_code)
