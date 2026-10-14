from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass(slots=True)
class MediaClip:
    """A source clip known by the project bin."""

    path: Path
    name: str
    duration: float = 0.0
    width: int = 0
    height: int = 0
    fps: float = 0.0
    codec: str = ""
    thumbnail: Path | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def resolution(self) -> str:
        return f"{self.width}×{self.height}" if self.width and self.height else "—"

    @property
    def duration_label(self) -> str:
        total = max(0, int(self.duration))
        return f"{total // 3600:02d}:{(total % 3600) // 60:02d}:{total % 60:02d}"


@dataclass(slots=True)
class Bin:
    name: str
    clips: list[MediaClip] = field(default_factory=list)


@dataclass(slots=True)
class Project:
    name: str = "Mictlan Project"
    bins: list[Bin] = field(default_factory=lambda: [Bin("Footage"), Bin("Audio"), Bin("VFX"), Bin("Exports")])
    selected_bin: str = "Footage"

    def add_clip(self, clip: MediaClip, bin_name: str | None = None) -> None:
        target = bin_name or self.selected_bin
        for current in self.bins:
            if current.name == target:
                if not any(existing.path == clip.path for existing in current.clips):
                    current.clips.append(clip)
                return
        self.bins.append(Bin(target, [clip]))
