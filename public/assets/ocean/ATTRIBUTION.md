# Ocean asset attribution

Downloaded from Sketchfab on 11 October 2026 through the authorized signed-in account. Every distributed model is licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Original authors retain their copyrights. Attribution does not imply endorsement.

- [Scuba Diver](https://sketchfab.com/3d-models/3cffae9b572d4506b3025e29d6ff068c) by [turelljc](https://sketchfab.com/turelljc). File: `diver.glb`.
- [Spherical Submersible](https://sketchfab.com/3d-models/55ed2cc102d241aa8a6d57c6fedfbbdd) by [Lanzaman](https://sketchfab.com/lanzaboy). File: `submersible.glb`.
- [Blue whale (Animated, downloadable)](https://sketchfab.com/3d-models/1fc22d7e249b41b995dbff1052bb2a1a) by [Andrey](https://sketchfab.com/andrey.). File: `whale.glb`.
- [Bobtail Squid](https://sketchfab.com/3d-models/df3e65475a744dddac249df2c267a0ea) by [Penny](https://sketchfab.com/fenelope). File: `squid.glb`.
- [Jellyfish](https://sketchfab.com/3d-models/42da7b26f173427f89c9ddb64be1be73) by [paul heynen](https://sketchfab.com/paulheynen). File: `jellyfish.glb`.
- [Blacktip Reef Shark](https://sketchfab.com/3d-models/a52bb96c5a0c4157b49982471f8902b0) by [Lais.Marques](https://sketchfab.com/Lais.Marques). File: `shark.glb`.
- [blue powder tang](https://sketchfab.com/3d-models/e5ce0c518ecf4631931d824b24b75e89) by [Major](https://sketchfab.com/majorgalah). File: `fish.glb`.
- [Coral Reef Outcrop](https://sketchfab.com/3d-models/8bc72c9e4575470ea30d1313e48b730c) by [Ben M. Ritt](https://sketchfab.com/BenMRitt). File: `reef.glb`.
- [Weird deepsea anglerfish](https://sketchfab.com/3d-models/3085eefe0bb348d89902cd51e7e91f05) by [RickStikkelorum](https://sketchfab.com/ricksticky). File: `anglerfish.glb`.
- [Opisthoteuthidae / Dumbo Octopus](https://sketchfab.com/3d-models/b798bba56507441fb9abf959128f5f26) by [APO](https://sketchfab.com/a47168218). File: `octopus.glb`.
- [Animated Sperm Whale](https://sketchfab.com/3d-models/3076676b30294c119ec2065c3bf3dc47) by [Anees Animates](https://sketchfab.com/AneesAnimates). File: `sperm-whale.glb`.

## Adaptations

Textures re-encoded as WebP at quality 90, capped at 2048 pixels (reef tiles 1024). Deduplication and animation resampling preserve authored characters and clips. The reef scan receives a simplified static level of detail. Runtime changes include a game-authored 13-bone character skeleton with generated skin weights and swimming/wading animation, equipment visibility, material/light response, placement, scale and swimming paths. Most destinations are illustrative habitats, not an ecological or diving simulator.

The source coral collection `Coral Reef Small` was evaluated but excluded: its rig and draw-call cost were unsuitable for this browser scene. Its file is not distributed. The selected Coral Reef Outcrop supplies the live coral terrain.

`manifest.json` records source IDs, hashes, byte counts, triangle counts and animation counts. `scripts/optimize-ocean.mjs` reproduces processing from source GLBs downloaded under their licenses; it does not retrieve credentials or scrape downloads. Models load from this application’s host, not the visitor’s Sketchfab account.
