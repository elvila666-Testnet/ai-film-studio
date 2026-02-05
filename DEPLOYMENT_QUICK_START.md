# AI Film Studio - Deployment Quick Start Guide

## 5-Minute Setup (First Time)

### 1. Create Google Cloud Project

```bash
export PROJECT_ID="ai-film-studio-prod"
export REGION="us-central1"

gcloud projects create $PROJECT_ID --name="AI Film Studio"
gcloud config set project $PROJECT_ID
```

### 2. Enable Required APIs

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com sqladmin.googleapis.com \
  storage-api.googleapis.com logging.googleapis.com monitoring.googleapis.com
```

### 3. Create Cloud SQL Database

```bash
gcloud sql instances create ai-film-studio-db \
  --database-version=MYSQL_8_0 \
  --tier=db-f1-micro \
  --region=$REGION

gcloud sql databases create ai_film_studio --instance=ai-film-studio-db

gcloud sql users create filmstudio --instance=ai-film-studio-db --password
```

### 4. Create Cloud Storage Bucket

```bash
gsutil mb -l $REGION gs://ai-film-studio-media
```

### 5. Set Up Secrets

```bash
echo -n "your-gemini-key" | gcloud secrets create GEMINI_API_KEY --data-file=-
echo -n "your-openai-key" | gcloud secrets create OPENAI_API_KEY --data-file=-
echo -n "your-oauth-app-id" | gcloud secrets create VITE_APP_ID --data-file=-
echo -n "$(openssl rand -base64 32)" | gcloud secrets create JWT_SECRET --data-file=-
```

### 6. Deploy to Cloud Run

```bash
gcloud run deploy ai-film-studio \
  --source . \
  --platform managed \
  --region $REGION \
  --memory 2Gi \
  --cpu 2 \
  --allow-unauthenticated \
  --set-cloudsql-instances=$PROJECT_ID:$REGION:ai-film-studio-db
```

**Done!** Your app is now live at the URL shown in the output.

---

## Deploy Updates (After Changes)

### Option 1: Automatic (Recommended)

```bash
git add .
git commit -m "Update: Your changes"
git push origin main
# GitHub Actions will automatically deploy
```

### Option 2: Manual

```bash
gcloud run deploy ai-film-studio \
  --source . \
  --region $REGION
```

---

## Common Commands

```bash
# View logs
gcloud logging read "resource.type=cloud_run_revision" --limit 50

# Check service status
gcloud run services describe ai-film-studio --region $REGION

# Scale service
gcloud run services update ai-film-studio --region $REGION --min-instances 2 --max-instances 10

# Rollback to previous version
gcloud run services update-traffic ai-film-studio --region $REGION --to-revisions=REVISION_NAME=100

# Create database backup
gcloud sql backups create --instance=ai-film-studio-db

# View backups
gcloud sql backups list --instance=ai-film-studio-db

# Connect to database
gcloud sql connect ai-film-studio-db --user=filmstudio

# View costs
gcloud billing accounts list
```

---

## Environment Variables Required

Set these in Google Cloud Secret Manager:

```
VITE_APP_ID              # OAuth app ID
OAUTH_SERVER_URL         # OAuth server URL
VITE_OAUTH_PORTAL_URL    # OAuth portal URL
JWT_SECRET               # Session secret
DATABASE_URL             # Cloud SQL connection string
GEMINI_API_KEY           # Gemini API key
OPENAI_API_KEY           # OpenAI API key
SORA_API_KEY             # Sora API key (optional)
VEO3_API_KEY             # VEO3 API key (optional)
OWNER_NAME               # Owner name
OWNER_OPEN_ID            # Owner ID
```

---

## Troubleshooting

### Service won't start
```bash
gcloud logging read "resource.type=cloud_run_revision" --limit 20
```

### Database connection error
```bash
gcloud sql instances describe ai-film-studio-db
gcloud sql instances restart ai-film-studio-db
```

### Permission denied
```bash
gcloud projects get-iam-policy $PROJECT_ID
```

### High costs
```bash
gcloud run services update ai-film-studio --min-instances 0 --max-instances 5
gcloud sql instances patch ai-film-studio-db --tier=db-f1-micro
```

---

## Useful Links

- **Cloud Run Dashboard**: https://console.cloud.google.com/run
- **Cloud SQL Console**: https://console.cloud.google.com/sql
- **Logs Viewer**: https://console.cloud.google.com/logs
- **Billing**: https://console.cloud.google.com/billing

---

For detailed information, see `DEPLOYMENT_GUIDE.md`
