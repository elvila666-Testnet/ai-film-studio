from pathlib import Path

from mictlan_editor.media import classify, discover_media
from mictlan_editor.models import Bin, MediaClip, Project


def test_project_starts_with_expected_bins():
    project = Project()
    assert [item.name for item in project.bins] == ["Footage", "Audio", "VFX", "Exports"]


def test_project_does_not_duplicate_clips(tmp_path: Path):
    project = Project()
    clip = MediaClip(tmp_path / "shot.mov", "shot.mov")
    project.add_clip(clip)
    project.add_clip(clip)
    assert len(project.bins[0].clips) == 1


def test_classify_media():
    assert classify(Path("dialogue.wav")) == "Audio"
    assert classify(Path("wide-shot.mov")) == "Footage"


def test_discover_media_filters_files(tmp_path: Path):
    (tmp_path / "shot.mp4").touch()
    (tmp_path / "music.wav").touch()
    (tmp_path / "notes.txt").touch()
    assert [item.name for item in discover_media(tmp_path)] == ["music.wav", "shot.mp4"]
