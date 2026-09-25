# VEILBREAK — Vanguard Operations

Playable desktop browser FPS built from the supplied project archive, with an integrated **asset-backed Nova district**. Next.js + Three.js; offline AI, campaign objectives, survival, and local progression. This is a playable vertical slice, not a completed full-scale campaign.

## Run

```sh
npm ci
npm run dev -- --hostname 0.0.0.0
```
Open the preview → Training Grounds → Enter the Range → Deploy Now. Deployment waits for all 35 GLB resources; failed downloads produce an error rather than substituting box characters. All assets are served locally, with no runtime CDN dependency.

**Controls:** WASD move · mouse look · left click fire · right click aim · Shift sprint · C crouch · Shift+C slide · Space jump/low-cover mantle · R reload · 1/2/Tab primary/sidearm · E interact/pickup · Q ability · G grenade · F melee · Escape pause.

## What is actually integrated

- 35 Quaternius GLBs: nine distinct weapon models, humanoid character, biped robot, animated drone, four building modules, military cover, street/pavement modules, machinery, pipes, lighting, terminals, signage, and spacecraft.
- Cyberpunk character's 22 authored animation clips imported intact. Gameplay uses idle/aim, walk, run, firing, hit, interaction and death clips through individual skeleton clones, animation mixers and crossfades. Drone/biped packs provide their own compatible clips; no retargeting claim.
- First-person arms extracted from the actual character's skinned mesh by bone weights, retaining its rig. Grip alignment is prototype-quality, not a finished bespoke FPS animation pack.
- Nine selectable weapon definitions with real models, hitscan firing, ADS, recoil, finite ammunition, reload and sidearm switching. Three world pickups at deployment equip real weapons with E.
- Imported modular street district, open checkpoint interior and collidable cover. Building proxies are invisible physics/raycast volumes, not visible placeholder art. Authored meshes/materials provide the visible geometry.
- Animated hostile and friendly actors; imported flying drone; scripted spacecraft patrol and spacecraft escort representation. Vehicles are not drivable.
- Three decoded Kenney Ogg samples connected to firing, footsteps and reload. Other impacts/explosions/UI/ambience retain the supplied synthesized audio. Radio is text, not recorded speech.
- Runtime muzzle flashes, tracers, impact particles, emissive windows, fog and lighting. These are custom effects, not an imported VFX pack.
- Static imported architecture batched by material. Browser test's final no-shadow scene: 105 draw calls / approximately 222k triangles. These are scene counters, not a hardware FPS guarantee.
- Menu backgrounds are a real capture of the running game, not concept art.

## Test

With the dev server running:

```sh
npm run typecheck
npm run build
npm run test:unit
npm run test:assets
```

- `test:unit`: 98 pre-existing rules/combat/objective/collision checks using a mock renderer and the legacy map fixture. **Not visual verification of the new district.**
- `test:assets`: real headless Chromium/WebGL test; 19 assertions covering loaded GLBs, skeletons, movement, collisions, shooting skinned targets, reload, switch, pickup, effects, patrol, death clip, drone, terminal and Ogg decoding. Uses controlled simulation stepping after initial real rendering for deterministic tests. Screenshot goes to ignored `test-results/assets-game.png`.
- `test:browser`: supplied broader navigation regression suite. Not part of the claimed 19 asset assertions.
- Bundled test Chromium and its libraries avoid the unavailable browser download CDN. See `tests/browser-support.cjs`.

## Actual scope / unfinished work

The original archive supplies 16 mission **definitions** and multiple bot rulesets. They now share the imported Nova district; they are **not** 16 individually asset-dressed city/forest/snow/underground levels. There are no functional elevators, high-rise interiors, civilian traffic, trains, or vehicle entry/exit systems. Building interiors are not generally accessible; the checkpoint is open.

Camera movement supports sprint/crouch/jump/slide/low-cover mantle, but dedicated authored crouch, crouch-walk, jump/fall/landing, slide, vault, climb, reload, switch, vehicle-entry and exit animation clips have **not** been implemented for the player. Weapon reload/sway remains procedural. Full-body local-player third-person representation and exact hand-to-weapon IK are unfinished. No online multiplayer, recorded radio, or imported explosion/smoke library is claimed.

Blender was not installed. An installation attempt failed because system package sources were inaccessible. Native GLB inspection, material changes, skeleton cloning, mesh filtering and geometry batching were performed using Python/Three.js; no Blender conversion was performed. Direct raw GitHub downloads also failed, so reviewed files were fetched via the authenticated public GitHub blob API. No personal GitHub asset library was accessed.

PostgreSQL cloud career/leaderboards are optional: without `DATABASE_URL`, local progression remains available and cloud APIs report unavailable. No backend service has been provisioned. The production build does not require database credentials.

## Provenance

See [ASSETS.md](ASSETS.md), `public/assets/manifest.json`, and `public/assets/licenses/`. Only selected public resources were imported; no entire external repository was cloned. `python scripts/import-assets.py` re-fetches the exact pinned blobs and verifies SHA-256 hashes. Source GLBs total approximately 7 MB.

## Downloadable HTML and Windows packaging

The standalone static edition uses the same React/Three.js gameplay without
Next.js or database APIs. Run `npm run build:web` to create `web-build/`.
Serve that folder using `npm run play:web` or any static web host. A local web
server is required; double-clicking `index.html` via `file://` is unsupported.
Relative model/image/audio URLs support hosting in a subdirectory.

`npm run test:portable` tests the static edition at localhost:3002 (override
`TEST_URL` if needed): menu, 35 GLBs, deployment, real firing, reload, pause,
and exit; no cloud API requests or JavaScript errors. This test has passed.

`npm run package:game` creates `releases/Veilbreak-Game.zip`, containing the
prebuilt web game, Node launcher, editable source, licenses and START-HERE.txt.
On Windows, after extracting the ZIP and installing Node.js LTS, double-click
PLAY-WINDOWS.bat. No npm install is needed for playing the prebuilt version.

To build an unsigned portable Windows EXE on Windows: from the source folder,
run `npm ci`, `npm run build:web`, `cd desktop`, `npm install`, then
`npm run build:win`. The Electron build configuration is supplied but has not
been executed or tested on Windows here. It packages a browser runtime; it is
not a native engine port. See portable/START-HERE.txt for full instructions.


## Single-file phone edition (latest)

`npm run build:single` produces **Veilbreak-Phone.html**, about 11.4 MiB.
Unlike the earlier multi-file ZIP edition, this file embeds the JS, CSS,
35 GLBs, 3 audio samples, menu imagery and license notices. It opens with
`file://` in tested Chromium: no local server, Node installation, CDN,
database or internet needed. Google Fonts are omitted; system fonts are used.
The top-level Save this game button downloads another standalone HTML copy.

Phone controls: left stick for movement (push upward farther to sprint),
right-side drag to look, hold FIRE, toggle AIM/CROUCH, RELOAD, JUMP, USE,
SWITCH, ABILITY and FRAG. PAUSE is at top right. Landscape is recommended.
The coarse-pointer preset disables shadows and caps render quality at Low.
Pointer capture/cancel/blur handlers prevent held inputs sticking. On phone,
pointer lock is skipped. Multi-touch can move and fire simultaneously.

`npm run test:phone` has passed using mobile/touch-emulated Chromium and the
actual single HTML over file://: boot, deployment, simultaneous movement/fire
inputs, reload, aim/crouch toggles, jump button, look drag, weapon switch,
pause/abort, self-download and reopening the downloaded copy. No JavaScript
errors and no external HTTP requests. This does NOT establish performance or
file-opening compatibility on physical Android/iOS devices. Some phone file
viewers do not run HTML JavaScript; a real browser with WebGL2 is needed.
Arena's authenticated preview/file-download restrictions cannot be bypassed
by the game. A created file is not proof of successful delivery to the user.
