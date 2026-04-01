#!/usr/bin/env sh
set -eu

MODE="${1:-http}"
ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
OUTPUT_PATH="$ROOT_DIR/deploy/lightsail/nginx.conf"
APP_ENV_FILE="${LIGHTSAIL_APP_ENV_FILE:-$ROOT_DIR/deploy/lightsail/app.env}"

read_env_value() {
  key="$1"
  if [ ! -f "$APP_ENV_FILE" ]; then
    return 0
  fi
  sed -n "s/^${key}=//p" "$APP_ENV_FILE" | tail -n 1
}

SERVER_NAME="${NGINX_SERVER_NAME:-$(read_env_value NGINX_SERVER_NAME)}"
SERVER_NAME="${SERVER_NAME:-_}"
CLIENT_MAX_BODY_SIZE="${NGINX_CLIENT_MAX_BODY_SIZE:-$(read_env_value NGINX_CLIENT_MAX_BODY_SIZE)}"
CLIENT_MAX_BODY_SIZE="${CLIENT_MAX_BODY_SIZE:-50m}"

case "$MODE" in
  http)
    TEMPLATE_PATH="$ROOT_DIR/deploy/lightsail/nginx.http.conf.template"
    ;;
  https)
    TEMPLATE_PATH="$ROOT_DIR/deploy/lightsail/nginx.https.conf.template"
    ;;
  *)
    echo "지원하지 않는 nginx 모드: $MODE"
    exit 1
    ;;
esac

sed \
  -e "s|__SERVER_NAME__|$SERVER_NAME|g" \
  -e "s|__CLIENT_MAX_BODY_SIZE__|$CLIENT_MAX_BODY_SIZE|g" \
  "$TEMPLATE_PATH" > "$OUTPUT_PATH"

echo "Rendered $MODE nginx config to $OUTPUT_PATH"
