# Deployment Troubleshooting & FAQ

## Common Issues & Solutions

### 1. Cloud Run Service Won't Start

#### Error: "Container failed to start"

**Symptoms:**
- Service shows "Error" status
- Logs show "Container failed to start"
- Application crashes immediately

**Solutions:**

```bash
# Check logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=ai-film-studio" \
  --limit 50 --format json

# Check environment variables
gcloud run services describe ai-film-studio --region us-central1 \
  --format='value(spec.template.spec.containers[0].env)'

# Verify secrets are accessible
gcloud secrets list
gcloud secrets versions access latest --secret=GEMINI_API_KEY

# Test locally
docker build -t ai-film-studio .
docker run -e NODE_ENV=production ai-film-studio
```

#### Error: "Port 8080 not listening"

**Symptoms:**
- Service crashes after 60 seconds
- Health check fails

**Solutions:**

```bash
# Verify application listens on port 8080
grep "PORT" server/index.ts
# Should show: const PORT = process.env.PORT || 8080

# Check if server is starting
docker build -t ai-film-studio .
docker run -p 8080:8080 ai-film-studio
curl http://localhost:8080
```

---

### 2. Database Connection Errors

#### Error: "Cannot connect to database"

**Symptoms:**
- "ECONNREFUSED" or "ETIMEDOUT"
- Application crashes on startup
- Migrations fail

**Solutions:**

```bash
# Verify Cloud SQL instance is running
gcloud sql instances describe ai-film-studio-db
# Status should be "RUNNABLE"

# Restart instance if needed
gcloud sql instances restart ai-film-studio-db

# Check connection string format
# Should be: mysql://user:pass@/db?unix_socket=/cloudsql/PROJECT:REGION:INSTANCE

# Test connection locally
gcloud sql connect ai-film-studio-db --user=filmstudio

# Verify Cloud Run has access to Cloud SQL
gcloud run services describe ai-film-studio --region us-central1 \
  --format='value(spec.template.metadata.annotations."run.googleapis.com/cloudsql-instances")'
```

#### Error: "Access denied for user"

**Symptoms:**
- "Access denied for user 'filmstudio'@'%'"
- Authentication fails

**Solutions:**

```bash
# Reset database password
gcloud sql users set-password filmstudio \
  --instance=ai-film-studio-db \
  --password

# Verify user exists
gcloud sql users list --instance=ai-film-studio-db

# Check user permissions
gcloud sql connect ai-film-studio-db --user=root
# SHOW GRANTS FOR 'filmstudio'@'%';

# Update DATABASE_URL secret with new password
echo -n "mysql://filmstudio:NEW_PASSWORD@/ai_film_studio?unix_socket=/cloudsql/..." | \
  gcloud secrets versions add DATABASE_URL --data-file=-
```

---

### 3. Authentication & OAuth Issues

#### Error: "Invalid OAuth configuration"

**Symptoms:**
- Login fails
- "Invalid client ID" error
- Redirect URI mismatch

**Solutions:**

```bash
# Verify OAuth variables
gcloud secrets versions access latest --secret=VITE_APP_ID
gcloud secrets versions access latest --secret=OAUTH_SERVER_URL
gcloud secrets versions access latest --secret=VITE_OAUTH_PORTAL_URL

# Check redirect URI in Manus dashboard
# Should match: https://ai-film-studio-xxxxx.run.app/api/oauth/callback

# Update if needed
echo -n "correct-app-id" | gcloud secrets versions add VITE_APP_ID --data-file=-

# Redeploy
gcloud run deploy ai-film-studio --source . --region us-central1
```

#### Error: "JWT signature verification failed"

**Symptoms:**
- "Invalid token" errors
- Session validation fails

**Solutions:**

```bash
# Verify JWT_SECRET is set
gcloud secrets versions access latest --secret=JWT_SECRET

# Generate new secret if needed
echo -n "$(openssl rand -base64 32)" | \
  gcloud secrets versions add JWT_SECRET --data-file=-

# Clear user sessions (they'll need to re-login)
# Connect to database and run:
# DELETE FROM sessions;

# Redeploy
gcloud run deploy ai-film-studio --source . --region us-central1
```

---

### 4. API Key & Credential Issues

#### Error: "Invalid API key"

**Symptoms:**
- AI generation fails
- "Unauthorized" or "Invalid API key" errors
- 401/403 responses

**Solutions:**

```bash
# Verify API key is set
gcloud secrets versions access latest --secret=GEMINI_API_KEY

# Test API key locally
curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'

# If invalid, get new key from provider
# Google AI Studio: https://aistudio.google.com/app/apikey
# OpenAI: https://platform.openai.com/api-keys

# Update secret
echo -n "new-api-key" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Redeploy
gcloud run deploy ai-film-studio --source . --region us-central1
```

#### Error: "Quota exceeded" or "Rate limit exceeded"

**Symptoms:**
- Intermittent failures
- More failures during high traffic
- "429 Too Many Requests"

**Solutions:**

```bash
# Check API quotas in Google Cloud Console
# APIs & Services → Quotas

# Increase quotas if needed
# APIs & Services → Quotas → Select API → Edit Quotas

# Implement caching
# Already configured in application

# Add retry logic
# Already configured in application

# Upgrade API plan if necessary
# Check provider's pricing page
```

---

### 5. Storage & File Upload Issues

#### Error: "Access denied" for Cloud Storage

**Symptoms:**
- File uploads fail
- "Access Denied" or "Permission denied"
- 403 errors

**Solutions:**

```bash
# Verify bucket exists
gsutil ls gs://ai-film-studio-media

# Check permissions
gsutil iam get gs://ai-film-studio-media

# Grant Cloud Run service account access
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
gsutil iam ch serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com:objectCreator \
  gs://ai-film-studio-media

# Test upload
echo "test" | gsutil cp - gs://ai-film-studio-media/test.txt
```

#### Error: "Bucket not found"

**Symptoms:**
- "NoSuchBucket" error
- 404 errors

**Solutions:**

```bash
# Create bucket if missing
gsutil mb -l us-central1 gs://ai-film-studio-media

# Verify bucket name in code
# Should match: gs://ai-film-studio-media

# Update environment variable if needed
echo -n "ai-film-studio-media" | gcloud secrets versions add STORAGE_BUCKET --data-file=-
```

---

### 6. Performance & Scaling Issues

#### Problem: High latency or slow responses

**Symptoms:**
- Response time > 5 seconds
- Timeouts
- Users report slow experience

**Solutions:**

```bash
# Check current resource allocation
gcloud run services describe ai-film-studio --region us-central1 \
  --format='value(spec.template.spec.containers[0].resources)'

# Increase resources
gcloud run services update ai-film-studio \
  --region us-central1 \
  --cpu 4 \
  --memory 4Gi

# Check database performance
gcloud sql instances describe ai-film-studio-db \
  --format='value(settings.tier)'

# Upgrade database if needed
gcloud sql instances patch ai-film-studio-db \
  --tier=db-n1-standard-1

# Enable query insights
gcloud sql instances patch ai-film-studio-db \
  --insights-config-query-insights-enabled

# Check logs for slow queries
gcloud logging read "resource.type=cloud_sql_database AND severity=WARNING" \
  --limit 20
```

#### Problem: Service crashes under load

**Symptoms:**
- 503 errors during traffic spikes
- "Service Unavailable"
- Memory errors in logs

**Solutions:**

```bash
# Increase memory
gcloud run services update ai-film-studio \
  --region us-central1 \
  --memory 4Gi

# Increase max instances
gcloud run services update ai-film-studio \
  --region us-central1 \
  --max-instances 50

# Check for memory leaks
# Review application logs for "OutOfMemory"

# Optimize code
# Profile application locally
# Use Chrome DevTools or Node.js profiler
```

---

### 7. Deployment & CI/CD Issues

#### Error: "Build failed"

**Symptoms:**
- GitHub Actions workflow fails
- Docker build error
- Deployment doesn't complete

**Solutions:**

```bash
# Check build logs
gcloud builds log $(gcloud builds list --limit=1 --format='value(id)')

# Build locally to test
docker build -t ai-film-studio .

# Common issues:
# - Missing dependencies: pnpm install
# - TypeScript errors: pnpm build
# - Port not exposed: Check Dockerfile

# Fix and retry
git add .
git commit -m "Fix build"
git push origin main
```

#### Error: "Insufficient permissions"

**Symptoms:**
- "Permission denied" in CI/CD
- "Access denied" during deployment

**Solutions:**

```bash
# Verify GitHub secrets are set
# Settings → Secrets and variables → Actions

# Check service account permissions
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:github-actions*"

# Grant necessary roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions-deployer@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions-deployer@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.editor"
```

---

### 8. Cost & Billing Issues

#### Problem: Unexpectedly high bill

**Symptoms:**
- Bill higher than expected
- Sudden cost increase

**Solutions:**

```bash
# Check resource usage
gcloud billing accounts list
gcloud billing accounts describe ACCOUNT_ID

# Reduce Cloud Run resources
gcloud run services update ai-film-studio \
  --region us-central1 \
  --cpu 1 \
  --memory 512Mi \
  --min-instances 0 \
  --max-instances 5

# Downgrade database
gcloud sql instances patch ai-film-studio-db \
  --tier=db-f1-micro

# Set up budget alerts
gcloud billing budgets create \
  --billing-account=ACCOUNT_ID \
  --display-name="AI Film Studio Budget" \
  --budget-amount=500 \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=90 \
  --threshold-rule=percent=100

# Review and optimize storage
gsutil du -sh gs://ai-film-studio-media/*
```

---

## FAQ

### Q: How do I rollback to a previous version?

A:
```bash
# List recent revisions
gcloud run revisions list --service=ai-film-studio --region us-central1 --limit 10

# Rollback to previous revision
gcloud run services update-traffic ai-film-studio \
  --region us-central1 \
  --to-revisions=REVISION_NAME=100
```

### Q: How do I update a secret?

A:
```bash
# Create new version
echo -n "new-value" | gcloud secrets versions add SECRET_NAME --data-file=-

# Update Cloud Run to use new version
gcloud run services update ai-film-studio \
  --region us-central1 \
  --update-secrets="SECRET_NAME=SECRET_NAME:latest"
```

### Q: How do I check if the service is healthy?

A:
```bash
# Get service URL
gcloud run services describe ai-film-studio --region us-central1 --format='value(status.url)'

# Test health endpoint
curl https://ai-film-studio-xxxxx.run.app/health

# Check logs
gcloud logging read "resource.type=cloud_run_revision" --limit 20
```

### Q: How do I scale the service?

A:
```bash
# Increase resources
gcloud run services update ai-film-studio \
  --region us-central1 \
  --cpu 4 \
  --memory 4Gi \
  --min-instances 2 \
  --max-instances 50

# Decrease resources (cost optimization)
gcloud run services update ai-film-studio \
  --region us-central1 \
  --cpu 1 \
  --memory 512Mi \
  --min-instances 0 \
  --max-instances 5
```

### Q: How do I backup the database?

A:
```bash
# Create manual backup
gcloud sql backups create --instance=ai-film-studio-db

# List backups
gcloud sql backups list --instance=ai-film-studio-db

# Restore from backup
gcloud sql backups restore BACKUP_ID --backup-instance=ai-film-studio-db
```

### Q: How do I connect to the database?

A:
```bash
# Direct connection
gcloud sql connect ai-film-studio-db --user=filmstudio

# Via Cloud SQL Proxy
cloud_sql_proxy -instances=PROJECT_ID:REGION:INSTANCE_NAME=tcp:3306 &
mysql -h 127.0.0.1 -u filmstudio -p ai_film_studio
```

### Q: How do I view logs?

A:
```bash
# View recent logs
gcloud logging read "resource.type=cloud_run_revision" --limit 50

# Stream logs in real-time
gcloud logging read "resource.type=cloud_run_revision" --follow

# Filter by severity
gcloud logging read "resource.type=cloud_run_revision AND severity=ERROR" --limit 20

# Export to file
gcloud logging read "resource.type=cloud_run_revision" --limit 1000 > logs.json
```

### Q: How do I update the application?

A:
```bash
# Option 1: Automatic (recommended)
git add .
git commit -m "Update: Your changes"
git push origin main
# GitHub Actions will deploy automatically

# Option 2: Manual
gcloud run deploy ai-film-studio --source . --region us-central1
```

### Q: How do I set up a custom domain?

A:
```bash
# Map domain
gcloud run domain-mappings create \
  --service=ai-film-studio \
  --domain=yourdomain.com \
  --region=us-central1

# Update DNS records
# Add CNAME record: yourdomain.com → ghs.googleusercontent.com

# Verify
dig yourdomain.com
curl https://yourdomain.com
```

---

## Getting Help

If you encounter issues not covered here:

1. **Check logs**: `gcloud logging read "resource.type=cloud_run_revision" --limit 50`
2. **Review documentation**: See `DEPLOYMENT_GUIDE.md`
3. **Contact support**: Reach out to the development team
4. **Search issues**: Check GitHub issues for similar problems

---

Last Updated: January 30, 2026
