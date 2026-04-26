import { S3Client, CreateBucketCommand, PutBucketCorsCommand, HeadBucketCommand } from '@aws-sdk/client-s3';

const BUCKET_NAME = 'talentsync-uploads';
const REGION = 'us-east-1';
const ENDPOINT = 'http://localhost:9000';

async function setupMinIO() {
    console.log('🚀 Setting up MinIO...\n');

    const s3Client = new S3Client({
        region: REGION,
        endpoint: ENDPOINT,
        credentials: {
            accessKeyId: 'minioadmin',
            secretAccessKey: 'minioadmin',
        },
        forcePathStyle: true, // Required for MinIO
    });

    try {
        // Check if bucket exists
        console.log(`📦 Checking if bucket "${BUCKET_NAME}" exists...`);
        try {
            await s3Client.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
            console.log(`✅ Bucket "${BUCKET_NAME}" already exists\n`);
        } catch (error) {
            // Bucket doesn't exist, create it
            console.log(`📦 Creating bucket "${BUCKET_NAME}"...`);
            await s3Client.send(new CreateBucketCommand({ Bucket: BUCKET_NAME }));
            console.log(`✅ Bucket "${BUCKET_NAME}" created successfully\n`);
        }

        // Set CORS configuration
        console.log('🔧 Configuring CORS...');
        await s3Client.send(new PutBucketCorsCommand({
            Bucket: BUCKET_NAME,
            CORSConfiguration: {
                CORSRules: [
                    {
                        AllowedHeaders: ['*'],
                        AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
                        AllowedOrigins: [
                            'http://localhost:3000',
                            'http://localhost:4000',
                        ],
                        ExposeHeaders: ['ETag', 'x-amz-request-id'],
                        MaxAgeSeconds: 3600,
                    },
                ],
            },
        }));
        console.log('✅ CORS configured successfully\n');

        console.log('🎉 MinIO setup complete!\n');
        console.log('📋 Summary:');
        console.log(`   - Bucket: ${BUCKET_NAME}`);
        console.log(`   - Region: ${REGION}`);
        console.log(`   - Endpoint: ${ENDPOINT}`);
        console.log(`   - Console: http://localhost:9001`);
        console.log(`   - Credentials: minioadmin / minioadmin\n`);

    } catch (error) {
        console.error('❌ Error setting up MinIO:', error);
        process.exit(1);
    }
}

setupMinIO();
