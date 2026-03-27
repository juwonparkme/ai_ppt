# Lightsail Deploy

`read_when`: `ai_ppt`를 AWS Lightsail 인스턴스에 Docker 기반으로 올리고, Terraform 인프라와 연결할 때.

## App Runtime

- Django 5 + Gunicorn
- Node/NPM 기반 `ppt-renderer`
- SQLite, 업로드 파일, 렌더 결과물은 Docker volume `/data` 에 저장
- Caddy가 `:80` 에서 reverse proxy + `/static/`, `/media/` 서빙

## Added Files

- `Dockerfile`
- `requirements.txt`
- `docker-compose.lightsail.yml`
- `deploy/lightsail/docker-entrypoint.sh`
- `deploy/lightsail/deploy.sh`
- `deploy/lightsail/Caddyfile`
- `deploy/lightsail/app.env.example`

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
docker compose -f docker-compose.lightsail.yml up -d --build
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
- HTTPS는 현재 미포함. Lightsail static IP + 도메인 연결 뒤 reverse proxy/TLS 추가 권장
- 앱 헬스체크 엔드포인트: `/healthz/`
