---
title: PptxGenJS Migration Task List
read_when:
  - 실제 구현 시작할 때
  - 우선순위/작업 순서 정리할 때
  - 진행 상태 체크할 때
---

# PptxGenJS 전환 작업 목록

## Phase 0. 사전 정리

- [ ] 현재 Google Slides 의존 코드 목록 고정
- [ ] 현재 템플릿 3종 입력값/출력값 캡처
- [ ] 산출물 저장 위치 정책 정리
- [ ] `.pptx` 다운로드 경로 요구사항 확정

완료 기준:

- 어떤 코드가 Google 전용인지 목록화됨
- 현재 템플릿별 기대 결과 예시가 확보됨

## Phase 1. 계약 정의

- [x] `SlideSpec` 초안 작성
- [x] 슬라이드 타입 enum 확정
- [x] Python 타입 정의 추가
- [x] TS 타입 정의 추가
- [x] OpenAI 출력 스키마 초안 작성
- [x] 실패 시 validation 에러 포맷 정의

완료 기준:

- Django와 Node가 같은 JSON 계약을 공유함
- 텍스트 파싱 없이 구조화된 입력이 가능함

## Phase 2. Node 렌더러 생성

- [x] `ppt-renderer/` 디렉토리 생성
- [x] `package.json` 초기화
- [x] `typescript`, `pptxgenjs`, `zod` 설치
- [x] `render` CLI 엔트리 구현
- [x] 입력 JSON 읽기 구현
- [x] 출력 `.pptx` 저장 구현
- [x] 성공/실패 메타데이터 JSON 출력 구현

완료 기준:

- `node ... render --input spec.json --output out.pptx` 가 동작함

## Phase 3. 템플릿 1개 프로토타입

- [x] `modern-a` 템플릿 생성
- [x] 공통 theme 토큰 정의
- [ ] master slide 구성
- [x] `title` 슬라이드 구현
- [x] `toc` 슬라이드 구현
- [x] `bullets` 슬라이드 구현
- [x] `summary` 슬라이드 구현

완료 기준:

- 최소 4종 슬라이드 타입으로 `.pptx` 생성 가능

## Phase 4. Django 연동

- [x] `services/ppt_renderer.py` 추가
- [x] Node CLI subprocess 호출 구현
- [x] 작업 디렉토리 생성 규칙 추가
- [x] `spec.json` 저장 구현
- [x] 렌더 결과 파일 경로 저장 구현
- [x] 기존 `create_slides()` 호출 분리

완료 기준:

- Django가 Google 없이 로컬 `.pptx` 생성 가능

## Phase 5. 데이터 모델 정리

- [x] `UserHistory` 필드 재검토
- [x] 필요 시 `file_path`, `status`, `error_message` 추가
- [ ] 기존 `ppt_url` 의미 재정의 또는 별도 모델 도입
- [x] 생성 결과 다운로드 URL 매핑

완료 기준:

- 결과 파일과 상태를 DB에서 안정적으로 추적 가능

## Phase 6. 테스트

### Django

- [x] `prompt` POST -> `SlideSpec` 생성 테스트
- [x] renderer 호출 성공 테스트
- [x] renderer 실패 테스트
- [x] 이력 저장 테스트

### Node

- [x] fixture spec smoke test
- [ ] template `modern-a` 출력 테스트
- [ ] 긴 제목 줄바꿈 테스트
- [ ] 한글 불릿 렌더 테스트

### 통합

- [x] 로그인 후 생성 요청 테스트
- [ ] `.pptx` 파일 존재 테스트
- [x] 다운로드 응답 테스트

완료 기준:

- Google OAuth 없이 핵심 생성 경로 회귀 테스트 가능

## Phase 7. 템플릿 확장

- [ ] `modern-b` 구현
- [ ] `report-a` 구현
- [ ] 이미지 슬라이드 지원
- [ ] 표 지원
- [ ] 차트 지원

완료 기준:

- 현재 UI의 템플릿 선택지가 모두 로컬 렌더링으로 연결됨

## Phase 8. 비동기화

- [ ] 생성 작업을 background job 으로 분리
- [ ] 상태 polling 또는 완료 페이지 반영
- [ ] 실패 재시도 정책 추가
- [ ] 장시간 작업 timeout 정책 추가

완료 기준:

- 웹 요청 타임아웃 없이 생성 가능

## Phase 9. 선택적 Google 업로드

- [ ] 업로드 adapter 설계
- [ ] Google Drive 업로드 구현
- [ ] 업로드 후 공유 링크 생성 구현
- [ ] 로컬 생성과 업로드 단계를 분리

완료 기준:

- 로컬 `.pptx` 생성 성공 후에만 업로드 수행

## 우선순위

### Must

- [x] SlideSpec
- [x] Node renderer CLI
- [x] 템플릿 1개
- [x] Django 연동
- [x] 핵심 테스트

### Should

- [ ] 템플릿 3개 이식
- [ ] 다운로드/이력 정리
- [ ] 비동기 작업화

### Could

- [ ] Google 업로드 옵션
- [ ] 차트/고급 레이아웃
- [ ] 썸네일 생성

## 권장 실행 순서

1. `SlideSpec` 문서 작성
2. Node renderer skeleton 생성
3. 템플릿 1개 구현
4. Django subprocess 연동
5. 회귀 테스트 추가
6. 템플릿 3개 확장
7. 비동기 job 도입
8. Google 업로드 옵션 분리

## 체크 포인트

- [x] Google 없이 `.pptx` 1건 생성 가능
- [ ] 템플릿 1개 완성
- [x] `prompt` POST 테스트 유지
- [x] 로컬 다운로드 가능
- [x] 외부 OAuth 없어도 개발 가능
