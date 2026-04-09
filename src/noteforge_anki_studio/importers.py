from __future__ import annotations

import io
import re
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal
from xml.etree import ElementTree as ET

import fitz
from fastapi import UploadFile

from .models import SourceItem, SourceManifest

SupportedImportType = Literal["md", "markdown", "txt", "pdf", "pptx"]


class UnsupportedImportError(Exception):
    pass


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


A_NS = {"a": "http://schemas.openxmlformats.org/drawingml/2006/main"}


def decode_text_bytes(data: bytes) -> str:
    for encoding in ("utf-8", "utf-16", "latin-1"):
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            continue
    return data.decode("utf-8", errors="replace")


class ImportService:
    def detect_type(self, filename: str) -> SupportedImportType:
        suffix = Path(filename).suffix.lower().lstrip(".")
        if suffix in {"md", "markdown", "txt", "pdf", "pptx"}:
            return suffix  # type: ignore[return-value]
        raise UnsupportedImportError(f"Unsupported file type: {suffix or 'unknown'}")

    async def import_upload(self, upload: UploadFile) -> tuple[str, str, SourceManifest, bytes]:
        data = await upload.read()
        kind = self.detect_type(upload.filename or "upload")
        return self.import_bytes(upload.filename or "upload", data, kind)

    def import_text_payload(
        self,
        title: str,
        text: str,
        source_type: str = "text",
    ) -> tuple[str, str, SourceManifest, bytes]:
        data = text.encode("utf-8")
        manifest = SourceManifest(
            source_type=source_type if source_type in {"text", "markdown"} else "text",
            original_filename=f"{title}.md" if source_type == "markdown" else f"{title}.txt",
            items=[SourceItem(index=1, label="Text", text=text)],
            imported_at=utc_now_iso(),
            summary=f"Imported 1 text block from {title}.",
        )
        content = text
        title = title.strip() or "Imported text"
        return title, content, manifest, data

    def import_bytes(
        self,
        filename: str,
        data: bytes,
        kind: SupportedImportType,
    ) -> tuple[str, str, SourceManifest, bytes]:
        match kind:
            case "md" | "markdown":
                text = decode_text_bytes(data)
                title = self.title_from_filename(filename)
                manifest = SourceManifest(
                    source_type="markdown",
                    original_filename=filename,
                    items=[SourceItem(index=1, label="Markdown", text=text)],
                    imported_at=utc_now_iso(),
                    summary="Imported markdown note.",
                )
                return title, text, manifest, data
            case "txt":
                text = decode_text_bytes(data)
                title = self.title_from_filename(filename)
                manifest = SourceManifest(
                    source_type="text",
                    original_filename=filename,
                    items=[SourceItem(index=1, label="Text", text=text)],
                    imported_at=utc_now_iso(),
                    summary="Imported plain text note.",
                )
                markdown = f"# {title}\n\n{text.strip()}\n"
                return title, markdown, manifest, data
            case "pdf":
                return self.import_pdf(filename, data)
            case "pptx":
                return self.import_pptx(filename, data)
            case _:
                raise UnsupportedImportError(filename)

    def import_pdf(self, filename: str, data: bytes) -> tuple[str, str, SourceManifest, bytes]:
        title = self.title_from_filename(filename)
        items: list[SourceItem] = []
        doc = fitz.open(stream=data, filetype="pdf")
        for index, page in enumerate(doc, start=1):
            text = page.get_text("text").strip()
            if not text:
                text = "[No extractable text found on this page.]"
            items.append(SourceItem(index=index, label=f"Page {index}", text=text))
        if not items:
            items.append(SourceItem(index=1, label="Page 1", text="[No extractable text found in this PDF.]"))
        content_parts = [f"# {title}", "", f"> Imported from PDF: `{filename}`", ""]
        for item in items:
            content_parts.extend([f"## {item.label}", "", item.text, ""])
        manifest = SourceManifest(
            source_type="pdf",
            original_filename=filename,
            items=items,
            imported_at=utc_now_iso(),
            summary=f"Imported {len(items)} PDF pages.",
        )
        return title, "\n".join(content_parts).strip() + "\n", manifest, data

    def import_pptx(self, filename: str, data: bytes) -> tuple[str, str, SourceManifest, bytes]:
        title = self.title_from_filename(filename)
        items: list[SourceItem] = []
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            slide_names = sorted(
                name
                for name in archive.namelist()
                if name.startswith("ppt/slides/slide") and name.endswith(".xml")
            )
            for index, slide_name in enumerate(slide_names, start=1):
                xml = archive.read(slide_name)
                root = ET.fromstring(xml)
                texts = [node.text.strip() for node in root.findall(".//a:t", A_NS) if node.text and node.text.strip()]
                slide_text = "\n".join(texts) if texts else "[No extractable text found on this slide.]"
                items.append(SourceItem(index=index, label=f"Slide {index}", text=slide_text))
        if not items:
            items.append(SourceItem(index=1, label="Slide 1", text="[No extractable text found in this presentation.]"))
        content_parts = [f"# {title}", "", f"> Imported from slides: `{filename}`", ""]
        for item in items:
            content_parts.extend([f"## {item.label}", "", item.text, ""])
        manifest = SourceManifest(
            source_type="pptx",
            original_filename=filename,
            items=items,
            imported_at=utc_now_iso(),
            summary=f"Imported {len(items)} slides.",
        )
        return title, "\n".join(content_parts).strip() + "\n", manifest, data

    def title_from_filename(self, filename: str) -> str:
        stem = Path(filename).stem
        title = re.sub(r"[_-]+", " ", stem).strip()
        return title[:1].upper() + title[1:] if title else "Imported note"
