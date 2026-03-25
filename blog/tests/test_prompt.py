from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, call, patch

from django.test import TestCase, override_settings
from django.urls import reverse

from blog.models import UserHistory
from blog.views import encode_local_download_token


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

    @override_settings(PPT_RENDER_BACKEND="legacy-google")
    @patch("blog.views.create_slides", return_value="https://slides.example/presentation")
    @patch("blog.views.split_slides")
    @patch("blog.views.create_ppt_detail_text", return_value="#Slide: 3\n#Header: Detail\n#Content: Body")
    @patch("blog.views.create_ppt_text", return_value="#Slide: 1\n#Header: Title\n#Content: Body")
    @patch("blog.views.random.randint", return_value=7)
    @patch("blog.views.os.makedirs", side_effect=[FileExistsError, None])
    @patch("blog.views.get_openai_client")
    def test_prompt_post_uses_suffix_title_after_name_collision(
        self,
        mock_get_openai_client,
        mock_makedirs,
        mock_randint,
        mock_create_ppt_text,
        mock_create_ppt_detail_text,
        mock_split_slides,
        mock_create_slides,
    ):
        fake_client = SimpleNamespace(
            chat=SimpleNamespace(completions=Mock(create=Mock(return_value=fake_openai_response("Generated Name"))))
        )
        mock_get_openai_client.return_value = fake_client

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
        mock_create_ppt_text.assert_called_once_with("Generated_Name_7")
        mock_create_ppt_detail_text.assert_called_once_with()
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
    @patch("blog.views.create_ppt_detail_text", return_value="#Slide: 3\n#Header: 장점\n#Content:\n- 생산성 향상")
    @patch(
        "blog.views.create_ppt_text",
        return_value=(
            "#Slide: 1\n#Header: AI 협업 도구의 장단점\n#Content: 업무 생산성과 리스크 균형\n\n"
            "#Slide: 2\n#Header: 목차\n#Content:\n1. 개요\n2. 장점"
        ),
    )
    def test_prompt_post_uses_pptxgenjs_renderer(
        self,
        mock_create_ppt_text,
        mock_create_ppt_detail_text,
        mock_render_presentation,
        mock_reserve_render_output_dir,
    ):
        fake_client = SimpleNamespace(
            chat=SimpleNamespace(completions=Mock(create=Mock(return_value=fake_openai_response("Generated Name"))))
        )
        mock_render_presentation.return_value = {
            "outputPath": "/tmp/rendered/Generated_Name/Generated_Name.pptx",
            "slideCount": 3,
        }

        with patch("blog.views.get_openai_client", return_value=fake_client):
            self.client.force_login(self.user)
            response = self.client.post(
                reverse("prompt"),
                {"presentation_id": "template-123", "user-input": "AI topic"},
                HTTP_HOST="127.0.0.1",
            )

        self.assertRedirects(response, reverse("result"), fetch_redirect_response=False)
        mock_create_ppt_text.assert_called_once_with("Generated_Name")
        mock_create_ppt_detail_text.assert_called_once()
        mock_reserve_render_output_dir.assert_called_once_with("Generated_Name")
        mock_render_presentation.assert_called_once()

        history = UserHistory.objects.get(user=self.user)
        self.assertEqual(history.ppt_title, "Generated_Name")
        self.assertTrue(history.ppt_url.startswith("/download_slide/local-"))
        self.assertEqual(history.backend, "pptxgenjs")
        self.assertEqual(history.status, "completed")
        self.assertEqual(history.file_path, "/tmp/rendered/Generated_Name/Generated_Name.pptx")

        session = self.client.session
        self.assertEqual(session["last_result"]["backend"], "pptxgenjs")
        self.assertEqual(session["last_result"]["download_url"], history.ppt_url)

    @override_settings(PPT_RENDER_BACKEND="pptxgenjs")
    @patch("blog.views.render_with_pptxgenjs", side_effect=RuntimeError("renderer failed"))
    def test_prompt_post_records_failed_render_history(self, mock_render_with_pptxgenjs):
        fake_client = SimpleNamespace(
            chat=SimpleNamespace(completions=Mock(create=Mock(return_value=fake_openai_response("Broken Deck"))))
        )

        with patch("blog.views.get_openai_client", return_value=fake_client):
            self.client.force_login(self.user)
            response = self.client.post(
                reverse("prompt"),
                {"presentation_id": "template-123", "user-input": "AI topic"},
                HTTP_HOST="127.0.0.1",
            )

        self.assertRedirects(response, reverse("profile"), fetch_redirect_response=False)
        mock_render_with_pptxgenjs.assert_called_once()
        args, _ = mock_render_with_pptxgenjs.call_args
        self.assertEqual(args[1:], ("Broken_Deck", "modern-a"))

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
