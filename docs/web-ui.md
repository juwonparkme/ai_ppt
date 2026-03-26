# Web UI

`read_when`: `figma 1` 아래 새 HTML 시안을 실제 Django 템플릿에 반영했을 때.

## Source Mapping

- `figma 1/대시보드.html`
  - `templates/landing_home.html`
- `figma 1/AI생성워크플로우.html`
  - `blog/templates/blog/presentation_prompt.html`
- `figma 1/내정보.html`
  - `blog/templates/blog/account_profile.html`
- `figma 1/편집기.html`
  - `blog/templates/blog/presentation_result.html`
- `figma 1/로그인.html`
  - `blog/templates/blog/auth_login.html`

## Shared Shell

- `templates/site_base.html`
  - Tailwind CDN, color tokens, fonts
- `templates/site_app_base.html`
  - 앱형 화면 공통 헤더/사이드바
- `templates/site_auth_base.html`
  - 로그인/회원가입/비밀번호 재설정 카드형 레이아웃
- `blog/templates/blog/includes/app_header.html`
- `blog/templates/blog/includes/app_sidebar.html`
- `blog/templates/blog/includes/messages.html`

## Runtime Notes

- 홈 대시보드
  - 로그인 상태면 최근 생성 기록 표시
  - 템플릿 카드가 `?template=` 프리셋으로 `prompt` 이동
- 프롬프트 화면
  - `GET /prompt/?topic=...` 지원
  - `GET /prompt/?template=modern-a|modern-b|default` 지원
  - 템플릿 1개 선택 후 POST
- 결과 화면
  - 세션 `last_result` 기준으로 편집기 셸 렌더
  - `result/history/<id>/` 로 저장된 결과 payload 재열기 지원
- 비밀번호 변경
  - 이전 잘못된 이메일 폼 제거
  - 실제 `old_password/new_password1/new_password2` 필드 사용

## Persistence

- `blog.models.UserHistory.result_payload`
  - editor용 preview payload 저장
  - 세션 없이도 history 카드에서 결과 화면 복원

## Client Scripts

- `blog/static/js/presentation_prompt.js`
  - 템플릿 선택 검증
  - 제출 중 상태 전환
- `blog/static/js/presentation_result.js`
  - 좌측 슬라이드 선택
  - 다운로드 토스트
