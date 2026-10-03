# Science Wonders

Interactive experiments with the strangest, most beautiful ideas in science. Plain HTML, CSS and JavaScript with no build step and no backend, so it runs straight from GitHub Pages.

## Experiments

Twenty experiments in four categories, each with controls to play with, a short explainer and real-world applications.

- **Quantum world:** double slit, entanglement (Bell test), tunneling, quantum eraser, decoherence, Stern–Gerlach
- **Space and time:** time dilation, curved spacetime, gravitational waves, expanding universe, speed of light
- **Life and complexity:** chaos, entropy, evolution, emergence (Game of Life and flocking), epidemics
- **Mind-bending math:** Monty Hall, infinity, birthday paradox, Benford's law

## Features on every experiment

`assets/wonders.js` adds these to each page, using content from `assets/content/<category>.js`:

- **Predict first:** a question to answer before the apparatus is revealed
- **Copy link to this setup:** the current control values travel in the query string (`?x.<control-id>=value`)
- **Quiz** (three questions) and **related experiments**
- **Guided tours** (`tours/`, defined in `assets/tours.js`), with a step bar when a page is opened with `?tour=<id>`
- **Presenter mode** for projectors
- **Progress** (visited pages, predictions, quiz scores), stored only in the browser's localStorage

The site also has a web manifest and service worker (`sw.js`) so it can be installed and used offline. Link-preview images live in `assets/og/`.

## Run locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Adding an experiment

1. Create `demos/<name>/index.html` and copy the header, `.bench`, `.controls` and `.explain` structure from an existing demo.
2. Link `../../assets/style.css` and `../../assets/lab.js` (canvas sizing, wavelength colours).
3. Add a card to the right category shelf in `index.html` and a "Real-world applications" section to the page.
4. Add the experiment to `assets/catalog.js`, write its predict/quiz/related entry in `assets/content/<category>.js`, include the four shared scripts at the end of the page (copy from any demo), and add its files to the precache list in `sw.js`.

## Publish

Settings → Pages → Deploy from branch → `main` / root.
