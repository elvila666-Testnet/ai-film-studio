import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Film, Clapperboard, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ComplianceScore } from "@/components/ComplianceScore";

export default function DashboardPage() {
    const { data: projects, isLoading, error } = trpc.projects.list.useQuery();

    if (error) {
        return <div className="p-8 text-red-500">Error loading projects: {error.message}</div>;
    }

    // Safety check for data type
    const safeProjects = Array.isArray(projects) ? projects : [];
    if (!isLoading && projects && !Array.isArray(projects)) {
        console.error("Unexpected project data format:", projects);
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground">Manage your film projects.</p>
                </div>
                <Link href="/script">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> New Project
                    </Button>
                </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                        <Film className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{projects?.length || 0}</div>
                    </CardContent>
                </Card>
            </div>

            <div>
                <h2 className="text-xl font-semibold mb-4">Recent Projects</h2>
                {isLoading ? (
                    <div>Loading...</div>
                ) : projects?.length === 0 ? (
                    <div className="text-center py-12 border rounded-lg bg-card/50">
                        <h3 className="text-lg font-medium">No projects yet</h3>
                        <p className="text-muted-foreground mb-4">Start by creating a new script.</p>
                        <Link href="/script">
                            <Button variant="outline">Create Script</Button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {safeProjects.map((project) => (
                            <Card key={project.id} className="hover:bg-accent/50 transition-colors cursor-pointer flex flex-col">
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <CardTitle>{project.name}</CardTitle>
                                        <Badge variant="outline" className="bg-cyan-950/30 text-cyan-400 border-cyan-800">
                                            v1.0
                                        </Badge>
                                    </div>
                                    <CardDescription>Created: {new Date(project.createdAt).toLocaleDateString()}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1 space-y-4">
                                    <div className="grid grid-cols-2 gap-3 pb-2 border-b border-slate-800/50">
                                        <ComplianceScore
                                            label="Script"
                                            score={project.scriptComplianceScore}
                                            size="sm"
                                        />
                                        <ComplianceScore
                                            label="Visual"
                                            score={project.visualComplianceScore}
                                            size="sm"
                                        />
                                    </div>

                                    <div className="flex justify-end gap-2 pt-2">
                                        <Link href={`/storyboard?projectId=${project.id}`}>
                                            <Button size="sm" variant="ghost" className="hover:text-cyan-400">
                                                <Clapperboard className="w-4 h-4 mr-1" /> Storyboard
                                            </Button>
                                        </Link>
                                        <Link href={`/video?projectId=${project.id}`}>
                                            <Button size="sm" variant="ghost" className="hover:text-cyan-400">
                                                <Video className="w-4 h-4 mr-1" /> Video
                                            </Button>
                                        </Link>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
