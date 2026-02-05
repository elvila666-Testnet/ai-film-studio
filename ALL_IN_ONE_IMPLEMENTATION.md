# AI Film Studio - All-in-One Suite Implementation Guide

## Overview

This guide provides step-by-step instructions to complete the refactoring of AI Film Studio into a professional All-in-One production suite with Brand Brain and Character Locking.

## Completed: Phase 1 ✅

Database schema updated with:
- `brands` table - Stores brand identity (voice, visual style, color palette, product references)
- `characters` table - Stores character options with master images and lock status
- Updated `storyboardImages` - Now includes `videoUrl` and `characterId` fields
- Migration applied successfully

## Phase 2: Backend Routers (IN PROGRESS)

### Services Created
- `brandManagement.ts` - Brand identity analysis and character generation
- `characterLock.ts` - Character consistency enforcement
- `imageToVideo.ts` - Veo3/Sora integration for image-to-video

### Next: Add tRPC Procedures

Add these procedures to `server/routers.ts`:

```typescript
// Brand Management Router
brands: router({
  // Create or update brand
  save: protectedProcedure
    .input(z.object({
      name: z.string(),
      logoUrl: z.string().optional(),
      productReferenceImages: z.array(z.string()),
      brandVoice: z.string(),
      visualIdentity: z.string(),
      colorPalette: z.object({
        primary: z.string(),
        secondary: z.string(),
        accent: z.string(),
        neutral: z.string(),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      // Save brand to database
      // Return brand ID and analysis
    }),

  // Analyze product images
  analyzeBrand: protectedProcedure
    .input(z.object({
      productImageUrls: z.array(z.string()),
    }))
    .mutation(async ({ input }) => {
      const analysis = await BrandManagementService.analyzeBrandIdentity(
        input.productImageUrls
      );
      return analysis;
    }),

  // List user's brands
  list: protectedProcedure
    .query(async ({ ctx }) => {
      // Return all brands for user
    }),

  // Get brand details
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      // Return brand details
    }),
}),

// Character Management Router
characters: router({
  // Generate character options
  generateOptions: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      brandId: z.number(),
      targetDemographic: z.string(),
      count: z.number().default(4),
    }))
    .mutation(async ({ input }) => {
      // Get brand analysis
      // Generate character options using BrandManagementService
      // Return character options with images
    }),

  // Lock character for project
  lock: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      characterId: z.number(),
    }))
    .mutation(async ({ input }) => {
      // Mark character as locked
      // This character will be used as reference for all storyboard shots
    }),

  // Get locked character
  getLocked: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      // Return the locked character for this project
    }),
}),

// Storyboard Generation with Character Lock
storyboard: router({
  // Generate shot with locked character and product
  generateShot: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      shotNumber: z.number(),
      prompt: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // 1. Get locked character
      // 2. Get brand product reference
      // 3. Build locked prompt using characterLock service
      // 4. Generate image with NanoBanana Pro
      // 5. Save to storyboardImages with characterId
      // 6. Return image URL
    }),

  // Generate all shots with consistency
  generateAll: protectedProcedure
    .input(z.object({
      projectId: z.number(),
    }))
    .mutation(async ({ input }) => {
      // Batch generate all shots with character lock
      // Return progress and all image URLs
    }),
}),

// Video Generation Router
video: router({
  // Animate frame with Image-to-Video
  animateFrame: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      shotNumber: z.number(),
      motionPrompt: z.string(),
      provider: z.enum(["veo3", "sora"]),
      duration: z.number().default(4),
    }))
    .mutation(async ({ input }) => {
      // 1. Get storyboard image for this shot
      // 2. Build motion prompt using characterLock service
      // 3. Call Veo3 or Sora API with image as start frame
      // 4. Save video URL to storyboardImages.videoUrl
      // 5. Return video URL and task ID
    }),

  // Check video generation status
  checkStatus: publicProcedure
    .input(z.object({
      taskId: z.string(),
      provider: z.enum(["veo3", "sora"]),
    }))
    .query(async ({ input }) => {
      // Poll provider API for status
      // Return status and video URL if ready
    }),

  // Generate all videos
  animateAll: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      provider: z.enum(["veo3", "sora"]),
    }))
    .mutation(async ({ input }) => {
      // Batch animate all shots
      // Return progress and all video URLs
    }),
}),
```

### Database Functions Needed

Add to `server/db.ts`:

```typescript
// Brand functions
export async function createBrand(userId: number, brandData: {
  name: string;
  logoUrl?: string;
  productReferenceImages: string[];
  brandVoice: string;
  visualIdentity: string;
  colorPalette: object;
}): Promise<number> {
  // Insert brand and return ID
}

export async function getBrand(id: number) {
  // Get brand by ID
}

export async function getUserBrands(userId: number) {
  // Get all brands for user
}

// Character functions
export async function createCharacter(projectId: number, characterData: {
  name: string;
  description: string;
  imageUrl: string;
  isHero: boolean;
}): Promise<number> {
  // Insert character and return ID
}

export async function lockCharacter(projectId: number, characterId: number) {
  // Mark character as locked for this project
}

export async function getLockedCharacter(projectId: number) {
  // Get the locked character for this project
}

export async function updateStoryboardVideo(
  projectId: number,
  shotNumber: number,
  videoUrl: string
) {
  // Update storyboardImages.videoUrl
}
```

---

## Phase 3: Frontend UI Refactoring

### New Tab Structure

Replace current tabs with:

1. **Brand Intelligence** (replaces Brief)
   - Upload product images
   - Display brand analysis (voice, visual identity, colors)
   - Save brand or select existing brand

2. **Casting & Moodboard** (NEW)
   - Show generated character options
   - Display moodboard collage
   - User selects hero character (locks it)

3. **Storyboard** (Updated)
   - Generate shots with locked character
   - Show character consistency indicators
   - Display generated images

4. **Video Generation** (NEW)
   - "Animate Shot" button on each image
   - Choose provider (Veo3 or Sora)
   - Show video generation progress
   - Display generated videos

### Component Structure

```
client/src/pages/ProjectWorkflow.tsx
├── BrandIntelligenceTab.tsx
│   ├── ProductImageUpload.tsx
│   ├── BrandAnalysisDisplay.tsx
│   └── BrandSelector.tsx
├── CastingMoodboardTab.tsx
│   ├── CharacterOptions.tsx
│   ├── MoodboardDisplay.tsx
│   └── CharacterLockButton.tsx
├── StoryboardTab.tsx (Updated)
│   ├── StoryboardGrid.tsx
│   ├── CharacterConsistencyIndicator.tsx
│   └── GenerateWithLockButton.tsx
└── VideoGenerationTab.tsx (NEW)
    ├── AnimateShotButton.tsx
    ├── ProviderSelector.tsx
    └── VideoPreview.tsx
```

---

## Phase 4: Image-to-Video Integration

### API Integration Steps

1. **Veo3 Integration**
   ```typescript
   // In imageToVideo.ts
   async function generateWithVeo3(request: ImageToVideoRequest) {
     const response = await fetch('https://api.veo.ai/v1/generate', {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${process.env.VEO3_API_KEY}`,
         'Content-Type': 'application/json',
       },
       body: JSON.stringify({
         image_url: request.imageUrl,
         motion_prompt: request.motionPrompt,
         duration: request.duration,
         resolution: request.resolution,
       }),
     });
     // Handle response and return task ID
   }
   ```

2. **Sora 2 Integration**
   ```typescript
   // In imageToVideo.ts
   async function generateWithSora(request: ImageToVideoRequest) {
     const response = await fetch('https://api.openai.com/v1/videos/generations', {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${process.env.SORA_API_KEY}`,
         'Content-Type': 'application/json',
       },
       body: JSON.stringify({
         image_url: request.imageUrl,
         prompt: request.motionPrompt,
         duration: request.duration,
         size: request.resolution,
       }),
     });
     // Handle response and return task ID
   }
   ```

3. **Status Polling**
   ```typescript
   // Poll every 5 seconds until video is ready
   async function pollVideoStatus(taskId: string, provider: string) {
     const maxAttempts = 120; // 10 minutes
     for (let i = 0; i < maxAttempts; i++) {
       const status = await checkVideoStatus(taskId, provider);
       if (status.status === 'completed') {
         return status.videoUrl;
       }
       await new Promise(r => setTimeout(r, 5000)); // Wait 5s
     }
     throw new Error('Video generation timeout');
   }
   ```

---

## Phase 5: Testing & Deployment

### Unit Tests

Create tests for:
- Brand analysis accuracy
- Character lock enforcement
- Image-to-video generation
- Consistency validation

### Integration Tests

Test complete workflows:
- Brand creation → Character generation → Storyboard → Video
- Character lock persistence
- Video generation with locked character

### Manual Testing Checklist

- [ ] Upload product images and verify brand analysis
- [ ] Generate character options and lock one
- [ ] Generate storyboard shots with locked character
- [ ] Animate shots with Veo3
- [ ] Animate shots with Sora
- [ ] Verify character consistency in all outputs
- [ ] Export final animatic with videos

---

## Environment Variables Required

```bash
# Brand & Character Generation
GEMINI_API_KEY=your_key  # For brand analysis

# Video Generation
VEO3_API_KEY=your_key    # For Veo3 video generation
SORA_API_KEY=your_key    # For Sora video generation

# Image Generation (existing)
NANOBANANA_API_KEY=your_key
DALLE_API_KEY=your_key
MIDJOURNEY_API_KEY=your_key
```

---

## Implementation Timeline

- **Phase 2**: 2-3 hours (routers + database functions)
- **Phase 3**: 3-4 hours (UI components + tab refactoring)
- **Phase 4**: 2-3 hours (API integration + polling)
- **Phase 5**: 1-2 hours (testing + validation)

**Total**: ~8-12 hours of development

---

## Support & Debugging

### Common Issues

1. **Character not consistent**
   - Verify character lock is applied
   - Check prompt includes character reference
   - Validate image generation provider supports references

2. **Video generation timeout**
   - Increase polling timeout
   - Check provider API status
   - Verify API keys are valid

3. **Brand analysis fails**
   - Ensure product images are high quality
   - Check Gemini API quota
   - Verify image URLs are accessible

---

## Next Steps

1. Implement Phase 2 routers and database functions
2. Create Phase 3 UI components
3. Integrate Phase 4 video APIs
4. Run comprehensive tests
5. Deploy to production

Good luck with the refactoring! 🚀
