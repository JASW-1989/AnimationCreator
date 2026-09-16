# Koma Studio 0.6 agent contract

You are editing an ORIGINAL offline animation workbench, not a remote video generator. Keep the user's zero-additional-subscription policy. No model calls, paid services, external rendering uploads or hidden downloads. Prefer semantic MCP/CLI edits; Computer Use is for viewing, playback, graphic gestures and explicit review. Do not claim an untested desktop control path is installed.

## Required operation flow
Read current revision/project through scene_read. Read docs/PRO-COMMANDS.md and docs/PRODUCTION-COMMANDS.md for the relevant operation. Propose bounded commands with scene_preview; inspect diff and designated frames before scene_commit. Use the returned baseRevision. Do not unlock protected layers or overwrite existing authored keys without permission. Afterwards inspect actual playback, not only one attractive screenshot. All edits are reversible; checkpoint before meaningful multi-shot changes.

Production ranges are END-EXCLUSIVE. Drawing-inbetween endpoints are both authored cels, while queue/work-range end is exclusive. Shot commands use LOCAL frames, queues GLOBAL frames, audio envelopes CLIP-LOCAL frames. Legacy cat-plugin ranges are inclusive. Do not mix these contracts.

## Important new semantics
Curves alter timing of keyed values, not anatomy. Drawing inbetweens require native assets with matching topology, not arbitrary bitmaps. Native node editing should duplicate a shared cel. Drivers require a DAG; bake the whole shot before replacing a live driven rotation with IK. Pose capture reads effective controller state. Grid weights are distance-initialized LBS, not semantic automatic rigging. Similarity tracking must stop on confidence loss and requires human inspection. Manual repair confidence=1 is an override, not measurement. PNG is the exact masked-pixel audit format; SVG is not.

Open blocking review notes prevent new queues. Frozen queues do not inherit later scene/note changes. `scene_render_queue` creates/reads/pauses jobs but DOES NOT render them automatically. Pro Desk must stay open to run/resume. Never promise asynchronous background completion. Server disk cache is persistent; standalone HTML queues are session memory only. Keep sourceRevision/sourceDigest with exported frames and audio.

16 bounded MCP tools are available through tools/mcp.cjs, including scene_preflight and scene_render_queue. Scene JSON must not contain executable scripts/expressions. Import files via the local UI or tools/import-production.cjs; never paste embedded image/audio bytes in model tool calls. Assets in scene_read are redacted intentionally.

## Development and validation
Runtime Node >=20; no mandatory npm installation. Start `node server.cjs`. Run `node --test tests/*.test.cjs`, `node tests/integration_v050.cjs`, and (development environment only with Playwright and Chromium installed) `python tests/browser_production.py` / `python tests/browser_pro.py`. Build standalone HTML with `node tools/build.cjs`. Build the Ninja study with `node tools/build-pro-examples.cjs` after build; example file is included. No browser or third-party binary is bundled.

Do not confuse technical tests with animation artistic-quality approval, security certification or live Codex validation. Original ninja raster assets stay raster; this release does not create new combat anatomy. Report remaining deficiencies honestly. Do not rewrite a previously approved scene solely to improve feature-demo metrics.


## Atelier 0.6 required contract

Read `docs/ATELIER-COMMANDS.md` and `docs/ATELIER-SCHEMAS.json`. Use the revision-bound image tool rather than guessing UI coordinates. Use a short edit lease and re-read after acquisition. Source edits invalidate paint and stage approvals. Rough/correction are nonfinal planes. Scene scopes are conservative dependency checks, not pixel locks. Do not self-label artistic review as human approval. Annotated light direction is not automatic shading. Legacy fills with no seed require review, not silent approval. Use `node tools/build-atelier.cjs` for current release examples.
