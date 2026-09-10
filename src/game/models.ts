import * as THREE from 'three';

// Roles map to public/models/<file>.glb built by scripts/build-models.mjs.
// Soldier/robot also have higher-fidelity animated web alternates that are
// streamed from a CDN when online (quality High/Ultra + webModels enabled).
export type ModelRole =
  | 'soldier'
  | 'robot'
  | 'drone'
  | 'hunter'
  | 'target'
  | 'rifle'
  | 'pistol'
  | 'heavy'
  | 'tree'
  | 'crawler';

type ManifestEntry = {
  file: string;
  cdn?: string[];
  height?: number; // normalize streamed web models to this height (meters)
};

const MANIFEST: Record<ModelRole, ManifestEntry> = {
  soldier: {
    file: 'soldier.glb',
    cdn: [
      'https://cdn.jsdelivr.net/npm/three@0.186.0/examples/models/gltf/Soldier.glb',
      'https://unpkg.com/three@0.186.0/examples/models/gltf/Soldier.glb',
    ],
    height: 1.82,
  },
  robot: {
    file: 'robot.glb',
    cdn: [
      'https://cdn.jsdelivr.net/npm/three@0.186.0/examples/models/gltf/Xbot.glb',
      'https://unpkg.com/three@0.186.0/examples/models/gltf/Xbot.glb',
    ],
    height: 2.1,
  },
  drone: { file: 'drone.glb' },
  hunter: { file: 'hunter.glb' },
  target: { file: 'target.glb' },
  rifle: { file: 'rifle.glb' },
  pistol: { file: 'pistol.glb' },
  heavy: { file: 'heavy.glb' },
  tree: { file: 'tree.glb' },
  crawler: { file: 'crawler.glb' },
};

export type ModelInstance = {
  object: THREE.Group;
  rig: Record<string, THREE.Object3D>;
  mixer: THREE.AnimationMixer | null;
  clips: THREE.AnimationClip[];
  web: boolean;
};

type Cached = {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
  skinned: boolean;
};

// Heads-up-display rig node names authored by scripts/build-models.mjs.
const RIG_NODES = [
  'ArmL',
  'ArmR',
  'LegL',
  'LegR',
  'Rotor1',
  'Rotor2',
  'Rotor3',
  'Rotor4',
  'Wheel1',
  'Wheel2',
  'Wheel3',
  'Wheel4',
  'Wheel5',
  'Wheel6',
];

export function visorColor(friendly: boolean, type: string): number {
  if (friendly) return 0x54f2d6;
  if (type === 'elite') return 0xffc35a;
  if (type === 'boss') return 0xff2d55;
  return 0xff4a3d;
}

export class ModelManager {
  private cache = new Map<string, Cached>();
  private loader: { load: Function } | null = null;
  private skeletonClone: ((o: THREE.Object3D) => THREE.Object3D) | null = null;
  private loading = new Map<string, Promise<Cached | null>>();
  destroyed = false;

  // False in unit tests / SSR — engine then stays on procedural fallback.
  static supported(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof document !== 'undefined' &&
      typeof document.createElement === 'function' &&
      typeof fetch === 'function'
    );
  }

  private async getLoader(): Promise<{ load: Function }> {
    if (!this.loader) {
      const mod = await import('three/addons/loaders/GLTFLoader.js');
      this.loader = new mod.GLTFLoader();
    }
    return this.loader;
  }

  private async getSkeletonClone(): Promise<(o: THREE.Object3D) => THREE.Object3D> {
    if (!this.skeletonClone) {
      const mod = await import('three/addons/utils/SkeletonUtils.js');
      this.skeletonClone = mod.clone;
    }
    return this.skeletonClone;
  }

  private attempt(url: string, timeoutMs: number): Promise<Cached | null> {
    return this.getLoader().then(
      (loader) =>
        new Promise<Cached | null>((resolve) => {
          let done = false;
          const timer = setTimeout(() => {
            if (!done) {
              done = true;
              resolve(null);
            }
          }, timeoutMs);
          try {
            loader.load(
              url,
              (gltf: { scene: THREE.Group; animations: THREE.AnimationClip[] }) => {
                if (done) return;
                done = true;
                clearTimeout(timer);
                let skinned = false;
                gltf.scene.traverse((o: THREE.Object3D) => {
                  if ((o as THREE.SkinnedMesh).isSkinnedMesh) skinned = true;
                });
                resolve({ scene: gltf.scene, animations: gltf.animations || [], skinned });
              },
              undefined,
              () => {
                if (done) return;
                done = true;
                clearTimeout(timer);
                resolve(null);
              },
            );
          } catch {
            if (!done) {
              done = true;
              clearTimeout(timer);
              resolve(null);
            }
          }
        }),
    );
  }

  private fetchCached(url: string, timeoutMs: number): Promise<Cached | null> {
    const hit = this.cache.get(url);
    if (hit) return Promise.resolve(hit);
    const pending = this.loading.get(url);
    if (pending) return pending;
    const job = this.attempt(url, timeoutMs)
      .then((entry) => {
        this.loading.delete(url);
        if (entry && !this.destroyed) this.cache.set(url, entry);
        return this.destroyed ? null : entry;
      })
      .catch(() => {
        this.loading.delete(url);
        return null;
      });
    this.loading.set(url, job);
    return job;
  }

  // Standalone single-file mode: GLB bytes embedded as base64 on
  // globalThis.__VEIL_MODELS__ by the offline build (file:// can't fetch).
  private parseEmbedded(file: string): Promise<Cached | null> {
    const store = (globalThis as Record<string, unknown>).__VEIL_MODELS__ as
      | Record<string, string>
      | undefined;
    const b64 = store?.[file];
    if (!b64) return Promise.resolve(null);
    const key = `embedded:${file}`;
    const hit = this.cache.get(key);
    if (hit) return Promise.resolve(hit);
    const pending = this.loading.get(key);
    if (pending) return pending;
    const job = this.getLoader()
      .then(
        (loader) =>
          new Promise<Cached | null>((resolve) => {
            try {
              const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
              (loader as unknown as { parse: Function }).parse(
                bin.buffer as ArrayBuffer,
                '',
                (gltf: { scene: THREE.Group; animations: THREE.AnimationClip[] }) => {
                  let skinned = false;
                  gltf.scene.traverse((o: THREE.Object3D) => {
                    if ((o as THREE.SkinnedMesh).isSkinnedMesh) skinned = true;
                  });
                  resolve({
                    scene: gltf.scene,
                    animations: gltf.animations || [],
                    skinned,
                  });
                },
                () => resolve(null),
              );
            } catch {
              resolve(null);
            }
          }),
      )
      .then((entry) => {
        this.loading.delete(key);
        if (entry && !this.destroyed) this.cache.set(key, entry);
        return this.destroyed ? null : entry;
      })
      .catch(() => {
        this.loading.delete(key);
        return null;
      });
    this.loading.set(key, job);
    return job;
  }

  // Ground + normalize a streamed model so any humanoid fits the game rig.
  private normalize(entry: Cached, height: number): void {
    const box = new THREE.Box3().setFromObject(entry.scene);
    const size = box.getSize(new THREE.Vector3());
    if (!Number.isFinite(size.y) || size.y <= 0.01) return;
    const s = height / size.y;
    entry.scene.scale.setScalar(s);
    entry.scene.updateMatrixWorld(true);
    const grounded = new THREE.Box3().setFromObject(entry.scene);
    const center = grounded.getCenter(new THREE.Vector3());
    entry.scene.position.x -= center.x;
    entry.scene.position.z -= center.z;
    entry.scene.position.y -= grounded.min.y;
    entry.scene.updateMatrixWorld(true);
  }

  private async instantiate(entry: Cached): Promise<THREE.Group> {
    let obj: THREE.Object3D;
    if (entry.skinned) {
      const clone = await this.getSkeletonClone();
      obj = clone(entry.scene);
    } else {
      obj = entry.scene.clone(true);
    }
    // Deep-copy geometry/material so engine dispose() never touches the cache.
    obj.traverse((o) => {
      const m = o as THREE.Mesh;
      if ((m as THREE.Mesh).isMesh) {
        m.geometry = m.geometry.clone();
        const mat = m.material as THREE.Material | THREE.Material[];
        m.material = Array.isArray(mat) ? mat.map((x) => x.clone()) : mat.clone();
        m.castShadow = true;
      }
    });
    obj.updateMatrixWorld(true);
    return obj as THREE.Group;
  }

  collectRig(obj: THREE.Object3D): Record<string, THREE.Object3D> {
    const rig: Record<string, THREE.Object3D> = {};
    for (const name of RIG_NODES) {
      const node = obj.getObjectByName(name);
      if (node) {
        if (node.userData.baseX === undefined) node.userData.baseX = node.rotation.x;
        rig[name] = node;
      }
    }
    return rig;
  }

  // Local models: meshes named Head* count as headshots.
  // Streamed skinned models: one mesh + skeleton, so attach a head hitbox.
  markHeads(obj: THREE.Group, skinned: boolean): void {
    if (!skinned) {
      obj.traverse((o) => {
        if (o.name.startsWith('Head')) o.userData.head = true;
      });
      return;
    }
    const bones: THREE.Object3D[] = [];
    obj.traverse((o) => {
      if ((o as THREE.Bone).isBone && /head/i.test(o.name)) bones.push(o);
    });
    const head =
      bones.find((b) => /mixamorighead/i.test(b.name)) ||
      bones.find((b) => /^head$/i.test(b.name)) ||
      bones[0];
    if (!head) return;
    const hitbox = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 8, 8),
      new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, transparent: true }),
    );
    hitbox.name = 'HeadHitbox';
    hitbox.userData.head = true;
    head.add(hitbox);
    hitbox.updateMatrixWorld(true);
  }

  tintVisor(obj: THREE.Group, friendly: boolean, type: string): void {
    const color = visorColor(friendly, type);
    obj.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && (o.name === 'Visor' || o.name === 'HeadEye')) {
        const mat = m.material as THREE.MeshStandardMaterial;
        if (mat && (mat as THREE.MeshStandardMaterial).emissive) {
          (mat as THREE.MeshStandardMaterial).emissive = new THREE.Color(color);
          (mat as THREE.MeshStandardMaterial).color = new THREE.Color(0x1a0c0a);
        }
      }
    });
  }

  // webOnly=true → only CDN attempts (null when offline). Otherwise local GLB.
  async obtain(role: ModelRole, webOnly: boolean): Promise<ModelInstance | null> {
    if (this.destroyed || !ModelManager.supported()) return null;
    const entry = MANIFEST[role];
    try {
      if (webOnly) {
        for (const url of entry.cdn || []) {
          const cached = await this.fetchCached(url, 9000);
          if (cached && !this.destroyed) {
            if (entry.height && !cached.scene.userData.normalized) {
              cached.scene.userData.normalized = true;
              this.normalize(cached, entry.height);
            }
            const object = await this.instantiate(cached);
            this.markHeads(object, cached.skinned);
            const mixer =
              cached.animations.length > 0 ? new THREE.AnimationMixer(object) : null;
            return {
              object,
              rig: this.collectRig(object),
              mixer,
              clips: cached.animations,
              web: true,
            };
          }
        }
        return null;
      }
      const embedded = await this.parseEmbedded(entry.file);
      const cached =
        embedded ?? (await this.fetchCached(`/models/${entry.file}`, 9000));
      if (!cached || this.destroyed) return null;
      const object = await this.instantiate(cached);
      this.markHeads(object, cached.skinned);
      const mixer =
        cached.animations.length > 0 ? new THREE.AnimationMixer(object) : null;
      return {
        object,
        rig: this.collectRig(object),
        mixer,
        clips: cached.animations,
        web: false,
      };
    } catch {
      return null;
    }
  }

  dispose(): void {
    this.destroyed = true;
    this.loading.clear();
    for (const entry of this.cache.values()) {
      entry.scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry?.dispose();
          const mat = m.material as THREE.Material | THREE.Material[];
          if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
          else (mat as THREE.Material)?.dispose();
        }
      });
    }
    this.cache.clear();
    this.loader = null;
  }
}
