# from django.contrib.auth.models import AbstractUser
# from django.db import models
#
# class CustomUser(AbstractUser):
#     email = models.EmailField(unique=True) #이메일중복방지,데이터 덮어씌우기 방지
#     nickname = models.CharField(max_length=50, unique=True)
#
#
#     def __str__(self):
#         return self.username

from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    nickname = models.CharField(max_length=50, unique=True)
    profile_image = models.FileField(upload_to="profile-images/", blank=True)

    groups = models.ManyToManyField(
        "auth.Group",
        related_name="customuser_set",  # 기존 'user_set'과 충돌 방지
        blank=True
    )
    user_permissions = models.ManyToManyField(
        "auth.Permission",
        related_name="customuser_permissions_set",  # 기존 'user_set'과 충돌 방지
        blank=True
    )

    def __str__(self):
        return self.username

class UserHistory(models.Model):
    BACKEND_CHOICES = [
        ("pptxgenjs", "PptxGenJS"),
    ]
    STATUS_CHOICES = [
        ("completed", "Completed"),
        ("failed", "Failed"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    ppt_title = models.CharField(max_length=500)
    ppt_url = models.CharField(max_length=500)
    backend = models.CharField(max_length=32, choices=BACKEND_CHOICES, default="pptxgenjs")
    file_path = models.CharField(max_length=500, blank=True, default="")
    result_payload = models.JSONField(blank=True, default=dict)
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default="completed")
    error_message = models.TextField(blank=True, default="")
    create_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.ppt_title} ({self.status})"


class UserTemplate(models.Model):
    RENDERER_CHOICES = [
        ("modern-a", "Template 1"),
        ("modern-b", "Template 2"),
    ]
    RENDERER_LABEL_BY_KEY = {
        "modern-a": "design_tem1",
        "modern-b": "design_tem2",
    }

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    name = models.CharField(max_length=120)
    renderer_key = models.CharField(max_length=32, choices=RENDERER_CHOICES, default="modern-a")
    original_filename = models.CharField(max_length=255)
    source_pptx_path = models.CharField(max_length=500)
    create_date = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-create_date"]

    def __str__(self):
        return f"{self.user.username} - {self.name}"

    @property
    def renderer_label(self):
        return self.RENDERER_LABEL_BY_KEY.get(self.renderer_key, self.renderer_key)
