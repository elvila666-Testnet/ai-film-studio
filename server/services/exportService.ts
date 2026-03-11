import { v4 as uuidv4 } from 'uuid';
import { Storage } from '@google-cloud/storage';

// Initialize GCS for saving the export
const storage = new Storage();
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'ai-film-studio-assets';

interface ShotData {
    id: number;
    title: string;
    imageUrl: string;
    videoUrl?: string | null;
    duration?: number; // in seconds
}

/**
 * Generates an FCPXML (Final Cut Pro XML) file for a project.
 * Compatible with DaVinci Resolve and Adobe Premiere Pro (via import).
 */
export async function generateFCPXML(
    projectId: number,
    projectName: string,
    shots: ShotData[]
): Promise<string> {
    const fps = 24;
    const timebase = 24;
    const width = 1920;
    const height = 1080;

    // Header
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="5">
<sequence id="sequence-1">
    <name>${projectName}</name>
    <duration>${shots.length * fps * 4}</duration> 
    <rate>
        <timebase>${timebase}</timebase>
        <ntsc>FALSE</ntsc>
    </rate>
    <media>
        <video>
            <format>
                <samplecharacteristics>
                    <rate>
                        <timebase>${timebase}</timebase>
                    </rate>
                    <width>${width}</width>
                    <height>${height}</height>
                    <pixelaspectratio>square</pixelaspectratio>
                </samplecharacteristics>
            </format>
            <track>
`;

    // Clips
    let startTime = 0;

    shots.forEach((shot, index) => {
        // Default duration 4 seconds if not specified
        const shotDurationSec = shot.duration || 4;
        const shotDurationFrames = shotDurationSec * fps;
        const endTime = startTime + shotDurationFrames;

        // Use video URL if available, otherwise image URL
        // In a real NLE, using an image as a clip requires specific handling, 
        // but pointing to the file usually works.
        const fileUrl = shot.videoUrl || shot.imageUrl;
        const fileName = fileUrl.split('/').pop() || `shot-${shot.id}`;

        xml += `                <clipitem id="clipitem-${index}">
                    <name>${shot.title || `Shot ${index + 1}`}</name>
                    <duration>${shotDurationFrames}</duration>
                    <rate>
                        <timebase>${timebase}</timebase>
                    </rate>
                    <start>${startTime}</start>
                    <end>${endTime}</end>
                    <in>0</in>
                    <out>${shotDurationFrames}</out>
                    <file id="file-${index}">
                        <name>${fileName}</name>
                        <pathurl>${fileUrl}</pathurl>
                        <rate>
                            <timebase>${timebase}</timebase>
                        </rate>
                        <duration>${shotDurationFrames}</duration>
                        <media>
                            <video>
                                <samplecharacteristics>
                                    <width>${width}</width>
                                    <height>${height}</height>
                                </samplecharacteristics>
                            </video>
                        </media>
                    </file>
                </clipitem>
`;
        startTime = endTime;
    });

    // Footer
    xml += `            </track>
        </video>
    </media>
</sequence>
</xmeml>`;

    // Save to GCS
    const filename = `projects/${projectId}/exports/${uuidv4()}.xml`;
    const file = storage.bucket(BUCKET_NAME).file(filename);

    await file.save(xml, {
        contentType: 'application/xml',
        metadata: {
            cacheControl: 'no-cache',
        },
    });

    // Return public URL
    return `https://storage.googleapis.com/${BUCKET_NAME}/${filename}`;
}

/**
 * Generates a Nuke (.nk) script for VFX workflows.
 * Includes ACES 1.3 configuration, accurate aspect ratios, and framing transforms.
 */
export async function generateNukeScript(
    projectId: number,
    projectName: string,
    shots: ShotData[]
): Promise<string> {
    const width = 1920;
    const height = 1080;
    const pixelAspect = 1.0; // Standard for digital delivery

    let nk = `Root {
 inputs 0
 format "${width} ${height} 0 0 ${width} ${height} 1 HD_1080"
 proxy_type scale
 proxy_format "1024 778 0 0 1024 778 1 1K_Super_35(full-ap)"
 colorManagement OCIO
 OCIO_config aces_1.3
 workingSpaceLUT ACES - ACEScg
 monitorLut Rec.709
 name "${projectName}_VFX"
}
`;

    shots.forEach((shot, index) => {
        const fileUrl = shot.videoUrl || shot.imageUrl;
        const xPos = index * 200;

        nk += `
Read {
 inputs 0
 file "${fileUrl}"
 format "${width} ${height} 0 0 ${width} ${height} ${pixelAspect} HD_1080"
 origset true
 name Read_${shot.id}_${index}
 xpos ${xPos}
 ypos 0
}
Transform {
 translate {0 0}
 rotate 0
 scale 1
 center {${width / 2} ${height / 2}}
 name Transform_Framing_${index}
 xpos ${xPos}
 ypos 100
}
Write {
 file "render/shot_${index + 1}_v01.####.exr"
 file_type exr
 name Write_Output_${index}
 xpos ${xPos}
 ypos 200
}
`;
    });

    // Save to GCS
    const filename = `projects/${projectId}/exports/${uuidv4()}.nk`;
    const bucket = storage.bucket(BUCKET_NAME);
    const file = bucket.file(filename);

    await file.save(nk, {
        contentType: 'text/plain', // Nuke scripts are plain text
        metadata: {
            cacheControl: 'no-cache',
        },
    });

    // Return public URL
    return `https://storage.googleapis.com/${BUCKET_NAME}/${filename}`;
}
