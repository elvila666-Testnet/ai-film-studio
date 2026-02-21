
import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { analyzeScriptForCharacters } from "../services/scriptParser";

export const scriptRouter = router({
    generate: publicProcedure
        .input(
            z.object({
                topic: z.string(),
                genre: z.string().optional(),
                style: z.string().optional(),
            })
        )
        .mutation(async ({ input }) => {
            const { topic, genre = "Cinematic", style = "Realistic" } = input;

            const prompt = `Write a movie script about: ${topic}.
      Genre: ${genre}
      Visual Style: ${style}
      
      Format the output as a standard screenplay with Scene Headings, Action, and Dialogue.
      Keep it under 3 minutes of screen time.`;

            try {
                const response = await invokeLLM({
                    messages: [{ role: "user", content: prompt }]
                });

                const scriptContent = (response.choices?.[0]?.message?.content || "") as string;

                // Analyze characters immediately
                const characters = await analyzeScriptForCharacters(scriptContent);

                return {
                    script: scriptContent,
                    characters,
                    metadata: {
                        topic,
                        genre,
                        style
                    }
                };
            } catch (error: unknown) {
                throw new Error(`Script generation failed: ${error.message}`);
            }
        }),

    analyze: publicProcedure
        .input(z.object({ script: z.string() }))
        .mutation(async ({ input }) => {
            const characters = await analyzeScriptForCharacters(input.script);
            return { characters };
        }),
});
