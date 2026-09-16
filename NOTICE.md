# Distribution notes

The original Koma source in this release is supplied under the included MIT license.
Koma is a provisional project name, not a trademark-clearance claim. The implementation
is original code, not copied paid-plugin source or a bypass of commercial activation.

No third-party runtime packages, model weights, fonts, browser binaries or FFmpeg
binaries are bundled. Browser and optional Node runtime must exist independently.
Development-only browser tests use Playwright/Pillow and an installed Chromium.
Optional MP4 encoding uses an independently installed FFmpeg build. If redistributed,
review that build's actual LGPL/GPL and codec obligations: https://ffmpeg.org/legal.html

The application does not call or unlock any cloud model. External agent/model account
access and usage allowances are independent. The source license does not license
third-party artwork, trademarks, model weights or third-party binaries.

Technical references:
- APNG chunks and rational delay: https://www.w3.org/TR/png-3/
- Node filesystem operations: https://nodejs.org/api/fs.html
- External Codex allowance: https://chatgpt.com/codex/pricing/
