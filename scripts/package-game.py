"""Package the tested static game and editable source, excluding caches/credentials."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json
root=Path(__file__).resolve().parents[1]
out=root/'releases/Veilbreak-Game.zip';out.parent.mkdir(exist_ok=True)
assert (root/'web-build/index.html').exists(),'Run npm run build:web first'
source_files=['package.json','package-lock.json','tsconfig.json','next-env.d.ts','next.config.ts','vite.config.mjs','postcss.config.mjs','eslint.config.mjs','drizzle.config.json','README.md','ASSETS.md','.gitignore']
source_dirs=['src','public','scripts','tests','portable','desktop']
with ZipFile(out,'w',ZIP_DEFLATED,compresslevel=6) as z:
 if (root/'Veilbreak-Phone.html').exists():z.write(root/'Veilbreak-Phone.html','Veilbreak-Phone.html')
 for p in sorted((root/'web-build').rglob('*')):
  if p.is_file():z.write(p,'web/'+p.relative_to(root/'web-build').as_posix())
 z.write(root/'scripts/serve-web.cjs','serve-web.cjs')
 z.write(root/'portable/PLAY-WINDOWS.bat','PLAY-WINDOWS.bat')
 z.write(root/'portable/START-HERE.txt','START-HERE.txt')
 for name in source_files:z.write(root/name,'source/'+name)
 for directory in source_dirs:
  for p in sorted((root/directory).rglob('*')):
   if p.is_file() and not any(x in p.parts for x in ['node_modules','release','__pycache__']):z.write(p,'source/'+p.relative_to(root).as_posix())
with ZipFile(out) as z:
 assert z.testzip() is None
 assert {'web/index.html','PLAY-WINDOWS.bat','START-HERE.txt','source/desktop/package.json'}.issubset(z.namelist())
 print(f'PASS ZIP: {len(z.namelist())} files; {out.stat().st_size/1024/1024:.2f} MiB; {out}')
