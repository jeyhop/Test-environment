# Bolivia Tax Folio Prototype

An editable front-end prototype that visualizes Bolivia's tax system as a folio / skill-tree interface inspired by Final Fantasy VII Rebirth.

## Files

- `index.html` — application shell and layout.
- `styles.css` — folio-inspired parchment, bronze, and dark-panel styling.
- `app.js` — SVG rendering, click handling, default selections, and pan/zoom controls.
- `data/countries/bolivia.js` — the Bolivia dataset you can maintain without changing UI code.

## Run locally

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

Then open `http://127.0.0.1:4173`.

## Current interaction model

- All tax nodes are selected by default.
- Click a node once to inspect it.
- Click an already-focused tax node to toggle it in or out of the total.
- Drag the folio canvas to move around.
- Use the mouse wheel or the zoom controls to zoom in and out.
- Use **Select all** to restore the full total.

## Editing Bolivia

Update `data/countries/bolivia.js` to change:

- tax names
- rates
- revenue values
- on-canvas positions
- glyph letters or symbols

## Extending to more countries

Add another file in `data/countries/` with the same structure and swap the imported dataset in `app.js`, or extend the app with a selector later.
