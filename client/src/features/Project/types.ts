import {
    CheckCircle2,
    Layout,
    PenTool,
    Video,
    Music,
    Brain,
    Zap,
    Sparkles,
    Box,
    User,
    Type,
    Image as ImageIcon
} from "lucide-react";

export type PipelineStage = "bible" | "script" | "breakdown" | "characters" | "production-design" | "cinematography" | "storyboard" | "video" | "editor" | "export" | "admin";

export interface Project {
    id: number;
    name: string;
    brandId?: string | null;
    scriptComplianceScore?: number | null;
    visualComplianceScore?: number | null;
    isScriptLocked?: boolean;
    createdAt: string | number | Date;
    content?: {
        brief?: string;
        script?: string;
        synopsis?: string;
        globalDirectorNotes?: string;
        brandVoice?: string;
        visualIdentity?: string;
        colorPalette?: any;
    };
}

export interface Brand {
    id: string;
    name: string;
    logoUrl?: string;
    targetAudience?: string;
    brandVoice?: string;
    visualIdentity?: string;
}

export interface Shot {
    id: number;
    order: number;
    visualDescription: string;
    imageUrl?: string | null;
    masterImageUrl?: string | null;
    imageId?: number | null;
    cameraAngle?: string | null;
    consistencyScore?: number | null;
    isConsistencyLocked?: boolean;
    actors?: { actorId: number; name: string }[];
}

export interface Actor {
    id: number;
    name: string;
    description?: string;
    headshotUrl?: string;
}

export interface EditorProject {
    id: number;
    projectId: number;
    title: string;
    description?: string | null;
    fps: number;
    resolution: string;
}

export interface Clip {
    id: number;
    editorProjectId: number;
    trackId: number;
    fileUrl: string;
    fileName: string;
    fileType: "video" | "audio" | "image";
    duration: number;
    startTime: number;
    order: number;
}

export interface AIModel {
    id: number;
    provider: string;
    modelId: string;
    category: "text" | "image" | "video";
    isActive: boolean;
    isBuiltIn: boolean;
    apiKey?: string | null;
    apiEndpoint?: string | null;
}

export type ModelCategory = "text" | "image" | "video";

export const PIPELINE_STAGES: { id: PipelineStage; label: string; description: string; order: number; icon: unknown }[] = [
    { id: "bible", label: "Brand Intelligence", description: "Mandatory guidelines and project identity.", order: 1, icon: Brain },
    { id: "script", label: "Narrative Engine", description: "Draft or generate the cinematic script.", order: 2, icon: PenTool },
    { id: "breakdown", label: "Director Breakdown", description: "Analyze script for technical synchronization.", order: 3, icon: Layout },
    { id: "characters", label: "Casting & Consistency", description: "Define actors and consistency anchors.", order: 4, icon: User },
    { id: "production-design", label: "Production Design", description: "Define environments, props, and textures.", order: 5, icon: Box },
    { id: "cinematography", label: "Cinematography", description: "Govern lighting, lenses, and visual style.", order: 6, icon: Video },
    { id: "storyboard", label: "Storyboard", description: "Generate consistent cinematic frames.", order: 7, icon: Sparkles },
    { id: "video", label: "Cinematic Synthesis", description: "High-fidelity video generation via AI Engine.", order: 8, icon: Zap },
    { id: "editor", label: "Studio Editor", description: "Sequence clips and refine audio synchronization.", order: 9, icon: Music },
    { id: "export", label: "Final Master", description: "Render and distribute the completed asset.", order: 10, icon: CheckCircle2 },
];

export const MODEL_CATEGORIES = [
    { id: "text", name: "Linguistic Engines", icon: Type },
    { id: "image", name: "Visual Synthesizers", icon: ImageIcon },
    { id: "video", name: "Temporal Generators", icon: Video },
] as const;
