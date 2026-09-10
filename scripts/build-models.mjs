// VEILBREAK model factory — builds original low-poly GLB models for the game.
// No external assets: every mesh below is authored in code, so the output is
// 100% original and phone-friendly (tiny files, no textures).
// Run: node scripts/build-models.mjs  → writes public/models/*.glb
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Minimal FileReader polyfill so three's GLTFExporter runs in Node.
if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class {
    result = null;
    onload = null;
    onloadend = null;
    onerror = null;
    _done() {
      this.onload?.({ target: this });
      this.onloadend?.({ target: this });
    }
    readAsArrayBuffer(blob) {
      blob
        .arrayBuffer()
        .then((buf) => {
          this.result = buf;
          this._done();
        })
        .catch((e) => this.onerror?.(e));
    }
    readAsDataURL(blob) {
      blob
        .arrayBuffer()
        .then((buf) => {
          this.result = `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(buf).toString('base64')}`;
          this._done();
        })
        .catch((e) => this.onerror?.(e));
    }
  };
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'models');
mkdirSync(outDir, { recursive: true });

// ---------- helpers ----------
const matCache = new Map();
function M(color, o = {}) {
  const key = `${color}|${o.rough ?? 0.8}|${o.metal ?? 0.25}|${o.e ?? 0}|${o.ei ?? 1}`;
  if (!matCache.has(key)) {
    matCache.set(
      key,
      new THREE.MeshStandardMaterial({
        color,
        roughness: o.rough ?? 0.8,
        metalness: o.metal ?? 0.25,
        emissive: o.e ?? 0x000000,
        emissiveIntensity: o.ei ?? 1,
        flatShading: true,
      }),
    );
  }
  return matCache.get(key);
}
function box(parent, name, x, y, z, w, h, d, mat, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.name = name;
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  parent.add(m);
  return m;
}
function cyl(parent, name, x, y, z, rt, rb, h, mat, rx = 0, ry = 0, rz = 0, seg = 10) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.name = name;
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  parent.add(m);
  return m;
}
function cone(parent, name, x, y, z, r, h, mat, rx = 0, ry = 0, rz = 0, seg = 8) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat);
  m.name = name;
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  parent.add(m);
  return m;
}
function sph(parent, name, x, y, z, r, mat, w = 10, h = 8) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, w, h), mat);
  m.name = name;
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
function pivot(parent, name, x, y, z, rx = 0, ry = 0, rz = 0) {
  const g = new THREE.Group();
  g.name = name;
  g.position.set(x, y, z);
  g.rotation.set(rx, ry, rz);
  parent.add(g);
  return g;
}
const P = Math.PI;

// Palette
const fatigue = M(0x4c5650, { rough: 0.9, metal: 0.05 });
const fatigueDark = M(0x39423d, { rough: 0.9, metal: 0.05 });
const armor = M(0x3a4145, { rough: 0.6, metal: 0.5 });
const armorDark = M(0x232a2d, { rough: 0.6, metal: 0.5 });
const plate = M(0x59626a, { rough: 0.45, metal: 0.7 });
const gunmetal = M(0x222b2f, { rough: 0.4, metal: 0.8 });
const dark = M(0x161d20, { rough: 0.7, metal: 0.4 });
const polymer = M(0x1d2427, { rough: 0.85, metal: 0.15 });
const pouch = M(0x5a5b46, { rough: 0.9, metal: 0 });
const pack = M(0x33413c, { rough: 0.9, metal: 0.05 });
const roll = M(0x6b6257, { rough: 0.95, metal: 0 });
const boot = M(0x22271f, { rough: 0.9, metal: 0.05 });
const glove = M(0x495a54, { rough: 0.9, metal: 0.05 });
const sleeve = M(0x2b3532, { rough: 0.9, metal: 0.1 });
const helmet = M(0x424e4c, { rough: 0.55, metal: 0.45 });
const helmetDark = M(0x2c3534, { rough: 0.6, metal: 0.4 });
const visorRed = M(0x330a08, { e: 0xff4a3d, ei: 2.2, rough: 0.3, metal: 0.1 });
const lampWarm = M(0x332211, { e: 0xffc37a, ei: 2.0 });
const accentOrange = M(0x3a2413, { e: 0xe49764, ei: 1.6 });
const coreCyan = M(0x0a2a26, { e: 0x5df2d6, ei: 2.4 });
const glassTeal = M(0x0d2b30, { e: 0x4fd8e0, ei: 1.4, rough: 0.2, metal: 0.6 });
const flesh = M(0x4a3f4d, { rough: 0.85, metal: 0.05 });
const fleshDark = M(0x372e3a, { rough: 0.9, metal: 0 });
const clawBone = M(0xcfc4ae, { rough: 0.7, metal: 0.05 });
const eyeOrange = M(0x331303, { e: 0xff7a2a, ei: 2.6 });
const blade = M(0x2b3134, { rough: 0.4, metal: 0.7 });
const tire = M(0x191e1e, { rough: 0.95, metal: 0 });
const hub = M(0x6d7a76, { rough: 0.4, metal: 0.7 });
const headlight = M(0x333311, { e: 0xfff2b0, ei: 2.4 });
const stripeTeal = M(0x0a2a26, { e: 0x54e8cf, ei: 1.8 });
const panelOrange = M(0xb25a28, { rough: 0.8, metal: 0.1 });
const panelCream = M(0xd8d2c0, { rough: 0.8, metal: 0 });
const bark = M(0x4a3a2c, { rough: 0.95, metal: 0 });
const leaf = M(0x2c4a35, { rough: 0.9, metal: 0 });
const leafLight = M(0x3a5f43, { rough: 0.9, metal: 0 });

// ---------- SOLDIER (faces +Z, ~1.82 tall) ----------
function buildSoldier() {
  const g = new THREE.Group();
  g.name = 'Soldier';
  for (const s of [-1, 1]) {
    const leg = pivot(g, s < 0 ? 'LegL' : 'LegR', 0.11 * s, 0.86, 0);
    box(leg, 'Thigh', 0, -0.21, 0, 0.15, 0.42, 0.18, fatigue);
    box(leg, 'KneePad', 0, -0.42, 0.07, 0.14, 0.12, 0.06, armor);
    box(leg, 'Shin', 0, -0.6, 0, 0.13, 0.3, 0.15, fatigueDark);
    box(leg, 'Boot', 0, -0.8, 0.05, 0.15, 0.12, 0.3, boot);
  }
  box(g, 'Pelvis', 0, 0.95, 0, 0.34, 0.2, 0.23, fatigueDark);
  box(g, 'Belt', 0, 1.05, 0, 0.36, 0.07, 0.25, armor);
  box(g, 'Torso', 0, 1.27, 0, 0.4, 0.42, 0.26, armor);
  box(g, 'ChestPlate', 0, 1.28, 0.14, 0.3, 0.3, 0.06, plate);
  box(g, 'PouchL', -0.12, 1.06, 0.15, 0.1, 0.12, 0.07, pouch);
  box(g, 'PouchR', 0.12, 1.06, 0.15, 0.1, 0.12, 0.07, pouch);
  box(g, 'Backpack', 0, 1.28, -0.2, 0.3, 0.38, 0.16, pack);
  box(g, 'Bedroll', 0, 1.5, -0.2, 0.3, 0.1, 0.16, roll);
  box(g, 'ShoulderL', -0.27, 1.44, 0, 0.14, 0.1, 0.2, plate);
  box(g, 'ShoulderR', 0.27, 1.44, 0, 0.14, 0.1, 0.2, plate);
  for (const s of [-1, 1]) {
    const arm = pivot(g, s < 0 ? 'ArmL' : 'ArmR', 0.28 * s, 1.4, 0, -0.4, 0, 0);
    box(arm, 'UpperArm', 0, -0.16, 0, 0.12, 0.34, 0.14, fatigue);
    box(arm, 'Elbow', 0, -0.33, 0.02, 0.11, 0.08, 0.1, armor);
    box(arm, 'Forearm', 0, -0.45, 0.03, 0.11, 0.24, 0.12, fatigueDark);
    box(arm, 'Glove', 0, -0.6, 0.04, 0.11, 0.12, 0.13, glove);
  }
  // Service rifle held across the chest
  const gun = pivot(g, 'Rifle', 0.1, 1.1, 0.32);
  box(gun, 'GunBody', 0, 0, 0, 0.07, 0.11, 0.42, gunmetal);
  cyl(gun, 'GunBarrel', 0, 0.01, -0.32, 0.02, 0.02, 0.24, dark, P / 2, 0, 0);
  box(gun, 'GunMag', 0, -0.12, 0.02, 0.06, 0.16, 0.09, polymer, 0.12, 0, 0);
  box(gun, 'GunStock', 0, -0.01, 0.28, 0.06, 0.1, 0.16, polymer);
  box(gun, 'GunSight', 0, 0.08, -0.05, 0.03, 0.05, 0.06, dark);
  box(gun, 'GunGrip', 0, -0.1, -0.16, 0.05, 0.12, 0.06, polymer);
  // Head assembly (anything under "Head" counts as a headshot)
  const head = pivot(g, 'Head', 0, 1.5, 0);
  box(head, 'Neck', 0, 0.02, 0, 0.1, 0.08, 0.1, glove);
  box(head, 'HeadSkull', 0, 0.16, 0, 0.22, 0.24, 0.23, armorDark);
  box(head, 'Helmet', 0, 0.25, -0.01, 0.26, 0.15, 0.27, helmet);
  box(head, 'HelmetBrim', 0, 0.17, 0.02, 0.28, 0.04, 0.29, helmetDark);
  box(head, 'Visor', 0, 0.15, 0.12, 0.18, 0.08, 0.03, visorRed);
  box(head, 'Lamp', -0.09, 0.3, 0.08, 0.05, 0.05, 0.06, lampWarm);
  cyl(head, 'Antenna', 0.12, 0.4, -0.08, 0.012, 0.012, 0.25, dark);
  return g;
}

// ---------- SENTINEL MECH / BOSS (faces +Z, ~2.1 tall, engine scales up) ----------
function buildRobot() {
  const g = new THREE.Group();
  g.name = 'Sentinel';
  for (const s of [-1, 1]) {
    const leg = pivot(g, s < 0 ? 'LegL' : 'LegR', 0.22 * s, 1.0, 0);
    box(leg, 'Foot', 0, -0.94, 0.08, 0.3, 0.12, 0.5, armorDark);
    box(leg, 'ShinArmor', 0, -0.6, 0, 0.2, 0.5, 0.24, armor);
    cyl(leg, 'Piston', 0, -0.6, -0.15, 0.035, 0.035, 0.5, plate);
    box(leg, 'ThighArmor', 0, -0.2, 0, 0.24, 0.4, 0.28, armor);
  }
  box(g, 'Hips', 0, 1.08, 0, 0.5, 0.2, 0.34, armorDark);
  box(g, 'Torso', 0, 1.45, 0, 0.62, 0.55, 0.42, armor);
  box(g, 'Core', 0, 1.45, 0.22, 0.2, 0.2, 0.04, coreCyan);
  box(g, 'VentL', -0.2, 1.2, 0.22, 0.12, 0.16, 0.03, dark);
  box(g, 'VentR', 0.2, 1.2, 0.22, 0.12, 0.16, 0.03, dark);
  box(g, 'ShoulderL', -0.42, 1.74, 0, 0.2, 0.16, 0.36, plate);
  box(g, 'ShoulderR', 0.42, 1.74, 0, 0.2, 0.16, 0.36, plate);
  const armL = pivot(g, 'ArmL', -0.44, 1.66, 0, -0.15, 0, 0);
  box(armL, 'UpperArm', 0, -0.2, 0, 0.16, 0.4, 0.18, armor);
  box(armL, 'Fist', 0, -0.52, 0, 0.2, 0.24, 0.2, armorDark);
  const armR = pivot(g, 'ArmR', 0.44, 1.66, 0, -0.25, 0, 0);
  box(armR, 'UpperArm', 0, -0.2, 0, 0.16, 0.4, 0.18, armor);
  box(armR, 'Cannon', 0, -0.48, 0.12, 0.18, 0.18, 0.5, gunmetal);
  cyl(armR, 'CannonBarrel', 0, -0.48, 0.6, 0.05, 0.06, 0.4, dark, P / 2, 0, 0);
  box(armR, 'CannonTip', 0, -0.48, 0.8, 0.09, 0.09, 0.06, accentOrange);
  const head = pivot(g, 'Head', 0, 1.78, 0);
  box(head, 'HeadSkull', 0, 0.12, 0, 0.3, 0.22, 0.3, armorDark);
  box(head, 'Visor', 0, 0.13, 0.16, 0.24, 0.06, 0.03, visorRed);
  cyl(head, 'Antenna', 0.12, 0.32, -0.1, 0.012, 0.012, 0.4, dark);
  box(head, 'BeaconLight', -0.12, 0.26, 0, 0.05, 0.05, 0.05, visorRed);
  return g;
}

// ---------- QUAD DRONE (hovers; parts centered ~1.8 like the old bot) ----------
function buildDrone() {
  const g = new THREE.Group();
  g.name = 'Drone';
  box(g, 'HeadBody', 0, 1.8, 0, 0.44, 0.2, 0.44, armor);
  box(g, 'HeadEye', 0, 1.8, 0.23, 0.16, 0.1, 0.04, visorRed);
  box(g, 'HeadLight', 0, 1.68, 0, 0.1, 0.04, 0.1, coreCyan);
  box(g, 'CrossA', 0, 1.86, 0, 0.85, 0.05, 0.08, dark, 0, P / 4, 0);
  box(g, 'CrossB', 0, 1.86, 0, 0.85, 0.05, 0.08, dark, 0, -P / 4, 0);
  const corners = [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ];
  corners.forEach(([sx, sz], i) => {
    cyl(g, 'Motor' + (i + 1), 0.34 * sx, 1.9, 0.3 * sz, 0.05, 0.06, 0.08, dark);
    const rotor = pivot(g, 'Rotor' + (i + 1), 0.34 * sx, 1.96, 0.3 * sz);
    box(rotor, 'Blade', 0, 0, 0, 0.44, 0.015, 0.05, blade);
    box(rotor, 'BladeTip', 0.18, 0, 0, 0.06, 0.016, 0.052, accentOrange);
  });
  return g;
}

// ---------- HUNTER CREATURE (faces +Z, hunched, ~1.7 tall) ----------
function buildHunter() {
  const g = new THREE.Group();
  g.name = 'Hunter';
  for (const s of [-1, 1]) {
    const leg = pivot(g, s < 0 ? 'LegL' : 'LegR', 0.16 * s, 0.95, 0);
    box(leg, 'Thigh', 0, -0.15, 0.05, 0.18, 0.35, 0.2, flesh, 0.2, 0, 0);
    box(leg, 'Shin', 0, -0.5, -0.05, 0.13, 0.4, 0.14, fleshDark, -0.25, 0, 0);
    box(leg, 'ClawFoot', 0, -0.72, 0.1, 0.14, 0.1, 0.34, clawBone);
  }
  const torso = pivot(g, 'Torso', 0, 1.0, 0, 0.45, 0, 0);
  box(torso, 'Belly', 0, 0.15, 0, 0.4, 0.4, 0.3, flesh);
  box(torso, 'Chest', 0, 0.45, 0.02, 0.46, 0.35, 0.34, flesh);
  for (let i = 0; i < 3; i++)
    box(torso, 'Rib' + i, 0, 0.36 + i * 0.12, 0.19, 0.4, 0.03, 0.02, fleshDark);
  for (let i = 0; i < 3; i++)
    cone(torso, 'Spike' + i, 0, 0.3 + i * 0.16, -0.22, 0.05, 0.2, clawBone, -0.7, 0, 0);
  for (const s of [-1, 1]) {
    const arm = pivot(g, s < 0 ? 'ArmL' : 'ArmR', 0.3 * s, 1.32, 0.2, -0.55, 0, 0);
    box(arm, 'UpperArm', 0, -0.2, 0, 0.12, 0.4, 0.13, flesh);
    box(arm, 'Forearm', 0, -0.5, 0, 0.1, 0.35, 0.11, fleshDark);
    for (let i = 0; i < 3; i++)
      box(arm, 'Claw' + i, -0.04 + i * 0.04, -0.76, 0.02, 0.03, 0.18, 0.03, clawBone);
  }
  const head = pivot(g, 'Head', 0, 1.48, 0.32, 0.25, 0, 0);
  box(head, 'HeadSkull', 0, 0.05, 0.05, 0.26, 0.24, 0.3, fleshDark);
  box(head, 'Snout', 0, 0.0, 0.28, 0.16, 0.12, 0.18, flesh);
  box(head, 'Jaw', 0, -0.12, 0.26, 0.14, 0.06, 0.16, fleshDark);
  box(head, 'EyeL', -0.08, 0.1, 0.2, 0.05, 0.05, 0.02, eyeOrange);
  box(head, 'EyeR', 0.08, 0.1, 0.2, 0.05, 0.05, 0.02, eyeOrange);
  cone(head, 'HornL', -0.1, 0.22, -0.02, 0.04, 0.16, clawBone, -0.3, 0, 0.3);
  cone(head, 'HornR', 0.1, 0.22, -0.02, 0.04, 0.16, clawBone, -0.3, 0, -0.3);
  return g;
}

// ---------- RANGE TARGET DUMMY (~1.85 tall) ----------
function buildTarget() {
  const g = new THREE.Group();
  g.name = 'Target';
  box(g, 'Base', 0, 0.05, 0, 0.6, 0.1, 0.6, armorDark);
  box(g, 'Post', 0, 0.55, 0, 0.09, 1.0, 0.09, bark);
  box(g, 'Torso', 0, 1.15, 0, 0.52, 0.66, 0.07, panelOrange);
  box(g, 'TorsoRing', 0, 1.15, 0.045, 0.3, 0.44, 0.012, panelCream);
  box(g, 'TorsoCore', 0, 1.15, 0.055, 0.12, 0.18, 0.012, panelOrange);
  cyl(g, 'Head', 0, 1.68, 0, 0.17, 0.17, 0.07, panelOrange, P / 2, 0, 0, 16);
  cyl(g, 'HeadRing', 0, 1.68, 0.04, 0.09, 0.09, 0.02, panelCream, P / 2, 0, 0, 16);
  box(g, 'Stand', 0, 0.85, -0.2, 0.07, 0.6, 0.07, dark, 0.5, 0, 0);
  return g;
}

// ---------- FIRST-PERSON RIFLE (forward = -Z, origin at grip) ----------
function buildRifle() {
  const g = new THREE.Group();
  g.name = 'RifleVM';
  box(g, 'Body', 0, 0, -0.08, 0.085, 0.11, 0.42, gunmetal);
  box(g, 'Handguard', 0, 0.005, -0.38, 0.075, 0.09, 0.24, polymer);
  cyl(g, 'Barrel', 0, 0.01, -0.55, 0.016, 0.016, 0.16, dark, P / 2, 0, 0);
  box(g, 'MuzzleBrake', 0, 0.01, -0.64, 0.04, 0.04, 0.05, dark);
  box(g, 'Mag', 0, -0.12, -0.1, 0.055, 0.17, 0.09, polymer, 0.15, 0, 0);
  box(g, 'Grip', 0, -0.12, 0.06, 0.05, 0.13, 0.06, polymer, 0.3, 0, 0);
  box(g, 'Stock', 0, -0.02, 0.2, 0.07, 0.1, 0.2, polymer);
  box(g, 'Buttpad', 0, -0.02, 0.3, 0.075, 0.12, 0.03, dark);
  box(g, 'SightRear', 0, 0.085, -0.02, 0.02, 0.05, 0.04, dark);
  box(g, 'SightFront', 0, 0.075, -0.45, 0.015, 0.04, 0.02, dark);
  box(g, 'RailGlow', 0.05, 0.01, -0.2, 0.008, 0.02, 0.3, accentOrange);
  box(g, 'Charging', -0.05, 0.03, 0.05, 0.02, 0.03, 0.1, dark);
  box(g, 'GloveRear', 0.02, -0.14, 0.06, 0.09, 0.12, 0.1, glove);
  box(g, 'GloveFront', 0, -0.09, -0.36, 0.09, 0.1, 0.12, glove);
  box(g, 'SleeveRear', 0.05, -0.2, 0.14, 0.13, 0.14, 0.2, sleeve);
  return g;
}

// ---------- FIRST-PERSON PISTOL (forward = -Z) ----------
function buildPistol() {
  const g = new THREE.Group();
  g.name = 'PistolVM';
  box(g, 'Slide', 0, 0.01, -0.06, 0.05, 0.06, 0.24, gunmetal);
  box(g, 'Frame', 0, -0.03, -0.05, 0.045, 0.04, 0.2, polymer);
  cyl(g, 'Muzzle', 0, 0.01, -0.185, 0.014, 0.014, 0.02, dark, P / 2, 0, 0);
  box(g, 'Grip', 0, -0.12, 0.03, 0.05, 0.14, 0.07, polymer, 0.25, 0, 0);
  box(g, 'SightF', 0, 0.05, -0.16, 0.012, 0.02, 0.015, lampWarm);
  box(g, 'SightR', 0, 0.05, 0.04, 0.03, 0.02, 0.015, dark);
  box(g, 'Glove', 0, -0.11, 0.02, 0.09, 0.12, 0.1, glove);
  box(g, 'Sleeve', 0.03, -0.18, 0.1, 0.12, 0.13, 0.18, sleeve);
  return g;
}

// ---------- FIRST-PERSON HEAVY / SNIPER (forward = -Z) ----------
function buildHeavy() {
  const g = new THREE.Group();
  g.name = 'HeavyVM';
  box(g, 'Body', 0, 0, -0.15, 0.1, 0.13, 0.55, gunmetal);
  box(g, 'Shroud', 0, 0.01, -0.42, 0.07, 0.08, 0.2, polymer);
  cyl(g, 'Barrel', 0, 0.01, -0.6, 0.02, 0.02, 0.35, dark, P / 2, 0, 0);
  box(g, 'MuzzleBrake', 0, 0.01, -0.79, 0.05, 0.05, 0.07, dark);
  cyl(g, 'Drum', 0, -0.13, -0.08, 0.09, 0.09, 0.08, polymer, 0, 0, P / 2, 12);
  box(g, 'Stock', 0, -0.03, 0.22, 0.09, 0.13, 0.24, polymer);
  box(g, 'Grip', 0, -0.13, 0.02, 0.055, 0.14, 0.06, polymer, 0.3, 0, 0);
  cyl(g, 'Scope', 0, 0.11, -0.1, 0.035, 0.035, 0.22, dark, P / 2, 0, 0, 12);
  cyl(g, 'ScopeLens', 0, 0.11, -0.215, 0.028, 0.028, 0.01, glassTeal, P / 2, 0, 0, 12);
  box(g, 'ScopeMount', 0, 0.07, -0.1, 0.03, 0.05, 0.05, dark);
  box(g, 'BipodL', -0.05, -0.1, -0.45, 0.02, 0.16, 0.02, dark, 0, 0, 0.25);
  box(g, 'BipodR', 0.05, -0.1, -0.45, 0.02, 0.16, 0.02, dark, 0, 0, -0.25);
  box(g, 'GloveRear', 0.02, -0.15, 0.02, 0.09, 0.12, 0.1, glove);
  box(g, 'GloveFront', 0, -0.1, -0.35, 0.09, 0.1, 0.12, glove);
  box(g, 'SleeveRear', 0.05, -0.21, 0.1, 0.13, 0.14, 0.2, sleeve);
  return g;
}

// ---------- PINE TREE (~5.7 tall) ----------
function buildTree() {
  const g = new THREE.Group();
  g.name = 'Pine';
  cyl(g, 'Trunk', 0, 1.0, 0, 0.2, 0.28, 2.0, bark, 0, 0, 0, 8);
  cone(g, 'Leaves1', 0, 2.6, 0, 1.6, 2.2, leaf, 0, 0, 0, 8);
  cone(g, 'Leaves2', 0, 3.8, 0, 1.2, 1.9, leaf, 0, 0, 0, 8);
  cone(g, 'Leaves3', 0, 4.9, 0, 0.8, 1.6, leafLight, 0, 0, 0, 8);
  return g;
}

// ---------- ESCORT CRAWLER (~2.4 long, faces +Z) ----------
function buildCrawler() {
  const g = new THREE.Group();
  g.name = 'Crawler';
  box(g, 'Hull', 0, 0.62, 0, 1.15, 0.5, 2.3, armor);
  box(g, 'Nose', 0, 0.5, 1.3, 0.9, 0.35, 0.4, plate);
  box(g, 'Cabin', 0, 1.0, -0.4, 0.8, 0.35, 0.9, dark);
  box(g, 'Glass', 0, 1.0, 0.06, 0.7, 0.25, 0.05, glassTeal);
  box(g, 'Cargo', 0, 0.95, -1.2, 0.9, 0.2, 0.5, pack);
  cyl(g, 'Mast', 0, 1.3, -0.9, 0.04, 0.04, 0.6, dark);
  sph(g, 'Sensor', 0, 1.65, -0.9, 0.1, coreCyan);
  box(g, 'Stripe', 0, 0.89, 0, 0.2, 0.02, 2.0, stripeTeal);
  box(g, 'LightL', -0.35, 0.55, 1.51, 0.15, 0.1, 0.03, headlight);
  box(g, 'LightR', 0.35, 0.55, 1.51, 0.15, 0.1, 0.03, headlight);
  let wi = 0;
  for (const x of [-0.62, 0.62])
    for (const z of [-0.8, 0, 0.8]) {
      wi++;
      const w = pivot(g, 'Wheel' + wi, x, 0.32, z);
      cyl(w, 'Tire', 0, 0, 0, 0.32, 0.32, 0.2, tire, 0, 0, P / 2, 12);
      cyl(w, 'Hub', 0, 0, 0, 0.12, 0.12, 0.22, hub, 0, 0, P / 2, 8);
    }
  return g;
}

// ---------- export ----------
const models = {
  soldier: buildSoldier,
  robot: buildRobot,
  drone: buildDrone,
  hunter: buildHunter,
  target: buildTarget,
  rifle: buildRifle,
  pistol: buildPistol,
  heavy: buildHeavy,
  tree: buildTree,
  crawler: buildCrawler,
};

const exporter = new GLTFExporter();
const manifest = { version: 1, generator: 'veilbreak-model-factory', files: [] };
for (const [name, build] of Object.entries(models)) {
  const scene = build();
  // Center + validate before export
  const bbox = new THREE.Box3().setFromObject(scene);
  const size = bbox.getSize(new THREE.Vector3());
  let meshCount = 0;
  scene.traverse((o) => {
    if (o.isMesh) meshCount++;
  });
  const result = await exporter.parseAsync(scene, { binary: true });
  const file = `${name}.glb`;
  writeFileSync(join(outDir, file), Buffer.from(result));
  const kb = (result.byteLength / 1024).toFixed(1);
  console.log(
    `${file}  ${kb} KB  meshes=${meshCount}  size=${size.x.toFixed(2)}x${size.y.toFixed(2)}x${size.z.toFixed(2)}`,
  );
  manifest.files.push(file);
}
writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log('manifest.json written →', outDir);
