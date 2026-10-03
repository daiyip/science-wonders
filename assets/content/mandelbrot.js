(window.WONDERS = window.WONDERS || {}).content = Object.assign(window.WONDERS.content || {}, {
  "mandelbrot": {
    predict: {
      question: "Pick a point c just outside the black Mandelbrot set. What does its Julia set look like?",
      options: [
        "A slightly smaller black blob, still in one piece",
        "Dust: infinitely many separate specks",
        "Nothing at all, it disappears",
        "An exact copy of the Mandelbrot set"
      ],
      answer: 1,
      reveal: "Whether the orbit of 0 escapes decides the whole Julia set. Inside the Mandelbrot set it is one connected piece; one step outside, however small, and it breaks into dust that never joins up. Most people expect a gradual change, but the switch is all or nothing.",
      tryIt: "Click inside the black near its edge, then just outside it, and watch the Julia set panel and the Julia set reading."
    },
    quiz: [
      {
        q: "Why does raising the Iteration limit make the black region shrink a little near the edge?",
        options: [
          "More iterations make the computer more accurate at rounding",
          "Some points escape only after many steps; with a low limit they are wrongly counted as inside",
          "The set itself grows smaller over time",
          "The colours are spread over more steps, so black is used less"
        ],
        answer: 1,
        why: "Black means the orbit has not escaped yet. Points near the edge can take thousands of steps to escape, so a higher limit reveals them as outside."
      },
      {
        q: "You click a point inside the bulb labelled 3. What does the orbit of 0 do?",
        options: [
          "It escapes after 3 steps",
          "It settles onto a single point",
          "It ends up cycling through 3 points",
          "It wanders forever without any pattern"
        ],
        answer: 2,
        why: "Each bulb attached to the main cardioid has its own cycle length. In that bulb the orbit is attracted to a cycle of three points."
      },
      {
        q: "Zoomed in about 10¹⁴ times, the picture turns into flat rectangles. Why?",
        options: [
          "The set really is made of rectangles at that scale",
          "Neighbouring pixels are closer together than double-precision numbers can tell apart, so they get the same value",
          "The iteration limit is too low",
          "The web browser lowers the resolution to save memory"
        ],
        answer: 1,
        why: "Doubles keep about 16 significant digits. When pixels are spaced more finely than that, several pixels round to the same c and get the same colour."
      }
    ],
    related: [
      { slug: "chaos", why: "Near the edge, orbits depend sensitively on c, the same stretching that makes pendulums unpredictable." },
      { slug: "emergence", why: "Another one-line rule that produces endless, unplanned structure." },
      { slug: "infinity", why: "The set's edge has infinite length and the Julia dust has uncountably many points." }
    ],
    challenges: [
      { id: "zoom1000", goal: "Zoom in to 1,000× or more on the edge of the set.", hint: "Scroll, pinch, use Zoom in ×3, or type a Zoom factor." },
      { id: "period3", goal: "Pick a point c whose orbit settles into a cycle of exactly 3 points.", hint: "Turn on The period of each bulb and click inside a bulb labelled 3." },
      { id: "precision", goal: "Zoom past the limit of double precision (the Precision reading says used up) while the edge of the set is still in view.", hint: "Zoom about 10¹⁴× into the edge; keep some black and some colour in the picture." }
    ],
    teach: {
      level: "Ages 14–18",
      minutes: 50,
      objectives: [
        "Students can iterate z → z² + c for a simple real value of c by hand and decide whether the orbit stays bounded.",
        "Students can explain what the colours and the black region of the Mandelbrot set picture mean.",
        "Students can describe the link between a point c and its Julia set: connected inside the set, dust outside.",
        "Students can explain why a computer picture of the set has limits set by the iteration limit and by number precision."
      ],
      plan: [
        { min: 5, what: "Prediction: students answer the worksheet predictions without the computer, then vote." },
        { min: 10, what: "By hand: iterate z → z² + c from z = 0 for c = 0, −1, 1 and −2 on the board. Which stay small? Introduce the word orbit." },
        { min: 12, what: "Activity 1: students click points on the real axis and in different bulbs, recording the Orbit of 0 and Julia set readings." },
        { min: 12, what: "Activity 2: zoom into Seahorse valley and a mini-Mandelbrot, changing the Iteration limit; then zoom until the Precision reading is used up." },
        { min: 6, what: "Discuss the questions: why the black shrinks with more iterations, and why the picture breaks into blocks." },
        { min: 5, what: "Wrap-up: one sentence each on how a simple rule can produce endless detail, and the quiz." }
      ],
      vocabulary: [
        { term: "Complex number", def: "A number a + bi with a real part a and an imaginary part b, drawn as a point on a plane." },
        { term: "Iteration", def: "Applying the same rule again and again, each time to the previous answer." },
        { term: "Orbit", def: "The list of values you get by iterating: here 0, c, c² + c, and so on." },
        { term: "Mandelbrot set", def: "All the values of c for which the orbit of 0 under z → z² + c never escapes to infinity." },
        { term: "Julia set", def: "For one fixed c, the starting points z whose orbits stay bounded (shown filled in black)." },
        { term: "Fractal", def: "A shape that shows detailed structure at every scale, often with smaller copies of itself." }
      ],
      misconceptions: [
        "The Mandelbrot set is not drawn by a designer or built from smaller pictures; every pixel comes from the same one-line rule.",
        "Black does not mean proven inside. It means the orbit did not escape within the iteration limit, so a higher limit can change the picture.",
        "The mini-Mandelbrots are not separate islands. They are joined to the main set by filaments too thin to see.",
        "The blocks at extreme zoom are not part of the set; they come from the computer running out of digits."
      ],
      predictions: [
        "Start at 0 and repeatedly square and add 1. Then do the same adding −1. Which one stays small?",
        "If you zoom into the edge of the set again and again, do you expect it to become smooth, repeat exactly, or keep changing?",
        "Do you think the Julia set changes gradually or suddenly as c crosses the edge of the black region?"
      ],
      activities: [
        {
          title: "Orbits and Julia sets",
          steps: [
            "Type values into Point c (Real part, Imaginary part), or click on the picture, for each c in the table.",
            "Read the Orbit of 0 and Julia set readings and sketch the Julia set panel in a few lines.",
            "Turn on The period of each bulb and click inside bulbs labelled 2, 3, 4 and 5. Record the cycle length you get each time."
          ],
          table: { columns: ["c (real, imaginary)", "Orbit of 0", "Julia set", "Sketch"], rows: 6 }
        },
        {
          title: "Zooming and its limits",
          steps: [
            "Press Seahorse valley, then zoom in on a spiral with the mouse wheel, by pinching or with Zoom in ×3.",
            "At several zoom levels, record the Zoom and Precision readings, and whether the picture looks smooth or blobby.",
            "Move the Iteration limit slider up and down and note how the black region changes.",
            "Keep zooming until the Precision reading says used up and describe what the picture looks like."
          ],
          table: { columns: ["Zoom", "Iteration limit", "Precision", "What you see"], rows: 5 }
        }
      ],
      questions: [
        "Why can the computer be sure a point is outside the set, but never completely sure it is inside?",
        "What decides whether a Julia set is one piece or dust?",
        "Why does the picture break into rectangles at around 10¹⁴× zoom, and how could a program go deeper?",
        "The rule z → z² + c fits on one line. Where does all the detail in the picture come from?"
      ],
      answers: [
        "Prediction 1: adding 1 gives 0, 1, 2, 5, 26, … which runs away; adding −1 gives 0, −1, 0, −1, … which cycles forever. So c = −1 is in the set and c = 1 is not.",
        "Prediction 2: it keeps changing. New spirals, branches and small copies appear at every zoom level, but the copies are never exactly identical.",
        "Prediction 3: suddenly. Inside the set the Julia set is connected; any c outside gives dust, however close it is to the edge.",
        "Question 1: once |z| is bigger than 2 the orbit is certain to escape, so one escape proves a point is outside. A point that has not escaped yet might still escape after more steps than we computed.",
        "Question 2: the orbit of 0. If it stays bounded, the Julia set is in one piece; if it escapes, the Julia set is dust. This is the Fatou–Julia theorem.",
        "Question 3: doubles store about 16 significant digits, so pixels closer together than about 10⁻¹⁶ times the size of c round to the same number. Deep-zoom programs use higher-precision arithmetic, or compute one precise reference orbit and treat other pixels as small differences from it (perturbation).",
        "Question 4: from repeating the rule. Near the edge, tiny changes in c lead to very different orbits after many steps, so neighbouring pixels can end up with very different results at every scale."
      ]
    }
  }
});
