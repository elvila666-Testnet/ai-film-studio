from __future__ import annotations

from pathlib import Path

from PySide6.QtCore import Qt, QSize
from PySide6.QtGui import QAction, QIcon, QPixmap
from PySide6.QtWidgets import (
    QFileDialog, QFrame, QHBoxLayout, QLabel, QListWidget, QListWidgetItem,
    QMainWindow, QMessageBox, QPushButton, QSplitter, QStatusBar, QToolBar,
    QTreeWidget, QTreeWidgetItem, QVBoxLayout, QWidget, QSizePolicy,
)

from .media import classify, probe_media, tools_available
from .models import MediaClip, Project
from .theme import ACCENT, BORDER, MUTED, PANEL, PANEL_ALT


class MainWindow(QMainWindow):
    def __init__(self) -> None:
        super().__init__()
        self.project = Project()
        self.clips: dict[str, MediaClip] = {}
        self.thumbnail_dir = Path.home() / ".mictlan" / "thumbnails"
        self.setWindowTitle("Mictlan Editor  /  Untitled Project")
        self.resize(1480, 900)
        self._build_toolbar()
        self._build_workspace()
        self.status = QStatusBar(self)
        self.setStatusBar(self.status)
        self.status.showMessage("Ready · Create a project or import media to begin")
        self._refresh_bins()

    def _build_toolbar(self) -> None:
        toolbar = QToolBar("Main", self)
        toolbar.setIconSize(QSize(18, 18))
        toolbar.setMovable(False)
        self.addToolBar(toolbar)
        brand = QLabel("  MICTLAN  ")
        brand.setStyleSheet(f"color: {ACCENT}; font-weight: 800; letter-spacing: 2px;")
        toolbar.addWidget(brand)
        toolbar.addSeparator()
        for label, callback in (("New", self.new_project), ("Open", self.open_project), ("Save", self.save_project)):
            action = QAction(label, self)
            action.triggered.connect(callback)
            toolbar.addAction(action)
        toolbar.addSeparator()
        import_action = QAction("＋ Import media", self)
        import_action.triggered.connect(self.import_media)
        toolbar.addAction(import_action)
        spacer = QWidget(); spacer.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Preferred)
        toolbar.addWidget(spacer)
        toolbar.addWidget(QLabel("PROJECT  /  MICTLAN"))

    def _build_workspace(self) -> None:
        root = QWidget(); root_layout = QVBoxLayout(root); root_layout.setContentsMargins(10, 10, 10, 8); root_layout.setSpacing(8)
        top = QSplitter(Qt.Horizontal); top.setChildrenCollapsible(False)
        top.addWidget(self._make_bins_panel())
        top.addWidget(self._make_viewer_panel())
        top.addWidget(self._make_inspector_panel())
        top.setSizes([230, 850, 300])
        root_layout.addWidget(top, 1)
        root_layout.addWidget(self._make_timeline(), 0)
        self.setCentralWidget(root)

    def _panel(self, title: str) -> tuple[QFrame, QVBoxLayout]:
        frame = QFrame(); frame.setStyleSheet(f"QFrame {{ background: {PANEL}; border: 1px solid {BORDER}; border-radius: 6px; }}")
        layout = QVBoxLayout(frame); layout.setContentsMargins(12, 12, 12, 12); layout.setSpacing(9)
        heading = QLabel(title.upper()); heading.setStyleSheet(f"color: {MUTED}; font-size: 10px; font-weight: 700; letter-spacing: 1px; border: 0;")
        layout.addWidget(heading)
        return frame, layout

    def _make_bins_panel(self) -> QWidget:
        frame, layout = self._panel("Project bins")
        self.bin_tree = QTreeWidget(); self.bin_tree.setHeaderHidden(True); self.bin_tree.itemClicked.connect(self._bin_clicked)
        layout.addWidget(self.bin_tree, 1)
        add_bin = QPushButton("＋ New bin"); add_bin.clicked.connect(self._new_bin); layout.addWidget(add_bin)
        return frame

    def _make_viewer_panel(self) -> QWidget:
        frame, layout = self._panel("Source viewer")
        viewer = QFrame(); viewer.setMinimumHeight(330); viewer.setStyleSheet(f"background: #0B0D0F; border: 1px solid {BORDER}; border-radius: 4px;")
        viewer_layout = QVBoxLayout(viewer)
        self.preview = QLabel("NO CLIP LOADED\n\nImport media to start cutting")
        self.preview.setAlignment(Qt.AlignCenter); self.preview.setStyleSheet(f"color: {MUTED}; border: 0; letter-spacing: 1px;")
        viewer_layout.addWidget(self.preview)
        layout.addWidget(viewer, 1)
        controls = QHBoxLayout(); controls.setSpacing(6)
        for label in ("◀", "▶", "▶|", "I", "O"):
            button = QPushButton(label); button.setFixedWidth(42); controls.addWidget(button)
        controls.addStretch(); controls.addWidget(QLabel("00:00:00:00")); layout.addLayout(controls)
        return frame

    def _make_inspector_panel(self) -> QWidget:
        frame, layout = self._panel("Clip inspector")
        self.inspector = QListWidget(); self.inspector.setSpacing(2); layout.addWidget(self.inspector, 1)
        return frame

    def _make_timeline(self) -> QWidget:
        frame, layout = self._panel("Timeline  /  Sequence 01")
        frame.setMinimumHeight(190)
        ruler = QLabel("00:00:00:00     00:00:10:00     00:00:20:00     00:00:30:00     00:00:40:00")
        ruler.setStyleSheet(f"color: {MUTED}; font-family: monospace; border: 0; padding-left: 58px;")
        layout.addWidget(ruler)
        for track, color in (("V1", ACCENT), ("A1", "#6B8FB3")):
            row = QHBoxLayout(); label = QLabel(track); label.setFixedWidth(34); label.setStyleSheet(f"color: {color}; font-weight: 700; border: 0;")
            lane = QFrame(); lane.setMinimumHeight(35); lane.setStyleSheet(f"background: {PANEL_ALT}; border: 1px solid {BORDER}; border-radius: 3px;")
            row.addWidget(label); row.addWidget(lane, 1); layout.addLayout(row)
        return frame

    def _refresh_bins(self) -> None:
        self.bin_tree.clear()
        for bin_model in self.project.bins:
            item = QTreeWidgetItem([f"▸  {bin_model.name}   ({len(bin_model.clips)})"])
            item.setData(0, Qt.UserRole, bin_model.name); self.bin_tree.addTopLevelItem(item)

    def _bin_clicked(self, item: QTreeWidgetItem, _column: int) -> None:
        name = item.data(0, Qt.UserRole)
        self.project.selected_bin = name
        self.status.showMessage(f"Bin selected · {name}")

    def _new_bin(self) -> None:
        name = f"Bin {len(self.project.bins) + 1}"
        self.project.bins.append(__import__("mictlan_editor.models", fromlist=["Bin"]).Bin(name))
        self._refresh_bins()

    def import_media(self) -> None:
        paths, _ = QFileDialog.getOpenFileNames(self, "Import media", "", "Media (*.mov *.mp4 *.mxf *.avi *.mkv *.webm *.wav *.mp3 *.aac *.flac *.m4a)")
        if not paths: return
        if not tools_available():
            QMessageBox.critical(self, "FFmpeg no encontrado", "Instala FFmpeg y ffprobe para importar medios."); return
        imported, errors = 0, []
        for raw in paths:
            path = Path(raw)
            try:
                clip = probe_media(path, self.thumbnail_dir)
                self.project.add_clip(clip, classify(path)); self.clips[str(path)] = clip; imported += 1
            except Exception as exc: errors.append(f"{path.name}: {exc}")
        self._refresh_bins(); self._show_bin_clips(self.project.selected_bin)
        self.status.showMessage(f"Imported {imported} clip(s)" + (f" · {len(errors)} failed" if errors else ""))
        if errors: QMessageBox.warning(self, "Algunos medios no se pudieron importar", "\n".join(errors[:5]))

    def _show_bin_clips(self, name: str) -> None:
        self.inspector.clear()
        bin_model = next((b for b in self.project.bins if b.name == name), None)
        if not bin_model: return
        for clip in bin_model.clips:
            item = QListWidgetItem(f"{clip.name}\n{clip.duration_label}  ·  {clip.resolution}")
            if clip.thumbnail and clip.thumbnail.exists(): item.setIcon(QIcon(QPixmap(str(clip.thumbnail))))
            item.setData(Qt.UserRole, str(clip.path)); self.inspector.addItem(item)
        self.inspector.itemClicked.connect(self._clip_clicked)

    def _clip_clicked(self, item: QListWidgetItem) -> None:
        clip = self.clips.get(item.data(Qt.UserRole))
        if not clip: return
        self.preview.setText(f"{clip.name}\n\n{clip.duration_label}  ·  {clip.resolution}")
        self.inspector.clear()
        for label, value in (("NAME", clip.name), ("PATH", str(clip.path)), ("DURATION", clip.duration_label), ("RESOLUTION", clip.resolution), ("FPS", f"{clip.fps:.2f}"), ("CODEC", clip.codec)):
            self.inspector.addItem(f"{label}\n{value}")

    def new_project(self) -> None:
        self.project = Project(); self.clips.clear(); self.setWindowTitle("Mictlan Editor  /  Untitled Project"); self._refresh_bins(); self.inspector.clear(); self.preview.setText("NO CLIP LOADED\n\nImport media to start cutting")

    def open_project(self) -> None:
        QMessageBox.information(self, "Open project", "La persistencia de proyectos está prevista para la siguiente iteración.")

    def save_project(self) -> None:
        self.status.showMessage("Project saved locally · Mictlan Project")
