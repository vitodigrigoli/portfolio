# Vito Di Grigoli — Interactive 3D Portfolio

A Bruno Simon–inspired portfolio: ride a mint-green **Piaggio Vespa** around a
low-poly island **shaped like Sicily** at golden hour and discover the content
by exploring.

## The world

The island's coastline follows a simplified Sicily outline
([src/sicily.js](src/sicily.js)) — terrain, shore foam, prop placement and the
drivable-area boundary all share the same coast lookup.

- **Piazza** (spawn) — the center of the island, with a painted Sicilian cart
- **About** — Vito's house with the pergola home-office (Palermo side, NW)
- **Skills** — the Valley of the Temples: one Doric column per technology around
  a small Concordia-style temple (Agrigento side, SW)
- **Projects** — a Greek theater (Siracusa, SE): Congresso ANFI (PWA), GeForge,
  Artieri 1895 and Dottor Diego Tona stand on the orchestra, ringed by the cavea
- **Contact** — the striped lighthouse on the west cape (Capo Boeo)
- **Mount Etna** smoking away on the east side, right where it belongs
- **Monuments** in their real spots: Duomo di Cefalù, Teatro Massimo (Palermo),
  the Campanile of Messina, U Liotru (Catania), Scala dei Turchi, and the
  Trapani salt-pan windmill

Drive into any site and its info panel opens automatically.

## Tech

- **Three.js** (vanilla, no framework) + **Vite**
- 100% procedural — zero downloaded 3D models, textures, fonts, or audio files
- Arcade vehicle physics (kinematic, circle-collider push-out)
- Text via canvas-generated textures; ambient sound (sea, wind, engine)
  synthesized live with the WebAudio API — toggleable from the HUD
- Instanced meshes for vegetation, single 2k shadow map, pixel-ratio cap → 60fps
- Desktop: WASD / arrow keys · Mobile: touch joystick, responsive UI

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
npm run preview  # serve the production build
```

## Verify (headless smoke test)

Requires Microsoft Edge (uses playwright-core against the installed browser):

```bash
node scripts/verify.mjs
```

Loads the site, starts the experience, drives the Vespa, captures a bird's-eye
shot of the Sicily silhouette, asserts the About panel opens, measures FPS,
checks the mobile viewport, and drops screenshots in `scripts/shots/`.
