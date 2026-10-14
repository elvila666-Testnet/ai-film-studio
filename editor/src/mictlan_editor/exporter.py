from __future__ import annotations

import json
import shutil
import subprocess
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Callable

from .playback import format_timecode
from .timeline import TimelineClip, TimelineModel

PROJECT_WIDTH = 1920
PROJECT_HEIGHT = 1080
PROJECT_FPS = 24.0


def _video_clips(model: TimelineModel) -> list[TimelineClip]:
    clips = [clip for clip in model.clips if clip.track in {"V1", "V2"}]
    return sorted(clips, key=lambda clip: (clip.start_ms, clip.track))


def export_otio(model: TimelineModel, output: Path, project_name: str = "Mictlan Project") -> Path:
    """Write a portable OTIO-shaped JSON interchange file without extra dependencies."""
    tracks: dict[str, list[dict]] = {}
    for clip in model.clips:
        tracks.setdefault(clip.track, []).append({
            "OTIO_SCHEMA": "Clip.2",
            "name": clip.source.name,
            "media_reference": {"OTIO_SCHEMA": "ExternalReference.1", "target_url": clip.source.path.resolve().as_uri()},
            "source_range": {
                "OTIO_SCHEMA": "TimeRange.1",
                "start_time": {"OTIO_SCHEMA": "RationalTime.1", "rate": clip.source.fps or PROJECT_FPS, "value": round(clip.source_in_ms / 1000 * (clip.source.fps or PROJECT_FPS))},
                "duration": {"OTIO_SCHEMA": "RationalTime.1", "rate": clip.source.fps or PROJECT_FPS, "value": round(clip.duration_ms / 1000 * (clip.source.fps or PROJECT_FPS))},
            },
            "timeline_start_ms": clip.start_ms,
            "clip_id": clip.clip_id,
        })
    payload = {
        "OTIO_SCHEMA": "Timeline.1",
        "name": project_name,
        "global_start_time": {"OTIO_SCHEMA": "RationalTime.1", "rate": PROJECT_FPS, "value": 0},
        "tracks": [{"OTIO_SCHEMA": "Track.1", "name": name, "kind": "Audio" if name == "A1" else "Video", "children": items} for name, items in tracks.items()],
        "metadata": {"mictlan": {"transitions": [item.__dict__ if hasattr(item, "__dict__") else {"kind": item.kind, "duration_ms": item.duration_ms, "left_clip_id": item.left_clip_id, "right_clip_id": item.right_clip_id} for item in model.transitions], "titles": [{"text": item.text, "start_ms": item.start_ms, "duration_ms": item.duration_ms, "track": item.track} for item in model.titles], "format": "1920x1080", "fps": PROJECT_FPS}},
    }
    output.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    return output


def export_edl(model: TimelineModel, output: Path, title: str = "MICTLAN SEQUENCE") -> Path:
    clips = [clip for clip in model.clips if clip.track == "V1"] or _video_clips(model)
    fps = clips[0].source.fps if clips and clips[0].source.fps else PROJECT_FPS
    lines = [title, "FCM: NON-DROP FRAME", ""]
    for index, clip in enumerate(sorted(clips, key=lambda item: item.start_ms), 1):
        record_in = format_timecode(clip.start_ms, fps)
        record_out = format_timecode(clip.end_ms, fps)
        source_in = format_timecode(clip.source_in_ms, fps)
        source_out = format_timecode(clip.source_out_ms or clip.source_in_ms + clip.duration_ms, fps)
        lines.extend([f"{index:03d}  AX       V     C        {source_in} {source_out} {record_in} {record_out}", f"* FROM CLIP NAME: {clip.source.name}", f"* SOURCE FILE: {clip.source.path}", ""])
    output.write_text("\n".join(lines), encoding="utf-8")
    return output


def export_fcp_xml(model: TimelineModel, output: Path, title: str = "Mictlan Sequence") -> Path:
    clips = [clip for clip in model.clips if clip.track == "V1"] or _video_clips(model)
    sequence = ET.Element("sequence", {"id": "mictlan-sequence"}); ET.SubElement(sequence, "name").text = title
    ET.SubElement(sequence, "duration").text = str(sum(round(item.duration_ms / 1000 * PROJECT_FPS) for item in clips))
    rate = ET.SubElement(sequence, "rate"); ET.SubElement(rate, "timebase").text = str(round(PROJECT_FPS)); ET.SubElement(rate, "ntsc").text = "FALSE"
    media = ET.SubElement(sequence, "media"); video = ET.SubElement(media, "video")
    for clip in clips:
        item = ET.SubElement(video, "clipitem", {"id": clip.clip_id}); ET.SubElement(item, "name").text = clip.source.name; ET.SubElement(item, "file").text = str(clip.source.path); ET.SubElement(item, "start").text = str(round(clip.start_ms / 1000 * PROJECT_FPS)); ET.SubElement(item, "end").text = str(round(clip.end_ms / 1000 * PROJECT_FPS)); ET.SubElement(item, "in").text = str(round(clip.source_in_ms / 1000 * PROJECT_FPS)); ET.SubElement(item, "out").text = str(round((clip.source_out_ms or clip.source_in_ms + clip.duration_ms) / 1000 * PROJECT_FPS))
    ET.ElementTree(sequence).write(output, encoding="utf-8", xml_declaration=True)
    return output


def _escape_drawtext(text: str) -> str:
    return text.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'").replace("%", "\\%")


def render_sequence(model: TimelineModel, output: Path, width: int = PROJECT_WIDTH, height: int = PROJECT_HEIGHT, fps: float = PROJECT_FPS, progress: Callable[[str], None] | None = None) -> Path:
    """Render video tracks, optional A1 audio and title overlays to a constant 16:9 MP4."""
    clips = _video_clips(model)
    if not clips:
        raise ValueError("La secuencia no contiene clips de vídeo para renderizar")
    if shutil.which("ffmpeg") is None:
        raise RuntimeError("FFmpeg no está disponible en PATH")
    audio_clips = sorted((clip for clip in model.clips if clip.track == "A1"), key=lambda clip: clip.start_ms)
    command = ["ffmpeg", "-y"]
    for clip in clips:
        command.extend(["-i", str(clip.source.path)])
    for clip in audio_clips:
        command.extend(["-i", str(clip.source.path)])
    filters: list[str] = []
    for index, clip in enumerate(clips):
        start = clip.source_in_ms / 1000
        end = (clip.source_out_ms or clip.source_in_ms + clip.duration_ms) / 1000
        filters.append(f"[{index}:v]trim=start={start:.3f}:end={end:.3f},setpts=PTS-STARTPTS,scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2,fps={fps:g}[v{index}]")
    joined = "".join(f"[v{index}]" for index in range(len(clips)))
    filters.append(f"{joined}concat=n={len(clips)}:v=1:a=0[base]")
    video_label = "[base]"
    audio_label = None
    if audio_clips:
        audio_inputs = []
        offset = len(clips)
        for index, clip in enumerate(audio_clips):
            source_end = (clip.source_out_ms or clip.source_in_ms + clip.duration_ms) / 1000
            audio_inputs.append(f"[{offset + index}:a]atrim=start={clip.source_in_ms / 1000:.3f}:end={source_end:.3f},asetpts=PTS-STARTPTS[a{index}]")
        joined_audio = "".join(f"[a{index}]" for index in range(len(audio_clips)))
        filters.extend(audio_inputs)
        filters.append(f"{joined_audio}concat=n={len(audio_clips)}:v=0:a=1[aout]")
        audio_label = "[aout]"
    font = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    for title_index, title in enumerate(model.titles):
        next_label = f"[title{title_index}]"
        font_arg = f":fontfile='{font}'" if Path(font).exists() else ""
        text = _escape_drawtext(title.text)
        filters.append(f"{video_label}drawtext=text='{text}'{font_arg}:fontcolor=white:fontsize=64:box=1:boxcolor=black@0.55:boxborderw=18:x=(w-text_w)/2:y=h-180:enable='between(t,{title.start_ms / 1000:.3f},{title.end_ms / 1000:.3f})'{next_label}")
        video_label = next_label
    command.extend(["-filter_complex", ";".join(filters), "-map", video_label])
    if audio_label:
        command.extend(["-map", audio_label, "-c:a", "aac", "-b:a", "192k"])
    else:
        command.append("-an")
    command.extend(["-r", str(fps), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(output)])
    if progress: progress("Rendering 1920×1080 16:9…")
    result = subprocess.run(command, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise RuntimeError(result.stderr[-3000:] or "FFmpeg no pudo completar el render")
    return output
