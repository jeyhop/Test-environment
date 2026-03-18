# Bolivia Tax Skill Tree Prototype

A lightweight, editable front-end prototype for presenting Bolivia's tax system as an interactive folio / skill tree.

## How it works

- `index.html` defines the application shell.
- `styles.css` provides the fantasy-game inspired visual design.
- `app.js` renders the SVG skill tree and the click-driven detail / revenue panels.
- `data/countries/bolivia.js` contains the Bolivia-specific data model so you can update rates, notes, positions, and revenue values without rewriting the UI.

## Run locally

Because the app uses ES modules, serve it from a simple static server:

```bash
python3 -m http.server 4173
```

Then open `http://127.0.0.1:4173` in a browser.

## Editing Bolivia

Open `data/countries/bolivia.js` and update:

- `lastUpdated`
- `revenueContext`
- any `group`
- any tax `rate`, `revenue`, `description`, `notes`, or `position`

## Adding more countries later

Create another file in `data/countries/` with the same shape as `bolivia.js`, then swap the imported dataset in `app.js` or extend the app with a country selector.
