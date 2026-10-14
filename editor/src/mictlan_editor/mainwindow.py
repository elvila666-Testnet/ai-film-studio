from __future__ import annotations

import os
from pathlib import Path

from PySide6.QtCore import QUrl, Qt, QSize
from PySide6.QtGui import QAction, QIcon, QKeyEvent, QPixmap
from PySide6.QtMultimedia import QAudioOutput, QMediaPlayer
from PySide6.QtMultimediaWidgets import QVideoWidget
from PySide6.QtWidgets import (
    QFileDialog, QFrame, QHBoxLayout, QLabel, QListWidget, QListWidgetItem,
    QMainWindow, QMessageBox, QPushButton, QSlider, QSplitter, QStackedWidget,
    QStatusBar, QToolBar, QTreeWidget, QTreeWidgetItem, QVBoxLayout, QWidget,
    QSizePolicy,
)

from .media import classify, probe_media, tools_available
from .models import Bin, MediaClip, Project
from .playback import format_timecode, frame_duration_ms
from .theme import ACCENT, BORDER, MUTED, PANEL, PANEL_ALT
from .timeline import TimelineModel, TimelineWidget


class MainWindow(QMainWindow):
    def __init__(self) -> None:
        super().__init__()
        self.project = Project()
        self.clips: dict[str, MediaClip] = {}
        self.selected_clip: MediaClip | None = None
        self.timeline_model = TimelineModel()
        self.thumbnail_dir = Path.home() / ".mictlan" / "thumbnails"
        self.in_point: int | None = None
        self.out_point: int | None = None
        self._updating_slider = False
        self.setWindowTitle("Mictlan Editor  /  Untitled Project")
        self.resize(1480, 900)
        self._build_player()
        self._build_toolbar()
        self._build_workspace()
        self.status = QStatusBar(self)
        self.setStatusBar(self.status)
        self.status.showMessage("Ready · Import media to begin")
        self._refresh_bins()

    def _build_player(self) -> None:
        self.player = QMediaPlayer(self)
        # PipeWire can be absent in CI, containers and remote sandboxes. Keep
        # video playback available there; desktop users can opt into audio.
        self.audio_output = QAudioOutput(self) if os.getenv("MICTLAN_ENABLE_AUDIO") == "1" else None
        if self.audio_output is not None:
            self.player.setAudioOutput(self.audio_output)
        self.player.positionChanged.connect(self._position_changed)
        self.player.durationChanged.connect(self._duration_changed)
        self.player.playbackStateChanged.connect(self._playback_state_changed)
        self.player.errorOccurred.connect(self._player_error)

    def _build_toolbar(self) -> None:
        toolbar = QToolBar("Main", self)
        toolbar.setIconSize(QSize(18, 18)); toolbar.setMovable(False); self.addToolBar(toolbar)
        brand = QLabel("  MICTLAN  "); brand.setStyleSheet(f"color: {ACCENT}; font-weight: 800; letter-spacing: 2px;"); toolbar.addWidget(brand)
        toolbar.addSeparator()
        for label, callback in (("New", self.new_project), ("Open", self.open_project), ("Save", self.save_project)):
            action = QAction(label, self); action.triggered.connect(callback); toolbar.addAction(action)
        toolbar.addSeparator()
        import_action = QAction("＋ Import media", self); import_action.triggered.connect(self.import_media); toolbar.addAction(import_action)
        spacer = QWidget(); spacer.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Preferred); toolbar.addWidget(spacer)
        toolbar.addWidget(QLabel("PROJECT  /  MICTLAN"))

    def _build_workspace(self) -> None:
        root = QWidget(); root_layout = QVBoxLayout(root); root_layout.setContentsMargins(10, 10, 10, 8); root_layout.setSpacing(8)
        top = QSplitter(Qt.Orientation.Horizontal); top.setChildrenCollapsible(False)
        top.addWidget(self._make_bins_panel()); top.addWidget(self._make_viewer_panel()); top.addWidget(self._make_inspector_panel()); top.setSizes([230, 850, 300])
        root_layout.addWidget(top, 1); root_layout.addWidget(self._make_timeline(), 0); self.setCentralWidget(root)

    def _panel(self, title: str) -> tuple[QFrame, QVBoxLayout]:
        frame = QFrame(); frame.setStyleSheet(f"QFrame {{ background: {PANEL}; border: 1px solid {BORDER}; border-radius: 6px; }}")
        layout = QVBoxLayout(frame); layout.setContentsMargins(12, 12, 12, 12); layout.setSpacing(9)
        heading = QLabel(title.upper()); heading.setStyleSheet(f"color: {MUTED}; font-size: 10px; font-weight: 700; letter-spacing: 1px; border: 0;"); layout.addWidget(heading)
        return frame, layout

    def _make_bins_panel(self) -> QWidget:
        frame, layout = self._panel("Project bins")
        self.bin_tree = QTreeWidget(); self.bin_tree.setHeaderHidden(True); self.bin_tree.itemClicked.connect(self._bin_clicked); layout.addWidget(self.bin_tree, 1)
        add_bin = QPushButton("＋ New bin"); add_bin.clicked.connect(self._new_bin); layout.addWidget(add_bin)
        return frame

    def _make_viewer_panel(self) -> QWidget:
        frame, layout = self._panel("Source viewer")
        self.viewer_stack = QStackedWidget(); self.viewer_stack.setMinimumHeight(330)
        self.video_widget = QVideoWidget(); self.video_widget.setStyleSheet("background: #0B0D0F; border: 0;"); self.player.setVideoOutput(self.video_widget)
        empty = QFrame(); empty.setStyleSheet(f"background: #0B0D0F; border: 1px solid {BORDER}; border-radius: 4px;")
        empty_layout = QVBoxLayout(empty); self.preview = QLabel("NO CLIP LOADED\n\nImport media to start cutting"); self.preview.setAlignment(Qt.AlignmentFlag.AlignCenter); self.preview.setStyleSheet(f"color: {MUTED}; border: 0; letter-spacing: 1px;"); empty_layout.addWidget(self.preview)
        self.viewer_stack.addWidget(empty); self.viewer_stack.addWidget(self.video_widget); layout.addWidget(self.viewer_stack, 1)
        controls = QHBoxLayout(); controls.setSpacing(6)
        self.step_back = QPushButton("◀| "); self.step_back.setToolTip("Previous frame (Left)"); self.step_back.clicked.connect(lambda: self._step_frame(-1))
        self.play_button = QPushButton("▶"); self.play_button.setFixedWidth(48); self.play_button.setProperty("primary", True); self.play_button.clicked.connect(self._toggle_play)
        self.step_forward = QPushButton(" |▶"); self.step_forward.setToolTip("Next frame (Right)"); self.step_forward.clicked.connect(lambda: self._step_frame(1))
        self.in_button = QPushButton("I"); self.in_button.setToolTip("Set In point (I)"); self.in_button.clicked.connect(self.set_in_point)
        self.out_button = QPushButton("O"); self.out_button.setToolTip("Set Out point (O)"); self.out_button.clicked.connect(self.set_out_point)
        for button in (self.step_back, self.play_button, self.step_forward, self.in_button, self.out_button): controls.addWidget(button)
        controls.addStretch(); self.timecode = QLabel("00:00:00:00"); self.timecode.setStyleSheet("font-family: monospace; font-weight: 700;"); controls.addWidget(self.timecode); layout.addLayout(controls)
        self.range_label = QLabel("IN  —    OUT  —"); self.range_label.setStyleSheet(f"color: {MUTED}; font-family: monospace; border: 0;"); layout.addWidget(self.range_label)
        return frame

    def _make_inspector_panel(self) -> QWidget:
        frame, layout = self._panel("Clip inspector")
        self.inspector = QListWidget(); self.inspector.setSpacing(2); self.inspector.itemClicked.connect(self._clip_clicked); layout.addWidget(self.inspector, 1)
        return frame

    def _make_timeline(self) -> QWidget:
        frame, layout = self._panel("Timeline  /  Sequence 01")
        frame.setMinimumHeight(235)
        actions = QHBoxLayout()
        for label, callback in (("＋ Add V1", lambda: self._add_selected_to_timeline("V1")), ("＋ Add A1", lambda: self._add_selected_to_timeline("A1")), ("✂ Cut at playhead", self._cut_at_playhead), ("Trim left", self._trim_left), ("Trim right", self._trim_right), ("Delete clip", self._delete_timeline_clip)):
            button = QPushButton(label); button.clicked.connect(callback); actions.addWidget(button)
        actions.addStretch(); layout.addLayout(actions)
        self.timeline = TimelineWidget(self.timeline_model); self.timeline.selectionChanged.connect(self._timeline_selection_changed); self.timeline.playheadRequested.connect(self._timeline_playhead_requested); layout.addWidget(self.timeline, 1)
        return frame

    def _add_selected_to_timeline(self, track: str) -> None:
        if not self.selected_clip:
            self.status.showMessage("Select a clip in the bin before adding it to the timeline")
            return
        item = self.timeline.add_source(self.selected_clip, track)
        self.status.showMessage(f"Added {item.source.name} to {track}")

    def _cut_at_playhead(self) -> None:
        result = self.timeline_model.split_at(self.timeline.playhead_ms)
        if result:
            self.timeline.selected_id = result.clip_id; self.timeline.changed.emit(); self.timeline.update(); self.status.showMessage("Clip cut at playhead")
        else:
            self.status.showMessage("Place the playhead inside a timeline clip to cut")

    def _trim_left(self) -> None:
        clip = self.timeline_model.get(self.timeline.selected_id)
        if clip and clip.start_ms < self.timeline.playhead_ms < clip.end_ms:
            self.timeline_model.trim_left(clip.clip_id, self.timeline.playhead_ms); self.timeline.changed.emit(); self.timeline.update(); self.status.showMessage("Left edge trimmed")

    def _trim_right(self) -> None:
        clip = self.timeline_model.get(self.timeline.selected_id)
        if clip and clip.start_ms < self.timeline.playhead_ms < clip.end_ms:
            self.timeline_model.trim_right(clip.clip_id, self.timeline.playhead_ms); self.timeline.changed.emit(); self.timeline.update(); self.status.showMessage("Right edge trimmed")

    def _delete_timeline_clip(self) -> None:
        if self.timeline_model.remove(self.timeline.selected_id or ""):
            self.timeline.selected_id = None; self.timeline.changed.emit(); self.timeline.update(); self.status.showMessage("Timeline clip deleted")

    def _timeline_selection_changed(self, clip: object) -> None:
        if clip is not None:
            self.status.showMessage(f"Selected timeline clip · {clip.source.name}")

    def _timeline_playhead_requested(self, position: int) -> None:
        self.player.setPosition(position)

    def _refresh_bins(self) -> None:
        self.bin_tree.clear()
        for bin_model in self.project.bins:
            item = QTreeWidgetItem([f"▸  {bin_model.name}   ({len(bin_model.clips)})"]); item.setData(0, Qt.ItemDataRole.UserRole, bin_model.name); self.bin_tree.addTopLevelItem(item)

    def _bin_clicked(self, item: QTreeWidgetItem, _column: int) -> None:
        name = item.data(0, Qt.ItemDataRole.UserRole); self.project.selected_bin = name; self._show_bin_clips(name); self.status.showMessage(f"Bin selected · {name}")

    def _new_bin(self) -> None:
        name = f"Bin {len(self.project.bins) + 1}"; self.project.bins.append(Bin(name)); self._refresh_bins()

    def import_media(self) -> None:
        paths, _ = QFileDialog.getOpenFileNames(self, "Import media", "", "Media (*.mov *.mp4 *.mxf *.avi *.mkv *.webm *.wav *.mp3 *.aac *.flac *.m4a)")
        if not paths: return
        if not tools_available(): QMessageBox.critical(self, "FFmpeg no encontrado", "Instala FFmpeg y ffprobe para importar medios."); return
        imported, errors = 0, []
        for raw in paths:
            path = Path(raw)
            try:
                clip = probe_media(path, self.thumbnail_dir); self.project.add_clip(clip, classify(path)); self.clips[str(path)] = clip; imported += 1
            except Exception as exc: errors.append(f"{path.name}: {exc}")
        self._refresh_bins(); self._show_bin_clips(self.project.selected_bin); self.status.showMessage(f"Imported {imported} clip(s)" + (f" · {len(errors)} failed" if errors else ""))
        if errors: QMessageBox.warning(self, "Algunos medios no se pudieron importar", "\n".join(errors[:5]))

    def _show_bin_clips(self, name: str) -> None:
        self.inspector.clear(); bin_model = next((b for b in self.project.bins if b.name == name), None)
        if not bin_model: return
        for clip in bin_model.clips:
            item = QListWidgetItem(f"{clip.name}\n{clip.duration_label}  ·  {clip.resolution}")
            if clip.thumbnail and clip.thumbnail.exists(): item.setIcon(QIcon(QPixmap(str(clip.thumbnail))))
            item.setData(Qt.ItemDataRole.UserRole, str(clip.path)); self.inspector.addItem(item)

    def _clip_clicked(self, item: QListWidgetItem) -> None:
        clip = self.clips.get(item.data(Qt.ItemDataRole.UserRole))
        if not clip: return
        self.selected_clip = clip; self.in_point = None; self.out_point = None; self._update_range_label()
        self.timeline.select_source(clip)
        self.player.setSource(QUrl.fromLocalFile(str(clip.path))); self.viewer_stack.setCurrentIndex(1); self.timeline.set_playhead(0)
        self.inspector.clear()
        for label, value in (("NAME", clip.name), ("PATH", str(clip.path)), ("DURATION", clip.duration_label), ("RESOLUTION", clip.resolution), ("FPS", f"{clip.fps:.2f}"), ("CODEC", clip.codec)):
            self.inspector.addItem(f"{label}\n{value}")
        self.status.showMessage(f"Loaded · {clip.name} · J/K/L to control playback")

    def _toggle_play(self) -> None:
        if not self.selected_clip: return
        if self.player.playbackState() == QMediaPlayer.PlaybackState.PlayingState: self.player.pause()
        else: self.player.play()

    def _step_frame(self, direction: int) -> None:
        if not self.selected_clip: return
        self.player.pause(); self.player.setPosition(max(0, min(self.player.duration(), self.player.position() + direction * frame_duration_ms(self.selected_clip.fps))))

    def _seek(self, value: int) -> None:
        self.player.setPosition(value)

    def _position_changed(self, position: int) -> None:
        self.timeline.set_playhead(position)
        fps = self.selected_clip.fps if self.selected_clip else 24.0; self.timecode.setText(format_timecode(position, fps))

    def _duration_changed(self, duration: int) -> None:
        self.timeline.update()

    def _playback_state_changed(self, state: QMediaPlayer.PlaybackState) -> None:
        playing = state == QMediaPlayer.PlaybackState.PlayingState; self.play_button.setText("Ⅱ" if playing else "▶")

    def _player_error(self, _error: QMediaPlayer.Error, message: str) -> None:
        if message: self.status.showMessage(f"Playback error · {message}")

    def set_in_point(self) -> None:
        if self.selected_clip: self.in_point = self.player.position(); self._update_range_label()

    def set_out_point(self) -> None:
        if self.selected_clip: self.out_point = self.player.position(); self._update_range_label()

    def _update_range_label(self) -> None:
        fps = self.selected_clip.fps if self.selected_clip else 24.0
        in_label = format_timecode(self.in_point, fps) if self.in_point is not None else "—"; out_label = format_timecode(self.out_point, fps) if self.out_point is not None else "—"
        self.range_label.setText(f"IN  {in_label}    OUT  {out_label}")

    def keyPressEvent(self, event: QKeyEvent) -> None:
        if event.key() == Qt.Key.Key_J: self._step_frame(-1)
        elif event.key() == Qt.Key.Key_K: self.player.pause()
        elif event.key() == Qt.Key.Key_L: self._toggle_play()
        elif event.key() == Qt.Key.Key_I: self.set_in_point()
        elif event.key() == Qt.Key.Key_O: self.set_out_point()
        elif event.key() == Qt.Key.Key_Left: self._step_frame(-1)
        elif event.key() == Qt.Key.Key_Right: self._step_frame(1)
        else: super().keyPressEvent(event)

    def new_project(self) -> None:
        self.player.stop(); self.project = Project(); self.clips.clear(); self.selected_clip = None; self.timeline_model = TimelineModel(); self.timeline.model = self.timeline_model; self.timeline.selected_id = None; self.timeline.update(); self.setWindowTitle("Mictlan Editor  /  Untitled Project"); self._refresh_bins(); self.inspector.clear(); self.viewer_stack.setCurrentIndex(0); self.range_label.setText("IN  —    OUT  —")

    def open_project(self) -> None:
        QMessageBox.information(self, "Open project", "La persistencia de proyectos está prevista para la siguiente iteración.")

    def save_project(self) -> None:
        self.status.showMessage("Project saved locally · Mictlan Project")
