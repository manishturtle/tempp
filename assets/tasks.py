"""
Tasks for the assets app.

This module contains Celery tasks for handling asset-related operations,
including cleanup of temporary files.
"""

import os
import json
import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone
from django.conf import settings
import redis

# Configure logger
logger = logging.getLogger(__name__)

@shared_task
def cleanup_temporary_uploads():
    """
    Clean up temporary uploads that are older than the threshold.
    
    This task scans Redis for temporary upload metadata, checks if the files
    are older than the threshold (48 hours by default), and deletes both the
    files and their metadata if they are.
    
    Returns:
        dict: A dictionary containing statistics about the cleanup operation
    """
    # Initialize statistics
    stats = {
        'scanned': 0,
        'deleted': 0,
        'errors': 0,
        'error_details': []
    }
    
    # Calculate the threshold time (48 hours ago)
    threshold_time = timezone.now() - timedelta(hours=48)
    threshold_timestamp = threshold_time.timestamp()
    
    # Connect to Redis
    try:
        redis_client = redis.Redis.from_url(
            settings.CELERY_BROKER_URL,
            decode_responses=True
        )
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {str(e)}")
        stats['errors'] += 1
        stats['error_details'].append(f"Redis connection error: {str(e)}")
        return stats
    
    # Scan for temporary upload keys
    cursor = 0
    pattern = "temp_upload:*"
    
    while True:
        cursor, keys = redis_client.scan(cursor, match=pattern, count=100)
        stats['scanned'] += len(keys)
        
        for key in keys:
            try:
                # Get metadata from Redis
                metadata_json = redis_client.get(key)
                if not metadata_json:
                    continue
                
                metadata = json.loads(metadata_json)
                
                # Check if the file is older than the threshold
                created_at = metadata.get('created_at', 0)
                if float(created_at) < threshold_timestamp:
                    # Get file path
                    file_path = metadata.get('file_path')
                    
                    # Delete the file if it exists
                    if file_path and os.path.exists(file_path):
                        try:
                            os.remove(file_path)
                            logger.info(f"Deleted temporary file: {file_path}")
                        except Exception as e:
                            logger.error(f"Failed to delete file {file_path}: {str(e)}")
                            stats['errors'] += 1
                            stats['error_details'].append(f"File deletion error for {file_path}: {str(e)}")
                    
                    # Delete Redis key
                    redis_client.delete(key)
                    logger.info(f"Deleted Redis key: {key}")
                    stats['deleted'] += 1
            except Exception as e:
                logger.error(f"Error processing key {key}: {str(e)}")
                stats['errors'] += 1
                stats['error_details'].append(f"Processing error for {key}: {str(e)}")
        
        # Break if we've completed the scan
        if cursor == 0:
            break
    
    # Log summary
    logger.info(f"Temporary uploads cleanup completed: {stats['deleted']} files deleted, "
                f"{stats['errors']} errors out of {stats['scanned']} scanned")
    
    return stats
