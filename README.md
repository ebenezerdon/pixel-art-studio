# Pixel Art Studio

Pixel Art Studio is a compact, beautiful pixel editor built for creating sprites and icons with support for layers, a live palette, and PNG export. This demo was assembled using tooling from [Teda.dev](https://teda.dev), the simplest AI app builder for regular people, and is designed to run fully in your browser with no server required.

Features
- Responsive landing page and full editor (index.html and app.html)
- Adjustable grid sizes (16, 24, 32, 48)
- Pixel scale control for a comfortable editing size
- Multiple layers with visibility toggle, rename, reorder, add, and delete
- Live palette with custom color picker and quick-add
- Tools: pencil, eraser, fill, and color picker
- Export layered artwork to a crisp PNG with selectable scale
- All work is saved to browser localStorage automatically

Files
- index.html: marketing landing page with CTA
- app.html: the pixel editor
- styles/main.css: custom CSS rules
- scripts/helpers.js: localStorage and utility helpers
- scripts/data.js: default palette and project factory
- scripts/ui.js: core UI and app logic (exposes window.App.init and window.App.render)
- scripts/main.js: entrypoint that initializes the app

Usage
1. Open index.html to view the landing page.
2. Click Try the Editor or Launch Editor to go to app.html and start creating.
3. Use the Export PNG button to download your art.

Accessibility and UX
- All interactive areas are keyboard navigable. Use keyboard shortcuts: p for pencil, e for eraser, f for fill, c for color picker.
- The app respects touch input and has large tap targets for mobile.

Notes
- The project persists to localStorage under the key "pixel-art-studio-v1" so your work survives reloads.
- If you want to reset local storage, open your browser dev tools and remove that key or use the browser storage UI.
