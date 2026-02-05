import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { advancedFeaturesRouter } from "./routers/advancedFeatures";
import { castingRouter } from "./routers/casting";
import { storyboardCharacterRouter } from "./routers/storyboardCharacter";
import { createProject, getUserProjects, getProject, getProjectContent, updateProjectContent, deleteProject, getStoryboardImages, saveStoryboardImage, getReferenceImages, saveReferenceImage, deleteReferenceImage, getGeneratedVideos, createGeneratedVideo, updateGeneratedVideo, createEditorProject, getEditorProjectsByProjectId, getEditorClips, createEditorClip, updateEditorClip, deleteEditorClip, createEditorTrack, getEditorTracks, createEditorExport, getEditorExports, updateEditorExport, createComment, getClipComments, updateComment, deleteComment, getAnimaticConfig, saveAnimaticConfig, updateFrameDurations, updateAnimaticAudio, getStoryboardFrameOrder, updateFrameOrder, getFrameHistory, createFrameHistoryVersion, getFrameNotes, saveFrameNotes, deleteFrameNotes, createBrand, getBrand, getUserBrands, updateBrand, deleteBrand, createCharacter, getCharacter, getProjectCharacters, getLockedCharacter, lockCharacter, unlockAllCharacters, updateCharacter, deleteCharacter, updateStoryboardVideo } from "./db";
import { protectedProcedure } from "./_core/trpc";

export const appRouter = router({
  system: systemRouter,
  advancedFeatures: advancedFeaturesRouter,
  casting: castingRouter,
  storyboardCharacter: storyboardCharacterRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  projects: router({
    list: publicProcedure.query(async ({ ctx }) => {
      if (!ctx.user) return [];
      return getUserProjects(ctx.user.id);
    }),
    
    create: publicProcedure
      .input(z.object({ name: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const projectId = await createProject(ctx.user.id, input.name);
        return { id: projectId, name: input.name };
      }),
    
    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const project = await getProject(input.id);
        const content = await getProjectContent(input.id);
        return { project, content };
      }),
    
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        await deleteProject(input.id);
        return { success: true };
      }),
    
    updateContent: publicProcedure
      .input(z.object({ 
        projectId: z.number(),
        brief: z.string().optional(),
        script: z.string().optional(),
        masterVisual: z.string().optional(),
        technicalShots: z.string().optional(),
        storyboardPrompts: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const { projectId, ...data } = input;
        await updateProjectContent(projectId, data);
        return { success: true };
      }),
  }),

  storyboard: router({
    getImages: publicProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return getStoryboardImages(input.projectId);
      }),
    
    saveImage: publicProcedure
      .input(z.object({ 
        projectId: z.number(),
        shotNumber: z.number(),
        imageUrl: z.string(),
        prompt: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        await saveStoryboardImage(input.projectId, input.shotNumber, input.imageUrl, input.prompt);
        return { success: true };
      }),
    
    extractCharacters: publicProcedure
      .input(z.object({ script: z.string() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const { analyzeScriptForCharacters, getCharacterStatistics } = await import("./services/scriptParser");
        const characters = await analyzeScriptForCharacters(input.script);
        const stats = getCharacterStatistics(input.script);
        return { characters, stats };
      }),
  }),

  ai: router({
    generateScript: publicProcedure
      .input(z.object({ brief: z.string(), projectId: z.number().optional(), brandId: z.number().optional() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const { isDevModeEnabled } = await import("./_core/devMode");
        const { getMockScript, mockLLMResponse } = await import("./services/mockData");
        
        if (isDevModeEnabled()) {
          return mockLLMResponse(getMockScript("default"), 1500);
        }
        
        // If brandId provided, use brand-compliant generation
        if (input.brandId) {
          const { generateBrandAlignedScript } = await import("./services/brandCompliantGeneration");
          const { getBrand } = await import("./db");
          const brand = await getBrand(input.brandId);
          if (!brand) throw new Error("Brand not found");
          const brandGuidelines = {
            id: brand.id,
            name: brand.name,
            targetCustomer: brand.targetCustomer ?? undefined,
            aesthetic: brand.aesthetic ?? undefined,
            mission: brand.mission ?? undefined,
            coreMessaging: brand.coreMessaging ?? undefined,
          };
          return generateBrandAlignedScript(brandGuidelines, input.brief);
        }
        
        const { generateScriptFromBrief } = await import("./services/aiGeneration");
        return generateScriptFromBrief(input.brief);
      }),
    
    refineScript: publicProcedure
      .input(z.object({ script: z.string(), notes: z.string(), brandId: z.number().optional() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const { isDevModeEnabled } = await import("./_core/devMode");
        const { getMockScript, mockLLMResponse } = await import("./services/mockData");
        
        if (isDevModeEnabled()) {
          const refined = `${input.script}\n\n## Refinements Applied\n${input.notes}`;
          return mockLLMResponse(refined, 1000);
        }
        
        // If brandId provided, use brand-compliant refinement
        if (input.brandId) {
          const { refineBrandAlignedScript } = await import("./services/brandCompliantGeneration");
          const { getBrand } = await import("./db");
          const brand = await getBrand(input.brandId);
          if (!brand) throw new Error("Brand not found");
          const brandGuidelines = {
            id: brand.id,
            name: brand.name,
            targetCustomer: brand.targetCustomer ?? undefined,
            aesthetic: brand.aesthetic ?? undefined,
            mission: brand.mission ?? undefined,
            coreMessaging: brand.coreMessaging ?? undefined,
          };
          return refineBrandAlignedScript(brandGuidelines, input.script, input.notes);
        }
        
        const { refineScriptWithNotes } = await import("./services/aiGeneration");
        return refineScriptWithNotes(input.script, input.notes);
      }),
    
    generateVisualStyle: publicProcedure
      .input(z.object({ script: z.string(), brandId: z.number().optional() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const { isDevModeEnabled } = await import("./_core/devMode");
        const { getMockVisualStyle, mockLLMResponse } = await import("./services/mockData");
        
        if (isDevModeEnabled()) {
          return mockLLMResponse(getMockVisualStyle(), 1500);
        }
        
        // If brandId provided, use brand-compliant generation
        if (input.brandId) {
          const { generateBrandAlignedVisualStyle } = await import("./services/brandCompliantGeneration");
          const { getBrand } = await import("./db");
          const brand = await getBrand(input.brandId);
          if (!brand) throw new Error("Brand not found");
          const brandGuidelines = {
            id: brand.id,
            name: brand.name,
            targetCustomer: brand.targetCustomer ?? undefined,
            aesthetic: brand.aesthetic ?? undefined,
            mission: brand.mission ?? undefined,
            coreMessaging: brand.coreMessaging ?? undefined,
          };
          return generateBrandAlignedVisualStyle(brandGuidelines, input.script);
        }
        
        const { generateMasterVisualStyle } = await import("./services/aiGeneration");
        return generateMasterVisualStyle(input.script);
      }),
    
    refineVisualStyle: publicProcedure
      .input(z.object({ visualStyle: z.string(), notes: z.string(), brandId: z.number().optional() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const { isDevModeEnabled } = await import("./_core/devMode");
        const { mockLLMResponse } = await import("./services/mockData");
        
        if (isDevModeEnabled()) {
          const refined = `${input.visualStyle}\n\n## Refinements Applied\n${input.notes}`;
          return mockLLMResponse(refined, 1500);
        }
        
        // If brandId provided, use brand-compliant refinement
        if (input.brandId) {
          const { refineBrandAlignedVisualStyle } = await import("./services/brandCompliantGeneration");
          const { getBrand } = await import("./db");
          const brand = await getBrand(input.brandId);
          if (!brand) throw new Error("Brand not found");
          const brandGuidelines = {
            id: brand.id,
            name: brand.name,
            targetCustomer: brand.targetCustomer ?? undefined,
            aesthetic: brand.aesthetic ?? undefined,
            mission: brand.mission ?? undefined,
            coreMessaging: brand.coreMessaging ?? undefined,
          };
          return refineBrandAlignedVisualStyle(brandGuidelines, input.visualStyle, input.notes);
        }
        
        const { refineMasterVisualStyle } = await import("./services/aiGeneration");
        return refineMasterVisualStyle(input.visualStyle, input.notes);
      }),
    
    generateTechnicalShots: publicProcedure
      .input(z.object({ script: z.string(), visualStyle: z.string(), brandId: z.number().optional() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const { isDevModeEnabled } = await import("./_core/devMode");
        const { getMockTechnicalShots, mockLLMResponse } = await import("./services/mockData");
        
        if (isDevModeEnabled()) {
          return mockLLMResponse(JSON.stringify(getMockTechnicalShots(), null, 2), 1500);
        }
        
        // If brandId provided, use brand-compliant storyboard generation
        if (input.brandId) {
          const { generateBrandAlignedStoryboardPrompt } = await import("./services/brandCompliantGeneration");
          const { getBrand } = await import("./db");
          const brand = await getBrand(input.brandId);
          if (!brand) throw new Error("Brand not found");
          const brandGuidelines = {
            id: brand.id,
            name: brand.name,
            targetCustomer: brand.targetCustomer ?? undefined,
            aesthetic: brand.aesthetic ?? undefined,
            mission: brand.mission ?? undefined,
            coreMessaging: brand.coreMessaging ?? undefined,
          };
          return generateBrandAlignedStoryboardPrompt(brandGuidelines, input.script, input.visualStyle);
        }
        
        const { generateTechnicalShots } = await import("./services/aiGeneration");
        return generateTechnicalShots(input.script, input.visualStyle);
      }),
    
    generateImagePrompt: publicProcedure
      .input(z.object({ 
        shot: z.object({ 
          shot: z.number(),
          tipo_plano: z.string(),
          accion: z.string(),
          intencion: z.string(),
        }),
        visualStyle: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const { generateImagePromptForShot } = await import("./services/aiGeneration");
        return generateImagePromptForShot(input.shot, input.visualStyle);
      }),
    
    refineImagePrompt: publicProcedure
      .input(z.object({ prompt: z.string(), notes: z.string() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const { refineImagePrompt } = await import("./services/aiGeneration");
        return refineImagePrompt(input.prompt, input.notes);
      }),
    
    generateStoryboardImage: publicProcedure
      .input(z.object({ prompt: z.string(), characterReference: z.record(z.string(), z.string()).optional(), variationIndex: z.number().optional() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const { generateStoryboardImageVariation, generateStoryboardImageWithConsistency } = await import("./services/aiGeneration");
        const charRef = input.characterReference as Record<string, string> | undefined;
        if (input.variationIndex !== undefined && charRef) {
          return generateStoryboardImageVariation(input.prompt, charRef, input.variationIndex);
        }
        return generateStoryboardImageWithConsistency(input.prompt, charRef);
      }),
  }),

  referenceImages: router({
    list: publicProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return getReferenceImages(input.projectId);
      }),
    
    upload: publicProcedure
      .input(z.object({ projectId: z.number(), imageUrl: z.string(), description: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        await saveReferenceImage(input.projectId, input.imageUrl, input.description);
        return { success: true };
      }),
    
    delete: publicProcedure
      .input(z.object({ imageId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        await deleteReferenceImage(input.imageId);
        return { success: true };
      }),
  }),

  video: router({
    list: publicProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return getGeneratedVideos(input.projectId);
      }),
    
    create: publicProcedure
      .input(z.object({ projectId: z.number(), provider: z.enum(["veo3", "sora"]) }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        await createGeneratedVideo(input.projectId, input.provider);
        return { success: true };
      }),
    
    updateStatus: publicProcedure
      .input(z.object({ videoId: z.number(), status: z.string().optional(), videoUrl: z.string().optional(), taskId: z.string().optional(), error: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const { videoId, ...updates } = input;
        await updateGeneratedVideo(videoId, updates);
        return { success: true };
      }),
   }),

  editor: router({
    projects: router({
      create: publicProcedure
        .input(z.object({ projectId: z.number(), title: z.string().min(1), description: z.string().optional(), fps: z.number().default(24), resolution: z.string().default("1920x1080") }))
        .mutation(async ({ input, ctx }) => {
          if (!ctx.user) throw new Error("Unauthorized");
          const result = await createEditorProject(input.projectId, {
            projectId: input.projectId,
            title: input.title,
            description: input.description,
            fps: input.fps,
            resolution: input.resolution,
          } as any);
          return { success: true, editorProjectId: (result as any).insertId || 0 };
        }),
      
      list: publicProcedure
        .input(z.object({ projectId: z.number() }))
        .query(async ({ input }) => {
          return getEditorProjectsByProjectId(input.projectId);
        }),
    }),

    clips: router({
      list: publicProcedure
        .input(z.object({ editorProjectId: z.number() }))
        .query(async ({ input }) => {
          return getEditorClips(input.editorProjectId);
        }),
      
      upload: publicProcedure
        .input(z.object({
          editorProjectId: z.number(),
          trackId: z.number(),
          fileUrl: z.string(),
          fileName: z.string(),
          fileType: z.enum(["video", "audio", "image"]),
          duration: z.number(),
          order: z.number(),
        }))
        .mutation(async ({ input, ctx }) => {
          if (!ctx.user) throw new Error("Unauthorized");
          const result = await createEditorClip({
            editorProjectId: input.editorProjectId,
            trackId: input.trackId,
            fileUrl: input.fileUrl,
            fileName: input.fileName,
            fileType: input.fileType,
            duration: input.duration,
            order: input.order,
          });
          return { success: true, clipId: (result as any).insertId || 0 };
        }),
      
      update: publicProcedure
        .input(z.object({
          clipId: z.number(),
          trimStart: z.number().optional(),
          trimEnd: z.number().optional(),
          volume: z.number().optional(),
          startTime: z.number().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
          if (!ctx.user) throw new Error("Unauthorized");
          const { clipId, ...updates } = input;
          await updateEditorClip(clipId, updates);
          return { success: true };
        }),
      
      delete: publicProcedure
        .input(z.object({ clipId: z.number() }))
        .mutation(async ({ input, ctx }) => {
          if (!ctx.user) throw new Error("Unauthorized");
          await deleteEditorClip(input.clipId);
          return { success: true };
        }),
      
      updatePosition: publicProcedure
        .input(z.object({
          clipId: z.number(),
          startTime: z.number(),
        }))
        .mutation(async ({ input, ctx }) => {
          if (!ctx.user) throw new Error("Unauthorized");
          await updateEditorClip(input.clipId, { startTime: input.startTime });
          return { success: true };
        }),
      
      batchUpdatePositions: publicProcedure
        .input(z.object({
          updates: z.array(z.object({
            clipId: z.number(),
            startTime: z.number(),
          })),
        }))
        .mutation(async ({ input, ctx }) => {
          if (!ctx.user) throw new Error("Unauthorized");
          for (const update of input.updates) {
            await updateEditorClip(update.clipId, { startTime: update.startTime });
          }
          return { success: true, count: input.updates.length };
        }),
    }),

    tracks: router({
      list: publicProcedure
        .input(z.object({ editorProjectId: z.number() }))
        .query(async ({ input }) => {
          return getEditorTracks(input.editorProjectId);
        }),
      
      create: publicProcedure
        .input(z.object({ editorProjectId: z.number(), trackType: z.enum(["video", "audio"]), trackNumber: z.number(), name: z.string().optional() }))
        .mutation(async ({ input, ctx }) => {
          if (!ctx.user) throw new Error("Unauthorized");
          const result = await createEditorTrack({
            editorProjectId: input.editorProjectId,
            trackType: input.trackType,
            trackNumber: input.trackNumber,
            name: input.name,
          });
          return { success: true, trackId: (result as any).insertId || 0 };
        }),
    }),

    export: router({
      list: publicProcedure
        .input(z.object({ editorProjectId: z.number() }))
        .query(async ({ input }) => {
          return getEditorExports(input.editorProjectId);
        }),
      
      create: publicProcedure
        .input(z.object({ editorProjectId: z.number(), format: z.enum(["mp4", "webm", "mov", "mkv"]), quality: z.enum(["720p", "1080p", "4k"]).default("1080p") }))
        .mutation(async ({ input, ctx }) => {
          if (!ctx.user) throw new Error("Unauthorized");
          const result = await createEditorExport({
            editorProjectId: input.editorProjectId,
            format: input.format,
            quality: input.quality,
            status: "pending",
          });
          return { success: true, exportId: (result as any).insertId || 0 };
        }),
      
      updateStatus: publicProcedure
        .input(z.object({ exportId: z.number(), status: z.string().optional(), exportUrl: z.string().optional(), error: z.string().optional() }))
        .mutation(async ({ input, ctx }) => {
          if (!ctx.user) throw new Error("Unauthorized");
          const { exportId, ...updates } = input;
          await updateEditorExport(exportId, updates);
          return { success: true };
        }),
    }),

    comments: router({
      list: publicProcedure
        .input(z.object({ clipId: z.number() }))
        .query(async ({ input }) => {
          return getClipComments(input.clipId);
        }),
      
      create: publicProcedure
        .input(z.object({ clipId: z.number(), content: z.string(), timestamp: z.number().optional() }))
        .mutation(async ({ input, ctx }) => {
          if (!ctx.user) throw new Error("Unauthorized");
          await createComment({
            clipId: input.clipId,
            userId: ctx.user.id,
            content: input.content,
            timestamp: input.timestamp || 0,
          });
          return { success: true };
        }),
      
      update: publicProcedure
        .input(z.object({ commentId: z.number(), content: z.string().optional(), resolved: z.boolean().optional() }))
        .mutation(async ({ input, ctx }) => {
          if (!ctx.user) throw new Error("Unauthorized");
          const { commentId, ...updates } = input;
          await updateComment(commentId, updates);
          return { success: true };
        }),
      
      delete: publicProcedure
        .input(z.object({ commentId: z.number() }))
        .mutation(async ({ input, ctx }) => {
          if (!ctx.user) throw new Error("Unauthorized");
          await deleteComment(input.commentId);
          return { success: true };
        }),
    }),

    populateFromStoryboard: publicProcedure
      .input(z.object({ projectId: z.number(), editorProjectId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const storyboardImages = await getStoryboardImages(input.projectId);
        const editorClipsToCreate = storyboardImages.map((img, index) => ({
          editorProjectId: input.editorProjectId,
          trackId: 1,
          fileUrl: img.imageUrl,
          fileName: `Storyboard Frame ${index + 1}`,
          fileType: "image" as const,
          duration: 2000,
          startTime: index * 2000,
          order: index + 1,
        }));
        
        for (const clip of editorClipsToCreate) {
          await createEditorClip(clip);
        }
        
        return { success: true, clipsCreated: editorClipsToCreate.length };
      }),

    exportAnimatic: publicProcedure
      .input(z.object({ projectId: z.number(), durationPerFrame: z.number().default(2), fps: z.number().default(24), resolution: z.string().default("1920x1080"), audioUrl: z.string().optional(), audioVolume: z.number().default(100), frameDurations: z.record(z.string(), z.number()).optional() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const { projectId, durationPerFrame, fps, resolution, audioUrl, audioVolume, frameDurations } = input;
        const storyboardImages = await getStoryboardImages(projectId);
        
        if (storyboardImages.length === 0) {
          throw new Error("No storyboard images found for this project");
        }
        
        const sortedImages = storyboardImages.sort((a, b) => a.shotNumber - b.shotNumber);
        const imageUrls = sortedImages.map(img => img.imageUrl);
        
        const parsedFrameDurations = frameDurations ? Object.entries(frameDurations).reduce((acc, [k, v]) => ({ ...acc, [parseInt(k)]: v }), {} as Record<number, number>) : undefined;
        
        const { videoEditorService } = await import("./services/videoEditor");
        const localVideoPath = await videoEditorService.createAnimatic(imageUrls, durationPerFrame, fps, resolution, audioUrl, audioVolume, parsedFrameDurations);
        
        const { storagePut } = await import("./storage");
        const fs = await import("fs/promises");
        const fileBuffer = await fs.readFile(localVideoPath);
        const { url: videoUrl } = await storagePut(`animatic/${projectId}-${Date.now()}.mp4`, fileBuffer, "video/mp4");
        
        await fs.unlink(localVideoPath).catch(() => {});
        
        return { success: true, videoUrl };
      }),

    getAnimaticConfig: publicProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return await getAnimaticConfig(input.projectId);
      }),

    saveAnimaticConfig: publicProcedure
      .input(z.object({ projectId: z.number(), frameDurations: z.record(z.string(), z.number()).optional(), audioUrl: z.string().optional(), audioVolume: z.number().optional() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const { projectId, frameDurations, audioUrl, audioVolume } = input;
        if (frameDurations) {
          const parsed = Object.entries(frameDurations).reduce((acc, [k, v]) => ({ ...acc, [parseInt(k)]: v }), {} as Record<number, number>);
          await updateFrameDurations(projectId, parsed);
        }
        if (audioUrl !== undefined) {
          await updateAnimaticAudio(projectId, audioUrl, audioVolume ?? 100);
        }
        return { success: true };
      }),

    getFrameOrder: publicProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return await getStoryboardFrameOrder(input.projectId);
      }),

    updateFrameOrder: publicProcedure
      .input(z.object({ projectId: z.number(), frameOrders: z.array(z.object({ shotNumber: z.number(), displayOrder: z.number() })) }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        await updateFrameOrder(input.projectId, input.frameOrders);
        return { success: true };
      }),

    getFrameHistory: publicProcedure
      .input(z.object({ projectId: z.number(), shotNumber: z.number() }))
      .query(async ({ input }) => {
        return await getFrameHistory(input.projectId, input.shotNumber);
      }),

    createFrameVersion: publicProcedure
      .input(z.object({ projectId: z.number(), shotNumber: z.number(), imageUrl: z.string(), prompt: z.string(), notes: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        await createFrameHistoryVersion(input.projectId, input.shotNumber, input.imageUrl, input.prompt, input.notes);
        return { success: true };
      }),

    getFrameNotes: publicProcedure
      .input(z.object({ projectId: z.number(), shotNumber: z.number() }))
      .query(async ({ input }) => {
        return await getFrameNotes(input.projectId, input.shotNumber);
      }),

    saveFrameNotes: publicProcedure
      .input(z.object({ projectId: z.number(), shotNumber: z.number(), notes: z.string(), metadata: z.record(z.string(), z.any()).optional() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        await saveFrameNotes(input.projectId, input.shotNumber, input.notes, input.metadata);
        return { success: true };
      }),

    deleteFrameNotes: publicProcedure
      .input(z.object({ projectId: z.number(), shotNumber: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        await deleteFrameNotes(input.projectId, input.shotNumber);
        return { success: true };
      }),
  }),

  // ============================================================================
  // BRAND MANAGEMENT ROUTER
  // ============================================================================
  brands: router({
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        targetCustomer: z.string().optional(),
        aesthetic: z.string().optional(),
        mission: z.string().optional(),
        coreMessaging: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const brandId = await createBrand(
          ctx.user.id,
          input.name,
          input.targetCustomer,
          input.aesthetic,
          input.mission,
          input.coreMessaging
        );
        return { success: true, brandId };
      }),

    list: protectedProcedure
      .query(async ({ ctx }) => {
        return getUserBrands(ctx.user.id);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getBrand(input.id);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        targetCustomer: z.string().optional(),
        aesthetic: z.string().optional(),
        mission: z.string().optional(),
        coreMessaging: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateBrand(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteBrand(input.id);
        return { success: true };
      }),
  }),

  // ============================================================================
  // CHARACTER MANAGEMENT ROUTER
  // ============================================================================
  characters: router({
    create: publicProcedure
      .input(z.object({
        projectId: z.number(),
        name: z.string().min(1),
        description: z.string(),
        imageUrl: z.string(),
        isHero: z.boolean().default(false),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const characterId = await createCharacter(input.projectId, input);
        return { success: true, characterId };
      }),

    list: publicProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return getProjectCharacters(input.projectId);
      }),

    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getCharacter(input.id);
      }),

    getLocked: publicProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return getLockedCharacter(input.projectId);
      }),

    lock: publicProcedure
      .input(z.object({
        projectId: z.number(),
        characterId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        await lockCharacter(input.projectId, input.characterId);
        return { success: true };
      }),

    unlock: publicProcedure
      .input(z.object({ projectId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        await unlockAllCharacters(input.projectId);
        return { success: true };
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        imageUrl: z.string().optional(),
        isHero: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const { id, ...data } = input;
        await updateCharacter(id, data);
        return { success: true };
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        await deleteCharacter(input.id);
        return { success: true };
      }),
  }),

  // ============================================================================
  // VIDEO GENERATION ROUTER
  // ============================================================================
  videoGeneration: router({
    animateFrame: publicProcedure
      .input(z.object({
        projectId: z.number(),
        shotNumber: z.number(),
        motionPrompt: z.string(),
        provider: z.enum(["veo3", "sora"]),
        duration: z.number().default(4),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        // TODO: Implement image-to-video generation
        // 1. Get storyboard image
        // 2. Get locked character reference
        // 3. Build motion prompt with character constraints
        // 4. Call Veo3 or Sora API
        // 5. Save video URL to database
        return { success: true, videoUrl: "", taskId: "" };
      }),

    checkStatus: publicProcedure
      .input(z.object({
        taskId: z.string(),
        provider: z.enum(["veo3", "sora"]),
      }))
      .query(async ({ input }) => {
        // TODO: Poll provider API for status
        return { status: "pending", videoUrl: "" };
      }),
  }),
});
export type AppRouter = typeof appRouter;
