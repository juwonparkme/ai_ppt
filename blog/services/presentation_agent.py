from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
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

    def generate_filename(self, topic: str) -> str:
        prompt = self.render_prompt("filename_prompt.txt", topic=topic)
        return self._complete(
            model=settings.OPENAI_FILENAME_MODEL,
            prompt=prompt,
            temperature=0.5,
            max_tokens=30,
        )

    def generate_overview(self, topic: str) -> str:
        prompt = self.render_prompt("overview_prompt.txt", topic=topic)
        return self._complete(
            model=settings.OPENAI_PRESENTATION_MODEL,
            prompt=prompt,
            temperature=0.8,
            max_tokens=4096,
        )

    def generate_details(self, overview_text: str) -> str:
        prompt = self.render_prompt("detail_prompt.txt", overview_text=overview_text)
        return self._complete(
            model=settings.OPENAI_PRESENTATION_MODEL,
            prompt=prompt,
            temperature=0.5,
            max_tokens=4096,
        )

    def run(
        self,
        source_topic: str,
        *,
        output_title: str,
        template: str = "modern-a",
    ) -> PresentationAgentResult:
        overview_text = self.generate_overview(source_topic)
        detail_text = self.generate_details(overview_text)
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
