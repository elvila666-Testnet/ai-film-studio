from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

from .models import MediaClip

VIDEO_EXTENSIONS = {".mov", ".mp4", ".mxf", ".avi", ".mkv", ".webm", ".m4v"}
AUDIO_EXTENSIONS = {".wav", ".mp3", ".aac", ".flac", ".m4a"}


def _run(command: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, capture_output=True, text=True, check=False)


def probe_media(path: Path, thumbnail_dir: Path | None = None) -> MediaClip:
    """Read media metadata with ffprobe; raise a useful error when unavailable."""
    result = _run([
        "ffprobe", "-v", "error", "-show_format", "-show_streams", "-of", "json", str(path)
    ])
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or f"No se pudo leer {path.name}")
    payload = json.loads(result.stdout or "{}")
    streams = payload.get("streams", [])
    video = next((stream for stream in streams if stream.get("codec_type") == "video"), {})
    duration = float(video.get("duration") or payload.get("format", {}).get("duration") or 0)
    rate = video.get("r_frame_rate", "0/1")
    try:
        numerator, denominator = rate.split("/")
        fps = float(numerator) / float(denominator or 1)
    except (ValueError, ZeroDivisionError):
        fps = 0.0
    clip = MediaClip(
        path=path,
        name=path.name,
        duration=duration,
        width=int(video.get("width") or 0),
        height=int(video.get("height") or 0),
        fps=fps,
        codec=str(video.get("codec_name") or "audio" if not video else video.get("codec_name") or "—"),
        metadata=payload,
    )
    if thumbnail_dir and video:
        thumbnail_dir.mkdir(parents=True, exist_ok=True)
        thumbnail = thumbnail_dir / f"{path.stem}.jpg"
        thumb = _run([
            "ffmpeg", "-y", "-ss", "1", "-i", str(path), "-frames:v", "1", "-vf", "scale=320:-2", str(thumbnail)
        ])
        if thumb.returncode == 0 and thumbnail.exists():
            clip.thumbnail = thumbnail
    return clip


def classify(path: Path) -> str:
    if path.suffix.lower() in AUDIO_EXTENSIONS:
        return "Audio"
    if path.suffix.lower() in VIDEO_EXTENSIONS:
        return "Footage"
    return "Footage"


def discover_media(folder: Path) -> list[Path]:
    return sorted(
        (item for item in folder.rglob("*") if item.is_file() and item.suffix.lower() in VIDEO_EXTENSIONS | AUDIO_EXTENSIONS),
        key=lambda item: item.name.lower(),
    )


def tools_available() -> bool:
    return shutil.which("ffprobe") is not None and shutil.which("ffmpeg") is not None
