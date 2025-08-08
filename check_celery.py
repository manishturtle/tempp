"""
Script to check Celery configuration and registered tasks.

This script imports the Celery app and prints information about its
configuration and registered tasks.
"""
import os
import sys
import traceback
import django

print("Starting Celery configuration check...")

try:
    # Set up Django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'erp_backend.settings')
    print("Initializing Django...")
    django.setup()
    print("Django initialized successfully.")

    # Import the Celery app
    print("Importing Celery app...")
    from core.celery import app
    print("Celery app imported successfully.")

    # Print Celery configuration
    print("\nCelery Configuration:")
    print(f"Broker URL: {app.conf.broker_url}")
    print(f"Result Backend: {app.conf.result_backend}")
    print(f"Task Serializer: {app.conf.task_serializer if hasattr(app.conf, 'task_serializer') else 'Not set'}")
    print(f"Accept Content: {app.conf.accept_content if hasattr(app.conf, 'accept_content') else 'Not set'}")
    
    # Force task discovery
    print("\nForcing task discovery...")
    app.autodiscover_tasks(force=True)
    print("Task discovery completed.")

    # Print registered tasks
    print("\nRegistered Tasks:")
    task_count = 0
    for task_name in sorted(app.tasks.keys()):
        if not task_name.startswith('celery.'):
            print(f"- {task_name}")
            task_count += 1
    
    if task_count == 0:
        print("No application tasks found. Check that task modules are properly named and located.")
    else:
        print(f"\nTotal application tasks: {task_count}")
    
    # Check for order_management tasks specifically
    order_tasks = [task for task in app.tasks.keys() if task.startswith('order_management.')]
    print(f"\nOrder Management Tasks: {len(order_tasks)}")
    for task in order_tasks:
        print(f"- {task}")
    
    if not order_tasks:
        print("No order_management tasks found. Check that the tasks.py file is properly set up.")

except Exception as e:
    print(f"\nERROR: {e}")
    print("\nTraceback:")
    traceback.print_exc()
    sys.exit(1)

print("\nCelery configuration check completed successfully.")
