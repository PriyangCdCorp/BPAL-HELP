from pathlib import Path
import pytest
from app.ingestion import parse_document, split_text


def test_parse_markdown_and_chunk(tmp_path: Path):
    path = tmp_path / "guide.md"
    path.write_text("# Access\n\nAdmins can manage users.", encoding="utf-8")
    text = parse_document(path)
    chunks = split_text(text, max_chars=500, overlap_chars=50)
    assert "Admins can manage users" in text
    assert chunks
    assert chunks[0]["chunk_index"] == 0


def test_reject_unsupported_extension(tmp_path: Path):
    path = tmp_path / "image.png"
    path.write_bytes(b"not an image")
    with pytest.raises(ValueError):
        parse_document(path)
