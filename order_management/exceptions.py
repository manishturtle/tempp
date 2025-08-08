"""
Custom exceptions for the Order Management application.

This module defines a hierarchy of custom exceptions for the Order Management
application, organized by service integration. These exceptions allow for
more specific error handling and clearer error messages in API responses.
"""
from typing import Optional, Dict, Any


class OrderManagementError(Exception):
    """Base exception class for the Order Management application."""
    pass


# Inventory Service Exceptions
class InventoryServiceError(OrderManagementError):
    """Base exception for inventory service specific errors."""
    pass


class InventoryConnectionError(InventoryServiceError):
    """
    Exception raised when connection to inventory service fails.
    
    This exception is raised when the application cannot establish a connection
    to the inventory service, typically due to network issues, service downtime,
    or configuration problems.
    """
    pass


class InventoryResponseError(InventoryServiceError):
    """
    Exception raised when inventory service returns an error response.
    
    This exception is raised when the inventory service returns a non-success
    status code (not in 2xx range) or when the response cannot be parsed.
    
    Attributes:
        status_code: The HTTP status code returned by the inventory service
        message: The error message from the inventory service
    """
    def __init__(self, status_code: int, message: str, *args):
        self.status_code = status_code
        self.message = message
        super().__init__(f"Inventory service error: {status_code} - {message}", *args)


class InventoryReservationError(InventoryServiceError):
    """
    Exception raised specifically when inventory reservation fails.
    
    This exception is raised when the inventory service cannot reserve
    the requested inventory items for an order, typically due to insufficient
    stock, invalid SKUs, or other business rule violations.
    """
    pass


class InventoryReleaseError(InventoryServiceError):
    """
    Exception raised when releasing previously reserved inventory fails.
    
    This exception is raised when the inventory service cannot release
    previously reserved inventory, typically during order cancellation
    or modification.
    """
    pass


# Payment Service Exceptions
class PaymentServiceError(OrderManagementError):
    """
    Base exception for payment service specific errors.
    
    This is the parent exception for all payment service related errors,
    including connection issues, invalid responses, and business rule violations.
    """
    pass


class PaymentConnectionError(PaymentServiceError):
    """
    Exception raised when connection to payment service fails.
    
    This exception is raised when the application cannot establish a connection
    to the payment service, typically due to network issues, service downtime,
    or configuration problems.
    """
    pass


class PaymentResponseError(PaymentServiceError):
    """
    Exception raised when payment service returns an error response.
    
    This exception is raised when the payment service returns a non-success
    status code (not in 2xx range) or when the response cannot be parsed.
    
    Attributes:
        status_code: The HTTP status code returned by the payment service
        message: The error message from the payment service
    """
    def __init__(self, status_code: int, message: str, *args):
        self.status_code = status_code
        self.message = message
        super().__init__(f"Payment service error: {status_code} - {message}", *args)


class PaymentProcessingError(PaymentServiceError):
    """
    Exception raised when payment processing fails.
    
    This exception is raised when a payment cannot be processed due to
    business rule violations, such as insufficient funds, expired cards,
    or fraud detection.
    """
    pass


# Notification Service Exceptions
class NotificationServiceError(OrderManagementError):
    """
    Base exception for notification service specific errors.
    
    This is the parent exception for all notification service related errors,
    including connection issues, invalid responses, and delivery failures.
    """
    pass


class NotificationConnectionError(NotificationServiceError):
    """
    Exception raised when connection to notification service fails.
    
    This exception is raised when the application cannot establish a connection
    to the notification service, typically due to network issues, service downtime,
    or configuration problems.
    """
    pass


class NotificationResponseError(NotificationServiceError):
    """
    Exception raised when notification service returns an error response.
    
    This exception is raised when the notification service returns a non-success
    status code (not in 2xx range) or when the response cannot be parsed.
    
    Attributes:
        status_code: The HTTP status code returned by the notification service
        message: The error message from the notification service
    """
    def __init__(self, status_code: int, message: str, *args):
        self.status_code = status_code
        self.message = message
        super().__init__(f"Notification service error: {status_code} - {message}", *args)


class NotificationDeliveryError(NotificationServiceError):
    """
    Exception raised when notification delivery fails.
    
    This exception is raised when a notification cannot be delivered to the
    intended recipient, such as due to invalid email address, SMS delivery
    failure, or other delivery issues.
    """
    pass


class NotificationSendError(NotificationServiceError):
    """
    Exception raised when sending a notification fails.
    
    This exception is raised when the notification service fails to send
    a notification due to issues with the notification content, templates,
    or other sending-specific errors that occur before delivery attempts.
    """
    pass


# Customer Service Exceptions
class CustomerServiceError(OrderManagementError):
    """
    Base exception for customer service specific errors.
    
    This is the parent exception for all customer service related errors,
    including connection issues, invalid responses, and customer data errors.
    """
    pass


class CustomerConnectionError(CustomerServiceError):
    """
    Exception raised when connection to customer service fails.
    
    This exception is raised when the application cannot establish a connection
    to the customer service, typically due to network issues, service downtime,
    or configuration problems.
    """
    pass


class CustomerResponseError(CustomerServiceError):
    """
    Exception raised when customer service returns an error response.
    
    This exception is raised when the customer service returns a non-success
    status code (not in 2xx range) or when the response cannot be parsed.
    
    Attributes:
        status_code: The HTTP status code returned by the customer service
        message: The error message from the customer service
    """
    def __init__(self, status_code: int, message: str, *args):
        self.status_code = status_code
        self.message = message
        super().__init__(f"Customer service error: {status_code} - {message}", *args)


class CustomerNotFoundError(CustomerServiceError):
    """
    Exception raised when a customer cannot be found.
    
    This exception is raised when the requested customer does not exist
    in the customer service database.
    """
    pass


# Fulfillment Service Exceptions
class FulfillmentServiceError(OrderManagementError):
    """
    Base exception for fulfillment service specific errors.
    
    This is the parent exception for all fulfillment service related errors,
    including connection issues, invalid responses, and fulfillment process errors.
    """
    pass


class FulfillmentConnectionError(FulfillmentServiceError):
    """
    Exception raised when connection to fulfillment service fails.
    
    This exception is raised when the application cannot establish a connection
    to the fulfillment service, typically due to network issues, service downtime,
    or configuration problems.
    """
    pass


class FulfillmentResponseError(FulfillmentServiceError):
    """
    Exception raised when fulfillment service returns an error response.
    
    This exception is raised when the fulfillment service returns a non-success
    status code (not in 2xx range) or when the response cannot be parsed.
    
    Attributes:
        status_code: The HTTP status code returned by the fulfillment service
        message: The error message from the fulfillment service
    """
    def __init__(self, status_code: int, message: str, *args):
        self.status_code = status_code
        self.message = message
        super().__init__(f"Fulfillment service error: {status_code} - {message}", *args)


class FulfillmentProcessError(FulfillmentServiceError):
    """
    Exception raised when fulfillment processing fails.
    
    This exception is raised when an order cannot be fulfilled due to
    business rule violations, such as invalid shipping address, unavailable
    shipping method, or other fulfillment constraints.
    """
    pass


# Wallet Service Exceptions
class WalletServiceError(OrderManagementError):
    """
    Base exception for wallet service specific errors.
    
    This is the parent exception for all wallet service related errors,
    including connection issues, invalid responses, and wallet operation errors.
    """
    pass


class WalletInsufficientFundsError(WalletServiceError):
    """
    Exception raised when a wallet has insufficient funds.
    
    This exception is raised when a wallet operation cannot be completed
    due to insufficient funds in the wallet.
    """
    pass


# Loyalty Service Exceptions
class LoyaltyServiceError(OrderManagementError):
    """
    Base exception for loyalty service specific errors.
    
    This is the parent exception for all loyalty service related errors,
    including connection issues, invalid responses, and loyalty operation errors.
    """
    pass


class LoyaltyPointsError(LoyaltyServiceError):
    """
    Exception raised when a loyalty points operation fails.
    
    This exception is raised when a loyalty points operation (award, redeem)
    cannot be completed due to business rule violations.
    """
    pass
