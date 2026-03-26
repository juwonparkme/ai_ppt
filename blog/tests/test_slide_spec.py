from pathlib import Path
from tempfile import TemporaryDirectory
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


RENDERER_DIR = Path(__file__).resolve().parents[2] / "ppt-renderer"


@override_settings(PPT_RENDERER_DIR=str(RENDERER_DIR))
class PptRendererSmokeTests(SimpleTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        if not (RENDERER_DIR / "node_modules").exists():
            raise cls.skipTest("ppt-renderer dependencies are not installed")

    def test_render_presentation_smoke_generates_template_a_and_b_files(self):
        specs = [
            {
                "version": "1.0",
                "title": "경제학자, 엥겔스 과제 발표",
                "template": "modern-a",
                "language": "ko",
                "metadata": {"topic": "경제학자, 엥겔스 과제 발표"},
                "slides": [
                    {"id": "s1", "kind": "title", "title": "경제학자, 엥겔스 과제 발표", "subtitle": "엥겔스의 삶과 이론적 흔적", "bullets": [], "notes": ""},
                    {"id": "s2", "kind": "toc", "title": "목차", "subtitle": "", "bullets": ["서론", "핵심 이론", "현대적 의미"], "notes": ""},
                    {"id": "s3", "kind": "bullets", "title": "서론", "subtitle": "엥겔스의 삶과 문제의식", "bullets": ["산업화 시대 배경", "마르크스와의 협업", "자본주의 비판"], "notes": ""},
                    {"id": "s4", "kind": "summary", "title": "요약", "subtitle": "", "bullets": ["산업 구조 분석", "계급 문제 제기", "현대 사회에도 유효"], "notes": ""},
                ],
            },
            {
                "version": "1.0",
                "title": "편집하기 쉬운 프레젠테이션",
                "template": "modern-b",
                "language": "ko",
                "metadata": {"topic": "편집하기 쉬운 프레젠테이션"},
                "slides": [
                    {"id": "s1", "kind": "title", "title": "편집하기 쉬운 프레젠테이션", "subtitle": "정리된 구조와 깔끔한 시각 언어", "bullets": [], "notes": ""},
                    {"id": "s2", "kind": "toc", "title": "목차", "subtitle": "", "bullets": ["개요", "성과", "계획"], "notes": ""},
                    {"id": "s3", "kind": "bullets", "title": "프로젝트 개요 및 핵심 내용", "subtitle": "", "bullets": ["서비스 변화 대응", "경쟁력 강화", "지속 성장 기반"], "notes": ""},
                    {"id": "s4", "kind": "summary", "title": "프로젝트 성과 및 결론", "subtitle": "", "bullets": ["매출 성장", "시장 점유율 확대", "지속 가능성 확보"], "notes": ""},
                ],
            },
        ]

        with TemporaryDirectory() as temp_dir:
            output_root = Path(temp_dir)
            for index, spec in enumerate(specs, start=1):
                output_dir = output_root / f"deck-{index}"
                result = render_presentation(spec, output_dir, f"deck-{index}.pptx")
                output_path = Path(result["outputPath"])

                self.assertTrue(output_path.exists())
                self.assertGreater(output_path.stat().st_size, 0)
