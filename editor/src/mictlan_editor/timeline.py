from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from uuid import uuid4

from PySide6.QtCore import QPoint, Qt, Signal
from PySide6.QtGui import QColor, QPainter, QPen
from PySide6.QtWidgets import QWidget

from .models import MediaClip
from .theme import ACCENT, BORDER, MUTED, PANEL_ALT, TEXT

TRACKS = ("V2", "V1", "A1")


@dataclass(slots=True)
class TimelineClip:
    source: MediaClip
    track: str
    start_ms: int
    source_in_ms: int = 0
    source_out_ms: int | None = None
    clip_id: str = ""

    def __post_init__(self) -> None:
        if not self.clip_id:
            self.clip_id = uuid4().hex
        if self.source_out_ms is None:
            self.source_out_ms = max(1, round(self.source.duration * 1000))

    @property
    def duration_ms(self) -> int:
        return max(1, (self.source_out_ms or 1) - self.source_in_ms)

    @property
    def end_ms(self) -> int:
        return self.start_ms + self.duration_ms


class TimelineModel:
    """Non-destructive sequence model: source media is never modified."""

    def __init__(self) -> None:
        self.clips: list[TimelineClip] = []

    def add(self, source: MediaClip, track: str = "V1", start_ms: int | None = None) -> TimelineClip:
        track = track if track in TRACKS else "V1"
        if start_ms is None:
            start_ms = max((clip.end_ms for clip in self.clips if clip.track == track), default=0)
        clip = TimelineClip(source, track, max(0, start_ms))
        self.clips.append(clip)
        return clip

    def get(self, clip_id: str | None) -> TimelineClip | None:
        return next((clip for clip in self.clips if clip.clip_id == clip_id), None)

    def at(self, position_ms: int, track: str | None = None) -> TimelineClip | None:
        return next((clip for clip in self.clips if (track is None or clip.track == track) and clip.start_ms <= position_ms < clip.end_ms), None)

    def split_at(self, position_ms: int, track: str | None = None) -> TimelineClip | None:
        clip = self.at(position_ms, track)
        if clip is None or position_ms <= clip.start_ms or position_ms >= clip.end_ms:
            return None
        offset = position_ms - clip.start_ms
        right = TimelineClip(clip.source, clip.track, position_ms, clip.source_in_ms + offset, clip.source_out_ms)
        clip.source_out_ms = clip.source_in_ms + offset
        self.clips.append(right)
        return right

    def trim_left(self, clip_id: str, new_start_ms: int) -> TimelineClip | None:
        clip = self.get(clip_id)
        if clip is None: return None
        new_start_ms = max(0, min(new_start_ms, clip.end_ms - 1))
        delta = new_start_ms - clip.start_ms
        delta = max(-clip.source_in_ms, delta)
        max_source_delta = max(0, (clip.source_out_ms or 1) - clip.source_in_ms - 1)
        delta = min(delta, max_source_delta)
        clip.start_ms += delta; clip.source_in_ms += delta
        return clip

    def trim_right(self, clip_id: str, new_end_ms: int) -> TimelineClip | None:
        clip = self.get(clip_id)
        if clip is None: return None
        new_end_ms = max(clip.start_ms + 1, new_end_ms)
        source_end = clip.source_in_ms + (new_end_ms - clip.start_ms)
        clip.source_out_ms = min(clip.source_out_ms or source_end, source_end)
        return clip

    def move(self, clip_id: str, new_start_ms: int, track: str | None = None) -> TimelineClip | None:
        clip = self.get(clip_id)
        if clip is None: return None
        clip.start_ms = max(0, new_start_ms)
        if track in TRACKS: clip.track = track
        return clip

    def remove(self, clip_id: str) -> bool:
        before = len(self.clips); self.clips = [clip for clip in self.clips if clip.clip_id != clip_id]
        return len(self.clips) != before


class TimelineWidget(QWidget):
    selectionChanged = Signal(object)
    playheadRequested = Signal(int)
    changed = Signal()

    LEFT = 48
    TOP = 25
    TRACK_HEIGHT = 40
    PX_PER_SECOND = 80

    def __init__(self, model: TimelineModel, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.model = model
        self.selected_id: str | None = None
        self.playhead_ms = 0
        self._gesture: str | None = None
        self._gesture_start_x = 0
        self._gesture_original_start = 0
        self._gesture_original_end = 0
        self.setMinimumHeight(self.TOP + len(TRACKS) * self.TRACK_HEIGHT + 10)
        self.setMinimumWidth(900)
        self.setMouseTracking(True)
        self.setStyleSheet(f"background: {PANEL_ALT}; border: 1px solid {BORDER}; border-radius: 4px;")

    def time_to_x(self, milliseconds: int) -> int:
        return self.LEFT + round(milliseconds / 1000 * self.PX_PER_SECOND)

    def x_to_time(self, x: int) -> int:
        return max(0, round((x - self.LEFT) / self.PX_PER_SECOND * 1000))

    def _track_y(self, track: str) -> int:
        return self.TOP + TRACKS.index(track) * self.TRACK_HEIGHT

    def _hit(self, point: QPoint) -> tuple[TimelineClip | None, str | None]:
        for clip in reversed(self.model.clips):
            x = self.time_to_x(clip.start_ms); end = self.time_to_x(clip.end_ms); y = self._track_y(clip.track)
            if x <= point.x() <= end and y <= point.y() <= y + self.TRACK_HEIGHT - 4:
                edge = "left" if point.x() - x <= 8 else "right" if end - point.x() <= 8 else "move"
                return clip, edge
        return None, None

    def paintEvent(self, _event) -> None:
        painter = QPainter(self); painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        painter.fillRect(self.rect(), QColor(PANEL_ALT))
        painter.setPen(QPen(QColor(MUTED), 1))
        for seconds in range(0, max(10, self.width() // self.PX_PER_SECOND) + 1, 5):
            x = self.time_to_x(seconds * 1000); painter.drawLine(x, 0, x, self.height())
            painter.drawText(x + 3, 16, f"{seconds:02d}s")
        for index, track in enumerate(TRACKS):
            y = self._track_y(track); painter.setPen(QPen(QColor(BORDER), 1)); painter.drawLine(0, y + self.TRACK_HEIGHT, self.width(), y + self.TRACK_HEIGHT)
            painter.setPen(QColor(ACCENT if track != "A1" else "#6B8FB3")); painter.drawText(12, y + 23, track)
        for clip in self.model.clips:
            x = self.time_to_x(clip.start_ms); width = max(24, self.time_to_x(clip.end_ms) - x); y = self._track_y(clip.track)
            selected = clip.clip_id == self.selected_id; color = QColor("#80663B" if selected else "#46576A") if clip.track != "A1" else QColor("#3F5D76")
            painter.setBrush(color); painter.setPen(QPen(QColor(ACCENT if selected else BORDER), 2 if selected else 1)); painter.drawRoundedRect(x, y + 3, width, self.TRACK_HEIGHT - 8, 4, 4)
            painter.setPen(QColor(TEXT)); painter.drawText(x + 8, y + 22, clip.source.name[: max(5, width // 8)])
        playhead_x = self.time_to_x(self.playhead_ms); painter.setPen(QPen(QColor("#E35D6A"), 2)); painter.drawLine(playhead_x, 0, playhead_x, self.height())

    def select_source(self, source: MediaClip) -> TimelineClip | None:
        match = next((clip for clip in self.model.clips if clip.source.path == source.path), None)
        self.selected_id = match.clip_id if match else None; self.update(); return match

    def set_playhead(self, milliseconds: int) -> None:
        self.playhead_ms = max(0, milliseconds)
        self.update()

    def add_source(self, source: MediaClip, track: str = "V1") -> TimelineClip:
        clip = self.model.add(source, track); self.selected_id = clip.clip_id; self.changed.emit(); self.update(); return clip

    def select_at_playhead(self) -> TimelineClip | None:
        clip = self.model.at(self.playhead_ms)
        self.selected_id = clip.clip_id if clip else None; self.selectionChanged.emit(clip); self.update(); return clip

    def mousePressEvent(self, event) -> None:
        clip, mode = self._hit(event.position().toPoint())
        if clip:
            self.selected_id = clip.clip_id; self.selectionChanged.emit(clip)
            self._gesture = mode; self._gesture_start_x = event.position().x(); self._gesture_original_start = clip.start_ms; self._gesture_original_end = clip.end_ms
        else:
            self._gesture = None; self.playhead_ms = self.x_to_time(round(event.position().x())); self.playheadRequested.emit(self.playhead_ms)
        self.update()

    def mouseMoveEvent(self, event) -> None:
        clip = self.model.get(self.selected_id)
        if not clip or not self._gesture: return
        delta = self.x_to_time(round(event.position().x())) - self.x_to_time(round(self._gesture_start_x))
        if self._gesture == "move":
            track_index = max(0, min(len(TRACKS) - 1, (round(event.position().y()) - self.TOP) // self.TRACK_HEIGHT))
            self.model.move(clip.clip_id, self._gesture_original_start + delta, TRACKS[track_index])
        elif self._gesture == "left": self.model.trim_left(clip.clip_id, self._gesture_original_start + delta)
        elif self._gesture == "right": self.model.trim_right(clip.clip_id, self._gesture_original_end + delta)
        self.changed.emit(); self.update()

    def mouseReleaseEvent(self, _event) -> None:
        self._gesture = None
