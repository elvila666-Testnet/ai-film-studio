# AI Film Studio - Deployment Guide

## 🚀 Quick Deploy to Google Cloud Run

### Prerequisites
- Google Cloud account with billing enabled
- `gcloud` CLI installed ([Install Guide](https://cloud.google.com/sdk/docs/install))
- Project ID: `testnet-437019` (or your own)

### One-Command Deployment

```powershell
.\deploy-gcloud.ps1
```

This script will:
1. ✅ Enable required Google Cloud APIs
2. ✅ Build the application
3. ✅ Create Docker image
4. ✅ Deploy to Cloud Run
5. ✅ Configure environment variables
6. ✅ Set up auto-scaling (0-10 instances)

### Manual Deployment Steps

If you prefer manual deployment:

```powershell
# 1. Set your project
gcloud config set project testnet-437019

# 2. Enable APIs
gcloud services enable cloudbuild.googleapis.com run.googleapis.com

# 3. Build locally
pnpm run build

# 4. Build Docker image
gcloud builds submit --tag gcr.io/testnet-437019/ai-film-studio

# 5. Deploy to Cloud Run
gcloud run deploy ai-film-studio \
  --image gcr.io/testnet-437019/ai-film-studio \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --set-env-vars NODE_ENV=production
```

## 🔐 Default Credentials

After deployment, log in with:
- **Email**: `admin@filmstudio.ai`
- **Password**: `admin123`

⚠️ **IMPORTANT**: Change these credentials in production!

## 📊 Post-Deployment

### View Your Application
Your app will be available at:
```
https://ai-film-studio-[hash]-uc.a.run.app
```

### Check Health
```
https://ai-film-studio-[hash]-uc.a.run.app/api/health
```

### View Logs
```powershell
gcloud run services logs read ai-film-studio --region us-central1 --limit 50
```

### Monitor Service
```powershell
gcloud run services describe ai-film-studio --region us-central1
```

## 🔧 Configuration

### Environment Variables
Set via Cloud Run console or CLI:

```powershell
gcloud run services update ai-film-studio \
  --region us-central1 \
  --set-env-vars "JWT_SECRET=your-secret-key"
```

### Scaling
Adjust min/max instances:

```powershell
gcloud run services update ai-film-studio \
  --region us-central1 \
  --min-instances 1 \
  --max-instances 20
```

### Memory & CPU
Adjust resources:

```powershell
gcloud run services update ai-film-studio \
  --region us-central1 \
  --memory 1Gi \
  --cpu 2
```

## 🗄️ Database (Optional)

Currently using in-memory storage. For production:

1. **Set up Cloud SQL** (MySQL):
```powershell
gcloud sql instances create film-studio-db \
  --database-version=MYSQL_8_0 \
  --tier=db-f1-micro \
  --region=us-central1
```

2. **Connect to Cloud Run**:
```powershell
gcloud run services update ai-film-studio \
  --region us-central1 \
  --add-cloudsql-instances testnet-437019:us-central1:film-studio-db \
  --set-env-vars DATABASE_URL="mysql://user:pass@/dbname?host=/cloudsql/testnet-437019:us-central1:film-studio-db"
```

## 🔄 CI/CD with Cloud Build

### Automatic Deployment on Git Push

1. Connect your repository:
```powershell
gcloud builds triggers create github \
  --repo-name=ai-film-studio \
  --repo-owner=YOUR_GITHUB_USERNAME \
  --branch-pattern="^main$" \
  --build-config=cloudbuild.yaml
```

2. Push to main branch → Automatic deployment!

## 💰 Cost Estimation

With default settings (512Mi RAM, 1 CPU):
- **Free tier**: 2 million requests/month
- **After free tier**: ~$0.00002400 per request
- **Idle**: $0 (scales to zero)

Estimated monthly cost for moderate usage: **$5-20**

## 🛠️ Troubleshooting

### Build Fails
```powershell
# Check build logs
gcloud builds list --limit=5
gcloud builds log [BUILD_ID]
```

### Service Won't Start
```powershell
# Check service logs
gcloud run services logs read ai-film-studio --region us-central1 --limit 100
```

### Permission Errors
```powershell
# Ensure you have necessary roles
gcloud projects add-iam-policy-binding testnet-437019 \
  --member="user:YOUR_EMAIL" \
  --role="roles/run.admin"
```

## 📚 Additional Resources

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud Build Documentation](https://cloud.google.com/build/docs)
- [Pricing Calculator](https://cloud.google.com/products/calculator)

## 🎬 Ready to Deploy!

Run the deployment script:
```powershell
.\deploy-gcloud.ps1
```

Your AI Film Studio will be live in minutes! 🚀
