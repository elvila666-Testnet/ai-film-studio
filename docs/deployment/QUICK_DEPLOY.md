# AI Film Studio - Quick Deployment Guide

**Project ID**: ai-films-prod  
**Region**: us-central1  
**Status**: Ready for Deployment

---

## Step 1: Execute GCP Setup Script (5-10 minutes)

Run this command on your local machine or in Google Cloud Shell:

```bash
# Clone the repository (if not already done)
git clone https://github.com/YOUR_ORG/ai-film-studio.git
cd ai-film-studio

# Run the automated GCP setup
bash scripts/gcp-setup-complete.sh ai-films-prod
```

**What this script does:**
- ✅ Enables all required Google Cloud APIs
- ✅ Creates service accounts with proper IAM roles
- ✅ Sets up Cloud SQL database with automated backups
- ✅ Creates Cloud Storage bucket with lifecycle policies
- ✅ Configures Artifact Registry for Docker images
- ✅ Sets up monitoring and logging
- ✅ Generates deployment configuration file

**Expected output:**
```
✓ Google Cloud Platform setup completed successfully!

Configuration Summary:
  Project ID: ai-films-prod
  Region: us-central1
  Service Name: ai-film-studio
  ...
```

---

## Step 2: Configure GitHub Secrets (5 minutes)

Add these secrets to your GitHub repository:

**Path**: Settings → Secrets and variables → Actions → New repository secret

### Required Secrets:

1. **GCP_PROJECT_ID**
   ```
   ai-films-prod
   ```

2. **WIF_PROVIDER**
   ```
   Get from GCP setup output or run:
   gcloud iam workload-identity-pools providers describe github-provider \
     --project=ai-films-prod \
     --location=global \
     --workload-identity-pool=github \
     --format='value(name)'
   ```

3. **WIF_SERVICE_ACCOUNT**
   ```
   ai-film-studio-sa@ai-films-prod.iam.gserviceaccount.com
   ```

4. **CLOUD_SQL_CONNECTION_NAME**
   ```
   Get from GCP setup output or run:
   gcloud sql instances describe ai-film-studio-db \
     --project=ai-films-prod \
     --format='value(connectionName)'
   ```

5. **CLOUD_SQL_DATABASE**
   ```
   ai_film_studio_prod
   ```

6. **CLOUD_SQL_USER**
   ```
   prod_user
   ```

7. **CLOUD_SQL_PASSWORD**
   ```
   Get from GCP setup output or retrieve from Secret Manager:
   gcloud secrets versions access latest --secret=ai-film-studio-db-password \
     --project=ai-films-prod
   ```

### Optional Secrets (API Keys):

8. **OPENAI_API_KEY**
   ```
   Your OpenAI API key
   ```

9. **GEMINI_API_KEY**
   ```
   Your Google Gemini API key
   ```

10. **SORA_API_KEY**
    ```
    Your OpenAI Sora API key
    ```

11. **VEO3_API_KEY**
    ```
    Your Google Veo3 API key
    ```

12. **NANOBANANA_API_KEY**
    ```
    Your Manus Nano Banana API key
    ```

13. **BUILT_IN_FORGE_API_KEY**
    ```
    Your Manus Forge API key
    ```

---

## Step 3: Trigger Initial Deployment (10-15 minutes)

### Option A: Automatic Deployment (Recommended)

```bash
# Push code to main branch to trigger CI/CD
git add .
git commit -m "Deploy to GCP production"
git push origin main
```

This will automatically:
1. Run all tests
2. Build Docker image
3. Push to Artifact Registry
4. Deploy to Cloud Run
5. Run health checks
6. Shift traffic gradually (10% → 50% → 100%)

### Option B: Manual Deployment

```bash
# Authenticate with GCP
gcloud auth login
gcloud config set project ai-films-prod

# Build Docker image
docker build -t us-central1-docker.pkg.dev/ai-films-prod/ai-film-studio/app:latest .

# Push to Artifact Registry
docker push us-central1-docker.pkg.dev/ai-films-prod/ai-film-studio/app:latest

# Deploy to Cloud Run
gcloud run deploy ai-film-studio \
  --image=us-central1-docker.pkg.dev/ai-films-prod/ai-film-studio/app:latest \
  --region=us-central1 \
  --platform=managed \
  --memory=2Gi \
  --cpu=2 \
  --timeout=3600 \
  --allow-unauthenticated \
  --set-cloudsql-instances=ai-films-prod:us-central1:ai-film-studio-db \
  --service-account=ai-film-studio-sa@ai-films-prod.iam.gserviceaccount.com \
  --set-env-vars="NODE_ENV=production"
```

---

## Step 4: Verify Deployment

### Check Deployment Status

```bash
# Get Cloud Run service URL
gcloud run services describe ai-film-studio \
  --region=us-central1 \
  --project=ai-films-prod \
  --format='value(status.url)'

# Example output:
# https://ai-film-studio-xxxxx-uc.a.run.app
```

### Test Health Endpoints

```bash
# Replace with your actual service URL
SERVICE_URL="https://ai-film-studio-xxxxx-uc.a.run.app"

# Test health endpoint
curl -f "$SERVICE_URL/health"

# Test readiness endpoint
curl -f "$SERVICE_URL/health/ready"

# Expected response: 200 OK
```

### View Logs

```bash
# Stream recent logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=ai-film-studio" \
  --project=ai-films-prod \
  --limit=50 \
  --format=json

# Or use Cloud Console:
# https://console.cloud.google.com/logs/query?project=ai-films-prod
```

### Monitor Performance

```bash
# View Cloud Run metrics
gcloud monitoring time-series list \
  --filter='resource.type="cloud_run_revision" AND metric.type="run.googleapis.com/request_count"' \
  --project=ai-films-prod

# View database metrics
gcloud monitoring time-series list \
  --filter='resource.type="cloudsql_database"' \
  --project=ai-films-prod
```

---

## Troubleshooting

### Issue: Deployment fails with authentication error

**Solution**: Verify GitHub secrets are correctly configured

```bash
# Check GitHub Actions logs:
# https://github.com/YOUR_ORG/ai-film-studio/actions
```

### Issue: Cloud Run service fails to start

**Solution**: Check logs for errors

```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=ai-film-studio" \
  --project=ai-films-prod \
  --limit=50
```

### Issue: Database connection timeout

**Solution**: Verify Cloud SQL Proxy is running

```bash
# Check Cloud SQL instance status
gcloud sql instances describe ai-film-studio-db \
  --project=ai-films-prod

# Verify service account has Cloud SQL Client role
gcloud projects get-iam-policy ai-films-prod \
  --flatten="bindings[].members" \
  --filter="bindings.role:roles/cloudsql.client"
```

### Issue: Out of memory errors

**Solution**: Increase Cloud Run memory

```bash
gcloud run services update ai-film-studio \
  --region=us-central1 \
  --project=ai-films-prod \
  --memory=4Gi
```

---

## Post-Deployment

### 1. Configure Custom Domain (Optional)

```bash
gcloud run domain-mappings create \
  --service=ai-film-studio \
  --domain=your-domain.com \
  --region=us-central1 \
  --project=ai-films-prod
```

### 2. Set Up Monitoring Alerts

```bash
# Create alert for high error rate
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="AI Film Studio - High Error Rate" \
  --condition-display-name="Error Rate > 1%" \
  --project=ai-films-prod
```

### 3. Enable Auto-Scaling

```bash
# Cloud Run auto-scales by default, but you can configure limits:
gcloud run services update ai-film-studio \
  --region=us-central1 \
  --project=ai-films-prod \
  --min-instances=1 \
  --max-instances=100
```

### 4. Set Up Backup Strategy

```bash
# Automated backups are already configured
# View backup schedule:
gcloud sql backups list \
  --instance=ai-film-studio-db \
  --project=ai-films-prod
```

---

## Useful Commands Reference

```bash
# Deployment
gcloud run deploy ai-film-studio --image=IMAGE_URL --region=us-central1 --project=ai-films-prod

# Logs
gcloud logging read "resource.type=cloud_run_revision" --limit=50 --project=ai-films-prod

# Database
gcloud sql instances describe ai-film-studio-db --project=ai-films-prod
gcloud sql databases list --instance=ai-film-studio-db --project=ai-films-prod

# Storage
gsutil ls gs://ai-films-prod-ai-film-studio-storage
gsutil du -s gs://ai-films-prod-ai-film-studio-storage

# Service Account
gcloud iam service-accounts list --project=ai-films-prod
gcloud iam service-accounts keys list --iam-account=ai-film-studio-sa@ai-films-prod.iam.gserviceaccount.com --project=ai-films-prod

# Monitoring
gcloud monitoring dashboards list --project=ai-films-prod
gcloud monitoring alert-policies list --project=ai-films-prod
```

---

## Success Criteria

✅ GCP setup script completes without errors  
✅ All GitHub secrets are configured  
✅ GitHub Actions pipeline runs successfully  
✅ Cloud Run service is deployed and running  
✅ Health endpoints return 200 OK  
✅ Application is accessible at service URL  
✅ Logs show no errors  
✅ Database is connected and working  

---

## Next Steps

1. **Monitor application** - Watch logs and metrics for the first 24 hours
2. **Set up alerts** - Configure email/SMS alerts for critical errors
3. **Enable custom domain** - Point your domain to the Cloud Run service
4. **Configure CDN** - Add Cloud CDN for better performance
5. **Set up backup strategy** - Verify automated backups are working

---

**Document Version**: 1.0.0  
**Last Updated**: 2026-02-01  
**Status**: Production Ready  
**Project**: ai-films-prod
