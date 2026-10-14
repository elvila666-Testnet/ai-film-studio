import json
import shutil
import subprocess
from pathlib import Path

import pytest

from mictlan_editor.exporter import export_edl, export_fcp_xml, export_otio, render_sequence
from mictlan_editor.models import MediaClip
from mictlan_editor.timeline import TimelineModel


def make_model(tmp_path: Path) -> TimelineModel:
    model = TimelineModel()
    source = MediaClip(tmp_path / "shot.mp4", "shot.mp4", duration=1.0, fps=24, width=320, height=180)
    model.add(source, "V1")
    model.add_title("Opening", 0, 1000)
    return model


def test_export_otio_edl_and_xml(tmp_path: Path):
    model = make_model(tmp_path)
    otio = export_otio(model, tmp_path / "sequence.otio")
    edl = export_edl(model, tmp_path / "sequence.edl")
    xml = export_fcp_xml(model, tmp_path / "sequence.xml")
    payload = json.loads(otio.read_text())
    assert payload["OTIO_SCHEMA"] == "Timeline.1"
    assert "Opening" in otio.read_text() and "shot.mp4" in edl.read_text()
    assert xml.read_text().startswith("<?xml")


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="FFmpeg no disponible")
def test_render_sequence_outputs_16_9_mp4(tmp_path: Path):
    source = tmp_path / "source.mp4"
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "testsrc=size=320x180:rate=24", "-t", "1", str(source)], check=True)
    model = TimelineModel()
    model.add(MediaClip(source, source.name, duration=1.0, fps=24, width=320, height=180), "V1")
    output = render_sequence(model, tmp_path / "render.mp4")
    probe = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=width,height", "-of", "json", str(output)], capture_output=True, text=True, check=True)
    dimensions = json.loads(probe.stdout)["streams"][0]
    assert (dimensions["width"], dimensions["height"]) == (1920, 1080)
