"""
Auth Service Client.

This module provides a client for interacting with the external Authentication Service.
It handles user registration, login, password reset, and other authentication operations.
"""
import logging
import requests
import jwt
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Tuple
from django.conf import settings
from ecomm_auth.models import EcommUserCredential
from django.contrib.auth.hashers import check_password
logger = logging.getLogger(__name__)


class AuthServiceClient:
    """
    Client for the external Authentication Service.
    
    This client handles communication with the external Auth microservice,
    providing methods for user registration, login, password reset, etc.
    """
    
    def __init__(self, base_url: Optional[str] = None):
        """
        Initialize the Auth Service Client.
        
        Args:
            base_url: Optional base URL for the Auth service. If not provided,
                      it will be read from settings.AUTH_SERVICE_URL.
        """
        self.base_url = base_url or getattr(settings, 'AUTH_SERVICE_URL', 'http://auth-service')
        self.timeout = getattr(settings, 'AUTH_SERVICE_TIMEOUT', 10)  # seconds
    
    def register(self, email: str, password: str) -> Tuple[bool, Dict[str, Any]]:
        """
        Register a new user with the Auth service.
        
        Args:
            email: User's email address
            password: User's password
            
        Returns:
            Tuple containing:
                - Success flag (True/False)
                - Response data dictionary (includes user_id if successful)
        """
        try:
            response = requests.post(
                f"{self.base_url}/api/register",
                json={"email": email, "password": password},
                timeout=self.timeout
            )
            
            if response.status_code == 201:
                return True, response.json()
            else:
                logger.error(
                    f"Auth service registration failed: {response.status_code} - {response.text}"
                )
                return False, {"error": response.json().get("detail", "Registration failed")}
                
        except requests.RequestException as e:
            logger.exception(f"Auth service connection error during registration: {str(e)}")
            return False, {"error": "Connection error with authentication service"}
    
    def login(self, email: str, password: str) -> Tuple[bool, Dict[str, Any]]:
        """
        Authenticate a user with the Auth service.
        
        Args:
            email: User's email address
            password: User's password
            
        Returns:
            Tuple containing:
                - Success flag (True/False)
                - Response data dictionary (includes tokens if successful)
        """            

        # check user into ecomm_auth_ecommusercredential this table and if user is exists do login
        #      
           # For testing purposes: Accept specific test credentials
        if email == "test.admin@turtlesoft.com" and password == "Test@123456":
            # Generate a valid JWT token for testing
            # Set the expiration time for the access token (1 day from now)
            access_exp = datetime.utcnow() + timedelta(days=1)
            # Set the expiration time for the refresh token (7 days from now)
            refresh_exp = datetime.utcnow() + timedelta(days=7)
            
            # Create the payload for the access token
            access_payload = {
                'token_type': 'access',
                'exp': access_exp,
                'iat': datetime.utcnow(),
                'jti': '123456789',  # Unique identifier for the token
                'user_id': 1,  # Mock user ID
                'username': 'test.admin@turtlesoft.com',
                'is_staff': True,
                'is_superuser': True
            }
            
            # Create the payload for the refresh token
            refresh_payload = {
                'token_type': 'refresh',
                'exp': refresh_exp,
                'iat': datetime.utcnow(),
                'jti': '987654321',  # Unique identifier for the token
                'user_id': 1  # Mock user ID
            }
            
            # Generate the JWT tokens
            access_token = jwt.encode(access_payload, settings.SECRET_KEY, algorithm='HS256')
            refresh_token = jwt.encode(refresh_payload, settings.SECRET_KEY, algorithm='HS256')
            
            # Return the tokens
            return True, {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "Bearer"
            }
        
        # For regular operation, try to connect to the external service
        try:
            response = requests.post(
                f"{self.base_url}/api/v1/auth/login/",
                json={"email": email, "password": password},
                timeout=self.timeout
            )
            print("response............" ,response)
            
            if response.status_code == 200:
                return True, response.json()
            else:
                logger.error(
                    f"Auth service login failed: {response.status_code} - {response.text}"
                )
                return False, {"error": response.json().get("detail", "Login failed")}
                
        except requests.RequestException as e:
            logger.exception(f"Auth service connection error during login: {str(e)}")
            return False, {"error": "Connection error with authentication service"}
    


    # def login(self, email: str, password: str) -> Tuple[bool, Dict[str, Any]]:
    #     try:
    #         # Query user by email
    #         user = EcommUserCredential.objects.filter(email=email)

            
    #         if user and  check_password(password, "pbkdf2_sha256$720000$SLgmwDAKbBPXPQLUA3GFEe$swIu0O9eHS8FWov9IqaJiivOAqu9KDHNpnToePjylK0="):
    #             # Generate tokens (same as your current logic)
    #             access_exp = datetime.utcnow() + timedelta(hours=1)
    #             refresh_exp = datetime.utcnow() + timedelta(days=7)
                
    #             access_payload = {
    #                 'token_type': 'access',
    #                 'exp': access_exp,
    #                 'iat': datetime.utcnow(),
    #                 'jti': '123456789',
    #                 'user_id': user.id,
    #                 'username': user.email,
    #                 'is_staff': user.is_staff,
    #                 'is_superuser': user.is_superuser
    #             }

    #             refresh_payload = {
    #                 'token_type': 'refresh',
    #                 'exp': refresh_exp,
    #                 'iat': datetime.utcnow(),
    #                 'jti': '987654321',
    #                 'user_id': user.id
    #             }

    #             access_token = jwt.encode(access_payload, settings.SECRET_KEY, algorithm='HS256')
    #             refresh_token = jwt.encode(refresh_payload, settings.SECRET_KEY, algorithm='HS256')

    #             return True, {
    #                 "access_token": access_token,
    #                 "refresh_token": refresh_token,
    #                 "token_type": "Bearer"
    #             }

    #         return False, {"error": "Invalid email or password"}

    #     except Exception as e:
    #         logger.exception(f"Login error: {str(e)}")
    #         return False, {"error": "Internal server error"}

    
    def initiate_password_reset(self, email: str) -> Tuple[bool, Dict[str, Any]]:
        """
        Initiate a password reset process for a user.
        
        Args:
            email: User's email address
            
        Returns:
            Tuple containing:
                - Success flag (True/False)
                - Response data dictionary
        """
        try:
            response = requests.post(
                f"{self.base_url}/api/password-reset",
                json={"email": email},
                timeout=self.timeout
            )
            
            # Always return success to prevent email enumeration
            if response.status_code in (200, 202, 204):
                return True, {}
            else:
                logger.error(
                    f"Auth service password reset failed: {response.status_code} - {response.text}"
                )
                # Still return success to client to prevent email enumeration
                return True, {}
                
        except requests.RequestException as e:
            logger.exception(f"Auth service connection error during password reset: {str(e)}")
            return False, {"error": "Connection error with authentication service"}
    
    def verify_email(self, token: str) -> Tuple[bool, Dict[str, Any]]:
        """
        Verify a user's email address using a verification token.
        
        Args:
            token: Email verification token
            
        Returns:
            Tuple containing:
                - Success flag (True/False)
                - Response data dictionary
        """
        try:
            response = requests.post(
                f"{self.base_url}/api/verify-email",
                json={"token": token},
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                return True, response.json()
            else:
                logger.error(
                    f"Auth service email verification failed: {response.status_code} - {response.text}"
                )
                return False, {"error": response.json().get("detail", "Email verification failed")}
                
        except requests.RequestException as e:
            logger.exception(f"Auth service connection error during email verification: {str(e)}")
            return False, {"error": "Connection error with authentication service"}
