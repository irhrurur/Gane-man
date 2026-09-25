"""Package the already-built, self-contained Iron District HTML and notices."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root = Path(__file__).resolve().parent.parent
with ZipFile(root / 'Veilbreak-IronDistrict.zip', 'w', ZIP_DEFLATED, compresslevel=9) as archive:
    archive.write(root / 'Veilbreak-Phone.html', 'Veilbreak-Phone.html')
    archive.write(root / 'portable/IRON-DISTRICT-START-HERE.txt', 'START-HERE.txt')
    archive.write(root / 'ASSETS.md', 'ASSETS.md')
    archive.write(root / 'public/assets/military-sources.json', 'military-sources.json')
    for path in sorted((root / 'public/assets/licenses').iterdir()):
        if path.is_file():
            archive.write(path, 'licenses/' + path.name)
    for name in ['prepare-soldier.py', 'prepare-environments.py', 'prepare-surfaces.py', 'import-military-resources.py']:
        archive.write(root / 'scripts' / name, 'conversion-scripts/' + name)
print('Created Veilbreak-IronDistrict.zip')
