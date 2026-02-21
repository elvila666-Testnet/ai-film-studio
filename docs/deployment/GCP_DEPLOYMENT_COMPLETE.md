# AI Film Studio - Complete Google Cloud Platform Deployment Guide

**Last Updated**: February 1, 2026  
**Status**: Production Ready  
**Version**: 1.0.0

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Step-by-Step Deployment](#step-by-step-deployment)
4. [Configuration](#configuration)
5. [Monitoring and Logging](#monitoring-and-logging)
6. [Troubleshooting](#troubleshooting)
7. [Cost Optimization](#cost-optimization)
8. [Security Best Practices](#security-best-practices)

---

## Prerequisites

### Required Tools

- Google Cloud Platform account with billing enabled
- `gcloud` CLI installed and authenticated
- Docker installed
- Git installed
- GitHub account with repository access

### Required Permissions

Your GCP service account needs the following roles:

- Cloud SQL Client
- Storage Admin
- Cloud Run Admin
- Artifact Registry Writer
- Logging Log Writer
- Monitoring Metric Writer
- IAM Security Admin

---

## Architecture Overview

The AI Film Studio deployment on GCP consists of:

- **Cloud Run**: Serverless container execution for the application
- **Cloud SQL**: Managed MySQL database for persistent data
- **Cloud Storage**: Object storage for uploaded files and generated assets
- **Artifact Registry**: Docker image repository
- **Cloud Logging**: Centralized logging and monitoring
- **Cloud Monitoring**: Metrics and alerting

### Deployment Flow

```
GitHub Repository
    ↓
GitHub Actions (CI/CD)
    ↓
Build & Test
    ↓
Push to Artifact Registry
    ↓
Deploy to Cloud Run
    ↓
Cloud SQL (Database)
Cloud Storage (Files)
Cloud Logging (Logs)
```

---

## Step-by-Step Deployment

### Phase 1: GCP Project Setup

#### 1.1 Create GCP Project

```bash
# Set your desired project ID
export PROJECT_ID="ai-film-studio-prod"

# Create the project
gcloud projects create $PROJECT_ID \
  --name="AI Film Studio Production"

# Set as active project
gcloud config set project $PROJECT_ID
```

#### 1.2 Enable Required APIs

```bash
# Enable all required services
gcloud services enable \
  compute.googleapis.com \
  run.googleapis.com \
  sqladmin.googleapis.com \
  storage-api.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  cloudlogging.googleapis.com \
  cloudmonitoring.googleapis.com \
  iam.googleapis.com \
  servicenetworking.googleapis.com \
  cloudresourcemanager.googleapis.com
```

#### 1.3 Create Service Account

```bash
# Create service account
gcloud iam service-accounts create ai-film-studio-sa \
  --display-name="AI Film Studio Service Account"

# Grant necessary roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:ai-film-studio-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:ai-film-studio-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:ai-film-studio-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/logging.logWriter"
```

### Phase 2: Database Setup

#### 2.1 Create Cloud SQL Instance

```bash
# Create Cloud SQL instance
gcloud sql instances create ai-film-studio-db \
  --database-version=MYSQL_8_0 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --storage-type=PD_SSD \
  --storage-size=20GB \
  --backup-start-time=03:00 \
  --enable-bin-log \
  --retained-backups-count=7
```

#### 2.2 Create Database and User

```bash
# Create database
gcloud sql databases create ai_film_studio_prod \
  --instance=ai-film-studio-db

# Create database user
gcloud sql users create prod_user \
  --instance=ai-film-studio-db \
  --password="YOUR_SECURE_PASSWORD"

# Get connection name
gcloud sql instances describe ai-film-studio-db \
  --format='value(connectionName)'
```

#### 2.3 Configure Database Backups

```bash
# Enable automated backups
gcloud sql instances patch ai-film-studio-db \
  --backup-start-time=03:00 \
  --retained-backups-count=30
```

### Phase 3: Storage Setup

#### 3.1 Create Cloud Storage Bucket

```bash
# Create storage bucket
gsutil mb -p $PROJECT_ID -l us-central1 \
  gs://ai-film-studio-storage-prod

# Set lifecycle policy (delete files after 90 days)
cat > lifecycle.json << 'EOF'
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 90}
      }
    ]
  }
}
EOF

gsutil lifecycle set lifecycle.json \
  gs://ai-film-studio-storage-prod
```

#### 3.2 Configure Bucket Permissions

```bash
# Grant service account access
gsutil iam ch \
  serviceAccount:ai-film-studio-sa@$PROJECT_ID.iam.gserviceaccount.com:objectAdmin \
  gs://ai-film-studio-storage-prod
```

### Phase 4: Artifact Registry Setup

#### 4.1 Create Docker Repository

```bash
# Create Artifact Registry repository
gcloud artifacts repositories create ai-film-studio \
  --repository-format=docker \
  --location=us-central1

# Configure Docker authentication
gcloud auth configure-docker us-central1-docker.pkg.dev
```

### Phase 5: GitHub Actions Configuration

#### 5.1 Create Workload Identity Provider

```bash
# Create Workload Identity Pool
gcloud iam workload-identity-pools create github \
  --project=$PROJECT_ID \
  --location=global \
  --display-name=GitHub

# Get pool resource name
export WORKLOAD_IDENTITY_POOL_ID=$(gcloud iam workload-identity-pools describe github \
  --project=$PROJECT_ID \
  --location=global \
  --format='value(name)')

# Create Workload Identity Provider
gcloud iam workload-identity-pools providers create-oidc github-provider \
  --project=$PROJECT_ID \
  --location=global \
  --workload-identity-pool=github \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# Get provider resource name
export WORKLOAD_IDENTITY_PROVIDER=$(gcloud iam workload-identity-pools providers describe github-provider \
  --project=$PROJECT_ID \
  --location=global \
  --workload-identity-pool=github \
  --format='value(name)')
```

#### 5.2 Grant GitHub Access

```bash
# Grant GitHub repository access to service account
gcloud iam service-accounts add-iam-policy-binding \
  ai-film-studio-sa@$PROJECT_ID.iam.gserviceaccount.com \
  --project=$PROJECT_ID \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/$WORKLOAD_IDENTITY_PROVIDER/attribute.repository/YOUR_GITHUB_ORG/ai-film-studio"
```

#### 5.3 Add GitHub Secrets

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

```
GCP_PROJECT_ID = your-project-id
WIF_PROVIDER = projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github/providers/github-provider
WIF_SERVICE_ACCOUNT = ai-film-studio-sa@your-project-id.iam.gserviceaccount.com
CLOUD_SQL_CONNECTION_NAME = your-project-id:us-central1:ai-film-studio-db
CLOUD_SQL_DATABASE = ai_film_studio_prod
CLOUD_SQL_USER = prod_user
CLOUD_SQL_PASSWORD = your-secure-password
```

### Phase 6: Deploy Application

#### 6.1 Initial Deployment

```bash
# Build Docker image
docker build -t us-central1-docker.pkg.dev/$PROJECT_ID/ai-film-studio/app:latest .

# Push to Artifact Registry
docker push us-central1-docker.pkg.dev/$PROJECT_ID/ai-film-studio/app:latest

# Deploy to Cloud Run
gcloud run deploy ai-film-studio \
  --image=us-central1-docker.pkg.dev/$PROJECT_ID/ai-film-studio/app:latest \
  --region=us-central1 \
  --platform=managed \
  --memory=2Gi \
  --cpu=2 \
  --timeout=3600 \
  --allow-unauthenticated \
  --set-cloudsql-instances=$PROJECT_ID:us-central1:ai-film-studio-db \
  --service-account=ai-film-studio-sa@$PROJECT_ID.iam.gserviceaccount.com \
  --set-env-vars="NODE_ENV=production,DATABASE_URL=mysql://prod_user:PASSWORD@/ai_film_studio_prod?unix_socket=/cloudsql/$PROJECT_ID:us-central1:ai-film-studio-db"
```

#### 6.2 Get Service URL

```bash
# Get the deployed service URL
gcloud run services describe ai-film-studio \
  --region=us-central1 \
  --format='value(status.url)'
```

---

## Configuration

### Environment Variables

The following environment variables should be set in Cloud Run:

```
NODE_ENV=production
PORT=3000
DATABASE_URL=mysql://prod_user:PASSWORD@/ai_film_studio_prod?unix_socket=/cloudsql/PROJECT_ID:us-central1:ai-film-studio-db
JWT_SECRET=your-jwt-secret
VITE_APP_ID=your-app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://app.manus.im/login
OPENAI_API_KEY=your-openai-key
GEMINI_API_KEY=your-gemini-key
SORA_API_KEY=your-sora-key
VEO3_API_KEY=your-veo3-key
NANOBANANA_API_KEY=your-nanobanana-key
BUILT_IN_FORGE_API_KEY=your-forge-key
BUILT_IN_FORGE_API_URL=https://api.manus.im/forge
VITE_FRONTEND_FORGE_API_KEY=your-frontend-key
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im/forge
VITE_APP_TITLE=AI Film Studio
VITE_APP_LOGO=/logo.svg
OWNER_NAME=Your Name
OWNER_OPEN_ID=your-open-id
```

### Cloud SQL Proxy

For local development connecting to Cloud SQL:

```bash
# Start Cloud SQL Proxy
cloud_sql_proxy -instances=$PROJECT_ID:us-central1:ai-film-studio-db=tcp:3306 &

# Connect via MySQL
mysql -h 127.0.0.1 -u prod_user -p ai_film_studio_prod
```

---

## Monitoring and Logging

### View Logs

```bash
# View recent logs
gcloud logging read "resource.type=cloud_run_revision" --limit=50

# View specific service logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=ai-film-studio" --limit=100

# Stream logs in real-time
gcloud logging read "resource.type=cloud_run_revision" --limit=50 --follow
```

### Set Up Alerts

```bash
# Create alert policy for high error rate
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="AI Film Studio - High Error Rate" \
  --condition-display-name="Error Rate > 1%" \
  --condition-threshold-value=0.01 \
  --condition-threshold-duration=300s
```

### Monitor Performance

```bash
# View Cloud Run metrics
gcloud monitoring time-series list \
  --filter='resource.type="cloud_run_revision" AND metric.type="run.googleapis.com/request_count"'

# View database metrics
gcloud monitoring time-series list \
  --filter='resource.type="cloudsql_database"'
```

---

## Troubleshooting

### Common Issues

#### Issue: Cloud Run service fails to start

**Solution**: Check logs for errors

```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=ai-film-studio" --limit=50
```

#### Issue: Database connection timeout

**Solution**: Verify Cloud SQL Proxy is running and firewall rules allow access

```bash
# Check Cloud SQL instance status
gcloud sql instances describe ai-film-studio-db

# Verify service account has Cloud SQL Client role
gcloud projects get-iam-policy $PROJECT_ID
```

#### Issue: Out of memory errors

**Solution**: Increase Cloud Run memory allocation

```bash
gcloud run services update ai-film-studio \
  --region=us-central1 \
  --memory=4Gi
```

### Debug Mode

Enable debug logging:

```bash
# Update service with debug environment variable
gcloud run services update ai-film-studio \
  --region=us-central1 \
  --update-env-vars="LOG_LEVEL=debug"
```

---

## Cost Optimization

### Recommendations

1. **Use Cloud Run's autoscaling**: Automatically scales based on traffic
2. **Enable Cloud SQL autostorage**: Automatically increases storage as needed
3. **Set up budget alerts**: Monitor spending in GCP Console
4. **Use committed use discounts**: Save up to 37% with annual commitments
5. **Optimize Cloud Storage**: Use lifecycle policies to delete old files

### Estimated Monthly Costs

- Cloud Run: $0.40/million requests + compute time
- Cloud SQL (db-f1-micro): ~$10-15/month
- Cloud Storage: ~$0.02/GB
- Artifact Registry: ~$0.10/GB storage

**Total Estimated**: $20-50/month for typical usage

---

## Security Best Practices

### 1. Secrets Management

- Store all sensitive data in Google Secret Manager
- Never commit secrets to version control
- Rotate secrets regularly

### 2. Network Security

- Use VPC Service Controls for additional security
- Enable Cloud Armor for DDoS protection
- Restrict Cloud SQL access to service account only

### 3. Data Protection

- Enable encryption at rest (default)
- Enable encryption in transit (SSL/TLS)
- Enable automated backups
- Test backup restoration regularly

### 4. Audit Logging

- Enable Cloud Audit Logs
- Monitor IAM changes
- Review access logs regularly

### 5. Compliance

- Enable VPC Flow Logs for network monitoring
- Use Cloud DLP for data classification
- Implement data retention policies

---

## Useful Commands Reference

```bash
# Deployment
gcloud run deploy ai-film-studio --image=IMAGE_URL --region=us-central1

# Logs
gcloud logging read "resource.type=cloud_run_revision" --limit=50

# Database
gcloud sql instances describe ai-film-studio-db
gcloud sql databases list --instance=ai-film-studio-db
gcloud sql users list --instance=ai-film-studio-db

# Storage
gsutil ls gs://ai-film-studio-storage-prod
gsutil du -s gs://ai-film-studio-storage-prod

# Monitoring
gcloud monitoring dashboards list
gcloud monitoring alert-policies list

# Service Account
gcloud iam service-accounts list
gcloud iam service-accounts keys list --iam-account=ai-film-studio-sa@$PROJECT_ID.iam.gserviceaccount.com
```

---

## Support and Escalation

For issues or questions:

1. Check Cloud Logging for error messages
2. Review GCP documentation
3. Contact GCP Support (for paid support plans)
4. Check GitHub Issues for known problems

---

**Document Version**: 1.0.0  
**Last Updated**: 2026-02-01  
**Status**: Production Ready
