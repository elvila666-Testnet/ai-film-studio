# AI Film Studio - Google Cloud Deployment Guide

**Author:** Manus AI  
**Version:** 1.0  
**Last Updated:** January 30, 2026

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Google Cloud Setup](#google-cloud-setup)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup](#database-setup)
6. [Deployment Steps](#deployment-steps)
7. [Post-Deployment Verification](#post-deployment-verification)
8. [Monitoring and Maintenance](#monitoring-and-maintenance)
9. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

AI Film Studio is a full-stack web application built with React 19, Express 4, tRPC 11, and Drizzle ORM. The application provides AI-powered film production tools including script generation, visual storyboarding, character casting, moodboard management, and voiceover generation.

### Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Frontend | React 19 + Tailwind CSS 4 | User interface and client-side logic |
| Backend | Express 4 + Node.js | API server and business logic |
| API Layer | tRPC 11 | Type-safe RPC communication |
| Database | MySQL/TiDB | Data persistence |
| ORM | Drizzle ORM | Database abstraction and migrations |
| Authentication | Manus OAuth | User authentication and authorization |
| File Storage | Google Cloud Storage | Image and video file storage |
| AI Services | Multiple APIs | LLM, image generation, voiceover generation |

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Google Cloud Platform                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Cloud Run (Containerized App)              │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │  Frontend (React + Vite)                       │  │   │
│  │  │  - Landing page                               │  │   │
│  │  │  - Project editor                             │  │   │
│  │  │  - Brand intelligence dashboard               │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │  Backend (Express + tRPC)                      │  │   │
│  │  │  - API routes                                 │  │   │
│  │  │  - Business logic                             │  │   │
│  │  │  - OAuth callback handler                     │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Cloud SQL (MySQL)                          │   │
│  │  - Projects, scripts, storyboards                   │   │
│  │  - Users, brands, characters                        │   │
│  │  - Content metadata                                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Cloud Storage (GCS)                        │   │
│  │  - Generated images and videos                      │   │
│  │  - Moodboard references                             │   │
│  │  - User uploads                                     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
    ┌─────────┐          ┌─────────┐         ┌──────────┐
    │ Manus   │          │ External│         │ Analytics│
    │ OAuth   │          │ APIs    │         │ Service  │
    │ Server  │          │(LLM,    │         │          │
    │         │          │ Image)  │         │          │
    └─────────┘          └─────────┘         └──────────┘
```

---

## Prerequisites

Before deploying to Google Cloud, ensure you have the following:

### Required Tools

- **Google Cloud SDK** — Install from https://cloud.google.com/sdk/docs/install
- **Docker** — Install from https://docs.docker.com/get-docker/
- **Node.js 22+** — Install from https://nodejs.org/
- **Git** — For version control and repository access

### Google Cloud Project

- Active Google Cloud Project with billing enabled
- Service account with appropriate permissions (Cloud Run, Cloud SQL, Cloud Storage)
- Domain configured in Cloud DNS (optional, for custom domains)

### API Credentials

Gather the following credentials before deployment:

| Service | Credential Type | Where to Get |
|---------|-----------------|-------------|
| Manus OAuth | OAuth Application ID & Secret | Manus Dashboard |
| LLM Service | API Key | Manus Dashboard |
| Image Generation | API Key | Manus Dashboard |
| ElevenLabs | API Key | https://elevenlabs.io/app/api-keys |
| Google Cloud Storage | Service Account JSON | Google Cloud Console |

---

## Google Cloud Setup

### Step 1: Create Google Cloud Project

```bash
# Set your project ID
export PROJECT_ID="ai-film-studio-prod"
export REGION="us-central1"

# Create project
gcloud projects create $PROJECT_ID

# Set as default
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  storage-api.googleapis.com \
  cloudkms.googleapis.com \
  artifactregistry.googleapis.com
```

### Step 2: Create Cloud SQL Instance

```bash
# Create MySQL instance
gcloud sql instances create ai-film-studio-db \
  --database-version=MYSQL_8_0 \
  --tier=db-f1-micro \
  --region=$REGION \
  --availability-type=REGIONAL \
  --backup-start-time=03:00 \
  --enable-bin-log

# Create database
gcloud sql databases create ai_film_studio \
  --instance=ai-film-studio-db

# Create application user
gcloud sql users create app_user \
  --instance=ai-film-studio-db \
  --password=<SECURE_PASSWORD>
```

### Step 3: Create Cloud Storage Bucket

```bash
# Create bucket for media files
gsutil mb -l $REGION gs://ai-film-studio-media/

# Set lifecycle policy (optional: delete old files after 90 days)
cat > lifecycle.json << EOF
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

gsutil lifecycle set lifecycle.json gs://ai-film-studio-media/
```

### Step 4: Create Service Account

```bash
# Create service account
gcloud iam service-accounts create ai-film-studio-app \
  --display-name="AI Film Studio Application"

# Grant Cloud SQL Client role
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member=serviceAccount:ai-film-studio-app@$PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/cloudsql.client

# Grant Storage Object Admin role
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member=serviceAccount:ai-film-studio-app@$PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/storage.objectAdmin

# Create and download key
gcloud iam service-accounts keys create key.json \
  --iam-account=ai-film-studio-app@$PROJECT_ID.iam.gserviceaccount.com
```

---

## Environment Configuration

### Create .env.production File

Create a `.env.production` file with the following variables:

```bash
# Application
NODE_ENV=production
PORT=8080

# Database
DATABASE_URL="mysql://app_user:PASSWORD@CLOUD_SQL_IP:3306/ai_film_studio"

# Manus OAuth
VITE_APP_ID=your_manus_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://app.manus.im/login
JWT_SECRET=your_secure_jwt_secret

# Manus APIs
BUILT_IN_FORGE_API_URL=https://api.manus.im/forge
BUILT_IN_FORGE_API_KEY=your_forge_api_key
VITE_FRONTEND_FORGE_API_KEY=your_frontend_forge_key
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im/forge

# AI Services
OPENAI_API_KEY=your_openai_key
GEMINI_API_KEY=your_gemini_key
SORA_API_KEY=your_sora_key
VEO3_API_KEY=your_veo3_key
NANOBANANA_API_KEY=your_nanobanana_key

# ElevenLabs
ELEVENLABS_API_KEY=your_elevenlabs_key

# Google Cloud Storage
GOOGLE_CLOUD_PROJECT=$PROJECT_ID
GOOGLE_APPLICATION_CREDENTIALS=/var/secrets/google/key.json
GCS_BUCKET=ai-film-studio-media

# Analytics
VITE_ANALYTICS_ENDPOINT=your_analytics_endpoint
VITE_ANALYTICS_WEBSITE_ID=your_website_id

# Application Info
VITE_APP_TITLE="AI Film Studio"
VITE_APP_LOGO="/logo.svg"
OWNER_NAME="Your Name"
OWNER_OPEN_ID="your_open_id"
```

### Secure Secrets Management

Use Google Cloud Secret Manager to store sensitive values:

```bash
# Create secrets
echo -n "your_database_password" | gcloud secrets create db-password --data-file=-
echo -n "your_jwt_secret" | gcloud secrets create jwt-secret --data-file=-
echo -n "your_api_key" | gcloud secrets create manus-api-key --data-file=-

# Grant service account access
gcloud secrets add-iam-policy-binding db-password \
  --member=serviceAccount:ai-film-studio-app@$PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor
```

---

## Database Setup

### Step 1: Get Cloud SQL Connection String

```bash
# Get the Cloud SQL instance connection name
gcloud sql instances describe ai-film-studio-db \
  --format='value(connectionName)'

# Output: PROJECT_ID:REGION:ai-film-studio-db
```

### Step 2: Run Database Migrations

```bash
# Set connection string
export DATABASE_URL="mysql://app_user:PASSWORD@CLOUD_SQL_IP:3306/ai_film_studio"

# Run migrations
pnpm db:push

# Verify tables created
pnpm db:studio
```

### Step 3: Seed Initial Data (Optional)

```bash
# Create seed script if needed
node scripts/seed-db.mjs
```

---

## Deployment Steps

### Step 1: Build Docker Image

Create `Dockerfile` in project root:

```dockerfile
FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build frontend
RUN pnpm build:client

# Expose port
EXPOSE 8080

# Start application
CMD ["pnpm", "start:prod"]
```

Build and push to Artifact Registry:

```bash
# Configure Docker authentication
gcloud auth configure-docker us-central1-docker.pkg.dev

# Build image
docker build -t us-central1-docker.pkg.dev/$PROJECT_ID/ai-film-studio/app:latest .

# Push to registry
docker push us-central1-docker.pkg.dev/$PROJECT_ID/ai-film-studio/app:latest
```

### Step 2: Deploy to Cloud Run

```bash
# Deploy application
gcloud run deploy ai-film-studio \
  --image=us-central1-docker.pkg.dev/$PROJECT_ID/ai-film-studio/app:latest \
  --platform=managed \
  --region=$REGION \
  --memory=2Gi \
  --cpu=2 \
  --timeout=3600 \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production,PORT=8080" \
  --set-cloudsql-instances=$PROJECT_ID:$REGION:ai-film-studio-db \
  --service-account=ai-film-studio-app@$PROJECT_ID.iam.gserviceaccount.com
```

### Step 3: Configure Custom Domain (Optional)

```bash
# Map custom domain
gcloud run domain-mappings create \
  --service=ai-film-studio \
  --domain=yourdomain.com \
  --region=$REGION
```

---

## Post-Deployment Verification

### Health Checks

```bash
# Get Cloud Run service URL
gcloud run services describe ai-film-studio \
  --region=$REGION \
  --format='value(status.url)'

# Test API endpoint
curl https://your-cloud-run-url/api/health

# Test OAuth callback
curl https://your-cloud-run-url/api/oauth/callback
```

### Database Connectivity

```bash
# Verify database connection
gcloud sql connect ai-film-studio-db \
  --user=app_user

# Run test query
SELECT VERSION();
```

### File Storage

```bash
# Verify bucket access
gsutil ls gs://ai-film-studio-media/

# Test upload
echo "test" > test.txt
gsutil cp test.txt gs://ai-film-studio-media/
```

---

## Monitoring and Maintenance

### Enable Cloud Logging

```bash
# View application logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=ai-film-studio" \
  --limit=50 \
  --format=json
```

### Set Up Alerts

```bash
# Create alert for high error rate
gcloud alpha monitoring policies create \
  --notification-channels=YOUR_CHANNEL_ID \
  --display-name="AI Film Studio - High Error Rate" \
  --condition-display-name="Error rate > 5%" \
  --condition-threshold-value=5
```

### Backup Strategy

```bash
# Enable automated backups
gcloud sql backups create \
  --instance=ai-film-studio-db \
  --description="Manual backup"

# Schedule daily backups (configured during instance creation)
```

---

## Troubleshooting

### Common Issues

**Issue: Database Connection Timeout**
- Verify Cloud SQL instance is running: `gcloud sql instances describe ai-film-studio-db`
- Check firewall rules allow Cloud Run to Cloud SQL
- Verify DATABASE_URL format is correct

**Issue: File Upload Fails**
- Check GCS bucket permissions: `gsutil iam ch serviceAccount:ai-film-studio-app@$PROJECT_ID.iam.gserviceaccount.com:objectAdmin gs://ai-film-studio-media/`
- Verify GOOGLE_APPLICATION_CREDENTIALS path is correct

**Issue: OAuth Callback Fails**
- Verify OAUTH_SERVER_URL is correct in environment
- Check Manus OAuth application settings include Cloud Run URL in redirect URIs
- Review OAuth logs in Manus Dashboard

**Issue: Out of Memory**
- Increase Cloud Run memory: `gcloud run services update ai-film-studio --memory=4Gi`
- Check for memory leaks in application logs

### Debug Mode

Enable debug logging:

```bash
# Set debug environment variable
gcloud run services update ai-film-studio \
  --set-env-vars="DEBUG=*"

# View detailed logs
gcloud logging read "resource.type=cloud_run_revision" \
  --limit=100 \
  --format=json | jq '.[] | select(.severity=="DEBUG")'
```

---

## Rollback Procedure

If deployment fails or issues arise:

```bash
# View previous revisions
gcloud run revisions list --service=ai-film-studio

# Rollback to previous revision
gcloud run services update-traffic ai-film-studio \
  --to-revisions=PREVIOUS_REVISION_ID=100
```

---

## Performance Optimization

### Frontend Optimization

- Enable Cloud CDN for static assets
- Compress images and videos before upload
- Implement lazy loading for storyboard frames

### Backend Optimization

- Enable Cloud SQL connection pooling
- Implement caching for frequently accessed data
- Use Cloud Tasks for asynchronous jobs

### Database Optimization

- Add indexes to frequently queried columns
- Archive old projects to reduce table size
- Monitor query performance with Cloud SQL Insights

---

## Security Considerations

- Enable VPC Service Controls for network isolation
- Use Cloud KMS for key management
- Enable Cloud Audit Logs for compliance
- Implement rate limiting on API endpoints
- Regular security scanning with Cloud Security Command Center

---

## Support and Resources

- **Google Cloud Documentation**: https://cloud.google.com/docs
- **Cloud Run Deployment Guide**: https://cloud.google.com/run/docs/quickstarts/build-and-deploy
- **Cloud SQL Documentation**: https://cloud.google.com/sql/docs
- **Manus Documentation**: https://docs.manus.im

---

**End of Deployment Guide**
