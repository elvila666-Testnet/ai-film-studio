# AI Film Studio - Google Cloud Deployment

This directory contains scripts and configuration for deploying the AI Film Studio application to Google Cloud Platform (GCP).

## Files

### Deployment Scripts

- **`deploy.ps1`**: The primary script for deploying the application to Cloud Run. It builds the Docker image and deploys it.
  - *Usage*: `.\gcloud\deploy.ps1`

- **`deploy-simple.ps1`**: A simpler deployment script that directly uploads the source and deploys using Cloud Run's source deployment.
  - *Usage*: `.\gcloud\deploy-simple.ps1 [PROJECT_ID]`

- **`deploy-build.ps1`**: Submits a build to Cloud Build using the `cloudbuild.yaml` configuration.
  - *Usage*: `.\gcloud\deploy-build.ps1 [PROJECT_ID]`

### Infrastructure Setup

- **`setup-infra.ps1`**: A comprehensive script to set up the entire GCP infrastructure (Cloud SQL, Storage, Secret Manager, Service Accounts, etc.).
  - *Usage*: `.\gcloud\setup-infra.ps1 [PROJECT_ID]`

- **`setup-infra.sh`**: The Bash equivalent of `setup-infra.ps1` for Linux/macOS users.

### Configuration

- **`cloudbuild.yaml`**: The Cloud Build configuration file defining the build steps (Docker build, push, deploy).

- **`cloud.yaml`**: A Knative service definition file for Cloud Run, which can be used for declarative deployment.

## Usage

You can run these scripts from the project root or from within the `gcloud` directory. They are configured to automatically handle paths relative to the project root.

Example:
```powershell
# From project root
.\gcloud\deploy.ps1
```
