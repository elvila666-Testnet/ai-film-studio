import { storyboardRouter } from "./routers/storyboard";
import { aiRouter } from "./routers/aiRouter";
import { referenceImagesRouter } from "./routers/referenceImagesRouter";
import { editorRouter } from "./routers/editorRouter";
import { charactersRouter } from "./routers/charactersRouter";
console.log("FORCE REBUILD: GEMINI NATIVE REST + NANOBANANA REPLICATE - " + Date.now());
import { COOKIE_NAME } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { advancedFeaturesRouter } from "./routers/advancedFeatures";
import { castingRouter } from "./routers/casting";
import { storyboardCharacterRouter } from "./routers/storyboardCharacter";
import { modelRouter } from "./routers/models";


import { adminRouter } from "./routers/admin";
import { videoRouter } from "./routers/video";
import { projectRouter } from "./routers/project";
import { directorRouter } from "./routers/director";
import { generatorRouter } from "./routers/generator";
import { finopsRouter } from "./routers/finops";
import { audioRouter } from "./routers/audio";
import { scriptRouter } from "./routers/script";
import { brandRouter } from "./routers/brandRouter";
import { storyboardAgentRouter } from "./routers/storyboardAgent";
import { scriptWriterRouter } from "./routers/scriptWriter";
import { directorRouter as directorV2Router } from "./routers/directorNew";
import { promptEngineerRouter } from "./routers/promptEngineer";
import { shootingRouter } from "./routers/shooting";
import { productionDesignRouter } from "./routers/productionDesign";
import { shotDesignerRouter } from "./routers/shotDesigner";

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
  brands: brandRouter, // Compatibility alias

  storyboard: storyboardRouter,
  storyboardAgent: storyboardAgentRouter,

  // ─── New Pipeline Agents ──────────────────────────────────
  scriptWriter: scriptWriterRouter,
  directorV2: directorV2Router,
  directorNew: directorV2Router, // Compatibility alias for updateShotFeedback
  promptEngineer: promptEngineerRouter,
  shooting: shootingRouter,

  ai: aiRouter,

  referenceImages: referenceImagesRouter,

  // REMOVED INLINE VIDEO ROUTER - USING centralized videoRouter instead

  editor: editorRouter,

  characters: charactersRouter,
  productionDesign: productionDesignRouter,
  shotDesigner: shotDesignerRouter,

  // ============================================================================
  // VIDEO GENERATION ROUTER
  // ============================================================================
  // REMOVED DUPLICATIVE VIDEO ROUTER
});
export type AppRouter = typeof appRouter;
