# AI Film Studio - Windows Deployment Guide

## What You Need to Do

### Step 1: Replace Files in Your Local Repository

1. **Download the files** from this package
2. **Copy these files** to your local `C:\ai_film_studio` directory:
   - `package.json` → Replace existing
   - `Dockerfile` → Replace existing
   - `vite.config.ts` → Replace existing
   - `tsconfig.json` → Replace existing
   - `server-index.ts` → Copy to `server/_core/index.ts` (rename the file)

### Step 2: Commit to GitHub (Windows PowerShell)

```powershell
cd C:\ai_film_studio

# Check what changed
git status

# Add all changes
git add .

# Commit
git commit -m "Fix: Add missing package.json and mount tRPC router"

# Push to GitHub
git push origin main
```

### Step 3: Deploy to Cloud Run (Windows PowerShell)

```powershell
# Make sure you're in the project directory
cd C:\ai_film_studio

# Deploy to Cloud Run
gcloud run deploy ai-film-studio `
  --source . `
  --region us-central1 `
  --platform managed `
  --memory 2Gi `
  --cpu 2 `
  --timeout 3600 `
  --allow-unauthenticated `
  --project ai-films-prod `
  --set-env-vars NODE_ENV=production,CLOUD_SQL_CONNECTION_NAME=ai-films-prod:us-central1:ai-film-studio-db,CLOUD_SQL_DATABASE=ai_film_studio_prod,CLOUD_SQL_USER=prod_user,CLOUD_SQL_PASSWORD=Libra.2024
```

### Step 4: Get Your Live URL

```powershell
gcloud run services describe ai-film-studio `
  --region us-central1 `
  --project ai-films-prod `
  --format='value(status.url)'
```

Open that URL in your browser - you should see the full AI Film Studio app!

---

## File Descriptions

| File | What It Does |
|------|-------------|
| **package.json** | Lists all Node.js dependencies (was missing!) |
| **Dockerfile** | Container configuration for Cloud Run |
| **server-index.ts** | Fixed Express server with tRPC API mounted |
| **vite.config.ts** | Build configuration for React frontend |
| **tsconfig.json** | TypeScript configuration |

---

## Troubleshooting

### "git command not found"
- Install Git from https://git-scm.com/download/win
- Restart PowerShell

### "gcloud command not found"
- Install Google Cloud SDK from https://cloud.google.com/sdk/docs/install
- Restart PowerShell

### Deployment still shows "Frontend OK"
1. Check the logs:
   ```powershell
   gcloud run services logs read ai-film-studio --region us-central1 --project ai-films-prod --limit 50
   ```
2. Make sure all files were committed to GitHub
3. Make sure package.json has all dependencies

---

## Key Points

✅ **package.json** - Contains all tRPC dependencies (this was missing!)
✅ **server-index.ts** - Mounts tRPC router at `/api/trpc` (this was broken!)
✅ **Dockerfile** - Production-ready container configuration
✅ **Everything else** - Build and deployment configuration

---

**Status**: Ready to Deploy
**Last Updated**: February 5, 2025
