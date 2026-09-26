#!/usr/bin/env bash
set -e

echo "=========================================="
echo "  StopFrauda - Google Cloud Run Deploy"
echo "=========================================="

# 1. Verify project
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo "No project selected. Available projects:"
    gcloud projects list
    read -p "Enter your Google Cloud Project ID: " PROJECT_ID
    gcloud config set project "$PROJECT_ID"
fi

echo "Deploying to Google Cloud Project: $PROJECT_ID"

# 2. Deploy container to Cloud Run
gcloud run deploy stopfrauda-backend \
    --source . \
    --region us-central1 \
    --allow-unauthenticated \
    --set-env-vars ENVIRONMENT=production

echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
