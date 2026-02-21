import { Button } from "@/components/ui/button";
import { Film, Trash2, ChevronRight, Loader2 } from "lucide-react";

interface ProjectVaultProps {
    isLoading: boolean;
    projects: any[];
    onSelectProject: (id: number) => void;
    onDeleteProject: (id: number) => void;
}

export function ProjectVault({
    isLoading,
    projects,
    onSelectProject,
    onDeleteProject
}: ProjectVaultProps) {
    return (
        <div className="pipeline-stage p-0 overflow-hidden">
            <div className="px-8 py-6 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                <h3 className="production-node-title">Active Vault</h3>
                <div className="production-label">{projects?.length || 0} Projects</div>
            </div>
            <div className="p-4">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="animate-spin w-8 h-8 text-primary" />
                    </div>
                ) : projects && projects.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {projects.map((project: any) => (
                            <div
                                key={project.id}
                                className="group relative bg-white/[0.03] border border-white/5 rounded-2xl p-6 hover:border-primary/50 transition-all cursor-pointer overflow-hidden"
                                onClick={() => onSelectProject(project.id)}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="relative flex flex-col h-full">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="font-bold text-lg text-white group-hover:text-primary transition-colors">
                                            {project.name}
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteProject(project.id);
                                            }}
                                            className="h-8 w-8 p-0 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <div className="mt-auto flex items-center justify-between">
                                        <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                                            {new Date(project.createdAt).toLocaleDateString()}
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-primary transform group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <Film className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                        <p className="text-slate-500">No productions discovered yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
