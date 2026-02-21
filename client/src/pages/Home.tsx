import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Loader2, Film, User, LogOut,
  Settings, ChevronDown, ChevronUp, Info
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { LandingPage } from "./LandingPage";
import ScriptTab from "./tabs/ScriptTab";
import CharacterCastingTab from "./tabs/CharacterCastingTab";
import BrandIntelligenceTab from "./tabs/BrandIntelligenceTab";
import CinematographyTab from "@/features/Project/CinematographyTab";
import ProductionDesignTab from "@/features/Project/ProductionDesignTab";
import StoryboardTab from "./tabs/StoryboardTab";
import VideoTab from "./tabs/VideoTab";
import EditorTab from "./tabs/EditorTab";
import ExportTab from "./tabs/ExportTab";
import { AdminPanel } from "./AdminPanel";
import { PipelineSidebar } from "@/features/Project/PipelineSidebar";
import { ProjectVault } from "@/features/Project/ProjectVault";
import { NewProjectPanel } from "@/features/Project/NewProjectPanel";
import { PipelineStage, Project } from "@/features/Project/types";
import { DirectorView } from "@/components/Director/DirectorView";
import { DirectorConsole } from "@/components/DirectorConsole";
import { CostTicker } from "@/components/FinOps/CostTicker";

export function Home() {
  const { user, loading, isAuthenticated, logout, refresh } = useAuth();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [currentStage, setCurrentStage] = useState<PipelineStage>("bible");
  const [isBriefExpanded, setIsBriefExpanded] = useState(false);

  const projectsQuery = trpc.projects.list.useQuery(undefined, {
    enabled: isAuthenticated && !loading,
  });
  const brandsQuery = trpc.brand.list.useQuery(undefined, {
    enabled: isAuthenticated && !loading
  });

  const createProjectMutation = trpc.projects.create.useMutation();
  const deleteProjectMutation = trpc.projects.delete.useMutation();
  const createBrandMutation = trpc.brand.create.useMutation();

  const handleCreateProject = async (name: string, brandId: string | null) => {
    try {
      const result = await createProjectMutation.mutateAsync({
        name,
        brandId: brandId || undefined
      });
      projectsQuery.refetch();
      if (result?.id) {
        setSelectedProjectId(result.id);
        setCurrentStage("bible");
      }
    } catch (error) {
      console.error("Failed to create project:", error);
    }
  };

  const handleDeleteProject = async (projectId: number) => {
    if (!confirm("Delete this project?")) return;
    try {
      await deleteProjectMutation.mutateAsync({ id: projectId });
      if (selectedProjectId === projectId) {
        setSelectedProjectId(null);
      }
      projectsQuery.refetch();
    } catch (error) {
      console.error("Failed to delete project:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#020205]">
        <Loader2 className="animate-spin w-12 h-12 text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <LandingPage
        onLoginSuccess={() => { refresh(); }}
        isAuthenticated={false}
        user={null}
      />
    );
  }

  const projects = (projectsQuery.data || []) as any as Project[];
  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const briefContent = selectedProject?.content?.brief;

  if (!selectedProjectId) {
    return (
      <div className="pipeline-container">
        <div className="grain-overlay" />
        <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-glow-indigo rounded-full blur-[120px] animate-glow" />

        <header className="pipeline-header">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
              <Film className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white uppercase italic">
                AI FILM <span className="text-primary">STUDIO</span>
              </h1>
              <p className="production-label">Control Room</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-white">{user?.email}</span>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{user?.role} ACCESS</span>
            </div>
            <Button
              onClick={async () => {
                await logout();
                window.location.reload();
              }}
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-6 py-16 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-1">
              <NewProjectPanel
                brands={brandsQuery.data || []}
                onCreateProject={handleCreateProject}
                onCreateBrand={async (name: string) => {
                  try {
                    const result = await createBrandMutation.mutateAsync({ name });
                    toast.success("Brand DNA registered.");
                    brandsQuery.refetch();
                    return result as { id: string };
                  } catch (e) {
                    toast.error("Handshake failed.");
                    return undefined;
                  }
                }}
                createProjectPending={createProjectMutation.isPending}
                createBrandPending={createBrandMutation.isPending}
              />
            </div>

            <div className="lg:col-span-2">
              <ProjectVault
                isLoading={projectsQuery.isLoading}
                projects={projects}
                onSelectProject={(id: number) => {
                  setSelectedProjectId(id);
                  setCurrentStage("bible");
                }}
                onDeleteProject={handleDeleteProject}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pipeline-container flex flex-col">
      <div className="grain-overlay" />

      <header className="pipeline-header px-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedProjectId(null)}
            className="text-slate-400 hover:text-white"
          >
            ← Workspace
          </Button>
          <div className="h-6 w-px bg-white/10" />
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/20 rounded flex items-center justify-center border border-primary/30">
              <Film className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-sm font-black text-white uppercase tracking-tight italic">
                  {selectedProjectId === -1 ? "SYSTEM" : selectedProject?.name}
                </h1>
                {selectedProjectId !== -1 && selectedProject && (
                  <div className="flex gap-2">
                    {selectedProject.scriptComplianceScore != null && (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/5 rounded border border-white/10">
                        <span className="text-[7px] text-slate-500 font-bold uppercase tracking-tighter">Script</span>
                        <span className={cn(
                          "text-[9px] font-black font-mono",
                          selectedProject.scriptComplianceScore >= 80 ? "text-green-400" :
                            selectedProject.scriptComplianceScore >= 60 ? "text-yellow-400" : "text-red-400"
                        )}>
                          {selectedProject.scriptComplianceScore}%
                        </span>
                      </div>
                    )}
                    {selectedProject.visualComplianceScore != null && (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/5 rounded border border-white/10">
                        <span className="text-[7px] text-slate-500 font-bold uppercase tracking-tighter">Visual</span>
                        <span className={cn(
                          "text-[9px] font-black font-mono",
                          selectedProject.visualComplianceScore >= 80 ? "text-green-400" :
                            selectedProject.visualComplianceScore >= 60 ? "text-yellow-400" : "text-red-400"
                        )}>
                          {selectedProject.visualComplianceScore}%
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="production-label !text-[8px]">
                {currentStage.replace("-", " ")} PHASE
              </p>
            </div>
          </div>
        </div>

        {selectedProjectId !== -1 && briefContent && (
          <div className="hidden md:flex flex-1 max-w-xl mx-8">
            <div
              className={`w-full glass-panel rounded-xl px-4 py-2 flex items-center justify-between cursor-pointer group hover:bg-white/5 transition-all ${isBriefExpanded ? "h-auto" : "h-10"}`}
              onClick={() => setIsBriefExpanded(!isBriefExpanded)}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <Info className="w-3 h-3 text-primary flex-shrink-0" />
                <span className={`text-[10px] font-medium text-slate-400 uppercase tracking-wider truncate ${isBriefExpanded ? "" : "max-w-[300px]"}`}>
                  {isBriefExpanded ? "Full Brief" : briefContent}
                </span>
              </div>
              {isBriefExpanded ? <ChevronUp className="w-3 h-3 text-slate-500" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
            </div>
          </div>
        )}

        <div className="flex items-center gap-4">
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em]">
            SN: {selectedProjectId}
          </div>
          <div className="h-6 w-px bg-white/10" />
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center">
            <User className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      </header>

      {isBriefExpanded && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-24 px-4" onClick={() => setIsBriefExpanded(false)}>
          <div className="max-w-3xl w-full glass-panel rounded-3xl p-8 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="production-node-title">Project Brief Reference</h2>
              <Button variant="ghost" size="sm" onClick={() => setIsBriefExpanded(false)}>✕</Button>
            </div>
            <div className="p-6 bg-white/[0.03] border border-white/5 rounded-2xl text-slate-300 leading-relaxed max-h-[60vh] overflow-y-auto">
              {briefContent}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 h-[calc(100vh-73px)] overflow-hidden">
        <PipelineSidebar
          currentStage={currentStage}
          onStageChange={setCurrentStage}
          selectedProjectId={selectedProjectId}
          userRole={user?.role}
        />

        <main className="flex-1 overflow-y-auto bg-studio-gradient relative">
          <div className="p-10 max-w-7xl mx-auto">
            <div className="animate-fade-in">
              {currentStage === "bible" && <BrandIntelligenceTab projectId={selectedProjectId!} />}
              {currentStage === "script" && <ScriptTab projectId={selectedProjectId!} />}
              {currentStage === "breakdown" && <DirectorView projectId={selectedProjectId!} />}
              {currentStage === "characters" && <CharacterCastingTab projectId={selectedProjectId!} />}
              {currentStage === "production-design" && <ProductionDesignTab projectId={selectedProjectId!} />}
              {currentStage === "cinematography" && <CinematographyTab projectId={selectedProjectId!} />}
              {currentStage === "storyboard" && <StoryboardTab projectId={selectedProjectId!} />}
              {currentStage === "video" && <VideoTab projectId={selectedProjectId!} />}
              {currentStage === "editor" && <EditorTab projectId={selectedProjectId!} />}
              {currentStage === "export" && <ExportTab projectId={selectedProjectId!} />}
              {currentStage === "admin" && <AdminPanel />}
            </div>
          </div>
        </main>

        {selectedProjectId && selectedProjectId !== -1 && (
          <>
            <DirectorConsole projectId={selectedProjectId} />
            <CostTicker projectId={selectedProjectId} />
          </>
        )}
      </div>
    </div>
  );
}
