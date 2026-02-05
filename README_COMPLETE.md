# AI Film Studio - Complete Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [Technology Stack](#technology-stack)
5. [Local Development](#local-development)
6. [Deployment](#deployment)
7. [API Documentation](#api-documentation)
8. [Database Schema](#database-schema)
9. [Configuration](#configuration)
10. [Troubleshooting](#troubleshooting)

---

## Project Overview

**AI Film Studio** is a professional production tracking and video editing system designed for film and video production teams. It combines AI-powered content generation with professional video editing capabilities, enabling teams to go from concept to final video in a single integrated platform.

### Key Capabilities

- **Production Workflow**: Brief → Script → Visual Style → Technical Shots → Storyboard → Editor → Export
- **AI Integration**: Gemini for text generation, Nanobanana Pro for image generation, Sora 2 and Veo3 for video generation
- **Professional Editor**: DaVinci Resolve-style interface with timeline, media pool, canvas, and inspector panels
- **Collaboration**: User authentication, project sharing, and comment system for team feedback
- **Video Composition**: FFmpeg-based video rendering with multi-track support

---

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React 19)                      │
│  - Vite bundler                                              │
│  - Tailwind CSS 4 styling                                    │
│  - shadcn/ui components                                      │
│  - tRPC client for API calls                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ tRPC Procedures
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                  Backend (Express + tRPC)                    │
│  - tRPC Router with procedures                               │
│  - Drizzle ORM for database access                           │
│  - OAuth authentication (Manus)                              │
│  - FFmpeg video processing                                   │
│  - AI service integrations                                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
    ┌────────┐   ┌──────────┐   ┌─────────┐
    │ MySQL  │   │   S3     │   │ AI APIs │
    │Database│   │ Storage  │   │ (Gemini,│
    │        │   │          │   │Nanobanana)
    └────────┘   └──────────┘   └─────────┘
```

### Data Flow

1. **User creates project** → Stored in MySQL
2. **AI generation** → Gemini generates text, Nanobanana generates images
3. **Storyboard creation** → Images stored in S3, metadata in MySQL
4. **Editor workflow** → Clips organized in timeline, comments stored in MySQL
5. **Video export** → FFmpeg renders final video, stored in S3

---

## Features

### 1. Production Workflow Tabs

#### Brief Tab
- Define project concept and objectives
- AI-powered script generation from brief
- Save and refine project briefs

#### Script Tab
- Generate screenplay from brief
- Refine and edit script text
- Add production notes
- AI-assisted script refinement

#### Visual Style Tab
- Upload reference images for visual direction
- AI-generated visual style descriptions
- Nanobanana Pro integration for image generation with reference guidance
- Define cinematography palette

#### Technical Shots Tab
- Define 18+ technical shots with:
  - Shot type (close-up, wide, etc.)
  - Camera action
  - Directorial intention
- AI-assisted shot generation

#### Storyboard Tab
- Generate storyboard images from technical shots
- Nanobanana Pro image generation
- Export animatic (coming soon)
- Individual shot refinement

#### Editor Tab
- DaVinci Resolve-style interface
- Media Pool for clip management
- Canvas for video preview
- Timeline for multi-track editing
- Inspector for clip properties and comments
- Comment system for team feedback
- Export to multiple formats (mp4, webm, mov, mkv)

### 2. AI Integration

**Gemini API**
- Script generation and refinement
- Visual style descriptions
- Technical shot generation
- Image prompt generation

**Nanobanana Pro API**
- High-quality image generation (1K/2K/4K)
- Reference image support for style consistency
- Fallback to OpenAI if needed

**Sora 2 & Veo3 APIs**
- Video generation from prompts
- Timeline-to-video rendering (planned)

### 3. User Management

- Manus OAuth authentication
- User-specific projects
- Role-based access (user/admin)
- Project ownership tracking

### 4. Collaboration Features

- Comments on clips for feedback
- User attribution on comments
- Comment resolution tracking
- Team-based editing workflow

---

## Technology Stack

### Frontend
- **React 19** - UI framework
- **Vite 7** - Build tool
- **Tailwind CSS 4** - Styling
- **shadcn/ui** - Component library
- **tRPC** - Type-safe API client
- **Wouter** - Routing

### Backend
- **Express 4** - Web framework
- **Node.js 22** - Runtime
- **tRPC 11** - RPC framework
- **Drizzle ORM** - Database ORM
- **MySQL 2** - Database driver

### Database
- **MySQL/TiDB** - Primary database
- **Drizzle Kit** - Schema migrations

### External Services
- **Google Gemini API** - Text generation
- **Nanobanana Pro API** - Image generation
- **Sora 2 API** - Video generation
- **Veo3 API** - Video generation
- **AWS S3** - File storage
- **Manus OAuth** - Authentication

### Video Processing
- **FFmpeg** - Video composition and rendering
- **uuid** - Unique ID generation

---

## Local Development

### Prerequisites

- Node.js 18+ ([Download](https://nodejs.org/))
- pnpm 10+ (`npm install -g pnpm`)
- MySQL 8+ or TiDB Cloud account
- Git

### Installation Steps

1. **Clone or download the project**
   ```bash
   cd ai_film_studio
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Create `.env.local` file** in project root
   ```bash
   # Database
   DATABASE_URL="mysql://user:password@localhost:3306/ai_film_studio"
   
   # Manus OAuth
   VITE_APP_ID="your_app_id"
   OAUTH_SERVER_URL="https://api.manus.im"
   VITE_OAUTH_PORTAL_URL="https://manus.im"
   
   # AI APIs
   GEMINI_API_KEY="your_gemini_key"
   NANOBANANA_API_KEY="your_nanobanana_key"
   SORA_API_KEY="your_sora_key"
   VEO3_API_KEY="your_veo3_key"
   OPENAI_API_KEY="your_openai_key"
   
   # JWT
   JWT_SECRET="your_jwt_secret_key"
   
   # Owner Info
   OWNER_OPEN_ID="your_open_id"
   OWNER_NAME="Your Name"
   ```

4. **Setup database**
   ```bash
   pnpm db:push
   ```

5. **Start development server**
   ```bash
   pnpm dev
   ```

6. **Open in browser**
   ```
   http://localhost:3000
   ```

### Development Commands

```bash
# Start dev server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run tests
pnpm test

# Format code
pnpm format

# Type check
pnpm check

# Push database migrations
pnpm db:push
```

---

## Deployment

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for complete Google Cloud deployment instructions.

---

## API Documentation

### Project Management

#### Create Project
```typescript
trpc.projects.create.useMutation({
  name: "My Film Project"
})
```

#### Get Projects
```typescript
trpc.projects.list.useQuery()
```

#### Get Project Details
```typescript
trpc.projects.get.useQuery({ id: projectId })
```

#### Delete Project
```typescript
trpc.projects.delete.useMutation({ id: projectId })
```

### Content Management

#### Update Project Content
```typescript
trpc.projects.updateContent.useMutation({
  projectId,
  brief: "Project brief text",
  script: "Script text",
  masterVisual: "Visual style description",
  technicalShots: JSON.stringify([...]),
  storyboardPrompts: JSON.stringify([...])
})
```

### Storyboard

#### Get Storyboard Images
```typescript
trpc.storyboard.getImages.useQuery({ projectId })
```

#### Save Storyboard Image
```typescript
trpc.storyboard.saveImage.useMutation({
  projectId,
  shotNumber,
  imageUrl,
  prompt
})
```

### AI Generation

#### Generate Script
```typescript
trpc.ai.generateScript.useMutation({
  brief: "Project brief",
  referenceStyle: "Optional reference"
})
```

#### Generate Storyboard Image
```typescript
trpc.ai.generateStoryboardImage.useMutation({
  prompt: "Image description",
  referenceImages: [{ url: "...", mimeType: "image/jpeg" }]
})
```

#### Generate Image Prompt
```typescript
trpc.ai.generateImagePrompt.useMutation({
  shot: "Shot description"
})
```

### Editor

#### Create Editor Project
```typescript
trpc.editor.projects.create.useMutation({
  projectId,
  title: "Editor Project",
  description: "Description",
  fps: 24,
  resolution: "1920x1080"
})
```

#### Populate from Storyboard
```typescript
trpc.editor.populateFromStoryboard.useMutation({
  projectId,
  editorProjectId
})
```

#### Add Comment
```typescript
trpc.editor.comments.create.useMutation({
  clipId,
  content: "Comment text",
  timestamp: 0
})
```

#### Get Comments
```typescript
trpc.editor.comments.list.useQuery({ clipId })
```

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  openId VARCHAR(64) UNIQUE NOT NULL,
  name TEXT,
  email VARCHAR(320),
  loginMethod VARCHAR(64),
  role ENUM('user', 'admin') DEFAULT 'user',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  lastSignedIn TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Projects Table
```sql
CREATE TABLE projects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

### Project Content Table
```sql
CREATE TABLE projectContent (
  id INT PRIMARY KEY AUTO_INCREMENT,
  projectId INT NOT NULL,
  brief TEXT,
  script TEXT,
  masterVisual TEXT,
  technicalShots TEXT,
  storyboardPrompts TEXT,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
);
```

### Storyboard Images Table
```sql
CREATE TABLE storyboardImages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  projectId INT NOT NULL,
  shotNumber INT,
  imageUrl TEXT NOT NULL,
  prompt TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
);
```

### Reference Images Table
```sql
CREATE TABLE referenceImages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  projectId INT NOT NULL,
  imageUrl TEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
);
```

### Editor Projects Table
```sql
CREATE TABLE editorProjects (
  id INT PRIMARY KEY AUTO_INCREMENT,
  projectId INT NOT NULL,
  title VARCHAR(255),
  description TEXT,
  fps INT DEFAULT 24,
  resolution VARCHAR(50),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
);
```

### Editor Clips Table
```sql
CREATE TABLE editorClips (
  id INT PRIMARY KEY AUTO_INCREMENT,
  editorProjectId INT NOT NULL,
  trackId INT NOT NULL,
  fileUrl TEXT NOT NULL,
  fileName VARCHAR(255),
  fileType VARCHAR(50),
  duration INT,
  startTime INT,
  trimStart INT,
  trimEnd INT,
  volume INT DEFAULT 100,
  order INT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (editorProjectId) REFERENCES editorProjects(id) ON DELETE CASCADE
);
```

### Editor Comments Table
```sql
CREATE TABLE editorComments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  clipId INT NOT NULL,
  userId INT NOT NULL,
  content TEXT NOT NULL,
  timestamp INT DEFAULT 0,
  resolved BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (clipId) REFERENCES editorClips(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## Configuration

### Environment Variables

All environment variables should be set in `.env.local` (development) or via Google Cloud Secret Manager (production).

**Required Variables:**
- `DATABASE_URL` - MySQL connection string
- `VITE_APP_ID` - Manus OAuth app ID
- `GEMINI_API_KEY` - Google Gemini API key
- `NANOBANANA_API_KEY` - Nanobanana Pro API key
- `JWT_SECRET` - JWT signing secret

**Optional Variables:**
- `SORA_API_KEY` - Sora 2 API key
- `VEO3_API_KEY` - Veo3 API key
- `OPENAI_API_KEY` - OpenAI API key (fallback for image generation)

### API Keys Setup

#### Google Gemini
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Click "Get API Key"
3. Create new API key
4. Copy and paste into `GEMINI_API_KEY`

#### Nanobanana Pro
1. Visit [Nanobanana API](https://nanobananaapi.ai/)
2. Sign up for account
3. Go to Dashboard → API Keys
4. Copy API key to `NANOBANANA_API_KEY`

#### Sora 2
1. Access Sora 2 API documentation
2. Generate API key
3. Set `SORA_API_KEY`

#### Veo3
1. Access Veo3 API (Google)
2. Generate API key
3. Set `VEO3_API_KEY`

---

## Troubleshooting

### Database Connection Issues

**Problem**: `Error: connect ECONNREFUSED 127.0.0.1:3306`

**Solution**:
1. Verify MySQL is running: `mysql -u root -p`
2. Check DATABASE_URL format
3. Ensure database exists: `CREATE DATABASE ai_film_studio;`

### API Key Errors

**Problem**: `401 Unauthorized` from AI APIs

**Solution**:
1. Verify API keys are correct
2. Check API key has proper permissions
3. Ensure API key hasn't expired
4. Test API key directly with curl

### Build Errors

**Problem**: `TypeScript compilation errors`

**Solution**:
1. Run `pnpm check` to see all errors
2. Ensure all dependencies installed: `pnpm install`
3. Clear cache: `rm -rf node_modules/.vite`
4. Rebuild: `pnpm build`

### Video Generation Issues

**Problem**: `FFmpeg not found`

**Solution**:
1. Install FFmpeg: `brew install ffmpeg` (macOS) or `apt-get install ffmpeg` (Linux)
2. Verify installation: `ffmpeg -version`

### S3 Upload Issues

**Problem**: `Access Denied` when uploading files

**Solution**:
1. Verify S3 bucket permissions
2. Check AWS credentials
3. Ensure bucket is public or has proper CORS settings

---

## Support & Resources

- **Documentation**: See DEPLOYMENT_GUIDE.md for cloud deployment
- **API Reference**: tRPC procedures in server/routers.ts
- **Database**: Drizzle ORM schema in drizzle/schema.ts
- **Frontend**: React components in client/src/pages/

---

## License

This project is proprietary software. All rights reserved.

---

**Last Updated**: January 29, 2026
