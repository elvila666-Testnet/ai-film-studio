from mictlan_editor.playback import format_timecode, frame_duration_ms


def test_format_timecode_uses_clip_fps():
    assert format_timecode(1000, 24) == "00:00:01:00"
    assert format_timecode(1250, 25) == "00:00:01:06"


def test_frame_duration_is_derived_from_fps():
    assert frame_duration_ms(25) == 40
    assert frame_duration_ms(0) == 42
