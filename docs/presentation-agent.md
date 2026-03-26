---
title: Presentation Agent Design
read_when:
  - PPT 생성 흐름을 바꿀 때
  - 프롬프트를 수정할 때
  - 입력/처리/출력 경계를 확인할 때
---

# Presentation Agent 설계

카드뉴스 AI 에이전트 가이드북의 핵심만 현재 repo 에 맞게 적용했다.

## 입력

- 사용자 입력 주제
- 선택 템플릿
- 환경 변수 기반 모델 설정

## 처리

1. 주제로부터 출력 파일명 생성
2. 주제로 개요 슬라이드 생성
3. 개요를 바탕으로 상세 슬라이드 생성
4. `SlideSpec` 으로 구조화
5. 렌더러에 전달

## 출력

- `spec.json`
- `.pptx`
- 생성 이력 DB 레코드
- 다운로드 URL

## 파일 경계

- [blog/services/presentation_agent.py](/Users/bagjuwon/Projects/ai_ppt/blog/services/presentation_agent.py)
  입력-처리-출력 오케스트레이션
- [blog/prompts/filename_prompt.txt](/Users/bagjuwon/Projects/ai_ppt/blog/prompts/filename_prompt.txt)
- [blog/prompts/overview_prompt.txt](/Users/bagjuwon/Projects/ai_ppt/blog/prompts/overview_prompt.txt)
- [blog/prompts/detail_prompt.txt](/Users/bagjuwon/Projects/ai_ppt/blog/prompts/detail_prompt.txt)
- [blog/slide_spec.py](/Users/bagjuwon/Projects/ai_ppt/blog/slide_spec.py)
  구조화 계약
- [blog/services/ppt_renderer.py](/Users/bagjuwon/Projects/ai_ppt/blog/services/ppt_renderer.py)
  렌더 전담

## 디자인 기준

- `modern-a`
  [templates/design_tem2.pdf](/Users/bagjuwon/Projects/ai_ppt/templates/design_tem2.pdf) 참고
- `modern-b`
  [templates/design_tem1.pdf](/Users/bagjuwon/Projects/ai_ppt/templates/design_tem1.pdf) 참고

웹에서 선택한 템플릿 ID 는 `pptxgenjs` 경로에서도 실제 템플릿 키로 매핑된다.

## 원칙

- 사용자 입력 주제와 출력 파일명을 분리한다.
- 프롬프트는 코드 밖 파일로 둔다.
- 뷰는 HTTP 처리만 맡기고 생성 로직은 서비스로 보낸다.
- 렌더 입력은 항상 `SlideSpec` 으로 고정한다.
