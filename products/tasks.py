"""
Celery tasks for the products app.

This module contains Celery tasks for asynchronous processing of product-related operations,
including cleanup of temporary files and Redis keys.
"""

import os
import json
import logging
from django.conf import settings
from django.core.cache import caches
from celery import shared_task
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)
redis_cache = caches['default']


@shared_task(name="cleanup_temp_uploads")
def cleanup_temporary_uploads():
    """
    Clean up temporary upload files and their Redis mappings.
    
    This task:
    1. Scans Redis for temporary upload keys
    2. Checks if the corresponding files exist
    3. Deletes orphaned files and Redis keys
    4. Optionally checks file age for additional validation
    
    The task is designed to be idempotent and safe to run multiple times.
    """
    logger.info("Starting temporary upload cleanup task...")
    
    # Get all temporary upload keys from Redis
    keys_to_check = []
    try:
        keys_to_check = redis_cache.iter_keys('temp_upload:*')
    except Exception as e:
        logger.error(f"Failed to get keys from Redis for cleanup: {e}")
        return

    deleted_files_count = 0
    deleted_keys_count = 0
    processed_keys_count = 0

    for key in keys_to_check:
        processed_keys_count += 1
        metadata_json = redis_cache.get(key)
        temp_local_path = None
        
        # Process metadata if it exists
        if metadata_json:
            try:
                metadata = json.loads(metadata_json)
                temp_local_path = metadata.get('file_path')
                uploaded_at_str = metadata.get('timestamp')

                # Check file age if timestamp exists
                if uploaded_at_str:
                    uploaded_at = timezone.datetime.fromisoformat(uploaded_at_str)
                    if timezone.now() - uploaded_at < timedelta(hours=48):
                        logger.debug(f"Skipping recent file: {temp_local_path}")
                        continue

                # Delete local file if it exists
                if temp_local_path and os.path.exists(temp_local_path):
                    try:
                        os.remove(temp_local_path)
                        deleted_files_count += 1
                        logger.info(f"Deleted orphaned temp file: {temp_local_path}")
                    except OSError as e:
                        logger.error(f"Error deleting temp file {temp_local_path} for key {key}: {e}")

                # Delete Redis key
                redis_cache.delete(key)
                deleted_keys_count += 1

            except Exception as e:
                logger.error(f"Error processing metadata or deleting file for temp key {key}: {e}")
                # Delete key even if file processing failed to prevent retries
                redis_cache.delete(key)
                deleted_keys_count += 1

    logger.info(
        f"Finished temporary upload cleanup. Keys checked: {processed_keys_count}. "
        f"Redis keys deleted: {deleted_keys_count}. Files deleted: {deleted_files_count}."
    )
    
    return {
        'processed_keys': processed_keys_count,
        'deleted_keys': deleted_keys_count,
        'deleted_files': deleted_files_count
    }
