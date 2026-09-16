# Koma Studio 0.6.0-alpha / Atelier

Original local-first 2D animation authoring workbench, MIT-licensed core source.
No subscription, account, model API, runtime npm packages or external CDN required.
This is an alpha, not a claim of film-art quality, commercial-suite parity or
actual Codex operation.

Start `node server.cjs` (Node >=20) and open the printed loopback URL.
Select ATELIER. Offline: Koma-Production-Standalone.html.
Disposable native study: Koma-Atelier-Study.html (save before closing).
Inherited raster ninja example: Koma-Ninja-Pro.html with the current workbench.

Guide.zh-TW.html: Chinese operation guide and English technical limits.
docs/AUDIT-IMPLEMENTATION-MATRIX.json: all 26 audited conclusions.
AGENTS.md and docs/ATELIER-COMMANDS.md: human/agent contracts.
24 new typed operations, 16 MCP tools, eight Atelier workspaces, ten review stages.
Existing Pro/production functions remain available.

## MCP
Start server first. Configure a local stdio MCP host to execute:
`node /absolute/path/to/koma-studio/tools/mcp.cjs`
Image previews need an active browser on that SAME local server.
Offline HTML is NOT a server worker. External model accounts/permissions are
not included. Use edit leases, version-bound previews and scoped proposals.

## Build / tests
`node tools/build-atelier.cjs`
`node --test tests/*.test.cjs`
`node tests/integration_v050.cjs`
`python tests/browser_production.py`
`python tests/browser_pro.py`
`python tests/browser_atelier.py`
`python tests/integration_atelier.py`
`python tests/release_atelier.py`

Python, Playwright and Chromium are development-only test dependencies.
Current evidence: evidence/v060. Evaluation environment blocked browser localhost
navigation; integration tests explicitly record a transport-only test bridge to
actual HTTP/MCP. This is not native same-origin deployment acceptance.

Use full backups. Newly authored Atelier metadata requires >=0.6; older releases
may ignore it. No real Codex, physical pen or long-form load test has been claimed.
Renderer/paint bounds are in the guide. Optional FFmpeg is not bundled.
