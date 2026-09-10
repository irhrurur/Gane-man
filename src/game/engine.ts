import * as THREE from "three";
import { GameAudio } from "./audio";
import {
  abilities,
  missions,
  weapons,
  type MatchConfig,
  type MatchResult,
  type Settings,
  type Weapon,
} from "./content";
import { isVictory, objectiveText, reward } from "./rules";
import { ModelManager, type ModelInstance, type ModelRole } from "./models";

export type Hud = {
  health: number;
  armor: number;
  ammo: number;
  reserve: number;
  kills: number;
  headshots: number;
  score: number;
  progress: number;
  target: number;
  time: number;
  wave: number;
  cooldown: number;
  grenades: number;
  weapon: string;
  objective: string;
  message: string;
  hit: boolean;
  hurt: boolean;
  reload: boolean;
  paused: boolean;
  interaction: string;
  abilityActive: boolean;
  radar: { x: number; z: number; friendly: boolean }[];
  player: { x: number; z: number; yaw: number };
};
type Bot = {
  group: THREE.Group;
  hp: number;
  maxHp: number;
  type: string;
  cool: number;
  phase: number;
  friendly: boolean;
  state: string;
  last: THREE.Vector3;
  dead: boolean;
  respawn: number;
  flash: THREE.Mesh;
  rig: Record<string, THREE.Object3D>;
  mixer: THREE.AnimationMixer | null;
  clips: THREE.AnimationClip[];
  clipState: string;
  currentAction: THREE.AnimationAction | null;
  moving: boolean;
  modelToken: number;
};
type Obstacle = { box: THREE.Box3; mesh: THREE.Mesh; hp: number };
type Target = { group: THREE.Group; done: boolean; progress: number };
type Effect = { mesh: THREE.Object3D; life: number; velocity?: THREE.Vector3 };
export class Engine {
  surfaceTexture?: THREE.CanvasTexture;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(78, 1, 0.1, 220);
  renderer: THREE.WebGLRenderer;
  config: MatchConfig;
  settings: Settings;
  audio = new GameAudio();
  canvas: HTMLCanvasElement;
  bots: Bot[] = [];
  obstacles: Obstacle[] = [];
  targets: Target[] = [];
  effects: Effect[] = [];
  drops: THREE.Mesh[] = [];
  keys = new Set<string>();
  yaw = 0;
  pitch = 0;
  velocityY = 0;
  ground = 1.75;
  health = 100;
  armor = 100;
  ammo = 30;
  reserve = 240;
  kills = 0;
  headshots = 0;
  score = 0;
  collected = 0;
  elapsed = 0;
  objectiveTime = 0;
  wave = 1;
  grenades = 3;
  cooldown = 0;
  abilityTime = 0;
  reloadTime = 0;
  shotTime = 0;
  hurtTime = 0;
  hitTime = 0;
  stepTime = 0;
  musicTime = 0;
  hudTime = 0;
  waveWait = 0;
  interactTime = 0;
  magazines: Record<string, number> = {};
  slideTime = 0;
  slideCooldown = 0;
  slideDirection = new THREE.Vector3();
  paused = true;
  finished = false;
  destroyed = false;
  firing = false;
  ads = false;
  dragging = false;
  bossDead = false;
  lastTime = 0;
  frame = 0;
  message = "";
  messageTime = 0;
  interaction = "";
  weapon: Weapon;
  primary: Weapon;
  gun = new THREE.Group();
  muzzle = new THREE.Mesh();
  recoil = 0;
  beacon = new THREE.Group();
  models = new ModelManager();
  isPhone = false;
  touchMove = { x: 0, z: 0 };
  touchSprint = false;
  crouchToggle = false;
  gunToken = 0;
  crawlerRig: Record<string, THREE.Object3D> = {};
  extraction = new THREE.Vector3(0, 0, 25);
  rng: () => number;
  rain?: THREE.Points;
  flashLight: THREE.PointLight;
  onHud: (h: Hud) => void;
  onFinish: (r: MatchResult) => void;
  onPause: (p: boolean) => void;
  constructor(
    canvas: HTMLCanvasElement,
    config: MatchConfig,
    settings: Settings,
    onHud: (h: Hud) => void,
    onFinish: (r: MatchResult) => void,
    onPause: (p: boolean) => void,
  ) {
    this.canvas = canvas;
    this.config = config;
    this.settings = settings;
    this.onHud = onHud;
    this.onFinish = onFinish;
    this.onPause = onPause;
    let seed = (config.mission + 1) * 5317 + config.environment.length * 99;
    this.rng = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    this.primary = {
      ...(weapons.find((w) => w.id === config.weapon) || weapons[0]),
    };
    if (config.attachments.magazine === "Extended")
      this.primary.mag = Math.round(this.primary.mag * 1.5);
    if (config.attachments.barrel === "Precision") {
      this.primary.damage += 6;
      this.primary.accuracy += 8;
    }
    if (config.attachments.stock === "Lightweight") this.primary.rate *= 0.9;
    this.weapon = this.primary;
    this.ammo = this.weapon.mag;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: settings.quality !== "Low",
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio,
        settings.quality === "Ultra" ? 2 : settings.quality === "Low" ? 1 : 1.5,
      ),
    );
    this.renderer.shadowMap.enabled = settings.quality !== "Low";
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.camera.rotation.order = "YXZ";
    this.camera.position.set(0, 1.75, 25);
    this.scene.add(this.camera);
    this.flashLight = new THREE.PointLight(0xff9b42, 0, 9);
    this.camera.add(this.flashLight);
    this.flashLight.position.set(0.3, -0.2, -1);
    this.buildMap();
    this.buildGun();
    this.spawnSquad();
    this.bind();
    this.resize();
    this.notify("ROOK: Comms check. Vanguard is on station.");
    this.frame = requestAnimationFrame(this.loop);
  }
  material(
    color: THREE.ColorRepresentation,
    roughness = 0.85,
    metalness = 0.15,
  ) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
      map: roughness > 0.5 ? (this.surfaceTexture ?? null) : null,
    });
  }
  makeSurface() {
    if (typeof document.createElement !== "function") return;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#a9aaa5";
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 10000; i++) {
      const v = Math.floor(120 + Math.random() * 100);
      ctx.fillStyle = `rgba(${v},${v},${v},.15)`;
      ctx.fillRect(
        Math.random() * 256,
        Math.random() * 256,
        1 + Math.random() * 3,
        1 + Math.random() * 3,
      );
    }
    ctx.strokeStyle = "#646c6970";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 254, 254);
    ctx.strokeStyle = "#d4dad020";
    ctx.strokeRect(4, 4, 248, 248);
    for (const x of [10, 246])
      for (const y of [10, 246]) {
        ctx.fillStyle = "#59615b";
        ctx.fillRect(x, y, 3, 3);
      }
    for (let i = 0; i < 12; i++) {
      ctx.strokeStyle = "#35403c20";
      ctx.beginPath();
      const x = Math.random() * 256,
        y = Math.random() * 256;
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.random() * 35, y + Math.random() * 20);
      ctx.stroke();
    }
    this.surfaceTexture = new THREE.CanvasTexture(canvas);
    this.surfaceTexture.wrapS = this.surfaceTexture.wrapT =
      THREE.RepeatWrapping;
    this.surfaceTexture.colorSpace = THREE.SRGBColorSpace;
    this.surfaceTexture.anisotropy = 4;
  }
  sign(text: string, x: number, y: number, z: number, color = "#cab591") {
    if (typeof document.createElement !== "function") return;
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 128;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#1b2828";
    ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 8, 128);
    ctx.font = "600 48px Arial";
    ctx.fillText(text, 29, 70);
    ctx.font = "13px monospace";
    ctx.fillText("VANGUARD // AUTHORIZED PERSONNEL ONLY", 30, 106);
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(5, 1.25),
      new THREE.MeshBasicMaterial({ map: texture }),
    );
    m.position.set(x, y, z);
    m.userData.ownedTexture = texture;
    this.scene.add(m);
  }
  box(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: THREE.ColorRepresentation,
    solid = false,
    destructible = false,
  ) {
    const geometry = new THREE.BoxGeometry(w, h, d);
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(
        i,
        uv.getX(i) * Math.max(1, Math.max(w, d) / 4),
        uv.getY(i) * Math.max(1, h / 4),
      );
    }
    const m = new THREE.Mesh(geometry, this.material(color));
    m.position.set(x, y + h / 2, z);
    m.castShadow = true;
    m.receiveShadow = true;
    this.scene.add(m);
    if (solid)
      this.obstacles.push({
        box: new THREE.Box3().setFromObject(m),
        mesh: m,
        hp: destructible ? 100 : Infinity,
      });
    return m;
  }
  glow(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: THREE.ColorRepresentation,
  ) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshBasicMaterial({ color }),
    );
    m.position.set(x, y, z);
    this.scene.add(m);
    return m;
  }
  glass(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: THREE.ColorRepresentation = 0x9fe8e0,
  ) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.15,
        metalness: 0.4,
        transparent: true,
        opacity: 0.32,
      }),
    );
    m.position.set(x, y + h / 2, z);
    this.scene.add(m);
    this.obstacles.push({
      box: new THREE.Box3().setFromObject(m),
      mesh: m,
      hp: Infinity,
    });
    return m;
  }
  buildMap() {
    this.makeSurface();
    const env = this.config.environment;
    const horror = env === "horror",
      snow = env === "snow",
      forest = env === "forest",
      desert = env === "desert",
      lab = env === "lab",
      aqua = env === "aquarium";
    const sky = horror
      ? 0x120c11
      : aqua
        ? 0x0a3542
        : snow
          ? 0x879ba6
          : desert
            ? 0x827968
            : forest
              ? 0x354a40
              : 0x3c5159;
    this.scene.background = new THREE.Color(sky);
    this.scene.fog = new THREE.FogExp2(
      sky,
      horror ? 0.035 : lab ? 0.02 : aqua ? 0.022 : 0.012,
    );
    this.scene.add(
      new THREE.HemisphereLight(
        snow ? 0xe8f7ff : aqua ? 0x9fe8e0 : 0xbbd4d2,
        0x292b26,
        horror ? 0.75 : 1.65,
      ),
    );
    const sun = new THREE.DirectionalLight(
      desert ? 0xffd19b : aqua ? 0x7fd8e8 : 0xc6e1e3,
      horror ? 0.4 : 2.5,
    );
    sun.position.set(-25, 45, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -42;
    sun.shadow.camera.right = 42;
    sun.shadow.camera.top = 42;
    sun.shadow.camera.bottom = -42;
    sun.shadow.normalBias = 0.04;
    this.scene.add(sun);
    this.box(
      0,
      -0.3,
      0,
      78,
      0.3,
      78,
      snow
        ? 0xc0cbd0
        : desert
          ? 0x777062
          : forest
            ? 0x333e32
            : aqua
              ? 0x14343c
              : 0x313b3e,
    );
    for (let i = -3; i <= 3; i++) {
      this.glow(i * 10, 0.012, 0, 0.04, 0.015, 70, 0x515a57);
      this.glow(0, 0.014, i * 10, 70, 0.015, 0.04, 0x515a57);
    }
    this.box(-36, 0, 0, 2, 8, 74, 0x424b4d, true);
    this.box(36, 0, 0, 2, 8, 74, 0x424b4d, true);
    this.box(0, 0, -36, 74, 8, 2, 0x424b4d, true);
    this.box(0, 0, 36, 74, 8, 2, 0x424b4d, true);
    const accent = horror ? 0xfb344b : aqua ? 0x54e8cf : 0xe5a76c;
    // Four connected sectors, with traversable alleys and protected flanking routes.
    for (let i = 0; i < 4; i++) {
      const x = i % 2 === 0 ? -23 : 23,
        z = i < 2 ? -21 : 7;
      if (forest) {
        for (let j = 0; j < 8; j++) {
          const tx = x + (this.rng() - 0.5) * 15,
            tz = z + (this.rng() - 0.5) * 14;
          const trunk = this.box(tx, 0, tz, 0.8, 9, 0.8, 0x484236, true);
          const crown = new THREE.Mesh(
            new THREE.ConeGeometry(3, 7, 7),
            this.material(0x243b2d),
          );
          crown.position.set(tx, 8, tz);
          this.scene.add(crown);
          this.upgradeTree(tx, tz, trunk, crown);
        }
      } else if (lab || horror) {
        this.box(x, 0, z, 12, 6, 0.7, 0x535b5d, true);
        this.box(x + (x < 0 ? -6 : 6), 0, z + 5, 0.7, 6, 10, 0x414b4e, true);
        this.box(x, 5.8, z + 5, 12, 0.25, 10, 0x3e494c);
        for (let j = 0; j < 3; j++) {
          this.box(x - 4 + j * 4, 0, z + 1.1, 2.2, 2.8, 1, 0x252e32, true);
          this.glow(
            x - 4 + j * 4,
            1.8,
            z + 1.65,
            1.5,
            0.6,
            0.04,
            horror ? 0x9c2640 : 0x56c7c3,
          );
        }
      } else if (aqua) {
        // Glass exhibit hall flanked by rock pillars and glowing coral.
        this.glass(x, 0, z, 10, 4.5, 9);
        this.box(x - 5.6, 0, z, 0.9, 7.5, 10, 0x3a4a4e, true);
        this.box(x + 5.6, 0, z, 0.9, 7.5, 10, 0x3a4a4e, true);
        this.box(x, 4.5, z, 12, 0.4, 10.5, 0x2b3a3e);
        for (let j = 0; j < 3; j++) {
          const cx = x - 3.4 + j * 3.4;
          this.box(cx, 0, z - 2.6, 1.2, 6, 1.2, 0x4a4640, true);
          const coral = new THREE.Mesh(
            new THREE.ConeGeometry(0.9, 2.2, 6),
            new THREE.MeshBasicMaterial({
              color: j % 2 ? 0xff7a9c : 0x54e8cf,
            }),
          );
          coral.position.set(cx, 1.1, z + 2.4);
          this.scene.add(coral);
          this.glow(cx, 2.7, z + 2.4, 0.5, 0.5, 0.5, j % 2 ? 0xff7a9c : 0x54e8cf);
        }
        this.glow(x, 2.2, z + 4.56, 7, 0.15, 0.1, 0x54e8cf);
        this.glow(x, 0.4, z + 4.56, 7, 0.15, 0.1, 0x2e9db0);
      } else {
        const h = desert ? 5 : 8 + this.rng() * 9;
        this.box(x, 0, z, 10, h, 12, 0x485251, true);
        this.box(x, h, z, 10.5, 0.4, 12.5, 0x2b3536);
        this.sign(
          ["07 // NOVA", "CINDER // 02", "RELAY ACCESS", "SECTOR 09"][i],
          x,
          3,
          z + 6.07,
        );
        for (const edge of [-4.9, 4.9])
          this.box(x + edge, 0, z + 6.03, 0.16, h, 0.12, 0x687570);
        this.box(x, 0, z + 6.04, 9, 0.12, 0.12, 0x73847a);
        this.box(x, h * 0.5, z + 6.04, 9, 0.13, 0.12, 0x263333);
        for (let yy = 2; yy < h - 1; yy += 3) {
          for (let xx = -1; xx <= 1; xx++)
            this.glow(
              x + xx * 2.8,
              yy,
              z + 6.02,
              1.5,
              0.55,
              0.04,
              this.rng() > 0.6 ? accent : 0x788d8a,
            );
        }
        this.box(x, 0, z + 7, 11, 1, 1.5, 0x5c6662, true);
      }
    }
    // Central courtyard cover intentionally leaves objective access open.
    const covers = [
      [-7, 14],
      [7, 14],
      [-8, -2],
      [8, -2],
      [-6, -18],
      [6, -18],
      [-27, 23],
      [27, 23],
      [0, -8],
    ];
    covers.forEach(([x, z], i) => {
      this.box(x, 0, z, 3.2, i % 3 === 0 ? 1.2 : 2, 2, 0x465350, true, true);
      this.box(x, i % 3 === 0 ? 1.2 : 2, z, 3.35, 0.08, 2.1, 0x788078);
      this.glow(x, 0.75, z + 1.03, 2.5, 0.09, 0.03, accent);
    });
    for (let i = 0; i < 32; i++) {
      const x = (this.rng() - 0.5) * 160,
        z = -45 - this.rng() * 65;
      if (Math.abs(x) < 37 && z > -37) continue;
      this.box(
        x,
        0,
        z,
        7 + this.rng() * 10,
        15 + this.rng() * 55,
        8 + this.rng() * 9,
        0x3c484b,
      );
    }
    for (const x of [-16, 16])
      for (const z of [-29, 19]) {
        this.box(x, 0, z, 0.18, 7, 0.18, 0x293639);
        this.glow(x, 6.8, z, 2, 0.1, 0.5, 0xbceae3);
        const light = new THREE.PointLight(
          horror ? 0xff233e : 0x87d4c6,
          horror ? 35 : 16,
          17,
          2,
        );
        light.position.set(x, 5, z);
        this.scene.add(light);
      }
    // Decorative vents, drainage strips, cables, rubble, and warning bollards.
    for (let i = 0; i < 35; i++) {
      const x = (this.rng() - 0.5) * 65,
        z = (this.rng() - 0.5) * 65;
      this.box(
        x,
        0.01,
        z,
        0.15 + this.rng() * 0.5,
        0.08 + this.rng() * 0.2,
        0.2 + this.rng() * 0.7,
        0x505553,
      );
    }
    for (let z = -28; z < 28; z += 5) {
      this.glow(-3.8, 0.023, z, 0.13, 0.02, 2, 0xb4b49b);
      this.glow(3.8, 0.023, z, 0.13, 0.02, 2, 0xb4b49b);
    }
    for (let i = 0; i < 8; i++) {
      this.box(-3 + i * 0.85, 0, 31, 0.15, 0.6, 0.15, 0xd0944b);
      this.glow(-3 + i * 0.85, 0.48, 31, 0.16, 0.14, 0.16, 0x20272a);
    }
    if (!desert && !lab) {
      const n = this.settings.quality === "Low" ? 300 : 900;
      const p = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        p[i * 3] = (this.rng() - 0.5) * 75;
        p[i * 3 + 1] = this.rng() * 30;
        p[i * 3 + 2] = (this.rng() - 0.5) * 75;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(p, 3));
      this.rain = new THREE.Points(
        g,
        new THREE.PointsMaterial({
          color: snow ? 0xffffff : 0xacc7ca,
          size: snow ? 0.1 : 0.035,
          transparent: true,
          opacity: 0.55,
        }),
      );
      this.scene.add(this.rain);
    }
    const positions = [
      [-14, -10],
      [14, -10],
      [0, -26],
      [23, 18],
      [-23, 18],
    ];
    if (["capture", "stealth", "sabotage"].includes(this.config.rule))
      positions
        .slice(0, this.config.target)
        .forEach(([x, z]) => this.makeTarget(x, z));
    this.sign("VANGUARD // LIVE SECTOR", 0, 4, -34.9);
    this.makeBeacon(0, 4);
    if (this.config.rule === "escort") this.beacon.position.set(0, 0, 21);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2.7, 3, 48),
      new THREE.MeshBasicMaterial({
        color: 0x72d2ac,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.65,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 0.03, 25);
    this.scene.add(ring);
    // Hidden intel has an actual score and resource reward.
    const intel = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.3),
      new THREE.MeshBasicMaterial({ color: 0x92eee0 }),
    );
    intel.position.set(-31, 0.7, -29);
    intel.userData.intel = true;
    this.scene.add(intel);
    this.drops.push(intel);
  }
  makeTarget(x: number, z: number) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 1.4, 1),
      this.material(0x27363a),
    );
    base.position.y = 0.7;
    group.add(base);
    const screen = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.55, 1.04),
      new THREE.MeshBasicMaterial({ color: 0xf3a96d }),
    );
    screen.position.y = 1;
    group.add(screen);
    const mark = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.35),
      new THREE.MeshBasicMaterial({ color: 0xffa775, wireframe: true }),
    );
    mark.position.y = 2.5;
    group.add(mark);
    this.scene.add(group);
    this.targets.push({ group, done: false, progress: 0 });
  }
  makeBeacon(x: number, z: number) {
    this.beacon.position.set(x, 0, z);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(4.8, 5, 64),
      new THREE.MeshBasicMaterial({
        color: 0x77d5c4,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.75,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.04;
    this.beacon.add(ring);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 3, 8),
      this.material(0x657c7b),
    );
    pole.position.y = 1.5;
    this.beacon.add(pole);
    const top = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.35),
      new THREE.MeshBasicMaterial({ color: 0x7afcdd }),
    );
    top.position.y = 3.2;
    this.beacon.add(top);
    this.scene.add(this.beacon);
    this.beacon.visible = [
      "domination",
      "hardpoint",
      "headquarters",
      "defense",
      "escort",
    ].includes(this.config.rule);
    if (this.config.rule === "domination") {
      for (const x of [-14, 14]) {
        const ring2 = ring.clone();
        ring2.position.set(x, 0.04, -10);
        this.scene.add(ring2);
      }
    }
    this.upgradeCrawler();
  }
  upgradeTree(
    x: number,
    z: number,
    trunk: THREE.Mesh,
    crown: THREE.Mesh,
  ) {
    if (this.destroyed || !ModelManager.supported()) return;
    const s = 0.85 + this.rng() * 0.5;
    const ry = this.rng() * Math.PI * 2;
    void this.models
      .obtain("tree", false)
      .then((entry) => {
        if (!entry || this.destroyed) return;
        entry.object.position.set(x, 0, z);
        entry.object.scale.setScalar(s);
        entry.object.rotation.y = ry;
        this.scene.add(entry.object);
        trunk.visible = false;
        this.scene.remove(crown);
        crown.geometry.dispose();
        (crown.material as THREE.Material).dispose();
      })
      .catch(() => {});
  }
  upgradeCrawler() {
    if (this.destroyed || !ModelManager.supported()) return;
    void this.models
      .obtain("crawler", false)
      .then((entry) => {
        if (!entry || this.destroyed) return;
        entry.object.rotation.y = Math.PI;
        this.beacon.add(entry.object);
        this.crawlerRig = entry.rig;
      })
      .catch(() => {});
  }
  buildGun() {
    this.camera.remove(this.gun);
    this.gun.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      if (m.material && !Array.isArray(m.material)) m.material.dispose();
    });
    this.gun = new THREE.Group();
    const part = (
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
      c: number,
    ) => {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        this.material(c, 0.35, 0.65),
      );
      m.position.set(x, y, z);
      this.gun.add(m);
      return m;
    };
    const sniper = this.weapon.id === "obelisk",
      pistol = this.weapon.id === "sidearm";
    part(0, 0, 0, 0.16, 0.18, pistol ? 0.35 : 0.72, 0x273035);
    part(0, 0.11, -0.07, 0.13, 0.035, 0.58, 0x5b6264);
    part(0, -0.16, 0.08, 0.1, 0.26, 0.15, 0x151e22);
    part(
      0,
      -0.19,
      -0.15,
      0.12,
      this.config.attachments.magazine === "Extended" ? 0.38 : 0.25,
      0.2,
      0x384449,
    );
    part(0, -0.02, 0.4, 0.17, 0.19, 0.24, 0x222e33);
    part(0, 0.01, -0.52, 0.065, 0.065, sniper ? 0.75 : 0.4, 0x1d282d);
    part(0, 0.015, -0.31, 0.18, 0.16, 0.3, 0x424f51);
    for (let i = 0; i < 5; i++)
      part(0.094, 0.03, -0.2 - i * 0.05, 0.012, 0.07, 0.018, 0x111819);
    part(0.087, 0.02, 0.04, 0.01, 0.035, 0.14, 0xe49764);
    const optic = this.config.attachments.optic;
    if (optic === "Scope" || sniper) {
      const s = new THREE.Mesh(
        new THREE.CylinderGeometry(0.065, 0.065, 0.3, 12, 1, true),
        this.material(0x182528),
      );
      s.rotation.x = Math.PI / 2;
      s.position.set(0, 0.2, -0.05);
      this.gun.add(s);
    } else {
      part(-0.052, 0.19, -0.09, 0.018, 0.12, 0.05, 0x1b272a);
      part(0.052, 0.19, -0.09, 0.018, 0.12, 0.05, 0x1b272a);
      part(0, 0.25, -0.09, 0.11, 0.016, 0.05, 0x1b272a);
      part(0, 0.13, -0.09, 0.11, 0.016, 0.05, 0x1b272a);
      const lens = new THREE.Mesh(
        new THREE.PlaneGeometry(0.087, 0.105),
        new THREE.MeshBasicMaterial({
          color: 0x89dbc5,
          transparent: true,
          opacity: 0.1,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      lens.position.set(0, 0.19, -0.065);
      this.gun.add(lens);
    }
    if (this.config.attachments.barrel === "Suppressed")
      part(0, 0.01, -0.79, 0.11, 0.11, 0.25, 0x252f33);
    // Gloved hands and armored forearms.
    part(0.06, -0.21, 0.23, 0.16, 0.17, 0.28, 0x495a54);
    part(-0.07, -0.16, -0.3, 0.14, 0.15, 0.22, 0x495a54);
    part(0.14, -0.32, 0.43, 0.2, 0.2, 0.4, 0x222e30);
    this.muzzle = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.4, 7),
      new THREE.MeshBasicMaterial({
        color: 0xffcb7a,
        transparent: true,
        opacity: 0.9,
      }),
    );
    this.muzzle.rotation.x = -Math.PI / 2;
    this.muzzle.position.set(0, 0, sniper ? -1 : -0.8);
    this.muzzle.visible = false;
    this.gun.add(this.muzzle);
    this.gun.position.set(0.32, -0.31, -0.58);
    this.camera.add(this.gun);
    this.upgradeGunVisual();
  }
  gunRole(): ModelRole {
    return this.weapon.id === "sidearm"
      ? "pistol"
      : this.weapon.id === "obelisk" ||
          this.weapon.id === "atlas" ||
          this.weapon.id === "breach"
        ? "heavy"
        : "rifle";
  }
  upgradeGunVisual() {
    if (this.destroyed || !ModelManager.supported()) return;
    const token = ++this.gunToken;
    const gun = this.gun;
    const role = this.gunRole();
    void this.models
      .obtain(role, false)
      .then((entry) => {
        if (!entry || this.destroyed) return;
        if (token !== this.gunToken || this.gun !== gun) return;
        for (const child of [...gun.children]) {
          if (child === this.muzzle) continue;
          gun.remove(child);
          child.traverse((o) => {
            const m = o as THREE.Mesh;
            m.geometry?.dispose();
            if (m.material && !Array.isArray(m.material)) m.material.dispose();
          });
        }
        gun.add(entry.object);
        const bounds = new THREE.Box3().setFromObject(entry.object);
        this.muzzle.position.set(0, 0.01, bounds.min.z - 0.06);
        this.dressGun();
      })
      .catch(() => {});
  }
  dressGun() {
    // Attachment visuals sized for the GLB viewmodels (forward = -Z).
    const optic = this.config.attachments.optic;
    const sniper = this.weapon.id === "obelisk";
    if (optic === "Scope" || sniper) {
      const tube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.045, 0.24, 12),
        this.material(0x182528, 0.35, 0.65),
      );
      tube.rotation.x = Math.PI / 2;
      tube.position.set(0, 0.12, -0.08);
      this.gun.add(tube);
      const lens = new THREE.Mesh(
        new THREE.CircleGeometry(0.034, 12),
        new THREE.MeshBasicMaterial({ color: 0x89dbc5 }),
      );
      lens.position.set(0, 0.12, -0.205);
      lens.rotation.y = Math.PI;
      this.gun.add(lens);
    }
    if (this.config.attachments.barrel === "Suppressed") {
      const mz = this.muzzle.position.z;
      const sup = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.045, 0.22, 10),
        this.material(0x252f33, 0.5, 0.5),
      );
      sup.rotation.x = Math.PI / 2;
      sup.position.set(0, 0.01, mz - 0.04);
      this.gun.add(sup);
      this.muzzle.position.z = mz - 0.16;
    }
  }
  spawnSquad() {
    const survival =
      this.config.mode === "survival" || this.config.mode === "horror";
    const count =
      this.config.mode === "training"
        ? 5
        : this.config.rule === "duel"
          ? 3
          : survival
            ? 6
            : 8;
    for (let i = 0; i < count; i++) this.spawnBot(false, i);
    if (
      [
        "team",
        "defense",
        "escort",
        "domination",
        "hardpoint",
        "headquarters",
      ].includes(this.config.rule) ||
      this.config.mode === "survival"
    )
      for (let i = 0; i < 2; i++) this.spawnBot(true, i);
    if (this.config.rule === "boss") this.spawnBot(false, 99, "boss");
  }
  spawnBot(friendly: boolean, index: number, forceType?: string) {
    const types = [
      "rifle",
      "rifle",
      "flanker",
      "heavy",
      "sniper",
      "drone",
      "shield",
      "elite",
    ];
    const type =
      forceType ||
      (this.config.mode === "training"
        ? "target"
        : this.config.mode === "horror" || this.config.rule === "infection"
          ? "hunter"
          : types[(index + this.config.mission) % types.length]);
    const group = new THREE.Group();
    const col = friendly
      ? 0x4c8780
      : type === "boss"
        ? 0x77615a
        : type === "hunter"
          ? 0x73535b
          : 0x555b58;
    const add = (
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
      c: number,
    ) => {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        this.material(c, 0.65, 0.4),
      );
      m.position.set(x, y, z);
      m.castShadow = true;
      group.add(m);
      m.userData.head = y > 1.5;
      return m;
    };
    if (type === "drone") {
      add(0, 1.8, 0, 1, 0.3, 0.6, col);
      add(-0.65, 1.8, 0, 0.4, 0.07, 0.6, 0x283638);
      add(0.65, 1.8, 0, 0.4, 0.07, 0.6, 0x283638);
    } else {
      add(0, 1.15, 0, 0.65, 0.7, 0.35, col);
      add(0, 1.72, 0, 0.36, 0.38, 0.36, 0x273238);
      add(0, 1.74, 0.19, 0.3, 0.075, 0.025, friendly ? 0x83f9dc : 0xff7566);
      add(-0.2, 0.45, 0, 0.24, 0.8, 0.27, 0x303b3c);
      add(0.2, 0.45, 0, 0.24, 0.8, 0.27, 0x303b3c);
      add(-0.44, 1.15, 0.12, 0.2, 0.65, 0.23, col);
      add(0.44, 1.15, 0.12, 0.2, 0.65, 0.23, col);
      add(0.3, 1.05, 0.48, 0.13, 0.15, 0.6, 0x19262a);
      if (type === "shield") add(0, 1, 0.5, 0.9, 1.4, 0.12, 0x485b61);
    }
    const flash = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.1),
      new THREE.MeshBasicMaterial({ color: friendly ? 0x8affd9 : 0xff805a }),
    );
    flash.position.set(0.3, 1.08, 0.84);
    flash.visible = false;
    group.add(flash);
    if (type === "boss") group.scale.setScalar(2.5);
    let x = friendly
        ? 3 - index * 6
        : (index % 2 === 0 ? -1 : 1) * (10 + this.rng() * 20),
      z = friendly ? 22 : -12 - this.rng() * 19;
    for (let n = 0; n < 30 && this.collides(x, z, 0.6); n++) {
      x = (this.rng() - 0.5) * 60;
      z = -10 - this.rng() * 20;
    }
    group.position.set(x, 0, z);
    this.scene.add(group);
    const hp =
      type === "boss"
        ? 1100
        : type === "heavy"
          ? 180
          : type === "shield"
            ? 150
            : type === "elite"
              ? 120
              : type === "target"
                ? 45
                : 75;
    const bot: Bot = {
      group,
      hp,
      maxHp: hp,
      type,
      cool: 1 + this.rng() * 3,
      phase: this.rng() * 6,
      friendly,
      state: "patrol",
      last: this.camera.position.clone(),
      dead: false,
      respawn: 0,
      flash,
      rig: {},
      mixer: null,
      clips: [],
      clipState: "",
      currentAction: null,
      moving: false,
      modelToken: 0,
    };
    this.bots.push(bot);
    this.upgradeBotVisual(bot);
  }
  botModelRole(b: Bot): ModelRole {
    if (b.type === "drone") return "drone";
    if (b.type === "hunter") return "hunter";
    if (b.type === "boss") return "robot";
    if (b.type === "target") return "target";
    return "soldier";
  }
  upgradeBotVisual(b: Bot) {
    if (this.destroyed || !ModelManager.supported()) return;
    const token = ++b.modelToken;
    const role = this.botModelRole(b);
    void this.models
      .obtain(role, false)
      .then((entry) => {
        if (!entry || this.destroyed) return;
        if (token !== b.modelToken || !this.bots.includes(b)) return;
        this.applyBotModel(b, entry);
        // Stream higher-fidelity animated web models when online.
        if (
          this.settings.quality !== "Low" &&
          this.settings.webModels !== false
        ) {
          void this.models
            .obtain(role, true)
            .then((web) => {
              if (!web || !web.web || this.destroyed) return;
              if (token !== b.modelToken || !this.bots.includes(b)) return;
              this.applyBotModel(b, web);
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }
  applyBotModel(b: Bot, entry: ModelInstance) {
    for (const child of [...b.group.children]) {
      if (child === b.flash) continue;
      b.group.remove(child);
      child.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        if (m.material) {
          if (Array.isArray(m.material)) m.material.forEach((x) => x.dispose());
          else m.material.dispose();
        }
      });
    }
    if (b.mixer) {
      b.mixer.stopAllAction();
      b.mixer = null;
    }
    const obj = entry.object;
    // Boss groups are pre-scaled 2.5x; the mech is authored larger instead.
    obj.scale.setScalar(b.type === "boss" ? 0.8 : 1);
    this.models.tintVisor(obj, b.friendly, b.type);
    b.group.add(obj);
    if (b.type === "shield") {
      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 1.4, 0.12),
        this.material(0x485b61, 0.65, 0.4),
      );
      plate.position.set(0, 1, 0.5);
      plate.castShadow = true;
      b.group.add(plate);
    }
    if (b.type === "drone") b.flash.position.set(0, 1.8, 0.55);
    else if (b.type === "boss") b.flash.position.set(0.44, 1.1, 0.9);
    else b.flash.position.set(0.15, 1.12, 0.85);
    b.rig = entry.rig;
    b.mixer = entry.mixer;
    b.clips = entry.clips;
    b.clipState = "";
    b.currentAction = null;
  }
  playBotClip(b: Bot, kind: string) {
    if (!b.mixer) return;
    const re =
      kind === "run" ? /run|walk|sprint|jog/i : /idle|stand|pose/i;
    const clip = b.clips.find((c) => re.test(c.name)) || b.clips[0];
    if (!clip) return;
    b.clipState = kind;
    if (b.currentAction) b.currentAction.fadeOut(0.2);
    const action = b.mixer.clipAction(clip);
    b.currentAction = action;
    action.reset().fadeIn(0.2).play();
  }
  animateBot(b: Bot, dt: number) {
    const rig = b.rig;
    if (rig.LegL || rig.LegR || rig.ArmL || rig.ArmR) {
      const swing = b.moving
        ? Math.sin(b.phase * 9) * 0.55
        : Math.sin(b.phase * 2) * 0.05;
      const set = (n: string, v: number) => {
        const o = rig[n];
        if (o) o.rotation.x = (o.userData.baseX ?? 0) + v;
      };
      set("LegL", swing);
      set("LegR", -swing);
      set("ArmL", -swing * 0.7);
      set("ArmR", swing * 0.7);
    }
    for (let i = 1; i <= 4; i++) {
      const r = rig["Rotor" + i];
      if (r) r.rotation.y += dt * 28;
    }
    if (b.mixer) {
      b.mixer.update(dt);
      const want = b.moving ? "run" : "idle";
      if (want !== b.clipState) this.playBotClip(b, want);
    }
  }
  collides(x: number, z: number, r = 0.38) {
    if (Math.abs(x) > 34.7 || Math.abs(z) > 34.7) return true;
    return this.obstacles.some(
      (o) =>
        o.hp > 0 &&
        o.box.max.y > this.camera.position.y - 1.3 &&
        x + r > o.box.min.x &&
        x - r < o.box.max.x &&
        z + r > o.box.min.z &&
        z - r < o.box.max.z,
    );
  }
  botCollides(x: number, z: number) {
    return (
      Math.abs(x) > 34 ||
      Math.abs(z) > 34 ||
      this.obstacles.some(
        (o) =>
          o.hp > 0 &&
          x + 0.35 > o.box.min.x &&
          x - 0.35 < o.box.max.x &&
          z + 0.35 > o.box.min.z &&
          z - 0.35 < o.box.max.z,
      )
    );
  }
  notify(text: string) {
    this.message = text;
    this.messageTime = 6;
  }
  resume = () => {
    if (this.finished) return;
    this.paused = false;
    this.onPause(false);
    if (!this.audio.context) this.audio.start(this.settings.volume);
    try {
      const p = this.canvas.requestPointerLock();
      if (p)
        p.catch(() =>
          this.notify("Drag to look · click to fire · Esc to pause"),
        );
    } catch {
      this.notify("Drag to look · click to fire");
    }
    this.canvas.focus();
  };
  pause = () => {
    this.paused = true;
    this.firing = false;
    this.keys.clear();
    this.onPause(true);
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
  };
  resize = () => {
    const w = this.canvas.clientWidth,
      h = this.canvas.clientHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };
  keyDown = (e: KeyboardEvent) => {
    if (
      [
        "Space",
        "Tab",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
      ].includes(e.code)
    )
      e.preventDefault();
    if (e.code === "Escape") {
      if (!this.paused) this.pause();
      return;
    }
    this.keys.add(e.code);
    if (this.paused || e.repeat) return;
    if (e.code === "KeyR") this.reload();
    if (e.code === "KeyQ") this.ability();
    if (e.code === "KeyG") this.grenade();
    if (e.code === "Digit1" || e.code === "Digit2" || e.code === "Tab")
      this.switchWeapon();
    if (e.code === "KeyF") this.melee();
    if (e.code === "KeyB") this.upgrade();
    if (
      e.code === "KeyC" &&
      this.keys.has("ShiftLeft") &&
      this.slideCooldown <= 0
    ) {
      this.slideTime = 0.75;
      this.slideCooldown = 2;
      this.camera.getWorldDirection(this.slideDirection);
      this.slideDirection.y = 0;
      this.slideDirection.normalize();
    }
    if (e.code === "Space") this.tryJump();
  };
  keyUp = (e: KeyboardEvent) => this.keys.delete(e.code);
  tryJump() {
    if (this.paused || this.camera.position.y > this.ground + 0.08) return;
    this.velocityY = 6.6;
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const ahead = this.camera.position.clone().addScaledVector(dir, 1.1);
    const cover = this.obstacles.find(
      (o) =>
        o.hp > 0 &&
        o.box.max.y < 2.2 &&
        ahead.x > o.box.min.x - 0.3 &&
        ahead.x < o.box.max.x + 0.3 &&
        ahead.z > o.box.min.z - 0.3 &&
        ahead.z < o.box.max.z + 0.3,
    );
    if (cover) {
      this.camera.position.x = ahead.x;
      this.camera.position.z = ahead.z;
      this.camera.position.y = cover.box.max.y + 1.76;
      this.velocityY = 0;
    }
  }
  // Touch controls API (phones/tablets).
  setTouchMove(x: number, z: number) {
    this.touchMove.x = Math.max(-1, Math.min(1, x));
    this.touchMove.z = Math.max(-1, Math.min(1, z));
  }
  setTouchSprint(active: boolean) {
    this.touchSprint = active;
  }
  setTouchFire(active: boolean) {
    if (!this.paused) this.firing = active;
  }
  toggleAim() {
    if (!this.paused) this.ads = !this.ads;
  }
  toggleCrouch() {
    this.crouchToggle = !this.crouchToggle;
  }
  setInteract(held: boolean) {
    if (held) this.keys.add("KeyE");
    else this.keys.delete("KeyE");
  }
  addLook(dx: number, dy: number) {
    if (this.paused) return;
    const s = (0.0008 + this.settings.sensitivity * 0.000032) * 2.4;
    const k = this.ads ? 0.55 : 1;
    this.yaw -= dx * s * k;
    this.pitch = Math.max(
      -1.45,
      Math.min(1.45, this.pitch - dy * s * k),
    );
  }
  mouseMove = (e: MouseEvent) => {
    if (this.paused) return;
    if (document.pointerLockElement !== this.canvas && !this.dragging) return;
    const sensitivity = 0.0008 + this.settings.sensitivity * 0.000032;
    this.yaw -= e.movementX * sensitivity * (this.ads ? 0.55 : 1);
    this.pitch = Math.max(
      -1.45,
      Math.min(
        1.45,
        this.pitch - e.movementY * sensitivity * (this.ads ? 0.55 : 1),
      ),
    );
  };
  mouseDown = (e: MouseEvent) => {
    if (this.paused) return;
    if (e.button === 0) {
      this.firing = true;
      this.dragging = true;
    }
    if (e.button === 2) this.ads = true;
  };
  mouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      this.firing = false;
      this.dragging = false;
    }
    if (e.button === 2) this.ads = false;
  };
  contextMenu = (e: Event) => e.preventDefault();
  lockChange = () => {
    if (
      document.pointerLockElement !== this.canvas &&
      !this.paused &&
      !this.finished
    )
      this.pause();
  };
  blur = () => {
    if (!this.paused) this.pause();
  };
  hidden = () => {
    if (
      typeof document !== "undefined" &&
      (document as Document).hidden &&
      !this.paused
    )
      this.pause();
  };
  bind() {
    window.addEventListener("resize", this.resize);
    window.addEventListener("keydown", this.keyDown);
    window.addEventListener("keyup", this.keyUp);
    window.addEventListener("mousemove", this.mouseMove);
    this.canvas.addEventListener("mousedown", this.mouseDown);
    window.addEventListener("mouseup", this.mouseUp);
    this.canvas.addEventListener("contextmenu", this.contextMenu);
    document.addEventListener("pointerlockchange", this.lockChange);
    document.addEventListener("visibilitychange", this.hidden);
    window.addEventListener("blur", this.blur);
  }
  switchWeapon() {
    this.magazines[this.weapon.id] = this.ammo;
    this.weapon =
      this.weapon.id === this.primary.id ? { ...weapons[6] } : this.primary;
    this.ammo = this.magazines[this.weapon.id] ?? this.weapon.mag;
    this.reloadTime = 0;
    this.buildGun();
    this.audio.reload();
  }
  reload() {
    if (
      this.reloadTime > 0 ||
      this.ammo === this.weapon.mag ||
      this.reserve <= 0
    )
      return;
    this.reloadTime = this.weapon.id === "atlas" ? 2.8 : 1.65;
    this.audio.reload();
  }
  shoot() {
    if (this.shotTime > 0 || this.reloadTime > 0) return;
    if (this.ammo <= 0) {
      this.reload();
      return;
    }
    this.ammo--;
    this.shotTime =
      this.weapon.rate *
      (this.abilityTime > 0 && this.config.ability === "boost" ? 0.55 : 1);
    this.recoil = 0.085;
    this.muzzle.visible = true;
    this.flashLight.intensity = 7;
    this.audio.shoot();
    if (this.settings.shake) this.pitch += 0.008;
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    const spread =
      (100 - this.weapon.accuracy) * 0.00075 * (this.ads ? 0.2 : 1);
    direction.x += (Math.random() - 0.5) * spread;
    direction.y += (Math.random() - 0.5) * spread;
    direction.normalize();
    const ray = new THREE.Raycaster(
      this.camera.position,
      direction,
      0,
      this.weapon.id === "breach" ? 28 : 130,
    );
    const meshes: THREE.Object3D[] = [
      ...this.obstacles.filter((o) => o.hp > 0).map((o) => o.mesh),
      ...this.bots.filter((b) => !b.dead && !b.friendly).map((b) => b.group),
    ];
    const hit = ray.intersectObjects(meshes, true)[0];
    if (hit) {
      let parent: THREE.Object3D | null = hit.object;
      while (parent && !this.bots.some((b) => b.group === parent))
        parent = parent.parent;
      const bot = this.bots.find((b) => b.group === parent);
      if (bot) {
        const head = !!hit.object.userData.head;
        this.damageBot(
          bot,
          this.weapon.damage *
            (head ? 2.3 : 1) *
            (bot.type === "shield" ? 0.65 : 1),
          head,
        );
        this.hitTime = 0.14;
        this.audio.hit();
      } else {
        const o = this.obstacles.find((o) => o.mesh === hit.object);
        if (o && Number.isFinite(o.hp)) {
          o.hp -= this.weapon.damage;
          if (o.hp <= 0) {
            this.scene.remove(o.mesh);
            this.burst(hit.point, 0xa7b4a4, 14);
          }
        }
      }
      this.burst(hit.point, bot ? 0xff7761 : 0xffc388, 5);
    }
    const end =
      hit?.point || this.camera.position.clone().addScaledVector(direction, 90);
    this.tracer(
      this.camera.position.clone().add(new THREE.Vector3(0, -0.15, 0)),
      end,
      0xffd1a0,
    );
    const shell = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, 0.035, 0.09),
      this.material(0xb49e60),
    );
    shell.position.copy(this.camera.position);
    shell.position.y -= 0.25;
    this.scene.add(shell);
    this.effects.push({
      mesh: shell,
      life: 0.7,
      velocity: new THREE.Vector3(
        Math.cos(this.yaw) * 3,
        2,
        Math.sin(this.yaw) * 3,
      ),
    });
  }
  damageBot(bot: Bot, damage: number, head = false, credit = true) {
    if (bot.dead) return;
    bot.hp -= damage;
    bot.state = bot.hp < bot.maxHp * 0.3 ? "retreat" : "cover";
    bot.last.copy(this.camera.position);
    if (bot.hp <= 0) {
      bot.dead = true;
      bot.respawn = 3;
      bot.group.rotation.z = Math.PI / 2;
      bot.group.position.y = 0.25;
      if (bot.friendly) {
        this.notify("ROOK: Operator down! Hold E nearby to revive.");
        return;
      }
      if (credit) {
        this.kills++;
        this.score += 100;
        if (head) this.headshots++;
      }
      if (bot.type === "boss") this.bossDead = true;
      if (this.config.rule === "arsenal") {
        this.weapon = { ...weapons[this.kills % weapons.length] };
        this.ammo = this.weapon.mag;
        this.buildGun();
      }
      const drop = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.22),
        new THREE.MeshBasicMaterial({
          color: this.config.rule === "confirmed" ? 0xffb07a : 0x80c8b8,
        }),
      );
      drop.position.copy(bot.group.position);
      drop.position.y = 0.5;
      this.scene.add(drop);
      this.drops.push(drop);
      if (this.kills % 5 === 0)
        this.notify(
          [
            "ROOK: Good hit. Keep the pressure on.",
            "LYRA: Their formation is breaking.",
            "VOSS: Sector clear. Moving.",
          ][Math.floor(this.kills / 5) % 3],
        );
    }
  }
  tracer(a: THREE.Vector3, b: THREE.Vector3, color: number) {
    const geometry = new THREE.BufferGeometry().setFromPoints([a, b]);
    const line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.6 }),
    );
    this.scene.add(line);
    this.effects.push({ mesh: line, life: 0.06 });
  }
  burst(p: THREE.Vector3, color: number, n: number) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(0.055, 0.055, 0.055),
        new THREE.MeshBasicMaterial({ color }),
      );
      m.position.copy(p);
      this.scene.add(m);
      this.effects.push({
        mesh: m,
        life: 0.25 + Math.random() * 0.35,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 5,
          Math.random() * 4,
          (Math.random() - 0.5) * 5,
        ),
      });
    }
  }
  grenade() {
    if (this.grenades <= 0) return;
    this.grenades--;
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const p = this.camera.position.clone().addScaledVector(dir, 9);
    p.y = 0.7;
    this.burst(p, 0xff974b, 38);
    this.audio.explosion();
    for (const b of this.bots)
      if (!b.friendly && !b.dead && b.group.position.distanceTo(p) < 10)
        this.damageBot(b, 200 * (1 - b.group.position.distanceTo(p) / 13));
    this.notify("FRAG DETONATION · area cleared");
  }
  melee() {
    const p = this.camera.position;
    let hit = false;
    for (const b of this.bots)
      if (!b.dead && !b.friendly && b.group.position.distanceTo(p) < 3.4) {
        this.damageBot(b, 75);
        hit = true;
      }
    this.recoil = 0.3;
    this.audio.tone(80, 0.18, "triangle", 0.3);
    if (hit) this.hitTime = 0.15;
  }
  ability() {
    if (this.cooldown > 0) return;
    const ability =
      abilities.find((a) => a.id === this.config.ability) || abilities[0];
    this.cooldown = ability.cooldown;
    this.abilityTime =
      ability.id === "drone" ? 12 : ability.id === "disrupt" ? 6 : 8;
    if (ability.id === "shield") this.armor = 100;
    this.audio.tone(220, 0.5, "sine", 0.15, 880);
    this.notify(`${ability.name} ACTIVE`);
  }
  upgrade() {
    if (this.config.mode !== "survival" && this.config.mode !== "horror")
      return;
    if (this.score < 500) {
      this.notify("SUPPLY UPGRADE · requires 500 score");
      return;
    }
    this.score -= 500;
    this.health = 100;
    this.armor = 100;
    this.grenades = Math.min(6, this.grenades + 2);
    this.reserve += 120;
    this.primary.damage += 4;
    this.notify("SUPPLIES ACQUIRED · armor, ammunition, +4 weapon damage");
    this.audio.ui();
  }
  hurt(damage: number) {
    if (this.config.mode === "training" || this.finished) return;
    damage *=
      this.config.difficulty === "Recruit"
        ? 0.45
        : this.config.difficulty === "Veteran"
          ? 1.3
          : this.config.difficulty === "Nightmare"
            ? 1.8
            : 0.75;
    if (this.abilityTime > 0 && this.config.ability === "shield")
      damage *= 0.25;
    const absorbed = Math.min(this.armor, damage * 0.7);
    this.armor -= absorbed;
    this.health -= damage - absorbed;
    this.hurtTime = 0.5;
    if (this.health <= 0) this.complete(false);
  }
  visible(a: THREE.Vector3, b: THREE.Vector3) {
    const delta = b.clone().sub(a);
    const ray = new THREE.Raycaster(
      a,
      delta.clone().normalize(),
      0,
      delta.length(),
    );
    return (
      ray.intersectObjects(
        this.obstacles.filter((o) => o.hp > 0).map((o) => o.mesh),
      ).length === 0
    );
  }
  updateBots(dt: number) {
    const p = this.camera.position;
    const cloak = this.abilityTime > 0 && this.config.ability === "cloak",
      frozen = this.abilityTime > 0 && this.config.ability === "disrupt";
    for (const b of this.bots) {
      if (b.dead) {
        if (b.friendly) continue;
        b.respawn -= dt;
        if (b.respawn <= 0) {
          this.scene.remove(b.group);
          b.group.traverse((o) => {
            const m = o as THREE.Mesh;
            m.geometry?.dispose();
            if (m.material && !Array.isArray(m.material)) m.material.dispose();
          });
          b.respawn = Infinity;
          const replenish =
            this.config.mode === "arena" ||
            (this.config.mode !== "survival" &&
              this.config.mode !== "horror" &&
              ([
                "defense",
                "escort",
                "infection",
                "hardpoint",
                "headquarters",
                "domination",
              ].includes(this.config.rule) ||
                ([
                  "elimination",
                  "trial",
                  "arsenal",
                  "team",
                  "ffa",
                  "confirmed",
                  "duel",
                ].includes(this.config.rule) &&
                  this.kills < this.config.target)));
          if (replenish) {
            const idx = this.bots.indexOf(b);
            this.bots.splice(idx, 1);
            this.spawnBot(false, Math.floor(this.rng() * 20));
          }
        }
        continue;
      }
      b.flash.visible = false;
      if (b.type === "target") continue;
      if (frozen && !b.friendly) continue;
      b.cool -= dt;
      b.phase += dt;
      let target = p.clone();
      let enemy: Bot | undefined;
      if (b.friendly) {
        enemy = this.bots
          .filter((x) => !x.friendly && !x.dead)
          .sort(
            (a, c) =>
              a.group.position.distanceToSquared(b.group.position) -
              c.group.position.distanceToSquared(b.group.position),
          )[0];
        target = enemy
          ? enemy.group.position.clone().add(new THREE.Vector3(0, 1.3, 0))
          : p.clone();
      } else {
        const freeForAll = this.config.rule === "ffa";
        enemy = this.bots
          .filter((x) => x !== b && !x.dead && (freeForAll || x.friendly))
          .sort(
            (a, c) =>
              a.group.position.distanceToSquared(b.group.position) -
              c.group.position.distanceToSquared(b.group.position),
          )[0];
        if (
          enemy &&
          enemy.group.position.distanceTo(b.group.position) <
            p.distanceTo(b.group.position)
        )
          target = enemy.group.position
            .clone()
            .add(new THREE.Vector3(0, 1.3, 0));
        else {
          enemy = undefined;
          if (cloak) {
            target = b.last.clone();
            b.state = "search";
          } else b.last.copy(p);
        }
      }
      const pos = b.group.position;
      const dist = pos.distanceTo(target);
      const eye = pos
        .clone()
        .add(new THREE.Vector3(0, b.type === "boss" ? 3 : 1.4, 0));
      const sees = this.visible(eye, target);
      if (!cloak && !b.friendly)
        b.state = sees
          ? b.hp < b.maxHp * 0.3
            ? "retreat"
            : dist < 12
              ? "cover"
              : "advance"
          : "flank";
      if (b.friendly && pos.distanceTo(p) > 14) target = p.clone();
      let dx = target.x - pos.x,
        dz = target.z - pos.z;
      const len = Math.hypot(dx, dz) || 1;
      dx /= len;
      dz /= len;
      if (b.state === "retreat") {
        dx *= -1;
        dz *= -1;
      } else if ((b.state === "cover" || b.type === "sniper") && dist < 24) {
        const side = Math.sin(b.phase * 0.8) > 0 ? 1 : -1;
        const t = dx;
        dx = -dz * side;
        dz = t * side;
      } else if (b.state === "flank") {
        const t = dx;
        dx = dx * 0.5 - dz * 0.85;
        dz = dz * 0.5 + t * 0.85;
      }
      const move =
        b.type === "hunter" || b.type === "flanker"
          ? 3.5
          : b.type === "boss"
            ? 1.1
            : b.type === "heavy"
              ? 1.4
              : 2.2;
      if (!(b.type === "sniper" && sees && dist > 12) && dist > 2.2) {
        const nx = pos.x + dx * move * dt,
          nz = pos.z + dz * move * dt;
        if (!this.botCollides(nx, pos.z)) pos.x = nx;
        if (!this.botCollides(pos.x, nz)) pos.z = nz;
      }
      b.group.lookAt(target.x, 0, target.z);
      if (b.type === "drone") pos.y = 0.6 + Math.sin(b.phase * 2) * 0.25;
      else pos.y = Math.sin(b.phase * 7) * 0.035;
      if (b.cool <= 0 && sees && dist < 55 && (!cloak || b.friendly)) {
        b.cool =
          b.type === "sniper"
            ? 2.4
            : b.type === "boss"
              ? 0.45
              : 0.9 + this.rng() * 0.7;
        if (b.type === "hunter") {
          if (dist < 2.8) {
            if (enemy) this.damageBot(enemy, 18, false, false);
            else this.hurt(18);
          }
          continue;
        }
        b.flash.visible = true;
        this.tracer(eye, target, b.friendly ? 0x71dec0 : 0xe97e62);
        if (enemy) {
          if (this.rng() > 0.3)
            this.damageBot(enemy, b.friendly ? 12 : 16, false, b.friendly);
        } else if (!b.friendly) {
          const moving = this.keys.has("ShiftLeft") || this.keys.has("KeyC");
          const chance = dist > 25 ? 0.25 : 0.48;
          if (
            this.rng() <
            chance *
              (moving ? 0.55 : 1) *
              (this.abilityTime > 0 && this.config.ability === "scan" ? 0.5 : 1)
          )
            this.hurt(b.type === "sniper" ? 26 : b.type === "boss" ? 18 : 11);
        }
      }
      if (
        this.abilityTime > 0 &&
        this.config.ability === "drone" &&
        !b.friendly &&
        Math.floor(this.elapsed * 5) !== Math.floor((this.elapsed - dt) * 5) &&
        dist < 28
      ) {
        this.damageBot(b, 7);
        this.tracer(p.clone().add(new THREE.Vector3(0, 2, 0)), eye, 0x65ead7);
      }
    }
  }
  updateObjectives(dt: number) {
    const p = this.camera.position;
    this.interaction = "";
    for (const b of this.bots) {
      if (b.friendly && b.dead && p.distanceTo(b.group.position) < 3) {
        this.interaction = "[ E ] HOLD TO REVIVE SQUADMATE";
        if (this.keys.has("KeyE")) {
          b.respawn -= dt;
          if (b.respawn <= 0) {
            b.dead = false;
            b.hp = b.maxHp;
            b.group.rotation.z = 0;
            b.group.position.y = 0;
            b.respawn = 3;
            this.notify("ROOK: Back in the fight. I owe you one.");
          }
        }
      }
    }
    const rule = this.config.rule;
    for (const t of this.targets) {
      if (t.done) continue;
      t.group.children[2].rotation.y += dt;
      const d = p.distanceTo(t.group.position);
      if (d < 3) {
        this.interaction =
          rule === "capture"
            ? "[ E ] Recover data core"
            : "[ E ] Hold to access terminal";
        if (this.keys.has("KeyE")) {
          t.progress += dt;
          this.interaction = `UPLINK ${Math.min(100, Math.floor((t.progress / 1.8) * 100))}%`;
          if (t.progress >= 1.8) {
            t.done = true;
            this.collected++;
            t.group.visible = false;
            this.score += 250;
            this.audio.ui();
            this.notify(
              this.collected >= this.config.target && rule === "capture"
                ? "LYRA: All cores secured. Return to the green extraction ring."
                : `OBJECTIVE SECURED · ${this.collected}/${this.config.target}`,
            );
          }
        }
      }
    }
    if (
      ["defense", "escort", "domination", "hardpoint", "headquarters"].includes(
        rule,
      )
    ) {
      if (rule === "hardpoint") {
        const n = Math.floor(this.elapsed / 25) % 3;
        this.beacon.position.set(
          n === 0 ? 0 : n === 1 ? -14 : 14,
          0,
          n === 0 ? 4 : -10,
        );
      }
      let near = p.distanceTo(this.beacon.position) < 5.5;
      if (rule === "domination")
        near =
          near ||
          p.distanceTo(new THREE.Vector3(-14, 0, -10)) < 5.5 ||
          p.distanceTo(new THREE.Vector3(14, 0, -10)) < 5.5;
      const contested = this.bots.some(
        (b) =>
          !b.friendly &&
          !b.dead &&
          b.group.position.distanceTo(this.beacon.position) < 4,
      );
      if (near) {
        this.interaction = contested
          ? "ZONE CONTESTED · eliminate hostiles"
          : "UPLINK ACTIVE · hold position";
        if (!contested) {
          this.objectiveTime += dt;
          this.score += dt * 5;
          if (rule === "escort") {
            this.beacon.position.z =
              21 - (this.objectiveTime / this.config.target) * 46;
            this.beacon.position.x =
              Math.sin(
                (this.objectiveTime / this.config.target) * Math.PI * 2,
              ) * 3;
            this.interaction = "CRAWLER ADVANCING · stay in range";
          }
        }
      } else
        this.interaction =
          rule === "escort"
            ? "REGROUP WITH THE CRAWLER"
            : "MOVE TO THE CYAN OBJECTIVE";
    }
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const drop = this.drops[i];
      drop.rotation.y += dt * 2;
      if (p.distanceTo(drop.position) < 2) {
        if (drop.userData.intel) {
          this.score += 750;
          this.grenades++;
          this.notify("HIDDEN INTEL RECOVERED · +750 score · +1 grenade");
        } else {
          if (rule === "confirmed") this.collected++;
          this.reserve += 15;
          if (this.config.mode === "horror")
            this.health = Math.min(100, this.health + 8);
        }
        this.scene.remove(drop);
        this.drops.splice(i, 1);
      }
    }
    if (this.config.mode === "survival" || this.config.mode === "horror") {
      if (this.bots.every((b) => b.friendly || b.dead)) {
        this.waveWait += dt;
        if (this.waveWait < dt * 2) {
          this.score += 300;
          this.notify(
            `WAVE ${this.wave} CLEARED · press B to resupply (500ave} CLEARED · press B to resupply (500 score)`,
          );
        }
        if (this.waveWait > 5) {
          if (!this.config.endless && this.wave >= this.config.target) {
            this.complete(true);
            return;
          }
          this.wave++;
          this.waveWait = 0;
          this.bots = this.bots.filter((b) => !b.dead);
          for (let i = 0; i < Math.min(32, 5 + this.wave * 2); i++)
            this.spawnBot(
              false,
              i,
              this.wave % 5 === 0 && i === 0 ? "boss" : undefined,
            );
          this.grenades++;
          this.notify(`WAVE ${this.wave} · CONTACTS INBOUND`);
        }
      }
    } else if (
      isVictory(rule, this.config.target, {
        kills: this.kills,
        score: this.score,
        collected: this.collected,
        elapsed: this.elapsed,
        objectiveTime: this.objectiveTime,
        bossDead: this.bossDead,
        atExtraction: p.distanceTo(this.extraction) < 4,
        playerHealth: this.health,
      })
    )
      this.complete(true);
  }
  complete(won: boolean) {
    if (this.finished) return;
    this.finished = true;
    this.paused = true;
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
    this.onFinish({
      won,
      kills: this.kills,
      headshots: this.headshots,
      xp: reward(this.kills, this.headshots, won, this.wave),
      time: Math.round(this.elapsed),
      wave: this.wave,
      mission: this.config.mission,
      mode: this.config.mode,
    });
  }
  loop = (now: number) => {
    if (this.destroyed) return;
    this.frame = requestAnimationFrame(this.loop);
    const dt = Math.min((now - (this.lastTime || now)) / 1000, 0.04);
    this.lastTime = now;
    if (!this.paused && !this.finished) {
      this.elapsed += dt;
      this.cooldown = Math.max(0, this.cooldown - dt);
      this.abilityTime = Math.max(0, this.abilityTime - dt);
      this.shotTime = Math.max(0, this.shotTime - dt);
      this.hurtTime = Math.max(0, this.hurtTime - dt);
      this.hitTime = Math.max(0, this.hitTime - dt);
      this.messageTime = Math.max(0, this.messageTime - dt);
      this.recoil = Math.max(0, this.recoil - dt * 0.8);
      if (this.reloadTime > 0) {
        this.reloadTime -= dt;
        if (this.reloadTime <= 0) {
          const n = Math.min(this.weapon.mag - this.ammo, this.reserve);
          this.ammo += n;
          this.reserve -= n;
          this.audio.reload();
        }
      }
      this.slideTime = Math.max(0, this.slideTime - dt);
      this.slideCooldown = Math.max(0, this.slideCooldown - dt);
      const crouch =
        this.keys.has("ControlLeft") ||
        this.keys.has("KeyC") ||
        this.crouchToggle ||
        this.slideTime > 0;
      let standingHeight = 0;
      for (const o of this.obstacles) {
        const p = this.camera.position;
        if (
          o.hp > 0 &&
          o.box.max.y < 2.3 &&
          p.x > o.box.min.x - 0.1 &&
          p.x < o.box.max.x + 0.1 &&
          p.z > o.box.min.z - 0.1 &&
          p.z < o.box.max.z + 0.1 &&
          p.y >= o.box.max.y + 0.85
        )
          standingHeight = Math.max(standingHeight, o.box.max.y);
      }
      this.ground = standingHeight + (crouch ? 1.05 : 1.75);
      const sprint = this.keys.has("ShiftLeft") && !this.ads;
      const boost = this.abilityTime > 0 && this.config.ability === "boost";
      const speed =
        (sprint ? 10 : crouch ? 3 : 5.5) *
        (boost ? 1.5 : 1) *
        (this.config.attachments.stock === "Lightweight" ? 1.12 : 1);
      let dx = 0,
        dz = 0;
      if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) dz -= 1;
      if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) dz += 1;
      if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) dx -= 1;
      if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) dx += 1;
      const len = Math.hypot(dx, dz) || 1;
      dx /= len;
      dz /= len;
      const mx =
          (dx * Math.cos(this.yaw) + dz * Math.sin(this.yaw)) * speed * dt,
        mz = (-dx * Math.sin(this.yaw) + dz * Math.cos(this.yaw)) * speed * dt;
      const p = this.camera.position;
      const sx = this.slideTime > 0 ? this.slideDirection.x * 13 * dt : mx,
        sz = this.slideTime > 0 ? this.slideDirection.z * 13 * dt : mz;
      if (!this.collides(p.x + sx, p.z)) p.x += sx;
      if (!this.collides(p.x, p.z + sz)) p.z += sz;
      this.velocityY -= 18 * dt;
      p.y += this.velocityY * dt;
      if (p.y < this.ground) {
        p.y = this.ground;
        this.velocityY = 0;
      }
      this.camera.rotation.set(this.pitch, this.yaw, 0);
      this.camera.fov = THREE.MathUtils.lerp(
        this.camera.fov,
        this.ads
          ? this.config.attachments.optic === "Scope"
            ? 35
            : 53
          : sprint
            ? 86
            : 78,
        dt * 12,
      );
      this.camera.updateProjectionMatrix();
      const bob =
        dx || dz
          ? Math.sin(this.elapsed * (sprint ? 15 : 10)) * 0.016
          : Math.sin(this.elapsed * 1.4) * 0.004;
      this.gun.position.lerp(
        new THREE.Vector3(
          this.ads ? 0 : 0.32,
          (this.ads ? -0.2 : -0.31) + bob,
          -0.58 + this.recoil,
        ),
        dt * 15,
      );
      this.gun.rotation.set(
        this.reloadTime > 0 ? Math.sin(this.reloadTime * 3) * 0.55 : 0,
        0,
        this.reloadTime > 0 ? -0.45 : sprint ? -0.14 : 0,
      );
      this.muzzle.visible = this.shotTime > this.weapon.rate - 0.045;
      this.flashLight.intensity = this.muzzle.visible ? 7 : 0;
      if (this.firing) this.shoot();
      if (dx || dz) {
        this.stepTime += dt;
        if (this.stepTime > (sprint ? 0.27 : 0.43)) {
          this.audio.step();
          this.stepTime = 0;
        }
      }
      if (
        this.hurtTime === 0 &&
        this.health < 100 &&
        this.config.mode !== "horror"
      )
        this.health = Math.min(100, this.health + dt * 1.8);
      this.updateBots(dt);
      this.updateObjectives(dt);
      this.musicTime += dt;
      if (this.musicTime > 1.1) {
        this.audio.music(this.bots.some((b) => b.state === "cover") ? 1 : 0);
        this.musicTime = 0;
      }
      if (
        this.elapsed > 18 &&
        this.elapsed - dt <= 18 &&
        this.config.mode === "campaign"
      )
        this.notify(missions[this.config.mission].radio);
    }
    if (this.rain && !this.paused) {
      const p = this.rain.geometry.attributes.position;
      const rising = this.config.environment === "aquarium";
      for (let i = 0; i < p.count; i++) {
        p.setY(
          i,
          rising
            ? p.getY(i) + dt * 2.2
            : p.getY(i) -
                dt * (this.config.environment === "snow" ? 1.4 : 19),
        );
        if (rising ? p.getY(i) > 30 : p.getY(i) < 0)
          p.setY(i, rising ? 0 : 30);
      }
      p.needsUpdate = true;
    }
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i];
      e.life -= dt;
      if (e.velocity) {
        e.mesh.position.addScaledVector(e.velocity, dt);
        e.velocity.y -= dt * 6;
      }
      if (e.life <= 0) {
        this.scene.remove(e.mesh);
        const m = e.mesh as THREE.Mesh;
        m.geometry?.dispose();
        if (m.material && !Array.isArray(m.material)) m.material.dispose();
        this.effects.splice(i, 1);
      }
    }
    this.renderer.render(this.scene, this.camera);
    this.hudTime += dt;
    if (this.hudTime > 0.1) {
      this.hudTime = 0;
      const r = this.config.rule;
      this.onHud({
        health: Math.max(0, Math.ceil(this.health)),
        armor: Math.ceil(this.armor),
        ammo: this.ammo,
        reserve: this.reserve,
        kills: this.kills,
        headshots: this.headshots,
        score: Math.floor(this.score),
        progress: ["capture", "stealth", "sabotage", "confirmed"].includes(r)
          ? this.collected
          : [
                "defense",
                "escort",
                "domination",
                "hardpoint",
                "headquarters",
              ].includes(r)
            ? Math.floor(this.objectiveTime)
            : r === "infection"
              ? Math.floor(this.elapsed)
              : r === "boss"
                ? this.bossDead
                  ? 1
                  : 0
                : this.kills,
        target: this.config.target,
        time: Math.floor(this.elapsed),
        wave: this.wave,
        cooldown: Math.ceil(this.cooldown),
        grenades: this.grenades,
        weapon: this.weapon.name,
        objective: objectiveText(r, this.config.target),
        message: this.messageTime > 0 ? this.message : "",
        hit: this.hitTime > 0,
        hurt: this.hurtTime > 0,
        reload: this.reloadTime > 0,
        paused: this.paused,
        interaction: this.interaction,
        abilityActive: this.abilityTime > 0,
        radar: this.bots
          .filter((b) => !b.dead)
          .map((b) => ({
            x: b.group.position.x,
            z: b.group.position.z,
            friendly: b.friendly,
          })),
        player: {
          x: this.camera.position.x,
          z: this.camera.position.z,
          yaw: this.yaw,
        },
      });
    }
  };
  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.frame);
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("keydown", this.keyDown);
    window.removeEventListener("keyup", this.keyUp);
    window.removeEventListener("mousemove", this.mouseMove);
    this.canvas.removeEventListener("mousedown", this.mouseDown);
    window.removeEventListener("mouseup", this.mouseUp);
    this.canvas.removeEventListener("contextmenu", this.contextMenu);
    document.removeEventListener("pointerlockchange", this.lockChange);
    window.removeEventListener("blur", this.blur);
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      if (m.material) {
        if (Array.isArray(m.material))
          m.material.forEach((mat) => mat.dispose());
        else m.material.dispose();
      }
    });
    this.scene.traverse((o) => {
      if (o.userData.ownedTexture) o.userData.ownedTexture.dispose();
    });
    this.surfaceTexture?.dispose();
    this.renderer.dispose();
    this.audio.dispose();
  }
}
