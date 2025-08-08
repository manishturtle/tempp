# ERP Backend

A multi-tenant SaaS ERP system built with Django 4.2 and Django REST Framework.

## Project Structure

- `core/`: Core functionalities, settings, base models, utilities
- `users/`: Custom user management and authentication
- `tenants/`: Multi-tenancy management
- `inventory/`: Inventory Management module
- `products/`: Product Management module

## Tech Stack

- Django 4.2
- Django REST Framework
- PostgreSQL 17
- Python-dotenv
- dj-database-url

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
.\venv\Scripts\activate  # Windows
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment variables:
Create a `.env` file in the project root with the following variables:
```
DEBUG=True
SECRET_KEY=your-secret-key-here
DATABASE_URL=postgres://user:password@localhost:5432/erp_backend
ALLOWED_HOSTS=localhost,127.0.0.1
TIME_ZONE=UTC
```

4. Run migrations:
```bash
python manage.py migrate
```

5. Create a superuser:
```bash
python manage.py createsuperuser
```

6. Run the development server:
```bash
python manage.py runserver
```

## Development

The project follows a modular architecture with separate apps for different functionalities:

- Core app handles base functionality
- Users app manages authentication and user management
- Tenants app handles multi-tenancy
- Inventory and Products apps are placeholders for their respective modules

## API Documentation

API documentation will be available at `/api/docs/` once the project is running.
