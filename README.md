# Science Wonders

Interactive experiments with the strangest, most beautiful ideas in science. Plain HTML, CSS and JavaScript with no build step and no backend, so it runs straight from GitHub Pages.

## Experiments

Twenty experiments in four categories, each with controls to play with, a short explainer and real-world applications.

- **Quantum world:** double slit, entanglement (Bell test), tunneling, quantum eraser, decoherence, Stern–Gerlach
- **Space and time:** time dilation, curved spacetime, gravitational waves, expanding universe, speed of light
- **Life and complexity:** chaos, entropy, evolution, emergence (Game of Life and flocking), epidemics
- **Mind-bending math:** Monty Hall, infinity, birthday paradox, Benford's law

## Run locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Adding an experiment

1. Create `demos/<name>/index.html` and copy the header, `.bench`, `.controls` and `.explain` structure from an existing demo.
2. Link `../../assets/style.css` and `../../assets/lab.js` (canvas sizing, wavelength colours).
3. Add a card to the right category shelf in `index.html` and a "Real-world applications" section to the page.

## Publish

Settings → Pages → Deploy from branch → `main` / root.
