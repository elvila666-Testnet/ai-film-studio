import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, Settings } from "lucide-react";
import { PipelineStage, PIPELINE_STAGES } from "./types";

interface PipelineSidebarProps {
    currentStage: PipelineStage;
    onStageChange: (stage: PipelineStage) => void;
    selectedProjectId: number | null;
    userRole?: string | null;
}

export function PipelineSidebar({
    currentStage,
    onStageChange,
    selectedProjectId,
    userRole
}: PipelineSidebarProps) {
    return (
        <aside className="w-64 bg-black/40 backdrop-blur-3xl border-r border-white/5 flex flex-col p-6 space-y-8">
            <div className="space-y-4">
                <div className="production-label px-2">Workflow Structure</div>
                <div className="space-y-2">
                    <TooltipProvider>
                        {selectedProjectId !== -1 && PIPELINE_STAGES.map((stage: any, index: number) => {
                            const isActive = currentStage === stage.id;
                            const isPast = PIPELINE_STAGES.findIndex((s: any) => s.id === currentStage) > index;
                            const Icon = stage.icon as any;

                            return (
                                <Tooltip key={stage.id} delayDuration={300}>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={() => onStageChange(stage.id)}
                                            className={`
                        w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-xs font-bold transition-all group relative
                        ${isActive
                                                    ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]'
                                                    : isPast
                                                        ? 'text-primary hover:bg-primary/10'
                                                        : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                                                }
                      `}
                                        >
                                            <Icon className={`w-4 h-4 ${isActive ? "text-white" : isPast ? "text-primary" : "text-slate-600 group-hover:text-slate-400"}`} />
                                            <span className="flex-1 text-left uppercase tracking-widest truncate">{stage.label}</span>
                                            {isPast && <CheckCircle2 className="w-3 h-3 text-primary" />}
                                            {isActive && <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />}
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="bg-black/90 border-white/10 text-white text-[10px] py-1.5 px-3">
                                        <div className="font-bold mb-0.5">{stage.label}</div>
                                        <div className="text-slate-400">{stage.description}</div>
                                    </TooltipContent>
                                </Tooltip>
                            );
                        })}
                    </TooltipProvider>
                </div>
            </div>

            {userRole === "admin" && (
                <div className="mt-auto pt-6 border-t border-white/5">
                    <button
                        onClick={() => onStageChange("admin")}
                        className={`
              w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-xs font-bold transition-all
              ${currentStage === "admin"
                                ? 'bg-white text-black'
                                : 'text-slate-500 hover:text-white hover:bg-white/5'
                            }
            `}
                    >
                        <Settings className="w-4 h-4" />
                        <span className="uppercase tracking-widest">System Admin</span>
                    </button>
                </div>
            )}
        </aside>
    );
}
