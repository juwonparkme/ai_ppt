from types import SimpleNamespace
from unittest.mock import Mock, call, patch

from django.test import TestCase, override_settings
from django.urls import reverse

from blog.models import UserHistory


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
