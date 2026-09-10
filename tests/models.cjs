// Runtime integration test for real GLB models + touch API.
// Uses real Three.js math/geometry, real GLTFLoader parsing of
// public/models/*.glb (served via a fetch shim), and a mocked renderer.
const fs = require('fs'),
  path = require('path'),
  ts = require('typescript'),
  assert = require('assert');
const THREE = require('three');

class MockRenderer {
  shadowMap = {};
  setPixelRatio() {}
  setSize() {}
  render(scene, camera) {
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
  }
  dispose() {}
}

const modules = {};
function load(name) {
  if (modules[name]) return modules[name];
  const file = path.resolve('src/game', name + '.ts');
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
    },
  }).outputText;
  const m = { exports: {} };
  new Function(
    'exports',
    'require',
    'module',
    output,
  )(
    m.exports,
    (n) =>
      n === 'three'
        ? { ...THREE, WebGLRenderer: MockRenderer }
        : n.startsWith('./')
          ? load(n.slice(2))
          : require(n),
    m,
  );
  return (modules[name] = m.exports);
}

// DOM shims: 2D canvas returns null (surface/sign skipped), but the element
// factory existing means model streaming is enabled like in a browser.
global.window = {
  devicePixelRatio: 1,
  addEventListener() {},
  removeEventListener() {},
};
global.document = {
  pointerLockElement: null,
  addEventListener() {},
  removeEventListener() {},
  exitPointerLock() {},
  hidden: false,
  createElement: () => ({
    width: 256,
    height: 256,
    getContext: () => null,
  }),
};
global.requestAnimationFrame = () => 0;
global.cancelAnimationFrame = () => {};
// Browsers resolve relative fetch URLs against the page; Node needs help.
const RealRequest = global.Request;
global.Request = class extends RealRequest {
  constructor(input, init) {
    super(
      typeof input === 'string' && input.startsWith('/')
        ? 'http://localhost' + input
        : input,
      init,
    );
  }
};
global.fetch = async (input) => {
  const url = typeof input === 'string' ? input : input.url;
  const m = String(url).match(/\/models\/([\w-]+\.glb)$/);
  if (!m) throw new Error('offline: ' + url);
  const buf = fs.readFileSync(path.resolve('public/models', m[1]));
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return {
    status: 200,
    ok: true,
    url: String(url),
    arrayBuffer: async () => ab,
  };
};

const { Engine } = load('engine');
const { ModelManager } = load('models');
const { defaultSettings, defaultProfile } = load('content');

let checks = 0;
function ok(v, label) {
  assert(v, label);
  checks++;
}
async function settle(ms = 400) {
  await new Promise((r) => setTimeout(r, ms));
}
function make(extra = {}) {
  const config = {
    mode: 'campaign',
    rule: 'elimination',
    environment: 'forest',
    target: 10,
    mission: 0,
    name: 'Test',
    difficulty: 'Recruit',
    weapon: 'vxr',
    ability: 'scan',
    attachments: defaultProfile.attachments,
    ...extra,
  };
  const e = new Engine(
    {
      clientWidth: 1000,
      clientHeight: 700,
      addEventListener() {},
      removeEventListener() {},
      focus() {},
    },
    config,
    { ...defaultSettings, volume: 0, quality: 'Low' },
    () => {},
    () => {},
    () => {},
  );
  e.scene.updateMatrixWorld(true);
  e.paused = false;
  return e;
}
function names(root) {
  const out = [];
  root.traverse((o) => {
    if (o.name) out.push(o.name);
  });
  return out;
}

(async () => {
  ok(ModelManager.supported(), 'Model streaming enabled with DOM shims');

  // Soldier bots upgrade to the rigged GLB model.
  const e = make();
  await settle(600);
  const soldier = e.bots.find((b) => !b.friendly && b.type === 'rifle');
  ok(soldier, 'Rifle bot spawned');
  const sn = names(soldier.group);
  ok(sn.includes('Soldier'), 'Rifle bot upgraded to Soldier.glb: ' + sn.join(','));
  ok(
    soldier.rig.LegL && soldier.rig.ArmR,
    'Rig pivots collected for limb animation',
  );
  let headMeshes = 0;
  soldier.group.traverse((o) => {
    if (o.userData.head) headMeshes++;
  });
  ok(headMeshes > 0, 'Head meshes flagged for headshots');

  // Hunter + drone roles load their own models.
  const hunter = e.bots.find((b) => b.type === 'hunter');
  if (hunter) {
    ok(names(hunter.group).includes('Hunter'), 'Hunter bot uses hunter.glb');
  }
  const drone = e.bots.find((b) => b.type === 'drone');
  if (drone) {
    ok(names(drone.group).includes('Drone'), 'Drone bot uses drone.glb');
    ok(drone.rig.Rotor1, 'Drone rotors collected');
  }

  // Combat still works against GLB models (headshot via Head meshes).
  const target0 = e.bots.find((b) => !b.friendly && !b.dead);
  target0.group.position.set(0, 0, 20);
  e.camera.position.set(0, 1.72, 25);
  e.camera.rotation.set(0, 0, 0);
  e.weapon.accuracy = 100;
  e.scene.updateMatrixWorld(true);
  const hp = target0.hp;
  e.shoot();
  ok(target0.hp < hp, 'Raycast hits the GLB-upgraded bot');

  // Walk animation swings limbs without errors.
  for (let i = 1; i < 40; i++) e.loop(i * 20);
  ok(true, 'Animation loop runs with rigged models');

  // First-person gun viewmodel upgrades to rifle.glb.
  ok(
    names(e.gun).includes('RifleVM'),
    'Gun upgraded to rifle.glb: ' + names(e.gun).join(','),
  );
  e.switchWeapon();
  await settle(300);
  ok(
    names(e.gun).includes('PistolVM'),
    'Sidearm upgraded to pistol.glb: ' + names(e.gun).join(','),
  );
  e.switchWeapon();
  await settle(300);

  // Forest trees + beacon crawler upgrade.
  let pines = 0;
  e.scene.traverse((o) => {
    if (o.name === 'Pine') pines++;
  });
  ok(pines > 0, `Forest upgraded with Pine models (${pines})`);
  const boss = make({ rule: 'boss', target: 1, environment: 'city' });
  await settle(600);
  const mech = boss.bots.find((b) => b.type === 'boss');
  ok(
    mech && names(mech.group).includes('Sentinel'),
    'Boss upgraded to robot.glb mech',
  );
  boss.destroy();

  // Web-streamed models fail gracefully when offline.
  const web = await e.models.obtain('soldier', true);
  ok(web === null, 'CDN stream returns null offline, local model kept');

  // Touch controls API.
  e.setTouchMove(0, 1);
  ok(e.touchMove.z === 1, 'Touch stick sets movement vector');
  e.setTouchMove(0, 0);
  const yaw = e.yaw;
  e.addLook(100, 0);
  ok(e.yaw !== yaw, 'Touch drag rotates the camera');
  e.toggleAim();
  ok(e.ads === true, 'Touch ADS toggle aims');
  e.toggleAim();
  e.toggleCrouch();
  ok(e.crouchToggle === true, 'Touch crouch toggle crouches');
  e.toggleCrouch();
  e.setTouchFire(true);
  ok(e.firing === true, 'Touch fire holds the trigger');
  e.setTouchFire(false);
  e.setInteract(true);
  ok(e.keys.has('KeyE'), 'Touch interact holds E');
  e.setInteract(false);
  const y0 = e.camera.position.y;
  e.tryJump();
  ok(e.velocityY > 0 && e.camera.position.y === y0, 'Touch jump impulses');
  e.pause();
  ok(e.ads === false && e.touchMove.z === 0, 'Pause resets touch state');
  e.destroy();

  console.log(`PASS: ${checks} real-model loading, combat, animation, and touch checks`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
