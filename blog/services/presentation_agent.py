from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import re
from string import Template

from django.conf import settings

from blog.slide_spec import PresentationSpec, build_slide_spec


PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"


@dataclass(frozen=True)
class PresentationAgentResult:
    source_topic: str
    output_title: str
    overview_text: str
    detail_text: str
    spec: PresentationSpec


class PresentationAgent:
    def __init__(self, client, prompts_dir: Path | None = None):
        self.client = client
        self.prompts_dir = prompts_dir or PROMPTS_DIR

    def generate_presentation(self, topic: str) -> str:
        prompt = self.render_prompt("presentation_prompt.txt", topic=topic)
        return self._complete(
            model=settings.OPENAI_PRESENTATION_MODEL,
            prompt=prompt,
            temperature=0.7,
            max_tokens=4096,
        )

    def run(
        self,
        source_topic: str,
        *,
        template: str = "modern-a",
    ) -> PresentationAgentResult:
        content = self.generate_presentation(source_topic)
        sections = parse_presentation_sections(content)
        output_title = normalize_output_title(sections["filename"] or source_topic)
        overview_text = sections["overview"]
        detail_text = sections["details"]
        spec = build_slide_spec(source_topic, overview_text, detail_text, template=template)
        return PresentationAgentResult(
            source_topic=source_topic,
            output_title=output_title,
            overview_text=overview_text,
            detail_text=detail_text,
            spec=spec,
        )

    def render_prompt(self, name: str, **context: str) -> str:
        template_path = self.prompts_dir / name
        template = Template(template_path.read_text(encoding="utf-8"))
        return template.safe_substitute(**context)

    def _complete(
        self,
        *,
        model: str,
        prompt: str,
        temperature: float,
        max_tokens: int,
    ) -> str:
        response = self.client.chat.completions.create(
            model=model,
            messages=[{"role": "system", "content": prompt}],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content.strip()


SECTION_MARKERS = {
    "#Filename:": "filename",
    "#Overview:": "overview",
    "#Details:": "details",
}


def normalize_output_title(raw_title: str) -> str:
    title = raw_title.strip().replace(" ", "_")
    title = re.sub(r"\.(pptx|ppt|txt)$", "", title, flags=re.IGNORECASE)
    return title.rstrip("._") or "presentation"


def parse_presentation_sections(content: str) -> dict[str, str]:
    sections = {key: [] for key in SECTION_MARKERS.values()}
    current_key: str | None = None

    for line in content.splitlines():
        stripped = line.strip()
        matched_marker = next(
            (marker for marker in SECTION_MARKERS if stripped.startswith(marker)),
            None,
        )
        if matched_marker:
            current_key = SECTION_MARKERS[matched_marker]
            inline_value = stripped.removeprefix(matched_marker).strip()
            if inline_value:
                sections[current_key].append(inline_value)
            continue
        if current_key:
            sections[current_key].append(line)

    parsed = {key: "\n".join(value).strip() for key, value in sections.items()}
    missing = [key for key, value in parsed.items() if not value]
    if missing:
        raise ValueError(f"OpenAI 응답에 필수 섹션이 없습니다: {', '.join(missing)}")
    return parsed
