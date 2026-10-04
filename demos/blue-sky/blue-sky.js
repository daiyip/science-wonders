(function () {
  const canvas = document.getElementById("bench");
  const $ = (id) => document.getElementById(id);
  const W_ = window.WONDERS;
  const tr = (s) => (window.I18N ? window.I18N.t(s) : s);

  // BEGIN-CORE
  // ---------- Light ----------
  // Wavelength grid: 380 to 700 nm in 10 nm steps.
  const LAM = [];
  for (let l = 380; l <= 700; l += 10) LAM.push(l);
  const NL = LAM.length;
  // Sunlight above the atmosphere, W m⁻² nm⁻¹, 10 nm averages of the measured
  // spectrum (rounded, after ASTM E-490). The dips near 390 and 430 nm are real.
  const SUN = [1.10, 1.07, 1.48, 1.66, 1.72, 1.62, 1.81, 2.01, 2.05, 2.02, 2.05, 1.94, 1.92, 1.92, 1.83, 1.88, 1.86,
    1.86, 1.79, 1.82, 1.80, 1.75, 1.75, 1.70, 1.67, 1.62, 1.61, 1.53, 1.53, 1.50, 1.47, 1.43, 1.42];

  // CIE 1931 colour matching functions, multi-lobe Gaussian fit (Wyman, Sloan & Shirley 2013).
  const lobe = (l, mu, s1, s2) => { const t = (l - mu) / (l < mu ? s1 : s2); return Math.exp(-0.5 * t * t); };
  const XB = LAM.map((l) => 1.056 * lobe(l, 599.8, 37.9, 31.0) + 0.362 * lobe(l, 442.0, 16.0, 26.7) - 0.065 * lobe(l, 501.1, 20.4, 26.2));
  const YB = LAM.map((l) => 0.821 * lobe(l, 568.8, 46.9, 40.5) + 0.286 * lobe(l, 530.9, 16.3, 31.1));
  const ZB = LAM.map((l) => 1.217 * lobe(l, 437.0, 11.8, 36.0) + 0.681 * lobe(l, 459.0, 26.0, 13.8));

  function toXYZ(spec) {
    let X = 0, Y = 0, Z = 0;
    for (let i = 0; i < NL; i++) { X += spec[i] * XB[i]; Y += spec[i] * YB[i]; Z += spec[i] * ZB[i]; }
    return [X * 10, Y * 10, Z * 10];
  }
  // XYZ to linear sRGB, then balanced so that sunlight above the air is white.
  function xyzToLin(X, Y, Z) {
    return [3.2406 * X - 1.5372 * Y - 0.4986 * Z, -0.9689 * X + 1.8758 * Y + 0.0415 * Z, 0.0557 * X - 0.204 * Y + 1.057 * Z];
  }
  const WB = (() => { const [X, Y, Z] = toXYZ(SUN); const c = xyzToLin(X, Y, Z); return c.map((v) => v / Y); })();
  const linBal = (X, Y, Z) => { const c = xyzToLin(X, Y, Z); return [c[0] / WB[0], c[1] / WB[1], c[2] / WB[2]]; };
  const gam = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);

  // Rayleigh optical depth of the whole air column at sea level, looking straight up
  // (λ in µm; the bracket is the small change of air's refractive index with colour).
  function tauRayleigh(nm) {
    const l = nm / 1000, l2 = l * l, l4 = l2 * l2;
    return 0.008569 / l4 * (1 + 0.0113 / l2 + 0.00013 / l4);
  }
  // Ozone absorption cross-section (Chappuis band), units of 1e-21 cm², rounded.
  const O3 = [0, 0, 0.01, 0.02, 0.04, 0.07, 0.12, 0.25, 0.32, 0.5, 0.7, 1.0, 1.3, 1.6, 2.0, 2.5, 3.0, 3.3, 3.6, 4.4, 4.6, 4.6,
    5.1, 4.9, 4.2, 3.6, 2.9, 2.4, 2.0, 1.6, 1.4, 1.1, 0.9];
  // Optical depth of a 300 Dobson-unit ozone column (8.07e18 molecules per cm²).
  const tauOzone = (i) => O3[i] * 0.00807;

  // Kasten and Young (1989) relative air mass for a sun h degrees above the horizon.
  const airMassKY = (h) => 1 / (Math.sin(h * Math.PI / 180) + 0.50572 * Math.pow(h + 6.07995, -1.6364));
  // Air mass of a uniform spherical shell (used for Mars): y = R / H.
  const airMassShell = (h, y) => { const c = Math.sin(h * Math.PI / 180); return Math.sqrt(y * y * c * c + 2 * y + 1) - y * c; };

  // ---------- Atmospheres ----------
  // Returns everything the sky integrator needs. k scales the amount of scatterers.
  function scene(planet, size, k) {
    const s = { planet, size, k, NL };
    const tR = LAM.map(tauRayleigh);
    if (planet === "mars") {
      // Qualitative Mars: thin CO2 (about 2.6% of Earth's Rayleigh depth) plus fine dust
      // that absorbs blue and scatters forward, more strongly so for blue.
      Object.assign(s, { R: 3390, Htop: 80, HR: 11, HM: 11, sunF: 0.43, sunDeg: 0.35 });
      s.tauR = tR.map((t) => t * 0.026 * k);
      s.tauM = LAM.map(() => 0.6 * k);
      s.omega = LAM.map((l) => 0.97 - 0.37 / (1 + Math.exp((l - 520) / 35)));
      s.g = LAM.map((l) => 0.62 + 0.24 * (700 - l) / 320);
      s.tauO = LAM.map(() => 0);
    } else {
      Object.assign(s, { R: 6371, Htop: 60, HR: 8, HM: 1.5, sunF: 1, sunDeg: 0.53 });
      if (size === "large") {
        // Droplets a few micrometres across: about the same for every colour, strongly forward.
        s.tauR = LAM.map(() => 0);
        s.tauM = LAM.map(() => 0.5 * k);
        s.omega = LAM.map(() => 1);
        s.g = LAM.map(() => 0.85);
        s.tauO = LAM.map(() => 0);
      } else {
        s.tauR = tR.map((t) => t * k);
        s.tauM = LAM.map(() => 0);
        s.omega = LAM.map(() => 1);
        s.g = LAM.map(() => 0);
        s.tauO = LAM.map((_, i) => tauOzone(i) * k);
      }
    }
    s.tau = LAM.map((_, i) => s.tauR[i] + s.tauM[i] + s.tauO[i]);
    // Coefficients per km at the ground, from optical depth ÷ scale height.
    s.bR = s.tauR.map((t) => t / s.HR);
    s.bMe = s.tauM.map((t) => t / s.HM);
    s.bMs = s.tauM.map((t, i) => t * s.omega[i] / s.HM);
    s.bO = s.tauO.map((t) => t / 15); // ozone: a layer peaking at 25 km, 15 km half-width
    s.F = SUN.map((f) => f * s.sunF);
    return s;
  }
  function airMass(s, h) {
    return s.planet === "mars" ? airMassShell(h, s.R / s.HM) : airMassKY(h);
  }
  // Fraction of each colour that comes straight through from the sun.
  function transmitted(s, h) {
    const m = airMass(s, h);
    return s.tau.map((t) => Math.exp(-t * m));
  }

  // Single scattering in a spherical atmosphere with exponential density.
  // Fills a grid of view directions (azimuth from the sun, elevation) with XYZ colour.
  function computeSky(p) {
    const NL = p.F.length, NX = p.NX, NY = p.NY;
    const R = p.R, Rt = p.R + p.Htop, r0 = p.R + 0.002;
    const h = p.sunEl * Math.PI / 180, sx = Math.cos(h), sz = Math.sin(h);
    const NV = 26, NS = 7;
    const acc = new Float64Array(NL), PM = new Float64Array(NL);
    const col = [0, 0, 0];
    const ozone = (alt) => Math.max(0, 1 - Math.abs(alt - 25) / 15);
    function sunColumn(px, py, pz) {
      const r2 = px * px + py * py + pz * pz;
      const b = px * sx + pz * sz;
      if (b < 0 && b * b - (r2 - R * R) > 0) return false; // the planet is in the way
      const tmax = -b + Math.sqrt(Math.max(0, b * b - (r2 - Rt * Rt)));
      let cR = 0, cM = 0, cO = 0;
      for (let k = 0; k < NS; k++) {
        const u = (k + 0.5) / NS, t = tmax * u * u, ds = tmax * 2 * u / NS;
        const qx = px + t * sx, qz = pz + t * sz;
        const alt = Math.sqrt(qx * qx + py * py + qz * qz) - R;
        cR += Math.exp(-alt / p.HR) * ds; cM += Math.exp(-alt / p.HM) * ds; cO += ozone(alt) * ds;
      }
      col[0] = cR; col[1] = cM; col[2] = cO;
      return true;
    }
    function radiance(eDeg, aDeg) {
      const e = eDeg * Math.PI / 180, a = aDeg * Math.PI / 180;
      const ce = Math.cos(e), dx = ce * Math.cos(a), dy = ce * Math.sin(a), dz = Math.sin(e);
      const mu = dx * sx + dz * sz;
      const PR = 3 / (16 * Math.PI) * (1 + mu * mu);
      for (let l = 0; l < NL; l++) {
        const g = p.g[l];
        PM[l] = (1 - g * g) / (4 * Math.PI * Math.pow(1 + g * g - 2 * g * mu, 1.5));
      }
      const b = r0 * dz;
      const tmax = -b + Math.sqrt(b * b - (r0 * r0 - Rt * Rt));
      acc.fill(0);
      let cRv = 0, cMv = 0, cOv = 0;
      for (let i = 0; i < NV; i++) {
        const u = (i + 0.5) / NV, t = tmax * u * u, ds = tmax * 2 * u / NV;
        const px = t * dx, py = t * dy, pz = r0 + t * dz;
        const alt = Math.sqrt(px * px + py * py + pz * pz) - R;
        const rR = Math.exp(-alt / p.HR), rM = Math.exp(-alt / p.HM);
        const rO = ozone(alt);
        const vR = cRv + rR * ds * 0.5, vM = cMv + rM * ds * 0.5, vO = cOv + rO * ds * 0.5;
        cRv += rR * ds; cMv += rM * ds; cOv += rO * ds;
        if (!sunColumn(px, py, pz)) continue;
        const sR = vR + col[0], sM = vM + col[1], sO = vO + col[2];
        for (let l = 0; l < NL; l++) {
          const att = Math.exp(-(p.bR[l] * sR + p.bMe[l] * sM + p.bO[l] * sO));
          acc[l] += ds * att * (p.bR[l] * rR * PR + p.bMs[l] * rM * PM[l]);
        }
      }
      for (let l = 0; l < NL; l++) acc[l] *= p.F[l];
      return acc;
    }
    const xyz = new Float32Array((NX + 1) * NY * 3);
    for (let j = 0; j < NY; j++) {
      const u = j / (NY - 1), e = 90 * (0.3 * u + 0.7 * u * u);
      for (let i = 0; i <= NX; i++) {
        const a = -180 + 360 * i / NX;
        // The sky is mirror-symmetric about the sun's azimuth.
        if (i > NX / 2) { const m = (j * (NX + 1) + (NX - i)) * 3, o = (j * (NX + 1) + i) * 3; xyz[o] = xyz[m]; xyz[o + 1] = xyz[m + 1]; xyz[o + 2] = xyz[m + 2]; continue; }
        const L = radiance(e, a);
        let X = 0, Y = 0, Z = 0;
        for (let l = 0; l < NL; l++) { X += L[l] * p.XB[l]; Y += L[l] * p.YB[l]; Z += L[l] * p.ZB[l]; }
        const o = (j * (NX + 1) + i) * 3;
        xyz[o] = X * 10; xyz[o + 1] = Y * 10; xyz[o + 2] = Z * 10;
      }
    }
    const zen = Float64Array.from(radiance(90, 0));
    const near = Float64Array.from(radiance(Math.min(89, p.sunEl + 5), 0));
    const horizonAway = Float64Array.from(radiance(3, 180));
    return { id: p.id, xyz, zen, near, horizonAway };
  }
  // END-CORE

  // ---------- Sky worker ----------
  // The sky integral runs in a Web Worker made from a Blob, so dragging the
  // sliders never blocks drawing. Falls back to the main thread if needed.
  const NX = 96, NY = 36;
  let worker = null;
  try {
    const src = "const computeSky = " + computeSky.toString() + ";\nonmessage = (e) => { const r = computeSky(e.data); postMessage(r, [r.xyz.buffer]); };";
    worker = new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
    worker.onmessage = (e) => receive(e.data);
    worker.onerror = () => { worker = null; busy = false; requestSky(); };
  } catch (e) { worker = null; }

  // ---------- State ----------
  const state = {
    elev: 30, size: "small", planet: "earth", k: 1, eye: false, photons: true,
    running: !Lab.reducedMotion,
  };
  let sc = scene("earth", "small", 1);
  let sky = null;              // latest result from the integrator
  let skyImg = null;           // panorama rendered at display size
  let jobId = 0, busy = false, dirty = true;
  let derived = null;          // numbers shown in the readouts

  function params() {
    return {
      id: ++jobId, NX, NY, sunEl: state.elev, R: sc.R, Htop: sc.Htop, HR: sc.HR, HM: sc.HM,
      bR: sc.bR, bMe: sc.bMe, bMs: sc.bMs, bO: sc.bO, g: sc.g, F: sc.F, XB, YB, ZB,
    };
  }
  function requestSky() {
    dirty = true;
    if (busy) return;
    dirty = false;
    const p = params();
    if (worker) { busy = true; worker.postMessage(p); }
    else { busy = true; setTimeout(() => receive(computeSky(p)), 0); }
  }
  function receive(r) {
    busy = false;
    sky = r;
    skyImg = null;
    updateDerived();
    if (dirty) requestSky();
  }

  // ---------- Layout (logical pixels) ----------
  // Wide: a 360° panorama on top, side view and spectrum below. Narrow (phones):
  // logical width = displayed width, a 180° panorama and the panels stacked.
  let W = 960, H = 640, narrow = false, ctx;
  let PAN, SV, CH, AZ = 180, GROUND = 26;
  function layout() {
    const cw = Math.round(canvas.clientWidth || canvas.parentElement.clientWidth || 960);
    narrow = cw < 760;
    if (!narrow) {
      W = 960;
      AZ = 180;
      PAN = { x: 20, y: 34, w: 920, h: 230 };
      GROUND = 30;
      SV = { x: 20, y: 334, w: 450, h: 270 };
      CH = { x: 552, y: 350, w: 384, h: 216 };
      H = 640;
    } else {
      W = Math.max(300, cw);
      AZ = 90;
      GROUND = 24;
      const pw = W - 20;
      PAN = { x: 10, y: 44, w: pw, h: Math.round(pw / 2) };
      const y1 = PAN.y + PAN.h + GROUND + 56;
      SV = { x: 10, y: y1, w: W - 20, h: Math.round(Math.min(300, Math.max(230, W * 0.72))) };
      const y2 = SV.y + SV.h + 64;
      CH = { x: 44, y: y2, w: W - 44 - 14, h: Math.round(Math.min(220, W * 0.55)) };
      H = Math.round(CH.y + CH.h + 112);
    }
    minFont = narrow ? 11 : Math.max(10, Math.ceil(10.4 * W / cw));
    ctx = Lab.setupCanvas(canvas, W, H);
    canvas.style.aspectRatio = W + " / " + H;
    skyImg = null;
    geom = null;
  }

  // ---------- Colour of the scene ----------
  // Exposure adapts to the brightness of the sky, partly, the way eyes do,
  // so a sunset looks darker than noon but is still visible.
  // Exposure is keyed to the median brightness of the upper sky (20° and higher).
  const REF_Y = 1.67; // that median for Earth air with the sun 45° up (measured from this model)
  let exposure = 1;
  function upperMedian(xyz) {
    const vals = [];
    for (let j = 0; j < NY; j++) {
      const u = j / (NY - 1), e = 90 * (0.3 * u + 0.7 * u * u);
      if (e < 20) continue;
      for (let i = 0; i < NX; i++) vals.push(xyz[(j * (NX + 1) + i) * 3 + 1]);
    }
    vals.sort((a, b) => a - b);
    return vals[vals.length >> 1] || 0;
  }
  function setExposure() {
    const med = Math.max(upperMedian(sky.xyz), REF_Y * 1e-3);
    exposure = 0.32 / (Math.pow(REF_Y, 0.4) * Math.pow(med, 0.6));
  }
  // Linear, balanced RGB to display bytes. A soft shoulder that mostly keeps the
  // hue (so a bright blue glow stays blue) with a little bleaching toward white.
  function tone(lin, ex, out) {
    // A modest saturation boost (×1.3 around the luminance) for the screen.
    const Y = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
    const r = Math.max(0, Y + SAT * (lin[0] - Y)) * ex, g = Math.max(0, Y + SAT * (lin[1] - Y)) * ex, b = Math.max(0, Y + SAT * (lin[2] - Y)) * ex;
    const m = Math.max(r, g, b, 1e-9), f = 0.7 * (1 - Math.exp(-m)) / m;
    out[0] = 255 * gam(Math.min(1, r * f + 0.3 * (1 - Math.exp(-r))));
    out[1] = 255 * gam(Math.min(1, g * f + 0.3 * (1 - Math.exp(-g))));
    out[2] = 255 * gam(Math.min(1, b * f + 0.3 * (1 - Math.exp(-b))));
    return out;
  }
  const SAT = 1.3;
  function display(lin, ex) { return tone(lin, ex, [0, 0, 0]).map(Math.round); }
  function specToDisplay(spec, ex) { const [X, Y, Z] = toXYZ(spec); return display(linBal(X, Y, Z), ex); }
  // Colour of the sun's disk: hue of the transmitted light at full brightness.
  function sunColour(T) {
    const spec = SUN.map((f, i) => f * T[i]);
    const [X, Y, Z] = toXYZ(spec);
    const c = linBal(X, Y, Z).map((v) => Math.max(0, v));
    const m = Math.max(1e-9, ...c);
    return c.map((v) => Math.round(255 * gam(Math.min(1, v / m))));
  }

  function hsl(rgb) {
    const [r, g, b] = rgb.map((v) => v / 255);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    let h = 0, s = 0;
    if (mx > mn) {
      const d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60;
    }
    return { h, s, l };
  }
  // A plain colour word. Each word appears in whole sentences for translation.
  function skyName(rgb) {
    const { h, s, l } = hsl(rgb);
    if (l < 0.07) return "almost black";
    if (s < 0.12 || l > 0.93) return l > 0.62 ? "white" : "grey";
    if (h >= 185 && h < 255) return s > 0.6 && l < 0.6 ? "deep blue" : l > 0.72 || s < 0.32 ? "pale blue" : "blue";
    if (h >= 255 && h < 330) return "violet";
    if (h >= 70 && h < 185) return "pale green";
    if (h >= 18 && h < 70) return s < 0.5 ? "butterscotch" : h < 42 ? "orange" : "yellow";
    return "red";
  }
  function sunName(rgb) {
    const { h, s } = hsl(rgb);
    if (s < 0.25) return h > 150 && h < 260 ? "bluish white" : "white";
    if (h > 150 && h < 260) return "bluish white";
    if (h >= 44 && h < 75) return s < 0.6 ? "yellowish white" : "yellow";
    if (h >= 22 && h < 44) return "orange";
    return "red";
  }

  function updateDerived() {
    const T = transmitted(sc, state.elev);
    const i450 = LAM.indexOf(450), i700 = LAM.indexOf(700);
    const d = {
      m: airMass(sc, state.elev), T,
      t450: T[i450], t700: T[i700],
      ratio: (sc.tauR[i450] + sc.tauM[i450] * sc.omega[i450]) / Math.max(1e-12, sc.tauR[i700] + sc.tauM[i700] * sc.omega[i700]),
      sunRGB: sunColour(T),
    };
    if (sky) {
      setExposure();
      d.zenRGB = specToDisplay(sky.zen, exposure);
      d.nearRGB = specToDisplay(sky.near, exposure);
      d.awayRGB = specToDisplay(sky.horizonAway, exposure);
      d.zenName = skyName(d.zenRGB);
      d.sunName = sunName(d.sunRGB);
      // Chromaticity: how blue the sky is beside the sun versus overhead (for Mars).
      const blueness = (s) => { const [X, Y, Z] = toXYZ(s); const c = linBal(X, Y, Z).map((v) => Math.max(0, v)); return c[2] / Math.max(1e-12, c[0] + c[1] + c[2]); };
      d.nearBlue = blueness(sky.near);
      d.zenBlue = blueness(sky.zen);
      // Peak of the scattered spectrum overhead, and of it weighted by the eye.
      let pk = 0, pe = 0;
      for (let i = 0; i < NL; i++) {
        if (sky.zen[i] > sky.zen[pk]) pk = i;
        if (sky.zen[i] * YB[i] > sky.zen[pe] * YB[pe]) pe = i;
      }
      d.peak = LAM[pk]; d.peakEye = LAM[pe];
      d.zenOK = sky.zen.some((v) => v > 0);
    }
    derived = d;
    updateReadouts();
    checkEvents();
  }

  // ---------- Panorama ----------
  const elevToU = (e) => (-0.3 + Math.sqrt(0.09 + 2.8 * e / 90)) / 1.4;
  function buildSkyImage() {
    const pw = Math.max(2, Math.round(PAN.w)), ph = Math.max(2, Math.round(PAN.h));
    const off = document.createElement("canvas");
    off.width = pw; off.height = ph;
    const o = off.getContext("2d");
    const img = o.createImageData(pw, ph);
    const data = img.data, xyz = sky.xyz, ex = exposure;
    const rowU = new Float32Array(ph);
    for (let y = 0; y < ph; y++) rowU[y] = elevToU(90 * (1 - (y + 0.5) / ph)) * (NY - 1);
    const c = [0, 0, 0], t3 = [0, 0, 0];
    for (let x = 0; x < pw; x++) {
      const az = -AZ + (2 * AZ) * (x + 0.5) / pw;
      const fx = (az + 180) / 360 * NX;
      const i0 = Math.min(NX - 1, Math.floor(fx)), ax = fx - i0;
      for (let y = 0; y < ph; y++) {
        const fy = rowU[y];
        const j0 = Math.min(NY - 2, Math.floor(fy)), ay = fy - j0;
        for (let k = 0; k < 3; k++) {
          const a = xyz[(j0 * (NX + 1) + i0) * 3 + k], b = xyz[(j0 * (NX + 1) + i0 + 1) * 3 + k];
          const cc = xyz[((j0 + 1) * (NX + 1) + i0) * 3 + k], dd = xyz[((j0 + 1) * (NX + 1) + i0 + 1) * 3 + k];
          c[k] = (a * (1 - ax) + b * ax) * (1 - ay) + (cc * (1 - ax) + dd * ax) * ay;
        }
        const lin = linBal(c[0], c[1], c[2]);
        const p = (y * pw + x) * 4;
        const dith = (Math.random() - 0.5) * 0.8;
        tone(lin, ex, t3);
        for (let k = 0; k < 3; k++) data[p + k] = Math.max(0, Math.min(255, t3[k] + dith));
        data[p + 3] = 255;
      }
    }
    o.putImageData(img, 0, 0);
    skyImg = off;
  }

  // Smallest logical font size that still shows at 10 CSS px or more on screen.
  let minFont = 11;
  const fontMono = (n) => Math.max(minFont, n) + "px 'IBM Plex Mono', ui-monospace, monospace";
  const fontSans = (n) => Math.max(minFont, n) + "px 'IBM Plex Sans', system-ui, sans-serif";

  function pill(text, x, y, align, colour) {
    ctx.textAlign = align;
    const w = ctx.measureText(text).width;
    const x0 = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
    ctx.fillStyle = "rgba(5,8,14,0.55)";
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x0 - 6, y - 13, w + 12, 18, 9); else ctx.rect(x0 - 6, y - 13, w + 12, 18);
    ctx.fill();
    ctx.fillStyle = colour || "#e9eef7";
    ctx.fillText(text, x, y);
  }

  function drawPanorama() {
    const P = PAN;
    ctx.font = fontMono(13);
    ctx.fillStyle = "#7f8ea6";
    ctx.textAlign = "left";
    fitText(narrow ? "THE SKY AROUND YOU, HALF PANORAMA" : "THE SKY AROUND YOU, FULL 360° PANORAMA", P.x, P.y - 12, W - 30, narrow);

    if (sky && !skyImg) buildSkyImage();
    if (skyImg) {
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(skyImg, P.x, P.y, P.w, P.h);
    } else {
      ctx.fillStyle = "#0a0f19"; ctx.fillRect(P.x, P.y, P.w, P.h);
    }
    const toX = (az) => P.x + (az + AZ) / (2 * AZ) * P.w;
    const toY = (e) => P.y + P.h * (1 - e / 90);

    // Sun disk, drawn larger than life (the real one is about half a degree).
    if (derived) {
      const sx = toX(0), sy = toY(state.elev);
      const [r, g, b] = derived.sunRGB;
      const fade = Math.min(1, 0.35 + 0.65 * Math.min(1, derived.T[LAM.indexOf(560)] * 1.6));
      ctx.save();
      ctx.beginPath(); ctx.rect(P.x, P.y, P.w, P.h); ctx.clip();
      const glow = ctx.createRadialGradient(sx, sy, 2, sx, sy, narrow ? 40 : 54);
      glow.addColorStop(0, `rgba(${r},${g},${b},${0.55 * fade})`);
      glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = glow;
      ctx.fillRect(sx - 60, sy - 60, 120, 120);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.beginPath(); ctx.arc(sx, sy, narrow ? 7 : 9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(5,8,14,0.22)";
      ctx.stroke();
      ctx.restore();
    }

    // Ground
    const gy = P.y + P.h;
    const gg = ctx.createLinearGradient(0, gy, 0, gy + GROUND);
    const tint = derived && derived.awayRGB ? derived.awayRGB : [20, 26, 36];
    gg.addColorStop(0, `rgb(${Math.round(18 + tint[0] * 0.12)},${Math.round(22 + tint[1] * 0.12)},${Math.round(28 + tint[2] * 0.12)})`);
    gg.addColorStop(1, "#070a10");
    ctx.fillStyle = gg;
    ctx.fillRect(P.x, gy, P.w, GROUND);
    // A low line of hills so it reads as a landscape.
    ctx.fillStyle = "#0b1018";
    ctx.beginPath();
    ctx.moveTo(P.x, gy + 1);
    for (let x = 0; x <= P.w; x += 6) {
      const az = -AZ + 2 * AZ * x / P.w;
      const hgt = 2.2 + 1.6 * Math.sin(az * 0.07 + 1) + 1.1 * Math.sin(az * 0.19 + 2) + 0.7 * Math.sin(az * 0.41);
      ctx.lineTo(P.x + x, gy - Math.max(0, hgt) * (narrow ? 0.8 : 1));
    }
    ctx.lineTo(P.x + P.w, gy + 1);
    ctx.closePath(); ctx.fill();

    // Labels
    ctx.font = fontMono(11);
    const lc = "#c9d4e3";
    pill("overhead", P.x + P.w - (narrow ? 4 : 8), P.y + 18, "right", lc);
    ctx.textAlign = "left";
    ctx.font = fontMono(10);
    for (const e of [30, 60]) {
      const y = toY(e);
      ctx.strokeStyle = "rgba(5,8,14,0.25)";
      ctx.setLineDash([2, 6]);
      ctx.beginPath(); ctx.moveTo(P.x, y + 0.5); ctx.lineTo(P.x + P.w, y + 0.5); ctx.stroke();
      ctx.setLineDash([]);
      pill(e + "°", P.x + 6, y + 4, "left", lc);
    }
    ctx.font = fontMono(11);
    ctx.fillStyle = "#97a6b9";
    ctx.textAlign = "center";
    const ly = gy + GROUND - (narrow ? 6 : 9);
    ctx.fillText("toward the sun", toX(0), ly);
    if (!narrow) {
      ctx.textAlign = "left"; ctx.fillText("away from the sun", P.x + 6, ly);
      ctx.textAlign = "right"; ctx.fillText("away from the sun", P.x + P.w - 6, ly);
      ctx.textAlign = "center";
      ctx.fillText("side", toX(-90), ly); ctx.fillText("side", toX(90), ly);
    } else {
      ctx.textAlign = "left"; ctx.fillText("side", P.x + 4, ly);
      ctx.textAlign = "right"; ctx.fillText("side", P.x + P.w - 4, ly);
    }
    ctx.strokeStyle = "#1f2a3f";
    ctx.strokeRect(P.x + 0.5, P.y + 0.5, P.w - 1, P.h + GROUND - 1);
  }

  // ---------- Side view with photons ----------
  // Not to scale: the air layer is drawn far thicker than it is. Each photon's
  // chance of being scattered on the way down uses the real optical depth
  // τ(λ) × air mass; only where along the path it happens is schematic.
  let geom = null;
  function sideGeom() {
    const S = SV;
    const Rd = S.w * 2.4;
    const gy = S.y + S.h - 26;
    const cx = S.x + S.w * (narrow ? 0.62 : 0.6);
    const Td = (S.h - 26) * 0.7;
    return { cx, cy: gy + Rd, Rd, Td, ox: cx, oy: gy, Hd: Td * 0.32 };
  }
  // Where a line p + t v meets a circle (centre c, radius r): both t values or null.
  function hitCircle(px, py, vx, vy, cx, cy, r) {
    const dx = px - cx, dy = py - cy;
    const b = dx * vx + dy * vy, c = dx * dx + dy * dy - r * r;
    const disc = b * b - c;
    if (disc < 0) return null;
    const s = Math.sqrt(disc);
    return [-b - s, -b + s];
  }

  const photons = [];
  const tally = { blueN: 0, blueS: 0, redN: 0, redS: 0, absN: 0, all: 0 };
  function resetTally() { tally.blueN = tally.blueS = tally.redN = tally.redS = tally.absN = tally.all = 0; }

  // Sample a wavelength from the sun's spectrum above the air.
  const SUN_CDF = (() => { const c = []; let s = 0; for (const f of SUN) { s += f; c.push(s); } return c.map((v) => v / s); })();
  function sampleLam() {
    const u = Math.random();
    let i = 0;
    while (i < NL - 1 && SUN_CDF[i] < u) i++;
    return LAM[i] + (Math.random() - 0.5) * 10;
  }
  const RGB_CACHE = new Map();
  function lamRGB(l) {
    const k = Math.round(l / 5) * 5;
    if (!RGB_CACHE.has(k)) RGB_CACHE.set(k, Lab.wavelengthToRGB(Math.max(380, Math.min(700, k))));
    return RGB_CACHE.get(k);
  }
  // Optical depth for a single wavelength, interpolated from the grid.
  function interp(arr, l) {
    const f = Math.max(0, Math.min(NL - 1.001, (l - 380) / 10)), i = Math.floor(f), a = f - i;
    return arr[i] * (1 - a) + arr[i + 1] * a;
  }

  // Scattering angle from the phase function: Rayleigh (1 + cos²Θ) or Henyey–Greenstein.
  function sampleAngle(g) {
    if (g === 0) {
      for (;;) { const c = Math.random() * 2 - 1; if (Math.random() * 2 < 1 + c * c) return Math.acos(c); }
    }
    const s = (1 - g * g) / (1 - g + 2 * g * Math.random());
    return Math.acos(Math.max(-1, Math.min(1, (1 + g * g - s * s) / (2 * g))));
  }

  function spawn() {
    if (!geom) geom = sideGeom();
    const G = geom;
    const h = state.elev * Math.PI / 180;
    const vx = Math.cos(h), vy = Math.sin(h);           // heading down and to the right
    const nx = -vy, ny = vx;                              // across the beam
    const spread = Math.min(SV.w, SV.h) * 0.42;
    const off = (Math.random() * 2 - 1) * spread;
    const bx = G.ox + nx * off, by = G.oy + ny * off;     // a point on this ray near the observer
    const outer = hitCircle(bx, by, vx, vy, G.cx, G.cy, G.Rd + G.Td);
    if (!outer) return;
    const inner = hitCircle(bx, by, vx, vy, G.cx, G.cy, G.Rd);
    const tIn = outer[0];
    const tOut = inner ? inner[0] : outer[1];
    if (tOut <= tIn) return;
    const lam = sampleLam();
    // Fate decided with the real numbers for this colour and this sun height.
    const m = airMass(sc, state.elev);
    const tauR = interp(sc.tauR, lam), tauM = interp(sc.tauM, lam);
    const tauTot = tauR + tauM;
    let fate = "pass", at = 0, g = 0;
    if (Math.random() > Math.exp(-tauTot * m)) {
      // Where along the drawn path: weighted by the drawn air density.
      const N = 40, w = [];
      let sum = 0;
      for (let k = 0; k < N; k++) {
        const t = tIn + (tOut - tIn) * (k + 0.5) / N;
        const x = bx + vx * t - G.cx, y = by + vy * t - G.cy;
        const alt = Math.max(0, Math.hypot(x, y) - G.Rd);
        sum += Math.exp(-alt / (sc.size === "large" && sc.planet === "earth" ? G.Hd * 0.45 : G.Hd)); w.push(sum);
      }
      const u = Math.random() * sum;
      let k = 0;
      while (k < N - 1 && w[k] < u) k++;
      at = (tOut - tIn) * (k + Math.random()) / N;
      const byMolecule = Math.random() * tauTot < tauR;
      if (byMolecule) { fate = "scatter"; g = 0; }
      else {
        const om = interp(sc.omega, lam);
        fate = Math.random() < om ? "scatter" : "absorb";
        g = interp(sc.g, lam);
      }
    }
    // Tally the outcome now (the animation just shows it).
    tally.all++;
    if (lam < 495) { tally.blueN++; if (fate !== "pass") tally.blueS++; }
    else if (lam > 600) { tally.redN++; if (fate !== "pass") tally.redS++; }
    if (fate === "absorb") tally.absN++;
    // Show it from where its path enters the panel; a low sun's path starts far off to the left.
    let start = Math.max(tIn, (SV.x + 1 - bx) / vx);
    if (vy > 1e-6) start = Math.max(start, (SV.y + 1 - by) / vy);
    if (start >= tOut) return;
    const d0 = start - tIn;
    if (fate !== "pass" && at < d0) return; // it was scattered before reaching the picture
    photons.push({ x: bx + vx * start, y: by + vy * start, vx, vy, lam, rgb: lamRGB(lam), d: d0, at, len: tOut - tIn, fate, g, phase: 0, life: 1, trail: [] });
  }

  const SPEED = () => Math.max(SV.w, SV.h) * 0.75; // px per second
  function stepPhotons(dt) {
    const sp = SPEED() * dt;
    for (let i = photons.length - 1; i >= 0; i--) {
      const p = photons[i];
      p.trail.push(p.x, p.y);
      if (p.trail.length > 12) p.trail.splice(0, 2);
      if (p.phase === 0) {
        const lim = p.fate === "pass" ? p.len : p.at;
        const go = Math.min(sp, lim - p.d);
        p.x += p.vx * go; p.y += p.vy * go; p.d += go;
        if (p.d >= lim - 1e-6) {
          if (p.fate === "pass") { p.phase = 2; p.life = 0.5; flashes.push({ x: p.x, y: p.y, rgb: p.rgb, life: 0.5, ring: false }); }
          else if (p.fate === "absorb") { p.phase = 2; p.life = 0; flashes.push({ x: p.x, y: p.y, rgb: [120, 70, 40], life: 0.6, ring: true }); }
          else {
            const th = sampleAngle(p.g) * (Math.random() < 0.5 ? -1 : 1);
            const c = Math.cos(th), s = Math.sin(th);
            const nvx = p.vx * c - p.vy * s, nvy = p.vx * s + p.vy * c;
            p.vx = nvx; p.vy = nvy; p.phase = 1; p.life = 1;
            flashes.push({ x: p.x, y: p.y, rgb: p.rgb, life: 0.35, ring: true });
            if (Math.random() < 0.15) W_.sound("tick", { pitch: Math.max(0, Math.min(1, (700 - p.lam) / 320)) });
          }
        }
      } else if (p.phase === 1) {
        p.x += p.vx * sp; p.y += p.vy * sp;
        p.life -= dt * 0.8;
        const G = geom;
        if (Math.hypot(p.x - G.cx, p.y - G.cy) < G.Rd) p.life = 0;
      } else {
        p.life -= dt;
      }
      if (p.life <= 0 || p.x < SV.x - 20 || p.x > SV.x + SV.w + 20 || p.y < SV.y - 20 || p.y > SV.y + SV.h + 20) photons.splice(i, 1);
    }
    for (let i = flashes.length - 1; i >= 0; i--) { flashes[i].life -= dt; if (flashes[i].life <= 0) flashes.splice(i, 1); }
  }
  const flashes = [];

  function drawSide() {
    const S = SV;
    if (!geom) geom = sideGeom();
    const G = geom;
    ctx.font = fontMono(13);
    ctx.fillStyle = "#7f8ea6";
    ctx.textAlign = "left";
    fitText("SUNLIGHT CROSSING THE AIR (NOT TO SCALE)", S.x, S.y - 12, S.w, narrow);

    ctx.save();
    ctx.beginPath(); ctx.rect(S.x, S.y, S.w, S.h); ctx.clip();
    ctx.fillStyle = "#05080e"; ctx.fillRect(S.x, S.y, S.w, S.h);
    // Air layer, tinted with the colour of the sky overhead, fading upward.
    const tint = derived && derived.zenRGB && state.k > 0 ? derived.zenRGB : [40, 50, 70];
    const ag = ctx.createRadialGradient(G.cx, G.cy, G.Rd, G.cx, G.cy, G.Rd + G.Td);
    const a0 = state.k > 0 ? Math.min(0.5, 0.22 + 0.1 * state.k) : 0;
    ag.addColorStop(0, `rgba(${tint[0]},${tint[1]},${tint[2]},${a0})`);
    ag.addColorStop(0.45, `rgba(${tint[0]},${tint[1]},${tint[2]},${a0 * 0.3})`);
    ag.addColorStop(1, `rgba(${tint[0]},${tint[1]},${tint[2]},0)`);
    ctx.fillStyle = ag;
    ctx.beginPath(); ctx.arc(G.cx, G.cy, G.Rd + G.Td, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(143,166,255,0.25)";
    ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.arc(G.cx, G.cy, G.Rd + G.Td, Math.PI, 2 * Math.PI); ctx.stroke();
    ctx.setLineDash([]);
    // Ground
    ctx.fillStyle = "#0e1520";
    ctx.beginPath(); ctx.arc(G.cx, G.cy, G.Rd, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#2a3852";
    ctx.beginPath(); ctx.arc(G.cx, G.cy, G.Rd, Math.PI, 2 * Math.PI); ctx.stroke();

    // Path of the sunlight that reaches the observer.
    const h = state.elev * Math.PI / 180;
    const vx = Math.cos(h), vy = Math.sin(h);
    const hit = hitCircle(G.ox, G.oy, vx, vy, G.cx, G.cy, G.Rd + G.Td);
    if (hit) {
      const t0 = hit[0];
      ctx.strokeStyle = "rgba(240,179,90,0.45)";
      ctx.setLineDash([6, 5]);
      ctx.beginPath(); ctx.moveTo(G.ox + vx * t0, G.oy + vy * t0); ctx.lineTo(G.ox, G.oy); ctx.stroke();
      ctx.setLineDash([]);
    }

    // Flashes and photons
    for (const f of flashes) {
      const [r, g, b] = f.rgb;
      ctx.strokeStyle = `rgba(${r},${g},${b},${Math.min(1, f.life * 2)})`;
      ctx.fillStyle = `rgba(${r},${g},${b},${Math.min(0.8, f.life * 1.6)})`;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.ring ? 3 + (0.5 - f.life) * 10 : 2.5, 0, Math.PI * 2);
      f.ring ? ctx.stroke() : ctx.fill();
    }
    ctx.lineCap = "round";
    for (const p of photons) {
      const [r, g, b] = p.rgb;
      const a = p.phase === 1 ? Math.max(0, p.life) : p.phase === 2 ? Math.max(0, p.life * 2) : 1;
      if (p.trail.length >= 4) {
        ctx.strokeStyle = `rgba(${r},${g},${b},${0.35 * a})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(p.trail[0], p.trail[1]);
        for (let k = 2; k < p.trail.length; k += 2) ctx.lineTo(p.trail[k], p.trail[k + 1]);
        ctx.lineTo(p.x, p.y); ctx.stroke();
      }
      ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.lineWidth = 1; ctx.lineCap = "butt";

    // Observer
    ctx.fillStyle = "#e9eef7";
    ctx.beginPath(); ctx.arc(G.ox, G.oy - 5, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(G.ox - 1, G.oy - 2, 2, 3);
    ctx.font = fontMono(11);
    ctx.textAlign = "center";
    ctx.fillStyle = "#c9d4e3";
    ctx.fillText("you", G.ox, G.oy + 16);

    // Sun direction marker
    if (hit) {
      const t0 = hit[0];
      let sx = G.ox + vx * t0 - vx * 16, sy = G.oy + vy * t0 - vy * 16;
      sx = Math.max(S.x + 14, sx); sy = Math.max(S.y + 14, sy);
      const [r, g, b] = [255, 236, 190];
      const gl = ctx.createRadialGradient(sx, sy, 1, sx, sy, 16);
      gl.addColorStop(0, `rgba(${r},${g},${b},0.9)`); gl.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(sx, sy, 16, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff4d8"; ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI * 2); ctx.fill();
      ctx.textAlign = "left";
      ctx.fillStyle = "#f0b35a";
      ctx.fillText("sunlight", Math.min(sx + 10, S.x + S.w - 80), Math.max(S.y + 30, sy + 22));
    }
    ctx.restore();

    // Tally
    ctx.font = fontMono(11);
    ctx.textAlign = "left";
    const pct = (a, b) => (b ? Math.round(100 * a / b) : 0);
    const tx = S.x + 8;
    let ty = S.y + 18;
    const line = (text, col) => { ctx.fillStyle = col; fitText(text, tx, ty, S.w * 0.62); ty += 16; };
    line("Scattered or absorbed on the way down:", "#7f8ea6");
    line("blue photons " + pct(tally.blueS, tally.blueN) + "%", "#5cc8ff");
    line("red photons " + pct(tally.redS, tally.redN) + "%", "#ff7a6b");
    if (sc.planet === "mars" && tally.absN) line("absorbed by dust " + pct(tally.absN, tally.all) + "% of all", "#c08a5a");
    ctx.strokeStyle = "#1f2a3f";
    ctx.strokeRect(S.x + 0.5, S.y + 0.5, S.w - 1, S.h - 1);
  }

  // ---------- Spectrum chart ----------
  function drawChart() {
    const P = CH;
    ctx.font = fontMono(13);
    ctx.fillStyle = "#7f8ea6";
    ctx.textAlign = narrow ? "left" : "left";
    fitText("SPECTRUM: DIRECT SUNLIGHT VS SKY LIGHT", narrow ? 10 : P.x - 30, P.y - 28, narrow ? W - 20 : P.w + 30, narrow);

    ctx.fillStyle = "#0a0f19";
    ctx.fillRect(P.x, P.y, P.w, P.h);
    const xOf = (l) => P.x + (l - 380) / 320 * P.w;
    const yOf = (v) => P.y + P.h * (1 - v / 1.12);
    // Grid
    ctx.font = fontMono(10);
    ctx.textAlign = "center";
    for (let l = 400; l <= 700; l += 50) {
      if (narrow && (l === 450 || l === 550 || l === 650)) continue;
      const x = xOf(l);
      ctx.strokeStyle = "#151e2e";
      ctx.beginPath(); ctx.moveTo(x + 0.5, P.y); ctx.lineTo(x + 0.5, P.y + P.h); ctx.stroke();
      ctx.fillStyle = "#56647c";
      ctx.textAlign = narrow && l === 700 ? "right" : narrow && l === 400 ? "left" : "center";
      ctx.fillText(l + " nm", narrow && l === 700 ? x + 4 : narrow && l === 400 ? x - 4 : x, P.y + P.h + 24);
    }
    ctx.textAlign = "right";
    for (const v of [0, 0.5, 1]) {
      const y = yOf(v);
      ctx.strokeStyle = "#151e2e";
      ctx.beginPath(); ctx.moveTo(P.x, y + 0.5); ctx.lineTo(P.x + P.w, y + 0.5); ctx.stroke();
      ctx.fillStyle = "#56647c";
      ctx.fillText(String(v), P.x - 6, y + 4);
    }
    // Colour strip
    for (let x = 0; x < P.w; x++) {
      const [r, g, b] = lamRGB(380 + 320 * (x + 0.5) / P.w);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(P.x + x, P.y + P.h + 3, 1.2, 7);
    }
    if (!derived) return;
    const maxSun = Math.max(...SUN) * sc.sunF;
    const curve = (vals, colour, dash, width, fill) => {
      ctx.beginPath();
      vals.forEach((v, i) => { const x = xOf(LAM[i]), y = yOf(v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      if (fill) {
        ctx.save();
        ctx.lineTo(xOf(700), yOf(0)); ctx.lineTo(xOf(380), yOf(0)); ctx.closePath();
        ctx.fillStyle = fill; ctx.fill();
        ctx.restore();
        ctx.beginPath();
        vals.forEach((v, i) => { const x = xOf(LAM[i]), y = yOf(v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      }
      ctx.strokeStyle = colour; ctx.lineWidth = width || 1.8; ctx.setLineDash(dash || []);
      ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1;
    };
    // Sunlight above the air, and what comes straight through.
    curve(sc.F.map((f) => f / maxSun), "#7f8ea6", [3, 4], 1.4);
    curve(sc.F.map((f, i) => f * derived.T[i] / maxSun), "#f0b35a", null, 2);
    // Sky light overhead, shape only (scaled to its own peak).
    if (sky && derived.zenOK) {
      const zmax = Math.max(...sky.zen);
      if (state.eye) {
        const e = sky.zen.map((v, i) => v * YB[i]);
        const emax = Math.max(...e);
        curve(e.map((v) => v / emax), "#b48cff", [5, 3], 1.6, "rgba(180,140,255,0.16)");
      }
      curve(Array.from(sky.zen, (v) => v / zmax), "#5cc8ff", null, 2);
    }
    ctx.strokeStyle = "#1f2a3f";
    ctx.strokeRect(P.x + 0.5, P.y + 0.5, P.w - 1, P.h - 1);

    // Legend under the chart
    ctx.font = fontSans(12);
    ctx.textAlign = "left";
    const items = [
      ["#7f8ea6", "sunlight above the air", true],
      ["#f0b35a", "direct sunlight at the ground"],
      ["#5cc8ff", "sky light overhead (shape)"],
    ];
    if (state.eye) items.push(["#b48cff", "sky light × eye sensitivity"]);
    let lx = narrow ? 10 : P.x, ly = P.y + P.h + 44;
    const colW = narrow ? (W - 20) : P.w / 2 + 10;
    items.forEach((it, i) => {
      const cx = narrow ? lx : P.x + (i % 2) * colW;
      const cy = narrow ? ly + i * 17 : ly + Math.floor(i / 2) * 17;
      ctx.strokeStyle = it[0]; ctx.lineWidth = 2; ctx.setLineDash(it[2] ? [3, 3] : []);
      ctx.beginPath(); ctx.moveTo(cx, cy - 4); ctx.lineTo(cx + 16, cy - 4); ctx.stroke();
      ctx.setLineDash([]); ctx.lineWidth = 1;
      ctx.fillStyle = "#97a6b9";
      fitText(it[1], cx + 22, cy, (narrow ? W - 20 : colW) - 26);
    });
  }

  function draw() {
    ctx.fillStyle = "#05080e";
    ctx.fillRect(0, 0, W, H);
    drawPanorama();
    drawSide();
    drawChart();
  }

  // Shrink a one-line label (down to the smallest readable size) only if it would
  // not fit; if it still does not fit, break it into two lines, the first one above.
  function fitText(text, x, y, maxW, wrapUp) {
    const m = /(\d+(?:\.\d+)?)px/.exec(ctx.font);
    let size = m ? +m[1] : 12;
    const base = ctx.font;
    while (size > minFont && ctx.measureText(text).width > maxW) {
      size -= 0.5;
      ctx.font = base.replace(/\d+(?:\.\d+)?px/, size + "px");
    }
    if (wrapUp && ctx.measureText(text).width > maxW) {
      const t = tr(text);
      const cjk = /[\u3000-\u9fff]/.test(t);
      const parts = cjk ? [...t] : t.split(" ");
      const sep = cjk ? "" : " ";
      let a = parts.length - 1;
      while (a > 1 && ctx.measureText(parts.slice(0, a).join(sep)).width > maxW) a--;
      ctx.fillText(parts.slice(0, a).join(sep), x, y - size - 3);
      ctx.fillText(parts.slice(a).join(sep), x, y);
    } else ctx.fillText(text, x, y);
    ctx.font = base;
  }

  // ---------- Readouts ----------
  function setSwatch(id, rgb, name) {
    const el = $(id);
    el.textContent = tr(name);
    el.style.setProperty("--sw", `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`);
  }
  function updateReadouts() {
    $("elevOut").textContent = fmtDeg(state.elev);
    $("thickOut").textContent = state.k.toFixed(2) + "×";
    if (!derived) return;
    $("airmass").textContent = derived.m.toFixed(derived.m < 10 ? 2 : 1);
    $("blueThrough").textContent = pctText(derived.t450);
    $("redThrough").textContent = pctText(derived.t700);
    $("ratio").textContent = derived.ratio.toFixed(1) + "×";
    setSwatch("sunCol", derived.sunRGB, derived.sunName || "white");
    if (derived.zenRGB) setSwatch("skyCol", derived.zenRGB, derived.zenName);
  }
  const fmtDeg = (e) => (Math.round(e * 10) / 10).toFixed(e % 1 ? 1 : 0) + "°";
  const pctNum = (t) => (t >= 0.1 ? Math.round(t * 100) : t >= 0.001 ? (t * 100).toFixed(1) : (t * 100).toFixed(3));
  const pctText = (t) => (t >= 0.995 ? "100%" : t >= 0.1 ? Math.round(t * 100) + "%" : t >= 0.001 ? (t * 100).toFixed(1) + "%" : "<0.1%");

  // ---------- Accessibility and challenges ----------
  const SKY_SENT = {
    "almost black": "The sky overhead looks almost black.",
    "white": "The sky overhead looks white.",
    "grey": "The sky overhead looks grey.",
    "deep blue": "The sky overhead looks deep blue.",
    "pale blue": "The sky overhead looks pale blue.",
    "blue": "The sky overhead looks blue.",
    "violet": "The sky overhead looks violet.",
    "pale green": "The sky overhead looks pale green.",
    "butterscotch": "The sky overhead looks butterscotch.",
    "orange": "The sky overhead looks orange.",
    "yellow": "The sky overhead looks yellow.",
    "red": "The sky overhead looks red.",
  };
  const SUN_SENT = {
    "white": "The sun looks white.",
    "bluish white": "The sun looks bluish white.",
    "yellowish white": "The sun looks yellowish white.",
    "yellow": "The sun looks yellow.",
    "orange": "The sun looks orange.",
    "red": "The sun looks red.",
  };
  let said = { red: false, mode: "" };
  function checkEvents() {
    const d = derived;
    if (!d) return;
    // Challenge 1: the direct sun keeps less than 10% of its blue light.
    if (sc.planet === "earth" && state.size === "small" && state.k >= 0.99 && d.t450 < 0.1) {
      W_.challenge("red-sun");
      if (!said.red) {
        said.red = true;
        W_.sound("event", { pitch: 0.3 });
        W_.describe("Only " + pctNum(d.t450) + "% of the sun's blue light still reaches you directly, so the sun has turned orange-red.", { now: true });
      }
    } else if (d.t450 > 0.3) said.red = false;
    // Challenge 2: a white sky at midday, by changing only the scatterers.
    if (sc.planet === "earth" && state.size === "large" && state.elev >= 60 && d.zenName && (d.zenName === "white" || d.zenName === "grey")) W_.challenge("white-noon");
    // Challenge 3: blue sunset on Mars.
    if (sc.planet === "mars" && state.elev < 10 && d.nearBlue != null && d.nearBlue > d.zenBlue + 0.04 && d.nearBlue > 0.34) {
      W_.challenge("blue-sunset");
    }
    const mode = sc.planet + "/" + state.size + "/" + (state.k > 0 ? "air" : "none");
    if (d.zenName && mode !== said.mode) {
      if (said.mode) {
        W_.sound("event", { pitch: 0.6 });
        W_.describe(tr(SKY_SENT[d.zenName]) + " " + tr(SUN_SENT[d.sunName]), { now: true });
      }
      said.mode = mode;
    }
  }
  W_.describer(() => {
    const d = derived;
    if (!d) return tr("The sky is still being computed.");
    const where = sc.planet === "mars" ? "On Mars, the sun is " + fmtDeg(state.elev) + " above the horizon, so its light crosses " + d.m.toFixed(1) + " times as much dusty air as from straight overhead."
      : state.size === "large" ? "The air holds only large droplets. The sun is " + fmtDeg(state.elev) + " above the horizon, so its light crosses " + d.m.toFixed(1) + " times as much air as from straight overhead."
        : "The sun is " + fmtDeg(state.elev) + " above the horizon, so its light crosses " + d.m.toFixed(1) + " times as much air as from straight overhead.";
    const through = "Directly from the sun, " + pctNum(d.t450) + "% of blue light at 450 nm and " + pctNum(d.t700) + "% of red light at 700 nm get through.";
    return [tr(where), d.zenName ? tr(SKY_SENT[d.zenName]) : "", tr(SUN_SENT[d.sunName] || SUN_SENT.white), tr(through)].filter(Boolean).join(" ");
  });

  // ---------- Loop ----------
  let lastT = performance.now(), spawnAcc = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    if (sunsetAnim) stepSunset(dt);
    if (state.running && state.photons) {
      spawnAcc += dt * 55;
      while (spawnAcc >= 1) { spawnAcc--; spawn(); }
      stepPhotons(dt);
    }
    draw();
    requestAnimationFrame(frame);
  }

  // ---------- Controls ----------
  let sunsetAnim = null;
  function stepSunset(dt) {
    const a = sunsetAnim;
    a.t += dt;
    const f = Math.min(1, a.t / a.dur);
    const e = a.from + (a.to - a.from) * (1 - Math.pow(1 - f, 1.6));
    setElev(Math.round(e * 2) / 2, true);
    if (f >= 1) { sunsetAnim = null; $("sunset").textContent = "Watch a sunset"; }
  }
  function setElev(v, fromAnim) {
    if (!fromAnim) stopSunset();
    if (v === state.elev) return;
    state.elev = v;
    $("elev").value = String(v);
    changed(false);
  }
  function stopSunset() { if (sunsetAnim) { sunsetAnim = null; $("sunset").textContent = "Watch a sunset"; } }
  function changed(resetPhotons) {
    if (resetPhotons) { photons.length = 0; flashes.length = 0; }
    resetTally();
    updateDerived();
    requestSky();
  }
  function setScene() {
    sc = scene(state.planet, state.size, state.k);
    $("sizeCtl").hidden = state.planet === "mars";
    $("marsNote").hidden = state.planet !== "mars";
    changed(true);
  }

  $("elev").addEventListener("input", (e) => setElev(+e.target.value));
  $("thick").addEventListener("input", (e) => { state.k = +e.target.value; setScene(); });
  $("eye").addEventListener("change", (e) => { state.eye = e.target.checked; });
  $("photons").addEventListener("change", (e) => { state.photons = e.target.checked; if (!state.photons) { photons.length = 0; flashes.length = 0; } });
  $("play").addEventListener("click", () => setPlay(!state.running));
  $("sunset").addEventListener("click", () => {
    if (sunsetAnim) { stopSunset(); return; }
    const from = state.elev > 8 ? state.elev : 40;
    if (Lab.reducedMotion) { setElev(1); return; }
    sunsetAnim = { from, to: 0.5, t: 0, dur: 6 + from / 9 };
    $("sunset").textContent = "Stop";
    if (!state.running) setPlay(true);
  });
  function setPlay(on) {
    state.running = on;
    $("play").textContent = on ? "Pause" : "Play";
  }
  function seg(ids, apply) {
    for (const id of Object.keys(ids)) {
      $(id).addEventListener("click", () => {
        for (const other of Object.keys(ids)) $(other).setAttribute("aria-pressed", String(other === id));
        apply(ids[id]);
      });
    }
  }
  seg({ sizeSmall: "small", sizeLarge: "large" }, (v) => { state.size = v; setScene(); });
  seg({ planetEarth: "earth", planetMars: "mars" }, (v) => { state.planet = v; setScene(); });

  // Re-layout when the bench changes width; the simulation state is kept.
  let lastCW = 0;
  function onResize() {
    const cw = Math.round(canvas.parentElement.clientWidth);
    if (cw === lastCW) return;
    lastCW = cw;
    const oldGeom = geom ? { ...SV } : null;
    layout();
    if (oldGeom && (oldGeom.w !== SV.w || oldGeom.h !== SV.h || oldGeom.x !== SV.x || oldGeom.y !== SV.y)) { photons.length = 0; flashes.length = 0; }
    draw();
  }
  if (window.ResizeObserver) new ResizeObserver(onResize).observe(canvas.parentElement);
  else window.addEventListener("resize", onResize);

  layout();
  setScene();
  // With reduced motion the photons start paused, after a short pre-run so the picture tells the story.
  if (Lab.reducedMotion) {
    setPlay(false);
    for (let k = 0; k < 90; k++) { spawn(); spawn(); stepPhotons(1 / 30); }
  }
  requestAnimationFrame(frame);
})();
