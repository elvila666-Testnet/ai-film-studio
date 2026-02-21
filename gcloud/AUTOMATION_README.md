# GitHub Actions Automation Guide

This guide explains how to fully automate your deployment pipeline using the scripts provided.

## 1. Setup GitHub Secrets (One-Time Setup)

You need to configure your GitHub repository to talk to Google Cloud.

1.  Open a PowerShell terminal in `c:\ai_film_studio`.
2.  Run the setup script:
    ```powershell
    ./gcloud/setup-github-auth.ps1
    ```
3.  Follow the prompts. You will need your GitHub repository name (e.g. `username/repo`).
4.  The script will output three values:
    *   `GCP_PROJECT_ID`
    *   `WIF_PROVIDER`
    *   `WIF_SERVICE_ACCOUNT`
5.  Go to your GitHub Repository -> **Settings** -> **Secrets and variables** -> **Actions**.
6.  Create a **New repository secret** for each of the three values above.

## 2. Push to Deploy

Once the secrets are set, any push to the `main` branch will trigger a deployment.

```bash
git add .
git commit -m "Configure production CI/CD"
git push origin main
```

## 3. Verify Deployment

1.  Go to the **Actions** tab in your GitHub repository.
2.  Click on the running workflow ("Deploy to Google Cloud").
3.  Wait for it to complete (~5-10 minutes).
4.  Once green, your app is live at the URL shown in the "Get Cloud Run service URL" step logs.

## Troubleshooting

*   **Tests Failing?** The CI runs `pnpm test`. If your tests require a real database, ensure you mock it or add a service container to `.github/workflows/deploy.yml`. currently, tests use `DATABASE_URL` pointing to localhost, which works for unit tests mocking the DB, but will fail integration tests if they try to connect.
*   **Permission Denied?** Ensure the `setup-github-auth.ps1` script ran successfully and you copied the values exactly.
