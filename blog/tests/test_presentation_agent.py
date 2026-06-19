from pathlib import Path
from types import SimpleNamespace

from django.test import SimpleTestCase

from blog.services.presentation_agent import (
    PROMPTS_DIR,
    PresentationAgent,
    parse_presentation_sections,
)


def fake_openai_response(content):
    return SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content=content))]
    )


class PresentationAgentTests(SimpleTestCase):
    def test_render_prompt_loads_template_from_file(self):
        agent = PresentationAgent(client=SimpleNamespace())

        prompt = agent.render_prompt("presentation_prompt.txt", topic="AI 자동화")

        self.assertIn("AI 자동화", prompt)
        self.assertEqual(PROMPTS_DIR, Path(agent.prompts_dir))

    def test_parse_presentation_sections_splits_single_response(self):
        sections = parse_presentation_sections(
            "#Filename:\nAI 자동화\n\n"
            "#Overview:\n#Slide: 1\n#Header: AI 자동화\n#Content: 소개\n\n"
            "#Details:\n#Slide: 3\n#Header: 개요\n#Content:\n- 포인트 1"
        )

        self.assertEqual(sections["filename"], "AI 자동화")
        self.assertIn("#Slide: 1", sections["overview"])
        self.assertIn("#Slide: 3", sections["details"])

    def test_run_uses_one_openai_call_and_splits_response(self):
        calls = []

        def fake_create(**kwargs):
            calls.append(kwargs)
            return fake_openai_response(
                "#Filename:\noutput title.pptx\n\n"
                "#Overview:\n#Slide: 1\n#Header: AI 자동화\n#Content: 소개\n\n"
                "#Slide: 2\n#Header: 목차\n#Content:\n1. 개요\n2. 활용\n\n"
                "#Details:\n#Slide: 3\n#Header: 개요\n#Content:\n- 포인트 1\n- 포인트 2\n- 포인트 3"
            )

        client = SimpleNamespace(
            chat=SimpleNamespace(
                completions=SimpleNamespace(create=fake_create)
            )
        )
        agent = PresentationAgent(client=client)

        result = agent.run("원래 사용자 주제")

        self.assertEqual(result.source_topic, "원래 사용자 주제")
        self.assertEqual(result.output_title, "output_title")
        self.assertEqual(result.spec.title, "원래 사용자 주제")
        self.assertEqual(result.spec.slides[0].title, "AI 자동화")
        self.assertEqual(len(calls), 1)
