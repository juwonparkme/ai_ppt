---
title: SlideSpec Contract
read_when:
  - Django와 renderer 사이 계약 정의할 때
  - OpenAI 출력 포맷 변경할 때
  - 템플릿 구현 시작할 때
---

# SlideSpec 계약

## 목적

`SlideSpec` 은 Django가 생성하는 PPT 콘텐츠 명세이며, Node/TS `ppt-renderer` 가 이 JSON을 입력받아 `.pptx` 로 렌더링한다.

목표:

- 문자열 파싱 대신 구조화된 계약 사용
- Google Slides object ID 의존 제거
- Django와 Node 사이 입출력 고정

## 최상위 구조

```json
{
  "version": "1.0",
  "title": "AI 협업 도구의 장단점",
  "template": "modern-a",
  "language": "ko",
  "metadata": {
    "topic": "AI 협업 도구의 장단점",
    "source": "openai"
  },
  "slides": []
}
```

## 필드 정의

### `version`

- 타입: `string`
- 현재 값: `"1.0"`

### `title`

- 타입: `string`
- 프레젠테이션 전체 제목

### `template`

- 타입: `string`
- 예: `modern-a`, `modern-b`, `report-a`

### `language`

- 타입: `string`
- 기본값: `ko`

### `metadata`

- 타입: `object`
- 생성 파이프라인 내부 정보
- 예:
  - `topic`
  - `source`
  - `generated_at`

### `slides`

- 타입: `Slide[]`

## Slide 구조

```json
{
  "id": "slide-1",
  "kind": "title",
  "title": "AI 협업 도구의 장단점",
  "subtitle": "업무 생산성과 리스크 균형",
  "bullets": [],
  "notes": ""
}
```

## Slide 필드

### `id`

- 타입: `string`
- 선택값
- 렌더/로그 추적용

### `kind`

- 타입: `string`
- 허용값:
  - `title`
  - `toc`
  - `bullets`
  - `summary`

### `title`

- 타입: `string`
- 슬라이드 제목

### `subtitle`

- 타입: `string | null`
- `title` 슬라이드에서 주로 사용

### `bullets`

- 타입: `string[]`
- `toc`, `bullets`, `summary` 에서 사용

### `notes`

- 타입: `string | null`
- 발표자 메모 또는 내부 추적용

## 1차 렌더 범위

### `title`

필수 필드:

- `title`
- `subtitle`

### `toc`

필수 필드:

- `title`
- `bullets`

### `bullets`

필수 필드:

- `title`
- `bullets`

### `summary`

필수 필드:

- `title`
- `bullets`

## 예시

```json
{
  "version": "1.0",
  "title": "AI 협업 도구의 장단점",
  "template": "modern-a",
  "language": "ko",
  "metadata": {
    "topic": "AI 협업 도구의 장단점",
    "source": "openai"
  },
  "slides": [
    {
      "id": "slide-1",
      "kind": "title",
      "title": "AI 협업 도구의 장단점",
      "subtitle": "업무 생산성과 리스크 균형",
      "bullets": [],
      "notes": ""
    },
    {
      "id": "slide-2",
      "kind": "toc",
      "title": "목차",
      "subtitle": "",
      "bullets": ["개요", "장점", "단점", "도입 전략", "결론"],
      "notes": ""
    },
    {
      "id": "slide-3",
      "kind": "bullets",
      "title": "장점",
      "subtitle": "",
      "bullets": ["생산성 향상", "반복 작업 축소", "아이디어 확장"],
      "notes": ""
    },
    {
      "id": "slide-4",
      "kind": "summary",
      "title": "요약",
      "subtitle": "",
      "bullets": ["도입 기준 정의", "검수 체계 필요", "점진 적용 권장"],
      "notes": ""
    }
  ]
}
```

## 파서 규칙

기존 OpenAI 출력이 아래 포맷일 경우:

- `#Title:`
- `#Slide:`
- `#Header:`
- `#Content:`

Python 쪽에서 이를 `SlideSpec` 으로 변환한다.

변환 규칙:

- 첫 슬라이드는 `title`
- 헤더가 `목차` 면 `toc`
- 헤더가 `Summary` 또는 `요약` 이면 `summary`
- 나머지는 `bullets`

## 실패 처리

아래 경우 validation error 로 본다.

- `version` 누락
- `title` 누락
- `slides` 비어 있음
- 슬라이드 `kind` 가 허용값 외
- `title` 슬라이드에 제목 없음
- `bullets` 류 슬라이드에 bullet 배열 없음

## 변경 정책

- 하위 호환 깨질 때 `version` 올릴 것
- Django/Node 양쪽 타입을 동시에 갱신할 것
- 새 슬라이드 타입 추가 시 템플릿 fallback 정의할 것

