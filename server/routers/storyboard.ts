
import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";

export const storyboardRouter = router({
    generate: publicProcedure
        .input(z.object({
            script: z.string(),
            visualStyle: z.string().optional()
        }))
        .mutation(async ({ input }) => {
            // Placeholder for storyboard generation
            // In a real implementation, this would call an image generation service for each scene
            const prompt = `Create a list of 5 key visual scenes for this script:
      ${input.script.substring(0, 1000)}...
      
      Style: ${input.visualStyle || "Cinematic"}
      
      Return as a JSON array of objects with "description" and "camera_angle".`;

            try {
                const response = await invokeLLM({
                    messages: [{ role: "user", content: prompt }]
                });

                return {
                    scenes: response.choices?.[0]?.message?.content || "[]"
                };
            } catch (error: any) {
                throw new Error(`Storyboard generation failed: ${error.message}`);
            }
        }),
});
