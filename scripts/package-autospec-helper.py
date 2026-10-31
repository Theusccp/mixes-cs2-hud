#!/usr/bin/env python3
"""Small assistant-only update; compatible with the existing Echo test HUD."""
from pathlib import Path
import hashlib
import os
import zipfile

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'themask'/'assistente'
OUTPUT=ROOT/'dist'/'AutoSpec-Assistente-SEM-TOOLS-v0.4.zip'

def main():
    OUTPUT.parent.mkdir(exist_ok=True)
    temporary=OUTPUT.with_suffix('.zip.tmp')
    try:
        with open(temporary,'wb') as target:
            with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED) as archive:
                for file in sorted(SOURCE.iterdir()):
                    if file.is_file() and not file.name.startswith('.'):archive.write(file,'assistente/'+file.name)
            target.flush();os.fsync(target.fileno())
        with zipfile.ZipFile(temporary) as archive:
            assert archive.testzip() is None
            for name in archive.namelist():assert archive.read(name)==(ROOT/'themask'/name).read_bytes(),name
        os.replace(temporary,OUTPUT)
    finally:temporary.unlink(missing_ok=True)
    print(OUTPUT)
    print(OUTPUT.stat().st_size,hashlib.sha256(OUTPUT.read_bytes()).hexdigest())

if __name__=='__main__':main()
