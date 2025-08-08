"""
AI Service Integration Stubs.

This module provides stub implementations for the AI Service API.
These stubs simulate interactions with AI services for fraud detection,
recommendations, and other AI-powered features.
"""
from typing import Dict, Any, Optional, List, Union
import uuid
import logging
import random
import requests
from datetime import datetime
from django.conf import settings

logger = logging.getLogger(__name__)


def get_fraud_score(tenant_identifier: str, order_data: Dict[str, Any]) -> float:
    """
    Get a fraud risk score for an order.
    
    Args:
        tenant_identifier: The tenant identifier
        order_data: Order data for fraud analysis
        
    Returns:
        Fraud score between 0.0 (low risk) and 1.0 (high risk)
    """
    logger.info(f"Getting fraud score (Tenant: {tenant_identifier})")
    
    try:
        # Construct the AI Service URL
        endpoint = "/fraud/score/"
        url = f"{settings.AI_SERVICE_URL.rstrip('/')}{endpoint}"
        
        # Prepare the payload
        payload = {
            "tenant_id": tenant_identifier,  # Real tenant identifier
            "order_data": order_data
        }
        
        # Set up headers with authentication
        headers = {
            "Authorization": f"Bearer {settings.AI_SERVICE_API_KEY}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        # Make the request to the AI Service
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
        
        # Extract fraud score
        fraud_score = response_data.get('fraud_score')
        if fraud_score is None:
            logger.error(f"Missing fraud_score in response for tenant {tenant_identifier}")
            # Fall back to mock score
            return random.uniform(0.0, 0.2)  # Default to low risk
            
        return float(fraud_score)
        
    except Exception as e:
        # For this service, we'll log errors but return a mock score
        # rather than failing the entire operation
        logger.error(f"Error getting fraud score for tenant {tenant_identifier}: {str(e)}")
        
        # Generate a mock fraud score (mostly low risk)
        # Distribution: 80% low risk (0.0-0.2), 15% medium risk (0.2-0.7), 5% high risk (0.7-1.0)
        risk_category = random.choices(
            ['low', 'medium', 'high'],
            weights=[0.8, 0.15, 0.05],
            k=1
        )[0]
        
        if risk_category == 'low':
            score = random.uniform(0.0, 0.2)
        elif risk_category == 'medium':
            score = random.uniform(0.2, 0.7)
        else:  # high
            score = random.uniform(0.7, 1.0)
        
        logger.info(f"Using mock fraud score: {score:.4f} ({risk_category} risk) for tenant {tenant_identifier}")
        
        return score


def get_fraud_analysis(tenant_identifier: str, order_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Get detailed fraud analysis for an order.
    
    Args:
        tenant_identifier: The tenant identifier
        order_data: Order data for fraud analysis
        
    Returns:
        Dictionary with detailed fraud analysis
    """
    logger.info(f"Getting detailed fraud analysis (Tenant: {tenant_identifier})")
    
    try:
        # Construct the AI Service URL
        endpoint = "/fraud/analysis/"
        url = f"{settings.AI_SERVICE_URL.rstrip('/')}{endpoint}"
        
        # Prepare the payload
        payload = {
            "tenant_id": tenant_identifier,  # Real tenant identifier
            "order_data": order_data
        }
        
        # Set up headers with authentication
        headers = {
            "Authorization": f"Bearer {settings.AI_SERVICE_API_KEY}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        # Make the request to the AI Service
        response = requests.post(
            url,
            json=payload,
            headers=headers,
            timeout=15  # Set a reasonable timeout
        )
        
        # Check for successful response
        response.raise_for_status()
        
        # Parse and validate response
        analysis = response.json()
        
        # Basic validation of response structure
        required_fields = ['fraud_score', 'risk_level', 'risk_factors', 'recommendation']
        for field in required_fields:
            if field not in analysis:
                logger.error(f"Missing required field '{field}' in fraud analysis response for tenant {tenant_identifier}")
                # Fall back to mock analysis
                return _generate_mock_fraud_analysis(tenant_identifier, order_data)
                
        return analysis
        
    except Exception as e:
        # For this service, we'll log errors but return a mock analysis
        # rather than failing the entire operation
        logger.error(f"Error getting fraud analysis for tenant {tenant_identifier}: {str(e)}")
        return _generate_mock_fraud_analysis(tenant_identifier, order_data)


def _generate_mock_fraud_analysis(tenant_identifier: str, order_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate mock fraud analysis data.
    
    Args:
        tenant_identifier: The tenant identifier
        order_data: Order data for fraud analysis
        
    Returns:
        Dictionary with mock fraud analysis
    """
    # Get base fraud score
    score = get_fraud_score(tenant_identifier, order_data)
    
    # Generate mock risk factors
    risk_factors = []
    
    # Potential risk factors based on score
    if score > 0.1:
        if random.random() > 0.5:
            risk_factors.append({
                'type': 'SHIPPING_BILLING_MISMATCH',
                'description': 'Shipping and billing addresses do not match',
                'severity': 'LOW'
            })
    
    if score > 0.3:
        if random.random() > 0.5:
            risk_factors.append({
                'type': 'HIGH_VALUE_ORDER',
                'description': 'Order value exceeds typical amount for customer',
                'severity': 'MEDIUM'
            })
    
    if score > 0.5:
        if random.random() > 0.5:
            risk_factors.append({
                'type': 'UNUSUAL_IP_LOCATION',
                'description': 'Order placed from unusual IP location',
                'severity': 'MEDIUM'
            })
    
    if score > 0.7:
        if random.random() > 0.5:
            risk_factors.append({
                'type': 'MULTIPLE_FAILED_PAYMENTS',
                'description': 'Multiple failed payment attempts before success',
                'severity': 'HIGH'
            })
    
    # Mock recommendation based on score
    if score < 0.3:
        recommendation = 'APPROVE'
    elif score < 0.7:
        recommendation = 'REVIEW'
    else:
        recommendation = 'REJECT'
    
    return {
        'order_id': order_data.get('order_id', 'unknown'),
        'timestamp': datetime.now().isoformat(),
        'fraud_score': score,
        'risk_level': 'LOW' if score < 0.3 else ('MEDIUM' if score < 0.7 else 'HIGH'),
        'risk_factors': risk_factors,
        'recommendation': recommendation,
        'confidence': random.uniform(0.7, 0.99)
    }


def get_product_recommendations(
    tenant_identifier: str,
    customer_id: Optional[int] = None,
    product_id: Optional[str] = None,
    cart_items: Optional[List[Dict[str, Any]]] = None,
    limit: int = 5
) -> List[Dict[str, Any]]:
    """
    Get product recommendations based on various inputs.
    
    Args:
        tenant_identifier: The tenant identifier
        customer_id: Optional customer identifier for personalized recommendations
        product_id: Optional product identifier for similar products
        cart_items: Optional list of cart items for complementary products
        limit: Maximum number of recommendations to return
        
    Returns:
        List of recommended products
    """
    logger.info(f"Getting product recommendations (Tenant: {tenant_identifier})")
    
    try:
        # Construct the AI Service URL
        endpoint = "/recommendations/products/"
        url = f"{settings.AI_SERVICE_URL.rstrip('/')}{endpoint}"
        
        # Prepare the payload
        payload = {
            "tenant_id": tenant_identifier,  # Real tenant identifier
            "limit": limit
        }
        
        # Add optional parameters if provided
        if customer_id:
            payload["customer_id"] = customer_id
            logger.debug(f"Including customer_id {customer_id} for personalized recommendations")
            
        if product_id:
            payload["product_id"] = product_id
            logger.debug(f"Including product_id {product_id} for similar products")
            
        if cart_items:
            payload["cart_items"] = cart_items
            logger.debug(f"Including {len(cart_items)} cart items for complementary products")
        
        # Set up headers with authentication
        headers = {
            "Authorization": f"Bearer {settings.AI_SERVICE_API_KEY}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        # Make the request to the AI Service
        response = requests.post(
            url,
            json=payload,
            headers=headers,
            timeout=10  # Set a reasonable timeout
        )
        
        # Check for successful response
        response.raise_for_status()
        
        # Parse and validate response
        recommendations = response.json()
        
        # Basic validation of response structure
        if not isinstance(recommendations, list):
            logger.error(f"Invalid response format from AI Service for tenant {tenant_identifier}: expected list, got {type(recommendations)}")
            # Fall back to mock recommendations
            return _generate_mock_recommendations(limit)
            
        return recommendations[:limit]  # Ensure we don't exceed the requested limit
        
    except Exception as e:
        # For this service, we'll log errors but return mock recommendations
        # rather than failing the entire operation
        logger.error(f"Error getting product recommendations for tenant {tenant_identifier}: {str(e)}")
        return _generate_mock_recommendations(limit)


def _generate_mock_recommendations(limit: int) -> List[Dict[str, Any]]:
    """
    Generate mock product recommendations.
    
    Args:
        limit: Maximum number of recommendations to return
        
    Returns:
        List of mock product recommendations
    """
    # Generate mock recommendations
    recommendations = []
    
    for i in range(min(limit, 10)):  # Cap at 10 recommendations
        product_sku = f"REC{i+1}"
        
        recommendations.append({
            'sku': product_sku,
            'name': f'Recommended Product {i+1}',
            'price': random.uniform(10.0, 200.0),
            'category': random.choice(['Electronics', 'Clothing', 'Home', 'Office']),
            'relevance_score': random.uniform(0.5, 1.0),
            'recommendation_type': random.choice(['SIMILAR', 'FREQUENTLY_BOUGHT_TOGETHER', 'PERSONALIZED']),
            'image_url': f'https://example.com/images/{product_sku}.jpg'
        })
    
    # Sort by relevance score
    recommendations.sort(key=lambda x: x['relevance_score'], reverse=True)
    
    return recommendations


def analyze_customer_sentiment(tenant_identifier: str, text: str) -> Dict[str, Any]:
    """
    Analyze sentiment in customer text (e.g., feedback, reviews).
    
    Args:
        tenant_identifier: The tenant identifier
        text: The text to analyze
        
    Returns:
        Dictionary with sentiment analysis results
    """
    logger.info(f"Analyzing customer sentiment (Tenant: {tenant_identifier})")
    logger.debug(f"Text to analyze: {text}")
    
    try:
        # Construct the AI Service URL
        endpoint = "/sentiment/analyze/"
        url = f"{settings.AI_SERVICE_URL.rstrip('/')}{endpoint}"
        
        # Prepare the payload
        payload = {
            "tenant_id": tenant_identifier,  # Real tenant identifier
            "text": text
        }
        
        # Set up headers with authentication
        headers = {
            "Authorization": f"Bearer {settings.AI_SERVICE_API_KEY}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        # Make the request to the AI Service
        response = requests.post(
            url,
            json=payload,
            headers=headers,
            timeout=10  # Set a reasonable timeout
        )
        
        # Check for successful response
        response.raise_for_status()
        
        # Parse and validate response
        analysis = response.json()
        
        # Basic validation of response structure
        required_fields = ['sentiment_score', 'sentiment_category']
        for field in required_fields:
            if field not in analysis:
                logger.error(f"Missing required field '{field}' in sentiment analysis response for tenant {tenant_identifier}")
                # Fall back to mock analysis
                return _generate_mock_sentiment_analysis(text)
                
        return analysis
        
    except Exception as e:
        # For this service, we'll log errors but return mock analysis
        # rather than failing the entire operation
        logger.error(f"Error analyzing customer sentiment for tenant {tenant_identifier}: {str(e)}")
        return _generate_mock_sentiment_analysis(text)


def _generate_mock_sentiment_analysis(text: str) -> Dict[str, Any]:
    """
    Generate mock sentiment analysis.
    
    Args:
        text: The text to analyze
        
    Returns:
        Dictionary with mock sentiment analysis
    """
    # Generate mock sentiment analysis
    # Check for positive/negative keywords to make the mock more realistic
    positive_words = ['good', 'great', 'excellent', 'amazing', 'love', 'happy', 'satisfied']
    negative_words = ['bad', 'poor', 'terrible', 'awful', 'hate', 'disappointed', 'unhappy']
    
    text_lower = text.lower()
    
    # Count positive and negative words
    positive_count = sum(1 for word in positive_words if word in text_lower)
    negative_count = sum(1 for word in negative_words if word in text_lower)
    
    # Base sentiment on word counts, with some randomness
    if positive_count > negative_count:
        sentiment = random.uniform(0.5, 1.0)  # Positive
    elif negative_count > positive_count:
        sentiment = random.uniform(0.0, 0.5)  # Negative
    else:
        sentiment = random.uniform(0.4, 0.6)  # Neutral
    
    # Determine sentiment category
    if sentiment < 0.4:
        category = 'NEGATIVE'
    elif sentiment > 0.6:
        category = 'POSITIVE'
    else:
        category = 'NEUTRAL'
    
    return {
        'sentiment_score': sentiment,
        'sentiment_category': category,
        'confidence': random.uniform(0.7, 0.95),
        'language': 'en',
        'entities': [],  # Mock entity extraction would go here
        'keywords': []   # Mock keyword extraction would go here
    }
