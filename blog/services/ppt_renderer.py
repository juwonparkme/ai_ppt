from __future__ import annotations

import json
import subprocess
from pathlib import Path

from django.conf import settings


def renderer_dir() -> Path:
    return Path(settings.PPT_RENDERER_DIR)


def render_presentation(spec: dict, output_dir: Path, output_name: str) -> dict:
    output_dir.mkdir(parents=True, exist_ok=True)
    input_path = output_dir / "spec.json"
    output_path = output_dir / output_name

    input_path.write_text(json.dumps(spec, ensure_ascii=False, indent=2), encoding="utf-8")

    command = [
        "npm",
        "run",
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
    return json.loads(completed.stdout)
