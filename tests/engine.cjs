const fs = require("fs"),
  path = require("path"),
  ts = require("typescript"),
  assert = require("assert");
const THREE = require("three");
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
  const file = path.resolve("src/game", name + ".ts");
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
    },
  }).outputText;
  const m = { exports: {} };
  new Function("exports", "require", "module", output)(
    m.exports,
    (n) =>
      n === "three"
        ? { ...THREE, WebGLRenderer: MockRenderer }
        : n.startsWith("./")
          ? load(n.slice(2))
          : require(n),
    m,
  );
  return (modules[name] = m.exports);
}
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
};
global.requestAnimationFrame = () => 0;
global.cancelAnimationFrame = () => {};
const { Engine } = load("engine"),
  { missions, arenaModes, defaultSettings, defaultProfile } = load("content");
let checks = 0;
function ok(v, label) {
  assert(v, label);
  checks++;
}
function make(extra = {}) {
  let result = null;
  const config = {
    mode: "campaign",
    rule: "elimination",
    environment: "city",
    target: 10,
    mission: 0,
    name: "Test",
    difficulty: "Recruit",
    weapon: "vxr",
    ability: "scan",
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
    { ...defaultSettings, volume: 0, quality: "Low" },
    () => {},
    (r) => (result = r),
    () => {},
  );
  e.scene.updateMatrixWorld(true);
  e.paused = false;
  e.result = () => result;
  return e;
}
function eliminate(e, n) {
  for (let i = 0; i < 120 && e.kills < n; i++) {
    const b = e.bots.find((b) => !b.dead && !b.friendly);
    if (b) e.damageBot(b, 99999);
    for (const b of e.bots) b.cool = Infinity;
    e.updateBots(3.2);
  }
  e.updateObjectives(0.02);
}
function objective(e) {
  const r = e.config.rule;
  if (["capture", "stealth", "sabotage"].includes(r)) {
    for (const t of e.targets) {
      e.camera.position
        .copy(t.group.position)
        .add(new THREE.Vector3(0, 1.75, 0));
      e.keys.add("KeyE");
      for (let i = 0; i < 100; i++) e.updateObjectives(0.02);
    }
    if (r === "capture") {
      ok(!e.finished, "Capture must require extraction");
      e.camera.position.copy(e.extraction).add(new THREE.Vector3(0, 1.75, 0));
      e.updateObjectives(0.02);
    }
  } else if (
    ["defense", "escort", "domination", "hardpoint", "headquarters"].includes(r)
  ) {
    e.bots.forEach((b) => (b.dead = true));
    for (let i = 0; i < 10000 && !e.finished; i++) {
      e.camera.position
        .copy(e.beacon.position)
        .add(new THREE.Vector3(0, 1.75, 0));
      e.updateObjectives(0.04);
    }
  } else if (r === "boss") {
    e.damageBot(
      e.bots.find((b) => b.type === "boss"),
      99999,
    );
    e.updateObjectives(0.04);
  } else if (r === "infection") {
    e.elapsed = e.config.target;
    e.updateObjectives(0.04);
  } else if (r === "confirmed") {
    eliminate(e, e.config.target);
    for (const d of [...e.drops]) {
      e.camera.position.copy(d.position);
      e.updateObjectives(0.04);
    }
  } else eliminate(e, e.config.target);
}
// Traverse each map's collision grid, not just its visual layout.
for (const m of missions) {
  const e = make({
    mission: m.id,
    environment: m.environment,
    rule: m.rule,
    target: m.target,
  });
  ok(!e.collides(0, 25), "Player spawn is clear: " + m.name);
  const seen = new Set(["0,25"]),
    q = [[0, 25]];
  for (let i = 0; i < q.length; i++) {
    const [x, z] = q[i];
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx,
        nz = z + dz,
        key = nx + "," + nz;
      if (!seen.has(key) && !e.botCollides(nx, nz)) {
        seen.add(key);
        q.push([nx, nz]);
      }
    }
  }
  for (const t of e.targets)
    ok(
      seen.has(
        Math.round(t.group.position.x) + "," + Math.round(t.group.position.z),
      ),
      "Objective reachable: " + m.name,
    );
  objective(e);
  ok(e.result()?.won, "Campaign completable: " + m.name);
  e.destroy();
}
for (const mode of arenaModes) {
  const e = make({ mode: "arena", rule: mode.rule, target: mode.target });
  objective(e);
  ok(e.result()?.won, "Arena completable: " + mode.name);
  e.destroy();
}
const e = make({ mode: "training", rule: "trial", target: 30 });
e.bots.forEach((b) => {
  b.group.position.set(25, 0, -25);
});
const target = e.bots[0];
target.group.position.set(0, 0, 20);
e.camera.position.set(0, 1.72, 25);
e.camera.rotation.set(0, 0, 0);
e.weapon.accuracy = 100;
e.scene.updateMatrixWorld(true);
e.shoot();
ok(e.ammo === 29, "Shooting consumes ammunition");
ok(target.dead, "Raycast headshot hits the target");
ok(e.headshots === 1, "Headshot is recorded");
e.switchWeapon();
ok(e.ammo === 14, "Sidearm starts loaded");
e.switchWeapon();
ok(e.ammo === 29, "Switching does not duplicate ammunition");
e.ammo = 5;
e.reload();
ok(e.reloadTime > 0, "Reload starts");
for (let i = 1; i < 110; i++) e.loop(i * 20);
ok(e.ammo === 30, "Reload restores magazine");
ok(e.reserve === 215, "Reload consumes reserve");
e.ability();
const cool = e.cooldown;
e.ability();
ok(e.cooldown === cool && cool > 0, "Ability cooldown prevents reuse");
e.keys.add("ShiftLeft");
e.keyDown({ code: "KeyC", repeat: false, preventDefault() {} });
ok(e.slideTime > 0, "Sprint-crouch triggers a slide");
e.keys.clear();
eliminate(e, 30);
ok(e.result()?.won, "Training replenishes all thirty targets");
e.destroy();
for (const mode of ["survival", "horror"]) {
  const e = make({ mode, target: 5 });
  for (let wave = 1; wave <= 5; wave++) {
    for (const b of e.bots.filter((b) => !b.friendly && !b.dead))
      e.damageBot(b, 99999);
    for (let t = 0; t < 135; t++) e.updateObjectives(0.04);
    if (wave < 5) ok(e.wave === wave + 1, "Survival advances wave " + wave);
    if (wave === 4)
      ok(
        e.bots.some((b) => b.type === "boss" && !b.dead),
        "Boss spawns on fifth wave",
      );
  }
  ok(e.result()?.won, "Survival extract complete: " + mode);
  e.destroy();
}
const squad = make({ mode: "survival" }),
  friend = squad.bots.find((b) => b.friendly);
squad.damageBot(friend, 99999, false, false);
ok(friend.dead && squad.kills === 0, "Friendly down does not award kills");
squad.camera.position.copy(friend.group.position);
squad.keys.add("KeyE");
for (let i = 0; i < 155; i++) squad.updateObjectives(0.02);
ok(!friend.dead, "Holding E revives squadmate");
squad.score = 500;
squad.health = 20;
squad.upgrade();
ok(
  squad.health === 100 && squad.score === 0,
  "Supply purchase charges score and restores vitals",
);
squad.destroy();
console.log(
  `PASS: ${checks} campaign, arena, combat, collision, survival, and squad checks`,
);
