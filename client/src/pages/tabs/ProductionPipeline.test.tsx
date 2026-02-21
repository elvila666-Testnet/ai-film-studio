
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import BriefTab from './BriefTab';
import ScriptTab from './ScriptTab';
import CharacterCastingTab from './CharacterCastingTab';
import VisualStyleTab from './VisualStyleTab';
import TechnicalScriptTab from './TechnicalScriptTab';
import StoryboardTab from './StoryboardTab';
import VideoTab from './VideoTab';
import EditorTab from './EditorTab';
import ExportTab from './ExportTab';
// React is auto-imported by JSX transform
import { trpc } from '@/lib/trpc';

// Mock Browser globals
if (typeof window !== 'undefined') {
    global.URL.createObjectURL = vi.fn();
    global.URL.revokeObjectURL = vi.fn();
}

// Mock TRPC
vi.mock('@/lib/trpc', () => ({
    trpc: {
        projects: {
            get: { useQuery: vi.fn() },
            updateContent: { useMutation: vi.fn() },
        },
        ai: {
            generateScript: { useMutation: vi.fn() },
            refineScript: { useMutation: vi.fn() },
            generateVisualStyle: { useMutation: vi.fn() },
            refineVisualStyle: { useMutation: vi.fn() },
            generateTechnicalShots: { useMutation: vi.fn() },
            generateStoryboardImage: { useMutation: vi.fn() },
            refineImagePrompt: { useMutation: vi.fn() },
            generateCharacterImage: { useMutation: vi.fn() },
        },
        characters: {
            list: { useQuery: vi.fn() },
            getLocked: { useQuery: vi.fn() },
            create: { useMutation: vi.fn() },
            lock: { useMutation: vi.fn() },
            delete: { useMutation: vi.fn() },
            unlock: { useMutation: vi.fn() },
        },
        referenceImages: {
            list: { useQuery: vi.fn() },
            upload: { useMutation: vi.fn() },
            delete: { useMutation: vi.fn() },
        },
        storyboard: {
            getImages: { useQuery: vi.fn() },
            saveImage: { useMutation: vi.fn() },
        },
        video: {
            list: { useQuery: vi.fn() },
            create: { useMutation: vi.fn() },
            render: { useMutation: vi.fn() },
            status: { useQuery: vi.fn() },
        },
        editor: {
            projects: { list: { useQuery: vi.fn() }, create: { useMutation: vi.fn() } },
            clips: { list: { useQuery: vi.fn() }, upload: { useMutation: vi.fn() }, delete: { useMutation: vi.fn() }, updatePosition: { useMutation: vi.fn() }, batchUpdatePositions: { useMutation: vi.fn() } },
            exportAnimatic: { useMutation: vi.fn() },
            getAnimaticConfig: { useQuery: vi.fn() },
            tracks: { list: { useQuery: vi.fn() }, create: { useMutation: vi.fn() } },
        },
        useUtils: vi.fn(() => ({
            projects: { get: { invalidate: vi.fn() } },
            video: { list: { invalidate: vi.fn() } },
            editor: { projects: { list: { invalidate: vi.fn() } } },
        })),
    },
}));

// Mock sub-components (Fixing default vs named exports)
vi.mock('@/components/AnimaticPreview', () => ({ AnimaticPreview: () => <div>Animatic Preview</div> }));
vi.mock('@/components/AudioUpload', () => ({ AudioUpload: () => <div>Audio Upload</div> }));
vi.mock('@/components/TransitionsEffectsPanel', () => ({ TransitionsEffectsPanel: () => <div>Transitions Panel</div> }));
vi.mock('@/components/AudioMixerConsole', () => ({ AudioMixerConsole: () => <div>Audio Mixer</div> }));
vi.mock('@/components/Timeline', () => ({ default: () => <div>Timeline</div> }));
vi.mock('@/components/VisualStyleGuidePreview', () => ({ VisualStyleGuidePreview: () => <div>Style Guide</div> }));

describe('Production Pipeline Stages Verification', () => {
    const projectId = 1;

    beforeEach(() => {
        vi.clearAllMocks();

        (trpc.projects.get.useQuery as any).mockReturnValue({ data: { content: {} }, isLoading: false });
        (trpc.characters.list.useQuery as any).mockReturnValue({ data: [], isLoading: false });
        (trpc.characters.getLocked.useQuery as any).mockReturnValue({ data: null, isLoading: false });
        (trpc.referenceImages.list.useQuery as any).mockReturnValue({ data: [], isLoading: false });
        (trpc.storyboard.getImages.useQuery as any).mockReturnValue({ data: [], isLoading: false });
        (trpc.video.list.useQuery as any).mockReturnValue({ data: [], isLoading: false });
        (trpc.video.status.useQuery as any).mockReturnValue({ data: { status: 'pending', progress: 50 }, isLoading: false });
        (trpc.editor.projects.list.useQuery as any).mockReturnValue({ data: [{ id: 1, title: 'Test Editor' }], isLoading: false });
        (trpc.editor.clips.list.useQuery as any).mockReturnValue({ data: [], isLoading: false });
        (trpc.editor.getAnimaticConfig.useQuery as any).mockReturnValue({ data: null, isLoading: false });

        const mockMutation = { mutate: vi.fn(), mutateAsync: vi.fn().mockResolvedValue({}), isPending: false };
        (trpc.projects.updateContent.useMutation as any).mockReturnValue(mockMutation);
        (trpc.ai.generateScript.useMutation as any).mockReturnValue(mockMutation);
        (trpc.ai.refineScript.useMutation as any).mockReturnValue(mockMutation);
        (trpc.ai.generateVisualStyle.useMutation as any).mockReturnValue(mockMutation);
        (trpc.ai.refineVisualStyle.useMutation as any).mockReturnValue(mockMutation);
        (trpc.ai.generateTechnicalShots.useMutation as any).mockReturnValue(mockMutation);
        (trpc.video.render.useMutation as any).mockReturnValue(mockMutation);
        (trpc.video.create.useMutation as any).mockReturnValue(mockMutation);
        (trpc.editor.projects.create.useMutation as any).mockReturnValue(mockMutation);
        (trpc.editor.clips.upload.useMutation as any).mockReturnValue(mockMutation);
        (trpc.editor.clips.delete.useMutation as any).mockReturnValue(mockMutation);
    });

    it('Stage 1: Brief', () => { render(<BriefTab projectId={projectId} />); expect(screen.getByText(/Stage 1/i)).toBeTruthy(); });
    it('Stage 2: Script', () => { render(<ScriptTab projectId={projectId} />); expect(screen.getByText(/Stage 2/i)).toBeTruthy(); });
    it('Stage 3: Characters', () => { render(<CharacterCastingTab projectId={projectId} />); expect(screen.getByText(/Stage 3/i)).toBeTruthy(); });
    it('Stage 4: Visual Style', () => { render(<VisualStyleTab projectId={projectId} />); expect(screen.getByText(/Stage 4/i)).toBeTruthy(); });
    it('Stage 5: Technical Script', () => { render(<TechnicalScriptTab projectId={projectId} />); expect(screen.getByText(/Stage 5/i)).toBeTruthy(); });
    it('Stage 6: Storyboard', () => { render(<StoryboardTab projectId={projectId} />); expect(screen.getByText(/Stage 6/i)).toBeTruthy(); });
    it('Stage 7: Video', () => { render(<VideoTab projectId={projectId} />); expect(screen.getByText(/Stage 7/i)).toBeTruthy(); });
    it('Stage 8: Editor', () => { render(<EditorTab projectId={projectId} />); expect(screen.getByText(/Stage 8/i)).toBeTruthy(); });
    it('Stage 9: Export', () => { render(<ExportTab projectId={projectId} />); expect(screen.getByText(/Stage 9/i)).toBeTruthy(); });
});
