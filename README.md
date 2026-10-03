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

## Languages

English, Simplified Chinese and Spanish, chosen from the menu in the top bar (remembered per browser), or with `?lang=zh-CN` / `?lang=es` in a link. The first visit follows the browser's language.

Pages are written in English. `assets/i18n.js` (loaded first on every page) swaps text as it appears, including canvas text, using dictionaries in `i18n/<lang>/common.js` and `i18n/<lang>/<page>.js`. Keys are the English strings; numbers inside a string become `{0}`, `{1}`, so `"t = {0} fs"` covers every value. A key starting with `<html>` translates a short element with inline markup as a whole.

To find strings a dictionary is missing, open a page with `?lang=zh-CN` and run `[...I18N.missed]` in the console. When you add or change English text, add the same key to both dictionaries.

## Run locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Adding an experiment

New pages also need `<script src="../../assets/i18n.js" data-page="<slug>"></script>` first in `<head>` and `i18n/zh-CN/<slug>.js` + `i18n/es/<slug>.js` dictionaries.

1. Create `demos/<name>/index.html` and copy the header, `.bench`, `.controls` and `.explain` structure from an existing demo.
2. Link `../../assets/style.css` and `../../assets/lab.js` (canvas sizing, wavelength colours).
3. Add a card to the right category shelf in `index.html` and a "Real-world applications" section to the page.
4. Add the experiment to `assets/catalog.js`, write its predict/quiz/related entry in `assets/content/<category>.js`, include the four shared scripts at the end of the page (copy from any demo), and add its files to the precache list in `sw.js`.

## Publish

Settings → Pages → Deploy from branch → `main` / root.
