import {
    CheckCircle2,
    Crosshair,
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
    Image as ImageIcon,
    LucideIcon
} from "lucide-react";

export type PipelineStage = "bible" | "script" | "breakdown" | "characters" | "production-design" | "cinematography" | "storyboard" | "shot-designer" | "video" | "editor" | "export" | "admin";

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

export interface CinemaPipelineShot {
    shotNumber: number;
    directorIntent?: {
        visualDescription?: string;
        emotionalBeat?: string;
    };
    cameraSpecs?: {
        shotType?: string;
        lensStrategy?: string;
        movementLogic?: string;
        lightingSpec?: string;
        tStop?: string;
    };
    productionDesign?: {
        environmentalAtmosphere?: string;
        textureSpecs?: string;
        physicalAssets?: string[];
        wardrobeDetails?: string;
        colorPalette?: string;
    };
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

export const PIPELINE_STAGES: { id: PipelineStage; label: string; description: string; order: number; icon: LucideIcon }[] = [
    { id: "bible", label: "Intelligence Hub", description: "Mandatory Brand DNA and Project Bible guidelines.", order: 1, icon: Brain },
    { id: "script", label: "Command Center", description: "Linguistic output from Showrunner or Creative Director.", order: 2, icon: PenTool },
    { id: "breakdown", label: "Director's Office", description: "Technical scene breakdown and orchestration logic.", order: 3, icon: Layout },
    { id: "characters", label: "Casting Director", description: "Establish character consistency and actor anchors.", order: 4, icon: User },
    { id: "production-design", label: "Art Department", description: "Architectural environments, props, and textures.", order: 5, icon: Box },
    { id: "cinematography", label: "Cinematography", description: "Govern lighting, lenses, and Nanobana parameters.", order: 6, icon: Video },
    { id: "storyboard", label: "Storyboard Lab", description: "Generate consistent cinematic frames with AI anchors.", order: 7, icon: Sparkles },
    { id: "shot-designer", label: "Shot Designer", description: "Design and refine individual shots with 4K rendering.", order: 8, icon: Crosshair },
    { id: "video", label: "Motion Synthesis", description: "High-fidelity video generation via AI Video Engine.", order: 9, icon: Zap },
    { id: "editor", label: "Studio Editor", description: "Sequence clips and refine temporal synchronization.", order: 10, icon: Music },
    { id: "export", label: "Final Master", description: "Render, validate, and distribute the completed asset.", order: 11, icon: CheckCircle2 },
];

export const MODEL_CATEGORIES = [
    { id: "text", name: "Linguistic Engines", icon: Type },
    { id: "image", name: "Visual Synthesizers", icon: ImageIcon },
    { id: "video", name: "Temporal Generators", icon: Video },
] as const;
