// Simple in-memory storage for projects (replace with database in production)

interface Project {
    id: number;
    name: string;
    userId: number;
    createdAt: Date;
    content?: {
        brief?: string;
        script?: string;
        characters?: any[];
        visualStyle?: any;
        storyboard?: any[];
    };
}

const projects = new Map<number, Project>();
let nextProjectId = 1;

export async function createProject(userId: number, name: string): Promise<number> {
    const projectId = nextProjectId++;
    const project: Project = {
        id: projectId,
        name,
        userId,
        createdAt: new Date(),
        content: {},
    };
    projects.set(projectId, project);
    console.log(`[Storage] Created project ${projectId}: ${name} for user ${userId}`);
    return projectId;
}

export async function getUserProjects(userId: number): Promise<Project[]> {
    const userProjects = Array.from(projects.values())
        .filter(p => p.userId === userId)
        .map(p => ({
            id: p.id,
            name: p.name,
            userId: p.userId,
            createdAt: p.createdAt,
        }));
    console.log(`[Storage] Found ${userProjects.length} projects for user ${userId}`);
    return userProjects;
}

export async function getProject(projectId: number): Promise<Project | null> {
    const project = projects.get(projectId);
    return project || null;
}

export async function getProjectContent(projectId: number) {
    const project = projects.get(projectId);
    return project?.content || {};
}

export async function updateProjectContent(data: {
    projectId: number;
    brief?: string;
    script?: string;
    characters?: any[];
    visualStyle?: any;
    storyboard?: any[];
}): Promise<void> {
    const project = projects.get(data.projectId);
    if (!project) {
        throw new Error(`Project ${data.projectId} not found`);
    }

    if (!project.content) {
        project.content = {};
    }

    if (data.brief !== undefined) project.content.brief = data.brief;
    if (data.script !== undefined) project.content.script = data.script;
    if (data.characters !== undefined) project.content.characters = data.characters;
    if (data.visualStyle !== undefined) project.content.visualStyle = data.visualStyle;
    if (data.storyboard !== undefined) project.content.storyboard = data.storyboard;

    console.log(`[Storage] Updated content for project ${data.projectId}`);
}

export async function deleteProject(projectId: number): Promise<void> {
    projects.delete(projectId);
    console.log(`[Storage] Deleted project ${projectId}`);
}

// Stub functions for other features (implement as needed)
export async function getStoryboardImages() { return []; }
export async function saveStoryboardImage() { return 1; }
export async function getReferenceImages() { return []; }
export async function saveReferenceImage() { return 1; }
export async function deleteReferenceImage() { }
export async function getGeneratedVideos() { return []; }
export async function createGeneratedVideo() { return 1; }
export async function updateGeneratedVideo() { }
export async function createEditorProject() { return 1; }
export async function getEditorProjectsByProjectId() { return []; }
export async function getEditorClips() { return []; }
export async function createEditorClip() { return 1; }
export async function updateEditorClip() { }
export async function deleteEditorClip() { }
export async function createEditorTrack() { return 1; }
export async function getEditorTracks() { return []; }
export async function createEditorExport() { return 1; }
export async function getEditorExports() { return []; }
export async function updateEditorExport() { }
export async function createComment() { return 1; }
export async function getClipComments() { return []; }
export async function updateComment() { }
export async function deleteComment() { }
export async function getAnimaticConfig() { return null; }
export async function saveAnimaticConfig() { return 1; }
export async function updateFrameDurations() { }
export async function updateAnimaticAudio() { }
export async function getStoryboardFrameOrder() { return []; }
export async function updateFrameOrder() { }
export async function getFrameHistory() { return []; }
export async function createFrameHistoryVersion() { return 1; }
export async function getFrameNotes() { return []; }
export async function saveFrameNotes() { return 1; }
export async function deleteFrameNotes() { }
export async function createBrand() { return 1; }
export async function getBrand() { return null; }
export async function getUserBrands() { return []; }
export async function updateBrand() { }
export async function deleteBrand() { }
export async function createCharacter() { return 1; }
export async function getCharacter() { return null; }
export async function getProjectCharacters() { return []; }
export async function getLockedCharacter() { return null; }
export async function lockCharacter() { return true; }
export async function unlockAllCharacters() { }
export async function updateCharacter() { }
export async function deleteCharacter() { }
export async function updateStoryboardVideo() { }
