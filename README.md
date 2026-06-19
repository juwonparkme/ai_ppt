# SlideArchitect

> **Django + OpenAI + PptxGenJS 기반 자동 PPT 생성 웹앱**
>
> 주제 입력 → 개요 생성 → 슬라이드 구조화 → 템플릿 렌더 → 웹 에디터 수정 → `.pptx` 다운로드.

---

## 한눈에 보기

`ai_ppt` 는 발표 자료 초안을 빠르게 만드는 웹 프로젝트다.  
콘텐츠 생성은 Django + OpenAI, 최종 `.pptx` 렌더링은 TypeScript 기반 `ppt-renderer` 가 맡는다.

### 이 프로젝트가 하는 일

- 주제 한 줄로 발표 자료 초안 생성
- OpenAI 단일 호출로 파일명/개요/상세 내용 생성
- `SlideSpec` 계약으로 슬라이드 구조 표준화
- `modern-a`, `modern-b` 템플릿으로 실제 PPTX 렌더
- 웹 에디터에서 슬라이드 텍스트 수정, 추가, 삭제
- 사용자별 템플릿 업로드와 결과 히스토리 관리
- Docker + Nginx + certbot 기반 Lightsail 배포

### 현재 스택

| 영역 | 구성 |
| --- | --- |
| 웹 앱 | Django 5 |
| AI 생성 | OpenAI API |
| 렌더러 | PptxGenJS + TypeScript |
| 저장 | SQLite, 로컬 media/output 디렉터리 |
| 배포 | Docker Compose, Nginx, certbot, AWS Lightsail |

---

## 화면 흐름

### 1. 생성

- 주제 입력
- 템플릿 선택
- OpenAI 기반 파일명/개요/상세 슬라이드 생성

### 2. 편집

- 웹 에디터에서 제목, 부제, 불릿 수정
- 슬라이드 추가/삭제
- 선택한 템플릿 기준 미리보기 확인

### 3. 출력

- `.pptx` 파일 다운로드
- 생성 이력 저장
- 이후 다시 편집 화면 복원 가능

---

## 아키텍처

```text
사용자 입력
  -> Django View
  -> PresentationAgent
  -> SlideSpec 구조화
  -> ppt-renderer(Node / PptxGenJS)
  -> .pptx 파일 생성
  -> 결과 화면 / 다운로드
```

### 핵심 디렉터리

```text
ai_ppt/
├── blog/                    # Django 앱
│   ├── prompts/             # OpenAI 프롬프트 파일
│   ├── services/            # 생성/렌더 서비스 계층
│   ├── templates/           # 웹 템플릿
│   └── tests/               # 회귀 테스트
├── ppt-renderer/            # TypeScript 기반 PPTX 렌더러
├── deploy/lightsail/        # Docker/Nginx/Lightsail 배포 파일
├── docs/                    # 설계/배포/트러블슈팅 문서
└── new3/                    # Django settings / urls
```

### 핵심 코드 위치

- 생성 오케스트레이션: [presentation_agent.py](/Users/bagjuwon/Projects/ai_ppt/blog/services/presentation_agent.py)
- PPT 렌더 호출: [ppt_renderer.py](/Users/bagjuwon/Projects/ai_ppt/blog/services/ppt_renderer.py)
- 웹 라우팅: [urls.py](/Users/bagjuwon/Projects/ai_ppt/blog/urls.py)
- Django 설정: [settings.py](/Users/bagjuwon/Projects/ai_ppt/new3/settings.py)
- TS 렌더러 진입점: [package.json](/Users/bagjuwon/Projects/ai_ppt/ppt-renderer/package.json)

---

## 로컬 실행

### 요구 사항

- Python 3.11+
- Node.js 20+
- npm
- OpenAI API Key

### 1. Python 환경 준비

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. 렌더러 의존성 설치

```bash
npm --prefix ppt-renderer install
```

### 3. 환경 변수 준비

루트에 `.env` 파일 생성:

```env
DJANGO_SECRET_KEY=your-secret-key
DJANGO_DEBUG=true
OPENAI_API_KEY=your-openai-api-key
OPENAI_PRESENTATION_MODEL=gpt-4-turbo
PPT_RENDER_BACKEND=pptxgenjs
PPT_RENDERER_DIR=/absolute/path/to/ai_ppt/ppt-renderer
```

### 4. 마이그레이션 + 실행

```bash
python manage.py migrate
python manage.py runserver
```

접속:

- [http://127.0.0.1:8000](http://127.0.0.1:8000)

---

## 자주 쓰는 명령

### 테스트

```bash
./.venv/bin/python manage.py test
```

### 타입 체크

```bash
npm --prefix ppt-renderer run typecheck
```

### 렌더러 단독 실행

```bash
npm --prefix ppt-renderer run render -- --input /path/to/spec.json --output /path/to/output.pptx
```

---

## 배포

현재 배포 기준:

- Docker Compose
- Nginx reverse proxy
- certbot HTTPS
- AWS Lightsail

배포 문서:

- [deploy-lightsail.md](/Users/bagjuwon/Projects/ai_ppt/docs/deploy-lightsail.md)
- [docker-beginner-checklist.md](/Users/bagjuwon/Projects/ai_ppt/docs/docker-beginner-checklist.md)
- [lightsail-nginx-troubleshooting.md](/Users/bagjuwon/Projects/ai_ppt/docs/lightsail-nginx-troubleshooting.md)

### 배포 핵심 흐름

```text
git pull
-> app.env 작성
-> deploy.sh 실행
-> Docker 이미지 빌드
-> Nginx / certbot 기동
-> HTTPS 확인
```

---

## 문서 인덱스

| 문서 | 내용 |
| --- | --- |
| [slide-spec.md](/Users/bagjuwon/Projects/ai_ppt/docs/slide-spec.md) | 슬라이드 데이터 계약 |
| [presentation-agent.md](/Users/bagjuwon/Projects/ai_ppt/docs/presentation-agent.md) | 생성 파이프라인 설계 |
| [deploy-lightsail.md](/Users/bagjuwon/Projects/ai_ppt/docs/deploy-lightsail.md) | Lightsail 배포 절차 |
| [docker-beginner-checklist.md](/Users/bagjuwon/Projects/ai_ppt/docs/docker-beginner-checklist.md) | Docker 초보자용 배포 체크리스트 |
| [lightsail-nginx-troubleshooting.md](/Users/bagjuwon/Projects/ai_ppt/docs/lightsail-nginx-troubleshooting.md) | 실제 배포 삽질 기록 + 해결 절차 |

---

## 이 프로젝트에서 중요하게 본 것

- 프롬프트를 코드 밖 파일로 분리
- 입력/처리/출력 경계 분리
- 렌더 계약을 `SlideSpec` 으로 고정
- 템플릿 스타일과 콘텐츠 생성을 분리
- 웹 에디터 미리보기와 실제 렌더 결과를 최대한 일치시키기

---

## 한계와 다음 과제

- 현재 저장소는 로컬 파일 기반 저장을 전제로 함
- 운영 환경에서 장기적으로는 SQLite 대신 별도 DB가 더 적합
- 업로드 템플릿은 현재 “참고 디자인 + 메타 저장” 성격이 강함
- 대규모 background job 분리는 아직 미완료

---

## 요약

이 프로젝트는 `주제 입력 -> AI 초안 생성 -> 템플릿 기반 PPTX 렌더 -> 웹 에디터 수정 -> 다운로드` 흐름을 빠르게 검증하고 운영까지 연결한 실전형 Django 프로젝트다.  
콘텐츠 생성과 디자인 렌더를 분리해 유지보수성을 확보했고, Lightsail 배포까지 실제로 검증한 상태다.
