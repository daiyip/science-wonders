(window.WONDERS = window.WONDERS || {}).content = Object.assign(window.WONDERS.content || {}, {
  "double-slit": {
    predict: {
      question: "Photons are fired one at a time at two slits. After thousands land, what pattern builds up on the screen?",
      options: [
        "Two bright bands, one behind each slit",
        "Many evenly spaced bright and dark stripes",
        "One even smear with no structure",
        "Random dots with no pattern at all"
      ],
      answer: 1,
      reveal: "Each photon lands as a single dot, but together they build interference stripes, as if each one passed through both slits as a wave. Most people expect two bands, which is what you would get from tiny bullets.",
      tryIt: "Let a few hundred photons land, then switch on \"Watch which slit each photon uses\" under Which-path detector and watch the stripes turn into blobs."
    },
    quiz: [
      {
        q: "You switch on the which-path detector. What happens to the pattern on the screen?",
        options: [
          "The stripes get sharper because each path is known",
          "The stripes vanish and two overlapping blobs remain",
          "Photons stop arriving at the screen",
          "Nothing changes, the detector only records data"
        ],
        answer: 1,
        why: "Once a record of the slit exists, the two paths no longer interfere, so the photons land like particles from two separate openings."
      },
      {
        q: "You close one slit with \"Top only\". What happens at a spot that was dark with both slits open?",
        options: [
          "It stays dark",
          "It gets even darker",
          "Photons can now land there"
        ],
        answer: 2,
        why: "The dark spots came from the two waves cancelling; with only one wave there is nothing to cancel it, so light arrives there again."
      },
      {
        q: "Which change makes the stripes squeeze closer together?",
        options: [
          "Increasing the slit separation",
          "Increasing the wavelength",
          "Lowering the photons per second",
          "Narrowing the slit separation"
        ],
        answer: 0,
        why: "Fringe spacing equals wavelength times distance divided by separation, so a wider separation gives narrower spacing."
      }
    ],
    related: [
      { slug: "quantum-eraser", why: "Erasing the which-path record brings the stripes back." },
      { slug: "decoherence", why: "Stray particles record the path and wash out interference." },
      { slug: "gravitational-waves", why: "LIGO detects spacetime ripples by watching interference fringes shift." }
    ]
  },

  "entanglement": {
    predict: {
      question: "Alice and Bob measure entangled photons with polarizers 22.5° apart. How often do their results agree?",
      options: [
        "50%, since each result is a coin flip",
        "75%, the most any pre-arranged plan allows",
        "About 85%",
        "100%, entangled photons always match"
      ],
      answer: 2,
      reveal: "Quantum mechanics gives cos²(22.5°), about 85%, which beats the 75% that any hidden-instruction plan can reach at that angle. Many people expect either a plain coin flip or perfect matching.",
      tryIt: "Set Bob's polarizer to 22.5° with Alice's polarizer at 0°, press Send 500, and compare Results agree with Best hidden-instruction plan."
    },
    quiz: [
      {
        q: "Bob looks only at his own results, never comparing with Alice. What does he see?",
        options: [
          "Results that change depending on Alice's angle",
          "A fair 50/50 coin flip, whatever Alice does",
          "Always the same result as his last photon"
        ],
        answer: 1,
        why: "Each photon alone passes or is blocked 50/50, so entanglement cannot carry a message; the correlation only appears when results are compared."
      },
      {
        q: "On the agreement curve, where do the quantum and hidden-instruction predictions differ?",
        options: [
          "Only when the angles are equal",
          "Only when the angles are 90° apart",
          "They never differ",
          "At angles in between, where the cos² curve bulges above the straight line"
        ],
        answer: 3,
        why: "Hidden instructions can match the 0° and 90° cases perfectly but can only draw a straight line between them, while quantum mechanics follows cos²."
      },
      {
        q: "What does it mean when the Bell test gives S of about 2.8?",
        options: [
          "No theory where photons carry instructions from the source can explain the results",
          "A signal travelled faster than light from Alice to Bob",
          "The detectors made errors that inflated the score"
        ],
        answer: 0,
        why: "Bell proved local hidden instructions can score at most 2, so a score near 2.83 rules them out."
      }
    ],
    related: [
      { slug: "quantum-eraser", why: "Twin photons whose correlations appear only when records are compared." },
      { slug: "stern-gerlach", why: "Spin measurements also follow a cos² rule at tilted angles." },
      { slug: "decoherence", why: "Entanglement with the environment is what destroys superpositions." }
    ]
  },

  "tunneling": {
    predict: {
      question: "An electron with 0.6 eV hits a 1.0 eV barrier 0.5 nm thick. How often does it get through?",
      options: [
        "Never, it lacks the energy to climb over",
        "About 14% of the time",
        "About 60% of the time, matching its share of the energy",
        "Always, quantum particles ignore barriers"
      ],
      answer: 1,
      reveal: "The electron's wave leaks into the barrier and fades, but a thin barrier lets about 14% emerge on the far side. Most people expect zero, which is what a classical ball would do.",
      tryIt: "Keep the default settings, watch the Transmitted readout as the packet splits, and compare it with Classical ball gets through."
    },
    quiz: [
      {
        q: "You double the barrier width from 0.5 to 1.0 nm. What happens to transmission?",
        options: [
          "It halves, to about 7%",
          "It stays about the same",
          "It falls to under 1%",
          "It rises because there is more room for the wave"
        ],
        answer: 2,
        why: "Inside the barrier the wave fades exponentially, so each extra bit of thickness multiplies the odds down rather than subtracting from them."
      },
      {
        q: "You raise the electron energy above the barrier height. What happens?",
        options: [
          "Everything passes, just like the classical ball",
          "Most passes, but part of the wave still reflects",
          "Everything reflects"
        ],
        answer: 1,
        why: "A classical ball sails over, but a wave partly reflects whenever it meets a sudden change in the energy landscape, even one it has enough energy to cross."
      },
      {
        q: "The bar shows 14% transmitted. What does that mean for one electron?",
        options: [
          "It has a 14% chance of being detected whole on the far side",
          "14% of the electron's charge leaks through",
          "It spends 14% of its time inside the barrier"
        ],
        answer: 0,
        why: "Each electron is always detected whole on one side or the other; the percentages are the odds for each outcome."
      }
    ],
    related: [
      { slug: "double-slit", why: "Matter behaves as a wave, here leaking through walls." },
      { slug: "stern-gerlach", why: "MRAM reads spin using a tunnelling current." },
      { slug: "entropy", why: "Probabilities for one particle become reliable rates in bulk." }
    ]
  },

  "quantum-eraser": {
    predict: {
      question: "With which-path tags on, you measure the twins at 45° to erase the record. Do stripes appear on the bare screen?",
      options: [
        "Yes, erasing the record brings back stripes everywhere",
        "Only if you erase before the screen photon lands",
        "No, stripes only appear after sorting hits by the twin's result",
        "Yes, but only half as bright"
      ],
      answer: 2,
      reveal: "The bare screen always shows a blob; the D1 hits form stripes and the D2 hits form the matching gaps, which add back up to the blob. Most people expect erasing to restore stripes directly on the screen.",
      tryIt: "Click \"Erase it (45°)\" under Polarizer presets and compare the bare top panel with the hits sorted by D1 and D2."
    },
    quiz: [
      {
        q: "You set the twin's polarizer to 0° (Read the path). What do the sorted groups show?",
        options: [
          "D1 shows stripes, D2 shows gaps",
          "Both groups show stripes",
          "Both groups show plain blobs"
        ],
        answer: 2,
        why: "At 0° the twin's result tells you which slit was used, so neither group can show interference."
      },
      {
        q: "With the delay on, you choose 45° after the screen hits have already landed. What is the right way to describe what happens?",
        options: [
          "The later choice reaches back and changes where the earlier photons landed",
          "The dots stay where they are; the choice decides how they can be sorted into groups",
          "The grey dots move into stripes on the screen"
        ],
        answer: 1,
        why: "No dot moves and the bare screen never changes; the measurement only determines which groups the existing hits split into."
      },
      {
        q: "Why does switching off \"Each slit leaves a record in the twin\" put stripes on the bare screen?",
        options: [
          "The source sends more photons",
          "The polarizer is automatically set to 45°",
          "The detectors become more sensitive",
          "No which-path record exists anywhere, so the two paths interfere"
        ],
        answer: 3,
        why: "Interference needs the two paths to be indistinguishable; without tags the twin carries no record, so stripes appear directly."
      }
    ],
    related: [
      { slug: "double-slit", why: "The basic experiment this one extends with twin photons." },
      { slug: "entanglement", why: "Correlations that only show up when comparing records." },
      { slug: "speed-of-light", why: "Sorting needs data carried no faster than light." }
    ]
  },

  "decoherence": {
    predict: {
      question: "A gas molecule bounces off an object that is in two places at once. What does the collision do to the superposition?",
      options: [
        "It knocks the object into one place, chosen at random",
        "It weakens interference by leaking a hint of the object's location",
        "Nothing, as long as the object is not pushed",
        "It doubles the interference fringes"
      ],
      answer: 1,
      reveal: "The bounced molecule carries a partial record of where the object was, so the branches can interfere less; both branches still exist. Most people picture the collision forcing the object to choose.",
      tryIt: "Press Pump out the gas and watch the off-diagonal squares and Fringe visibility stay at full strength, then press New superposition with gas present to compare."
    },
    quiz: [
      {
        q: "As collisions pile up, which part of the 2×2 density matrix shrinks?",
        options: [
          "The off-diagonal squares",
          "The diagonal squares",
          "All four squares equally"
        ],
        answer: 0,
        why: "The diagonal squares are the fixed 50/50 odds of each path; the off-diagonal squares measure the ability to interfere, and that is what leaks away."
      },
      {
        q: "You set Coupling per collision to 100%. What happens?",
        options: [
          "Coherence decays slowly and smoothly",
          "Collisions stop affecting the object",
          "One collision records the full path and the fringes vanish in one step",
          "The object returns to a single location"
        ],
        answer: 2,
        why: "At full coupling each collision carries a complete which-path record, so a single hit is enough."
      },
      {
        q: "Why does raising the temperature make coherence die sooner?",
        options: [
          "Heat makes the object heavier",
          "Faster gas particles hit the object more often",
          "Hot gas absorbs the fringes"
        ],
        answer: 1,
        why: "More collisions per second means which-path hints build up faster."
      }
    ],
    related: [
      { slug: "double-slit", why: "Watching the path wipes out stripes, here done by gas." },
      { slug: "entanglement", why: "Decoherence is entanglement with the surroundings." },
      { slug: "entropy", why: "Information spreading into the environment is hard to reverse." }
    ]
  },

  "stern-gerlach": {
    predict: {
      question: "Silver atoms, each a tiny magnet pointing any way, fly through a shaped magnet. What appears on the detector?",
      options: [
        "A continuous smear from up to down",
        "One spot in the middle",
        "Exactly two separate spots",
        "Three spots: up, middle and down"
      ],
      answer: 2,
      reveal: "Along any axis you measure, the spin is only ever up or down, so atoms land in exactly two spots. A smear is what classical compass needles with random tilts would give.",
      tryIt: "Pick the Z set-up under Classic set-ups, then turn on \"Show what classical magnets would do\" to compare the two spots with the classical smear."
    },
    quiz: [
      {
        q: "In the Z, X, Z chain, magnet 1 passes only up atoms. What does magnet 3 find?",
        options: [
          "All atoms up along Z",
          "Half up and half down along Z",
          "All atoms down along Z",
          "No atoms reach magnet 3"
        ],
        answer: 1,
        why: "Measuring along X wiped out the earlier Z answer, so the Z question starts fresh at 50/50."
      },
      {
        q: "In the Z, Z set-up, atoms that went up at the first magnet reach the second. What happens?",
        options: [
          "They go up every time",
          "They split 50/50",
          "They mostly go down"
        ],
        answer: 0,
        why: "Asking the same question twice in a row gives the same answer, so the result is repeatable."
      },
      {
        q: "Magnet 2 is turned 60° from magnet 1. What fraction of the up atoms go up again?",
        options: [
          "50%",
          "33%",
          "100%",
          "75%"
        ],
        answer: 3,
        why: "The chance of up is cos²(θ/2), and cos²(30°) is 0.75."
      }
    ],
    related: [
      { slug: "entanglement", why: "Measuring at tilted angles gives the same cos² odds." },
      { slug: "decoherence", why: "MRI's T2 decay is spin superpositions fading." },
      { slug: "tunneling", why: "MRAM reads spin states through a tunnelling current." }
    ]
  }
});
