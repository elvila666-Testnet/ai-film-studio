import React from 'react';
import {
    Clapperboard,
    Video,
    Palette,
    Music,
    Zap,
    DollarSign,
    ShieldCheck,
    CheckCircle2,
    Loader2,
    AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NodeProps {
    id: string;
    label: string;
    icon: React.ElementType;
    status: 'pending' | 'active' | 'complete' | 'error';
    isParallel?: boolean;
}

const Node = ({ label, icon: Icon, status, isParallel }: NodeProps) => {
    const statusColors = {
        pending: 'border-white/5 bg-white/5 text-slate-500',
        active: 'border-primary/50 bg-primary/20 text-primary flow-node-active',
        complete: 'border-emerald-500/50 bg-emerald-500/20 text-emerald-400',
        error: 'border-destructive/50 bg-destructive/20 text-destructive',
    };

    return (
        <div className={cn(
            "relative flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-500",
            statusColors[status],
            isParallel ? "w-32" : "w-48"
        )}>
            <div className="flow-node-glow" style={{ color: 'currentColor' }} />
            <div className="relative z-10">
                <Icon className="w-6 h-6" />
                {status === 'active' && (
                    <div className="absolute inset-0 blur-lg bg-primary/40 animate-pulse rounded-full" />
                )}
            </div>
            <div className="text-[10px] font-black uppercase tracking-widest text-center whitespace-nowrap relative z-10">
                {label}
            </div>
            {status === 'active' && <Loader2 className="w-3 h-3 animate-spin absolute top-2 right-2 z-10" />}
            {status === 'complete' && <CheckCircle2 className="w-3 h-3 absolute top-2 right-2 z-10" />}
            {status === 'error' && <AlertCircle className="w-3 h-3 absolute top-2 right-2 z-10" />}
        </div>
    );
};

const Connector = ({ status }: { status: 'pending' | 'active' | 'complete' }) => (
    <div className="flex-1 min-h-[40px] flex items-center justify-center">
        <div className={cn(
            "flow-connector-line transition-all duration-1000",
            status === 'active' && "flow-connector-active",
            status === 'complete' && "bg-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
        )} />
    </div>
);

interface CinemaPipelineFlowProps {
    isPending: boolean;
    results: any;
}

export function CinemaPipelineFlow({ isPending, results }: CinemaPipelineFlowProps) {
    const [simulatedStep, setSimulatedStep] = React.useState(0);

    React.useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPending) {
            setSimulatedStep(1);
            interval = setInterval(() => {
                setSimulatedStep(prev => (prev < 4 ? prev + 1 : prev));
            }, 3000); // Progress every 3 seconds
        } else {
            setSimulatedStep(0);
        }
        return () => clearInterval(interval);
    }, [isPending]);

    const getStatus = (step: number) => {
        if (results) return 'complete';
        if (!isPending) return 'pending';

        if (simulatedStep > step) return 'complete';
        if (simulatedStep === step) return 'active';
        return 'pending';
    };

    return (
        <div className="glass-panel p-10 rounded-3xl overflow-hidden bg-black/40 border-white/5 flex flex-col items-center gap-2">
            <div className="w-full flex justify-between items-center mb-8 px-4">
                <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.5em]">Agentic Execution DAG</h3>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-[8px] text-slate-500 uppercase tracking-widest font-bold">In-Transit</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-[8px] text-slate-500 uppercase tracking-widest font-bold">Fused</span>
                    </div>
                </div>
            </div>

            {/* Step 1: Director */}
            <Node
                id="director"
                label="Director Agent"
                icon={Clapperboard}
                status={getStatus(1)}
            />

            <Connector status={results ? 'complete' : simulatedStep > 1 ? 'complete' : simulatedStep === 1 ? 'active' : 'pending'} />

            {/* Step 2: Parallel Departments */}
            <div className="flex gap-6 relative w-full justify-center">
                {/* Glow behind parallel nodes */}
                {simulatedStep === 2 && (
                    <div className="absolute inset-x-20 top-0 bottom-0 bg-primary/5 blur-3xl animate-pulse rounded-full" />
                )}

                <Node id="dp" label="Cinematography" icon={Video} status={getStatus(2)} isParallel />
                <Node id="pd" label="Production" icon={Palette} status={getStatus(2)} isParallel />
                <Node id="sound" label="Sound Design" icon={Music} status={getStatus(2)} isParallel />
                <Node id="vfx" label="VFX Supervisor" icon={Zap} status={getStatus(2)} isParallel />
            </div>

            <Connector status={results ? 'complete' : simulatedStep > 2 ? 'complete' : simulatedStep === 2 ? 'active' : 'pending'} />

            {/* Step 3: FinOps */}
            <Node id="finops" label="FinOps Controller" icon={DollarSign} status={getStatus(3)} />

            <Connector status={results ? 'complete' : simulatedStep > 3 ? 'complete' : simulatedStep === 3 ? 'active' : 'pending'} />

            {/* Step 4: Final Validation */}
            <Node id="supervisor" label="Script Supervisor" icon={ShieldCheck} status={getStatus(4)} />

            {results && (
                <div className="mt-8 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl w-full text-center animate-fade-in">
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-loose">
                        Pipeline Successfully Fused • {results.totalShotsProcessed} Blueprints Persisted
                    </p>
                </div>
            )}
        </div>
    );
}
