from pathlib import Path
from unittest.mock import Mock, patch

from django.test import SimpleTestCase, override_settings

from blog.services.ppt_renderer import parse_renderer_stdout, render_presentation
from blog.slide_spec import build_slide_spec


class SlideSpecTests(SimpleTestCase):
    def test_build_slide_spec_parses_overview_and_detail_blocks(self):
        overview = """
        #Slide: 1
        #Header: AI 협업 도구의 장단점
        #Content: 업무 생산성과 리스크 균형

        #Slide: 2
        #Header: 목차
        #Content:
        1. 개요
        2. 장점
        3. 단점
        """
        detail = """
        #Slide: 3
        #Header: 장점
        #Content:
        - 생산성 향상
        - 반복 업무 감소

        #Slide: 4
        #Header: Summary
        #Content:
        - 단계적 도입 권장
        """

        spec = build_slide_spec("AI 협업 도구의 장단점", overview, detail)

        self.assertEqual(spec.version, "1.0")
        self.assertEqual(spec.template, "modern-a")
        self.assertEqual(len(spec.slides), 4)
        self.assertEqual(spec.slides[0].kind, "title")
        self.assertEqual(spec.slides[1].kind, "toc")
        self.assertEqual(spec.slides[1].bullets, ["개요", "장점", "단점"])
        self.assertEqual(spec.slides[2].kind, "bullets")
        self.assertEqual(spec.slides[3].kind, "summary")


@override_settings(PPT_RENDERER_DIR="/tmp/ppt-renderer")
class PptRendererServiceTests(SimpleTestCase):
    @patch("blog.services.ppt_renderer.subprocess.run")
    def test_render_presentation_writes_spec_and_invokes_renderer(self, mock_run):
        mock_run.return_value = Mock(stdout='{"outputPath":"/tmp/out.pptx","slideCount":2}')
        output_dir = Path("/tmp/renderer-output")
        spec = {
            "version": "1.0",
            "title": "Sample",
            "template": "modern-a",
            "language": "ko",
            "metadata": {},
            "slides": [
                {"id": "slide-1", "kind": "title", "title": "Sample", "subtitle": "", "bullets": [], "notes": ""}
            ],
        }

        result = render_presentation(spec, output_dir, "sample.pptx")

        self.assertEqual(result["slideCount"], 2)
        args = mock_run.call_args.kwargs
        self.assertEqual(args["cwd"], Path("/tmp/ppt-renderer"))
        self.assertTrue((output_dir / "spec.json").exists())

    def test_parse_renderer_stdout_ignores_npm_banner_lines(self):
        stdout = """
> ppt-renderer@0.1.0 render
> tsx src/cli.ts render --input spec.json --output out.pptx

{
  "outputPath": "/tmp/out.pptx",
  "slideCount": 2,
  "template": "modern-a"
}
"""

        result = parse_renderer_stdout(stdout)

        self.assertEqual(result["outputPath"], "/tmp/out.pptx")
        self.assertEqual(result["slideCount"], 2)
