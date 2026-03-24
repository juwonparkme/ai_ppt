import pickle
from pathlib import Path
from django.shortcuts import render, redirect
from googleapiclient.errors import HttpError
from .forms import SignUpForm, UserUpdateForm, ProfileUpdateForm
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib.auth.forms import AuthenticationForm, PasswordChangeForm
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from google.oauth2 import service_account
import os, re, openai, json, io
import random
import logging
from django.http import HttpResponse
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured

from .models import UserHistory

# OpenAI 설정
SLIDE_TITLE_TEXT = ' '
filename = ' '
ppt_link = ' '

# API 권한 범위 설정
SCOPES = ['https://www.googleapis.com/auth/presentations.readonly']
presentation_id=''


def get_openai_client():
    if not settings.OPENAI_API_KEY:
        raise ImproperlyConfigured(
            "OPENAI_API_KEY가 없습니다. /Users/bagjuwon/Projects/ppt_auto/.env 에 값을 넣어야 합니다."
        )
    return openai.OpenAI(api_key=settings.OPENAI_API_KEY)


def project_file(path_value):
    path = Path(path_value)
    if path.is_absolute():
        return str(path)
    return str(Path(settings.BASE_DIR) / path)

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

    return render(request, 'blog/signup.html', {'form': form})


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

    return render(request, 'blog/login.html', {'form': form})
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
    return render(request, 'blog/user_update.html', {'form': form})

@login_required
def profile_view(request):
    user_id=request.user.id
    user_histories = UserHistory.objects.filter(user_id=user_id).order_by('-create_date')

    if request.method == 'POST':
        form = ProfileUpdateForm(request.POST, instance=request.user)

        if form.is_valid():
            # user_id = form.cleaned_data['id']
            # print(user_id)
            form.save()
            messages.success(request, "프로필이 성공적으로 업데이트되었습니다.")
            # return redirect('profile')  # 새로고침하면서 반영됨
            return render(request, 'blog/profile.html', {'form': form, 'user_histories': user_histories})  # 👈 데이터 유지
    else:
        form = ProfileUpdateForm(instance=request.user)

    return render(request, 'blog/profile.html', {'form': form, 'user_histories': user_histories})


def delete_user_history(request):
    if request.method == "POST":
        selected_ids = request.POST.getlist('presentation_id')  # 선택된 체크박스 값 가져오기
        # selected_ids=int(selected_ids)
        UserHistory.objects.filter(id__in=selected_ids, user=request.user).delete()  # 삭제 실행
        messages.success(request, "선택한 항목이 삭제되었습니다.")

    return redirect('profile')


## 🔹 비밀번호 변경 (Password Change)
@login_required
def password_change(request):
    if request.method == "POST":
        form = PasswordChangeForm(request.user, request.POST)
        if form.is_valid():
            user = form.save()
            update_session_auth_hash(request, user)  # 비밀번호 변경 후 로그인 유지
            return redirect('home')
    else:
        form = PasswordChangeForm(request.user)
    return render(request, 'blog/password_change.html', {'form': form})

def home(request):
    return render(request, 'home_login.html')
@login_required(login_url='/login/')
def Sign_in_home(request):
    # if request.user.is_authenticated:
    #     return redirect('sign_in')  # ✅ 로그인한 경우 홈으로 이동
    return render(request, 'home_login.html')

@login_required(login_url='/login/')
def prompt(request):
    # form = ProfileUpdateForm(request.POST, instance=request.user)
    user_id = request.user.id
    print(user_id)

    global SLIDE_TITLE_TEXT
    global filename
    global ppt_link
    if request.method == "POST":
        presentation_id = request.POST.get("presentation_id")
        print(presentation_id, "입력받은 ID값")
        SLIDE_TITLE_TEXT = request.POST.get("user-input", "").strip()
        print(SLIDE_TITLE_TEXT)

        input_string = re.sub(r"[^\w\s.\-\(\)]", "", SLIDE_TITLE_TEXT).replace("\n", "")

        filename_prompt = (f"Generate a short, descriptive filename based on the following input: \"{input_string}\". "
                           f"Answer just with the short filename, no explanation.")

        client = get_openai_client()
        filename_response = client.chat.completions.create(
            model=settings.OPENAI_FILENAME_MODEL,
            messages=[{"role": "system", "content": filename_prompt}],
            temperature=0.5,
            max_tokens=30,
        )

        filename = filename_response.choices[0].message.content.strip().replace(" ", "_")
        output_title = filename

        idx = random.randint(0, 100)

        try:
            os.makedirs(output_title)
        except:
            output_title = f"{filename}_{idx}"
            os.makedirs(output_title)

        SLIDE_TITLE_TEXT = output_title

        print(filename)
        ppt_text = create_ppt_text(output_title)

        split_slides(ppt_text, index=0)

        ppt_detail_text = create_ppt_detail_text()
        split_slides(ppt_detail_text, index=2)
        ppt_link=create_slides(presentation_id, output_title)
        UserHistory.objects.create(user_id=user_id, ppt_url=ppt_link, ppt_title=output_title)

        # print(presentation_id, "입력받은 ID값")

        return redirect('result')
    else:
        return render(request, 'blog/prompt.html')

# -- 프롬프트 --#######################################################################################

def create_ppt_text(topic):
    client = get_openai_client()
    prompt = f"""
        Write a PowerPoint presentation about "{topic}". Follow these rules strictly:

        2. **Slide 1**: Title slide (only title & subtitle).
        3. **Slide 2**: Table of Contents (list all slide topics, no images).
        7. Result must only be in Korean and should follow the specified structure.

        Use the following format strictly:
        #Title: [PPT 제목]

        #Slide: 1
        #Header: [PPT 제목]
        #Content: [PPT 제목에 대한 부가 설명]

        #Slide: 2
        #Header: 목차
        #Content: 
        1. [목차 제목 1]
        2. [목차 제목 2]
        3. [목차 제목 3]
        4. [목차 제목 4]
        5. [목차 제목 5]
        6. [목차 제목 6]

        Answer ONLY in this format, without any additional text.
        """
    response = client.chat.completions.create(
        model=settings.OPENAI_PRESENTATION_MODEL,
        messages=[{"role": "system", "content": prompt}],
        temperature=0.8,
        max_tokens=4096,
    )

    return response.choices[0].message.content.strip()

def create_ppt_detail_text():
    global SLIDE_TITLE_TEXT
    print(SLIDE_TITLE_TEXT)
    """GPT를 활용하여 PPT 내용을 자동 생성 (슬라이드 개수 & 구조 강제)"""
    client = get_openai_client()
    try:
        file_path = f"{SLIDE_TITLE_TEXT}/0_목차.txt"
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()  # 처음 1200자만 읽기
    except FileNotFoundError:
        file_path = f"{SLIDE_TITLE_TEXT}/1_목차.txt"
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()  # 처음 1200자만 읽기

    prompt = f"""
    Write an a about "{content}". Follow these rules strictly:


   The topics listed in the table of contents are the themes 
   I want to include in my PowerPoint presentation. 
   Please provide detailed content for each topic. 
   The total length should be between 2000 and 3000 characters. 
   Make sure the explanation is clear, thorough, and covers each point comprehensively. 
   Result must only be in Korean and should follow the specified structure.

    #Slide: 3
    #Header: title
    #Content: -subtitle  
              -content
              -content
              
    #Slide: LAST
    #Header: Summary
    #Content: -content

    ...

    Answer ONLY in this format, without any additional text


    """
    response = client.chat.completions.create(
        model=settings.OPENAI_PRESENTATION_MODEL,
        messages=[{"role": "system", "content": prompt}],
        temperature=0.5,
        max_tokens=4096,
    )
    result = response.choices[0].message.content.strip()
    print(result)
    return response.choices[0].message.content.strip()




def split_slides(content, index):
    global SLIDE_TITLE_TEXT
    print(SLIDE_TITLE_TEXT)
    """#Slide: 기준으로 슬라이드를 나누는 함수"""
    slides = content.split("#Slide:")
    # filepath = os.path.join("Cache", filename)

    output_dir = f"{SLIDE_TITLE_TEXT}"

    for i in range(1, len(slides)):
        header = slides[i].split(":")

        head = header[1].split("#Content")[0].strip()  # 'Table of Contents'
        content = header[2].strip()
        # print(head)
        # print(content)
        sanitized_head = sanitize_filename(head)

        file_path = os.path.join(output_dir, f"{index}_{sanitized_head}.txt")

        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)

        index += 1

    # time.sleep(1)

    # ppt_link=get_license_data(filename)
    # return ppt_link

def sanitize_filename(name):
    name = re.sub(r'[\\/*?:"<>|]', "", name)
    name = name.replace("\n", "").replace("\r", "").strip()
    return name






def get_textlist_from_txt():
    global SLIDE_TITLE_TEXT
    dir = f'{SLIDE_TITLE_TEXT}'  # 'licenses' 폴더 경로
    text_list = []

    # 'licenses' 디렉토리 확인

    files = os.listdir(dir)
    f_index = 0
    # .txt 파일 처리
    for index, file in enumerate(files):
        if file.endswith('.txt'):
            file_path = os.path.join(dir, file)
            file = file.replace('.txt', '')
            file = file.replace('\\', '')
            file = file.replace(f'{f_index}_', '')
            text_list.append(file)
            f_index += 1

            # 파일 열고 내용 읽기
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read(4000)  # 처음 1200자만 읽기
                content = content.replace('\t', '')
                text_list.append(content)

    print(text_list)

    return text_list

def create_slides(original_file_id, SLIDE_TITLE_TEXT):
    global presentation_id
    creds = None
    SCOPES = ['https://www.googleapis.com/auth/presentations', 'https://www.googleapis.com/auth/drive']
    token_file = project_file(settings.GOOGLE_TOKEN_FILE)
    client_secret_file = project_file(settings.GOOGLE_CLIENT_SECRET_FILE)

    # token.json 파일이 존재하지 않거나, 비어있는 경우 새로 인증 받기
    if os.path.exists(token_file):
        try:
            with open(token_file, 'rb') as token:
                creds = pickle.load(token)
        except EOFError:  # EOFError가 발생할 경우, 인증 파일이 비어있으므로 다시 인증 받기
            creds = None

    # 인증이 없거나 유효하지 않은 경우, 새로 인증 받기
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                client_secret_file, scopes=SCOPES)
            creds = flow.run_local_server(port=0)

        # 인증된 credentials 저장
        with open(token_file, 'wb') as token:
            pickle.dump(creds, token)

    service = build('slides', 'v1', credentials=creds)
    drive_service = build('drive', 'v3', credentials=creds)


    try:
        presentation = drive_service.files().copy(  # 템플릿 슬라이드 복사
            fileId=f'{original_file_id}',  # template 3 원본 test_1103
            fields='id,name,webViewLink',
            body={'name': f'{SLIDE_TITLE_TEXT}'}
        ).execute()
        print(original_file_id)

        presentation_id = presentation['id']
        presentation_link = presentation['webViewLink']
        presentation = service.presentations().get(presentationId=presentation_id).execute()
        file_path = "presentation_data.json"
        # JSON 파일로 저장
        with open(file_path, 'w', encoding='utf-8') as json_file:
            json.dump(presentation, json_file, ensure_ascii=False, indent=4)

        with open(file_path, 'r', encoding='utf-8') as file:
            data = json.load(file)  # JSON을 딕셔너리 형태로 로드

        text_list = get_textlist_from_txt()





        new_txt_list=text_list
        new_txt_list.insert(4, text_list[0])
        new_txt_list.insert(5, '1')
        new_txt_list.insert(12, text_list[0])
        new_txt_list.insert(13, '2')

        requests_update = []
        object_index = []

        # template 1
        if original_file_id == '19OAsGTO9QKHR-GQ-Fw_uc1JrYuC8NC58pj711l2ByD4':
            text_list=new_txt_list


            for slide in presentation.get('slides', []):
                elements = slide.get('pageElements', [])
                # slide_id = slide.get('objectId')
                # print(f"Slide ID: {slide_id}:{len(elements)}")

                if len(elements) < 4:
                    for element in elements[:2]:
                        element_id = element.get('objectId')
                        object_index.append(element_id)

                        print(f"  - Element ID: {element_id}")

                elif len(elements) == 5:
                    for element in elements[:2]:
                        element_id = element.get('objectId')
                        object_index.append(element_id)

                        print(f"  - Element ID: {element_id}")



                else:
                    for element in elements[2:4]:
                        element_id = element.get('objectId')
                        object_index.append(element_id)
                        print(f"  - Element ID: {element_id}")
            print(text_list)

        # template 2
        elif original_file_id == '1LAsaHc6o9uzZPl0zsDfhRlt9oNWhmBEbp1vLYOU17tk':
            text_list.insert(4, text_list[0])
            text_list.insert(5, '1')
            text_list.insert(12, text_list[0])
            text_list.insert(13, '2')

            for slide in presentation.get('slides', []):
                elements = slide.get('pageElements', [])
                slide_id = slide.get('objectId')
                print(f"Slide ID: {slide_id}:{len(elements)}")

                for element in elements[:2]:
                    element_id = element.get('objectId')
                    object_index.append(element_id)

                    print(f"  - Element ID: {element_id}")
            print(text_list)

        # template 3
        elif original_file_id == '1QTy_L8GU-fDZV5jE9ZO5aEuW2l1eDcFa6NH5BOYR8Ak':
            text_list.insert(4, text_list[0])
            text_list.insert(5, '1')
            text_list.insert(12, text_list[0])
            text_list.insert(13, '2')

            for slide in presentation.get('slides', []):
                elements = slide.get('pageElements', [])
                slide_id = slide.get('objectId')
                print(f"Slide ID: {slide_id}:{len(elements)}")

                if len(elements) == 3:
                    for element in elements[:2]:
                        element_id = element.get('objectId')
                        object_index.append(element_id)

                        print(f"  - Element ID: {element_id}")
                else:
                    for element in elements:
                        element_id = element.get('objectId')
                        object_index.append(element_id)

                        print(f"  - Element ID: {element_id}")





        # template 4
        elif original_file_id == '1Mohc1dhmGKbE1NALs8QRRftFK8wnJMJ-CUOMpv36Z50':

            for slide in presentation.get('slides', []):
                elements = slide.get('pageElements', [])
                slide_id = slide.get('objectId')
                print(f"Slide ID: {slide_id}:{len(elements)}")
                if slide_id == 'p2' or slide_id == 'p6' or slide_id == 'p9':
                    for element in elements[1:]:
                        element_id = element.get('objectId')
                        object_index.append(element_id)

                        print(f"  - Element ID: {element_id}")
                else:
                    for element in elements[:2]:
                        element_id = element.get('objectId')
                        object_index.append(element_id)

                        print(f"  - Element ID: {element_id}")


        try:
            mapped_data = dict(zip(object_index, text_list))
        except:
            pass

        print(mapped_data)

        for slide in data["slides"]:
            for element in slide.get("pageElements", []):  # 각 슬라이드의 요소들 순회
                obj_id = element.get("objectId")  # objectId 가져오기

                if obj_id in mapped_data:
                    text_elements = element.get("shape", {}).get("text", {}).get("textElements", [])
                    for text_element in text_elements:
                        if "textRun" in text_element:  # textRun이 존재하는 경우

                            text_element["textRun"]["content"] = mapped_data[obj_id] + "\n"  # 텍스트 변경

                            requests_update.append({
                                "deleteText": {
                                    "objectId": obj_id,
                                    "textRange": {
                                        "type": "ALL"  # 텍스트 전체 삭제
                                    }
                                }
                            })
                            requests_update.append({
                                "insertText": {
                                    "objectId": obj_id,
                                    "text": mapped_data[obj_id]  # 새로 설정된 텍스트
                                }
                            })

                            break

        permission = {
            "type": "anyone",  # 모든 사용자
            "role": "reader",  # 읽기 권한 (viewer)
        }

        for i in requests_update:
            print(i)
            print()

        # 슬라이드 업데이트 요청
        slides_service = build('slides', 'v1', credentials=creds)
        slides_service.presentations().batchUpdate(
            presentationId=presentation_id,
            body={'requests': requests_update}
        ).execute()

        drive_service.permissions().create(
            fileId=presentation_id,
            body=permission,
            fields = "id"
        ).execute()

        print(presentation_id)
        print(presentation_link)

        return presentation_link

    except Exception as e:
        print(e)

############################################################################

# @login_required(login_url='/login/')
# def result_tap(request):
#     global presentation_id
#     # GET 요청에서 presentation_id 가져오기
#
#     # # presentation_id가 없는 경우 처리
#     # if not presentation_id:
#     #     return redirect("result")
#
#     # 템플릿으로 전달
#     return render(request, "blog/result_tap.html", {"presentation_id": presentation_id})

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
    return render(request, 'blog/profile.html', {
        'user': user,
        'username': user.username,
        'email': user.email,
        'nickname': user.nickname,  # ✅ 닉네임 전달 확인
    })

# 서비스 계정 인증 설정
def authenticate_with_service_account():
    # 필요한 API 범위 설정
    SCOPES = ['https://www.googleapis.com/auth/presentations.readonly']

    # 서비스 계정 인증
    creds = service_account.Credentials.from_service_account_file(
        project_file(settings.GOOGLE_SERVICE_ACCOUNT_FILE), scopes=SCOPES
    )

    # API 클라이언트 생성
    service = build('slides', 'v1', credentials=creds)
    return service


# Google Slides 문서에서 첫 번째 슬라이드의 썸네일 가져오기
def get_slide_thumbnail(presentation_id, slide_index=0):
    service = authenticate_with_service_account()

    # 프레젠테이션 정보 가져오기
    presentation = service.presentations().get(presentationId=presentation_id).execute()
    # 첫 번째 슬라이드의 objectId 가져오기
    slide_object_id = presentation['slides'][slide_index]['objectId']
    # 썸네일 이미지 URL 가져오기
    thumbnail = service.presentations().pages().getThumbnail(
        presentationId=presentation_id,
        pageObjectId=slide_object_id
    ).execute()
    return thumbnail.get('contentUrl')

# def router(request):
#     return redirect('download_slide')

# 뷰에서 슬라이드 썸네일을 HTML로 렌더링
def display_slides(request):
    # 프레젠테이션 ID 목록
    global presentation_id
    # presentation_ids = [
    #     '1Kh5ol8ogtFhA8c1GZysm4rVxhU68pjgJA_PqVCz453Q',  # 예시 프레젠테이션 ID
    # ]

    # 각 프레젠테이션의 첫 번째 슬라이드 썸네일 URL을 가져옴
    # first_slide_images = []
    # for presentation_id in presentation_ids:
    #     first_slide_image_url = get_slide_thumbnail(presentation_id)
    #     if first_slide_image_url:
    #         first_slide_images.append(first_slide_image_url)

    slides=get_slides_list()
    # print(f"main title: {slides} len: {len(slides)}")
    print(presentation_id)

    # HTML 템플릿에 데이터를 전달
    return render(request, 'blog/result_tap.html', {'slides': slides, 'presentation_id': presentation_id})

# slides_list

# 로깅 설정
logger = logging.getLogger(__name__)

SCOPES = ['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/presentations.readonly']
SERVICE_ACCOUNT_FILE = project_file(settings.GOOGLE_SERVICE_ACCOUNT_FILE)

def get_slides_list():
    global SCOPES
    global presentation_id
    """Google Drive에서 사용자의 슬라이드 목록 가져오기"""
    creds = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=SCOPES
    )
    drive_service = build('drive', 'v3', credentials=creds)
    slides_service = build('slides', 'v1', credentials=creds)

    # # Google Slides 목록 가져오기
    # results = drive_service.files().list(
    #     q="mimeType='application/vnd.google-apps.presentation'",
    #     fields="files(id, name)"
    # ).execute()
    #
    # slides = results.get('files', [])
    presentation = slides_service.presentations().get(presentationId=presentation_id).execute()
    slides = presentation.get('slides', [])

    # 첫 5개의 슬라이드만 선택
    thumbnails = []
    for index, slide in enumerate(slides[:5]):
        slide_id = slide.get('objectId')

        # 슬라이드 썸네일 가져오기
        thumbnail_response = slides_service.presentations().pages().getThumbnail(
            presentationId=presentation_id,
            pageObjectId=slide_id
        ).execute()

        thumbnails.append(thumbnail_response.get('contentUrl'))
    # print(f"get_slides_list: {thumbnails}")

    return thumbnails
    # return slides  # {id, name} 리스트 반환

# def get_slide_thumbnail(presentation_id):
#     """Google Slides에서 썸네일 가져오기"""
#     creds = service_account.Credentials.from_service_account_file(
#         SERVICE_ACCOUNT_FILE, scopes=SCOPES
#     )
#     drive_service = build('drive', 'v3', credentials=creds)
#
#     try:
#         # Google Drive API에서 파일 정보 가져오기 (썸네일 링크 포함)
#         file = drive_service.files().get(fileId=presentation_id, fields="thumbnailLink").execute()
#         return file.get('thumbnailLink')
#     except Exception as e:
#         logger.error(f"Error getting thumbnail for presentation {presentation_id}: {str(e)}")
#         return None

def get_slide_image(slides_service, presentation_id, page_id):
    """
    Google Slides에서 특정 슬라이드를 이미지(썸네일)로 가져오기
    :param slides_service: Google Slides API 서비스 객체
    :param presentation_id: 프레젠테이션 ID
    :param page_id: 슬라이드의 Object ID
    :return: 썸네일 URL (없으면 None)
    """
    try:
        # 특정 슬라이드의 썸네일 URL 가져오기
        thumbnail = slides_service.presentations().pages().getThumbnail(
            presentationId=presentation_id, pageObjectId=page_id
        ).execute()
        return thumbnail.get("contentUrl")

    except Exception as e:
        logger.error(f"Error getting slide image for presentation {presentation_id}, page {page_id}: {str(e)}")
        return None

def get_slide_images(presentation_id, max_slides=4):
    """
    Google Slides에서 첫 몇 개의 슬라이드 이미지를 가져오기
    :param presentation_id: 프레젠테이션 ID
    :param max_slides: 가져올 슬라이드 개수 (기본값 4)
    :return: 썸네일 URL 리스트
    """
    slides_service = authenticate_with_service_account()

    try:
        # 프레젠테이션의 모든 슬라이드 정보 가져오기
        presentation = slides_service.presentations().get(presentationId=presentation_id).execute()
        slides = presentation.get("slides", [])

        if not slides:
            logger.error(f"Presentation {presentation_id} has no slides.")
            return []

        slide_images = []

        # 지정된 개수만큼 슬라이드 이미지 가져오기
        for slide in slides[:max_slides]:
            page_id = slide["objectId"]
            image_url = get_slide_image(slides_service, presentation_id, page_id)
            if image_url:  # 유효한 이미지 URL만 추가
                slide_images.append(image_url)

        return slide_images

    except Exception as e:
        logger.error(f"Error getting slides images for presentation {presentation_id}: {str(e)}")
        return []


def download_pptx(presentation_id):
    """Google Slides 프레젠테이션을 PPTX 형식으로 다운로드"""
    try:
        # 인증 설정
        creds = service_account.Credentials.from_service_account_file(
            SERVICE_ACCOUNT_FILE, scopes=SCOPES
        )
        drive_service = build("drive", "v3", credentials=creds)

        # 프레젠테이션 정보 가져오기 (파일명 확인)
        file_metadata = drive_service.files().get(fileId=presentation_id, fields="name").execute()
        presentation_name = file_metadata.get("name", "presentation")

        # 파일을 PPTX로 다운로드
        google_request = drive_service.files().export_media(
            fileId=presentation_id,
            mimeType="application/vnd.openxmlformats-officedocument.presentationml.presentation"
        )

        # 다운로드 진행
        fh = io.BytesIO()
        downloader = MediaIoBaseDownload(fh, google_request)
        done = False
        while not done:
            status, done = downloader.next_chunk()

        fh.seek(0)  # 파일 포인터를 처음으로 이동

        with open(f"{presentation_name}.pptx", "wb") as f:
            f.write(fh.read())

        # Django 환경이면 HttpResponse 반환
        if HttpResponse:
            response = HttpResponse(
                fh, content_type="application/vnd.openxmlformats-officedocument.presentationml.presentation"
            )
            response["Content-Disposition"] = f'attachment; filename="{presentation_name}.pptx"'
            print(response)
            return response

    except Exception as e:
        logger.error(f"Error downloading PPTX for presentation {presentation_id}: {str(e)}")
        raise



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
        # logger.info(f"Starting download_pptx for {presentation_id}")
        # response = download_pptx(presentation_id) #원본
        download_pptx(presentation_id)
        # 프레젠테이션 다운로드
        # pptx_file = download_pptx(presentation_id)
        # print(f"download_pptx_result: {pptx_file}")
        #
        # # HTTP 응답 설정
        # response = HttpResponse(pptx_file, content_type='application/vnd.openxmlformats-officedocument.presentationml.presentation')
        # response['Content-Disposition'] = f'attachment; filename={presentation_id}.pptx'
        # print(f"response about download{response}")
        # logger.info(f"Response type: {type(response)}")
        # return HttpResponse("File downloaded successfully!")
        return redirect('result')

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
