from django.test import TestCase
from django.urls import reverse

from blog.models import UserHistory


class WebTemplateSmokeTests(TestCase):
    def setUp(self):
        self.user = UserHistory._meta.get_field("user").related_model.objects.create_user(
            username="studio-user",
            password="CodexSmoke123!",
            email="studio@example.com",
            nickname="studio-user",
        )
        UserHistory.objects.create(
            user=self.user,
            ppt_title="Q1 Strategy Deck",
            ppt_url="",
            backend="pptxgenjs",
            file_path="/tmp/Q1_Strategy_Deck.pptx",
            status="completed",
        )

    def test_home_renders_dashboard_recent_history(self):
        self.client.force_login(self.user)

        response = self.client.get(reverse("home"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Q1 Strategy Deck")
        self.assertContains(response, "최근 프로젝트")

    def test_prompt_get_prefills_topic_from_query_string(self):
        self.client.force_login(self.user)

        response = self.client.get(reverse("prompt"), {"topic": "AI 도입 전략"})

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "AI 도입 전략")
        self.assertContains(response, "템플릿 선택")

    def test_password_change_renders_actual_password_fields(self):
        self.client.force_login(self.user)

        response = self.client.get(reverse("password_change"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'name="old_password"', html=False)
        self.assertContains(response, 'name="new_password1"', html=False)
        self.assertContains(response, 'name="new_password2"', html=False)

    def test_result_renders_editor_shell_from_session_payload(self):
        session = self.client.session
        session["last_result"] = {
            "title": "Generated Deck",
            "download_url": "/download_slide/local-demo",
            "preview_items": [{"kind": "text", "value": "Intro"}],
            "backend": "pptxgenjs",
        }
        session.save()

        response = self.client.get(reverse("result"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Generated Deck")
        self.assertContains(response, "Magic Inspector")
