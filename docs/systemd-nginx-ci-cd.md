# Systemd + Nginx CI/CD

`read_when`: `aippt.juwonpark.me` 운영 서버에 GitHub Actions로 자동 배포를 붙일 때.

## 구조

- GitHub `main` push
- GitHub Actions CI 실행
- 서버의 self-hosted runner가 CD job 실행
- `/home/ubuntu/apps/ai-ppt`에서 최신 코드 pull
- Python/NPM 의존성 설치
- Django migrate / collectstatic / check
- `aippt.service` 재시작
- `/healthz/` 확인

## 서버 전제

- repo 경로: `/home/ubuntu/apps/ai-ppt`
- `.env` 경로: `/home/ubuntu/apps/ai-ppt/.env`
- gunicorn systemd 서비스: `aippt.service`
- 서비스 바인딩: `127.0.0.1:8020`
- Nginx 라우팅: `aippt.juwonpark.me -> 127.0.0.1:8020`
- 서버에 `python3`, `venv`, `npm`, `git`, `curl` 설치
- GitHub self-hosted runner: `aippt-runner`
- runner labels: `self-hosted`, `ai-ppt`, `production`

## GitHub Variables

필수 Variables:

- `AIPPT_DEPLOY_ENABLED`: `true`일 때만 배포 job 실행

권장 Variables:

- `AIPPT_APP_DIR`: 기본값 `/home/ubuntu/apps/ai-ppt`

## 서버 sudo 권한

GitHub Actions는 비대화형 SSH라서 비밀번호 입력이 불가능합니다.
`ubuntu` 사용자가 아래 명령을 비밀번호 없이 실행할 수 있어야 합니다.

```bash
sudo -n systemctl restart aippt
sudo -n systemctl is-active --quiet aippt
sudo -n systemctl status aippt --no-pager
```

실패하면 서버에서 sudoers에 최소 권한을 추가합니다.

```bash
command -v systemctl
sudo visudo -f /etc/sudoers.d/aippt-deploy
```

내용:

```sudoers
ubuntu ALL=(root) NOPASSWD: /usr/bin/systemctl restart aippt, /usr/bin/systemctl is-active --quiet aippt, /usr/bin/systemctl status aippt --no-pager
```

`command -v systemctl` 결과가 `/usr/bin/systemctl`이 아니면 sudoers의 경로도 그 값으로 맞춥니다.

## 배포 스크립트

GitHub Actions가 서버에서 실행하는 파일:

```bash
sh ./deploy/systemd/remote-deploy.sh
```

직접 테스트:

```bash
cd /home/ubuntu/apps/ai-ppt
sh ./deploy/systemd/remote-deploy.sh
```

## 배포 실패 시 확인

```bash
systemctl status aippt --no-pager
journalctl -u aippt -n 100 --no-pager
sudo nginx -t
curl -i http://127.0.0.1:8020/healthz/
curl -i http://aippt.juwonpark.me/healthz/
```
