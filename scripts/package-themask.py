#!/usr/bin/env python3
"""Build the independent TheMask ZIP for import into JTs HUD Manager."""
from pathlib import Path
import json
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
HUD = ROOT / 'themask'
OUTPUT = ROOT / 'dist' / 'TheMask-HUD-v1.5.zip'

def main():
    for name in ['hud.json','panel.json','keybinds.json','index.html','thumb.png',
                 'assets/themask-engine.js','assets/themask-integration.js',
                 'assets/themask-renderer.js','assets/themask-state.js',
                 'assets/themask-logo-256.webp','assets/themask-fonts.css',
                 'assets/themask-radar.js','assets/themask-radar-maps.json','assets/themask-panels.js',
                 'assets/themask-motion.js','assets/themask-photos.js',
                 'assistente/themask-helper.cjs','assistente/INICIAR-THEMASK.cmd',
                 'assistente/LEIA-ME.txt','assistente/Iniciar-TheMask.ps1','assistente/TheMask-Mouse.ps1',
                 'cfg/themaskobserver.cfg']:
        if not (HUD/name).is_file():
            raise SystemExit('Arquivo ausente: '+name)
    for path in HUD.rglob('*.json'):
        json.loads(path.read_text(encoding='utf-8'))
    for path in HUD.rglob('*'):
        if not path.is_file() or path.suffix not in ['.html','.css','.js']:
            continue
        content=path.read_text(encoding='utf-8')
        attrs=re.findall(r'(?:src|href)=["\'](\./[^"\']+)["\']',content)
        modules=re.findall(r'(?:from|import)\s*\(?["\'](\./[^"\']+)["\']',content)
        styles=re.findall(r'url\(["\']?(\./[^)"\']+)',content)
        refs=[(HUD if path.suffix=='.js' and ref.startswith('./assets/') else path.parent, ref) for ref in attrs]
        refs.extend((path.parent,ref) for ref in modules+styles)
        for parent,ref in refs:
            if not (parent/ref).is_file():
                raise SystemExit('Referência ausente: '+str(path.relative_to(HUD))+' -> '+ref)
    OUTPUT.parent.mkdir(exist_ok=True)
    with zipfile.ZipFile(OUTPUT,'w',compression=zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(HUD.rglob('*')):
            if path.is_file() and not any(part.startswith('.') for part in path.relative_to(HUD).parts) and path.relative_to(HUD).parts[:2] != ('assistente','cache'):
                archive.write(path,path.relative_to(HUD).as_posix())
    with zipfile.ZipFile(OUTPUT) as archive:
        assert archive.testzip() is None
        assert 'hud.json' in archive.namelist()
    print(OUTPUT)

if __name__=='__main__':
    main()
