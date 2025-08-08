import json
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

class MockRedis:
    def __init__(self):
        self._data: Dict[str, Any] = {}
        self._expiry: Dict[str, datetime] = {}
        
    def set(self, key: str, value: Any, ex: Optional[int] = None) -> bool:
        """
        Set a key-value pair with optional expiration.
        
        Args:
            key: The key to set
            value: The value to store
            ex: Optional expiration time in seconds
            
        Returns:
            bool: True if successful
        """
        self._data[key] = value
        if ex:
            self._expiry[key] = datetime.now() + timedelta(seconds=ex)
        return True
    
    def get(self, key: str) -> Optional[Any]:
        """
        Get a value by key.
        
        Args:
            key: The key to retrieve
            
        Returns:
            Optional[Any]: The stored value or None if not found/expired
        """
        if key in self._expiry:
            if datetime.now() > self._expiry[key]:
                del self._data[key]
                del self._expiry[key]
                return None
        
        # For temporary image uploads, return mock metadata
        if key.startswith('temp_upload:'):
            # Extract the UUID from the key
            uuid_part = key.split(':')[1]
            return json.dumps({
                'tenant_id': 1,  # Default tenant ID
                'original_filename': f'mock-image-{uuid_part}.jpg',
                'file_path': f'mock/path/to/{uuid_part}.jpg'
            })
            
        return self._data.get(key)
    
    def delete(self, key: str) -> int:
        """
        Delete a key.
        
        Args:
            key: The key to delete
            
        Returns:
            int: 1 if key was deleted, 0 if key didn't exist
        """
        if key in self._data:
            del self._data[key]
            if key in self._expiry:
                del self._expiry[key]
            return 1
        return 0
    
    def exists(self, key: str) -> bool:
        """
        Check if a key exists and is not expired.
        
        Args:
            key: The key to check
            
        Returns:
            bool: True if key exists and is not expired
        """
        if key in self._data:
            if key in self._expiry:
                if datetime.now() > self._expiry[key]:
                    return False
            return True
        return False
    
    def keys(self, pattern: str = "*") -> list:
        """
        Get all keys matching a pattern.
        
        Args:
            pattern: Pattern to match (supports * wildcard)
            
        Returns:
            list: List of matching keys
        """
        return [key for key in self._data.keys() if self._match_pattern(key, pattern)]
    
    def _match_pattern(self, key: str, pattern: str) -> bool:
        """Simple pattern matching implementation."""
        if pattern == "*":
            return True
        if pattern == key:
            return True
        return False
    
    def ping(self) -> bool:
        """Check if the server is alive."""
        return True

# Create a global instance for use throughout the application
mock_redis = MockRedis()
