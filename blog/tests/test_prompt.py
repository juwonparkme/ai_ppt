import json
import tempfile
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.urls import reverse

from blog.models import UserHistory, UserTemplate
from blog.slide_spec import build_slide_spec
from blog.views import (
    build_attachment_disposition,
    build_custom_template_source_id,
    encode_local_download_token,
    normalize_output_title,
    resolve_pptx_template,
)


def fake_openai_response(content):
    return SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content=content))]
    )


@override_settings(ALLOWED_HOSTS=["127.0.0.1", "localhost", "testserver"])
class PromptViewTests(TestCase):
    def setUp(self):
        self.user = UserHistory._meta.get_field("user").related_model.objects.create_user(
            username="prompt-user",
            password="CodexSmoke123!",
            email="prompt@example.com",
            nickname="prompt-user",
        )

    def test_normalize_output_title_strips_file_extensions(self):
        self.assertEqual(normalize_output_title("python_ppt_관한.pptx"), "python_ppt_관한")
        self.assertEqual(normalize_output_title("python_ppt_관한.txt"), "python_ppt_관한")

    def test_resolve_pptx_template_maps_known_source_ids(self):
        self.assertEqual(
            resolve_pptx_template("1Mohc1dhmGKbE1NALs8QRRftFK8wnJMJ-CUOMpv36Z50"),
            "modern-a",
        )
        self.assertEqual(
            resolve_pptx_template("19OAsGTO9QKHR-GQ-Fw_uc1JrYuC8NC58pj711l2ByD4"),
            "modern-b",
        )
        self.assertEqual(resolve_pptx_template("unknown-template"), "modern-a")

    def test_resolve_pptx_template_uses_user_template_renderer(self):
        template = UserTemplate.objects.create(
            user=self.user,
            name="Investor Deck",
            renderer_key="modern-b",
            original_filename="investor-deck.pptx",
            source_pptx_path="/tmp/investor-deck.pptx",
        )

        self.assertEqual(
            resolve_pptx_template(build_custom_template_source_id(template.id), user=self.user),
            "modern-b",
        )

    def test_build_attachment_disposition_includes_fallback_and_utf8_name(self):
        header = build_attachment_disposition("파이썬 개요.pptx")

        self.assertIn('attachment; filename="presentation.pptx"', header)
        self.assertIn("filename*=utf-8''", header)
        self.assertIn("%ED%8C%8C%EC%9D%B4%EC%8D%AC%20%EA%B0%9C%EC%9A%94.pptx", header)

    def make_agent_result(self, source_topic, output_title, template="modern-a"):
        overview_text = (
            "#Slide: 1\n#Header: AI 협업 도구의 장단점\n#Content: 업무 생산성과 리스크 균형\n\n"
            "#Slide: 2\n#Header: 목차\n#Content:\n1. 개요\n2. 장점"
        )
        detail_text = "#Slide: 3\n#Header: 장점\n#Content:\n- 생산성 향상\n- 반복 작업 축소\n- 아이디어 확장"
        return SimpleNamespace(
            source_topic=source_topic,
            output_title=output_title,
            overview_text=overview_text,
            detail_text=detail_text,
            spec=build_slide_spec(source_topic, overview_text, detail_text, template=template),
        )

    @patch("blog.views.reserve_render_output_dir", return_value=("Generated_Name", Path("/tmp/rendered/Generated_Name")))
    @patch("blog.views.render_presentation")
    @patch("blog.views.build_presentation_agent")
    def test_prompt_post_uses_pptxgenjs_renderer(
        self,
        mock_build_presentation_agent,
        mock_render_presentation,
        mock_reserve_render_output_dir,
    ):
        fake_agent = SimpleNamespace(
            run=Mock(return_value=self.make_agent_result("AI topic", "Generated_Name", template="modern-b")),
        )
        mock_build_presentation_agent.return_value = fake_agent
        mock_render_presentation.return_value = {
            "outputPath": "/tmp/rendered/Generated_Name/Generated_Name.pptx",
            "slideCount": 3,
        }

        self.client.force_login(self.user)
        response = self.client.post(
            reverse("prompt"),
            {"presentation_id": "19OAsGTO9QKHR-GQ-Fw_uc1JrYuC8NC58pj711l2ByD4", "user-input": "AI topic"},
            HTTP_HOST="127.0.0.1",
        )

        self.assertRedirects(response, reverse("result"), fetch_redirect_response=False)
        fake_agent.run.assert_called_once_with("AI topic", template="modern-b")
        mock_reserve_render_output_dir.assert_called_once_with("Generated_Name")
        mock_render_presentation.assert_called_once()
        render_spec = mock_render_presentation.call_args.args[0]
        self.assertEqual(render_spec["title"], "AI topic")
        self.assertEqual(render_spec["template"], "modern-b")

        history = UserHistory.objects.get(user=self.user)
        self.assertEqual(history.ppt_title, "Generated_Name")
        self.assertEqual(history.ppt_url, "")
        self.assertEqual(history.backend, "pptxgenjs")
        self.assertEqual(history.status, "completed")
        self.assertEqual(history.file_path, "/tmp/rendered/Generated_Name/Generated_Name.pptx")
        self.assertEqual(history.result_payload["preview_items"][0]["title"], "AI 협업 도구의 장단점")

        session = self.client.session
        self.assertEqual(session["last_result"]["backend"], "pptxgenjs")
        self.assertTrue(session["last_result"]["download_url"].startswith("/download_slide/local-"))
        self.assertEqual(session["last_result"]["preview_items"][2]["bullets"][0], "생산성 향상")

    @override_settings(PPT_RENDER_BACKEND="pptxgenjs")
    @patch("blog.views.render_with_pptxgenjs", side_effect=RuntimeError("renderer failed"))
    @patch("blog.views.build_presentation_agent")
    def test_prompt_post_records_failed_render_history(
        self,
        mock_build_presentation_agent,
        mock_render_with_pptxgenjs,
    ):
        fake_agent = SimpleNamespace(
            run=Mock(return_value=self.make_agent_result("AI topic", "Broken_Deck", template="modern-b")),
        )
        mock_build_presentation_agent.return_value = fake_agent

        self.client.force_login(self.user)
        response = self.client.post(
            reverse("prompt"),
            {"presentation_id": "19OAsGTO9QKHR-GQ-Fw_uc1JrYuC8NC58pj711l2ByD4", "user-input": "AI topic"},
            HTTP_HOST="127.0.0.1",
        )

        self.assertRedirects(response, reverse("profile"), fetch_redirect_response=False)
        mock_render_with_pptxgenjs.assert_called_once()
        args, _ = mock_render_with_pptxgenjs.call_args
        self.assertEqual(args[0].output_title, "Broken_Deck")
        self.assertEqual(args[1], "modern-b")

        history = UserHistory.objects.get(user=self.user)
        self.assertEqual(history.ppt_title, "Broken_Deck")
        self.assertEqual(history.backend, "pptxgenjs")
        self.assertEqual(history.status, "failed")
        self.assertEqual(history.error_message, "renderer failed")
        self.assertEqual(history.ppt_url, "")

    @override_settings(PPT_RENDER_OUTPUT_DIR="/tmp/rendered-presentations")
    def test_download_slide_returns_local_pptx_file(self):
        output_dir = Path("/tmp/rendered-presentations/test-download")
        output_dir.mkdir(parents=True, exist_ok=True)
        pptx_path = output_dir / "deck.pptx"
        pptx_path.write_bytes(b"pptx-data")

        token = encode_local_download_token(pptx_path)

        self.client.force_login(self.user)
        response = self.client.get(reverse("download_slide", args=[token]), HTTP_HOST="127.0.0.1")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "application/vnd.openxmlformats-officedocument.presentationml.presentation")
        self.assertIn('attachment; filename="deck.pptx"', response["Content-Disposition"])
        self.assertIn("filename*=utf-8''deck.pptx", response["Content-Disposition"])

    @override_settings(PPT_RENDER_OUTPUT_DIR="/tmp/rendered-presentations")
    def test_download_slide_uses_legacy_pptx_file_with_normalized_filename(self):
        output_dir = Path("/tmp/rendered-presentations/test-legacy")
        output_dir.mkdir(parents=True, exist_ok=True)
        requested_path = output_dir / "legacy-deck.pptx"
        legacy_path = Path(f"{requested_path}.pptx")
        legacy_path.write_bytes(b"pptx-data")

        token = encode_local_download_token(requested_path)

        self.client.force_login(self.user)
        response = self.client.get(reverse("download_slide", args=[token]), HTTP_HOST="127.0.0.1")

        self.assertEqual(response.status_code, 200)
        self.assertIn('attachment; filename="legacy-deck.pptx"', response["Content-Disposition"])

    def test_prompt_post_creates_pptx_file_on_disk(self):
        temp_dir = Path(tempfile.mkdtemp(prefix="ppt-auto-render-"))

        def fake_render(spec, output_dir, output_name):
            output_path = output_dir / output_name
            output_path.write_bytes(b"pptx-data")
            return {"outputPath": str(output_path), "slideCount": len(spec["slides"])}

        fake_agent = SimpleNamespace(
            run=Mock(return_value=self.make_agent_result("AI topic", "Disk_Deck")),
        )

        with override_settings(PPT_RENDER_BACKEND="pptxgenjs", PPT_RENDER_OUTPUT_DIR=str(temp_dir)):
            with patch("blog.views.build_presentation_agent", return_value=fake_agent):
                with patch("blog.views.render_presentation", side_effect=fake_render):
                    self.client.force_login(self.user)
                    response = self.client.post(
                        reverse("prompt"),
                        {"presentation_id": "template-123", "user-input": "AI topic"},
                        HTTP_HOST="127.0.0.1",
                    )

        self.assertRedirects(response, reverse("result"), fetch_redirect_response=False)
        history = UserHistory.objects.get(user=self.user, ppt_title="Disk_Deck")
        self.assertTrue(Path(history.file_path).exists())

    def test_template_library_upload_creates_user_template_from_pdf(self):
        temp_dir = Path(tempfile.mkdtemp(prefix="ppt-user-template-"))

        with override_settings(USER_TEMPLATE_STORAGE_DIR=str(temp_dir)):
            self.client.force_login(self.user)
            response = self.client.post(
                reverse("template_library"),
                {
                    "name": "Custom Pitch Deck",
                    "renderer_key": "modern-b",
                    "source_pptx": SimpleUploadedFile(
                        "custom-pitch.pdf",
                        b"%PDF-1.4 template",
                        content_type="application/pdf",
                    ),
                },
                HTTP_HOST="127.0.0.1",
            )

        template = UserTemplate.objects.get(user=self.user, name="Custom Pitch Deck")
        self.assertRedirects(
            response,
            f"{reverse('prompt')}?template={build_custom_template_source_id(template.id)}",
            fetch_redirect_response=False,
        )
        self.assertTrue(Path(template.source_pptx_path).exists())
        self.assertTrue(template.source_pptx_path.endswith(".pdf"))
        self.assertEqual(template.original_filename, "custom-pitch.pdf")
        self.assertEqual(template.renderer_key, "modern-b")

    @override_settings(PPT_RENDER_BACKEND="pptxgenjs")
    @patch("blog.views.reserve_render_output_dir", return_value=("Custom_Deck", Path("/tmp/rendered/Custom_Deck")))
    @patch("blog.views.render_presentation")
    @patch("blog.views.build_presentation_agent")
    def test_prompt_post_uses_custom_template_renderer_mapping(
        self,
        mock_build_presentation_agent,
        mock_render_presentation,
        mock_reserve_render_output_dir,
    ):
        custom_template = UserTemplate.objects.create(
            user=self.user,
            name="Custom Pitch",
            renderer_key="modern-b",
            original_filename="custom-pitch.pptx",
            source_pptx_path="/tmp/custom-pitch.pptx",
        )
        fake_agent = SimpleNamespace(
            run=Mock(return_value=self.make_agent_result("AI topic", "Custom_Deck", template="modern-b")),
        )
        mock_build_presentation_agent.return_value = fake_agent
        mock_render_presentation.return_value = {
            "outputPath": "/tmp/rendered/Custom_Deck/Custom_Deck.pptx",
            "slideCount": 3,
        }

        self.client.force_login(self.user)
        response = self.client.post(
            reverse("prompt"),
            {"presentation_id": build_custom_template_source_id(custom_template.id), "user-input": "AI topic"},
            HTTP_HOST="127.0.0.1",
        )

        self.assertRedirects(response, reverse("result"), fetch_redirect_response=False)
        fake_agent.run.assert_called_once_with("AI topic", template="modern-b")
        render_spec = mock_render_presentation.call_args.args[0]
        self.assertEqual(render_spec["template"], "modern-b")

    def test_result_without_last_result_redirects_to_prompt(self):
        self.client.force_login(self.user)

        response = self.client.get(reverse("result"), HTTP_HOST="127.0.0.1")

        self.assertRedirects(response, reverse("prompt"), fetch_redirect_response=False)

    def test_result_editor_save_updates_session_and_history_payload(self):
        history = UserHistory.objects.create(
            user=self.user,
            ppt_title="Generated Deck",
            ppt_url="",
            backend="pptxgenjs",
            file_path="/tmp/generated-deck.pptx",
            result_payload={
                "title": "Generated Deck",
                "download_url": "/download_slide/local-demo",
                "preview_items": [
                    {
                        "kind": "slide",
                        "slide_kind": "title",
                        "title": "Intro",
                        "subtitle": "Kickoff",
                        "bullets": [],
                        "notes": "",
                    }
                ],
                "backend": "pptxgenjs",
                "template": "modern-a",
                "primary_action_label": "다운로드",
            },
            status="completed",
        )
        history.result_payload["history_id"] = history.id
        history.save(update_fields=["result_payload"])

        self.client.force_login(self.user)
        session = self.client.session
        session["last_result"] = history.result_payload
        session.save()

        response = self.client.post(
            reverse("result_editor"),
            data=json.dumps(
                {
                    "action": "save",
                    "history_id": history.id,
                    "title": "Edited Deck",
                    "template": "modern-a",
                    "backend": "pptxgenjs",
                    "primary_action_label": "다운로드",
                    "preview_items": [
                        {
                            "kind": "slide",
                            "slide_kind": "title",
                            "title": "수정된 인트로",
                            "subtitle": "새 부제",
                            "bullets": [],
                            "notes": "",
                        }
                    ],
                }
            ),
            content_type="application/json",
            HTTP_HOST="127.0.0.1",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "saved")

        history.refresh_from_db()
        self.assertEqual(history.ppt_title, "Edited Deck")
        self.assertEqual(history.result_payload["preview_items"][0]["title"], "수정된 인트로")

        session = self.client.session
        self.assertEqual(session["last_result"]["title"], "Edited Deck")
        self.assertEqual(session["last_result"]["history_id"], history.id)

    @patch(
        "blog.views.reserve_render_output_dir",
        return_value=("Edited_Deck", Path("/tmp/rendered/Edited_Deck")),
    )
    @patch("blog.views.render_presentation")
    def test_result_editor_render_updates_download_and_backend(
        self,
        mock_render_presentation,
        mock_reserve_render_output_dir,
    ):
        history = UserHistory.objects.create(
            user=self.user,
            ppt_title="Generated Deck",
            ppt_url="",
            backend="pptxgenjs",
            result_payload={
                "title": "Edited Deck",
                "download_url": "",
                "preview_items": [
                    {
                        "kind": "slide",
                        "slide_kind": "title",
                        "title": "커버",
                        "subtitle": "핵심 메시지",
                        "bullets": [],
                        "notes": "",
                    },
                    {
                        "kind": "slide",
                        "slide_kind": "bullets",
                        "title": "본문",
                        "subtitle": "",
                        "bullets": ["첫 포인트", "둘째 포인트"],
                        "notes": "",
                    },
                ],
                "backend": "pptxgenjs",
                "template": "modern-b",
                "primary_action_label": "다운로드",
            },
            status="completed",
        )
        history.result_payload["history_id"] = history.id
        history.save(update_fields=["result_payload"])

        mock_render_presentation.return_value = {
            "outputPath": "/tmp/rendered/Edited_Deck/Edited_Deck.pptx",
            "slideCount": 2,
        }

        self.client.force_login(self.user)
        session = self.client.session
        session["last_result"] = history.result_payload
        session.save()

        response = self.client.post(
            reverse("result_editor"),
            data=json.dumps(
                {
                    "action": "render",
                    "history_id": history.id,
                    "title": "Edited Deck",
                    "template": "modern-b",
                    "backend": "pptxgenjs",
                    "primary_action_label": "다운로드",
                    "preview_items": history.result_payload["preview_items"],
                }
            ),
            content_type="application/json",
            HTTP_HOST="127.0.0.1",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "rendered")
        self.assertTrue(response.json()["download_url"].startswith("/download_slide/local-"))
        self.assertEqual(response.json()["backend"], "pptxgenjs")

        mock_reserve_render_output_dir.assert_called_once_with("Edited_Deck")
        render_spec = mock_render_presentation.call_args.args[0]
        self.assertEqual(render_spec["template"], "modern-b")
        self.assertEqual(render_spec["slides"][1]["bullets"][0], "첫 포인트")

        history.refresh_from_db()
        self.assertEqual(history.backend, "pptxgenjs")
        self.assertEqual(history.file_path, "/tmp/rendered/Edited_Deck/Edited_Deck.pptx")
        self.assertEqual(history.ppt_url, "")

        session = self.client.session
        self.assertEqual(session["last_result"]["title"], "Edited_Deck")
        self.assertTrue(session["last_result"]["download_url"].startswith("/download_slide/local-"))
