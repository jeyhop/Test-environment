# Bolivia Tax Folio Prototype

A lightweight, editable front-end prototype for presenting Bolivia's tax system as an interactive folio / skill tree.

## What is included

- `index.html` defines the application shell and fantasy folio layout.
- `styles.css` provides the ornate FF-inspired visual treatment.
- `app.js` renders the SVG folio, detail panel, revenue sandbox, and pan / zoom behavior.
- `data/countries/bolivia.js` contains the Bolivia-specific data model so you can update rates, notes, revenue values, labels, sources, and node positions without rewriting the UI.

## Run locally

Because the app uses ES modules, serve it from a simple static server:

```bash
python3 -m http.server 4173
```

Then open `http://127.0.0.1:4173` in a browser.

## Editing Bolivia

Open `data/countries/bolivia.js` and update:

- `lastUpdated`
- `notes`
- `sources`
- `revenueContext`
- any `group`
- any tax `rate`, `revenue`, `description`, `notes`, `source`, or `position`

The UI reads directly from that file, so the folio can be refreshed later with newer figures.

## Adding more countries later

Create another file in `data/countries/` with the same shape as `bolivia.js`, then switch the imported dataset in `app.js` or extend the app with a country selector.
