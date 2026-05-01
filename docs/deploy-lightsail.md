# Lightsail Deploy

`read_when`: `ai_ppt`를 AWS Lightsail 인스턴스에 Docker 기반으로 올리고, Terraform 인프라와 연결할 때.

## App Runtime

- Django 5 + Gunicorn
- Node/NPM 기반 `ppt-renderer`
- SQLite, 업로드 파일, 렌더 결과물은 Docker volume `/data` 에 저장
- Nginx가 reverse proxy + `/static/`, `/media/` 서빙
- `certbot` 이 Let's Encrypt 인증서 발급/갱신 담당

## Added Files

- `Dockerfile`
- `requirements.txt`
- `docker-compose.lightsail.yml`
- `deploy/lightsail/docker-entrypoint.sh`
- `deploy/lightsail/deploy.sh`
- `deploy/lightsail/nginx.http.conf.template`
- `deploy/lightsail/nginx.https.conf.template`
- `deploy/lightsail/render-nginx-config.sh`
- `deploy/lightsail/app.env.example`
- `docs/docker-beginner-checklist.md`

## Required Secrets

- `deploy/lightsail/app.env`
  - `deploy/lightsail/app.env.example` 복사 후 값 채우기

## Local Smoke

```bash
cp deploy/lightsail/app.env.example deploy/lightsail/app.env
env -i PATH="$PATH" HOME="$HOME" LIGHTSAIL_APP_ENV_FILE=./deploy/lightsail/app.env docker compose --env-file /dev/null -f docker-compose.lightsail.yml up -d --build
curl -fsS http://127.0.0.1/healthz/
```

`DJANGO_SECRET_KEY` 값에 `$` 가 들어가면 Compose 변수 치환으로 오해할 수 있으니 `$$` 로 이스케이프하거나 `$` 없는 값 사용 권장.

## Runtime Paths

- DB: `/data/db.sqlite3`
- staticfiles: `/data/staticfiles`
- media: `/data/media`
- rendered presentations: `/data/rendered-presentations`
- uploaded user templates: `/data/user-templates`

## Notes

- 운영에서는 `DJANGO_DEBUG=false`
- `NGINX_SERVER_NAME` 와 `LETSENCRYPT_EMAIL` 을 채우면 `deploy.sh` 가 HTTP 구성으로 먼저 띄운 뒤 certbot 발급 후 HTTPS 구성으로 전환
- `LETSENCRYPT_STAGING=true` 면 스테이징 CA 로 먼저 검증 가능
- Lightsail networking 에서 `80`, `443`, `22` 포트를 열어야 인증서 발급이 된다
- 앱 헬스체크 엔드포인트: `/healthz/`
- 초보자용 복붙 가이드는 [docs/docker-beginner-checklist.md](/Users/bagjuwon/Projects/ai_ppt/docs/docker-beginner-checklist.md)
- 실제 장애/해결 흐름 요약은 [docs/lightsail-nginx-troubleshooting.md](/Users/bagjuwon/Projects/ai_ppt/docs/lightsail-nginx-troubleshooting.md)
- Nginx 로그 관제는 [docs/elastic-monitoring.md](/Users/bagjuwon/Projects/ai_ppt/docs/elastic-monitoring.md)

## GitHub Actions CI/CD

Docker/Lightsail 방식 푸시 기반 자동 배포 파일:

- `deploy/lightsail/remote-deploy.sh`

현재 `aippt.juwonpark.me` 운영 서버는 Docker가 아니라 `systemd + Nginx + gunicorn`으로 배포되어 있습니다. 현재 운영 방식 CI/CD는 [docs/systemd-nginx-ci-cd.md](/Users/bagjuwon/Projects/ai_ppt/docs/systemd-nginx-ci-cd.md)를 기준으로 봅니다.

동작 순서:

1. GitHub Actions 가 `main` push 에서 실행
2. Django check / test, renderer typecheck 통과
3. Lightsail 서버에 SSH 접속
4. 서버에서 `git pull --ff-only origin main`
5. `deploy/lightsail/deploy.sh` 실행
6. HTTPS 기준 헬스체크 통과 시 배포 완료

### GitHub Secrets

필수:

- `LIGHTSAIL_HOST`
- `LIGHTSAIL_USER`
- `LIGHTSAIL_SSH_KEY`

권장 GitHub Variables:

- `LIGHTSAIL_PORT`
  - 기본값 `22`
- `LIGHTSAIL_APP_DIR`
  - 기본값 `/opt/ai-ppt`

### 원격 서버 전제

- `/opt/ai-ppt` 에 repo clone 되어 있어야 함
- `deploy/lightsail/app.env` 가 이미 작성되어 있어야 함
- Docker / Docker Compose 사용 가능해야 함
- 서버 로컬 변경분 없이 `git pull --ff-only` 가능한 상태 권장
