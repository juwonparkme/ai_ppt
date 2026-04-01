# Lightsail Nginx Deploy Troubleshooting

`read_when`: Lightsail 배포 중 `https://도메인` 이 안 열리거나, `deploy.sh` 가 끝났는데도 443이 안 붙을 때.

## 한 줄 요약

이번 배포는 앱 코드 문제가 아니라, 배포 스택 전환 과정에서 `Nginx 설정 생성`, `certbot 실행`, `권한`, `방화벽` 네 군데가 순서대로 막혔다.

최종적으로는 아래를 해결해서 정상화됐다.

- Caddy 제거, `Nginx + certbot` 기준으로 배포 스택 재구성
- Lightsail 방화벽에서 `443/tcp` 허용
- certbot 실행 명령 수정
- Nginx HTTPS 설정 파일 생성 로직 수정
- root 소유 인증서 폴더 때문에 Docker build 가 막히던 문제 수정

## 증상별 원인

### 1. `curl -I https://ppt.juwonpark.me` 가 바로 실패

증상:

```bash
curl: (7) Failed to connect to ppt.juwonpark.me port 443
```

원인:

- Nginx가 아직 HTTP 설정으로만 떠 있었음
- 또는 Lightsail firewall 에서 `443/tcp` 가 닫혀 있었음

확인:

```bash
curl -v --max-time 10 -H "Host: ppt.juwonpark.me" http://127.0.0.1/healthz/
```

이 응답이 `301 https://...` 면 HTTP는 정상이고, 문제는 443 쪽이다.

해결:

- Lightsail Networking 에서 `443/tcp` 를 `Anywhere` 로 열기
- Nginx 설정을 HTTPS 버전으로 다시 생성
- `web` 컨테이너 재기동

### 2. `curl http://127.0.0.1/healthz/` 가 `400`

증상:

```bash
curl: (22) The requested URL returned error: 400
```

원인:

- 앱이 죽은 게 아니라 `DJANGO_ALLOWED_HOSTS` 검사에 걸린 것
- 운영 설정이 `ppt.juwonpark.me` 기준인데, 요청은 `127.0.0.1` 로 들어왔음

확인:

```bash
curl -H "Host: ppt.juwonpark.me" http://127.0.0.1/healthz/
```

해결:

- 서버 내부 확인용 curl 도 실제 Host 헤더를 붙여서 확인

### 3. certbot 실행 때 `/bin/sh: can't open 'sh'`

증상:

```bash
/bin/sh: can't open 'sh': No such file or directory
```

원인:

- `certbot` 컨테이너는 이미 `/bin/sh` 로 시작하게 해뒀는데
- 실행 명령에서 `sh -lc ...` 를 한 번 더 붙여서 셸을 이중으로 호출함

해결:

- `deploy.sh` 에서 `certbot sh -lc ...` 를 `certbot -lc ...` 로 수정

관련 커밋:

- `d7aa192` `fix: run certbot shell command correctly`

### 4. 인증서는 발급됐는데 Nginx가 계속 HTTP 설정으로만 뜸

증상:

- `state/letsencrypt/live/ppt.juwonpark.me/fullchain.pem` 은 있음
- 그런데 `deploy/lightsail/nginx.conf` 는 여전히 `listen 80` 만 있음

원인:

- `render-nginx-config.sh https` 를 직접 실행하면 `app.env` 를 안 읽고 기본값 `_` 로 렌더했음
- 그래서 `server_name _`, `ssl_certificate /etc/letsencrypt/live/_/...` 같은 잘못된 설정이 생김

해결:

- `render-nginx-config.sh` 가 `LIGHTSAIL_APP_ENV_FILE` 또는 `deploy/lightsail/app.env` 를 직접 읽게 수정

관련 커밋:

- `e300677` `fix: load nginx deploy values from app env`

### 5. 인증서는 있는데 `deploy.sh` 가 계속 HTTP에 머묾

증상:

- `sudo ls /opt/ai-ppt/deploy/lightsail/state/letsencrypt/live/ppt.juwonpark.me/` 는 성공
- 그런데 배포 스크립트는 인증서가 없는 것처럼 동작

원인:

- 인증서 파일은 `root` 소유
- 호스트 셸에서 단순 `[ -f path ]` 로 확인하면 권한 문제 때문에 신뢰하기 어려움

해결:

- 인증서 존재 확인을 호스트가 아니라 `certbot` 컨테이너 안에서 하도록 수정

관련 커밋:

- `e300677` `fix: load nginx deploy values from app env`

### 6. `deploy.sh` 중 Docker build 가 권한 에러로 실패

증상:

```bash
failed to solve: error from sender: open /opt/ai-ppt/deploy/lightsail/state/letsencrypt/accounts: permission denied
```

원인:

- Docker build context 가 `deploy/lightsail/state/` 까지 읽으려 했음
- 그 안 인증서/account 파일이 root 소유라 `ubuntu` 가 읽지 못함

해결:

- `.dockerignore` 에 아래 추가

```text
deploy/lightsail/state/
deploy/lightsail/nginx.conf
```

관련 커밋:

- `c801ca1` `fix: exclude lightsail state from docker build context`

## 최종적으로 확인한 성공 조건

### 1. app.env 값

운영용 핵심 값:

```env
DJANGO_ALLOWED_HOSTS=ppt.juwonpark.me
DJANGO_CSRF_TRUSTED_ORIGINS=https://ppt.juwonpark.me
DJANGO_TRUST_X_FORWARDED_PROTO=true
DJANGO_USE_X_FORWARDED_HOST=true
DJANGO_SECURE_SSL_REDIRECT=true
DJANGO_SESSION_COOKIE_SECURE=true
DJANGO_CSRF_COOKIE_SECURE=true

NGINX_SERVER_NAME=ppt.juwonpark.me
LETSENCRYPT_EMAIL=hello@juwonpark.me
LETSENCRYPT_STAGING=false
```

### 2. 인증서 발급 확인

```bash
sudo ls -la /opt/ai-ppt/deploy/lightsail/state/letsencrypt/live/ppt.juwonpark.me/
```

여기서 확인할 파일:

- `fullchain.pem`
- `privkey.pem`

### 3. 최종 응답 확인

```bash
curl -I https://ppt.juwonpark.me
```

최종 성공 응답:

```bash
HTTP/2 200
server: nginx/1.27.5
```

## 다음에 같은 문제 나면 보는 순서

아래 네 줄이면 대부분 판정된다.

```bash
docker compose -f docker-compose.lightsail.yml ps
docker compose -f docker-compose.lightsail.yml logs --tail=200 web
docker compose -f docker-compose.lightsail.yml logs --tail=200 certbot
curl -I https://도메인
```

추가 확인이 필요하면:

```bash
cat /opt/ai-ppt/deploy/lightsail/nginx.conf
sudo ls -la /opt/ai-ppt/deploy/lightsail/state/letsencrypt/live/도메인/
```

## 지금 기준 결론

문제는 하나가 아니었다.  
`방화벽`, `certbot 실행 명령`, `Nginx 설정 생성`, `root 권한 인증서 파일`, `Docker build context` 가 연달아 걸렸다.

반대로 말하면, 앱 자체는 처음부터 큰 문제가 없었고, 대부분은 운영 배포 스택을 `Nginx + certbot` 으로 바꾸는 과정에서 생긴 배포/권한 문제였다.
