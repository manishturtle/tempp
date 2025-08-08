"""
Product Visibility Management

This module handles the calculation and management of product visibility across
different customer groups and selling channels in the multi-tenant eCommerce system.
Product visibility is determined based on exclusion rules stored in CustomerGroupSellingChannelProduct.
"""

from django.db import models, transaction, connection
from django.utils import timezone
import logging
import traceback

# Import models at the top level for consistency
from products.models import Product, ProductVisibility ,CustomerGroupSellingChannelProduct
from customers.models import CustomerGroupSellingChannel

logger = logging.getLogger(__name__)


def create_product_visibility(product_id):
    """
    Creates initial visibility records for a new product across all customer group selling channel combinations.
    
    Args:
        product_id: ID of the product to create visibility for
    """
    try:
        
        # Get the product with its category information
        product = Product.objects.get(id=product_id)
        
        # Get client information from the product
        client_id = product.client_id
        company_id = product.company_id
        
        # Get category, subcategory, and division IDs
        category_id = product.category.id if product.category else None
        subcategory_id = product.subcategory.id if product.subcategory else None
        division_id = product.division.id if product.division else None
        
        if not category_id:
            logger.warning(f"Product {product_id} has no category, skipping visibility calculation")
            return
            
        # Get all active customer group selling channel combinations
        active_segments = CustomerGroupSellingChannel.objects.filter(status='ACTIVE')
        
        # Get existing exclusions for this product from all levels
        excluded_segment_ids = set()
        
        # Use raw SQL for better performance with large datasets
        with connection.cursor() as cursor:
            # Product-level exclusions
            cursor.execute("""
                SELECT customer_group_selling_channel_id 
                FROM product_product_exclusions 
                WHERE product_id = %s AND is_active = TRUE
            """, [product_id])
            
            for row in cursor.fetchall():
                excluded_segment_ids.add(row[0])
                
            # Category-level exclusions
            if category_id:
                cursor.execute("""
                    SELECT customer_group_selling_channel_id 
                    FROM product_category_exclusions 
                    WHERE category_id = %s AND is_active = TRUE
                """, [category_id])
                
                for row in cursor.fetchall():
                    excluded_segment_ids.add(row[0])
            
            # Subcategory-level exclusions
            if subcategory_id:
                cursor.execute("""
                    SELECT customer_group_selling_channel_id 
                    FROM product_subcategory_exclusions 
                    WHERE subcategory_id = %s AND is_active = TRUE
                """, [subcategory_id])
                
                for row in cursor.fetchall():
                    excluded_segment_ids.add(row[0])
            
            # Division-level exclusions
            if division_id:
                cursor.execute("""
                    SELECT customer_group_selling_channel_id 
                    FROM product_division_exclusions 
                    WHERE division_id = %s AND is_active = TRUE
                """, [division_id])
                
                for row in cursor.fetchall():
                    excluded_segment_ids.add(row[0])
        
        # Create visibility records
        visibility_records = []
        
        for segment in active_segments:
            # Check if this segment is in the exclusion list
            is_visible = segment.id not in excluded_segment_ids
            
            # Create visibility record
            visibility_records.append(ProductVisibility(
                client_id=client_id,
                company_id=company_id,
                product=product,
                customer_group_selling_channel=segment,
                division_id=division_id,
                category_id=category_id,
                subcategory_id=subcategory_id,
                is_visible=is_visible,
                last_calculated=timezone.now()
            ))
        
        # Use bulk create for better performance
        if visibility_records:
            # Create all visibility records in a single bulk operation
            ProductVisibility.objects.bulk_create(visibility_records, batch_size=100)        
        return True
        
    except Exception as e:
        logger.error(f"Error creating product visibility for product {product_id}: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return False


def update_product_visibility(product_id):
    """
    Updates existing visibility records for a product when exclusion rules change.
    This updates visibility status without removing and recreating records.
    
    Args:
        product_id: ID of the product to update visibility for
    """
    try:        
        # First check if the product has any visibility records
        visibility_exists = ProductVisibility.objects.filter(product_id=product_id).exists()
        
        # If no visibility records exist, create them from scratch
        if not visibility_exists:
            logger.info(f"No visibility records exist for product {product_id}, creating them from scratch")
            return create_product_visibility(product_id)
        
        # Get the product with its category information
        product = Product.objects.get(id=product_id)
        
        # Get client information from the product
        client_id = product.client_id
        company_id = product.company_id
        
        # Get category, subcategory, and division IDs
        category_id = product.category.id if product.category else None
        subcategory_id = product.subcategory.id if product.subcategory else None
        division_id = product.division.id if product.division else None
        
        if not category_id:
            logger.warning(f"Product {product_id} has no category, skipping visibility update")
            return False
            
        # Get all active customer group selling channel combinations
        active_segments = CustomerGroupSellingChannel.objects.filter(status='ACTIVE')
        logger.info(f"Found {active_segments.count()} active customer group selling channel combinations")
        
        # Get existing exclusions for this product from all levels
        excluded_segment_ids = set()
        
        # Use raw SQL for better performance with large datasets
        with connection.cursor() as cursor:
            # Product-level exclusions
            cursor.execute("""
                SELECT customer_group_selling_channel_id 
                FROM product_product_exclusions 
                WHERE product_id = %s AND is_active = TRUE
            """, [product_id])
            
            product_exclusions = cursor.fetchall()
            for row in product_exclusions:
                excluded_segment_ids.add(row[0])
            logger.info(f"Found {len(product_exclusions)} product-level exclusions for product {product_id}")
                
            # Category-level exclusions
            if category_id:
                cursor.execute("""
                    SELECT customer_group_selling_channel_id 
                    FROM product_category_exclusions 
                    WHERE category_id = %s AND is_active = TRUE
                """, [category_id])
                
                category_exclusions = cursor.fetchall()
                for row in category_exclusions:
                    excluded_segment_ids.add(row[0])
                logger.info(f"Found {len(category_exclusions)} category-level exclusions for category {category_id}")
            
            # Subcategory-level exclusions
            if subcategory_id:
                cursor.execute("""
                    SELECT customer_group_selling_channel_id 
                    FROM product_subcategory_exclusions 
                    WHERE subcategory_id = %s AND is_active = TRUE
                """, [subcategory_id])
                
                subcategory_exclusions = cursor.fetchall()
                for row in subcategory_exclusions:
                    excluded_segment_ids.add(row[0])
                logger.info(f"Found {len(subcategory_exclusions)} subcategory-level exclusions for subcategory {subcategory_id}")
            
            # Division-level exclusions
            if division_id:
                cursor.execute("""
                    SELECT customer_group_selling_channel_id 
                    FROM product_division_exclusions 
                    WHERE division_id = %s AND is_active = TRUE
                """, [division_id])
                
                division_exclusions = cursor.fetchall()
                for row in division_exclusions:
                    excluded_segment_ids.add(row[0])
                logger.info(f"Found {len(division_exclusions)} division-level exclusions for division {division_id}")
        
        logger.info(f"Total of {len(excluded_segment_ids)} unique excluded segment IDs across all levels")
        
        # Get all existing visibility records for this product
        existing_records = ProductVisibility.objects.filter(product_id=product_id)
        existing_map = {r.customer_group_selling_channel_id: r for r in existing_records}
        
        # Track records to update and create
        records_to_update = []
        
        # Keep track of segment IDs to detect and delete stale records
        processed_segment_ids = set()
        
        # Check for any segments that need updating
        for segment in active_segments:
            is_visible = segment.id not in excluded_segment_ids
            existing_record = existing_map.get(segment.id)
            processed_segment_ids.add(segment.id)
            
            # If record exists but visibility status needs updating
            if existing_record and existing_record.is_visible != is_visible:
                existing_record.is_visible = is_visible
                existing_record.last_calculated = timezone.now()
                records_to_update.append(existing_record)
            
            # If record doesn't exist, we need to create it
            elif not existing_record:
                new_record = ProductVisibility(
                    client_id=client_id,
                    company_id=company_id,
                    product_id=product_id,
                    customer_group_selling_channel_id=segment.id,
                    division_id=division_id,
                    category_id=category_id,
                    subcategory_id=subcategory_id,
                    is_visible=is_visible,
                    last_calculated=timezone.now()
                )
                records_to_update.append(new_record)
        
        # Use bulk_update for existing records that need changes
        existing_to_update = [r for r in records_to_update if r.pk is not None]
        new_to_create = [r for r in records_to_update if r.pk is None]
        
        # Update existing records
        if existing_to_update:
            ProductVisibility.objects.bulk_update(
                existing_to_update, 
                ['is_visible', 'last_calculated'], 
                batch_size=100
            )
            
        # Create new records
        if new_to_create:
            ProductVisibility.objects.bulk_create(new_to_create, batch_size=100)
        
        # Delete stale records (segments that are no longer active)
        stale_segment_ids = set(existing_map.keys()) - processed_segment_ids
        if stale_segment_ids:
            deleted_count = ProductVisibility.objects.filter(
                product_id=product_id,
                customer_group_selling_channel_id__in=stale_segment_ids
            ).delete()[0]
            logger.info(f"Deleted {deleted_count} stale visibility records for product {product_id}")
        
        logger.info(f"Updated {len(existing_to_update)} and created {len(new_to_create)} visibility records for product {product_id}")
        return True
        
    except Exception as e:
        logger.error(f"Error updating product visibility for product {product_id}: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return False

def update_subcategory_visibility(subcategory_id):
    """Update visibility records for all products in a subcategory.
    
    This function will update visibility status for all products that belong to the
    specified subcategory, based on customer group selling channel exclusions.
    Only updates existing visibility records and does not create new ones.
    Only changes the visibility status, not any other data.
    
    Args:
        subcategory_id: ID of the subcategory
        
    Returns:
        dict: A dictionary containing counts of records updated
    """
    # Check if there are any products for this subcategory
    product_count = Product.objects.filter(subcategory_id=subcategory_id).count()
    if product_count == 0:
        return {'updated': 0, 'products': 0, 'excluded_segments': [], 'status': 'skipped'}
    
    results = {
        'updated': 0,
        'products': product_count,
        'excluded_segments': [],
        'status': 'success'
    }
    
    try:
        with transaction.atomic():
            with connection.cursor() as cursor:
                # Get excluded segments in a single query
                cursor.execute("""
                    SELECT customer_group_selling_channel_id
                    FROM product_subcategory_exclusions
                    WHERE subcategory_id = %s AND is_active = TRUE
                """, [subcategory_id])
                
                # Get all exclusions
                excluded_segments = [row[0] for row in cursor.fetchall()]
                results['excluded_segments'] = excluded_segments
                
                # Update visibility records based on exclusions
                cursor.execute("""
                    UPDATE product_visibility pv
                    SET is_visible = CASE WHEN excluded.is_excluded THEN FALSE ELSE TRUE END,
                        last_calculated = NOW()
                    FROM (
                        SELECT p.id AS product_id, s.id AS customer_group_selling_channel_id,
                               CASE WHEN s.id = ANY(%s) THEN TRUE ELSE FALSE END AS is_excluded
                        FROM products_product p
                        CROSS JOIN customer_group_selling_channel s
                        WHERE p.subcategory_id = %s
                    ) AS excluded
                    WHERE pv.product_id = excluded.product_id
                    AND pv.customer_group_selling_channel_id = excluded.customer_group_selling_channel_id
                    AND pv.is_visible != (CASE WHEN excluded.is_excluded THEN FALSE ELSE TRUE END)
                """, [excluded_segments, subcategory_id])
                
                updated_count = cursor.rowcount
                results['updated'] = updated_count
                
                # Get count of existing visibility records
                cursor.execute("""
                    SELECT COUNT(*) FROM product_visibility pv
                    JOIN products_product p ON p.id = pv.product_id
                    WHERE p.subcategory_id = %s
                """, [subcategory_id])
                total_existing = cursor.fetchone()[0]
                results['total_records'] = total_existing
                
                logger.info(f"Updated {updated_count} of {total_existing} visibility records for subcategory {subcategory_id}")
                
    except Exception as e:
        logger.error(f"Error updating subcategory visibility for subcategory {subcategory_id}: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        results['status'] = 'error'
        results['error'] = str(e)
    return results

def update_category_visibility(category_id):
    """Update visibility records for all products in a category.
    
    This function will update visibility status for all products that belong to the
    specified category, based on customer group selling channel exclusions.
    Only updates existing visibility records and does not create new ones.
    Only changes the visibility status, not any other data.
    
    Args:
        category_id: ID of the category
        
    Returns:
        dict: A dictionary containing counts of records updated
    """
    product_count = Product.objects.filter(category_id=category_id).count()
    if product_count == 0:
        return {'updated': 0, 'products': 0, 'excluded_segments': [], 'status': 'skipped'}
    results = {
        'updated': 0,
        'products': product_count,
        'excluded_segments': [],
        'status': 'success'
    }
    try:
        with transaction.atomic():
            with connection.cursor() as cursor:
                # Get excluded segments in a single query
                cursor.execute("""
                    SELECT customer_group_selling_channel_id
                    FROM product_category_exclusions
                    WHERE category_id = %s AND is_active = TRUE
                """, [category_id])
                excluded_segments = [row[0] for row in cursor.fetchall()]
                results['excluded_segments'] = excluded_segments
                if product_count > 0:
                    # First, identify which customer_group_selling_channel_ids are affected
                    cursor.execute("""
                        SELECT DISTINCT customer_group_selling_channel_id
                        FROM product_category_exclusions
                        WHERE category_id = %s AND is_active = TRUE
                    """, [category_id])
                    
                    affected_segments = [row[0] for row in cursor.fetchall()]
                    
                    if affected_segments:
                        # Only update visibility records for the affected segments
                        # and products that belong to this category
                        cursor.execute("""
                            UPDATE product_visibility pv
                            SET is_visible = FALSE,
                                last_calculated = NOW()
                            FROM products_product p
                            WHERE pv.product_id = p.id
                            AND p.category_id = %s
                            AND pv.customer_group_selling_channel_id IN %s
                            AND pv.is_visible = TRUE
                        """, [category_id, tuple(affected_segments)])
                        
                        updated_count = cursor.rowcount
                        results['updated'] = updated_count
                    cursor.execute("""
                        SELECT COUNT(*) FROM product_visibility pv
                        JOIN products_product p ON p.id = pv.product_id
                        WHERE p.category_id = %s
                    """, [category_id])
                    total_existing = cursor.fetchone()[0]
        return results
    except Exception as e:
        results['status'] = 'error'
        results['error'] = str(e)
        return results
        

def update_division_visibility(division_id):
    """Update visibility records for all products in a division.
    
    This function will update visibility status for all products that belong to the
    specified division, based on customer group selling channel exclusions.
    Only updates existing visibility records and does not create new ones.
    Only changes the visibility status, not any other data.
    
    Args:
        division_id: ID of the division
        
    Returns:
        dict: A dictionary containing counts of records updated
    """
    product_count = Product.objects.filter(division_id=division_id).count()
    if product_count == 0:
        return {'updated': 0, 'products': 0, 'excluded_segments': [], 'status': 'skipped'}
    results = {
        'updated': 0,
        'products': product_count,
        'excluded_segments': [],
        'status': 'success'
    }
    try:
        with transaction.atomic():
            with connection.cursor() as cursor:
                # Get excluded segments in a single query
                cursor.execute("""
                    SELECT customer_group_selling_channel_id
                    FROM product_division_exclusions
                    WHERE division_id = %s AND is_active = TRUE
                """, [division_id])
                excluded_segments = [row[0] for row in cursor.fetchall()]
                results['excluded_segments'] = excluded_segments
                if product_count > 0:
                    # First, identify which customer_group_selling_channel_ids are affected
                    cursor.execute("""
                        SELECT DISTINCT customer_group_selling_channel_id
                        FROM product_division_exclusions
                        WHERE division_id = %s AND is_active = TRUE
                    """, [division_id])
                    
                    affected_segments = [row[0] for row in cursor.fetchall()]
                    
                    if affected_segments:
                        # Only update visibility records for the affected segments
                        # and products that belong to this division
                        cursor.execute("""
                            UPDATE product_visibility pv
                            SET is_visible = FALSE,
                                last_calculated = NOW()
                            FROM products_product p
                            WHERE pv.product_id = p.id
                            AND p.division_id = %s
                            AND pv.customer_group_selling_channel_id IN %s
                            AND pv.is_visible = TRUE
                        """, [division_id, tuple(affected_segments)])
                        
                        updated_count = cursor.rowcount
                        results['updated'] = updated_count
                    cursor.execute("""
                        SELECT COUNT(*) FROM product_visibility pv
                        JOIN products_product p ON p.id = pv.product_id
                        WHERE p.division_id = %s
                    """, [division_id])
                    total_existing = cursor.fetchone()[0]
        return results
    except Exception as e:
        results['status'] = 'error'
        results['error'] = str(e)
        return results


def create_customer_group_selling_channel_visibility(customer_group_selling_channel_id):
    """Create visibility records for all existing products when a new CustomerGroupSellingChannel is created.
    
    This function will create visibility records with is_visible=True for all existing products
    for the newly created CustomerGroupSellingChannel relationship. It doesn't modify any existing records.
    No exclusion checks are performed - all products get visibility records with is_visible=True.
    
    Args:
        customer_group_selling_channel_id: ID of the newly created CustomerGroupSellingChannel
        
    Returns:
        dict: A dictionary containing counts of records created
    """
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Starting visibility creation for CustomerGroupSellingChannel ID: {customer_group_selling_channel_id}")
    
    from django.utils import timezone
    now = timezone.now()
    
    results = {
        'created': 0,
        'status': 'success'
    }
    
    try:
        # Validate input
        if customer_group_selling_channel_id is None:
            logger.error("Customer group selling channel ID is None")
            results['status'] = 'error'
            results['error'] = 'Customer group selling channel ID cannot be None'
            return results
            
        # Check if the customer_group_selling_channel_id exists
        from customers.models import CustomerGroupSellingChannel
        try:
            channel = CustomerGroupSellingChannel.objects.get(id=customer_group_selling_channel_id)
            logger.info(f"Found CustomerGroupSellingChannel: {channel}, status: {channel.status}")
            
            # If not active, skip
            if channel.status != 'ACTIVE':
                logger.warning(f"CustomerGroupSellingChannel {customer_group_selling_channel_id} is not active (status={channel.status}), skipping visibility creation")
                results['status'] = 'skipped_inactive_channel'
                return results
                
        except CustomerGroupSellingChannel.DoesNotExist:
            logger.error(f"CustomerGroupSellingChannel with ID {customer_group_selling_channel_id} does not exist")
            results['status'] = 'error'
            results['error'] = f'CustomerGroupSellingChannel with ID {customer_group_selling_channel_id} does not exist'
            return results
            
        # First count how many products we have to process
        product_count = Product.objects.filter(is_active=True).count()
        results['total_products'] = product_count
        logger.info(f"Found {product_count} active products to process")
        
        if product_count == 0:
            logger.warning("No active products found to create visibility records for")
            return {'created': 0, 'total_products': 0, 'status': 'skipped_no_products'}
        
        with transaction.atomic():
            with connection.cursor() as cursor:
                # First check for any existing records for this customer_group_selling_channel_id
                logger.info(f"Checking for existing visibility records for channel ID: {customer_group_selling_channel_id}")
                cursor.execute("""
                    SELECT COUNT(*) FROM product_visibility 
                    WHERE customer_group_selling_channel_id = %s
                """, [customer_group_selling_channel_id])
                existing_count = cursor.fetchone()[0]
                logger.info(f"Found {existing_count} existing visibility records")
                
                if existing_count > 0:
                    results['status'] = 'already_exists'
                    results['existing_count'] = existing_count
                    logger.warning(f"Visibility records already exist for CustomerGroupSellingChannel ID: {customer_group_selling_channel_id}")
                    return results
                client_id = 1
                # Simple insert for all products - with visibility=TRUE
                logger.info("Starting to create visibility records...")
                # Get company_id from the channel record
                company_id = channel.company_id if hasattr(channel, 'company_id') else 1
                
                cursor.execute("""
                    INSERT INTO product_visibility (
                        product_id, customer_group_selling_channel_id, is_visible,
                        created_at, updated_at, last_calculated, client_id, company_id,
                        category_id, division_id, subcategory_id
                    )
                    SELECT 
                        p.id, %s, TRUE, %s, %s, %s, %s, %s,
                        p.category_id, p.division_id, p.subcategory_id
                    FROM 
                        products_product p
                    WHERE 
                        p.is_active = TRUE
                        AND NOT EXISTS (
                            SELECT 1 FROM product_visibility pv 
                            WHERE pv.product_id = p.id 
                            AND pv.customer_group_selling_channel_id = %s
                        )
                """, [customer_group_selling_channel_id, now, now, now, client_id, company_id, customer_group_selling_channel_id])
                
                logger.info(f"Successfully created {cursor.rowcount} visibility records with company_id: {company_id}")
                
                created_count = cursor.rowcount
                results['created'] = created_count
                logger.info(f"Successfully created {created_count} visibility records")
        
        return results
    except Exception as e:
        results['status'] = 'error'
        results['error'] = str(e)
        return results