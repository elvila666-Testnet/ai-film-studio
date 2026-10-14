from pathlib import Path

from mictlan_editor.models import MediaClip
from mictlan_editor.timeline import TimelineModel


def clip(name="shot.mov", duration=10):
    return MediaClip(Path(name), name, duration=duration, fps=24)


def test_add_places_clips_end_to_end_on_each_track():
    model = TimelineModel()
    first = model.add(clip("a.mov", 4), "V1")
    second = model.add(clip("b.mov", 3), "V1")
    assert (first.start_ms, first.end_ms) == (0, 4000)
    assert (second.start_ms, second.end_ms) == (4000, 7000)


def test_split_is_non_destructive_and_preserves_source():
    model = TimelineModel(); original = model.add(clip(), "V1")
    right = model.split_at(2500, "V1")
    assert right is not None
    assert original.duration_ms == 2500 and right.duration_ms == 7500
    assert original.source.path == right.source.path == Path("shot.mov")


def test_trim_and_move():
    model = TimelineModel(); item = model.add(clip(), "V1")
    model.trim_left(item.clip_id, 1000); model.trim_right(item.clip_id, 6000); model.move(item.clip_id, 2000, "V2")
    assert item.track == "V2" and item.start_ms == 2000 and item.duration_ms == 5000


def test_remove():
    model = TimelineModel(); item = model.add(clip())
    assert model.remove(item.clip_id) is True and model.clips == []


def test_add_transition_between_adjacent_clips():
    model = TimelineModel(); left = model.add(clip("a.mov", 4), "V1"); right = model.add(clip("b.mov", 4), "V1")
    transition = model.add_transition(left.clip_id, right.clip_id, "Dissolve", 600)
    assert transition is not None
    assert transition.kind == "Dissolve" and transition.duration_ms == 600


def test_title_overlay_is_editable_and_removable():
    model = TimelineModel(); title = model.add_title("Opening", 1200, 2500)
    assert title.end_ms == 3700 and title.track == "V2"
    assert model.remove_title(title.title_id) is True and model.titles == []
