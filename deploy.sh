#!/bin/bash

# Exit on error
set -e

# Configuration
BUCKET_NAME="rk0-mandelbrot"
DIST_DIR="dist"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "Error: AWS CLI is not installed"
    echo "Install it from: https://aws.amazon.com/cli/"
    exit 1
fi

# Check if AWS credentials are configured
echo "Checking AWS credentials..."
if ! aws sts get-caller-identity &> /dev/null; then
    echo "Error: Not logged in to AWS CLI"
    echo "Run 'aws login'"
    exit 1
fi

echo "AWS credentials verified"

# Check if the S3 bucket exists and is accessible
echo "Checking S3 bucket access..."
if ! aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
    echo "Error: Cannot access S3 bucket '$BUCKET_NAME'"
    exit 1
fi

echo "S3 bucket '$BUCKET_NAME' is accessible"

# Upload index.html to root (overwrite)
echo "Uploading index.html..."
aws s3 cp "$DIST_DIR/index.html" "s3://$BUCKET_NAME/index.html" \
    --content-type "text/html" \
    --cache-control "no-cache, no-store, must-revalidate"

# Upload assets directory with date prefix (cache forever since they're hashed)
if [ -d "$DIST_DIR/assets" ]; then
    echo "Uploading assets..."
    aws s3 cp "$DIST_DIR/assets/" "s3://$BUCKET_NAME/assets/" \
        --recursive \
        --cache-control "public, max-age=31536000, immutable"
fi

echo "Deployment complete!"
echo "Assets uploaded to: s3://$BUCKET_NAME/"
