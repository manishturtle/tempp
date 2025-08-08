"""
Configuration Service Integration Stubs.

This module provides stub implementations for the Configuration Service API.
These stubs simulate interactions with the Configuration Service, allowing
Order Management logic development before full integration.
"""
from typing import Dict, Any, Optional
import logging
import random

logger = logging.getLogger(__name__)


def get_wallet_bonus_config(client_id: int) -> Optional[Dict[str, Any]]:
    """
    Get wallet bonus configuration for a client.
    
    Args:
        client_id: The client identifier
        
    Returns:
        Dictionary with bonus configuration or None if no bonus is active
    """
    logger.info(f"[STUB] Getting wallet bonus config for client {client_id}")
    
    # Simulate different bonus configurations based on client_id
    # For demonstration, we'll use a simple pattern:
    # - Even client IDs have percentage-based bonuses
    # - Odd client IDs have fixed amount bonuses
    # - Some clients have no bonus (return None)
    
    # No bonus for ~20% of clients
    if random.random() < 0.2:
        logger.info(f"[STUB] No active bonus for client {client_id}")
        return None
    
    if client_id % 2 == 0:
        # Percentage-based bonus for even client IDs
        config = {
            'type': 'percentage',
            'rate': round(random.uniform(0.05, 0.15), 2),  # 5% to 15%
            'threshold': float(random.choice([25.00, 50.00, 100.00]))
        }
    else:
        # Fixed amount bonus for odd client IDs
        config = {
            'type': 'fixed',
            'amount': float(random.choice([5.00, 10.00, 15.00])),
            'threshold': float(random.choice([50.00, 100.00, 150.00]))
        }
    
    logger.info(f"[STUB] Active bonus config for client {client_id}: {config}")
    return config


def get_loyalty_config(client_id: int) -> Optional[Dict[str, Any]]:
    """
    Get loyalty program configuration for a client.
    
    Args:
        client_id: The client identifier
        
    Returns:
        Dictionary with loyalty configuration or {'enabled': False} if loyalty is not enabled
    """
    logger.info(f"[STUB] Getting loyalty program config for client {client_id}")
    
    # Simulate different loyalty configurations based on client_id
    # For demonstration, we'll use a simple pattern:
    # - Most clients have loyalty enabled with standard settings
    # - Some clients have loyalty disabled
    
    # Loyalty disabled for ~10% of clients
    if random.random() < 0.1:
        logger.info(f"[STUB] Loyalty program disabled for client {client_id}")
        return {'enabled': False}
    
    # Standard loyalty program configuration
    config = {
        'enabled': True,
        'earn_rate': 1.0,  # 1 point per $1 spent
        'redeem_rate': 0.01,  # 100 points = $1 (0.01 per point)
        'expiry_days': 365  # Points expire after 1 year
    }
    
    # Customize based on client_id for variety
    if client_id % 3 == 0:
        # More generous program
        config['earn_rate'] = 1.5  # 1.5 points per $1
    elif client_id % 5 == 0:
        # Shorter expiry
        config['expiry_days'] = 180  # 6 months
    
    logger.info(f"[STUB] Active loyalty config for client {client_id}: {config}")
    return config


def get_wallet_config(client_id: int) -> Dict[str, Any]:
    """
    Get wallet feature configuration for a client.
    
    Args:
        client_id: The client identifier
        
    Returns:
        Dictionary with wallet configuration or {'enabled': False} if wallet is not enabled
    """
    logger.info(f"[STUB] Getting wallet feature config for client {client_id}")
    
    # Simulate different wallet configurations based on client_id
    # For demonstration, we'll use a simple pattern:
    # - Most clients have wallet enabled with standard settings
    # - Some clients have wallet disabled
    
    # Wallet disabled for ~15% of clients
    if random.random() < 0.15:
        logger.info(f"[STUB] Wallet feature disabled for client {client_id}")
        return {'enabled': False}
    
    # Standard wallet configuration
    config = {
        'enabled': True,
        'min_topup_amount': 10.0,
        'max_topup_amount': 1000.0,
        'max_balance': 5000.0,
        'transaction_limit': 500.0
    }
    
    # Customize based on client_id for variety
    if client_id % 2 == 0:
        # Higher limits for even client IDs
        config['max_topup_amount'] = 2000.0
        config['max_balance'] = 10000.0
    elif client_id % 3 == 0:
        # Lower limits for some clients
        config['max_topup_amount'] = 500.0
        config['transaction_limit'] = 250.0
    
    # Get any active bonus configuration
    bonus_config = get_wallet_bonus_config(client_id)
    if bonus_config:
        config['bonus'] = bonus_config
    
    logger.info(f"[STUB] Active wallet config for client {client_id}: {config}")
    return config
