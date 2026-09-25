"""Reproduce the reviewed imports, without cloning repositories or accessing personal libraries.
Requires an authenticated gh CLI. Pinned Git blob IDs and SHA256 prevent silent changes.
"""
import pathlib,json,subprocess,base64,hashlib,concurrent.futures
root=pathlib.Path(__file__).resolve().parents[1]/'public/assets'
def fetch(entry):
 data=base64.b64decode(json.loads(subprocess.check_output(['gh','api',f'repos/{entry["repository"]}/git/blobs/{entry["blob"]}']))['content'])
 assert hashlib.sha256(data).hexdigest()==entry['sha256'],entry['file']
 (root/entry['file']).write_bytes(data)
 print(entry['file'])
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 list(pool.map(fetch,json.loads((root/'manifest.json').read_text())))
