const fs = require('fs');

function replaceInFile(filePath, replacements) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;

    for (const { from, to } of replacements) {
        if (typeof from === 'string') {
            content = content.replace(new RegExp(escapeRegExp(from), 'g'), to);
        } else {
            content = content.replace(from, to);
        }
    }

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`Updated ${filePath}`);
    }
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const files = [
    'd:/ai-film-studio/server/routers/storyboardRouter.ts',
    'd:/ai-film-studio/server/routers/video.ts',
    'd:/ai-film-studio/server/routers/script.ts',
    'd:/ai-film-studio/server/routers/models.ts',
    'd:/ai-film-studio/server/routers/costAndComparison.ts',
    'd:/ai-film-studio/server/routers/editorRouter.ts',
    'd:/ai-film-studio/server/routers/casting.ts',
    'd:/ai-film-studio/server/routers/characterArchetype.ts',
    'd:/ai-film-studio/server/routers/aiRouter.ts',
    'd:/ai-film-studio/server/routers/advancedFeaturesRouter.ts',

    'd:/ai-film-studio/server/services/visualStyleGuideGenerator.ts',
    'd:/ai-film-studio/server/services/soraGeneration.ts',
    'd:/ai-film-studio/server/services/scriptParser.ts',
    'd:/ai-film-studio/server/services/providers/replicateProvider.ts',
    'd:/ai-film-studio/server/services/frameDescriptor.ts',
    'd:/ai-film-studio/server/services/imageToVideo.ts',
    'd:/ai-film-studio/server/services/epidemicSoundIntegration.ts',
    'd:/ai-film-studio/server/services/characterSuggestion.ts',
    'd:/ai-film-studio/server/services/characterArchetypeGenerator.ts',
    'd:/ai-film-studio/server/services/castingService.ts',
    'd:/ai-film-studio/server/services/batchProcessing.ts',
    'd:/ai-film-studio/server/services/aiGeneration.ts',
];

for (const file of files) {
    replaceInFile(file, [
        { from: 'catch (error: any)', to: 'catch (error: unknown)' },
        { from: 'v: any', to: 'v: { id: number; projectId: number; status: string; videoUrl?: string }' },
        { from: 'f: any', to: 'f: { modelConfigId: number }' },
        { from: 'model: any', to: 'model: { id: number }' },
        { from: '({ input }: any) =>', to: '({ input }) =>' },
        { from: '({ input: _input }: any) =>', to: '({ input: _input }) =>' },
        { from: '({ input, ctx }: any) =>', to: '({ input, ctx }) =>' },
        { from: '({ input: _input, ctx }: any) =>', to: '({ input: _input, ctx }) =>' },
        { from: '({ input: _input, ctx: _ctx }: any) =>', to: '({ input: _input, ctx: _ctx }) =>' },
        { from: '(img: any, index: any) =>', to: '(img: { imageUrl: string }, index: number) =>' },
        { from: '(s: any) => s.id', to: '(s: { id: number }) => s.id' },
        { from: '(s: any) => s.sceneId === scene.id', to: '(s: { sceneId: number }) => s.sceneId === scene.id' },
        { from: '(g: any) => g.shotId === shot.id', to: '(g: { shotId: number, imageUrl?: string }) => g.shotId === shot.id' },
        { from: '(c: any) => input.characterIds?.includes(c.id)', to: '(c: { id: number }) => input.characterIds?.includes(c.id)' },
        { from: '(c: any) => {', to: '(c: { id: number }) => {' },
        { from: '(shot: any) =>', to: '(shot: { id: number; visualDescription: string }) =>' },
        { from: 'data: any', to: 'data: Record<string, unknown>' },
        { from: '_flowResult: any', to: '_flowResult: unknown' },
        { from: '_soraResult: any', to: '_soraResult: unknown' },
        { from: '(a: any, b: any) => b.appearances - a.appearances', to: '(a: { appearances: number }, b: { appearances: number }) => b.appearances - a.appearances' },
        { from: 'const input: any = {', to: 'const input: Record<string, unknown> = {' },
        { from: 'flowOutput?: any', to: 'flowOutput?: unknown' },
        { from: 'soraOutput?: any', to: 'soraOutput?: unknown' },
        { from: 'flowConsistency?: any', to: 'flowConsistency?: unknown' },
        { from: 'soraConsistency?: any', to: 'soraConsistency?: unknown' },
        { from: '{ data: any; timestamp: number }', to: '{ data: unknown; timestamp: number }' },
        { from: 'rawTrack: any', to: 'rawTrack: Record<string, unknown>' },
        { from: 'rawTracks: any[]', to: 'rawTracks: Record<string, unknown>[]' },
        { from: '(sugg: any)', to: '(sugg: Record<string, unknown>)' },
        { from: 'archetype: any', to: 'archetype: Record<string, unknown>' },
        { from: 'previewFrames: any[]', to: 'previewFrames: unknown[]' },
        { from: 'texture: any', to: 'texture: Record<string, unknown>' }
    ]);
}
