"""
Management command for importing Account and Contact data from CSV files.

This command imports Account and Contact data from CSV files, with support for:
- Different import modes (create_only, update_only, create_update)
- Custom field mappings via JSON file
- Auto-creation of Contacts for Individual type Accounts
- Validation using serializers
- Detailed error reporting

Usage:
    python manage.py import_customers --model Account --file accounts.csv [--mode create_update] [--mapping mapping.json]
    python manage.py import_customers --model Contact --file contacts.csv [--mode create_update] [--mapping mapping.json]
"""
import os
import csv
import json
import logging
from typing import Dict, Any, List, Tuple, Optional, Union
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from customers.models import Account, Contact, CustomerGroup
from customers.serializers import AccountSerializer, ContactSerializer

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    """
    Import Account and Contact data from CSV files.
    
    This command handles importing Account and Contact data from CSV files,
    with support for different import modes, custom field mappings, and
    auto-creation of Contacts for Individual type Accounts.
    """
    
    help = 'Import Account and Contact data from CSV files'
    
    def add_arguments(self, parser):
        """
        Add command line arguments.
        
        Args:
            parser: ArgumentParser instance
        """
        parser.add_argument(
            '--model',
            type=str,
            required=True,
            choices=['Account', 'Contact'],
            help='Model to import data for (Account or Contact)'
        )
        parser.add_argument(
            '--file',
            type=str,
            required=True,
            help='Path to CSV file containing data to import'
        )
        parser.add_argument(
            '--mode',
            type=str,
            default='create_update',
            choices=['create_only', 'update_only', 'create_update'],
            help='Import mode: create_only, update_only, or create_update (default)'
        )
        parser.add_argument(
            '--mapping',
            type=str,
            help='Path to JSON file containing field mappings'
        )
    
    def load_mapping(self, mapping_file: str) -> Dict[str, str]:
        """
        Load field mappings from a JSON file.
        
        Args:
            mapping_file: Path to JSON file containing field mappings
            
        Returns:
            Dictionary of field mappings
        """
        try:
            with open(mapping_file, 'r') as f:
                mapping = json.load(f)
                return mapping
        except Exception as e:
            raise CommandError(f"Error loading mapping file: {str(e)}")
    
    def clean_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Clean data by stripping whitespace and handling empty strings.
        
        Args:
            data: Dictionary of data to clean
            
        Returns:
            Cleaned data dictionary
        """
        cleaned_data = {}
        for key, value in data.items():
            if isinstance(value, str):
                value = value.strip()
                if value == '':
                    value = None
            cleaned_data[key] = value
        return cleaned_data
    
    def handle_relationships(self, data: Dict[str, Any], model: str) -> Dict[str, Any]:
        """
        Handle relationships by looking up related objects.
        
        Args:
            data: Dictionary of data to process
            model: Model name ('Account' or 'Contact')
            
        Returns:
            Processed data dictionary with relationship fields resolved
        """
        processed_data = data.copy()
        
        # Handle customer_group for Account
        if model == 'Account' and 'customer_group' in data and data['customer_group']:
            try:
                group = CustomerGroup.objects.get(group_name__iexact=data['customer_group'])
                processed_data['customer_group'] = group.id
            except CustomerGroup.DoesNotExist:
                raise ValueError(f"Customer group '{data['customer_group']}' not found")
        
        # Handle parent_account for Account
        if model == 'Account' and 'parent_account' in data and data['parent_account']:
            try:
                parent = Account.objects.get(account_number=data['parent_account'])
                processed_data['parent_account'] = parent.id
            except Account.DoesNotExist:
                raise ValueError(f"Parent account '{data['parent_account']}' not found")
        
        # Handle account for Contact
        if model == 'Contact' and 'account' in data and data['account']:
            try:
                account = Account.objects.get(account_number=data['account'])
                processed_data['account'] = account.id
            except Account.DoesNotExist:
                raise ValueError(f"Account '{data['account']}' not found")
        
        # Handle boolean fields
        if model == 'Contact' and 'is_primary' in data:
            if isinstance(data['is_primary'], str):
                processed_data['is_primary'] = data['is_primary'].lower() in ('true', 'yes', '1')
        
        return processed_data
    
    def process_account_row(
        self, 
        row: Dict[str, Any], 
        mapping: Dict[str, str], 
        mode: str, 
        user: Any = None
    ) -> Tuple[bool, str, Optional[Account]]:
        """
        Process a single Account row from the CSV file.
        
        Args:
            row: Dictionary of row data
            mapping: Dictionary of field mappings
            mode: Import mode (create_only, update_only, create_update)
            user: User performing the import (for audit fields)
            
        Returns:
            Tuple of (success, message, account_instance)
        """
        # Map fields according to mapping
        data = {}
        for model_field, csv_field in mapping.items():
            if csv_field in row:
                data[model_field] = row[csv_field]
        
        # Clean data
        data = self.clean_data(data)
        
        # Get unique identifier for update modes
        account_number = data.get('account_number')
        if not account_number and (mode == 'update_only' or mode == 'create_update'):
            return False, "Account number is required for update operations", None
        
        # Handle update mode
        instance = None
        if mode in ('update_only', 'create_update') and account_number:
            try:
                instance = Account.objects.get(account_number=account_number)
            except Account.DoesNotExist:
                if mode == 'update_only':
                    return False, f"Account with number '{account_number}' not found", None
        
        # Handle create_only mode
        if mode == 'create_only' and account_number:
            if Account.objects.filter(account_number=account_number).exists():
                return False, f"Account with number '{account_number}' already exists", None
        
        try:
            # Handle relationships
            data = self.handle_relationships(data, 'Account')
            
            # Set audit fields if user is provided
            if user:
                if instance is None:  # Creating new account
                    data['created_by'] = user.id
                data['updated_by'] = user.id
            
            # Validate and save using serializer
            serializer = AccountSerializer(instance=instance, data=data, partial=(instance is not None))
            if serializer.is_valid():
                with transaction.atomic():
                    account_instance = serializer.save()
                    
                    # Auto-create Contact for Individual accounts
                    self.create_contact_for_individual_account(account_instance, data, user)
                    
                    return True, f"Account '{account_instance.name}' {'updated' if instance else 'created'}", account_instance
            else:
                return False, f"Validation error: {serializer.errors}", None
                
        except ValueError as e:
            return False, str(e), None
        except Exception as e:
            return False, f"Error processing account: {str(e)}", None
    
    def create_contact_for_individual_account(
        self, 
        account: Account, 
        data: Dict[str, Any], 
        user: Any = None
    ) -> Optional[Contact]:
        """
        Create a Contact record for an Individual type Account.
        
        Args:
            account: Account instance
            data: Dictionary of account data
            user: User performing the import (for audit fields)
            
        Returns:
            Created Contact instance or None
        """
        try:
            # Check if account belongs to an Individual customer group
            if not account.customer_group or account.customer_group.group_type != 'INDIVIDUAL':
                return None
            
            # Check if required contact fields are present
            first_name = data.get('primary_contact_first_name')
            last_name = data.get('primary_contact_last_name')
            email = data.get('primary_contact_email')
            
            if not first_name or not last_name:
                logger.warning(f"Cannot auto-create Contact for Account '{account.name}': Missing name fields")
                return None
            
            # Check if contact already exists
            if Contact.objects.filter(account=account, email=email).exists():
                logger.info(f"Contact already exists for Account '{account.name}'")
                return None
            
            # Create contact data
            contact_data = {
                'first_name': first_name,
                'last_name': last_name,
                'email': email,
                'phone': data.get('primary_contact_phone'),
                'account': account.id,
                'is_primary': True
            }
            
            # Set audit fields if user is provided
            if user:
                contact_data['created_by'] = user.id
                contact_data['updated_by'] = user.id
            
            # Create contact using serializer
            serializer = ContactSerializer(data=contact_data)
            if serializer.is_valid():
                contact = serializer.save()
                logger.info(f"Auto-created Contact '{contact.first_name} {contact.last_name}' for Individual Account '{account.name}'")
                return contact
            else:
                logger.warning(f"Cannot auto-create Contact for Account '{account.name}': {serializer.errors}")
                return None
                
        except Exception as e:
            logger.error(f"Error auto-creating Contact for Account '{account.name}': {str(e)}")
            return None
    
    def process_contact_row(
        self, 
        row: Dict[str, Any], 
        mapping: Dict[str, str], 
        mode: str, 
        user: Any = None
    ) -> Tuple[bool, str, Optional[Contact]]:
        """
        Process a single Contact row from the CSV file.
        
        Args:
            row: Dictionary of row data
            mapping: Dictionary of field mappings
            mode: Import mode (create_only, update_only, create_update)
            user: User performing the import (for audit fields)
            
        Returns:
            Tuple of (success, message, contact_instance)
        """
        # Map fields according to mapping
        data = {}
        for model_field, csv_field in mapping.items():
            if csv_field in row:
                data[model_field] = row[csv_field]
        
        # Clean data
        data = self.clean_data(data)
        
        # Get unique identifier for update modes
        email = data.get('email')
        account_id = None
        
        if 'account' in data and data['account']:
            try:
                account = Account.objects.get(account_number=data['account'])
                account_id = account.id
            except Account.DoesNotExist:
                return False, f"Account '{data['account']}' not found", None
        
        if not email and (mode == 'update_only' or mode == 'create_update'):
            return False, "Email is required for update operations", None
        
        # Handle update mode
        instance = None
        if mode in ('update_only', 'create_update') and email:
            query = Contact.objects.filter(email=email)
            if account_id:
                query = query.filter(account_id=account_id)
            
            try:
                instance = query.get()
            except Contact.DoesNotExist:
                if mode == 'update_only':
                    return False, f"Contact with email '{email}' not found", None
            except Contact.MultipleObjectsReturned:
                return False, f"Multiple contacts found with email '{email}'", None
        
        # Handle create_only mode
        if mode == 'create_only' and email and account_id:
            if Contact.objects.filter(email=email, account_id=account_id).exists():
                return False, f"Contact with email '{email}' already exists for this account", None
        
        try:
            # Handle relationships
            data = self.handle_relationships(data, 'Contact')
            
            # Set audit fields if user is provided
            if user:
                if instance is None:  # Creating new contact
                    data['created_by'] = user.id
                data['updated_by'] = user.id
            
            # Validate and save using serializer
            serializer = ContactSerializer(instance=instance, data=data, partial=(instance is not None))
            if serializer.is_valid():
                contact_instance = serializer.save()
                return True, f"Contact '{contact_instance.first_name} {contact_instance.last_name}' {'updated' if instance else 'created'}", contact_instance
            else:
                return False, f"Validation error: {serializer.errors}", None
                
        except ValueError as e:
            return False, str(e), None
        except Exception as e:
            return False, f"Error processing contact: {str(e)}", None
    
    def handle(self, *args, **options):
        """
        Execute the command.
        
        Args:
            *args: Variable length argument list
            **options: Arbitrary keyword arguments
        """
        model = options['model']
        file_path = options['file']
        mode = options['mode']
        mapping_file = options.get('mapping')
        
        # Validate file path
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        
        # Load mapping
        if mapping_file:
            self.stdout.write(f"Using mapping from file: {mapping_file}")
            mapping = self.load_mapping(mapping_file)
        else:
            # Default mappings
            if model == 'Account':
                mapping = {
                    'name': 'name',
                    'legal_name': 'legal_name',
                    'account_number': 'account_number',
                    'customer_group': 'customer_group',
                    'parent_account': 'parent_account',
                    'website': 'website',
                    'industry': 'industry',
                    'description': 'description',
                    'primary_contact_first_name': 'primary_contact_first_name',
                    'primary_contact_last_name': 'primary_contact_last_name',
                    'primary_contact_email': 'primary_contact_email',
                    'primary_contact_phone': 'primary_contact_phone'
                }
            else:  # Contact
                mapping = {
                    'first_name': 'first_name',
                    'last_name': 'last_name',
                    'email': 'email',
                    'phone': 'phone',
                    'account': 'account',
                    'job_title': 'job_title',
                    'department': 'department',
                    'is_primary': 'is_primary'
                }
        
        # Initialize counters
        total_rows = 0
        success_count = 0
        error_count = 0
        errors = []
        
        # Get current user (if available)
        user = None
        
        # TODO: Refactor for large files: Process rows asynchronously using Celery tasks.
        # For large files, this should be refactored to use Celery tasks for asynchronous processing.
        # Each row could be processed in a separate task, with proper tenant and user context.
        
        # Process the CSV file
        with open(file_path, 'r', newline='', encoding='utf-8-sig') as csvfile:
            reader = csv.DictReader(csvfile)
            
            for row_num, row in enumerate(reader, start=2):  # Start at 2 to account for header row
                total_rows += 1
                
                try:
                    if model == 'Account':
                        success, message, _ = self.process_account_row(row, mapping, mode, user)
                    else:  # Contact
                        success, message, _ = self.process_contact_row(row, mapping, mode, user)
                    
                    if success:
                        success_count += 1
                        self.stdout.write(f"Row {row_num}: {message}")
                    else:
                        error_count += 1
                        error_detail = {
                            'row': row_num,
                            'data': row,
                            'error': message
                        }
                        errors.append(error_detail)
                        self.stdout.write(self.style.ERROR(f"Row {row_num}: {message}"))
                
                except Exception as e:
                    error_count += 1
                    error_detail = {
                        'row': row_num,
                        'data': row,
                        'error': str(e)
                    }
                    errors.append(error_detail)
                    self.stdout.write(self.style.ERROR(f"Row {row_num}: Error: {str(e)}"))
        
        # Print summary
        self.stdout.write("\nImport Summary:")
        self.stdout.write(f"Total rows processed: {total_rows}")
        self.stdout.write(f"Successfully imported: {success_count}")
        self.stdout.write(f"Errors encountered: {error_count}")
        
        if error_count > 0:
            self.stdout.write(self.style.WARNING(f"\nImport completed with errors. {error_count} rows failed to import."))
            
            # Write errors to log file
            timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
            log_file = f"import_errors_{model.lower()}_{timestamp}.log"
            
            with open(log_file, 'w') as f:
                json.dump(errors, f, indent=2)
            
            self.stdout.write(f"Detailed error log written to: {log_file}")
        else:
            self.stdout.write(self.style.SUCCESS("\nImport completed successfully!"))
