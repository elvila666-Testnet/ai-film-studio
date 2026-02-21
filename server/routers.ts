import { storyboardRouter } from "./routers/storyboardRouter";
import { aiRouter } from "./routers/aiRouter";
import { referenceImagesRouter } from "./routers/referenceImagesRouter";
import { editorRouter } from "./routers/editorRouter";
import { charactersRouter } from "./routers/charactersRouter";
import { z } from "zod";
console.log("FORCE REBUILD: GEMINI NATIVE REST + NANOBANANA REPLICATE - " + Date.now());
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { advancedFeaturesRouter } from "./routers/advancedFeatures";
import { castingRouter } from "./routers/casting";
import { storyboardCharacterRouter } from "./routers/storyboardCharacter";
import { modelRouter } from "./routers/models";
import { getStoryboardImages, saveStoryboardImage, getReferenceImages, saveReferenceImage, deleteReferenceImage, createEditorProject, getEditorProjectsByProjectId, getEditorClips, createEditorClip, updateEditorClip, deleteEditorClip, createEditorTrack, getEditorTracks, createEditorExport, getEditorExports, updateEditorExport, createComment, getClipComments, updateComment, deleteComment, getAnimaticConfig, updateFrameDurations, updateAnimaticAudio, getStoryboardFrameOrder, updateFrameOrder, getFrameHistory, createFrameHistoryVersion, getFrameNotes, saveFrameNotes, deleteFrameNotes, createCharacter, getCharacter, getProjectCharacters, getLockedCharacter, lockCharacter, unlockAllCharacters, updateCharacter, deleteCharacter, getProjectContent } from "./db";
import { protectedProcedure } from "./_core/trpc";

import { adminRouter } from "./routers/admin";
import { videoRouter } from "./routers/video";
import { projectRouter } from "./src/routers/project";
import { directorRouter } from "./src/routers/director";
import { generatorRouter } from "./src/routers/generator";
import { finopsRouter } from "./src/routers/finops";
import { audioRouter } from "./src/routers/audio";
import { scriptRouter } from "./src/routers/script";
import { brandRouter } from "./routers/brandRouter";

export const appRouter = router({
  system: systemRouter,
  admin: adminRouter,
  advancedFeatures: advancedFeaturesRouter,
  casting: castingRouter,
  storyboardCharacter: storyboardCharacterRouter,
  models: modelRouter,
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

  projects: projectRouter,
  director: directorRouter,
  generator: generatorRouter,
  finops: finopsRouter,
  audio: audioRouter,
  script: scriptRouter,
  video: videoRouter,
  brand: brandRouter,

  storyboard: storyboardRouter,

  ai: aiRouter,

  referenceImages: referenceImagesRouter,

  // REMOVED INLINE VIDEO ROUTER - USING centralized videoRouter instead

  editor: editorRouter,

  characters: charactersRouter,

  // ============================================================================
  // VIDEO GENERATION ROUTER
  // ============================================================================
  // REMOVED DUPLICATIVE VIDEO ROUTER
});
export type AppRouter = typeof appRouter;
