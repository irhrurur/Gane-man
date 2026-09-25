# VEILBREAK — Iron District revision

An original browser FPS prototype. This revision focuses on the user's requested
**grounded military characters and a larger, textured environment**, not an
attempt to claim Call of Duty's production quality. No Call of Duty assets used.

## Play / download

The release is `Veilbreak-IronDistrict.zip`, containing the standalone
`Veilbreak-Phone.html` and a short readme. Extract it and open the HTML in a
WebGL2-capable browser. All runtime models, textures, sounds and JavaScript are
embedded; no server or Node installation is needed for that file. Some mobile
file viewers do not execute HTML—open with an actual browser. Physical Android
and iOS compatibility/performance have not been measured.

Choose **Training Grounds → Enter the Range → Deploy Now** for a quick test,
or Campaign for objectives. The original mission definitions all use the same
new compound; they are not separate fully authored campaign maps.

Phone: rotate sideways; left stick moves (push up farther to sprint), right-side
drag looks, hold FIRE/USE, toggle AIM/CROUCH, and use RELOAD/JUMP/SWITCH/ABILITY/FRAG.
Desktop: WASD, mouse, R reload, E interact, Shift sprint, C crouch, Space jump,
1/2 weapon switch, Escape pause. Touch mode automatically uses Low graphics.

## Actual changes

- Replaced ordinary cartoon robot enemies with Unvanquished armored human
  infantry, real texture maps, one humanoid skeleton, and 12 baked source clips.
- Used **Blender 4.2 Python** to repair materials, desaturate uniforms, resize
  textures to 512px, bake legacy IK poses and convert to GLB. The source model
  faces +X; corrected runtime orientation to match aiming/movement.
- Soldier animations include idle, walk, run, crouch, crouch-walk, jump, landing,
  shooting, death, raise/lower and interaction. Not all clips are independently
  exercised by enemy AI; player arms select several movement/interaction states.
- **160×160m rendered compound; 156×156m traversable bounds** (previous bounds
  roughly 69×69m). Seven factory blocks, five walk-in ground-floor rooms,
  service lanes, checkpoints and staggered cover. Upper floors and fire escapes
  are scenery, not playable vertical traversal.
- Imported actual Poly Haven factory walls/windows/cornices/piers, concrete
  barriers, industrial pipes, chain-link fences, oil drums, utility boxes,
  covered parked cars and fire-escape modules. Real asphalt/concrete maps.
- Materials retain their UVs, albedo, normal and roughness/metallic data.
  Static material batching now includes texture identity and preserves UVs.
  Blender simplification reduces unnecessary planar geometry and mobile detail.
- Existing nine weapon models now have a neutral finish. Weapon geometry remains
  the Quaternius sci-fi set; this is not a newly realistic weapon animation pack.
- Grounded infantry replace normal drone slots. The imported drone still exists
  for explicitly requested drone types; the scripted aircraft is retained.
- Footsteps/firing/reload use Kenney samples. Other effects remain synthesized.

## Limits

This is an improved prototype, not BO3 fidelity. Hand/weapon grip alignment is
approximate, not finished IK. No wall-running, drivable cars, live multiplayer,
working lifts, destructible buildings, or authored full campaign cinematics.
AI uses local movement/visibility/flanking; it is not a production navigation mesh.
The enlarged map has not been performance-tested on physical phones. Low mode
has no dynamic shadows, and material detail is intentionally limited for memory.

## Licenses

`Infantry.glb` and its adapted arm meshes are **CC BY-SA 2.5**, attributed to the
Unvanquished team. That share-alike requirement is preserved for these resources.
Poly Haven models/textures, Quaternius weapons/aircraft and Kenney audio are CC0.
See **Field Manual → Asset Credits**, `ASSETS.md`,
`public/assets/licenses/` and `public/assets/military-sources.json`.
No Unvanquished engine code or unrelated mirror-repository code was imported.

## Development and verification

```
npm ci
npm run dev -- --hostname 0.0.0.0
npm run typecheck
npm run test:unit
npm run test:assets
npm run build:single
npm run test:phone
npm run build
```

- Unit suite: 98 existing gameplay checks with a mock renderer/legacy map.
- Asset browser suite: 25 checks with real imported assets, including flood-fill
  access to all five objective rooms, skin raycasts, pickups, death, audio and
  collision. This is distinct from the legacy unit tests.
- Phone HTML suite: actual standalone file, Chromium touch emulation, simultaneous
  move/fire, reload, aim/crouch, switch, pause, self-download/reopen and zero HTTP
  requests. Emulation is not a physical-device benchmark.

`src/game/asset-catalog.json` is the authoritative set of 29 runtime models. The
single-file builder embeds only these and three sound samples, not old unused
assets retained for reference. `.cache/` and `.venv/` contain development-only
source files/tooling and are excluded. Blender scripts are in `scripts/`.
Cloud career storage is optional; offline builds use browser local storage.

The optional Windows Electron build kit remains in `desktop/`. It has not been
built or validated on Windows here. The standalone HTML is the tested delivery.
