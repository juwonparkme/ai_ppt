import tempfile
from pathlib import Path

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.test import override_settings
from django.urls import reverse

from blog.models import UserHistory, UserTemplate


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
        self.assertContains(response, reverse("template_library"))

    def test_prompt_lists_uploaded_custom_template(self):
        UserTemplate.objects.create(
            user=self.user,
            name="My Brand Template",
            renderer_key="modern-b",
            original_filename="brand-template.pptx",
            source_pptx_path="/tmp/brand-template.pptx",
        )
        self.client.force_login(self.user)

        response = self.client.get(reverse("prompt"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "My Brand Template")
        self.assertContains(response, "brand-template.pptx")

    def test_template_library_renders_upload_form(self):
        self.client.force_login(self.user)

        response = self.client.get(reverse("template_library"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "내 PPT 템플릿 추가")
        self.assertContains(response, 'name="source_pptx"', html=False)

    def test_password_change_renders_actual_password_fields(self):
        self.client.force_login(self.user)

        response = self.client.get(reverse("password_change"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'name="old_password"', html=False)
        self.assertContains(response, 'name="new_password1"', html=False)
        self.assertContains(response, 'name="new_password2"', html=False)

    def test_profile_renders_photo_upload_without_studio_summary(self):
        self.client.force_login(self.user)

        response = self.client.get(reverse("profile"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'name="profile_image"', html=False)
        self.assertNotContains(response, "Studio Summary")

    @override_settings(MEDIA_ROOT=tempfile.gettempdir())
    def test_profile_post_saves_uploaded_photo(self):
        self.client.force_login(self.user)

        response = self.client.post(
            reverse("profile"),
            {
                "id": self.user.id,
                "username": "studio-user",
                "email": "studio@example.com",
                "profile_image": SimpleUploadedFile(
                    "avatar.png",
                    b"fake-image-bytes",
                    content_type="image/png",
                ),
            },
            follow=False,
        )

        self.assertRedirects(response, reverse("profile"), fetch_redirect_response=False)
        self.user.refresh_from_db()
        self.assertTrue(self.user.profile_image.name.endswith("avatar.png"))
        self.assertTrue(Path(self.user.profile_image.path).exists())

    def test_result_renders_editor_shell_from_session_payload(self):
        session = self.client.session
        session["last_result"] = {
            "title": "Generated Deck",
            "download_url": "/download_slide/local-demo",
            "preview_items": [
                {
                    "kind": "slide",
                    "slide_kind": "title",
                    "title": "Intro",
                    "subtitle": "Kickoff",
                    "bullets": ["one", "two"],
                    "notes": "",
                }
            ],
            "backend": "pptxgenjs",
            "primary_action_label": "다운로드",
        }
        session.save()

        response = self.client.get(reverse("result"))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Generated Deck")
        self.assertContains(response, "Magic Inspector")
        self.assertContains(response, "Intro")

    def test_history_result_renders_saved_payload(self):
        history = UserHistory.objects.get(user=self.user, ppt_title="Q1 Strategy Deck")
        history.result_payload = {
            "title": "Q1 Strategy Deck",
            "download_url": "/download_slide/local-q1",
            "template": "modern-a",
            "preview_items": [
                {
                    "kind": "slide",
                    "slide_kind": "bullets",
                    "title": "성과 요약",
                    "subtitle": "분기 성과 핵심",
                    "bullets": ["매출 증가", "유입 확대"],
                    "notes": "",
                }
            ],
            "backend": "pptxgenjs",
            "primary_action_label": "다운로드",
        }
        history.save(update_fields=["result_payload"])

        self.client.force_login(self.user)
        response = self.client.get(reverse("history_result", args=[history.id]))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "성과 요약")
        self.assertContains(response, "분기 성과 핵심")
        self.assertContains(response, "presentation_result_template_preview.js")
        self.assertContains(response, "ppt-assets/modern-a/page-01-img-01.jpg")
