#!/usr/bin/env python3
"""Package the compiled HUD for JTs using only Python's standard library."""
from pathlib import Path
import json
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
HUD = ROOT / "hud"
OUTPUT = ROOT / "dist" / "MixES-HUD-PTBR-v3.zip"


def main():
    required = ["hud.json", "keybinds.json", "panel.json", "index.html", "thumb.png",
                "assets/mixes-custom.js", "assets/mixes-custom.css", "assets/mixes-logo.png"]
    for relative in required:
        if not (HUD / relative).is_file():
            raise SystemExit("Arquivo obrigatório ausente: " + relative)
    for path in HUD.rglob("*.json"):
        json.loads(path.read_text(encoding="utf-8"))
    for relative in re.findall(r'(?:src|href)="\./([^"?#]+)"',
                               (HUD / "index.html").read_text(encoding="utf-8")):
        if not (HUD / relative).is_file():
            raise SystemExit("Referência HTML ausente: " + relative)
    files = sorted(path for path in HUD.rglob("*") if path.is_file())
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(OUTPUT, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for path in files:
            info = zipfile.ZipInfo(path.relative_to(HUD).as_posix(), date_time=(2026, 10, 11, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, path.read_bytes())
    with zipfile.ZipFile(OUTPUT) as archive:
        if archive.testzip() is not None or "hud.json" not in archive.namelist():
            raise SystemExit("Falha na integridade do ZIP.")
    print("Pacote gerado: " + str(OUTPUT))
    print(str(len(files)) + " arquivos; hud.json na raiz; JSONs e referências HTML válidos.")


if __name__ == "__main__":
    main()
