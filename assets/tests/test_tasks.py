"""
Tests for the assets app tasks.

This module contains tests for the Celery tasks in the assets app,
particularly focusing on the temporary file cleanup task.
"""

import os
import json
import tempfile
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

from django.test import TestCase
from django.utils import timezone
from django.conf import settings

from assets.tasks import cleanup_temporary_uploads


class CleanupTemporaryUploadsTaskTests(TestCase):
    """Tests for the cleanup_temporary_uploads task."""
    
    @patch('assets.tasks.redis.Redis.from_url')
    def test_cleanup_old_files(self, mock_redis_from_url):
        """Test that old temporary files are cleaned up."""
        # Create a temporary file for testing
        temp_file = tempfile.NamedTemporaryFile(delete=False)
        temp_file_path = temp_file.name
        temp_file.close()
        
        # Setup mock Redis client
        mock_redis = MagicMock()
        mock_redis_from_url.return_value = mock_redis
        
        # Create test data
        old_time = (timezone.now() - timedelta(hours=49)).timestamp()
        temp_id = "test-temp-id"
        key = f"temp_upload:{temp_id}"
        
        # Setup Redis scan to return our test key
        mock_redis.scan.return_value = (0, [key])
        
        # Setup Redis get to return our test metadata
        metadata = {
            'file_path': temp_file_path,
            'created_at': old_time,
            'original_filename': 'test.jpg',
            'tenant_id': 1
        }
        mock_redis.get.return_value = json.dumps(metadata)
        
        # Run the task
        result = cleanup_temporary_uploads()
        
        # Verify the file was deleted
        self.assertFalse(os.path.exists(temp_file_path))
        
        # Verify Redis key was deleted
        mock_redis.delete.assert_called_once_with(key)
        
        # Verify the statistics
        self.assertEqual(result['scanned'], 1)
        self.assertEqual(result['deleted'], 1)
        self.assertEqual(result['errors'], 0)
    
    @patch('assets.tasks.redis.Redis.from_url')
    def test_skip_recent_files(self, mock_redis_from_url):
        """Test that recent temporary files are not cleaned up."""
        # Create a temporary file for testing
        temp_file = tempfile.NamedTemporaryFile(delete=False)
        temp_file_path = temp_file.name
        temp_file.close()
        
        # Setup mock Redis client
        mock_redis = MagicMock()
        mock_redis_from_url.return_value = mock_redis
        
        # Create test data
        recent_time = (timezone.now() - timedelta(hours=24)).timestamp()
        temp_id = "test-temp-id"
        key = f"temp_upload:{temp_id}"
        
        # Setup Redis scan to return our test key
        mock_redis.scan.return_value = (0, [key])
        
        # Setup Redis get to return our test metadata
        metadata = {
            'file_path': temp_file_path,
            'created_at': recent_time,
            'original_filename': 'test.jpg',
            'tenant_id': 1
        }
        mock_redis.get.return_value = json.dumps(metadata)
        
        # Run the task
        result = cleanup_temporary_uploads()
        
        # Verify the file was not deleted
        self.assertTrue(os.path.exists(temp_file_path))
        
        # Verify Redis key was not deleted
        mock_redis.delete.assert_not_called()
        
        # Verify the statistics
        self.assertEqual(result['scanned'], 1)
        self.assertEqual(result['deleted'], 0)
        self.assertEqual(result['errors'], 0)
        
        # Clean up the test file
        os.unlink(temp_file_path)
    
    @patch('assets.tasks.redis.Redis.from_url')
    def test_handle_missing_file(self, mock_redis_from_url):
        """Test that the task handles missing files gracefully."""
        # Setup mock Redis client
        mock_redis = MagicMock()
        mock_redis_from_url.return_value = mock_redis
        
        # Create test data with non-existent file path
        old_time = (timezone.now() - timedelta(hours=49)).timestamp()
        temp_id = "test-temp-id"
        key = f"temp_upload:{temp_id}"
        
        # Setup Redis scan to return our test key
        mock_redis.scan.return_value = (0, [key])
        
        # Setup Redis get to return our test metadata
        metadata = {
            'file_path': '/path/to/nonexistent/file.jpg',
            'created_at': old_time,
            'original_filename': 'test.jpg',
            'tenant_id': 1
        }
        mock_redis.get.return_value = json.dumps(metadata)
        
        # Run the task
        result = cleanup_temporary_uploads()
        
        # Verify Redis key was still deleted
        mock_redis.delete.assert_called_once_with(key)
        
        # Verify the statistics
        self.assertEqual(result['scanned'], 1)
        self.assertEqual(result['deleted'], 1)
        self.assertEqual(result['errors'], 0)
    
    @patch('assets.tasks.redis.Redis.from_url')
    def test_handle_redis_connection_error(self, mock_redis_from_url):
        """Test that the task handles Redis connection errors gracefully."""
        # Setup mock Redis client to raise an exception
        mock_redis_from_url.side_effect = Exception("Connection error")
        
        # Run the task
        result = cleanup_temporary_uploads()
        
        # Verify the statistics
        self.assertEqual(result['scanned'], 0)
        self.assertEqual(result['deleted'], 0)
        self.assertEqual(result['errors'], 1)
        self.assertIn("Redis connection error", result['error_details'][0])
