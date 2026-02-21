import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import VideoTab from '@/pages/tabs/VideoTab';
import { trpc } from '@/lib/trpc';
// import React from 'react';

// Mock trpc
vi.mock('@/lib/trpc', () => ({
    trpc: {
        video: {
            list: {
                useQuery: vi.fn(),
            },
            create: {
                useMutation: vi.fn(),
            },
            render: {
                useMutation: vi.fn(),
            },
            status: {
                useQuery: vi.fn(),
            },
        },
    },
}));

vi.mock('@/components/TransitionsEffectsPanel', () => ({
    TransitionsEffectsPanel: () => <div data-testid="mock-effects">Effects Panel</div>
}));

vi.mock('@/components/AudioMixerConsole', () => ({
    AudioMixerConsole: () => <div data-testid="mock-mixer">Audio Mixer</div>
}));

describe('VideoTab Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (trpc.video as any).list.useQuery.mockReturnValue({
            data: [],
            isError: false,
            isLoading: false,
            refetch: vi.fn(),
        });
        (trpc.video as any).create.useMutation.mockReturnValue({
            mutate: vi.fn(),
            mutateAsync: vi.fn().mockResolvedValue({ success: true }),
            isPending: false,
        });
        (trpc.video as any).status.useQuery.mockReturnValue({
            data: null,
            isError: false,
            isLoading: false,
        });
        (trpc.video as any).render.useMutation.mockReturnValue({
            mutate: vi.fn(),
            mutateAsync: vi.fn().mockResolvedValue({ id: 'job_123' }),
            isPending: false,
        });
    });

    // Basic structural test
    it('renders all main panels', async () => {
        render(<VideoTab projectId={123} />);

        // Check for main UI elements
        expect(screen.getByText('MEDIA POOL')).toBeTruthy();
        expect(screen.getByText('CANVAS')).toBeTruthy();
        expect(screen.getByText('TIMELINE')).toBeTruthy();

        // Initial loaded tab triggers are present
        expect(await screen.findByTestId('tab-effects')).toBeTruthy();
        expect(await screen.findByTestId('tab-audio')).toBeTruthy();
        expect(await screen.findByTestId('tab-export')).toBeTruthy();
    });

    it('switches tabs correctly', async () => {
        render(<VideoTab projectId={123} />);

        const audioTab = await screen.findByRole('tab', { name: /Audio/i });
        fireEvent.mouseDown(audioTab);
        fireEvent.mouseUp(audioTab);
        fireEvent.click(audioTab);

        // Verify Audio mixer content is shown
        expect(await screen.findByTestId('mock-mixer')).toBeTruthy();
    });

    it('handles video export button click', async () => {
        render(<VideoTab projectId={123} />);

        const exportTab = await screen.findByRole('tab', { name: /Export/i });
        fireEvent.mouseDown(exportTab);
        fireEvent.mouseUp(exportTab);
        fireEvent.click(exportTab);

        // Verify ExportTab is rendered by looking for its unique text
        expect(await screen.findByText('Select Export Format')).toBeTruthy();
    });
});
