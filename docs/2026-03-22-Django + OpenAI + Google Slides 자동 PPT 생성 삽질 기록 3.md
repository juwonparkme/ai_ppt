---
layout: post
read_time: true
show_date: true
title: "Django + OpenAI + Google Slides 자동 PPT 생성 삽질 기록 3: 편집 가능한 웹앱과 Lightsail 배포 경로까지"
date: 2024-11-22
description: Django 기반 AI PPT 생성기를 편집 가능한 웹앱으로 확장하고 Docker, Caddy, Lightsail, Terraform 배포 경로를 분리하며 정리한 작업 기록.
tags: [Django, OpenAI, Google Slides, PPTXGenJS, Docker, Caddy, Lightsail, Terraform]
author: Juwon
---

# Django + OpenAI + Google Slides 자동 PPT 생성 삽질 기록 3: 편집 가능한 웹앱과 Lightsail 배포 경로까지

> AI가 초안을 만드는 데서 끝내지 않고, 웹에서 수정하고 다시 렌더하고 실제 배포 경로까지 붙여 본 작업 기록이다.

## 왜 이 작업을 시작했나

처음 목표는 "PPT를 자동으로 만들어 주는 데모"가 아니었다. `Django + OpenAI + Google Slides/PPTX + 편집기 + 배포`까지 하나의 제품 흐름으로 붙이는 쪽이 더 중요했다.  
즉, 사용자가 주제를 넣으면 초안이 생성되고, 그 결과를 웹에서 바로 수정하고, 다시 결과물로 내보내고, 나중에는 같은 방식으로 다른 웹앱도 배포할 수 있어야 했다.

그래서 이 작업은 자연스럽게 두 갈래로 커졌다.

첫째는 생성 품질보다 편집 가능성을 우선하는 웹앱 구조였다.  
둘째는 한 번 띄우고 끝나는 서버가 아니라, Docker와 Lightsail, Terraform까지 이어지는 운영 패턴 정리였다.

이 기준을 잡고 나니 "AI가 잘 써 주는가"보다 "생성 결과를 사용자가 통제할 수 있는가", "화면과 실제 렌더 결과가 얼마나 일치하는가", "배포를 반복 가능한 방식으로 만들 수 있는가"가 더 중요한 문제가 됐다.

<!-- image-slot: 홈 화면 초기 진입 화면 또는 프롬프트 입력 화면 -->
<!-- caption: 사용자가 주제와 템플릿을 선택하면서 생성 흐름이 시작되는 지점 -->

## 먼저 개념부터 정리했다

초반에는 기능을 바로 붙이기보다, 화면 구조와 렌더 구조, 배포 구조를 분리해서 생각했다.

UI와 정보구조는 `figma 1` 아래 새 HTML 시안, `design_tem1.pdf`, `design_tem2.pdf`를 기준으로 잡았다.  
여기서 중요한 건 "예쁜 화면"이 아니라 각 화면의 역할이었다. 홈은 진입, 프롬프트는 입력, 결과 페이지는 편집, 프로필은 사용자 자산 관리로 나눠야 했다.

렌더링 쪽은 OpenAI가 바로 PPT를 만드는 구조가 아니라, 중간 산출물을 `SlideSpec`으로 정리한 뒤 `pptxgenjs` 렌더러에 넘기는 방식으로 잡았다.  
이렇게 해야 생성 단계와 편집 단계, 최종 내보내기 단계를 분리할 수 있었다.

배포 쪽은 더 명확하게 분리했다.

- Docker: 앱을 묶는 실행 단위
- Lightsail: 당장 올릴 서버
- Terraform: 다음 프로젝트에도 재사용할 인프라 템플릿

특히 Terraform은 지금 당장 적용하는 도구라기보다, "Lightsail 없는 새 환경"을 만들 때 반복 가능한 기준을 남기는 용도로 정리했다.

## 참고한 자료

이번 작업에서 기준점이 된 문서는 아래 다섯 개였다.

- `docs/web-ui.md`
  화면을 카드 단위가 아니라 사용자 흐름 단위로 다시 보게 해 준 문서였다.
- `docs/deploy-lightsail.md`
  Lightsail 배포 시 필요한 구성 요소를 빠르게 확인하는 기준점이었다.
- `docs/docker-beginner-checklist.md`
  배포를 처음 다시 정리할 때 누락되기 쉬운 항목을 체크리스트 형태로 잡아 줬다.
- `docs/presentation-agent.md`
  OpenAI 기반 생성 흐름을 어디까지 자동화하고 어디부터 편집기로 넘길지 정리하는 데 도움이 됐다.
- `docs/slide-spec.md`
  생성 결과를 `SlideSpec`으로 구조화하는 기준 문서였다.

디자인 참조로는 `design_tem1.pdf`, `design_tem2.pdf`가 중요했다.  
템플릿 1, 2를 "스타일 샘플" 정도로 취급하면 화면과 렌더 결과가 계속 어긋났고, 결국 이 PDF를 레이아웃 기준 문서처럼 다뤄야 정리가 됐다.

## 직접 해본 내용

사용자 흐름은 단순하게 시작했다. 홈에서 주제를 입력하고 템플릿을 고른다. 그 다음 AI가 파일명, 개요, 상세 슬라이드 내용을 단계적으로 만든다. 이 결과는 `SlideSpec`으로 구조화되고, 최종 렌더러는 `pptxgenjs`로 PPTX를 만든다.

핵심은 생성 이후였다. 결과 화면을 단순 결과 페이지가 아니라 편집기로 바꿨다. 레이아웃은 슬라이드 썸네일, 중앙 미리보기, 우측 inspector 구조로 나눴고, 사용자는 제목, 부제, 불릿을 직접 수정할 수 있게 했다. 슬라이드 추가와 삭제도 여기서 처리하도록 옮겼다.

관련 구현은 주로 아래 파일에 모였다.

- `blog/services/presentation_agent.py`
- `blog/services/editor_payload.py`
- `blog/static/js/presentation_result.js`
- `blog/static/js/presentation_result_template_preview.js`
- `blog/templates/blog/presentation_result.html`
- `blog/templates/blog/template_library.html`
- `templates/landing_home.html`

템플릿 라이브러리도 바꿨다. 처음에는 정해진 템플릿만 보여주는 구조에 가까웠는데, 나중에는 사용자가 업로드한 템플릿을 라이브러리에 추가할 수 있게 바꿨다. 입력 포맷은 `pptx`와 `pdf`를 모두 받되, 기존 렌더러 연결 방식은 유지했다. 즉, 입력 자산은 넓히되 렌더링 파이프라인은 가능한 한 흔들지 않는 쪽을 택했다.

배포 준비는 애플리케이션 코드와 별도로 정리했다. `app`과 `web(Caddy)`를 분리한 Docker 구성을 만들고, Lightsail에서 바로 띄울 수 있는 compose, entrypoint, Caddy 설정을 붙였다. 실제 확인은 아래 명령으로 했다.

```bash
sh deploy/lightsail/deploy.sh
curl -fsS http://127.0.0.1/healthz/
docker compose --env-file /dev/null -f docker-compose.lightsail.yml ps
```

테스트와 기본 검증도 따로 돌렸다.

```bash
./.venv/bin/python manage.py test blog.tests.test_web_templates
./.venv/bin/python manage.py test blog.tests.test_prompt
./.venv/bin/python manage.py check
npm --prefix ppt-renderer run typecheck
```

배포 관련 핵심 파일은 아래였다.

- `Dockerfile`
- `docker-compose.lightsail.yml`
- `deploy/lightsail/deploy.sh`
- `deploy/lightsail/Caddyfile`
- `deploy/lightsail/app.env.example`

<!-- image-slot: 에디터 화면 전체 레이아웃 -->
<!-- caption: 썸네일, 중앙 미리보기, 우측 inspector로 나뉜 편집기 구조 -->

## 막혔던 부분과 트러블슈팅

가장 반복해서 부딪힌 문제는 "보이는 것"과 "실제 결과"가 다르다는 점이었다.

템플릿 1, 2는 화면상 미리보기와 실제 렌더 결과가 어긋나는 구간이 있었다. 처음에는 프론트 미리보기만 맞추면 되는 문제처럼 보였지만, 실제로는 미리보기와 렌더러가 다른 자산과 다른 구조를 참조하고 있었던 게 더 큰 원인이었다. 이 상태에서는 화면을 아무리 예쁘게 다듬어도 결과물 신뢰도가 올라가지 않았다.

에디터도 비슷했다. 초반에는 "수정 가능한 제품"이 아니라 사실상 "결과를 보여주는 화면"에 가까웠다. 그래서 사용자가 손댈 수 있는 범위와 실제 데이터 구조가 분리돼 있었고, 나중에 inspector 중심 편집 모델로 다시 정리해야 했다.

우측 inspector는 생각보다 손이 많이 갔다.  
불릿이 길어질 때 전체 스크롤과 개별 `textarea` 스크롤이 겹쳤고, 선택 상태와 수정 상태가 섞이면서 UX가 계속 흔들렸다. 이 문제는 예쁘게 만드는 문제가 아니라, 편집기의 기본 사용성을 세우는 문제였다.

프로필 페이지도 작은 문제 같지만 실제 사용감에 영향을 줬다. 사진 업로드 후 저장해야만 반영되는 구조라서, 사용자는 업로드가 성공했는지 즉시 알기 어려웠다. 결국 즉시 미리보기를 붙여서 피드백 루프를 줄였다.

홈 화면은 한 번 레퍼런스 스타일을 따라 재설계했다가 원복했다.  
이건 구현 실패라기보다, 잘못 전달된 명령 때문에 방향이 틀어진 케이스에 가까웠다. 다만 이 과정 덕분에 "레퍼런스를 닮게 만드는 것"과 "현재 제품 흐름에 맞게 바꾸는 것"은 다르다는 걸 더 명확히 확인했다. 실제 커밋 흐름도 그 흔적을 남긴다.

- `94cbce0 feat: restyle home as resume landing`
- `01eadef Revert "feat: restyle home as resume landing"`

배포 쪽은 더 현실적인 제약이 있었다. Terraform으로 새 Lightsail을 만들고 싶었지만, 당장 필요한 Lightsail 권한과 도메인 정보, DNS 위치가 충분히 정리돼 있지 않았다. 그래서 새 인프라 생성은 미루고, 기존 Lightsail 서버를 재사용하는 경로로 우회했다. 속도는 빨랐지만, Terraform으로 운영 자원을 완전히 관리하는 상태까지는 아직 가지 못했다.

<!-- image-slot: 템플릿 미리보기와 실제 렌더 결과 비교 화면 또는 레퍼런스 비교 캡처 -->
<!-- caption: 화면 미리보기와 실제 결과물 사이의 괴리를 줄이기 위해 어떤 기준으로 정리했는지 보여주는 비교 이미지 -->

## 해결 또는 정리한 내용

이번 작업에서 가장 중요한 정리는 "생성", "편집", "렌더", "배포"의 경계를 다시 나눈 것이었다.

UI는 카드 몇 장을 고치는 수준으로 다루지 않았다. 홈, 프롬프트, 에디터, 프로필을 각각 목적이 분명한 화면으로 분리했다. 이 방식이 맞았던 이유는, 화면이 바뀔 때마다 코드 구조도 함께 단순해졌기 때문이다.

에디터는 미리보기와 썸네일이 실제 템플릿 기반으로 렌더되도록 바꿨다.  
핵심은 같은 자산, 같은 구조를 기준으로 미리보기와 최종 결과를 맞추는 것이었다. 완전히 같은 렌더러를 쓰는 수준까지 갔는지는 별도 검증이 더 필요하지만, 적어도 이전처럼 화면과 결과물이 서로 다른 규칙을 따르는 상태는 줄였다.

템플릿은 `design_tem1`, `design_tem2`를 기준으로 역할을 분명히 했다.  
이 문서들이 단순 참고 자료가 아니라, 템플릿 레이아웃 판단의 기준 문서가 된 셈이다.

배포는 `app`과 `web(Caddy)`를 나눈 Docker 구성으로 통일했다.  
개발 환경과 배포 환경이 완전히 같지는 않더라도, 실행 단위를 비슷하게 맞추는 것만으로도 운영 판단이 훨씬 쉬워졌다.

Lightsail은 이상적인 경로보다 현실적인 경로를 택했다.  
새 서버를 Terraform으로 처음부터 세우는 대신, 기존 서버에 바로 올리는 방식으로 속도를 확보했다. 반대로 Terraform은 "나중에 새 환경을 반복 생성할 때 쓸 재사용형 템플릿"으로 따로 정리했다. 이 선택은 완결성보다 진행 속도를 우선한 판단이었다.

아직 남은 한계도 분명하다.

- 실제 Lightsail 배포 마무리는 기존 서버 상태와 도메인, DNS 위치가 확정돼야 끝난다.
- Terraform은 새 Lightsail 생성 전제를 기준으로 정리돼 있고, 기존 서버 import 흐름은 아직 타지 않았다.
- Google Slides 연동 구조는 있지만, 현재 제품 경험의 중심은 웹 편집과 재렌더다.
- 홈 UI 실험은 있었지만 현재 상태는 원복된 버전이다.

## 이번 작업에서 배운 점

AI 기능을 붙일 때 가장 먼저 무너지는 지점은 생성 품질이 아니라 편집 경계라는 걸 다시 확인했다.  
초안을 잘 만드는 것만으로는 제품이 되지 않는다. 사용자가 어디까지 수정할 수 있고, 그 수정이 어떤 구조로 다시 결과물에 반영되는지가 더 중요하다.

두 번째로, 미리보기와 실제 렌더러가 다른 규칙을 따르면 결국 신뢰도가 무너진다.  
이 문제는 프론트엔드 이슈처럼 보이지만 실제로는 시스템 설계 문제에 가깝다. 화면과 결과물이 같은 기준을 보도록 맞추는 일이 먼저였다.

세 번째로, 배포는 마지막 단계가 아니라 설계 기준이었다.  
Docker, Caddy, Lightsail, Terraform을 한 번에 완성하지는 못했지만, 최소한 "당장 띄우는 경로"와 "재사용 가능한 인프라 경로"를 분리해 둔 덕분에 다음 작업으로 이어갈 수 있는 상태가 됐다.

## 포트폴리오 관점에서 정리

이 작업은 단순히 AI로 PPT를 생성했다는 얘기보다, 생성 결과를 편집 가능한 제품으로 확장한 경험으로 설명하는 편이 맞다.

포트폴리오에서 강조할 수 있는 포인트는 명확하다.

- OpenAI 결과물을 바로 보여주는 데서 멈추지 않고, 웹 편집과 재렌더 흐름까지 제품으로 연결한 점
- `SlideSpec`과 `pptxgenjs`를 기준으로 미리보기와 결과물의 괴리를 줄이려 한 시스템 설계
- Docker, Caddy, Lightsail, Terraform을 역할별로 분리해 배포 경로를 설계한 운영 감각
- 화면을 미관이 아니라 작업 흐름 기준으로 다시 나눈 UI 판단
- 문제를 감추지 않고, 미리보기-렌더-배포 경계를 다시 정의해 해결한 방식

면접에서는 이 작업을 "AI 자동화"보다 "편집 가능한 생성형 웹앱 설계"로 설명하는 편이 더 정확하다.  
무엇을 만들었는지보다, 어디서 틀어졌고 그걸 어떤 경계 재설계로 풀었는지가 이 프로젝트의 핵심이었다.

<!-- image-slot: Docker 실행 로그 또는 healthz 확인 화면, Lightsail/DNS/HTTPS 설정 화면 -->
<!-- caption: 앱 컨테이너, 웹 서버, health check, 실제 배포 경로를 검증한 근거 이미지 -->
