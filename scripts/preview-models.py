"""Render orthographic preview PNGs of the generated GLB models (dev QA only)."""
import struct, json, os
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MDIR = os.path.join(ROOT, 'public', 'models')
OUT = '/tmp/model-previews'
os.makedirs(OUT, exist_ok=True)

COMP = {5120: ('b', 1), 5121: ('B', 1), 5122: ('h', 2), 5123: ('H', 2), 5125: ('I', 4), 5126: ('f', 4)}
NCOMP = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def load_glb(path):
    d = open(path, 'rb').read()
    clen, ctype = struct.unpack('<II', d[12:20])
    js = json.loads(d[20:20 + clen])
    off = 20 + clen
    blen, btype = struct.unpack('<II', d[off:off + 8])
    binary = d[off + 8:off + 8 + blen]
    return js, binary


def read_acc(js, binary, idx):
    acc = js['accessors'][idx]
    bv = js['bufferViews'][acc['bufferView']]
    boff = bv.get('byteOffset', 0) + acc.get('byteOffset', 0)
    fmt, sz = COMP[acc['componentType']]
    n = NCOMP[acc['type']]
    count = acc['count']
    stride = bv.get('byteStride', n * sz)
    out = np.zeros((count, n), dtype=np.float64)
    for i in range(count):
        o = boff + i * stride
        out[i] = struct.unpack('<' + fmt * n, binary[o:o + n * sz])
    return out


def node_matrix(js, i):
    n = js['nodes'][i]
    if 'matrix' in n:
        return np.array(n['matrix'], dtype=float).reshape(4, 4).T  # column-major
    m = np.eye(4)
    if 'scale' in n:
        m = m @ np.diag([*n['scale'], 1.0])
    if 'rotation' in n:
        x, y, z, w = n['rotation']
        r = np.array([
            [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w), 0],
            [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w), 0],
            [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y), 0],
            [0, 0, 0, 1]])
        m = m @ r
    if 'translation' in n:
        t = np.eye(4)
        t[:3, 3] = n['translation']
        m = t @ m
    return m


def mat_color(js, mi):
    try:
        c = js['materials'][mi]['pbrMetallicRoughness'].get('baseColorFactor', [0.7, 0.7, 0.7, 1])
        return tuple(int(max(0, min(1, v)) * 255) for v in c[:3])
    except Exception:
        return (150, 150, 150)


def render(name, view='front'):
    js, binary = load_glb(os.path.join(MDIR, f'{name}.glb'))
    scene = js['scenes'][js.get('scene', 0)]
    tris = []

    def walk(ni, parent):
        node = js['nodes'][ni]
        world = parent @ node_matrix(js, ni)
        if 'mesh' in node:
            mesh = js['meshes'][node['mesh']]
            for prim in mesh['primitives']:
                pos = read_acc(js, binary, prim['attributes']['POSITION'])
                idx = read_acc(js, binary, prim['indices']).astype(int).flatten() if 'indices' in prim else np.arange(len(pos))
                v = np.concatenate([pos, np.ones((len(pos), 1))], axis=1) @ world.T
                v = v[:, :3]
                col = mat_color(js, prim.get('material', 0))
                for a, b, c in idx.reshape(-1, 3):
                    tris.append((v[a], v[b], v[c], col))
        for ch in node.get('children', []):
            walk(ch, world)

    for ni in scene['nodes']:
        walk(ni, np.eye(4))

    # view projection: front=(x,y)/depth z ; side=(z,y)/depth x (for guns)
    if view == 'side':
        proj = [( (p[2], p[1]), p[0]) for tri in tris for p in [tri[0], tri[1], tri[2]]]
        pts = [[(t[0][2], t[0][1]), (t[1][2], t[1][1]), (t[2][2], t[2][1])] for t in tris]
        depths = [-(t[0][0] + t[1][0] + t[2][0]) / 3 for t in tris]
    else:
        pts = [[(t[0][0], t[0][1]), (t[1][0], t[1][1]), (t[2][0], t[2][1])] for t in tris]
        depths = [-(t[0][2] + t[1][2] + t[2][2]) / 3 for t in tris]
    cols = [t[3] for t in tris]
    order = np.argsort(depths)[::-1]
    allx = [p[0] for tri in pts for p in tri]
    ally = [p[1] for tri in pts for p in tri]
    W, H, pad = 420, 520, 30
    sx = (W - 2 * pad) / (max(allx) - min(allx) + 1e-6)
    sy = (H - 2 * pad) / (max(ally) - min(ally) + 1e-6)
    s = min(sx, sy)
    ox = (W - s * (max(allx) + min(allx)) / 1) / 2 if False else 0
    cx, cy = (max(allx) + min(allx)) / 2, (max(ally) + min(ally)) / 2
    img = Image.new('RGB', (W, H), (52, 60, 62))
    dr = ImageDraw.Draw(img)
    for i in order:
        tri = pts[i]
        col = cols[i]
        # simple lambert-ish shade by face normal
        (x1, y1), (x2, y2), (x3, y3) = tri
        shade = 1.0
        shade = min(1.0, shade)
        fill = tuple(min(255, int(c * shade + 26)) for c in col)
        mapped = [(W / 2 + (x - cx) * s, H / 2 - (y - cy) * s) for x, y in tri]
        dr.polygon(mapped, fill=fill, outline=None)
    out = os.path.join(OUT, f'{name}-{view}.png')
    img.save(out)
    print(out, f'{len(tris)} tris')


for n in ['soldier', 'robot', 'drone', 'hunter', 'target', 'tree', 'crawler']:
    render(n, 'front')
for n in ['rifle', 'pistol', 'heavy']:
    render(n, 'side')
