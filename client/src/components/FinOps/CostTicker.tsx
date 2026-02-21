import { trpc } from '@/lib/trpc';
// Assuming trpc hooks context is set up in utils/trpc or similar. 
// If not, I'll need to find where createTRPCReact is exported.
// Based on typical stack, it might be in `client/src/utils/trpc.ts`.

interface CostTickerProps {
    projectId: number;
}

export function CostTicker({ projectId }: CostTickerProps) {
    const { data: usageData } = trpc.finops.getProjectUsage.useQuery(
        { projectId },
        { refetchInterval: 5000 } // Live update every 5s
    );

    const totalCost = usageData?.totalCost || 0;

    return (
        <div className="fixed bottom-4 right-4 bg-black/80 text-green-400 px-4 py-2 rounded-full border border-green-900 font-mono z-50 shadow-lg backdrop-blur-sm">
            <span className="text-xs text-gray-400 mr-2">PROJECT SPEND:</span>
            <span className="font-bold">${totalCost.toFixed(4)}</span>
        </div>
    );
}