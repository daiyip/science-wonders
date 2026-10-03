(window.WONDERS = window.WONDERS || {}).content = Object.assign(window.WONDERS.content || {}, {
  "path-integral": {
    predict: {
      question: "Light from a lamp bounces off a long mirror into a detector. If you cover the middle third of the mirror, leaving the two ends shining, how much light reaches the detector?",
      options: [
        "About two thirds as much, since two thirds of the mirror is left",
        "Exactly the same, since light only uses the point where the angles are equal",
        "Almost none, even though most of the mirror is still there",
        "More than before, since the ends now get all the light"
      ],
      answer: 2,
      reveal: "In Feynman's picture light reflects from every part of the mirror, but the arrows from the ends point every which way and cancel. Only the middle, near the equal-angle point, adds up. Most people expect the ends to still send their share, but they cancel themselves out.",
      tryIt: "Press Mirror under Setup, then choose Ends only under Mirror surface and read Detector brightness."
    },
    quiz: [
      {
        q: "In Feynman's rule, what decides which way a path's little arrow points?",
        options: [
          "How long the path takes, or more generally its action",
          "Which direction the path leaves the source",
          "A random number picked for each path",
          "How close the path is to the straight line"
        ],
        answer: 0,
        why: "The arrow turns like a stopwatch hand while the particle travels, so its direction is set by the travel time, or the action S divided by ħ."
      },
      {
        q: "Why does the classical path win, even though every path counts equally?",
        options: [
          "The classical path has a much longer arrow than the others",
          "Paths near it take almost the same time, so their arrows agree and add up, while other paths cancel",
          "Nature checks every path and picks the fastest one",
          "Other paths are forbidden by conservation of energy"
        ],
        answer: 1,
        why: "At the stationary path the time curve is flat, so a whole band of neighbours point the same way. Elsewhere neighbouring arrows point in different directions and cancel."
      },
      {
        q: "You make the wavelength much shorter in Free flight. What happens to the band of paths that add up?",
        options: [
          "It gets wider, so the particle spreads out more",
          "It stays the same, since the wavelength only changes the colour",
          "It gets narrower, closing in on the straight line, which is the classical limit"
        ],
        answer: 2,
        why: "A shorter wavelength makes the arrows spin faster as paths bend away from the straight line, so only paths very close to it still agree. Heavy objects have tiny wavelengths, which is why they follow single classical paths."
      }
    ],
    related: [
      { slug: "double-slit", why: "Two paths instead of countless: the same arrow rule draws the stripes." },
      { slug: "quantum-eraser", why: "Paths only add as arrows when nothing records which one was taken." },
      { slug: "decoherence", why: "Why a baseball never shows the arrows of its other paths." }
    ],
    challenges: [
      {
        id: "band",
        goal: "In Free flight, make the band of paths that add up narrower than ±5% of the distance.",
        hint: "Lower the Wavelength (how quantum) slider and watch the Paths that add up readout."
      },
      {
        id: "least-time",
        goal: "In Refraction, with the refractive index at 1.30 or more, select the path of least time.",
        hint: "Click near where the gold dashed path crosses the surface, or focus the picture and use the arrow keys until the white path lies on the gold one."
      },
      {
        id: "grating",
        goal: "Light the detector with a grating where a plain mirror is dark: more than 5% brightness where Plain mirror here reads under 1%.",
        hint: "Set Detector angle to about −60°, choose Grating, then change Grating spacing slowly."
      }
    ],
    teach: {
      level: "Ages 15–18",
      minutes: 50,
      objectives: [
        "Students can describe Feynman's rule: every path gets an arrow, the arrows are added head to tail, and the final arrow squared gives the probability.",
        "Students can explain why paths near the least-time path add up while paths far from it cancel.",
        "Students can use the sum over paths to explain the law of reflection and Snell's law, and why a grating sends light in unexpected directions.",
        "Students can explain why heavy objects behave classically, using the idea that shorter wavelengths narrow the band of contributing paths."
      ],
      plan: [
        { min: 5, what: "Prediction: students answer the predictions on paper, then compare answers with a partner." },
        { min: 10, what: "Teacher demonstration in Free flight: follow one path with the arrow keys, watch its arrow turn, and press Add the arrows again to watch the spiral form." },
        { min: 15, what: "Activity 1 in pairs: the mirror. Compare Whole, Ends only and Middle only, then try the grating." },
        { min: 10, what: "Activity 2 in pairs: refraction and the classical limit. Check Snell's law and shrink the wavelength." },
        { min: 10, what: "Wrap-up: discuss the questions, linking least time, the flat bottom of the time curve and classical physics." }
      ],
      vocabulary: [
        { term: "Amplitude (final arrow)", def: "The arrow you get by adding the arrows of all paths head to tail. Its length squared is the probability of arriving." },
        { term: "Phase", def: "The direction a path's arrow points. It turns by one full turn for every extra wavelength of travel." },
        { term: "Action", def: "A quantity calculated from a whole path. For a particle, the arrow turns by the action divided by ħ." },
        { term: "Stationary path", def: "The path where a small change of route makes almost no change in travel time or action. It is the classical path." },
        { term: "Diffraction grating", def: "A surface with evenly spaced lines that removes or blocks strips whose arrows would cancel, sending light in new directions." },
        { term: "Classical limit", def: "When the wavelength is tiny compared with the setup, only paths right next to the classical one add up, so the object seems to follow one path." }
      ],
      misconceptions: [
        "Light reflects only from the single point where the angles are equal. In fact every part of the mirror contributes, but most contributions cancel.",
        "Light somehow knows in advance which path is fastest. It does not choose; all paths count and only those near the least-time path survive the adding.",
        "The particle is split into many pieces that travel separately. The sum over paths gives a probability; a detector always clicks for a whole particle.",
        "Quantum rules do not apply to big objects. They do, but the band of contributing paths is so narrow that only the classical path is left."
      ],
      predictions: [
        "If the middle third of a mirror is covered, how much light reaches the detector compared with the whole mirror?",
        "Light goes from air into glass. Will its quickest route from a lamp to a point in the glass be the straight line? Why or why not?",
        "If a particle's wavelength is made shorter, will more or fewer paths matter?"
      ],
      activities: [
        {
          title: "The mirror: which parts matter?",
          steps: [
            "Press Mirror under Setup. Leave Detector angle at +40°.",
            "For each Mirror surface option (Whole, Ends only, Middle only), record Detector brightness.",
            "Look at the spiral of added arrows for each option. Describe where the straight part of the spiral comes from.",
            "Set Detector angle to −60°. Record Plain mirror here. Choose Grating and move Grating spacing until Detector brightness is above 5%. Record the spacing.",
            "Change Wavelength and describe what happens to the bright directions on the arc."
          ],
          table: { columns: ["Mirror surface", "Detector angle", "Grating spacing", "Detector brightness", "Plain mirror here"], rows: 5 }
        },
        {
          title: "Refraction and the classical limit",
          steps: [
            "Press Refraction. Set Refractive index below to 1.00, 1.33, 1.50 and 2.42 in turn.",
            "For each, record the two angles in Least-time crossing and the sin ratio.",
            "Use the arrow keys on the picture to select paths left and right of the gold path. Note how many turns each arrow has turned.",
            "Press Free flight. Move Wavelength (how quantum) from the top to the bottom and record Paths that add up at five settings."
          ],
          table: { columns: ["Refractive index or wavelength", "Angle in air", "Angle below", "sin ratio", "Paths that add up"], rows: 5 }
        }
      ],
      questions: [
        "Why do the arrows from the ends of the mirror add up to almost nothing, even though there are many of them?",
        "Explain, using the time curve below the picture, why paths near the least-time path agree with each other.",
        "How can scraping away parts of a mirror make more light reach a detector?",
        "Why does a thrown ball seem to follow a single path, if it really takes every path?"
      ],
      answers: [
        "Prediction 1: almost none, a few percent at most. The middle region around the equal-angle point is what adds up; the ends give arrows that spin and cancel.",
        "Prediction 2: no. Light is slower in glass, so the quickest route spends less of its length in the glass and bends at the surface. The angles obey Snell's law, sin θ₁ = n sin θ₂.",
        "Prediction 3: fewer. A shorter wavelength makes the arrows turn faster as a path moves away from the classical one, so the band of agreeing paths narrows.",
        "Question 1: at the ends, the travel time changes quickly from one path to the next, so neighbouring arrows point in very different directions. Added head to tail they just go round in small circles, the curls at the ends of the spiral.",
        "Question 2: the curve is flat at its bottom, so moving a little away from the least-time path changes the time by almost nothing. Those arrows point nearly the same way and add up to the long straight part of the spiral.",
        "Question 3: in a region where arrows spin, removing every strip whose arrows point against the others leaves only arrows that roughly agree, so they add up instead of cancelling. That is a diffraction grating.",
        "Question 4: a ball's wavelength is around 10⁻³⁴ m, so the band of paths that add up is far narrower than an atom. Only the classical path and its immediate neighbours survive, and we see one path."
      ]
    }
  }
});
