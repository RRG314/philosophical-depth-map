# Ocean redesign: research, decisions and acceptance criteria

11 October 2026. Internal design record; not player-facing copy.

## Why the first scene failed

The user rejected the fixed-camera diorama. Its detailed assets sat on an almost empty plane; rectangular reef fragments were exposed; changing a label and equipment did not create a convincing descent. The rigid diver translated without propulsion or vertical control. This is a design failure, not a missing polygon budget. Passing functional tests did not establish visual quality or enjoyable play. Do not treat the rejected screenshots as a successful art benchmark.

## Research used

- [Charlie Cleveland, The Design of Subnautica, GDC 2019](https://www.gdcvault.com/play/1025745/The-Design-of-Subnautica). The accessible session synopsis describes prototyping emotion, exploration, discovery and restrained guidance. The full slide downloads could not be retrieved here; this record does not claim a full viewing of the talk.
- [Unknown Worlds, Exterior Sketch (2013)](https://unknownworlds.com/en/news/subnautica-exterior-sketch). The developer connects vehicle shape and visibility to exploration, mobility and utility. Our design inference: equipment must change movement and access, rather than merely decorate an avatar. Its fictional vehicle designs are not evidence about real depth ratings.
- [Unknown Worlds, New Loot System and Tech Tree Design (2015)](https://unknownworlds.com/en/news/new-loot-system-tech-tree-design). The developer describes unclear resources, repetitive recipes and busywork as progression problems, and explains making destinations legible and earlier locations useful. Our inference: do not replace philosophical inquiry with collecting interchangeable question tokens.
- [Przybylski, Rigby & Ryan (2010), A Motivational Model of Video Game Engagement, Review of General Psychology 14(2), 154–166, DOI 10.1037/a0019440](https://selfdeterminationtheory.org/SDT/documents/2010_PrzybylskiRigbyRyan_ROGP.pdf). The authors review a motivational account involving autonomy, competence and relatedness. It supports testing choice, comprehensible controls and meaningful feedback; it does not establish this application's retention or learning effects. No multiplayer or relatedness benefit is claimed here.
- [Three.js Water documentation](https://threejs.org/docs/pages/Water.html), [ocean example](https://threejs.org/examples/webgl_shaders_ocean.html), [color management](https://threejs.org/manual/pages/color-management.html), [fog](https://threejs.org/manual/pages/fog.html). These establish available rendering mechanisms and limitations. Reflective water is a surface effect; it does not provide underwater volume, bathymetry, buoyancy, animation or game design automatically.
- [NOAA, Ocean light zones](https://oceanservice.noaa.gov/facts/light_travel.html). Light becomes limited below about 200 m and sunlight is absent below approximately 1,000 m. Deep scenes need vehicle light and restrained visibility; a brightly lit tropical reef is unsuitable for the abyss.
- [Nielsen Norman Group, Plain Language Is for Everyone, Even Experts](https://www.nngroup.com/articles/plain-language-experts/). Use familiar terms, clear labels and task-relevant information. This is usability guidance, not an AI-text detector. Avoid promising that any style can prove human authorship.

## Design decision

Retain the browser application, accessible question interface, journal and licensed assets. Replace the fixed display with a player-following camera, drag-to-look, momentum, active propulsion, vertical movement and one sea-level coordinate system. A single sloping coast joins the first wading and swimming states. Deeper destinations remain selectable travel locations; do not claim the entire ocean is already a streamed seamless world.

Use WebGL now because it fits the existing public browser deployment. WebGPU is a future measured upgrade, not a substitute for world design. Unity or Unreal would add a separate production and delivery pipeline; migrating before a successful small playtest would not resolve the current design uncertainty.

Use authored character textures with a game skeleton and weighted mesh deformation. The downloaded diver is not animated; its generated swimming rig is our adaptation. Test opposing leg kicks, bend at the knees, smooth turns, acceleration, drag, ascent, descent, and transitions to standing. A frozen T-pose, a rotating whole-body plank, and a depth label disconnected from position are rejection conditions.

Reflective water, sky, underwater visibility, terrain conformance and correct color handling are separate systems. Conform reef scans to the seabed and blend their edges. Wildlife belongs in plausible portions of the water column. A few legible animals and habitats are preferable to overcrowding every view. Broad biome placement is illustrative, not a verified species-distribution model.

## Philosophical play and progression

The lasting object is an inquiry in the journal. The user explicitly clarified that ocean travel is a reward and analogy for text-based exploration, not a required route through questions. Text exploration supplies unique-question milestones. All destinations can be previewed freely; swimming and visiting stations do not manufacture progress. Optional reading stations offer questions, saved inquiries and spaced revisits. An unfinished draft is protected before a different question starts.

The ocean supports wading, swimming with a generated skeletal animation, ascent/descent, scuba and a submersible. There is no survival economy, oxygen timer, collectible grind or required philosophical answer. These equipment representations are not verified engineering depth ratings. Continued philosophical work, rather than time spent moving an avatar, changes the itinerary. A later retention study should test whether optional exploration supports voluntary return and meaningful reflection; neither is established by software tests.

Keep research experiments distinct from this public play loop. Changing rendering, incentives and question exposure changes an intervention; existing controlled protocols do not automatically cover the redesigned game.

## Public language

Main navigation concerns exploring, reading and the journal. Explain movement where it is needed. Remove development terms, scoring defensiveness and repeated disclaimers from play. Keep model attribution in collapsed credits; research details on the research page; implementation records in the repository. Retain necessary privacy and consent information at the point it affects a user's choice.

Use specific prompts such as “What makes this reason convincing?” rather than motivational slogans, repeated three-part taglines or abstract claims of transformation. Do not describe a working feature with a development adjective such as robust, seamless or intelligent. No automated detector can certify that copy is not AI-generated.

## Acceptance tests

1. Movement changes both skeleton and position; stopping produces deceleration. Turning, ascent and descent are controllable with keyboard and touch.
2. Walking from ankle depth reaches swimming without teleportation. Surface and seabed boundaries constrain movement. Actual y-coordinate determines current water depth.
3. Camera follows the player and can look around. Above-water and underwater rendering switch at the camera's water crossing.
4. Loaded assets render at credible scale without exposed rectangular terrain edges, broken normals, missing meshes or obvious T-poses. Inspect screenshots and motion; file existence is insufficient.
5. Complete an inquiry from the ocean, return, reload and find the same journal entry. The text path remains usable without WebGL.
6. Record device, viewport, asset readiness, draw calls and frame timings. Establish measured performance budgets after these observations; do not call headless results real-device FPS.
7. Before claiming enjoyment or improved learning, conduct consented observations of navigation, curiosity, perceived control, content comprehension and voluntary return. Software tests cannot supply that evidence.

## Release status

The first diorama is rejected. The replacement is under active implementation and visual review. GitHub publication must include the corrected implementation and explicit verification results; do not describe this document or the rejected build as completion of the user's requested experience.

## Real-data terrain and WorldExplorer3D review

Reviewed the user's WorldExplorer3D checkout at commit `3e7b9e9af659d9bc8cb20747b0c9ee39f919e770`: `app/js/ocean/bathymetry.js`, `app/js/ocean.js`, `app/js/ocean/scene-assets.js`, `app/js/ocean/scene-textures.js`, its data metadata and ocean screenshot. The useful architecture is a shared terrain sampler, local metric coordinates, boundary checks and player-following camera. Its depth compression and procedural blending are not copied. No source code or asset was copied from that repository; it remains unchanged.

The ninth destination uses GEBCO Compilation Group (2020), DOI [10.5285/a29c5465-b138-234d-e053-6c86abc040b9](https://doi.org/10.5285/a29c5465-b138-234d-e053-6c86abc040b9), obtained through [Open Topo Data](https://www.opentopodata.org/datasets/gebco2020/) on 2026-10-11. Source grid resolution is 15 arcseconds; this application's regional extraction samples 61×81 points at 30 arcseconds latitude and 31.5 arcseconds longitude. It spans 11.10–11.60°N, 141.95–142.65°E, with elevations -10925 to -5971 metres. This is a gridded compilation, not a claim of direct survey measurements at every vertex or the definitive deepest point in the ocean.

`scripts/fetch-bathymetry.py` is a cached reproducible downloader. It records source and terms in `src/game/data/mariana.json`. Rendering and collision share triangular interpolation matching mesh topology. Local equirectangular coordinates approximate metric distance over this limited extent; no vertical exaggeration is applied. Edge clamping keeps the vehicle within the sampled area. Wall collision blocks/slides horizontal motion rather than lifting the sub through the terrain. Travel points reach the steepest sampled area and deepest grid point. A lit seafloor overview is explicitly a visualization; normal exploration has no sunlight in the hadal zone.

Nearshore and other destinations remain authored habitats, not georeferenced reconstructions. The present data cannot resolve individual boulders, overhangs or fine cliff faces. Higher-resolution surveys, artist-reviewed terrain materials and device-tested rendering remain expansion work. No photorealism claim is made.

## Next art and field-test priorities

1. Compare real-device screenshots and frame times on integrated GPUs and midrange phones. Software Chromium is a functional regression environment, not evidence of a stable mobile frame rate.
2. Obtain finer-resolution, redistributable bathymetry for local cliff and wall sections, preserving provenance and a consistent collision surface. Do not sharpen a coarse grid and describe the invented detail as survey data.
3. Have an environment artist review scan seams, benthic cover, water optics and shoreline composition. Retain the source-resolution character textures; reduce geometry only after side-by-side inspection.
4. Review equipment representation with marine expertise. The licensed spherical submersible is an illustrative model, not a claim that that design can withstand hadal pressure. The automatic diver weights are an adaptation, not a professionally authored swim capture.
5. Observe whether people can move, find optional stops, resume a draft and understand the progress analogy without explanation. Evaluate these separately from philosophical learning outcomes.
