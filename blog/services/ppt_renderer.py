from __future__ import annotations

import json
import subprocess
from pathlib import Path

from django.conf import settings


def renderer_dir() -> Path:
    return Path(settings.PPT_RENDERER_DIR)


def parse_renderer_stdout(stdout: str) -> dict:
    decoder = json.JSONDecoder()
    for index in range(len(stdout) - 1, -1, -1):
        if stdout[index] != "{":
            continue
        try:
            payload, _ = decoder.raw_decode(stdout[index:])
        except json.JSONDecodeError:
            continue
        if isinstance(payload, dict):
            return payload
    raise ValueError("Renderer stdout 에서 JSON 결과를 찾지 못했습니다.")


def render_presentation(spec: dict, output_dir: Path, output_name: str) -> dict:
    output_dir.mkdir(parents=True, exist_ok=True)
    input_path = output_dir / "spec.json"
    output_path = output_dir / output_name

    input_path.write_text(json.dumps(spec, ensure_ascii=False, indent=2), encoding="utf-8")

    command = [
        "npm",
        "run",
        "--silent",
        "render",
        "--",
        "--input",
        str(input_path),
        "--output",
        str(output_path),
    ]
    completed = subprocess.run(
        command,
        cwd=renderer_dir(),
        check=True,
        capture_output=True,
        text=True,
    )
    return parse_renderer_stdout(completed.stdout)
