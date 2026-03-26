from __future__ import annotations

from blog.slide_spec import PresentationSpec, SlideSpecItem


SUPPORTED_EDITOR_SLIDE_KINDS = {"title", "toc", "bullets", "summary"}
SUPPORTED_EDITOR_TEMPLATES = {"modern-a", "modern-b"}


def clean_text(value, fallback=""):
    if value is None:
        return fallback
    text = str(value).strip()
    return text or fallback


def clean_bullets(raw_bullets, *, limit=6):
    if isinstance(raw_bullets, str):
        items = raw_bullets.splitlines()
    else:
        items = raw_bullets or []

    bullets = []
    for item in items:
        text = str(item).strip()
        if not text:
            continue
        bullets.append(text)
        if len(bullets) >= limit:
            break
    return bullets


def normalize_preview_item(item, index):
    raw_item = dict(item or {})
    kind = raw_item.get("kind")

    if kind == "text":
        return {
            "kind": "slide",
            "slide_kind": "title" if index == 0 else "bullets",
            "title": clean_text(raw_item.get("value"), f"Slide {index + 1}"),
            "subtitle": "",
            "bullets": [],
            "notes": "",
        }

    if kind == "image" and "value" in raw_item and "image_url" not in raw_item:
        raw_item["image_url"] = raw_item.get("value", "")

    if raw_item.get("kind") == "image" or raw_item.get("slide_kind") == "image":
        return {
            "kind": "image",
            "slide_kind": "image",
            "title": clean_text(raw_item.get("title"), f"Image Slide {index + 1}"),
            "subtitle": "",
            "bullets": [],
            "image_url": clean_text(raw_item.get("image_url"), ""),
            "notes": clean_text(raw_item.get("notes"), ""),
        }

    slide_kind = clean_text(raw_item.get("slide_kind"), "title" if index == 0 else "bullets")
    if slide_kind not in SUPPORTED_EDITOR_SLIDE_KINDS:
        slide_kind = "title" if index == 0 else "bullets"

    return {
        "kind": "slide",
        "slide_kind": slide_kind,
        "title": clean_text(raw_item.get("title"), f"Slide {index + 1}"),
        "subtitle": clean_text(raw_item.get("subtitle"), ""),
        "bullets": clean_bullets(raw_item.get("bullets")),
        "notes": clean_text(raw_item.get("notes"), ""),
    }


def normalize_result_payload(payload):
    normalized = dict(payload or {})
    title = clean_text(normalized.get("title"), "presentation")
    template = clean_text(normalized.get("template"), "modern-a")
    history_id = normalized.get("history_id")
    try:
        history_id = int(history_id) if history_id not in (None, "") else None
    except (TypeError, ValueError):
        history_id = None

    items = [
        normalize_preview_item(item, index)
        for index, item in enumerate(normalized.get("preview_items", []))
    ]

    if not items:
        items = [
            {
                "kind": "slide",
                "slide_kind": "title",
                "title": title,
                "subtitle": "새 슬라이드를 추가해서 내용을 편집하세요.",
                "bullets": [],
                "notes": "",
            }
        ]

    return {
        **normalized,
        "title": title,
        "download_url": str(normalized.get("download_url") or ""),
        "backend": clean_text(normalized.get("backend"), "pptxgenjs"),
        "template": template if template in SUPPORTED_EDITOR_TEMPLATES else "modern-a",
        "primary_action_label": clean_text(normalized.get("primary_action_label"), "다운로드"),
        "history_id": history_id,
        "preview_items": items,
    }


def build_presentation_spec_from_payload(payload):
    normalized = normalize_result_payload(payload)
    slides = []
    image_indexes = []

    for index, item in enumerate(normalized["preview_items"], start=1):
        if item["kind"] == "image":
            image_indexes.append(index)
            continue

        slides.append(
            SlideSpecItem(
                id=f"slide-{index}",
                kind=item["slide_kind"],
                title=item["title"],
                subtitle=item["subtitle"],
                bullets=item["bullets"],
                notes=item["notes"],
            )
        )

    if image_indexes:
        slide_numbers = ", ".join(str(index) for index in image_indexes)
        raise ValueError(f"이미지 슬라이드({slide_numbers})는 수정본 다운로드를 아직 지원하지 않습니다.")

    return PresentationSpec(
        version="1.0",
        title=normalized["title"],
        template=normalized["template"],
        language="ko",
        metadata={"topic": normalized["title"], "source": "editor"},
        slides=slides,
    )
