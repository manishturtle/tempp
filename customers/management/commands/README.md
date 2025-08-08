# Customer Data Import Command

## Overview

The `import_customers` management command allows you to import Account and Contact data from CSV files into the system. It supports different import modes, custom field mappings, and includes special logic for automatically creating Contact records for Individual type Accounts.

## Features

- Import Account and Contact data from CSV files
- Support for different import modes:
  - `create_only`: Only create new records
  - `update_only`: Only update existing records
  - `create_update`: Create new records and update existing ones (default)
- Custom field mappings via JSON file
- Auto-creation of Contacts for Individual type Accounts
- Validation using serializers
- Detailed error reporting and logging

## Usage

### Basic Usage

```bash
# Import Accounts
python manage.py import_customers --model Account --file path/to/accounts.csv

# Import Contacts
python manage.py import_customers --model Contact --file path/to/contacts.csv
```

### Specifying Import Mode

```bash
# Create only
python manage.py import_customers --model Account --file path/to/accounts.csv --mode create_only

# Update only
python manage.py import_customers --model Account --file path/to/accounts.csv --mode update_only

# Create and update (default)
python manage.py import_customers --model Account --file path/to/accounts.csv --mode create_update
```

### Using Custom Field Mappings

```bash
python manage.py import_customers --model Account --file path/to/accounts.csv --mapping path/to/mapping.json
```

## CSV File Format

### Account CSV Format

The CSV file for importing Accounts should have the following columns:

- `name`: Account name (required)
- `legal_name`: Legal name (optional)
- `account_number`: Account number (required for update operations)
- `customer_group`: Customer group name (required)
- `parent_account`: Parent account number (optional)
- `website`: Website URL (optional)
- `industry`: Industry (optional)
- `description`: Description (optional)
- `primary_contact_first_name`: First name of primary contact (for Individual accounts)
- `primary_contact_last_name`: Last name of primary contact (for Individual accounts)
- `primary_contact_email`: Email of primary contact (for Individual accounts)
- `primary_contact_phone`: Phone of primary contact (for Individual accounts)

### Contact CSV Format

The CSV file for importing Contacts should have the following columns:

- `first_name`: First name (required)
- `last_name`: Last name (required)
- `email`: Email (required for update operations)
- `phone`: Phone (optional)
- `account`: Account number (required)
- `job_title`: Job title (optional)
- `department`: Department (optional)
- `is_primary`: Is primary contact (optional, values: 'true', 'yes', '1', or 'false', 'no', '0')

## Mapping File Format

The mapping file is a JSON file that maps CSV column names to model field names. Example:

```json
{
  "name": "name",
  "legal_name": "legal_name",
  "account_number": "account_number",
  "customer_group": "customer_group"
}
```

## Auto-Creation of Contacts for Individual Accounts

When importing Account data, the command will automatically create Contact records for Accounts that belong to a CustomerGroup with `group_type="INDIVIDUAL"`. The Contact will be created using the following fields from the Account data:

- `primary_contact_first_name` -> `first_name`
- `primary_contact_last_name` -> `last_name`
- `primary_contact_email` -> `email`
- `primary_contact_phone` -> `phone`

The Contact will be linked to the Account and marked as the primary contact.

## Error Handling

If errors occur during the import process, they will be reported in the command output and written to a log file named `import_errors_{model}_{timestamp}.log`. The log file contains detailed information about each error, including the row number, row data, and error message.

## Future Improvements

- Asynchronous processing for large files using Celery tasks
- Progress reporting for long-running imports
- Support for more import formats (Excel, JSON, etc.)
- More advanced validation and data transformation options
