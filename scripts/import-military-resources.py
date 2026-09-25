"""Fetch reviewed CC0 Poly Haven sources from a public mirror, via pinned blob IDs.
No game code or unrelated resources from the mirror are imported.
"""
import subprocess,json,base64,pathlib,concurrent.futures,hashlib,urllib.parse
repo='ayoub5550/inside-copy-';root=pathlib.Path('.cache/resource-work/polyhaven');root.mkdir(parents=True,exist_ok=True)
tree=json.loads(subprocess.check_output(['gh','api',f'repos/{repo}/git/trees/HEAD?recursive=1']))['tree'];lookup={x['path']:x for x in tree}
packs=['modular_factory_facade','concrete_road_barrier_02','Barrel_01','modular_fire_escape','modular_industrial_pipes_01','modular_chainlink_fence','utility_box_01','covered_car']
records=[]
def blob(p):
 x=lookup[p];r=json.loads(subprocess.check_output(['gh','api',f'repos/{repo}/git/blobs/{x["sha"]}']));data=base64.b64decode(r['content']);return data,dict(repository=repo,path=p,blob=x['sha'],sha256=hashlib.sha256(data).hexdigest(),bytes=len(data),license='CC0-1.0')
def load(pack):
 prefix=f'assets/ph/models/{pack}/';p=next(p for p in lookup if p.startswith(prefix) and p.endswith('_1k.gltf'));d,record=blob(p);g=json.loads(d);target=root/pack;target.mkdir(exist_ok=True);(target/'source.gltf').write_bytes(d);rows=[record]
 for item in g.get('buffers',[])+g.get('images',[]):
  uri=item.get('uri','');
  if not uri or uri.startswith('data:'):continue
  data,r=blob(prefix+urllib.parse.unquote(uri));dest=target/urllib.parse.unquote(uri);dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data);rows.append(r)
 print(pack,sum(r['bytes'] for r in rows),flush=True);return rows
with concurrent.futures.ThreadPoolExecutor(4) as pool:
 for rows in pool.map(load,packs):records+=rows
(root/'sources.json').write_text(json.dumps(records,indent=2))
