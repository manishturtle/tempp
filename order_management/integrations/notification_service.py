"""
Notification Service Integration Stubs.

This module provides stub implementations for the Notification Service API.
These stubs simulate interactions with Zepto Mail and other notification
services, allowing Order Management logic development before full integration.
"""
from typing import Dict, Any, Optional, List, Union
import uuid
import logging
import random
import requests
from datetime import datetime
from django.conf import settings
from celery import shared_task

from order_management.exceptions import (
    NotificationServiceError,
    NotificationConnectionError,
    NotificationResponseError,
    NotificationDeliveryError
)

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=5, acks_late=True)
def send_transactional_email(
    self,
    tenant_identifier: str,
    recipient_email: str,
    template_key: str,
    context: Dict[str, Any],
    cc: Optional[List[str]] = None,
    bcc: Optional[List[str]] = None,
    attachments: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Send a transactional email via the Notification Service.
    
    Args:
        self: The task instance (provided by bind=True)
        tenant_identifier: The tenant identifier
        recipient_email: The recipient's email address
        template_key: The email template key
        context: Template context for personalization
        cc: Optional list of CC recipients
        bcc: Optional list of BCC recipients
        attachments: Optional list of attachments
        
    Returns:
        Dictionary with status information
        
    Raises:
        NotificationConnectionError: If connection to notification service fails
        NotificationResponseError: If notification service returns an error response
        NotificationDeliveryError: If email delivery fails
    """
    logger.info(f"Sending email to {recipient_email}, Template: {template_key} (Tenant: {tenant_identifier}) (Attempt {self.request.retries + 1}/{self.max_retries + 1})")
    
    # Generate a unique message ID for idempotency and tracking
    message_id = f"{tenant_identifier}-{template_key}-{hash(recipient_email)}-{int(time.time())}"
    
    # Check for idempotency - we could implement a check here if needed
    # For example, checking a cache or database for this message_id
    
    try:
        # Construct the Notification Service URL
        endpoint = "/notifications/email/transactional/"
        url = f"{settings.NOTIFICATION_MS_URL.rstrip('/')}{endpoint}"
        
        # Prepare the payload
        payload = {
            "tenant_id": tenant_identifier,  # Real tenant identifier
            "recipient_email": recipient_email,
            "template_key": template_key,
            "context": context,
            "cc": cc or [],
            "bcc": bcc or [],
            "attachments": attachments or [],
            "message_id": message_id  # Add message_id for tracking and idempotency
        }
        
        # Set up headers with authentication
        headers = {
            "Authorization": f"Bearer {settings.NOTIFICATION_MS_API_KEY}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-Idempotency-Key": message_id  # Add idempotency key in header
        }
        
        # Make the request to the Notification Service
        try:
            response = requests.post(
                url,
                json=payload,
                headers=headers,
                timeout=15  # Set a reasonable timeout
            )
            
            # Check for successful response
            response.raise_for_status()
            
            # Parse and validate response
            response_data = response.json()
            
            # Check if email was queued successfully
            if response_data.get('status') != 'queued':
                error_msg = response_data.get('message', 'Unknown error')
                logger.error(f"Email not queued for {recipient_email} (Tenant: {tenant_identifier}): {error_msg}")
                raise NotificationDeliveryError(f"Email not queued: {error_msg}")
                
            logger.info(f"Successfully queued email to {recipient_email} (Tenant: {tenant_identifier})")
            
            return response_data
            
        except requests.exceptions.ConnectionError as e:
            logger.error(f"Connection error while sending email to {recipient_email} (Tenant: {tenant_identifier}): {str(e)}")
            
            # Retry with exponential backoff
            retry_in = 2 ** self.request.retries  # 1, 2, 4, 8, 16 seconds
            raise self.retry(exc=e, countdown=retry_in)
            
        except requests.exceptions.Timeout as e:
            logger.error(f"Timeout while sending email to {recipient_email} (Tenant: {tenant_identifier}): {str(e)}")
            
            # Retry with exponential backoff
            retry_in = 2 ** self.request.retries
            raise self.retry(exc=e, countdown=retry_in)
            
        except requests.exceptions.HTTPError as e:
            status_code = e.response.status_code
            message = str(e)
            logger.error(f"HTTP error {status_code} while sending email to {recipient_email} (Tenant: {tenant_identifier}): {message}")
            
            # Retry server errors (5xx) but not client errors (4xx)
            if 500 <= status_code < 600:
                retry_in = 2 ** self.request.retries
                raise self.retry(exc=e, countdown=retry_in)
                
            raise NotificationResponseError(status_code, message) from e
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Request error while sending email to {recipient_email} (Tenant: {tenant_identifier}): {str(e)}")
            
            # Retry with exponential backoff
            retry_in = 2 ** self.request.retries
            raise self.retry(exc=e, countdown=retry_in)
            
    except self.MaxRetriesExceededError:
        logger.error(f"Max retries exceeded while sending email to {recipient_email} (Tenant: {tenant_identifier})")
        raise NotificationDeliveryError(f"Failed to send email after {self.max_retries} attempts")
        
    except Exception as e:
        if not isinstance(e, (NotificationResponseError, NotificationDeliveryError)):
            logger.error(f"Unexpected error while sending email to {recipient_email} (Tenant: {tenant_identifier}): {str(e)}")
            raise NotificationServiceError(f"Unexpected error: {str(e)}") from e
        raise


def send_sms(
    tenant_identifier: str,
    phone_number: str,
    message: str,
    sender_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Send an SMS notification.
    
    Args:
        tenant_identifier: The tenant identifier
        phone_number: The recipient's phone number
        message: The SMS message content
        sender_id: Optional sender identifier
        
    Returns:
        Dictionary with status information
        
    Raises:
        NotificationConnectionError: If connection to notification service fails
        NotificationResponseError: If notification service returns an error response
        NotificationDeliveryError: If SMS delivery fails
    """
    logger.info(f"Sending SMS to {phone_number} (Tenant: {tenant_identifier})")
    
    try:
        # Construct the Notification Service URL
        endpoint = "/notifications/sms/"
        url = f"{settings.NOTIFICATION_MS_URL.rstrip('/')}{endpoint}"
        
        # Prepare the payload
        payload = {
            "tenant_id": tenant_identifier,  # Real tenant identifier
            "phone_number": phone_number,
            "message": message,
            "sender_id": sender_id
        }
        
        # Set up headers with authentication
        headers = {
            "Authorization": f"Bearer {settings.NOTIFICATION_MS_API_KEY}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        # Make the request to the Notification Service
        response = requests.post(
            url,
            json=payload,
            headers=headers,
            timeout=10  # Set a reasonable timeout
        )
        
        # Check for successful response
        response.raise_for_status()
        
        # Parse and validate response
        response_data = response.json()
        
        # Check if SMS was queued successfully
        if response_data.get('status') != 'queued':
            error_msg = response_data.get('message', 'Unknown error')
            logger.error(f"SMS not queued for {phone_number} (Tenant: {tenant_identifier}): {error_msg}")
            raise NotificationDeliveryError(f"SMS not queued: {error_msg}")
            
        logger.info(f"Successfully queued SMS to {phone_number} (Tenant: {tenant_identifier})")
        
        return response_data
        
    except requests.exceptions.ConnectionError as e:
        logger.error(f"Connection error while sending SMS to {phone_number} (Tenant: {tenant_identifier}): {str(e)}")
        raise NotificationConnectionError(f"Failed to connect to notification service") from e
        
    except requests.exceptions.Timeout as e:
        logger.error(f"Timeout while sending SMS to {phone_number} (Tenant: {tenant_identifier}): {str(e)}")
        raise NotificationConnectionError(f"Connection to notification service timed out") from e
        
    except requests.exceptions.HTTPError as e:
        status_code = e.response.status_code
        message = str(e)
        logger.error(f"HTTP error {status_code} while sending SMS to {phone_number} (Tenant: {tenant_identifier}): {message}")
        raise NotificationResponseError(status_code, message) from e
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Request error while sending SMS to {phone_number} (Tenant: {tenant_identifier}): {str(e)}")
        raise NotificationConnectionError(f"Request error: {str(e)}") from e
        
    except Exception as e:
        logger.error(f"Unexpected error while sending SMS to {phone_number} (Tenant: {tenant_identifier}): {str(e)}")
        raise NotificationServiceError(f"Unexpected error: {str(e)}") from e


def send_push_notification(
    tenant_identifier: str,
    user_id: int,
    title: str,
    body: str,
    data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Send a push notification.
    
    Args:
        tenant_identifier: The tenant identifier
        user_id: The recipient user identifier
        title: The notification title
        body: The notification body
        data: Optional additional data payload
        
    Returns:
        Dictionary with status information
        
    Raises:
        NotificationConnectionError: If connection to notification service fails
        NotificationResponseError: If notification service returns an error response
        NotificationDeliveryError: If push notification delivery fails
    """
    logger.info(f"Sending push notification to user {user_id} (Tenant: {tenant_identifier})")
    
    try:
        # Construct the Notification Service URL
        endpoint = "/notifications/push/"
        url = f"{settings.NOTIFICATION_MS_URL.rstrip('/')}{endpoint}"
        
        # Prepare the payload
        payload = {
            "tenant_id": tenant_identifier,  # Real tenant identifier
            "user_id": user_id,
            "title": title,
            "body": body,
            "data": data or {}
        }
        
        # Set up headers with authentication
        headers = {
            "Authorization": f"Bearer {settings.NOTIFICATION_MS_API_KEY}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        # Make the request to the Notification Service
        response = requests.post(
            url,
            json=payload,
            headers=headers,
            timeout=10  # Set a reasonable timeout
        )
        
        # Check for successful response
        response.raise_for_status()
        
        # Parse and validate response
        response_data = response.json()
        
        # Check if push notification was queued successfully
        if response_data.get('status') != 'queued':
            error_msg = response_data.get('message', 'Unknown error')
            logger.error(f"Push notification not queued for user {user_id} (Tenant: {tenant_identifier}): {error_msg}")
            raise NotificationDeliveryError(f"Push notification not queued: {error_msg}")
            
        logger.info(f"Successfully queued push notification to user {user_id} (Tenant: {tenant_identifier})")
        
        return response_data
        
    except requests.exceptions.ConnectionError as e:
        logger.error(f"Connection error while sending push notification to user {user_id} (Tenant: {tenant_identifier}): {str(e)}")
        raise NotificationConnectionError(f"Failed to connect to notification service") from e
        
    except requests.exceptions.Timeout as e:
        logger.error(f"Timeout while sending push notification to user {user_id} (Tenant: {tenant_identifier}): {str(e)}")
        raise NotificationConnectionError(f"Connection to notification service timed out") from e
        
    except requests.exceptions.HTTPError as e:
        status_code = e.response.status_code
        message = str(e)
        logger.error(f"HTTP error {status_code} while sending push notification to user {user_id} (Tenant: {tenant_identifier}): {message}")
        raise NotificationResponseError(status_code, message) from e
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Request error while sending push notification to user {user_id} (Tenant: {tenant_identifier}): {str(e)}")
        raise NotificationConnectionError(f"Request error: {str(e)}") from e
        
    except Exception as e:
        logger.error(f"Unexpected error while sending push notification to user {user_id} (Tenant: {tenant_identifier}): {str(e)}")
        raise NotificationServiceError(f"Unexpected error: {str(e)}") from e


def get_notification_templates(tenant_identifier: str, category: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Get available notification templates.
    
    Args:
        tenant_identifier: The tenant identifier
        category: Optional template category filter
        
    Returns:
        List of available notification templates
    """
    logger.info(f"Getting notification templates (Tenant: {tenant_identifier}), Category: {category or 'All'}")
    
    try:
        # Construct the Notification Service URL
        endpoint = f"/tenants/{tenant_identifier}/templates/"
        url = f"{settings.NOTIFICATION_MS_URL.rstrip('/')}{endpoint}"
        
        # Set up query parameters
        params = {}
        if category:
            params['category'] = category
        
        # Set up headers with authentication
        headers = {
            "Authorization": f"Bearer {settings.NOTIFICATION_MS_API_KEY}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        # Make the request to the Notification Service
        response = requests.get(
            url,
            params=params,
            headers=headers,
            timeout=10  # Set a reasonable timeout
        )
        
        # Check for successful response
        response.raise_for_status()
        
        # Parse and validate response
        templates = response.json()
        
        # Basic validation of response structure
        if not isinstance(templates, list):
            logger.error(f"Invalid response format from Notification MS for tenant {tenant_identifier}: expected list, got {type(templates)}")
            return []
            
        return templates
        
    except Exception as e:
        # For this endpoint, we'll just log errors and return a default list
        # rather than raising exceptions
        logger.error(f"Error getting notification templates for tenant {tenant_identifier}: {str(e)}")
        
        # Define mock templates
        all_templates = [
            {
                'id': 'order_confirmation',
                'name': 'Order Confirmation',
                'category': 'ORDER',
                'channels': ['EMAIL', 'SMS'],
                'variables': ['order_id', 'customer_name', 'order_total', 'order_date']
            },
            {
                'id': 'order_shipped',
                'name': 'Order Shipped',
                'category': 'ORDER',
                'channels': ['EMAIL', 'SMS', 'PUSH'],
                'variables': ['order_id', 'customer_name', 'tracking_number', 'carrier']
            },
            {
                'id': 'order_delivered',
                'name': 'Order Delivered',
                'category': 'ORDER',
                'channels': ['EMAIL', 'PUSH'],
                'variables': ['order_id', 'customer_name', 'delivery_date']
            },
            {
                'id': 'payment_received',
                'name': 'Payment Received',
                'category': 'PAYMENT',
                'channels': ['EMAIL'],
                'variables': ['order_id', 'customer_name', 'payment_amount', 'payment_date']
            },
            {
                'id': 'payment_failed',
                'name': 'Payment Failed',
                'category': 'PAYMENT',
                'channels': ['EMAIL', 'SMS'],
                'variables': ['order_id', 'customer_name', 'payment_amount', 'error_message']
            },
            {
                'id': 'refund_processed',
                'name': 'Refund Processed',
                'category': 'PAYMENT',
                'channels': ['EMAIL'],
                'variables': ['order_id', 'customer_name', 'refund_amount', 'refund_date']
            }
        ]
        
        # Filter by category if provided
        if category:
            return [t for t in all_templates if t['category'] == category]
        
        return all_templates
