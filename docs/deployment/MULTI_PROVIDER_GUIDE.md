# Multi-Provider Generation System - Implementation Guide

## Overview

AI Film Studio now supports multiple providers for both image and video generation, with cost estimation and provider switching capabilities.

## Supported Providers

### Image Generation
- **DALL-E 3** (OpenAI) - High quality, consistent results
- **Midjourney** - Artistic, stylized outputs
- **NanoBanana Pro** (Gemini 2.0) - Fast, cost-effective

### Video Generation
- **Flow** - Camera movement and parallax
- **Sora** (OpenAI) - Full scene generation
- **Kling** - Fast video generation
- **WHAN** - Alternative video generation

## Architecture

### Core Components

1. **Provider Types** (`server/services/providers/types.ts`)
   - Defines interfaces for all providers
   - Cost estimation models
   - Parameter validation

2. **Image Providers** (`server/services/providers/imageProviders.ts`)
   - DALLEProvider, MidjourneyProvider, NanoBananaProvider
   - Unified interface for all image generation

3. **Video Providers** (`server/services/providers/videoProviders.ts`)
   - FlowProvider, SoraProvider, KlingProvider, WHANProvider
   - Unified interface for all video generation

4. **Cost Estimator** (`server/services/providers/costEstimator.ts`)
   - Calculates per-provider costs
   - Compares pricing across providers
   - Project-wide cost breakdowns

5. **Provider Factory** (`server/services/providers/providerFactory.ts`)
   - Manages provider registry
   - Handles fallback logic
   - Provider priority management

## Cost Estimation

### Image Generation Costs

| Provider | Cost per Image | Quality | Speed |
|----------|---|---|---|
| DALL-E 3 | $0.020 | High | Medium |
| Midjourney | $0.015 | Artistic | Slow |
| NanoBanana | $0.010 | Good | Fast |

### Video Generation Costs (per minute)

| Provider | 720p | 1080p | 4K |
|----------|---|---|---|
| Flow | $0.05 | $0.10 | N/A |
| Sora | $0.10 | $0.15 | $0.30 |
| Kling | $0.08 | $0.12 | N/A |
| WHAN | $0.06 | $0.11 | $0.22 |

## API Key Configuration

### Setting Up Providers

1. **Get API Keys**
   - DALL-E: https://platform.openai.com/api-keys
   - Midjourney: https://www.midjourney.com/account/
   - NanoBanana: https://nanobanana.ai/account
   - Sora: https://platform.openai.com/api-keys
   - Kling: https://kling.ai/account
   - WHAN: https://whan.ai/account

2. **Add Keys to Environment**
   ```bash
   DALLE_API_KEY=sk-...
   MIDJOURNEY_API_KEY=mj-...
   NANOBANANA_API_KEY=nb-...
   SORA_API_KEY=sk-...
   KLING_API_KEY=kl-...
   WHAN_API_KEY=wh-...
   ```

3. **Backend Settings UI** (Coming Soon)
   - Navigate to Settings → Providers
   - Add/edit API keys securely
   - Enable/disable providers
   - Set provider priority for fallback

## Using Multi-Provider System

### Frontend: Provider Selection

```typescript
// Select provider for image generation
const { data: image } = trpc.storyboard.generateImage.useMutation({
  onSuccess: (result) => {
    console.log(`Generated with ${result.provider}`, result.url);
  },
});

image.mutate({
  scriptId: "script-123",
  shotNumber: 1,
  provider: "dalle", // or "midjourney", "nanobanana"
  costLimit: 0.05, // Optional: max cost allowed
});
```

### Frontend: Cost Preview

```typescript
// Get cost estimate before generation
const { data: estimate } = trpc.providers.estimateCost.useQuery({
  type: "image",
  provider: "dalle",
  params: { resolution: "1024x1024", quality: "hd" },
});

// Compare costs across providers
const { data: comparison } = trpc.providers.compareProviders.useQuery({
  type: "image",
  params: { resolution: "1024x1024", quality: "hd" },
});
```

### Frontend: Provider Switching UI

```typescript
// Show provider selector in UI
<ProviderSelector
  type="image"
  onSelect={(provider) => {
    generateImage({ provider });
  }}
  showCosts={true}
/>
```

## Backend: Implementing Provider Fallback

```typescript
// Auto-fallback to cheaper provider on error
async function generateImageWithFallback(
  params: ImageGenerationParams,
  userId: string
) {
  const enabledProviders = await ProviderSettingsManager.getEnabledProviders(userId);
  
  for (const config of enabledProviders) {
    try {
      const provider = ImageProviderFactory.createProvider(
        config.provider,
        ProviderSettingsManager.decryptApiKey(config.apiKey),
        config.apiUrl
      );
      return await provider.generateImage(params);
    } catch (error) {
      console.warn(`${config.provider} failed, trying next...`);
      continue;
    }
  }
  
  throw new Error("All image providers failed");
}
```

## Cost Tracking

### Database Schema

```sql
-- Track provider usage and costs
CREATE TABLE provider_usage (
  id VARCHAR(36) PRIMARY KEY,
  userId VARCHAR(36) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  type ENUM('image', 'video') NOT NULL,
  estimatedCost DECIMAL(10, 4),
  actualCost DECIMAL(10, 4),
  duration INT,
  resolution VARCHAR(20),
  status ENUM('pending', 'success', 'failed') DEFAULT 'pending',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completedAt TIMESTAMP,
  INDEX (userId, provider, type)
);
```

### Query Usage Report

```typescript
// Get cost breakdown by provider
const costs = await db
  .select({
    provider: providerUsage.provider,
    totalCost: sql`SUM(${providerUsage.actualCost})`,
    count: sql`COUNT(*)`,
  })
  .from(providerUsage)
  .where(eq(providerUsage.userId, userId))
  .groupBy(providerUsage.provider);
```

## Optimization Strategies

### 1. Cost-Optimized Pipeline
```typescript
// Use cheapest provider for each type
const imageProvider = "nanobanana"; // $0.01 per image
const videoProvider = "whan"; // $0.06-0.22 per minute

// Estimated cost for 10-shot storyboard + 5-second videos:
// Images: 10 × $0.01 = $0.10
// Videos: 10 × 5s/60 × $0.08 = $0.067
// Total: ~$0.17 per storyboard
```

### 2. Quality-Optimized Pipeline
```typescript
// Use best quality providers
const imageProvider = "dalle"; // High quality
const videoProvider = "sora"; // Best acting/movement

// Higher cost but better results
```

### 3. Hybrid Pipeline
```typescript
// Use different providers for different purposes
// Keyframe: DALL-E (high quality, $0.02)
// Variation: NanoBanana (fast, $0.01)
// Video: Kling (fast, $0.08-0.12)
```

## Monitoring & Analytics

### Cost Dashboard

```typescript
// Real-time cost tracking
const costMetrics = {
  totalSpent: "$1,234.56",
  byProvider: {
    dalle: "$456.78",
    nanobanana: "$234.56",
    sora: "$543.22",
  },
  byType: {
    image: "$691.34",
    video: "$543.22",
  },
  averageCostPerStoryboard: "$12.34",
};
```

### Usage Alerts

```typescript
// Alert when approaching budget limit
if (totalCost > budgetLimit * 0.8) {
  notifyOwner({
    title: "Approaching Budget Limit",
    content: `Used ${(totalCost / budgetLimit * 100).toFixed(1)}% of budget`,
  });
}
```

## Troubleshooting

### Provider Quota Exhausted
- Check provider account for remaining credits
- Add billing or upgrade plan
- Switch to alternative provider

### API Key Invalid
- Verify key format
- Check provider documentation
- Regenerate key if needed

### Fallback Not Working
- Ensure at least 2 providers configured
- Check provider priority order
- Verify all providers have valid API keys

## Next Steps

1. **Add Provider Settings UI** - Backend interface for API key management
2. **Implement Cost Preview** - Show estimated costs before generation
3. **Create Usage Dashboard** - Track spending by provider
4. **Add Batch Operations** - Generate multiple items with cost optimization
5. **Implement Auto-Fallback** - Automatic retry with cheaper provider on error

## Support

For issues or questions:
- Check provider documentation
- Review error logs in dev console
- Contact support at https://help.manus.im
