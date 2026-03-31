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
- `deploy/lightsail/secrets/client_secret.json`
- `deploy/lightsail/secrets/credentials.json`
- `deploy/lightsail/secrets/token.json`

Google 연동을 쓰지 않으면 JSON 파일은 비워두지 말고 해당 기능 비사용 기준으로만 운영.

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
