import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Trash2, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import BriefTab from "./tabs/BriefTab";
import ScriptTab from "./tabs/ScriptTab";
import VisualStyleTab from "./tabs/VisualStyleTab";
import TechnicalShotsTab from "./tabs/TechnicalShotsTab";
import StoryboardTab from "./tabs/StoryboardTab";
import EditorTab from "./tabs/EditorTab";
import BrandIntelligenceTab from "./tabs/BrandIntelligenceTab";
import CharacterCastingTab from "./tabs/CharacterCastingTab";
import ExportTab from "./tabs/ExportTab";


export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [newProjectName, setNewProjectName] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  const projectsQuery = trpc.projects.list.useQuery();
  const createProjectMutation = trpc.projects.create.useMutation();
  const deleteProjectMutation = trpc.projects.delete.useMutation();

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    
    try {
      await createProjectMutation.mutateAsync({ name: newProjectName });
      setNewProjectName("");
      projectsQuery.refetch();
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
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="animate-spin w-8 h-8 text-accent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md bg-card border-border">
          <CardHeader>
            <CardTitle className="text-accent">AI Film Studio</CardTitle>
            <CardDescription>Professional Production Tracking</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Authentication required</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedProject = projectsQuery.data?.find(p => p.id === selectedProjectId);

  if (!selectedProjectId) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <h1 className="text-4xl font-bold text-accent tracking-tight">AI FILM STUDIO</h1>
            <p className="text-muted-foreground mt-2 text-sm uppercase tracking-widest">Professional Production Tracking System</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Sidebar - Project Management */}
            <div className="lg:col-span-2">
              <div className="production-node">
                <div className="production-node-header">
                  <div className="production-node-title">Projects</div>
                </div>
                <div className="p-4 space-y-4">
                  {/* Create New Project */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">New Project</label>
                    <Input
                      placeholder="Project name"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleCreateProject()}
                      className="bg-input border-border text-foreground placeholder-muted-foreground"
                    />
                    <Button
                      onClick={handleCreateProject}
                      disabled={!newProjectName.trim() || createProjectMutation.isPending}
                      className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                      size="sm"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create
                    </Button>
                  </div>

                  {/* Project List */}
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {projectsQuery.isLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="animate-spin w-4 h-4 text-accent" />
                      </div>
                    ) : projectsQuery.data?.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4">No projects</p>
                    ) : (
                      projectsQuery.data?.map((project) => (
                        <div
                          key={project.id}
                          className={`p-3 rounded-sm border transition-all cursor-pointer ${
                            selectedProjectId === project.id
                              ? "bg-muted border-accent shadow-lg"
                              : "bg-card border-border hover:border-accent/50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div
                              className="flex-1 min-w-0"
                              onClick={() => setSelectedProjectId(project.id)}
                            >
                              <p className="font-semibold text-sm text-foreground truncate">{project.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(project.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteProject(project.id)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content - Welcome */}
            <div className="lg:col-span-3">
              <div className="production-node">
                <div className="production-node-header">
                  <div className="production-node-title">Getting Started</div>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground mb-3">Production Workflow</h2>
                    <div className="space-y-3">
                      <div className="flex gap-3 items-start">
                        <div className="w-8 h-8 rounded-sm bg-accent/20 flex items-center justify-center flex-shrink-0 mt-1">
                          <span className="text-xs font-bold text-accent">1</span>
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-foreground">Brief</p>
                          <p className="text-xs text-muted-foreground">Define your project concept</p>
                        </div>
                      </div>
                      <div className="flex gap-3 items-start">
                        <div className="w-8 h-8 rounded-sm bg-accent/20 flex items-center justify-center flex-shrink-0 mt-1">
                          <span className="text-xs font-bold text-accent">2</span>
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-foreground">Script</p>
                          <p className="text-xs text-muted-foreground">Generate and refine screenplay</p>
                        </div>
                      </div>
                      <div className="flex gap-3 items-start">
                        <div className="w-8 h-8 rounded-sm bg-accent/20 flex items-center justify-center flex-shrink-0 mt-1">
                          <span className="text-xs font-bold text-accent">3</span>
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-foreground">Visual Style</p>
                          <p className="text-xs text-muted-foreground">Establish cinematography palette</p>
                        </div>
                      </div>
                      <div className="flex gap-3 items-start">
                        <div className="w-8 h-8 rounded-sm bg-accent/20 flex items-center justify-center flex-shrink-0 mt-1">
                          <span className="text-xs font-bold text-accent">4</span>
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-foreground">Technical Shots</p>
                          <p className="text-xs text-muted-foreground">Break down into individual shots</p>
                        </div>
                      </div>
                      <div className="flex gap-3 items-start">
                        <div className="w-8 h-8 rounded-sm bg-accent/20 flex items-center justify-center flex-shrink-0 mt-1">
                          <span className="text-xs font-bold text-accent">5</span>
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-foreground">Storyboard</p>
                          <p className="text-xs text-muted-foreground">Generate visual storyboard</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground">Create or select a project to begin</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-accent tracking-tight">AI FILM STUDIO</h1>
              <p className="text-muted-foreground text-sm mt-1">{selectedProject?.name}</p>
            </div>
            <Button
              onClick={() => setSelectedProjectId(null)}
              variant="outline"
              size="sm"
              className="border-border text-muted-foreground hover:text-foreground"
            >
              Back to Projects
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs defaultValue="brand" className="w-full">
          <TabsList className="grid w-full grid-cols-9 bg-card border border-border p-1 rounded-sm">
            <TabsTrigger value="brand" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-sm text-xs">
              Brand
            </TabsTrigger>
            <TabsTrigger value="brief" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-sm text-xs">
              Brief
            </TabsTrigger>
            <TabsTrigger value="script" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-sm text-xs">
              Script
            </TabsTrigger>
            <TabsTrigger value="casting" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-sm text-xs">
              Casting
            </TabsTrigger>
            <TabsTrigger value="visual" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-sm text-xs">
              Visual
            </TabsTrigger>
            <TabsTrigger value="technical" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-sm text-xs">
              Technical
            </TabsTrigger>
            <TabsTrigger value="storyboard" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-sm text-xs">
              Storyboard
            </TabsTrigger>
            <TabsTrigger value="editor" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-sm text-xs">
              Editor
            </TabsTrigger>
            <TabsTrigger value="export" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-sm text-xs">
              Export
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="brand">
              <BrandIntelligenceTab projectId={selectedProjectId!} />
            </TabsContent>

            <TabsContent value="brief">
              <BriefTab projectId={selectedProjectId!} />
            </TabsContent>

            <TabsContent value="script">
              <ScriptTab projectId={selectedProjectId!} />
            </TabsContent>

            <TabsContent value="visual">
              <VisualStyleTab projectId={selectedProjectId!} />
            </TabsContent>

            <TabsContent value="technical">
              <TechnicalShotsTab projectId={selectedProjectId!} />
            </TabsContent>

            <TabsContent value="storyboard">
              <StoryboardTab projectId={selectedProjectId!} />
            </TabsContent>

            <TabsContent value="editor">
              <EditorTab projectId={selectedProjectId!} />
            </TabsContent>

            <TabsContent value="export">
              <ExportTab projectId={selectedProjectId!} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
