from django.core.management.base import BaseCommand
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import os

class Command(BaseCommand):
    help = 'Test GCS configuration and file upload'

    def handle(self, *args, **options):
        try:
            self.stdout.write('Testing GCS configuration...')
            
            # Test writing a file
            test_content = 'This is a test file for GCS'
            test_path = 'catalogue-images/test/test_file.txt'
            
            self.stdout.write(f'\nAttempting to write to: {test_path}')
            
            # Write to GCS
            with default_storage.open(test_path, 'w') as f:
                f.write(test_content)
            
            self.stdout.write(self.style.SUCCESS('✅ Successfully wrote file to GCS'))
            
            # Test reading the file
            with default_storage.open(test_path, 'r') as f:
                content = f.read()
                self.stdout.write(f'\nFile content: {content}')
            
            self.stdout.write(self.style.SUCCESS('✅ Successfully read file from GCS'))
            
            # Clean up
            default_storage.delete(test_path)
            self.stdout.write(self.style.SUCCESS('✅ Successfully deleted test file'))
            
            self.stdout.write('\nGCS configuration is working correctly!')
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error testing GCS: {str(e)}'))
