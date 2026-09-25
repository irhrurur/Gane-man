# Resource audit and integration ledger

## Inspected sources and tools

- Supplied ZIP: Next.js/Three.js framework, no actual model/animation/audio files or menu JPEGs. Extracted and retained its gameplay framework.
- Public GitHub searches: Kenney 3D/audio, Quaternius, modular sci-fi resources. Inspected repository file trees before downloading individual blobs.
- `trebeljahr/quaternius-showcase`: compatible uncompressed self-contained GLB conversions, skins, material slots and authored animation tracks. Selected 35 models; no application code imported.
- `Malcolmnixon/Quaternius-Modular-Scifi-Pack`: inspected Godot packaging and CC0 license; did not import incompatible Godot scenes.
- `iwenzhou/kenney`: inspected CC0 license and selected three Ogg files.
- `beep2bleep/FreeAssetsByKenneyNLandQuaternius`: inspected tree only. Contains mixed resources including folders marked Patreon Exclusive; **no files imported from it**.
- Existing installed engine: Three.js GLTFLoader, SkeletonUtils and BufferGeometryUtils. Used directly, not another engine's controller/plugin.
- Blender executable absent; apt installation failed. No Blender, animation retargeting, external controller plugin or third-party navigation library was used.
- No personal GitHub asset libraries queried. All searched repositories are public third-party resources.

## Licenses / creator sources

Quaternius creator pages explicitly license these packs CC0, including commercial use:

- https://quaternius.com/packs/cyberpunkgamekit.html — Character, drones, robot, machinery, lighting, signs.
- https://quaternius.com/packs/scifimodularguns.html — eight assembled sci-fi weapons.
- https://quaternius.com/packs/survival.html — shotgun.
- https://quaternius.com/packs/ultimatetexturedbuildings.html — four material-colored building variants. No missing atlas is required by these GLBs.
- https://quaternius.com/packs/ultimatespaceships.html — Dispatcher ship.
- https://quaternius.com/packs/ultimatemodularscifi.html — checkpoint walls, floors, stairs, crates, consoles.
- Street_Straight is the Quaternius street-pack model in the same public GLB library.

Kenney's CC0 license is preserved verbatim at `public/assets/licenses/Kenney-CC0.md`; Quaternius pack license at `public/assets/licenses/Quaternius.txt`. The GLB mirror's permissive repository notice is also retained. Original authors are credited despite CC0 not requiring attribution.

Every asset's original repository path, immutable Git blob ID, local filename, author and SHA256 is recorded in `public/assets/manifest.json`. The importer reads that manifest; it does not search or traverse the user's repositories.

## Verified pipeline

1. Inspected trees and selected small compatible files.
2. Verified licenses against creator pages/repository notices.
3. Downloaded through GitHub blob API; inspected GLB JSON chunks (meshes, skins, material slots, animations, no required compression extension).
4. Normalized scales at runtime; corrected weapon axes after browser screenshot inspection.
5. Replaced the live primitive map/guns/actors with local GLBs. Cloned skeletons and materials; batched static imported meshes.
6. Bound models to firing, pickups, bots, objectives, escort and patrol logic.
7. Ran browser tests, caught and fixed a terminal child-index assumption, weapon orientation, missing menu images, and excessive draw calls. Verified native Ogg decoding.

## Animation inventory

Character has 22 authored clips: Death, Gun_Shoot, HitRecieve, HitRecieve_2, Idle_Gun_Pointing, Idle_Gun_Shoot, Idle_Neutral, Idle_Sword, Interact, Kick_Left, Kick_Right, Punch_Left, Punch_Right, Roll, Run, Run_Back, Run_Left, Run_Right, Run_Shoot, Sword_Slash, Walk, Wave.

Enemy_2Legs: Attack, Death, Idle, Jump, Run, Shoot, Walk.
Enemy_Flying: Attack, Dead, Idle, Run, Shoot, Walk.

Only state-machine-selected clips are exercised in gameplay. Imported but unused clips are not presented as implemented gameplay features. Swat.glb was inspected and rejected as the live foundation because it contained a rig but no animations; it was removed from the shipped files.
