# Science Wonders

Interactive experiments with the strangest, most beautiful ideas in science. Plain HTML, CSS and JavaScript with no build step and no backend, so it runs straight from GitHub Pages.

## Experiments

- **Double-slit experiment** (`demos/double-slit/`): fire photons one at a time, watch the interference pattern build, then switch on a which-path detector and watch it vanish.
- **Quantum entanglement** (`demos/entanglement/`): measure entangled photon pairs at angles you pick and run a Bell (CHSH) test against a hidden-instruction model.

## Run locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Adding an experiment

1. Create `demos/<name>/index.html` and copy the header, `.bench`, `.controls` and `.explain` structure from an existing demo.
2. Link `../../assets/style.css` and `../../assets/lab.js` (canvas sizing, wavelength colours).
3. Add a card to `index.html` and a link in each page's top bar.

## Publish

Settings → Pages → Deploy from branch → `main` / root.
