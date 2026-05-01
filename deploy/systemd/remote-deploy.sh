#!/usr/bin/env sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

SERVICE_NAME="${AIPPT_SERVICE_NAME:-aippt}"
HEALTH_URL="${AIPPT_HEALTH_URL:-http://127.0.0.1:8020/healthz/}"

if [ ! -f .env ]; then
  echo "Missing .env. Create ${ROOT_DIR}/.env on the server first."
  exit 1
fi

git fetch origin main
git pull --ff-only origin main

if [ ! -d .venv ]; then
  python3 -m venv .venv
fi

.venv/bin/python -m pip install --upgrade pip
.venv/bin/pip install -r requirements.txt

npm --prefix ppt-renderer ci

mkdir -p staticfiles media rendered-presentations user-templates

.venv/bin/python manage.py migrate --noinput
.venv/bin/python manage.py collectstatic --noinput
.venv/bin/python manage.py check

sudo -n systemctl restart "$SERVICE_NAME"

for attempt in $(seq 1 30); do
  if sudo -n systemctl is-active --quiet "$SERVICE_NAME" \
    && curl --silent --show-error --fail "$HEALTH_URL" >/dev/null; then
    echo "Healthcheck passed on attempt ${attempt}."
    break
  fi

  if [ "$attempt" -eq 30 ]; then
    sudo -n systemctl status "$SERVICE_NAME" --no-pager || true
    curl --verbose --max-time 10 "$HEALTH_URL" || true
    exit 1
  fi

  sleep 1
done

echo "Deploy complete: ${SERVICE_NAME}"
echo "Healthcheck complete: ${HEALTH_URL}"
