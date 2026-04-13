# Elastic Stack 모니터링

`read_when`: `ai_ppt` 운영 서버에 Nginx 로그 관제를 붙일 때.

## 목적

- Nginx access / error 로그를 쌓는다
- Filebeat 가 로그를 Elasticsearch 로 보낸다
- Kibana 에서 상태 코드, 느린 요청, 반복 에러 URL 을 본다

## 구성

- `nginx`
  - JSON access log
  - 일반 error log
- `filebeat`
  - `/var/log/nginx/access.log`
  - `/var/log/nginx/error.log`
  - Elasticsearch 전송
- `elasticsearch`
  - 로그 저장
- `kibana`
  - 검색 / 대시보드

흐름:

```text
Nginx -> Filebeat -> Elasticsearch -> Kibana
```

## 추가된 파일

- `docker-compose.monitoring.yml`
- `deploy/lightsail/filebeat.yml`

## app.env

`deploy/lightsail/app.env` 에 아래 값 추가:

```env
ENABLE_ELASTIC_MONITORING=true
```

## 배포

기존과 동일:

```bash
cd /opt/ai-ppt
git pull origin main
sh ./deploy/lightsail/deploy.sh
```

`ENABLE_ELASTIC_MONITORING=true` 이면 아래 컨테이너도 같이 뜬다:

- `elasticsearch`
- `kibana`
- `filebeat`

## 접속

보안상 Kibana / Elasticsearch 는 서버 로컬 바인딩만 한다.

- Elasticsearch: `127.0.0.1:9200`
- Kibana: `127.0.0.1:5601`

로컬 맥에서 Kibana 보기:

```bash
ssh -L 5601:127.0.0.1:5601 ubuntu@<lightsail-ip>
```

그 다음 브라우저:

- [http://127.0.0.1:5601](http://127.0.0.1:5601)

## 확인 명령

컨테이너 상태:

```bash
docker compose -f docker-compose.lightsail.yml -f docker-compose.monitoring.yml ps
```

Filebeat 로그:

```bash
docker compose -f docker-compose.lightsail.yml -f docker-compose.monitoring.yml logs -f filebeat
```

Elasticsearch 인덱스 확인:

```bash
curl http://127.0.0.1:9200/_cat/indices?v
```

Nginx 로그 파일 확인:

```bash
tail -f deploy/lightsail/state/nginx-logs/access.log
tail -f deploy/lightsail/state/nginx-logs/error.log
```

## Kibana 에서 먼저 볼 것

### access 로그

- index pattern: `ai-ppt-nginx-access-*`
- 자주 볼 필드:
  - `status`
  - `uri`
  - `request_time`
  - `remote_addr`
  - `upstream_response_time`

### error 로그

- index pattern: `ai-ppt-nginx-error-*`

## 추천 대시보드 질문

- 4xx 가 가장 많이 나는 URL 은 무엇인가
- 5xx 가 발생했는가
- `request_time` 이 큰 요청은 무엇인가
- 특정 시간대에 트래픽이 몰리는가

## 트러블슈팅

### Kibana 접속 안 됨

- `docker compose ... ps` 로 `kibana` 상태 확인
- `ssh -L 5601:127.0.0.1:5601 ...` 포트 포워딩 확인

### 로그가 안 쌓임

- `deploy/lightsail/state/nginx-logs/access.log` 생성 여부 확인
- `filebeat` 로그에서 Elasticsearch 연결 실패 확인

### 메모리 부족

- Lightsail 사양이 작으면 Elasticsearch 가 가장 먼저 부담됨
- 필요 시 `ES_JAVA_OPTS` 를 더 낮추거나, 번들 업그레이드 고려

## 운영 메모

- 이 구성은 `ai_ppt` 웹앱 앞단 Nginx 로그 관제용
- 앱 내부 Python 예외 추적까지 하려면 나중에 Sentry 같은 APM 도 병행하는 게 좋다
