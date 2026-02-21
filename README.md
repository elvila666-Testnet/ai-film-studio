# AI Film Studio

A professional AI-powered film production suite built with a modern **Node.js, TypeScript, and React** stack.

## 🚀 System Overview

This application serves as a comprehensive platform for AI-assisted film creation, featuring:
-   **Script Analysis & Generation**: Utilizing LLMs for scriptwriting and breakdown.
-   **Storyboard Generation**: AI image generation for scene visualization.
-   **Video Generation**: Integration with Veo3, Sora, and other video models.
-   **Project Management**: Full lifecycle management from brief to export.

## 🛠️ Technology Stack

-   **Frontend**: React (Vite), TailwindCSS, Radix UI
-   **Backend**: Node.js, Express, tRPC
-   **Database**: MySQL (via Drizzle ORM)
-   **Infrastructure**: Google Cloud Platform (Cloud Run, Cloud SQL, Storage)
-   **AI Integration**: Google Gemini, Nanobanana, Sora, Veo3

## 📂 Project Structure

```
/client          # React frontend application
/server          # Node.js/Express backend & tRPC routers
/docs            # Comprehensive documentation
  /deployment    # Deployment guides (GCP, Docker)
  /architecture  # System design & API integration notes
  /manuals       # User manuals and runbooks
/scripts         # Utility scripts (PowerShell, etc.)
/drizzle         # Database schema and migrations
```

## ⚡ Quick Start

### 1. Install Dependencies
```bash
# Install root dependencies (concurrently, etc.)
npm install

# Install Client & Server dependencies
cd client && npm install
cd ../server && npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and configure your API keys (Gemini, Database, etc.).

### 3. Run Development Server
```bash
# From root
npm run dev
```

## 📖 Documentation
Detailed documentation is located in the `docs/` directory:
-   **Deployment**: `docs/deployment/DEPLOYMENT_GUIDE.md`
-   **Architecture**: `docs/architecture/ALL_IN_ONE_IMPLEMENTATION.md`
-   **API Integration**: `docs/architecture/API_INTEGRATION.md`

## ☁️ Deployment (Google Cloud)

This project includes automation scripts for Google Cloud Run deployment.

1.  **Check Prerequisites**:
    ```powershell
    ./scripts/check_prereqs.ps1
    ```
2.  **Deploy**:
    ```powershell
    ./scripts/deploy.ps1
    ```

## ⚠️ Note
This project was previously mislabeled as a Django application. All backend logic is TypeScript/Node.js.
