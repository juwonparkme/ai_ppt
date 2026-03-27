#!/usr/bin/env sh
set -eu

cd /app

mkdir -p \
  "${DJANGO_STATIC_ROOT:-/data/staticfiles}" \
  "${DJANGO_MEDIA_ROOT:-/data/media}" \
  "${PPT_RENDER_OUTPUT_DIR:-/data/rendered-presentations}" \
  "${USER_TEMPLATE_STORAGE_DIR:-/data/user-templates}"

python manage.py migrate --noinput
python manage.py collectstatic --noinput

exec gunicorn new3.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers "${GUNICORN_WORKERS:-3}" \
  --timeout "${GUNICORN_TIMEOUT:-180}"
