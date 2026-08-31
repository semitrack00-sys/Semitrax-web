# Semi-Trax Premium Website — Fixed Map Build

This build fixes the North America coverage map.

Important:
- `north-america-map.png` is included in the website root.
- A duplicate is also included under `assets/` for compatibility.
- `index.html` explicitly loads `north-america-map.png?v=3` to help bypass stale CDN/browser cache.
- Keep the animated driver/activity network enabled.

Upload ALL files in this folder to `semitrack00-sys/Semitrax-web`.
Do not upload only index.html.

Render settings:
- Branch: main
- Publish directory: .
