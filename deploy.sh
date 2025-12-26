#!/bin/bash

# Exit on error
set -e

# Configuration
BUCKET_NAME="rk0-mandelbrot"
DIST_DIR="dist"

echo "Deploying to S3 bucket: $BUCKET_NAME"

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
