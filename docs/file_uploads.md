# File Upload System Documentation

## Google Cloud Storage (GCS) Configuration

### Authentication Methods

1. **Service Account Key**
   - Create a service account in Google Cloud Console
   - Download the JSON key file
   - Set `GS_CREDENTIALS` to the path of the key file
   - Ensure the service account has appropriate permissions on the bucket

2. **Application Default Credentials**
   - Alternative to service account key
   - Uses credentials from:
     - Google Cloud SDK (`gcloud auth application-default login`)
     - Environment variable `GOOGLE_APPLICATION_CREDENTIALS`
     - Compute Engine/Cloud Run/App Engine default service account

### Environment Variables

```env
GS_BUCKET_NAME=your-bucket-name
GS_PROJECT_ID=your-project-id
GS_CREDENTIALS=/path/to/service-account-key.json
GS_DEFAULT_ACL=projectPrivate  # or 'publicRead' for public files
GS_LOCATION=media/  # Optional: prefix for all uploaded files
```

## Redis Temporary Upload Schema

### Key Format
```
temp_upload:<uuid>
```

### Value Schema (JSON)
```json
{
    "file_path": "/path/on/server/where/temp/file/is/saved/uuid.jpg",
    "original_filename": "user_uploaded_image.jpg",
    "mime_type": "image/jpeg",
    "size_bytes": 1048576,
    "tenant_id": "tenant_schema_name",
    "user_id": 123
}
```

### TTL Configuration
- Keys expire after `TEMP_UPLOAD_EXPIRY_SECONDS` (default: 24 hours)
- Configured in Django settings: `TEMP_UPLOAD_EXPIRY_SECONDS = 60 * 60 * 24`

### File Path Structure
- Temporary files: `temp_uploads/<uuid>.<extension>`
- Final GCS path: `tenants/<schema>/assets/<uuid>.<extension>`

## Usage Notes

1. **Temporary Upload Process**
   - File is first uploaded to local disk in temp directory
   - Metadata stored in Redis with TTL
   - After validation/processing, file is moved to GCS
   - Redis key is deleted after successful GCS upload

2. **Security Considerations**
   - All temporary files should be cleaned up after processing
   - Redis keys auto-expire to prevent orphaned entries
   - GCS ACLs control file access
   - Tenant isolation enforced through path prefixing
