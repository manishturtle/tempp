"""
Tests for Celery tasks in the products app.
"""

import os
import json
import pytest
from unittest.mock import patch, MagicMock
from django.core.cache import caches
from django.utils import timezone
from datetime import timedelta

from products.tasks import cleanup_temporary_uploads


@pytest.fixture
def redis_cache():
    return caches['default']

@pytest.fixture
def temp_file(tmp_path):
    """Create a temporary file for testing"""
    file_path = tmp_path / "test_temp_upload.jpg"
    file_path.write_text("test content")
    return str(file_path)

@pytest.fixture
def mock_redis_data(redis_cache, temp_file):
    """Set up test data in Redis"""
    test_keys = [
        # Recent file that should be kept
        {
            'key': 'temp_upload:recent',
            'data': {
                'file_path': temp_file,
                'timestamp': (timezone.now() - timedelta(hours=1)).isoformat()
            }
        },
        # Old file that should be deleted
        {
            'key': 'temp_upload:old',
            'data': {
                'file_path': temp_file,
                'timestamp': (timezone.now() - timedelta(hours=49)).isoformat()
            }
        },
        # Invalid data that should be cleaned up
        {
            'key': 'temp_upload:invalid',
            'data': {'file_path': '/nonexistent/path'}
        }
    ]
    
    for item in test_keys:
        redis_cache.set(item['key'], json.dumps(item['data']))
    
    return test_keys


class TestCleanupTemporaryUploads:
    
    def test_cleanup_task_processes_all_keys(self, mock_redis_data, redis_cache):
        """Test that the task processes all Redis keys"""
        with patch('products.tasks.redis_cache.iter_keys') as mock_iter_keys:
            mock_iter_keys.return_value = [item['key'] for item in mock_redis_data]
            
            result = cleanup_temporary_uploads()
            
            assert result['processed_keys'] == 3
            assert result['deleted_keys'] >= 2  # Should delete old and invalid keys
    
    def test_cleanup_task_respects_file_age(self, mock_redis_data, redis_cache, temp_file):
        """Test that recent files are not deleted"""
        with patch('products.tasks.redis_cache.iter_keys') as mock_iter_keys:
            mock_iter_keys.return_value = [item['key'] for item in mock_redis_data]
            
            result = cleanup_temporary_uploads()
            
            # Recent file should still exist
            assert os.path.exists(temp_file)
            # Old file metadata should be deleted from Redis
            assert not redis_cache.get('temp_upload:old')
    
    def test_cleanup_task_handles_redis_errors(self, redis_cache):
        """Test that the task handles Redis errors gracefully"""
        with patch('products.tasks.redis_cache.iter_keys') as mock_iter_keys:
            mock_iter_keys.side_effect = Exception("Redis connection error")
            
            result = cleanup_temporary_uploads()
            
            assert result is None  # Task should exit early on Redis error
    
    def test_cleanup_task_handles_file_errors(self, mock_redis_data, redis_cache):
        """Test that the task handles file system errors gracefully"""
        with patch('products.tasks.redis_cache.iter_keys') as mock_iter_keys, \
             patch('os.remove') as mock_remove:
            mock_iter_keys.return_value = [item['key'] for item in mock_redis_data]
            mock_remove.side_effect = OSError("Permission denied")
            
            result = cleanup_temporary_uploads()
            
            assert result['deleted_files'] == 0  # No files should be deleted
            assert result['deleted_keys'] > 0  # Keys should still be deleted
