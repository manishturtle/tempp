FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set work directory
WORKDIR /app

# Create media directory for temporary file storage
RUN mkdir -p /app/mediafiles /app/staticfiles

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
COPY requirements-dev.txt .
RUN pip install --no-cache-dir -r requirements.txt -r requirements-dev.txt

# Copy project
COPY . .

# Expose port
EXPOSE 8000

# Set volume for GCS credentials
# Note: In production, use Docker secrets or mounted volume for GS_CREDENTIALS
VOLUME ["/app/gcs"]

# Set permissions
RUN chown -R www-data:www-data /app/mediafiles
RUN chown -R www-data:www-data /app/staticfiles

# Run server
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

# Instructions for GCS credentials:
# 1. Mount your service account key file using:
#    docker run -v /path/to/key.json:/app/gcs/key.json ...
# 2. Set GS_CREDENTIALS environment variable:
#    -e GS_CREDENTIALS=/app/gcs/key.json
