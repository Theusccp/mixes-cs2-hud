#!/usr/bin/env python3
"""Build an isolated Echo observer test; the regular Echo/MixES stays untouched."""
from pathlib import Path
import hashlib
import json
import os
import shutil
import zipfile

ROOT=Path(__file__).resolve().parents[1]
BUILD=ROOT/'dist'/'echo-spec-source'
OUTPUT=ROOT/'dist'/'Echo-TheMask-AutoSpec-TESTE-v0.1.zip'

def main():
    if BUILD.exists():shutil.rmtree(BUILD)
    shutil.copytree(ROOT/'hud',BUILD)
    assets=BUILD/'assets'
    for name in ['auto-spec-client.js','echo-spec.js','themask-photos.js','themask-state.js','themask-logo-256.webp']:
        shutil.copy2(ROOT/'themask'/'assets'/name,assets/name)
    shutil.copytree(ROOT/'themask'/'assistente',BUILD/'assistente',ignore=shutil.ignore_patterns('cache'))
    (BUILD/'cfg').mkdir(exist_ok=True)
    shutil.copy2(ROOT/'themask'/'cfg'/'themaskobserver.cfg',BUILD/'cfg'/'themaskobserver.cfg')
    bundle=assets/'index-7d7a885a.js'
    source=bundle.read_text()
    source="import { installEchoSpec } from './echo-spec.js';\n"+source
    source+='\ninstallEchoSpec({game:W,actions:q3,config:Y2,api:L1,apiBase:gn});\n'
    bundle.write_text(source)
    extension=assets/'mixes-custom.js'
    text=extension.read_text().replace('#F51B95','#2B93E0').replace('#65D4F5','#E4AE35').replace('./mixes-logo.png','./themask-logo-256.webp')
    text=text.replace('logo.alt = "MixES"','logo.alt = "TheMask"')
    extension.write_text(text)
    css=assets/'mixes-custom.css'
    css.write_text(css.read_text().replace('#F51B95','#2B93E0').replace('#65D4F5','#E4AE35')+'''\n/* Echo AutoSpec test: prominent statistics and non-interactive broadcast. */
.scoreboard { transform: scale(1.08); transform-origin: top left; }
.mvp { transform: scale(1.2); transform-origin: top right; }
.mvp .mvp-content .mvp-avatar { width: 245px; height: 252px; }
.mvp .mvp-content .mvp-name { font-size: 49px; max-width: 210px; overflow: hidden; text-overflow: ellipsis; }
html, body, #root, #root * { cursor: none; pointer-events: none; user-select: none; }
''')
    manifest=json.loads((BUILD/'hud.json').read_text())
    manifest.update(name='TheMask — Echo AutoSpec TESTE',version='0.1.0-autospec',author='TheMask | Base Echo/cshuds.com')
    (BUILD/'hud.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    panel=json.loads((BUILD/'panel.json').read_text())
    for section in panel:section['label']=section['label'].replace('MixES','TheMask')
    panel.insert(0,{'label':'AutoSpec — Teste de espectador','name':'autospec_settings','inputs':[
        {'type':'action','name':'autospec_controls','label':'Diretor automático','values':[
            {'name':'autoSpecOn','label':'Ativar cortes automáticos'},
            {'name':'autoSpecOff','label':'Manual / parar automático'},
            {'name':'autoSpecPreview','label':'Simular decisões sem trocar a câmera'}]},
        {'type':'checkbox','name':'native_slots','label':'Usar slots nativos (somente SEM remapeamento no Spectator Binds)'}]})
    (BUILD/'panel.json').write_text(json.dumps(panel,ensure_ascii=False,indent=2)+'\n')
    keys=json.loads((BUILD/'keybinds.json').read_text())
    keys += [{'bind':'Alt+Shift+A','action':'autoSpecToggle'},{'bind':'Alt+Shift+M','action':'autoSpecOff'},{'bind':'Alt+Shift+D','action':'autoSpecPreview'}]
    (BUILD/'keybinds.json').write_text(json.dumps(keys,indent=2)+'\n')
    shutil.copy2(ROOT/'docs'/'ECHO-AUTOSPEC-LEIA-ME.txt',BUILD/'LEIA-ME-AUTOSPEC.txt')
    temporary=OUTPUT.with_suffix('.zip.tmp')
    try:
        with open(temporary,'wb') as target:
            with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED) as archive:
                for file in sorted(BUILD.rglob('*')):
                    if file.is_file() and not any(p.startswith('.') for p in file.relative_to(BUILD).parts):archive.write(file,file.relative_to(BUILD).as_posix())
            target.flush();os.fsync(target.fileno())
        with zipfile.ZipFile(temporary) as archive:
            assert archive.testzip() is None
            for name in archive.namelist():assert archive.read(name)==(BUILD/name).read_bytes(),name
        os.replace(temporary,OUTPUT)
    finally:temporary.unlink(missing_ok=True)
    print(OUTPUT)
    print(OUTPUT.stat().st_size,hashlib.sha256(OUTPUT.read_bytes()).hexdigest())

if __name__=='__main__':main()
