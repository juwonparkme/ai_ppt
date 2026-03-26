import tempfile
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, call, patch

from django.test import TestCase, override_settings
from django.urls import reverse

from blog.models import UserHistory
from blog.slide_spec import build_slide_spec
from blog.views import encode_local_download_token, normalize_output_title


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

    def make_agent_result(self, source_topic, output_title):
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
            spec=build_slide_spec(source_topic, overview_text, detail_text),
        )

    @override_settings(PPT_RENDER_BACKEND="legacy-google")
    @patch("blog.views.create_slides", return_value="https://slides.example/presentation")
    @patch("blog.views.split_slides")
    @patch("blog.views.build_presentation_agent")
    @patch("blog.views.random.randint", return_value=7)
    @patch("blog.views.os.makedirs", side_effect=[FileExistsError, None])
    def test_prompt_post_uses_suffix_title_after_name_collision(
        self,
        mock_makedirs,
        mock_randint,
        mock_build_presentation_agent,
        mock_split_slides,
        mock_create_slides,
    ):
        fake_agent = SimpleNamespace(
            generate_filename=Mock(return_value="Generated Name"),
            run=Mock(return_value=self.make_agent_result("AI topic", "Generated_Name")),
        )
        mock_build_presentation_agent.return_value = fake_agent

        self.client.force_login(self.user)
        response = self.client.post(
            reverse("prompt"),
            {"presentation_id": "template-123", "user-input": "AI topic"},
            HTTP_HOST="127.0.0.1",
        )

        self.assertRedirects(response, reverse("result"), fetch_redirect_response=False)
        self.assertEqual(
            mock_makedirs.call_args_list,
            [call("Generated_Name"), call("Generated_Name_7")],
        )
        fake_agent.generate_filename.assert_called_once_with("AI topic")
        fake_agent.run.assert_called_once_with("AI topic", output_title="Generated_Name", template="modern-a")
        self.assertEqual(mock_split_slides.call_count, 2)
        mock_create_slides.assert_called_once_with("template-123", "Generated_Name_7")

        history = UserHistory.objects.get(user=self.user)
        self.assertEqual(history.ppt_title, "Generated_Name_7")
        self.assertEqual(history.ppt_url, "https://slides.example/presentation")
        self.assertEqual(history.backend, "legacy-google")
        self.assertEqual(history.status, "completed")

    @override_settings(PPT_RENDER_BACKEND="pptxgenjs")
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
            generate_filename=Mock(return_value="Generated Name"),
            run=Mock(return_value=self.make_agent_result("AI topic", "Generated_Name")),
        )
        mock_build_presentation_agent.return_value = fake_agent
        mock_render_presentation.return_value = {
            "outputPath": "/tmp/rendered/Generated_Name/Generated_Name.pptx",
            "slideCount": 3,
        }

        self.client.force_login(self.user)
        response = self.client.post(
            reverse("prompt"),
            {"presentation_id": "template-123", "user-input": "AI topic"},
            HTTP_HOST="127.0.0.1",
        )

        self.assertRedirects(response, reverse("result"), fetch_redirect_response=False)
        fake_agent.generate_filename.assert_called_once_with("AI topic")
        fake_agent.run.assert_called_once_with("AI topic", output_title="Generated_Name", template="modern-a")
        mock_reserve_render_output_dir.assert_called_once_with("Generated_Name")
        mock_render_presentation.assert_called_once()
        render_spec = mock_render_presentation.call_args.args[0]
        self.assertEqual(render_spec["title"], "AI topic")

        history = UserHistory.objects.get(user=self.user)
        self.assertEqual(history.ppt_title, "Generated_Name")
        self.assertEqual(history.ppt_url, "")
        self.assertEqual(history.backend, "pptxgenjs")
        self.assertEqual(history.status, "completed")
        self.assertEqual(history.file_path, "/tmp/rendered/Generated_Name/Generated_Name.pptx")

        session = self.client.session
        self.assertEqual(session["last_result"]["backend"], "pptxgenjs")
        self.assertTrue(session["last_result"]["download_url"].startswith("/download_slide/local-"))

    @override_settings(PPT_RENDER_BACKEND="pptxgenjs")
    @patch("blog.views.render_with_pptxgenjs", side_effect=RuntimeError("renderer failed"))
    @patch("blog.views.build_presentation_agent")
    def test_prompt_post_records_failed_render_history(
        self,
        mock_build_presentation_agent,
        mock_render_with_pptxgenjs,
    ):
        fake_agent = SimpleNamespace(
            generate_filename=Mock(return_value="Broken Deck"),
            run=Mock(return_value=self.make_agent_result("AI topic", "Broken_Deck")),
        )
        mock_build_presentation_agent.return_value = fake_agent

        self.client.force_login(self.user)
        response = self.client.post(
            reverse("prompt"),
            {"presentation_id": "template-123", "user-input": "AI topic"},
            HTTP_HOST="127.0.0.1",
        )

        self.assertRedirects(response, reverse("profile"), fetch_redirect_response=False)
        mock_render_with_pptxgenjs.assert_called_once()
        args, _ = mock_render_with_pptxgenjs.call_args
        self.assertEqual(args[0].output_title, "Broken_Deck")
        self.assertEqual(args[1], "modern-a")

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
            generate_filename=Mock(return_value="Disk Deck"),
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
