// Guided tours: ordered paths through the experiments.
(window.WONDERS = window.WONDERS || {}).tours = [
  {
    id: "quantum-weird",
    title: "Why quantum is weird",
    blurb: "From one photon making stripes to two photons that agree too well. Four experiments that broke classical physics.",
    steps: [
      { slug: "double-slit", goal: "Let a few hundred photons land, then switch on the which-path detector. Where did the stripes go?" },
      { slug: "quantum-eraser", goal: "Sort the hits by what the twin photon did. Find the fringes hiding in a blob." },
      { slug: "entanglement", goal: "Run the Bell test and beat the score of 2 that any hidden-instruction theory is stuck below." },
      { slug: "decoherence", goal: "Let some gas in and watch the superposition leak into the surroundings." }
    ]
  },
  {
    id: "einstein",
    title: "Einstein's universe",
    blurb: "Moving clocks run slow, mass bends space, space ripples and stretches. Follow relativity from a light clock to the whole cosmos.",
    steps: [
      { slug: "speed-of-light", goal: "Send light to Mars and back. Feel how slow the fastest thing is on a planetary scale." },
      { slug: "time-dilation", goal: "Fly to Proxima Centauri at 0.99c. How much younger is the traveling twin?" },
      { slug: "curved-spacetime", goal: "Launch an orbit close to the hole with Newton and Einstein side by side. Watch Einstein's orbit drift." },
      { slug: "gravitational-waves", goal: "Play the GW150914 chirp: the sound of two black holes merging." },
      { slug: "expanding-universe", goal: "Move to another galaxy. Is there a centre of the expansion?" }
    ]
  },
  {
    id: "order-chaos",
    title: "Order, chaos and life",
    blurb: "Tiny causes with huge effects, the arrow of time, and patterns nobody designed.",
    steps: [
      { slug: "chaos", goal: "Shrink the starting difference a thousandfold. How much longer do the pendulums stay together?" },
      { slug: "entropy", goal: "Reverse time, then try again with the nudge on. Why does one tiny change ruin the un-mixing?" },
      { slug: "emergence", goal: "Start the glider gun, then switch to flocking. Count the rules behind each." },
      { slug: "evolution", goal: "Change the background and watch the population's colour follow it." },
      { slug: "epidemics", goal: "Raise vaccination past the herd-immunity line and watch the outbreak fizzle." }
    ]
  },
  {
    id: "intuition-fails",
    title: "When intuition fails",
    blurb: "Four puzzles where the right answer feels wrong until you run the numbers yourself.",
    steps: [
      { slug: "monty-hall", goal: "Play ten games always switching, then try 100 doors." },
      { slug: "birthday-paradox", goal: "Add people until two share a birthday. How many did it take?" },
      { slug: "benford", goal: "Compare powers of 2 with the uniform control. Which one follows the law?" },
      { slug: "infinity", goal: "Check infinitely many buses into the full hotel, then run the diagonal." }
    ]
  }
];
