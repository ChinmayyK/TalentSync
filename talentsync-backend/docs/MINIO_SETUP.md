# MinIO/S3 Setup Guide

## Quick Start

### 1. Start Services

```bash
# Start all services (PostgreSQL, Redis, MinIO)
docker-compose up -d

# Check services are running
docker-compose ps
```

### 2. Setup MinIO

```bash
# Create bucket and configure CORS
npx ts-node scripts/setup-minio.ts
```

### 3. Access MinIO Console

Open http://localhost:9001 in your browser

- **Username:** minioadmin
- **Password:** minioadmin

## Configuration

### Environment Variables

The following variables are configured in `.env`:

```bash
# S3/MinIO Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
S3_BUCKET_NAME=talentsync-uploads
S3_ENDPOINT=http://localhost:9000
S3_USE_PATH_STYLE=true  # Required for MinIO
```

### Bucket Structure

Files are organized by tenant and entity:

```
talentsync-uploads/
├── tenant_123/
│   ├── candidate/
│   │   └── {candidateId}/
│   │       └── files/
│   │           └── {fileId}/
│   │               └── {filename}
│   ├── interview/
│   └── user/
```

## Testing

### Test File Upload

```bash
# 1. Get upload URL
curl -X POST http://localhost:4000/api/v1/candidates/{id}/resume/upload-url \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"filename": "resume.pdf"}'

# 2. Upload file to S3 (use uploadUrl from response)
curl -X PUT "{uploadUrl}" \
  --upload-file resume.pdf

# 3. Attach file
curl -X POST http://localhost:4000/api/v1/candidates/{id}/resume/attach \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fileId": "file-123",
    "mimeType": "application/pdf",
    "size": 12345
  }'
```

## Troubleshooting

### MinIO not accessible

```bash
# Check if MinIO is running
docker-compose ps minio

# View MinIO logs
docker-compose logs minio

# Restart MinIO
docker-compose restart minio
```

### Connection refused

Make sure `S3_ENDPOINT` in `.env` matches the MinIO port (9000 for API, not 9001 for console).

### CORS errors

Run the setup script again to reconfigure CORS:
```bash
npx ts-node scripts/setup-minio.ts
```

## Production Setup

For production, use AWS S3:

1. Remove `S3_ENDPOINT` from `.env`
2. Remove `S3_USE_PATH_STYLE` from `.env`
3. Use real AWS credentials:
   ```bash
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your-real-key
   AWS_SECRET_ACCESS_KEY=your-real-secret
   S3_BUCKET_NAME=your-production-bucket
   ```

4. Create S3 bucket in AWS Console
5. Configure bucket policy and CORS in AWS Console

## Next Steps

- ✅ MinIO setup complete
- ⏳ Test file upload end-to-end
- ⏳ Configure backup strategy
- ⏳ Set up monitoring
