"""
Utility functions for the ERP backend.

This module provides reusable utility functions that can be used across different apps
in the ERP system.
"""

import logging
import uuid
import requests
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


def send_api_notification(
    recipients: List[str],
    subject: str,
    body_text: str,
    channel: str = "email",
    provider_identifier: str = "zeptomail_smtp",
) -> Dict[str, Any]:
    """
    Send a notification via the notification API.

    This function formats the recipient list and content for the notification API
    and sends the request. It handles errors and returns the response.

    Args:
        recipients: List of email addresses to send the notification to
        subject: Subject line of the notification
        body_text: Main content of the notification
        channel: Notification channel (default: "email")
        provider_identifier: Provider to use for sending (default: "zeptomail_smtp")

    Returns:
        Dict containing success status and response data or error message
    """
    # Generate a unique correlation ID for tracking
    correlation_id = str(uuid.uuid4())

    # Format recipients as required by the API
    formatted_recipients = [{"email": email} for email in recipients]

    # Build the payload
    payload = {
        "correlation_id": correlation_id,
        "recipients": formatted_recipients,
        "content": {"subject": subject, "body_text": body_text},
        "channel": channel,
        "provider_identifier": provider_identifier,
    }

    print("iiiiiiiiiiiiiiiii839", payload)

    # API endpoint
    endpoint = "https://beconnect.turtleit.in/api/mail2/notifications/enqueue/"

    try:
        # Send the request
        response = requests.post(endpoint, json=payload)

        # Check if the request was successful
        if response.status_code in (200, 201, 202):
            logger.info(
                f"Notification sent successfully. Correlation ID: {correlation_id}"
            )
            return {
                "success": True,
                "correlation_id": correlation_id,
                "response": response.json() if response.content else {},
            }
        else:
            logger.error(
                f"Failed to send notification. Status code: {response.status_code}, Response: {response.text}"
            )
            return {
                "success": False,
                "correlation_id": correlation_id,
                "error": f"API returned status code {response.status_code}",
                "response": response.json() if response.content else {},
            }
    except requests.RequestException as e:
        logger.exception(f"Error sending notification: {str(e)}")
        return {
            "success": False,
            "correlation_id": correlation_id,
            "error": f"Request error: {str(e)}",
        }
    except Exception as e:
        logger.exception(f"Unexpected error sending notification: {str(e)}")
        return {
            "success": False,
            "correlation_id": correlation_id,
            "error": f"Unexpected error: {str(e)}",
        }
