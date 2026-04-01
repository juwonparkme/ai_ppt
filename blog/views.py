from base64 import urlsafe_b64decode, urlsafe_b64encode
from pathlib import Path
from urllib.parse import quote
from django.shortcuts import get_object_or_404, redirect, render
from .forms import (
    CustomPasswordChangeForm,
    CustomTemplateUploadForm,
    ProfileUpdateForm,
    SignUpForm,
    UserUpdateForm,
)
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib.auth.forms import AuthenticationForm
from django.contrib.auth.decorators import login_required
from django.contrib import messages
import os, re, openai, json
import random
import logging
from django.http import FileResponse, Http404, HttpResponse, JsonResponse
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.middleware.csrf import get_token
from django.templatetags.static import static
from django.urls import reverse
from django.views.decorators.http import require_POST

from .models import UserHistory, UserTemplate
from .services.editor_payload import (
    build_presentation_spec_from_payload,
    normalize_result_payload as normalize_editor_result_payload,
)
from .services.presentation_agent import PresentationAgent
from .services.ppt_renderer import render_presentation

# OpenAI 설정
SLIDE_TITLE_TEXT = ' '
filename = ' '

PPTX_TEMPLATE_BY_SOURCE_ID = {
    "1Mohc1dhmGKbE1NALs8QRRftFK8wnJMJ-CUOMpv36Z50": "modern-a",
    "19OAsGTO9QKHR-GQ-Fw_uc1JrYuC8NC58pj711l2ByD4": "modern-b",
    "1QTy_L8GU-fDZV5jE9ZO5aEuW2l1eDcFa6NH5BOYR8Ak": "modern-a",
}

SOURCE_TEMPLATE_ID_BY_KEY = {
    "modern-a": "1Mohc1dhmGKbE1NALs8QRRftFK8wnJMJ-CUOMpv36Z50",
    "modern-b": "19OAsGTO9QKHR-GQ-Fw_uc1JrYuC8NC58pj711l2ByD4",
    "default": "1QTy_L8GU-fDZV5jE9ZO5aEuW2l1eDcFa6NH5BOYR8Ak",
}

DEFAULT_SOURCE_TEMPLATE_ID = SOURCE_TEMPLATE_ID_BY_KEY["modern-a"]
CUSTOM_TEMPLATE_SOURCE_PREFIX = "user-template-"
BUILT_IN_TEMPLATE_CARDS = [
    {
        "source_id": "1Mohc1dhmGKbE1NALs8QRRftFK8wnJMJ-CUOMpv36Z50",
        "eyebrow": "design_tem1",
        "title": "design_tem1",
        "description": "에디토리얼 톤. 강한 대비, 큰 메시지, 발표용 헤드라인.",
        "preview_static_path": "css/img/design_tem1_preview.png",
        "template_key": "modern-a",
    },
    {
        "source_id": "19OAsGTO9QKHR-GQ-Fw_uc1JrYuC8NC58pj711l2ByD4",
        "eyebrow": "design_tem2",
        "title": "design_tem2",
        "description": "클린 블루 톤. 리포트형 구성과 안정적인 여백.",
        "preview_static_path": "css/img/design_tem2_preview.png",
        "template_key": "modern-b",
    },
    {
        "source_id": "1QTy_L8GU-fDZV5jE9ZO5aEuW2l1eDcFa6NH5BOYR8Ak",
        "eyebrow": "Template 3",
        "title": "기본형",
        "description": "빠른 초안용. 구조 확인 후 바로 결과 화면으로.",
        "preview_static_path": "css/img/template3.jpg",
        "template_key": "modern-a",
    },
]

PREVIEW_STATIC_BY_RENDERER = {
    "modern-a": "css/img/design_tem1_preview.png",
    "modern-b": "css/img/design_tem2_preview.png",
}

EDITOR_TEMPLATE_ASSET_FILES = {
    "modern-a": {
        "cover": "page-01-img-01.jpg",
        "introFur": "page-03-img-01.jpg",
        "splitModel": "page-04-img-01.jpg",
        "splitTexture": "page-04-img-02.jpg",
        "vase": "page-05-img-01.png",
        "hide": "page-06-img-01.jpg",
        "shirt": "page-06-img-02.jpg",
        "path": "page-06-img-03.jpg",
        "bottle": "page-07-img-01.jpg",
        "redPortrait": "page-07-img-02.jpg",
        "cactus": "page-08-img-01.png",
        "leather": "page-09-img-01.jpg",
        "heels": "page-10-img-01.jpg",
        "glass": "page-10-img-02.jpg",
    },
    "modern-b": {
        "building": "page-03-img-01.jpg",
    },
}


def get_openai_client():
    if not settings.OPENAI_API_KEY:
        raise ImproperlyConfigured(
            "OPENAI_API_KEY가 없습니다. /Users/bagjuwon/Projects/ppt_auto/.env 에 값을 넣어야 합니다."
        )
    return openai.OpenAI(api_key=settings.OPENAI_API_KEY)
def normalize_output_title(raw_title):
    title = raw_title.strip().replace(" ", "_")
    title = re.sub(r"\.(pptx|ppt|txt)$", "", title, flags=re.IGNORECASE)
    return title.rstrip("._") or "presentation"


def build_custom_template_source_id(template_id):
    return f"{CUSTOM_TEMPLATE_SOURCE_PREFIX}{template_id}"


def parse_custom_template_source_id(raw_value):
    if not raw_value or not raw_value.startswith(CUSTOM_TEMPLATE_SOURCE_PREFIX):
        return None
    suffix = raw_value.removeprefix(CUSTOM_TEMPLATE_SOURCE_PREFIX)
    if not suffix.isdigit():
        return None
    return int(suffix)


def get_user_template_for_source_id(raw_value, user):
    template_id = parse_custom_template_source_id(raw_value)
    if not template_id or not getattr(user, "is_authenticated", False):
        return None
    try:
        return UserTemplate.objects.get(id=template_id, user=user)
    except UserTemplate.DoesNotExist:
        return None


def sanitize_upload_filename(filename):
    original_name = Path(filename).name
    stem = re.sub(r"[^\w.-]", "_", Path(original_name).stem, flags=re.UNICODE).strip("._")
    stem = re.sub(r"_+", "_", stem)
    suffix = Path(original_name).suffix.lower()
    if suffix not in {".pptx", ".pdf"}:
        suffix = ".pptx"
    return f"{stem or 'template'}{suffix}"


def save_uploaded_user_template_file(user, uploaded_file):
    root_dir = Path(settings.USER_TEMPLATE_STORAGE_DIR) / str(user.id)
    root_dir.mkdir(parents=True, exist_ok=True)
    base_name = sanitize_upload_filename(uploaded_file.name)
    stem = Path(base_name).stem
    suffix = Path(base_name).suffix or ".pptx"
    candidate = root_dir / base_name
    while candidate.exists():
        candidate = root_dir / f"{stem}_{random.randint(1000, 9999)}{suffix}"
    with candidate.open("wb+") as destination:
        for chunk in uploaded_file.chunks():
            destination.write(chunk)
    return str(candidate)


def preview_image_for_renderer(renderer_key):
    return static(PREVIEW_STATIC_BY_RENDERER.get(renderer_key, PREVIEW_STATIC_BY_RENDERER["modern-a"]))


def build_prompt_template_cards(user):
    cards = [
        {
            "source_id": card["source_id"],
            "eyebrow": card["eyebrow"],
            "title": card["title"],
            "description": card["description"],
            "preview_url": static(card["preview_static_path"]),
            "is_custom": False,
        }
        for card in BUILT_IN_TEMPLATE_CARDS
    ]

    if getattr(user, "is_authenticated", False):
        custom_templates = UserTemplate.objects.filter(user=user)
        for template in custom_templates:
            cards.append(
                {
                    "source_id": build_custom_template_source_id(template.id),
                    "eyebrow": "Custom",
                    "title": template.name,
                    "description": f"{template.renderer_label} 기반 · {template.original_filename}",
                    "preview_url": preview_image_for_renderer(template.renderer_key),
                    "is_custom": True,
                }
            )
    return cards


def build_prompt_context(request, *, selected_template_source_id=None):
    selected_value = resolve_source_template_id(selected_template_source_id or request.GET.get("template"), user=request.user)
    return {
        "prefilled_topic": request.GET.get("topic", "").strip(),
        "recent_history_entries": recent_history_entries_for(request.user, limit=3),
        "selected_template_source_id": selected_value,
        "template_cards": build_prompt_template_cards(request.user),
    }


def healthz(request):
    return JsonResponse({"status": "ok"})


def build_presentation_agent(client=None):
    return PresentationAgent(client or get_openai_client())


def resolve_pptx_template(presentation_id, user=None):
    custom_template = get_user_template_for_source_id(presentation_id, user)
    if custom_template:
        return custom_template.renderer_key
    return PPTX_TEMPLATE_BY_SOURCE_ID.get(presentation_id, "modern-a")


def reserve_render_output_dir(base_name):
    output_root = Path(settings.PPT_RENDER_OUTPUT_DIR)
    output_root.mkdir(parents=True, exist_ok=True)

    candidate_name = base_name
    candidate_dir = output_root / candidate_name
    while candidate_dir.exists():
        candidate_name = f"{base_name}_{random.randint(0, 100)}"
        candidate_dir = output_root / candidate_name

    candidate_dir.mkdir(parents=True, exist_ok=False)
    return candidate_name, candidate_dir


def encode_local_download_token(output_path):
    encoded = urlsafe_b64encode(str(output_path).encode("utf-8")).decode("ascii")
    return f"local-{encoded.rstrip('=')}"


def decode_local_download_token(token):
    encoded = token.removeprefix("local-")
    padded = encoded + "=" * (-len(encoded) % 4)
    return Path(urlsafe_b64decode(padded.encode("ascii")).decode("utf-8")).resolve()


def resolve_existing_local_file(file_path):
    if file_path.exists():
        return file_path
    legacy_path = Path(f"{file_path}.pptx")
    if legacy_path.exists():
        return legacy_path
    raise Http404("생성된 PPTX 파일을 찾을 수 없습니다.")


def resolve_local_download_path(token):
    requested_path = decode_local_download_token(token)
    output_root = Path(settings.PPT_RENDER_OUTPUT_DIR).resolve()
    try:
        requested_path.relative_to(output_root)
    except ValueError as exc:
        raise Http404("허용되지 않은 파일 경로입니다.") from exc
    actual_path = resolve_existing_local_file(requested_path)
    return requested_path, actual_path


def ascii_download_name(filename):
    stem = re.sub(r"\.pptx$", "", filename, flags=re.IGNORECASE)
    ascii_name = stem.encode("ascii", "ignore").decode("ascii")
    ascii_name = re.sub(r"[^A-Za-z0-9._-]", "_", ascii_name)
    ascii_name = re.sub(r"_+", "_", ascii_name).strip("._")
    return f"{ascii_name or 'presentation'}.pptx"


def build_attachment_disposition(filename):
    fallback = ascii_download_name(filename)
    encoded = quote(filename)
    return f'attachment; filename="{fallback}"; filename*=utf-8\'\'{encoded}'


def normalize_preview_items(preview_items, kind):
    return [{"kind": kind, "value": item} for item in preview_items]


def build_editor_preview_items(spec):
    return [
        {
            "kind": "slide",
            "slide_kind": slide.kind,
            "title": slide.title,
            "subtitle": slide.subtitle,
            "bullets": slide.bullets,
            "notes": slide.notes,
        }
        for slide in spec.slides
    ]


def build_result_payload(*, title, download_url, backend, spec, primary_action_label):
    return {
        "title": title,
        "download_url": download_url,
        "preview_items": build_editor_preview_items(spec),
        "backend": backend,
        "template": spec.template,
        "primary_action_label": primary_action_label,
    }


def normalize_result_payload(payload):
    return normalize_editor_result_payload(payload)


def store_last_result(request, payload):
    request.session["last_result"] = normalize_result_payload(payload)


def resolve_source_template_id(raw_value, user=None):
    if not raw_value:
        return DEFAULT_SOURCE_TEMPLATE_ID
    custom_template = get_user_template_for_source_id(raw_value, user)
    if custom_template:
        return build_custom_template_source_id(custom_template.id)
    if raw_value in PPTX_TEMPLATE_BY_SOURCE_ID:
        return raw_value
    return SOURCE_TEMPLATE_ID_BY_KEY.get(raw_value, DEFAULT_SOURCE_TEMPLATE_ID)


def build_editor_asset_urls():
    return {
        template_name: {
            key: static(f"ppt-assets/{template_name}/{file_name}")
            for key, file_name in files.items()
        }
        for template_name, files in EDITOR_TEMPLATE_ASSET_FILES.items()
    }


def build_history_entries(user_histories):
    entries = []
    for history in user_histories:
        download_url = ""
        external_url = ""
        result_url = ""
        if history.backend == "pptxgenjs":
            if history.file_path:
                try:
                    resolve_existing_local_file(Path(history.file_path))
                except Http404:
                    pass
                else:
                    download_url = reverse(
                        "download_slide",
                        args=[encode_local_download_token(history.file_path)],
                    )
            elif history.ppt_url.startswith("/download_slide/local-"):
                download_url = history.ppt_url
        elif history.ppt_url:
            external_url = history.ppt_url

        if history.status == "completed":
            result_url = reverse("history_result", args=[history.id])

        entries.append(
            {
                "record": history,
                "download_url": download_url,
                "external_url": external_url,
                "result_url": result_url,
            }
        )
    return entries


def recent_history_entries_for(user, *, limit=4):
    if not getattr(user, "is_authenticated", False):
        return []
    user_histories = UserHistory.objects.filter(user=user).order_by("-create_date")[:limit]
    return build_history_entries(user_histories)


def build_home_context(request):
    entries = recent_history_entries_for(request.user, limit=4)
    return {
        "recent_history_entries": entries,
        "history_count": len(entries),
    }


def render_with_pptxgenjs(agent_result, template_key):
    output_title, output_dir = reserve_render_output_dir(agent_result.output_title)
    output_name = f"{output_title}.pptx"
    spec = agent_result.spec
    render_result = render_presentation(spec.to_dict(), output_dir, output_name)
    download_token = encode_local_download_token(Path(render_result["outputPath"]))
    download_url = reverse("download_slide", args=[download_token])
    return {
        "output_title": output_title,
        "file_path": str(Path(render_result["outputPath"])),
        "result_payload": build_result_payload(
            title=output_title,
            download_url=download_url,
            backend="pptxgenjs",
            spec=spec,
            primary_action_label="다운로드",
        ),
    }

def signup(request):
    if request.user.is_authenticated:
        return redirect('home')

    if request.method == "POST":
        form = SignUpForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            messages.success(request, "회원가입이 완료되었습니다!")
            return redirect('sign_in')
        else:
            messages.error(request, "회원가입에 실패했습니다. 입력 정보를 확인해주세요.")

    else:
        form = SignUpForm()

    return render(request, 'blog/auth_signup.html', {'form': form})


def user_login(request):
    if request.user.is_authenticated:
        return redirect('home')  # 이미 로그인한 사용자는 홈으로 리디렉트

    if request.method == "POST":
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            messages.success(request, "로그인에 성공했습니다.")

            # 로그인 후 이동할 URL 결정
            next_url = request.GET.get('next', 'home')
            return redirect(next_url)  # 리디렉트 수행
        else:
            print(f"로그인 실패: {form.errors}")  # ❌ 로그인 실패 이유 출력 (디버깅)
            messages.error(request, "아이디 또는 비밀번호가 올바르지 않습니다.")

    else:
        form = AuthenticationForm()

    return render(request, 'blog/auth_login.html', {'form': form})
def user_logout(request):
    logout(request)
    messages.success(request, "로그아웃되었습니다.")
    return redirect('home')

### 🔹 회원 정보 수정 (Update Profile)
@login_required #데코레이터로 로그인한 사용자만 수정 가능
def user_update(request):
    if request.method == "POST":
        form = UserUpdateForm(request.POST, instance=request.user)
        if form.is_valid():
            form.save()
            return redirect('profile')  # 회원정보 수정 후 이동할 페이지
    else:
        form = UserUpdateForm(instance=request.user) #현재 로그인한 사용자의 정보 가져오기
    return render(request, 'blog/account_settings.html', {'form': form})

@login_required(login_url='/login/')
def profile_view(request):
    user_id=request.user.id
    user_histories = UserHistory.objects.filter(user_id=user_id).order_by('-create_date')
    history_entries = build_history_entries(user_histories)

    if request.method == 'POST':
        form = ProfileUpdateForm(request.POST, request.FILES, instance=request.user)

        if form.is_valid():
            form.save()
            messages.success(request, "프로필이 성공적으로 업데이트되었습니다.")
            return redirect('profile')
    else:
        form = ProfileUpdateForm(instance=request.user)

    return render(request, 'blog/account_profile.html', {'form': form, 'history_entries': history_entries})


@login_required(login_url='/login/')
def delete_user_history(request):
    if request.method == "POST":
        selected_ids = request.POST.getlist('presentation_id')  # 선택된 체크박스 값 가져오기
        # selected_ids=int(selected_ids)
        UserHistory.objects.filter(id__in=selected_ids, user=request.user).delete()  # 삭제 실행
        messages.success(request, "선택한 항목이 삭제되었습니다.")

    return redirect('profile')


## 🔹 비밀번호 변경 (Password Change)
@login_required(login_url='/login/')
def password_change(request):
    if request.method == "POST":
        form = CustomPasswordChangeForm(request.user, request.POST)
        if form.is_valid():
            user = form.save()
            update_session_auth_hash(request, user)  # 비밀번호 변경 후 로그인 유지
            return redirect('home')
    else:
        form = CustomPasswordChangeForm(request.user)
    return render(request, 'blog/account_password_change.html', {'form': form})

def home(request):
    return render(request, 'landing_home.html', build_home_context(request))
@login_required(login_url='/login/')
def Sign_in_home(request):
    # if request.user.is_authenticated:
    #     return redirect('sign_in')  # ✅ 로그인한 경우 홈으로 이동
    return render(request, 'landing_home.html', build_home_context(request))


@login_required(login_url='/login/')
def template_library(request):
    if request.method == "POST":
        form = CustomTemplateUploadForm(request.POST, request.FILES)
        if form.is_valid():
            uploaded_file = form.cleaned_data["source_pptx"]
            stored_path = save_uploaded_user_template_file(request.user, uploaded_file)
            template = form.save(commit=False)
            template.user = request.user
            template.original_filename = uploaded_file.name
            template.source_pptx_path = stored_path
            template.save()
            messages.success(request, "커스텀 템플릿이 추가되었습니다.")
            return redirect(f"{reverse('prompt')}?template={build_custom_template_source_id(template.id)}")
        messages.error(request, "템플릿 업로드에 실패했습니다. 입력값을 확인해 주세요.")
    else:
        form = CustomTemplateUploadForm()

    return render(
        request,
        'blog/template_library.html',
        {
            "form": form,
            "user_templates": UserTemplate.objects.filter(user=request.user),
        },
    )

@login_required(login_url='/login/')
def prompt(request):
    # form = ProfileUpdateForm(request.POST, instance=request.user)
    user_id = request.user.id
    print(user_id)

    global SLIDE_TITLE_TEXT
    global filename
    if request.method == "POST":
        selected_source_id = request.POST.get("presentation_id")
        template_key = resolve_pptx_template(selected_source_id, user=request.user)
        source_topic = request.POST.get("user-input", "").strip()
        SLIDE_TITLE_TEXT = source_topic
        print(SLIDE_TITLE_TEXT)

        agent = build_presentation_agent()
        filename = normalize_output_title(agent.generate_filename(source_topic))
        output_title = filename
        agent_result = agent.run(source_topic, output_title=output_title, template=template_key)

        try:
            render_result = render_with_pptxgenjs(agent_result, template_key)
        except Exception as exc:
            UserHistory.objects.create(
                user_id=user_id,
                ppt_url="",
                ppt_title=output_title,
                backend="pptxgenjs",
                status="failed",
                error_message=str(exc),
            )
            messages.error(request, "PPT 생성에 실패했습니다. 다시 시도해주세요.")
            return redirect("profile")

        output_title = render_result["output_title"]
        SLIDE_TITLE_TEXT = output_title
        payload = render_result["result_payload"]
        history = UserHistory.objects.create(
            user_id=user_id,
            ppt_url="",
            ppt_title=output_title,
            backend="pptxgenjs",
            file_path=render_result["file_path"],
            result_payload=payload,
            status="completed",
        )
        payload["history_id"] = history.id
        history.result_payload = payload
        history.save(update_fields=["result_payload"])
        store_last_result(request, payload)

        return redirect('result')
    else:
        return render(
            request,
            'blog/presentation_prompt.html',
            build_prompt_context(
                request,
                selected_template_source_id=request.GET.get("template"),
            ),
        )

@login_required
def profile(request):
    user = request.user  # 로그인한 사용자 정보

    if request.method == 'POST':
        username = request.POST.get('username')
        email = request.POST.get('email')
        nickname = request.POST.get('nickname')

        # ✅ 사용자 정보 업데이트
        user.username = username
        user.email = email
        user.nickname = nickname  # ✅ CustomUser 모델의 nickname 필드 업데이트
        user.save()

        messages.success(request, "Your profile has been updated!")  # 성공 메시지
        return redirect('profile')  # 업데이트 후 같은 페이지로 리다이렉트

    # ✅ GET 요청 시 사용자 정보를 템플릿에 전달
        return render(request, 'blog/account_profile.html', {
        'user': user,
        'username': user.username,
        'email': user.email,
        'nickname': user.nickname,  # ✅ 닉네임 전달 확인
    })

def build_history_result_payload(history):
    payload = normalize_result_payload(history.result_payload)
    payload["history_id"] = history.id
    payload.setdefault("title", history.ppt_title)
    payload["backend"] = "pptxgenjs"
    payload.setdefault("primary_action_label", "다운로드")
    payload.setdefault(
        "preview_items",
        [
            {
                "kind": "slide",
                "slide_kind": "title",
                "title": history.ppt_title,
                "subtitle": "저장된 상세 미리보기가 없어 기본 카드만 표시합니다.",
                "bullets": [],
                "notes": "",
            }
        ],
    )

    if history.file_path:
        payload["download_url"] = reverse(
            "download_slide",
            args=[encode_local_download_token(history.file_path)],
        )
    else:
        payload.setdefault("download_url", "")
    return payload


def render_result_page(request, payload):
    payload = normalize_result_payload(payload)
    return render(
        request,
        "blog/presentation_result.html",
        {
            "result_title": payload.get("title"),
            "download_url": payload.get("download_url"),
            "preview_items": payload.get("preview_items", []),
            "backend": payload.get("backend"),
            "primary_action_label": payload.get("primary_action_label", "다운로드"),
            "editor_meta": {
                "title": payload.get("title"),
                "downloadUrl": payload.get("download_url"),
                "backend": payload.get("backend"),
                "template": payload.get("template"),
                "primaryActionLabel": payload.get("primary_action_label", "다운로드"),
                "historyId": payload.get("history_id"),
                "editorUrl": reverse("result_editor"),
                "csrfToken": get_token(request),
                "assetUrls": build_editor_asset_urls(),
            },
        },
    )


# 뷰에서 슬라이드 썸네일을 HTML로 렌더링
def display_slides(request):
    result = request.session.get("last_result")
    if result:
        return render_result_page(request, result)
    messages.info(request, "먼저 프레젠테이션을 생성해주세요.")
    return redirect("prompt")


@login_required
def display_history_result(request, history_id):
    history = get_object_or_404(UserHistory, id=history_id, user=request.user)
    return render_result_page(request, build_history_result_payload(history))


@login_required
@require_POST
def result_editor(request):
    try:
        data = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"error": "잘못된 편집 요청입니다."}, status=400)

    existing_payload = request.session.get("last_result", {})
    payload = normalize_result_payload(
        {
            "title": data.get("title") or existing_payload.get("title"),
            "download_url": data.get("download_url") or existing_payload.get("download_url"),
            "preview_items": data.get("preview_items", existing_payload.get("preview_items")),
            "backend": data.get("backend") or existing_payload.get("backend"),
            "template": data.get("template") or existing_payload.get("template"),
            "primary_action_label": data.get("primary_action_label")
            or existing_payload.get("primary_action_label"),
            "history_id": data.get("history_id") or existing_payload.get("history_id"),
        }
    )

    history = None
    if payload.get("history_id"):
        history = UserHistory.objects.filter(id=payload["history_id"], user=request.user).first()

    action = data.get("action", "save")
    if action not in {"save", "render"}:
        return JsonResponse({"error": "지원하지 않는 에디터 동작입니다."}, status=400)

    store_last_result(request, payload)

    if history:
        history.result_payload = payload
        history.ppt_title = payload["title"]
        history.save(update_fields=["result_payload", "ppt_title"])

    if action == "save":
        return JsonResponse(
            {
                "status": "saved",
                "title": payload["title"],
                "history_id": payload.get("history_id"),
            }
        )

    try:
        spec = build_presentation_spec_from_payload(payload)
        output_title, output_dir = reserve_render_output_dir(normalize_output_title(payload["title"]))
        output_name = f"{output_title}.pptx"
        render_result = render_presentation(spec.to_dict(), output_dir, output_name)
    except ValueError as exc:
        return JsonResponse({"error": str(exc)}, status=400)
    except Exception as exc:
        return JsonResponse({"error": f"수정본 렌더링 실패: {exc}"}, status=500)

    payload.update(
        {
            "title": output_title,
            "download_url": reverse(
                "download_slide",
                args=[encode_local_download_token(Path(render_result["outputPath"]))],
            ),
            "backend": "pptxgenjs",
            "primary_action_label": "다운로드",
            "template": spec.template,
        }
    )
    store_last_result(request, payload)

    if history:
        history.ppt_title = output_title
        history.backend = "pptxgenjs"
        history.ppt_url = ""
        history.file_path = str(Path(render_result["outputPath"]))
        history.result_payload = payload
        history.status = "completed"
        history.error_message = ""
        history.save(
            update_fields=[
                "ppt_title",
                "backend",
                "ppt_url",
                "file_path",
                "result_payload",
                "status",
                "error_message",
            ]
        )

    return JsonResponse(
        {
            "status": "rendered",
            "title": payload["title"],
            "download_url": payload["download_url"],
            "backend": payload["backend"],
            "primary_action_label": payload["primary_action_label"],
            "history_id": payload.get("history_id"),
        }
    )

logger = logging.getLogger(__name__)

def download_slide(request, presentation_id):
    # global presentation_id
    # print("\n")
    # print(f"{presentation_id}: in download_slide")
    """Google Drive에서 파일을 직접 다운로드"""
    # if not presentation_id:
    #     logger.error("Error: Missing presentation_id in download_slide view")
    #     return HttpResponse("Error: Missing presentation_id", status=400)

    try:
        if presentation_id.startswith("local-"):
            requested_path, file_path = resolve_local_download_path(presentation_id)
            response = FileResponse(
                file_path.open("rb"),
                as_attachment=False,
                content_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
            )
            response["Content-Disposition"] = build_attachment_disposition(requested_path.name)
            return response

        raise Http404("로컬 렌더 결과만 다운로드할 수 있습니다.")

    except Exception as e:
        # 에러 로그 기록
        logger.error(f"Error in download_slide for presentation {presentation_id}: {str(e)}")
        return HttpResponse(f"Error downloading the presentation: {str(e)}", status=500)



from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

# @csrf_exempt  # CSRF 검사를 비활성화 (테스트용, 실제 서비스에서는 CSRF 토큰을 활용)
# def chat_view(request):
#     if request.method == "POST":
#         user_message = request.POST.get("user-input", "")
#
#         # 예제: 간단한 응답 로직
#         if user_message.lower() == "안녕":
#             bot_reply = "안녕하세요! 어떻게 도와드릴까요?"
#         else:
#             bot_reply = "말씀하신 내용을 확인 중입니다."
#
#         return JsonResponse({"reply": bot_reply})
#
#     return JsonResponse({"error": "Invalid request"}, status=400)
