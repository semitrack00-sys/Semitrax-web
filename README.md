# Semi-Trax Premium Website — Precise Map Build

This build fixes the animated driver markers so every marker is anchored to the exact North America map image.

- 60 animated activity markers total
- 38 sampled on U.S. land pixels
- 14 sampled on Canadian land pixels
- 8 sampled on Mexican land pixels
- The driver overlay uses the exact 1280×1132 image coordinate system
- The map and overlay scale together on desktop, tablet, and mobile
- `north-america-map.png` is included in the website root and under `assets/`
- Map URL uses `?v=4` to help bypass stale browser/CDN cache

Upload ALL contents of the `Semitrax-web` folder to the website repository.
