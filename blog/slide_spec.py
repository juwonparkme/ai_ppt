from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Literal


SlideKind = Literal["title", "toc", "bullets", "summary"]


@dataclass
class SlideSpecItem:
    id: str
    kind: SlideKind
    title: str
    subtitle: str = ""
    bullets: list[str] = field(default_factory=list)
    notes: str = ""

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class PresentationSpec:
    version: str
    title: str
    template: str
    language: str
    metadata: dict
    slides: list[SlideSpecItem]

    def to_dict(self) -> dict:
        return {
            "version": self.version,
            "title": self.title,
            "template": self.template,
            "language": self.language,
            "metadata": self.metadata,
            "slides": [slide.to_dict() for slide in self.slides],
        }


def parse_bullets(content: str) -> list[str]:
    bullets: list[str] = []
    for line in content.splitlines():
        item = line.strip()
        if not item:
            continue
        item = item.removeprefix("-").strip()
        if item[:2].isdigit() and item[2:3] == ".":
            item = item[3:].strip()
        elif item[:1].isdigit() and item[1:2] == ".":
            item = item[2:].strip()
        bullets.append(item)
    return bullets


def parse_openai_slide_blocks(content: str) -> list[dict]:
    blocks: list[dict] = []
    for raw_block in content.split("#Slide:"):
        block = raw_block.strip()
        if not block:
            continue
        if "#Header:" not in block or "#Content:" not in block:
            continue
        _, remainder = block.split("#Header:", 1)
        header, body = remainder.split("#Content:", 1)
        blocks.append({"header": header.strip(), "content": body.strip()})
    return blocks


def build_slide_spec(
    title_text: str,
    overview_text: str,
    detail_text: str,
    template: str = "modern-a",
    language: str = "ko",
) -> PresentationSpec:
    slides: list[SlideSpecItem] = []
    slide_index = 1

    for block in parse_openai_slide_blocks(overview_text):
        header = block["header"]
        content = block["content"]
        if header == "목차":
            slides.append(
                SlideSpecItem(
                    id=f"slide-{slide_index}",
                    kind="toc",
                    title=header,
                    bullets=parse_bullets(content),
                )
            )
        else:
            slides.append(
                SlideSpecItem(
                    id=f"slide-{slide_index}",
                    kind="title",
                    title=header or title_text,
                    subtitle=content,
                )
            )
        slide_index += 1

    for block in parse_openai_slide_blocks(detail_text):
        header = block["header"]
        kind: SlideKind = "summary" if header.lower() in {"summary", "요약"} else "bullets"
        slides.append(
            SlideSpecItem(
                id=f"slide-{slide_index}",
                kind=kind,
                title=header,
                bullets=parse_bullets(block["content"]),
            )
        )
        slide_index += 1

    return PresentationSpec(
        version="1.0",
        title=title_text,
        template=template,
        language=language,
        metadata={"topic": title_text, "source": "openai"},
        slides=slides,
    )
