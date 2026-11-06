from pathlib import Path
import hashlib
import re
import uuid
from docx import Document as DocxDocument
from app.core.config import get_settings

SUPPORTED_EXTENSIONS = {".txt", ".md", ".docx"}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file_obj:
        for block in iter(lambda: file_obj.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def parse_document(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix not in SUPPORTED_EXTENSIONS:
        raise ValueError("Only TXT, DOCX and Markdown files are supported.")
    if suffix in {".txt", ".md"}:
        text = path.read_text(encoding="utf-8-sig")
    else:
        doc = DocxDocument(path)
        parts = []
        for paragraph in doc.paragraphs:
            value = paragraph.text.strip()
            if not value:
                continue
            style = paragraph.style.name if paragraph.style else ""
            parts.append(f"\\n## {value}\\n" if style.startswith("Heading") else value)
        for table in doc.tables:
            for row in table.rows:
                parts.append(" | ".join(cell.text.strip() for cell in row.cells))
        text = "\\n\\n".join(parts)
    text = text.replace("\\x00", "").strip()
    if not text:
        raise ValueError("No readable text was extracted from the document.")
    return text


def split_text(text: str, max_chars: int | None = None,
               overlap_chars: int | None = None) -> list[dict]:
    settings = get_settings()
    max_chars = max_chars or settings.chunk_max_chars
    overlap_chars = settings.chunk_overlap_chars if overlap_chars is None else overlap_chars
    if max_chars < 200 or overlap_chars < 0 or overlap_chars >= max_chars:
        raise ValueError("Invalid chunk size or overlap.")

    blocks = [b.strip() for b in re.split(r"\\n\\s*\\n", text) if b.strip()]
    chunks = []
    current = ""
    current_heading = None

    def add(value, heading):
        if value.strip():
            chunks.append({"chunk_index": len(chunks), "content": value.strip(), "heading": heading})

    for block in blocks:
        if block.startswith("#"):
            current_heading = block.lstrip("# ").strip() or current_heading
        candidate = f"{current}\\n\\n{block}".strip() if current else block
        if len(candidate) <= max_chars:
            current = candidate
            continue
        if current:
            add(current, current_heading)
            current = ""
        if len(block) > max_chars:
            start = 0
            while start < len(block):
                add(block[start:start + max_chars], current_heading)
                if start + max_chars >= len(block):
                    break
                start += max_chars - overlap_chars
        else:
            current = block
    if current:
        add(current, current_heading)
    if not chunks:
        add(text[:max_chars], None)
    return chunks


def new_document_id() -> str:
    return str(uuid.uuid4())
