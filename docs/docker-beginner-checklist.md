# Docker 처음 쓰는 사람용 체크리스트

`read_when`: 서버에 SSH 접속한 뒤, `ai_ppt`를 Docker로 처음 띄울 때.

## 먼저 이해할 것

- 이 프로젝트는 컨테이너 2개가 같이 뜬다.
- `app`
  - Django
  - Gunicorn
  - Node 기반 `ppt-renderer`
- `web`
  - Nginx
  - 브라우저 요청을 받아 `app` 으로 전달
- `certbot`
  - Let's Encrypt 인증서 발급/갱신

즉 흐름은 아래다.

```text
브라우저 -> Nginx(web) -> Django(app)
```

## 서버 접속 후 순서

아래는 Lightsail 서버에 SSH 접속한 뒤 그대로 치면 된다.

### 1. 프로젝트 폴더로 이동

```bash
cd /opt/ai-ppt
```

### 2. env 파일 만들기

```bash
cp deploy/lightsail/app.env.example deploy/lightsail/app.env
```

### 3. env 값 수정

```bash
nano deploy/lightsail/app.env
```

최소한 아래는 채워야 한다.

- `DJANGO_SECRET_KEY`
- `DJANGO_ALLOWED_HOSTS`
- `DJANGO_CSRF_TRUSTED_ORIGINS`
- `OPENAI_API_KEY`
- HTTPS를 쓸 거면 `NGINX_SERVER_NAME`, `LETSENCRYPT_EMAIL`
- 메일 기능을 쓸 거면 `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`

예시:

```env
DJANGO_SECRET_KEY=replace-with-a-long-random-string
DJANGO_DEBUG=false
DJANGO_ALLOWED_HOSTS=127.0.0.1,localhost,ppt.example.com
DJANGO_CSRF_TRUSTED_ORIGINS=https://ppt.example.com
DJANGO_TRUST_X_FORWARDED_PROTO=true
DJANGO_USE_X_FORWARDED_HOST=true
DJANGO_SECURE_SSL_REDIRECT=true
DJANGO_SESSION_COOKIE_SECURE=true
DJANGO_CSRF_COOKIE_SECURE=true
NGINX_SERVER_NAME=ppt.example.com
NGINX_CLIENT_MAX_BODY_SIZE=50m
LETSENCRYPT_EMAIL=you@example.com
LETSENCRYPT_STAGING=false

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=true
EMAIL_HOST_USER=you@example.com
EMAIL_HOST_PASSWORD=app-password
DEFAULT_FROM_EMAIL=you@example.com

OPENAI_API_KEY=sk-...
OPENAI_FILENAME_MODEL=gpt-3.5-turbo-1106
OPENAI_PRESENTATION_MODEL=gpt-4-turbo
PPT_RENDER_BACKEND=pptxgenjs
PPT_RENDERER_DIR=/app/ppt-renderer
```

## 4. Google JSON 파일 넣기

아래 경로에 넣는다.

```bash
mkdir -p deploy/lightsail/secrets
```

필요 파일:

- `deploy/lightsail/secrets/client_secret.json`
- `deploy/lightsail/secrets/credentials.json`
- `deploy/lightsail/secrets/token.json`

예시:

```bash
cp ~/client_secret.json deploy/lightsail/secrets/client_secret.json
cp ~/credentials.json deploy/lightsail/secrets/credentials.json
cp ~/token.json deploy/lightsail/secrets/token.json
```

## 5. Docker로 실행

```bash
./deploy/lightsail/deploy.sh
```

이 명령이 내부적으로 하는 일:

```bash
docker compose -f docker-compose.lightsail.yml up -d --build
```

뜻:

- `build`: 이미지 새로 만들기
- `up`: 컨테이너 실행
- `-d`: 백그라운드 실행

## 6. 정상 실행 확인

```bash
curl -fsS http://127.0.0.1/healthz/
```

정상 결과:

```json
{"status": "ok"}
```

## 7. 브라우저 확인

도메인 연결 전이면:

- `http://서버IP/`

도메인 연결 후면:

- `http://도메인/`

## 자주 쓰는 명령

상태 보기:

```bash
docker compose -f docker-compose.lightsail.yml ps
```

로그 보기:

```bash
docker compose -f docker-compose.lightsail.yml logs -f
```

중지:

```bash
docker compose -f docker-compose.lightsail.yml down
```

재시작:

```bash
docker compose -f docker-compose.lightsail.yml up -d
```

다시 빌드:

```bash
docker compose -f docker-compose.lightsail.yml up -d --build
```

## 복붙용 배포 체크리스트

```bash
cd /opt/ai-ppt
cp deploy/lightsail/app.env.example deploy/lightsail/app.env
nano deploy/lightsail/app.env
mkdir -p deploy/lightsail/secrets
# 여기로 json 3개 복사
./deploy/lightsail/deploy.sh
curl -fsS http://127.0.0.1/healthz/
docker compose -f docker-compose.lightsail.yml ps
```

## 헷갈리기 쉬운 점

- Docker 안에서 Django가 직접 80포트를 받는 게 아님
- 바깥 80/443 포트는 Nginx가 받음
- 실제 Django는 내부에서 `8000` 포트 사용
- 데이터는 컨테이너 안에만 있지 않고 Docker volume `/data` 에 남음
- `deploy.sh` 는 프로젝트 루트 `.env` 를 읽지 않게 처리돼 있어서 Compose 경고를 최대한 줄인다
- HTTPS는 `deploy.sh` 가 HTTP로 먼저 띄우고, certbot 발급 성공 후 HTTPS Nginx 설정으로 바꿔 준다

## 지금 기준 한계

- Let's Encrypt 발급은 도메인 DNS 와 80/443 포트가 열려 있어야 성공
- 방화벽 문제면 `tls-alpn-01` 이 실패하고 `http-01` 로 넘어갈 수 있음
- 운영 전에는 반드시 `curl -I https://도메인` 으로 인증서 발급 여부 확인
