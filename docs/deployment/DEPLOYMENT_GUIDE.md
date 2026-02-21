# Google Cloud Deployment Guide - AI Film Studio

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Google Cloud Setup](#google-cloud-setup)
3. [Database Setup](#database-setup)
4. [Storage Setup](#storage-setup)
5. [Deployment Steps](#deployment-steps)
6. [Environment Configuration](#environment-configuration)
7. [CI/CD Pipeline Setup](#cicd-pipeline-setup)
8. [Post-Deployment](#post-deployment)
9. [Monitoring & Maintenance](#monitoring--maintenance)
10. [Performance Optimization](#performance-optimization)
11. [Security Best Practices](#security-best-practices)
12. [Troubleshooting](#troubleshooting)
13. [Rollback & Recovery](#rollback--recovery)
14. [Cost Optimization](#cost-optimization)

---

## Prerequisites

### Required Accounts & Tools

- Google Cloud Platform account with billing enabled
- `gcloud` CLI installed ([Install Guide](https://cloud.google.com/sdk/docs/install))
- Docker installed ([Install Guide](https://docs.docker.com/get-docker/))
- Git installed
- Text editor for configuration files

### Verify Installations

```bash
# Check gcloud
gcloud --version

# Check Docker
docker --version

# Check Git
git --version
```

---

## Google Cloud Setup

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "NEW PROJECT"
4. Enter project name: `ai-film-studio`
5. Click "CREATE"
6. Wait for project to be created
7. Select the new project from the dropdown

### Step 2: Enable Required APIs

In the Google Cloud Console:

1. Go to **APIs & Services** → **Library**
2. Search for and enable these APIs:
   - **Cloud Run API** (for running containers)
   - **Cloud SQL Admin API** (for database)
   - **Cloud Storage API** (for file storage)
   - **Cloud Build API** (for CI/CD)
   - **Cloud Logging API** (for monitoring)
   - **Cloud Monitoring API** (for metrics)

```bash
# Alternative: Enable via gcloud CLI
gcloud services enable run.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable storage-api.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable logging.googleapis.com
gcloud services enable monitoring.googleapis.com
```

### Step 3: Set Project ID

```bash
# Set your project ID
export PROJECT_ID="ai-film-studio"
gcloud config set project $PROJECT_ID

# Verify
gcloud config get-value project
```

### Step 4: Create Service Account

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
  --role="roles/run.invoker"
```

---

## Database Setup

### Step 1: Create Cloud SQL Instance

```bash
# Create MySQL 8.0 instance
gcloud sql instances create ai-film-studio-db \
  --database-version=MYSQL_8_0 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --availability-type=zonal \
  --backup-start-time=03:00 \
  --enable-bin-log

# Wait for instance to be created (2-3 minutes)
gcloud sql instances describe ai-film-studio-db
```

### Step 2: Create Database

```bash
# Create database
gcloud sql databases create ai_film_studio \
  --instance=ai-film-studio-db \
  --charset=utf8mb4 \
  --collation=utf8mb4_unicode_ci
```

### Step 3: Create Database User

```bash
# Create database user
gcloud sql users create filmstudio \
  --instance=ai-film-studio-db \
  --password

# When prompted, enter a strong password
# Example: GenerateRandomPassword123!
```

### Step 4: Get Connection String

```bash
# Get the connection string
gcloud sql instances describe ai-film-studio-db \
  --format='value(ipAddresses[0].ipAddress)'

# Build connection string
# Format: mysql://username:password@/database?unix_socket=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME
# Example: mysql://filmstudio:PASSWORD@/ai_film_studio?unix_socket=/cloudsql/ai-film-studio:us-central1:ai-film-studio-db
```

### Step 5: Initialize Database Schema

```bash
# First, set up local connection to Cloud SQL
gcloud sql connect ai-film-studio-db --user=root

# Then run migrations from your local machine
# (You'll need to set up Cloud SQL Proxy for this)

# Alternative: Use Cloud Shell
gcloud cloud-shell ssh --command="cd ~/ai_film_studio && pnpm db:push"
```

---

## Storage Setup

### Step 1: Create Cloud Storage Bucket

```bash
# Create bucket for media files
gsutil mb -l us-central1 gs://ai-film-studio-media

# Make bucket public (optional, for direct access)
gsutil iam ch serviceAccount:ai-film-studio-sa@$PROJECT_ID.iam.gserviceaccount.com:objectViewer gs://ai-film-studio-media
```

### Step 2: Configure CORS (if needed for direct uploads)

```bash
# Create cors.json file
cat > cors.json << 'EOF'
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
    "responseHeader": ["Content-Type", "x-goog-meta-*"],
    "maxAgeSeconds": 3600
  }
]
EOF

# Apply CORS configuration
gsutil cors set cors.json gs://ai-film-studio-media
```

---

## Deployment Steps

### Step 1: Prepare Application for Deployment

#### Create Dockerfile

```dockerfile
# Dockerfile
FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build application
RUN pnpm build

# Expose port
EXPOSE 3000

# Start application
CMD ["pnpm", "start"]
```

#### Create .dockerignore

```
node_modules
.git
.gitignore
.env
.env.local
dist
build
.DS_Store
*.log
```

### Step 2: Create Cloud Build Configuration

Create `cloudbuild.yaml`:

```yaml
steps:
  # Build Docker image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'gcr.io/$PROJECT_ID/ai-film-studio:latest'
      - '-t'
      - 'gcr.io/$PROJECT_ID/ai-film-studio:$SHORT_SHA'
      - '.'

  # Push to Container Registry
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'gcr.io/$PROJECT_ID/ai-film-studio:latest'

  # Deploy to Cloud Run
  - name: 'gcr.io/cloud-builders/gke-deploy'
    args:
      - run
      - --filename=.
      - --image=gcr.io/$PROJECT_ID/ai-film-studio:latest
      - --location=us-central1
      - --output=/workspace/output

images:
  - 'gcr.io/$PROJECT_ID/ai-film-studio:latest'
  - 'gcr.io/$PROJECT_ID/ai-film-studio:$SHORT_SHA'

options:
  machineType: 'N1_HIGHCPU_8'
```

### Step 3: Deploy to Cloud Run

```bash
# Deploy directly using gcloud
gcloud run deploy ai-film-studio \
  --source . \
  --platform managed \
  --region us-central1 \
  --memory 2Gi \
  --cpu 2 \
  --timeout 3600 \
  --allow-unauthenticated \
  --set-env-vars DATABASE_URL="mysql://filmstudio:PASSWORD@/ai_film_studio?unix_socket=/cloudsql/ai-film-studio:us-central1:ai-film-studio-db" \
  --add-cloudsql-instances ai-film-studio:us-central1:ai-film-studio-db
```

### Step 4: Configure Environment Variables

```bash
# Create Secret Manager secrets
echo -n "your_gemini_key" | gcloud secrets create GEMINI_API_KEY --data-file=-
echo -n "your_nanobanana_key" | gcloud secrets create NANOBANANA_API_KEY --data-file=-
echo -n "your_sora_key" | gcloud secrets create SORA_API_KEY --data-file=-
echo -n "your_veo3_key" | gcloud secrets create VEO3_API_KEY --data-file=-
echo -n "your_jwt_secret" | gcloud secrets create JWT_SECRET --data-file=-

# Grant Cloud Run service access to secrets
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:ai-film-studio-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Repeat for other secrets...
```

### Step 5: Update Cloud Run with Secrets

```bash
gcloud run services update ai-film-studio \
  --region us-central1 \
  --set-env-vars \
    GEMINI_API_KEY=projects/$PROJECT_ID/secrets/GEMINI_API_KEY/versions/latest,\
    NANOBANANA_API_KEY=projects/$PROJECT_ID/secrets/NANOBANANA_API_KEY/versions/latest,\
    SORA_API_KEY=projects/$PROJECT_ID/secrets/SORA_API_KEY/versions/latest,\
    VEO3_API_KEY=projects/$PROJECT_ID/secrets/VEO3_API_KEY/versions/latest,\
    JWT_SECRET=projects/$PROJECT_ID/secrets/JWT_SECRET/versions/latest
```

---

## Environment Configuration

### Complete Environment Variables

Set these in Google Cloud Secret Manager:

```bash
# Database
DATABASE_URL="mysql://filmstudio:PASSWORD@/ai_film_studio?unix_socket=/cloudsql/ai-film-studio:us-central1:ai-film-studio-db"

# Manus OAuth
VITE_APP_ID="your_manus_app_id"
OAUTH_SERVER_URL="https://api.manus.im"
VITE_OAUTH_PORTAL_URL="https://manus.im"

# AI APIs
GEMINI_API_KEY="your_gemini_key"
NANOBANANA_API_KEY="your_nanobanana_key"
SORA_API_KEY="your_sora_key"
VEO3_API_KEY="your_veo3_key"
OPENAI_API_KEY="your_openai_key"

# JWT
JWT_SECRET="generate_random_secret_key"

# Owner Info
OWNER_OPEN_ID="your_open_id"
OWNER_NAME="Your Name"

# S3 / Cloud Storage
STORAGE_BUCKET="ai-film-studio-media"
```

---

## Post-Deployment

### Step 1: Verify Deployment

```bash
# Get Cloud Run service URL
gcloud run services describe ai-film-studio \
  --region us-central1 \
  --format='value(status.url)'

# Test the service
curl https://ai-film-studio-xxxxx.run.app/
```

### Step 2: Set Up Custom Domain (Optional)

```bash
# Map custom domain
gcloud run domain-mappings create \
  --service=ai-film-studio \
  --domain=yourdomain.com \
  --region=us-central1

# Update DNS records according to Google Cloud instructions
```

### Step 3: Set Up CI/CD Pipeline

```bash
# Connect GitHub repository
gcloud builds connect --repository-name=ai-film-studio \
  --repository-owner=your-github-username \
  --region=us-central1

# Create build trigger
gcloud builds triggers create github \
  --name=ai-film-studio-deploy \
  --repo-name=ai-film-studio \
  --repo-owner=your-github-username \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml
```

### Step 4: Initialize Database Schema

```bash
# Connect to Cloud SQL
gcloud sql connect ai-film-studio-db --user=filmstudio

# Run migrations
# mysql> USE ai_film_studio;
# mysql> (paste schema from drizzle/schema.ts)
```

---

## Monitoring & Maintenance

### Step 1: Set Up Monitoring

```bash
# View logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=ai-film-studio" \
  --limit 50 \
  --format json

# Stream logs in real-time
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=ai-film-studio" \
  --limit 10 \
  --follow
```

### Step 2: Create Alerts

```bash
# Create alert policy for high error rate
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="AI Film Studio High Error Rate" \
  --condition-display-name="Error Rate > 5%" \
  --condition-threshold-value=0.05
```

### Step 3: Database Backups

```bash
# Create backup
gcloud sql backups create \
  --instance=ai-film-studio-db \
  --description="Manual backup $(date +%Y-%m-%d)"

# List backups
gcloud sql backups list --instance=ai-film-studio-db

# Restore from backup
gcloud sql backups restore BACKUP_ID \
  --backup-instance=ai-film-studio-db
```

### Step 4: Regular Maintenance

```bash
# Update Cloud Run service
gcloud run deploy ai-film-studio \
  --source . \
  --region us-central1

# Update database instance
gcloud sql instances patch ai-film-studio-db \
  --backup-start-time=03:00 \
  --enable-bin-log
```

---

## Troubleshooting

### Deployment Issues

#### Problem: "Permission denied" errors

**Solution**:
```bash
# Ensure service account has correct roles
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:ai-film-studio-sa*"
```

#### Problem: "Container failed to start"

**Solution**:
```bash
# Check logs
gcloud logging read "resource.type=cloud_run_revision" --limit 50

# Verify environment variables are set
gcloud run services describe ai-film-studio --region us-central1
```

### Database Issues

#### Problem: "Connection refused" to Cloud SQL

**Solution**:
```bash
# Verify Cloud SQL instance is running
gcloud sql instances describe ai-film-studio-db

# Check firewall rules
gcloud sql instances describe ai-film-studio-db --format='value(settings.ipConfiguration)'

# Restart instance if needed
gcloud sql instances restart ai-film-studio-db
```

#### Problem: "Access denied" for database user

**Solution**:
```bash
# Reset password
gcloud sql users set-password filmstudio \
  --instance=ai-film-studio-db \
  --password

# Verify user exists
gcloud sql users list --instance=ai-film-studio-db
```

### Storage Issues

#### Problem: "Access Denied" when uploading files

**Solution**:
```bash
# Verify bucket permissions
gsutil iam get gs://ai-film-studio-media

# Grant service account access
gsutil iam ch serviceAccount:ai-film-studio-sa@$PROJECT_ID.iam.gserviceaccount.com:objectCreator gs://ai-film-studio-media
```

### Performance Issues

#### Problem: High latency or timeouts

**Solution**:
```bash
# Increase Cloud Run memory
gcloud run services update ai-film-studio \
  --region us-central1 \
  --memory 4Gi \
  --cpu 4

# Check Cloud SQL performance
gcloud sql instances describe ai-film-studio-db \
  --format='value(settings.tier)'

# Upgrade if needed
gcloud sql instances patch ai-film-studio-db \
  --tier=db-n1-standard-1
```

---

## Cost Optimization

### Recommended Settings for Production

```bash
# Cloud Run: 2 CPU, 2GB RAM, auto-scaling
gcloud run services update ai-film-studio \
  --region us-central1 \
  --cpu 2 \
  --memory 2Gi \
  --min-instances 1 \
  --max-instances 10

# Cloud SQL: db-f1-micro for small deployments
# Upgrade to db-n1-standard-1 for production

# Cloud Storage: Standard class with lifecycle policies
gsutil lifecycle set lifecycle.json gs://ai-film-studio-media
```

### Lifecycle Policy for Storage

Create `lifecycle.json`:

```json
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 90}
      },
      {
        "action": {"type": "SetStorageClass", "storageClass": "NEARLINE"},
        "condition": {"age": 30}
      }
    ]
  }
}
```

---

## Scaling Considerations

### Horizontal Scaling

Cloud Run automatically scales based on traffic. Configure:

```bash
gcloud run services update ai-film-studio \
  --region us-central1 \
  --min-instances 2 \
  --max-instances 50 \
  --concurrency 80
```

### Database Scaling

For high traffic, upgrade to:

```bash
gcloud sql instances patch ai-film-studio-db \
  --tier=db-n1-standard-4 \
  --availability-type=regional
```

---

## Security Best Practices

1. **Always use HTTPS** - Cloud Run enforces this by default
2. **Rotate secrets regularly** - Update API keys every 90 days
3. **Use VPC connectors** - For private database access
4. **Enable Cloud Armor** - For DDoS protection
5. **Audit logs** - Enable Cloud Audit Logs for compliance

---

## Support & Resources

- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud SQL Documentation](https://cloud.google.com/sql/docs)
- [Cloud Storage Documentation](https://cloud.google.com/storage/docs)
- [Google Cloud Pricing Calculator](https://cloud.google.com/products/calculator)

---

**Last Updated**: January 29, 2026


---

## CI/CD Pipeline Setup

### GitHub Actions Workflow

The project includes automated CI/CD workflows in `.github/workflows/`:

#### 1. Test Workflow (test.yml)

Runs on every push and pull request:

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: root
          MYSQL_DATABASE: ai_film_studio
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3

    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '22'
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm type-check
      - run: pnpm test
```

#### 2. Deploy Workflow (deploy.yml)

Runs on main branch pushes:

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    permissions:
      contents: 'read'
      id-token: 'write'

    steps:
      - uses: actions/checkout@v3
      
      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v1
        with:
          workload_identity_provider: ${{ secrets.WIF_PROVIDER }}
          service_account: ${{ secrets.WIF_SERVICE_ACCOUNT }}
      
      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v1
      
      - name: Build and push Docker image
        run: |
          gcloud builds submit \
            --tag gcr.io/${{ secrets.GCP_PROJECT_ID }}/ai-film-studio:latest \
            --tag gcr.io/${{ secrets.GCP_PROJECT_ID }}/ai-film-studio:${{ github.sha }}
      
      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy ai-film-studio \
            --image gcr.io/${{ secrets.GCP_PROJECT_ID }}/ai-film-studio:latest \
            --region us-central1 \
            --platform managed
      
      - name: Notify deployment
        if: always()
        with:
          status: ${{ job.status }}
          text: 'Deployment ${{ job.status }}'
```

### Configure GitHub Secrets

Add these secrets to your GitHub repository:

```bash
# In GitHub: Settings → Secrets and variables → Actions

GCP_PROJECT_ID              # Your Google Cloud Project ID
WIF_PROVIDER                # Workload Identity Provider resource name
WIF_SERVICE_ACCOUNT         # Service account email
```

### Set Up Workload Identity Federation

```bash
# Create Workload Identity Pool
gcloud iam workload-identity-pools create "github-pool" \
  --project=$PROJECT_ID \
  --location=global \
  --display-name="GitHub Actions Pool"

# Create Workload Identity Provider
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --project=$PROJECT_ID \
  --location=global \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# Get provider resource name
gcloud iam workload-identity-pools providers describe "github-provider" \
  --project=$PROJECT_ID \
  --location=global \
  --workload-identity-pool="github-pool" \
  --format='value(name)'

# Create service account
gcloud iam service-accounts create github-actions-deployer \
  --display-name="GitHub Actions Deployer"

# Grant permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions-deployer@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions-deployer@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.editor"

# Bind GitHub to service account
gcloud iam service-accounts add-iam-policy-binding \
  github-actions-deployer@$PROJECT_ID.iam.gserviceaccount.com \
  --project=$PROJECT_ID \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/attribute.repository/YOUR_ORG/ai-film-studio"
```

---

## Performance Optimization

### 1. Database Query Optimization

```bash
# Connect to Cloud SQL
gcloud sql connect ai-film-studio-db --user=filmstudio

# Create indexes for frequently queried columns
CREATE INDEX idx_project_user ON projects(userId);
CREATE INDEX idx_storyboard_project ON storyboardImages(projectId);
CREATE INDEX idx_editor_project ON editorProjects(userId);
CREATE INDEX idx_clips_editor ON editorClips(editorProjectId);

# Enable query insights
gcloud sql instances patch ai-film-studio-db \
  --insights-config-query-insights-enabled \
  --insights-config-query-string-length=1024 \
  --insights-config-record-application-tags
```

### 2. Enable Cloud CDN

```bash
# Create backend service with CDN
gcloud compute backend-services create ai-film-studio-cdn \
  --global \
  --load-balancing-scheme=EXTERNAL \
  --enable-cdn \
  --cache-mode=CACHE_ALL_STATIC \
  --client-ttl=3600 \
  --default-ttl=3600 \
  --max-ttl=86400

# Add health check
gcloud compute health-checks create http ai-film-studio-health \
  --request-path=/health \
  --port=3000
```

### 3. Application-Level Optimization

```bash
# Enable gzip compression (already configured in Express)
# Optimize Node.js memory
export NODE_OPTIONS="--max-old-space-size=2048"

# Update Cloud Run
gcloud run services update ai-film-studio \
  --region us-central1 \
  --set-env-vars="NODE_OPTIONS=--max-old-space-size=2048"

# Enable connection pooling
# Already configured in database connection
```

### 4. Image Optimization

```bash
# Optimize Docker image size
# Use multi-stage builds (already in Dockerfile)
# Remove unnecessary dependencies
# Use alpine base images

# Check image size
docker images | grep ai-film-studio
```

---

## Security Best Practices

### 1. Network Security

```bash
# Enable VPC connector for private database access
gcloud compute networks vpc-access connectors create ai-film-studio-connector \
  --region=us-central1 \
  --subnet=default \
  --min-instances=2 \
  --max-instances=10

# Update Cloud Run to use VPC
gcloud run services update ai-film-studio \
  --region us-central1 \
  --vpc-connector=ai-film-studio-connector \
  --vpc-egress=all-traffic
```

### 2. Secrets Management

```bash
# Rotate secrets regularly (every 90 days)
echo -n "new_api_key" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Audit secret access
gcloud logging read "protoPayload.methodName=google.cloud.secretmanager.v1.SecretManagerService.AccessSecretVersion" \
  --limit=20

# Disable old secret versions
gcloud secrets versions disable VERSION_ID --secret=GEMINI_API_KEY
```

### 3. Authentication & Authorization

```bash
# Enforce authentication on Cloud Run
gcloud run services update ai-film-studio \
  --region us-central1 \
  --no-allow-unauthenticated

# Add IAM bindings for specific users
gcloud run services add-iam-policy-binding ai-film-studio \
  --region us-central1 \
  --member=user:admin@example.com \
  --role=roles/run.invoker
```

### 4. API Security

- **Rate Limiting**: Configured in Express middleware
- **CORS**: Properly configured for allowed origins
- **SQL Injection Prevention**: Using parameterized queries via Drizzle ORM
- **XSS Protection**: React handles escaping automatically
- **CSRF Protection**: Session-based with secure cookies

### 5. SSL/TLS Configuration

```bash
# SSL is automatically managed by Google Cloud
# Certificate renews automatically before expiration

# Verify SSL configuration
gcloud run services describe ai-film-studio \
  --region us-central1 \
  --format='value(status.url)'

# Test SSL
curl -I https://ai-film-studio-xxxxx.run.app
```

### 6. Compliance & Audit Logging

```bash
# Enable Cloud Audit Logs
gcloud logging sinks create audit-sink \
  logging.googleapis.com/projects/$PROJECT_ID/logs/cloudaudit.googleapis.com \
  --log-filter='protoPayload.methodName=~".*"'

# Export logs to BigQuery for analysis
gcloud logging sinks create bigquery-sink \
  bigquery.googleapis.com/projects/$PROJECT_ID/datasets/audit_logs \
  --log-filter='resource.type="cloud_run_revision"'
```

---

## Rollback & Recovery

### 1. Rollback to Previous Cloud Run Revision

```bash
# List recent revisions
gcloud run revisions list \
  --service=ai-film-studio \
  --region=us-central1 \
  --limit=10

# Get revision details
gcloud run revisions describe REVISION_NAME \
  --region=us-central1

# Rollback to previous revision
gcloud run services update-traffic ai-film-studio \
  --region us-central1 \
  --to-revisions=PREVIOUS_REVISION_NAME=100

# Or rollback via Cloud Run console
# Services → ai-film-studio → Revisions → Select previous → Set Traffic
```

### 2. Database Rollback

```bash
# List available backups
gcloud sql backups list --instance=ai-film-studio-db

# Get backup details
gcloud sql backups describe BACKUP_ID --instance=ai-film-studio-db

# Restore from backup
gcloud sql backups restore BACKUP_ID \
  --backup-instance=ai-film-studio-db

# Verify restoration
gcloud sql connect ai-film-studio-db --user=filmstudio
SELECT COUNT(*) FROM projects;
```

### 3. Disaster Recovery Plan

```bash
# Create backup schedule
gcloud sql instances patch ai-film-studio-db \
  --backup-start-time=03:00 \
  --enable-bin-log \
  --backup-location=us

# Test backup restoration
# 1. Create clone of instance
gcloud sql instances clone ai-film-studio-db ai-film-studio-db-test \
  --point-in-time=2024-01-30T00:00:00Z

# 2. Verify data integrity
gcloud sql connect ai-film-studio-db-test --user=filmstudio

# 3. Delete test instance
gcloud sql instances delete ai-film-studio-db-test
```

### 4. Application Recovery

```bash
# In case of critical bug, rollback immediately
gcloud run services update-traffic ai-film-studio \
  --region us-central1 \
  --to-revisions=STABLE_REVISION=100

# Then fix the bug and redeploy
git revert HEAD
git push origin main
# CI/CD will automatically redeploy
```

---

## Cost Optimization

### 1. Cloud Run Cost Optimization

```bash
# Recommended settings for production
gcloud run services update ai-film-studio \
  --region us-central1 \
  --cpu 2 \
  --memory 2Gi \
  --min-instances 1 \
  --max-instances 10 \
  --concurrency 80

# For development/staging
gcloud run services update ai-film-studio-staging \
  --region us-central1 \
  --cpu 1 \
  --memory 512Mi \
  --min-instances 0 \
  --max-instances 5
```

### 2. Cloud SQL Cost Optimization

```bash
# Use shared-core instances for development
gcloud sql instances create ai-film-studio-dev \
  --database-version=MYSQL_8_0 \
  --tier=db-f1-micro \
  --region=us-central1

# Use standard instances for production
gcloud sql instances patch ai-film-studio-db \
  --tier=db-n1-standard-1 \
  --availability-type=regional

# Enable automatic backups (included in pricing)
gcloud sql instances patch ai-film-studio-db \
  --backup-start-time=03:00 \
  --enable-bin-log
```

### 3. Cloud Storage Cost Optimization

```bash
# Create lifecycle policy to move old files to cheaper storage
cat > lifecycle.json << 'EOF'
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "SetStorageClass", "storageClass": "NEARLINE"},
        "condition": {"age": 30}
      },
      {
        "action": {"type": "SetStorageClass", "storageClass": "COLDLINE"},
        "condition": {"age": 90}
      },
      {
        "action": {"type": "Delete"},
        "condition": {"age": 365}
      }
    ]
  }
}
EOF

gsutil lifecycle set lifecycle.json gs://ai-film-studio-media
```

### 4. Monitoring Costs

```bash
# View GCP costs
gcloud billing accounts list
gcloud billing accounts describe ACCOUNT_ID

# Set up budget alerts
gcloud billing budgets create \
  --billing-account=ACCOUNT_ID \
  --display-name="AI Film Studio Budget" \
  --budget-amount=1000 \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=90 \
  --threshold-rule=percent=100

# Export billing data to BigQuery
gcloud billing accounts export-config describe ACCOUNT_ID
```

---

## Maintenance Schedule

### Daily Tasks
- Monitor error logs and alerts
- Check service health and uptime
- Verify database connectivity

### Weekly Tasks
- Review performance metrics
- Check for security updates
- Test backup restoration
- Review cost trends

### Monthly Tasks
- Update dependencies
- Optimize slow queries
- Audit access logs
- Review and update documentation
- Capacity planning

### Quarterly Tasks
- Security audit
- Performance optimization review
- Disaster recovery drill
- Update runbooks and procedures
- Team training on deployment

---

## Deployment Checklist

Before going live:

- [ ] All code committed and pushed to main
- [ ] All tests passing locally and in CI/CD
- [ ] Database migrations completed
- [ ] All environment variables configured in Secret Manager
- [ ] SSL certificate configured and verified
- [ ] Custom domain mapped and DNS configured
- [ ] Monitoring alerts set up
- [ ] Backup strategy verified and tested
- [ ] Team trained on deployment procedures
- [ ] Rollback procedures documented and tested
- [ ] Performance tested under expected load
- [ ] Security audit completed
- [ ] Documentation reviewed and updated
- [ ] Stakeholders notified of deployment

---

## Quick Reference Commands

```bash
# Deployment
gcloud run deploy ai-film-studio --source . --region us-central1

# Monitoring
gcloud logging read "resource.type=cloud_run_revision" --limit 50
gcloud run services describe ai-film-studio --region us-central1

# Database
gcloud sql connect ai-film-studio-db --user=filmstudio
gcloud sql backups list --instance=ai-film-studio-db

# Secrets
gcloud secrets list
gcloud secrets versions access latest --secret=GEMINI_API_KEY

# Scaling
gcloud run services update ai-film-studio --min-instances 2 --max-instances 50

# Rollback
gcloud run services update-traffic ai-film-studio --to-revisions=REVISION_NAME=100
```

---

## Support & Resources

- **Google Cloud Documentation**: https://cloud.google.com/docs
- **Cloud Run Documentation**: https://cloud.google.com/run/docs
- **Cloud SQL Documentation**: https://cloud.google.com/sql/docs
- **GitHub Actions Documentation**: https://docs.github.com/en/actions
- **Cloud Pricing Calculator**: https://cloud.google.com/products/calculator

---

**Last Updated**: January 30, 2026
**Version**: 2.0
**Maintained by**: Development Team
