#!/usr/bin/env sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

APP_ENV_FILE="${LIGHTSAIL_APP_ENV_FILE:-./deploy/lightsail/app.env}"

if [ ! -f "$APP_ENV_FILE" ]; then
  echo "${APP_ENV_FILE} 파일이 필요합니다. app.env.example 복사 후 값 채워주세요."
  exit 1
fi

mkdir -p deploy/lightsail/secrets
mkdir -p deploy/lightsail/state/letsencrypt deploy/lightsail/state/certbot-www

read_env_value() {
  key="$1"
  sed -n "s/^${key}=//p" "$APP_ENV_FILE" | tail -n 1
}

NGINX_SERVER_NAME="$(read_env_value NGINX_SERVER_NAME)"
NGINX_SERVER_NAME="${NGINX_SERVER_NAME:-_}"
LETSENCRYPT_EMAIL="$(read_env_value LETSENCRYPT_EMAIL)"
LETSENCRYPT_STAGING="$(read_env_value LETSENCRYPT_STAGING)"
NGINX_CLIENT_MAX_BODY_SIZE="$(read_env_value NGINX_CLIENT_MAX_BODY_SIZE)"
NGINX_CLIENT_MAX_BODY_SIZE="${NGINX_CLIENT_MAX_BODY_SIZE:-50m}"

CERT_PATH="deploy/lightsail/state/letsencrypt/live/${NGINX_SERVER_NAME}/fullchain.pem"

export NGINX_SERVER_NAME NGINX_CLIENT_MAX_BODY_SIZE

if [ -f "$CERT_PATH" ]; then
  ./deploy/lightsail/render-nginx-config.sh https
else
  ./deploy/lightsail/render-nginx-config.sh http
fi

env -i PATH="$PATH" HOME="$HOME" LIGHTSAIL_APP_ENV_FILE="$APP_ENV_FILE" \
  docker compose --env-file /dev/null -f docker-compose.lightsail.yml up -d --build app web

if [ "$NGINX_SERVER_NAME" != "_" ] && [ -n "$LETSENCRYPT_EMAIL" ] && [ ! -f "$CERT_PATH" ]; then
  CERTBOT_ARGS="--webroot -w /var/www/certbot -d $NGINX_SERVER_NAME --email $LETSENCRYPT_EMAIL --agree-tos --no-eff-email --non-interactive"
  if [ "${LETSENCRYPT_STAGING:-false}" = "true" ]; then
    CERTBOT_ARGS="$CERTBOT_ARGS --staging"
  fi

  env -i PATH="$PATH" HOME="$HOME" LIGHTSAIL_APP_ENV_FILE="$APP_ENV_FILE" \
    docker compose --env-file /dev/null -f docker-compose.lightsail.yml run --rm certbot -lc "certbot certonly $CERTBOT_ARGS"

  if [ -f "$CERT_PATH" ]; then
    ./deploy/lightsail/render-nginx-config.sh https
    env -i PATH="$PATH" HOME="$HOME" LIGHTSAIL_APP_ENV_FILE="$APP_ENV_FILE" \
      docker compose --env-file /dev/null -f docker-compose.lightsail.yml up -d --force-recreate web
  fi
fi

if [ "$NGINX_SERVER_NAME" != "_" ] && [ -n "$LETSENCRYPT_EMAIL" ]; then
  env -i PATH="$PATH" HOME="$HOME" LIGHTSAIL_APP_ENV_FILE="$APP_ENV_FILE" \
    docker compose --env-file /dev/null -f docker-compose.lightsail.yml up -d certbot
fi

echo "배포 완료. 헬스체크:"
echo "  curl -fsS http://127.0.0.1/healthz/"
echo "로그 보기:"
echo "  docker compose -f docker-compose.lightsail.yml logs -f"
echo "중지:"
echo "  docker compose -f docker-compose.lightsail.yml down"
