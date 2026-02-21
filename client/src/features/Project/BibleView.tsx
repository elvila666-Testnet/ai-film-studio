import React, { useState } from 'react';
import { trpc } from '../../lib/trpc';
import * as Label from '@radix-ui/react-label';

interface BibleViewProps {
    projectId: number;
}

export function BibleView({ projectId }: BibleViewProps) {
    const { data: bible, refetch } = trpc.projects.getBible.useQuery({ projectId });
    const updateBible = trpc.projects.updateBible.useMutation({
        onSuccess: () => refetch(),
    });

    const [formData, setFormData] = useState<Record<string, any>>({});

    // Initialize form data when bible loads
    React.useEffect(() => {
        if (bible) {
            setFormData(bible);
        }
    }, [bible]);

    const handleSave = () => {
        updateBible.mutate({ projectId, bible: formData });
    };

    const handleChange = (key: string, value: string) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="p-6 bg-slate-900 text-white min-h-screen">
            <h1 className="text-3xl font-bold mb-6 text-yellow-500">Showrunner Bible</h1>

            <div className="grid gap-6 max-w-2xl">
                {/* Title */}
                <div className="space-y-2">
                    <Label.Root className="text-sm font-medium text-gray-400">Project Title</Label.Root>
                    <input
                        className="w-full bg-slate-800 border border-slate-700 rounded p-2 focus:ring-2 focus:ring-yellow-500 outline-none"
                        value={formData.title || ''}
                        onChange={(e) => handleChange('title', e.target.value)}
                        placeholder="Enter project title..."
                    />
                </div>

                {/* Synopsis */}
                <div className="space-y-2">
                    <Label.Root className="text-sm font-medium text-gray-400">Logline / Synopsis</Label.Root>
                    <textarea
                        className="w-full h-32 bg-slate-800 border border-slate-700 rounded p-2 focus:ring-2 focus:ring-yellow-500 outline-none"
                        value={formData.synopsis || ''}
                        onChange={(e) => handleChange('synopsis', e.target.value)}
                        placeholder="What is the story about?"
                    />
                </div>

                {/* Setting */}
                <div className="space-y-2">
                    <Label.Root className="text-sm font-medium text-gray-400">Setting / World</Label.Root>
                    <textarea
                        className="w-full h-24 bg-slate-800 border border-slate-700 rounded p-2 focus:ring-2 focus:ring-yellow-500 outline-none"
                        value={formData.setting || ''}
                        onChange={(e) => handleChange('setting', e.target.value)}
                        placeholder="Describe the world..."
                    />
                </div>

                <button
                    onClick={handleSave}
                    disabled={updateBible.isPending}
                    className="bg-yellow-600 hover:bg-yellow-700 text-black font-bold py-2 px-4 rounded transition-colors"
                >
                    {updateBible.isPending ? 'Saving...' : 'Save Bible'}
                </button>
            </div>
        </div>
    );
}
