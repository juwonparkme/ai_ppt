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

env -i PATH="$PATH" HOME="$HOME" \
  LIGHTSAIL_APP_ENV_FILE="$APP_ENV_FILE" \
  docker compose --env-file /dev/null -f docker-compose.lightsail.yml up -d --build

echo "배포 완료. 헬스체크:"
echo "  curl -fsS http://127.0.0.1/healthz/"
echo "로그 보기:"
echo "  docker compose -f docker-compose.lightsail.yml logs -f"
echo "중지:"
echo "  docker compose -f docker-compose.lightsail.yml down"
