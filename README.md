# TiCash Website

GitHub/Render-ready TiCash static website with the logo fix included.

## Deploy
Upload ALL files and folders from this ZIP to the ROOT of the `ticash-app-web` repository.

Required root files include:
- index.html
- style.css
- privacy.html
- terms.html
- render.yaml
- ticash-logo.png
- assets/

Render:
- Type: Static Site
- Branch: main
- Root Directory: blank
- Build Command: blank
- Publish Directory: ./

The website uses `/ticash-logo.png?v=4` so the logo is served directly from the repository root.
