from __future__ import annotations


def format_timecode(milliseconds: int, fps: float = 24.0) -> str:
    """Format milliseconds as HH:MM:SS:FF using the active clip frame rate."""
    fps_int = max(1, round(fps or 24.0))
    total_frames = max(0, round(milliseconds / 1000 * fps_int))
    frames = total_frames % fps_int
    total_seconds = total_frames // fps_int
    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}:{frames:02d}"


def frame_duration_ms(fps: float = 24.0) -> int:
    return max(1, round(1000 / (fps or 24.0)))
