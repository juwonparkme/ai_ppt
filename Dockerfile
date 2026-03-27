FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends nodejs npm \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN pip install -r /app/requirements.txt

COPY ppt-renderer/package.json ppt-renderer/package-lock.json /app/ppt-renderer/
RUN npm ci --prefix /app/ppt-renderer

COPY . /app

RUN chmod +x /app/deploy/lightsail/docker-entrypoint.sh /app/deploy/lightsail/deploy.sh

EXPOSE 8000

CMD ["/app/deploy/lightsail/docker-entrypoint.sh"]
