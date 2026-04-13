#!/usr/bin/env sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

git fetch origin main
git pull --ff-only origin main

sh ./deploy/lightsail/deploy.sh

APP_ENV_FILE="${LIGHTSAIL_APP_ENV_FILE:-./deploy/lightsail/app.env}"

read_env_value() {
  key="$1"
  sed -n "s/^${key}=//p" "$APP_ENV_FILE" | tail -n 1
}

NGINX_SERVER_NAME="$(read_env_value NGINX_SERVER_NAME)"
NGINX_SERVER_NAME="${NGINX_SERVER_NAME:-_}"

docker compose -f docker-compose.lightsail.yml ps

if [ "$NGINX_SERVER_NAME" != "_" ]; then
  curl --silent --show-error --fail \
    --resolve "${NGINX_SERVER_NAME}:443:127.0.0.1" \
    "https://${NGINX_SERVER_NAME}/healthz/" >/dev/null
else
  curl --silent --show-error --fail http://127.0.0.1/healthz/ >/dev/null
fi

echo "원격 배포 및 헬스체크 완료"
