# API Integration Documentation - AI Film Studio

## Overview

This document provides detailed information about integrating external APIs into AI Film Studio. The application uses multiple AI and video generation APIs to power its features.

---

## Table of Contents

1. [Google Gemini API](#google-gemini-api)
2. [Nanobanana Pro API](#nanobanana-pro-api)
3. [Sora 2 API](#sora-2-api)
4. [Veo3 API](#veo3-api)
5. [OpenAI API](#openai-api)
6. [AWS S3 Integration](#aws-s3-integration)
7. [Manus OAuth](#manus-oauth)
8. [API Rate Limits & Quotas](#api-rate-limits--quotas)
9. [Error Handling](#error-handling)

---

## Google Gemini API

### Purpose

Gemini is used for text generation tasks including script generation, visual style descriptions, and technical shot generation.

### Setup

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create new project
   - Enable Generative AI API

2. **Generate API Key**
   - Go to [Google AI Studio](https://aistudio.google.com/)
   - Click "Get API Key"
   - Create new API key
   - Copy to `GEMINI_API_KEY` environment variable

### Configuration

```bash
GEMINI_API_KEY="your_gemini_api_key"
```

### Usage Examples

#### Generate Script from Brief

```typescript
import { invokeLLM } from "./server/_core/llm";

const response = await invokeLLM({
  messages: [
    {
      role: "system",
      content: "You are a professional screenwriter. Generate a screenplay based on the brief provided."
    },
    {
      role: "user",
      content: `Project Brief: ${brief}`
    }
  ]
});

const script = response.choices[0].message.content;
```

#### Generate Visual Style Description

```typescript
const response = await invokeLLM({
  messages: [
    {
      role: "system",
      content: "You are a cinematographer. Describe the visual style and cinematography approach."
    },
    {
      role: "user",
      content: `Brief: ${brief}\nTechnical Requirements: ${technicalShots}`
    }
  ]
});
```

#### Generate Image Prompt from Shot

```typescript
const response = await invokeLLM({
  messages: [
    {
      role: "system",
      content: "You are a visual effects artist. Generate a detailed image prompt for this shot."
    },
    {
      role: "user",
      content: `Shot: ${shotDescription}`
    }
  ]
});
```

### Pricing

- **Free Tier**: 60 requests per minute
- **Paid**: $0.075 per 1M input tokens, $0.30 per 1M output tokens

### Documentation

- [Gemini API Documentation](https://ai.google.dev/docs)
- [Pricing](https://ai.google.dev/pricing)

---

## Nanobanana Pro API

### Purpose

Nanobanana Pro generates high-quality images (1K/2K/4K) for storyboard frames with support for reference images.

### Setup

1. **Create Account**
   - Visit [Nanobanana API](https://nanobananaapi.ai/)
   - Sign up for account
   - Verify email

2. **Generate API Key**
   - Log in to Dashboard
   - Go to API Keys section
   - Create new API key
   - Copy to `NANOBANANA_API_KEY` environment variable

### Configuration

```bash
NANOBANANA_API_KEY="your_nanobanana_api_key"
```

### API Endpoints

#### Generate Image

```bash
POST https://api.nanobananaapi.ai/image/generate
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "prompt": "A cinematic shot of a sunset over mountains",
  "width": 1920,
  "height": 1080,
  "steps": 30,
  "guidance_scale": 7.5,
  "reference_images": [
    {
      "url": "https://example.com/reference.jpg",
      "strength": 0.7
    }
  ]
}
```

#### Check Generation Status

```bash
GET https://api.nanobananaapi.ai/image/status/{task_id}
Authorization: Bearer YOUR_API_KEY
```

### Usage in Code

```typescript
import { ENV } from "./server/_core/env";

async function generateImageWithNanobanana(
  prompt: string,
  referenceImages?: Array<{ url: string; mimeType: string }>
) {
  const payload = {
    prompt,
    width: 1920,
    height: 1080,
    steps: 30,
    guidance_scale: 7.5,
    reference_images: referenceImages?.map(img => ({
      url: img.url,
      strength: 0.7
    }))
  };

  const response = await fetch(
    "https://api.nanobananaapi.ai/image/generate",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ENV.nanobananaApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );

  const data = await response.json();
  return data.task_id;
}
```

### Pricing

- **Free Tier**: 5 images per day
- **Pro**: $9.99/month for 100 images
- **Premium**: $29.99/month for 500 images
- **Enterprise**: Custom pricing

### Documentation

- [Nanobanana API Docs](https://docs.nanobananaapi.ai/)
- [API Reference](https://docs.nanobananaapi.ai/reference)

---

## Sora 2 API

### Purpose

Sora 2 generates videos from text prompts and images.

### Setup

1. **Request Access**
   - Visit Sora 2 API website
   - Request beta access
   - Wait for approval

2. **Generate API Key**
   - Access developer dashboard
   - Create API key
   - Copy to `SORA_API_KEY` environment variable

### Configuration

```bash
SORA_API_KEY="your_sora_api_key"
```

### API Endpoints

#### Generate Video

```bash
POST https://api.sora.ai/v1/video/generate
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "prompt": "A cinematic scene of a character walking through a forest",
  "duration": 10,
  "resolution": "1920x1080",
  "fps": 24,
  "reference_images": [
    "https://example.com/reference.jpg"
  ]
}
```

### Usage in Code

```typescript
async function generateVideoWithSora(
  prompt: string,
  duration: number = 10,
  referenceImages?: string[]
) {
  const payload = {
    prompt,
    duration,
    resolution: "1920x1080",
    fps: 24,
    reference_images: referenceImages
  };

  const response = await fetch(
    "https://api.sora.ai/v1/video/generate",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ENV.soraApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );

  const data = await response.json();
  return data.video_id;
}
```

### Pricing

- **Beta**: Free during beta period
- **Production**: Pricing to be announced

---

## Veo3 API

### Purpose

Veo3 (Google's video generation model) creates videos with advanced motion and scene understanding.

### Setup

1. **Enable in Google Cloud**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Enable Veo3 API
   - Create service account

2. **Generate Credentials**
   - Create JSON key file
   - Copy API key to `VEO3_API_KEY` environment variable

### Configuration

```bash
VEO3_API_KEY="your_veo3_api_key"
```

### Usage in Code

```typescript
async function generateVideoWithVeo3(
  prompt: string,
  duration: number = 10
) {
  const payload = {
    prompt,
    duration,
    resolution: "1920x1080",
    fps: 24
  };

  const response = await fetch(
    "https://veo3.googleapis.com/v1/video/generate",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ENV.veo3ApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );

  const data = await response.json();
  return data.video_id;
}
```

### Pricing

- **Free Tier**: 100 minutes per month
- **Paid**: $0.10 per minute

---

## OpenAI API

### Purpose

OpenAI is used as a fallback for image generation and can be used for additional text generation tasks.

### Setup

1. **Create OpenAI Account**
   - Visit [OpenAI Platform](https://platform.openai.com/)
   - Sign up or log in
   - Go to API keys

2. **Generate API Key**
   - Create new API key
   - Copy to `OPENAI_API_KEY` environment variable

### Configuration

```bash
OPENAI_API_KEY="your_openai_api_key"
```

### Usage Examples

#### Generate Image with DALL-E 3

```typescript
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: ENV.openaiApiKey
});

async function generateImageWithOpenAI(prompt: string) {
  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt,
    n: 1,
    size: "1920x1080"
  });

  return response.data[0].url;
}
```

### Pricing

- **DALL-E 3**: $0.080 per image (1024x1024)
- **GPT-4**: $0.03 per 1K input tokens, $0.06 per 1K output tokens

---

## AWS S3 Integration

### Purpose

S3 stores generated images, videos, and user-uploaded files.

### Setup

1. **Create AWS Account**
   - Visit [AWS Console](https://console.aws.amazon.com/)
   - Create account

2. **Create S3 Bucket**
   - Go to S3 service
   - Create bucket: `ai-film-studio-media`
   - Enable versioning
   - Configure CORS

3. **Create IAM User**
   - Go to IAM service
   - Create new user
   - Attach S3 policy
   - Generate access keys

### Configuration

```bash
AWS_ACCESS_KEY_ID="your_access_key"
AWS_SECRET_ACCESS_KEY="your_secret_key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET="ai-film-studio-media"
```

### Usage in Code

```typescript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.AWS_REGION
});

async function uploadToS3(
  key: string,
  body: Buffer,
  contentType: string
) {
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType
  });

  await s3.send(command);
  return `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/${key}`;
}
```

### Pricing

- **Storage**: $0.023 per GB (first 50 TB/month)
- **Data Transfer**: $0.09 per GB (outbound)
- **Requests**: $0.0004 per 1,000 PUT requests

---

## Manus OAuth

### Purpose

Manus OAuth provides user authentication and authorization.

### Setup

1. **Create Manus Account**
   - Visit [Manus Platform](https://manus.im/)
   - Sign up for developer account

2. **Create Application**
   - Go to Developer Dashboard
   - Create new application
   - Configure OAuth settings
   - Get `VITE_APP_ID`

### Configuration

```bash
VITE_APP_ID="your_app_id"
OAUTH_SERVER_URL="https://api.manus.im"
VITE_OAUTH_PORTAL_URL="https://manus.im"
JWT_SECRET="your_jwt_secret"
```

### OAuth Flow

```typescript
// 1. Get login URL
const loginUrl = `${OAUTH_SERVER_URL}/oauth/authorize?client_id=${VITE_APP_ID}&redirect_uri=${redirectUri}`;

// 2. Handle callback
app.get("/api/oauth/callback", async (req, res) => {
  const { code } = req.query;
  
  // Exchange code for token
  const token = await exchangeCodeForToken(code);
  
  // Create session
  res.cookie("session", token, { httpOnly: true });
  res.redirect("/");
});

// 3. Verify token
const user = verifyToken(token);
```

---

## API Rate Limits & Quotas

### Gemini API

- **Rate Limit**: 60 requests per minute (free tier)
- **Quota**: 1,500 requests per day (free tier)
- **Upgrade**: Pay-as-you-go for higher limits

### Nanobanana Pro

- **Rate Limit**: 10 requests per minute (free tier)
- **Quota**: 5 images per day (free tier)
- **Upgrade**: Unlimited with paid plan

### Sora 2

- **Rate Limit**: 5 requests per minute (beta)
- **Quota**: 100 videos per month (beta)
- **Production**: TBD

### Veo3

- **Rate Limit**: 10 requests per minute
- **Quota**: 100 minutes per month (free tier)
- **Upgrade**: Pay-as-you-go

### OpenAI

- **Rate Limit**: 3,500 requests per minute (paid)
- **Quota**: No daily limit
- **Billing**: Pay-as-you-go

---

## Error Handling

### Implement Retry Logic

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error("Max retries exceeded");
}
```

### Handle Rate Limits

```typescript
async function handleRateLimit(error: any) {
  if (error.status === 429) {
    const retryAfter = error.headers['retry-after'] || 60;
    console.log(`Rate limited. Retrying after ${retryAfter} seconds`);
    await new Promise(resolve => 
      setTimeout(resolve, retryAfter * 1000)
    );
  }
}
```

### Fallback Strategy

```typescript
async function generateImageWithFallback(prompt: string) {
  try {
    // Try Nanobanana first
    return await generateImageWithNanobanana(prompt);
  } catch (error) {
    console.warn("Nanobanana failed, falling back to OpenAI", error);
    try {
      // Fallback to OpenAI
      return await generateImageWithOpenAI(prompt);
    } catch (fallbackError) {
      console.error("All image generation methods failed", fallbackError);
      throw new Error("Image generation failed");
    }
  }
}
```

---

## Monitoring & Logging

### Log API Calls

```typescript
async function logApiCall(
  service: string,
  endpoint: string,
  status: number,
  duration: number
) {
  console.log({
    timestamp: new Date().toISOString(),
    service,
    endpoint,
    status,
    duration
  });
}
```

### Track Usage

```typescript
async function trackApiUsage(
  service: string,
  tokens?: number,
  images?: number,
  videos?: number
) {
  // Store in database for billing and monitoring
  await db.insert(apiUsage).values({
    service,
    tokens,
    images,
    videos,
    timestamp: new Date()
  });
}
```

---

## Best Practices

1. **Store API Keys Securely**: Use environment variables or secret managers
2. **Implement Rate Limiting**: Respect API rate limits with queuing
3. **Use Caching**: Cache results to reduce API calls
4. **Monitor Costs**: Track API usage and costs
5. **Implement Fallbacks**: Have backup APIs for critical functions
6. **Test Thoroughly**: Test with various inputs and edge cases
7. **Document Changes**: Keep API integration documentation updated

---

## Support & Resources

- [Gemini API Docs](https://ai.google.dev/docs)
- [Nanobanana Docs](https://docs.nanobananaapi.ai/)
- [OpenAI Docs](https://platform.openai.com/docs)
- [AWS S3 Docs](https://docs.aws.amazon.com/s3/)
- [Manus Platform](https://manus.im/)

---

**Last Updated**: January 29, 2026
