import io
import csv
from celery import shared_task
from django_tenants.utils import tenant_context
from tenants.models import Tenant
from django.core.exceptions import ObjectDoesNotExist, ValidationError as DjangoValidationError
from django.contrib.auth.models import User
from .models import (
    FulfillmentLocation, 
    Inventory, 
    AdjustmentReason, 
    AdjustmentType
)
from products.models import Product
from .services import perform_inventory_adjustment

@shared_task(bind=True)
def process_inventory_import(self, tenant_id, file_content_str, user_id):
    """
    Processes an uploaded CSV file to perform inventory adjustments.
    Runs asynchronously via Celery.
    """
    tenant = None
    user = None
    try:
        # Fetch Tenant and User first - essential for context and audit
        tenant = Tenant.objects.get(id=tenant_id)
        user = User.objects.get(id=user_id) # Needed for perform_inventory_adjustment
    except (Tenant.DoesNotExist, User.DoesNotExist) as e:
        # Critical setup error, fail the task immediately
        error_msg = f'Setup Error: Tenant or User not found: {str(e)}'
        self.update_state(state='FAILURE', meta={'error': error_msg})
        return {'status': 'FAILURE', 'message': error_msg}

    # Use tenant context manager for all database operations within this tenant
    with tenant_context(tenant):
        results = {'processed': 0, 'success': 0, 'errors': 0, 'error_details': []}
        current_row = 0 # Keep track for error reporting

        try:
            file_like_object = io.StringIO(file_content_str)
            # Use DictReader for easy access by header name
            reader = csv.DictReader(file_like_object)

            # --- Header Validation ---
            required_headers = ['sku', 'location_name', 'quantity'] # Define essential columns
            if not reader.fieldnames:
                 raise ValueError("CSV file appears to be empty or has no headers.")
            # Create a case-insensitive mapping
            header_map = {h.lower().strip(): h for h in reader.fieldnames}
            if not all(h_req in header_map for h_req in required_headers):
                missing = [h_req for h_req in required_headers if h_req not in header_map]
                raise ValueError(f"CSV missing required headers (case-insensitive): {', '.join(missing)}")

            # --- Setup Adjustment Reason and Type ---
            try:
                # Attempt to find or create a specific reason for imports
                reason_name = "CSV Import Adjustment"
                import_reason, _ = AdjustmentReason.objects.get_or_create(
                    name=reason_name,
                    defaults={'description': 'Adjustment performed via CSV import.', 'is_active': True}
                )
            except Exception:
                # Fallback if get_or_create fails (e.g., DB issue, constraint)
                import_reason = AdjustmentReason.objects.filter(is_active=True).first()
                if not import_reason:
                    raise ValueError("Configuration Error: No active AdjustmentReason found.")

            # Determine adjustment type - using CYCLE_COUNT assumes CSV 'quantity' is the TARGET quantity.
            adjustment_type = AdjustmentType.CYCLE_COUNT

            # --- Row Processing Loop ---
            print(f"[Tenant: {tenant.schema_name}] Starting Inventory Import for User ID {user_id}...")
            for row_num, row_data in enumerate(reader, start=1):
                current_row = row_num
                # Map headers using header_map for case-insensitivity
                row = {key: row_data[header_map[key]] for key in header_map if key in header_map} # Use mapped keys

                try:
                    sku = row.get('sku', '').strip()
                    location_name = row.get('location_name', '').strip()
                    quantity_str = row.get('quantity', '').strip()

                    if not all([sku, location_name, quantity_str]):
                        raise ValueError("Missing required data (sku, location_name, or quantity)")

                    try:
                        quantity_target = int(quantity_str) # This is the target quantity from CSV
                        if quantity_target < 0:
                            raise ValueError("Target quantity cannot be negative.")
                    except ValueError:
                        raise ValueError(f"Invalid quantity format: '{quantity_str}'")

                    # Find Product and Location (within tenant context)
                    try:
                        product = Product.objects.get(sku=sku)
                    except Product.DoesNotExist:
                        raise ObjectDoesNotExist(f"Product with SKU '{sku}' not found.")

                    try:
                        location = FulfillmentLocation.objects.get(name=location_name)
                    except FulfillmentLocation.DoesNotExist:
                        raise ObjectDoesNotExist(f"Location with name '{location_name}' not found.")

                    # Find or create the Inventory record
                    inventory, created = Inventory.objects.get_or_create(
                        product=product,
                        location=location,
                        defaults={'stock_quantity': 0} # Sensible default if creating
                    )

                    # Calculate the required change for CYCLE_COUNT
                    current_stock = inventory.stock_quantity
                    quantity_change = quantity_target - current_stock # Delta needed

                    if quantity_change == 0:
                        # No change needed, just mark as processed
                        results['processed'] += 1
                        results['success'] += 1
                        continue # Skip calling the service

                    # Call the adjustment service (which handles its own transaction)
                    perform_inventory_adjustment(
                        user=user,
                        inventory=inventory,
                        adjustment_type=adjustment_type, # CYCLE_COUNT
                        quantity_change=quantity_change, # The signed delta needed
                        reason=import_reason,
                        notes=f"CSV Import Row {row_num}"
                    )

                    results['processed'] += 1
                    results['success'] += 1

                    # Optional: Update task progress periodically
                    if row_num % 50 == 0:
                        self.update_state(state='PROGRESS', meta={'processed': results['processed'], 'errors': results['errors']})

                except (ObjectDoesNotExist, ValueError, DjangoValidationError) as row_error:
                    results['processed'] += 1 # Mark as processed even if error occurred
                    results['errors'] += 1
                    results['error_details'].append({
                        'row': row_num,
                        'sku': sku if 'sku' in locals() else 'N/A',
                        'location': location_name if 'location_name' in locals() else 'N/A',
                        'error': str(row_error)
                    })
                except Exception as unexpected_row_error:
                    # Catch other unexpected errors during single row processing
                    results['processed'] += 1
                    results['errors'] += 1
                    results['error_details'].append({
                        'row': row_num,
                        'sku': sku if 'sku' in locals() else 'N/A',
                        'location': location_name if 'location_name' in locals() else 'N/A',
                        'error': f'Unexpected Error: {str(unexpected_row_error)}'
                    })

            # --- End Processing Loop ---
            final_status = 'SUCCESS'
            if results['errors'] > 0:
                final_status = 'PARTIAL_FAILURE'
            if results['processed'] == 0:
                final_status = 'NO_ROWS_PROCESSED' # More specific than NO_ROWS

            print(f"[Tenant: {tenant.schema_name}] Import finished. Processed: {results['processed']}, Success: {results['success']}, Errors: {results['errors']}")
            self.update_state(state=final_status, meta=results)
            return {'status': final_status, 'details': results}

        except Exception as e:
            # Catch errors during file reading, header validation, or general setup within tenant context
            print(f"[Tenant: {tenant.schema_name}] Import failed. Error: {str(e)}")
            error_msg = f'Critical processing error around row {current_row}: {str(e)}'
            results['errors'] += 1 # Increment error count
            # Avoid appending duplicate error if already caught in row loop, but good as fallback
            if not any(d['row'] == current_row and 'Critical' in d.get('error','') for d in results['error_details']):
                 results['error_details'].append({'row': current_row if current_row > 0 else 'Setup', 'error': error_msg})

            self.update_state(state='FAILURE', meta=results)
            return {'status': 'FAILURE', 'message': error_msg, 'details': results}
