# Science Wonders

Interactive experiments with the strangest, most beautiful ideas in science. Plain HTML, CSS and JavaScript with no build step and no backend, so it runs straight from GitHub Pages.

## Experiments

Thirty experiments in five categories, each with controls to play with, a short explainer and real-world applications.

- **Quantum world:** double slit, entanglement (Bell test), tunneling, quantum eraser, decoherence, Stern–Gerlach, path integral
- **Space and time:** time dilation, curved spacetime, gravitational waves, expanding universe, speed of light, ladder paradox
- **Life and complexity:** chaos, entropy, evolution, emergence (Game of Life and flocking), epidemics, Mandelbrot set
- **Mind-bending math:** Monty Hall, infinity, birthday paradox, Benford's law, Fourier series, prime spirals
- **Everyday wonders:** blue sky, rainbow, Doppler effect, resonance, tides

## Features on every experiment

`assets/wonders.js` adds these to each page, using content from `assets/content/<category>.js`:

- **Predict first:** a question to answer before the apparatus is revealed
- **Copy link to this setup:** the current control values travel in the query string (`?x.<control-id>=value`)
- **Quiz** (three questions) and **related experiments**
- **Guided tours** (`tours/`, defined in `assets/tours.js`), with a step bar when a page is opened with `?tour=<id>`
- **Presenter mode** for projectors
- **Embed** code (`?embed=1` shows only the apparatus and controls, with a link back)
- **Record a clip** of the experiment as a video (MP4 or WebM, up to 20 seconds, made in the browser)
- **Challenges:** three goals per experiment (`challenges` in `assets/content/*`), detected by the page script calling `WONDERS.challenge(id)`; stars show on the home page
- **Accessibility:** keyboard control for every canvas interaction, screen-reader narration (`WONDERS.describe`, `WONDERS.describer` behind a "Describe the scene" button) and optional sound cues (`WONDERS.sound`); these hooks are stubbed in `assets/lab.js`
- **Teacher packs** (`teach/index.html?e=<slug>`): printable worksheet and lesson plan rendered from `teach` in each content entry; the tours double as lesson sequences
- **Simple / Deeper** explanations: elements marked `data-depth="deep"` (including a "The math" section with `.eq` equation blocks) appear only in Deeper mode; `?depth=deep` links straight to it
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
4. Add the experiment to `assets/catalog.js`, write its predict/quiz/related entry in `assets/content/<category>.js`, include the shared scripts at the end of the page, add `challenges` and `teach` to its content entry (copy from any demo), and add its files to the precache list in `sw.js`.

## Publish

Settings → Pages → Deploy from branch → `main` / root.

## Licence

The framework is source-available under the [Business Source License 1.1](LICENSE). It is free for personal use,
for schools, universities, museums and other non-profits, on private networks, and for building experiments and
content; running it as a competing public science-experiments site is not allowed. Each version becomes MIT three
years after it is first published.

The experiment pages are MIT, and the explanations, quizzes, teacher packs, tours and translations are CC BY-SA 4.0,
so teachers may print, adapt and translate them. See [LICENSES.md](LICENSES.md) for every path, and
[CONTRIBUTING.md](CONTRIBUTING.md) before sending a change.
