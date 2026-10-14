from PySide6.QtGui import QFont
from PySide6.QtWidgets import QApplication


ACCENT = "#D8B26E"
BG = "#101316"
PANEL = "#171B20"
PANEL_ALT = "#1D2329"
BORDER = "#2A323B"
TEXT = "#E9ECEF"
MUTED = "#8C98A4"


def apply_theme(app: QApplication) -> None:
    app.setStyle("Fusion")
    app.setFont(QFont("Inter", 10))
    app.setStyleSheet(f"""
        QWidget {{ color: {TEXT}; background: {BG}; }}
        QMainWindow {{ background: {BG}; }}
        QToolBar {{ background: {PANEL}; border: 0; border-bottom: 1px solid {BORDER}; spacing: 5px; padding: 7px 12px; }}
        QToolButton, QPushButton {{ background: transparent; border: 1px solid transparent; border-radius: 5px; padding: 7px 10px; color: {TEXT}; }}
        QToolButton:hover, QPushButton:hover {{ background: {PANEL_ALT}; border-color: {BORDER}; }}
        QPushButton[primary="true"] {{ background: {ACCENT}; color: #17120A; font-weight: 700; }}
        QPushButton[primary="true"]:hover {{ background: #E7C98C; }}
        QLineEdit {{ background: {PANEL_ALT}; border: 1px solid {BORDER}; border-radius: 4px; padding: 7px; }}
        QTreeWidget, QListWidget, QTableWidget {{ background: {PANEL}; border: 1px solid {BORDER}; border-radius: 5px; outline: none; }}
        QTreeWidget::item, QListWidget::item {{ padding: 7px 5px; }}
        QTreeWidget::item:selected, QListWidget::item:selected {{ background: #3A3020; color: {ACCENT}; }}
        QHeaderView::section {{ background: {PANEL_ALT}; color: {MUTED}; border: 0; border-bottom: 1px solid {BORDER}; padding: 7px; }}
        QStatusBar {{ background: {PANEL}; color: {MUTED}; border-top: 1px solid {BORDER}; }}
        QSplitter::handle {{ background: {BORDER}; }}
        QScrollBar:vertical {{ background: {PANEL}; width: 10px; }}
        QScrollBar::handle:vertical {{ background: #35404A; border-radius: 5px; min-height: 24px; }}
    """)
