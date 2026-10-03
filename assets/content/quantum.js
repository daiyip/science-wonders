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
    ],
    challenges: [
      {
        id: "which-path",
        goal: "Switch on the which-path detector and collect 300 photons.",
        hint: "Watch whether the stripes ever form while the detector is on."
      },
      {
        id: "wide-fringes",
        goal: "Make the fringe spacing wider than 4 mm, then collect 500 photons with both slits open and the detector off.",
        hint: "Spacing = wavelength × distance ÷ separation. Try a long wavelength and a small separation."
      },
      {
        id: "missing-stripe",
        goal: "Make the third bright stripe go missing: set Slit separation to exactly 3 × Slit width, then collect 1,000 photons.",
        hint: "A stripe vanishes when it lands on a dark edge of the single-slit envelope, at order separation ÷ width."
      }
    ],
    teach: {
      level: "Ages 14–18",
      minutes: 50,
      objectives: [
        "Students can describe how single photons build an interference pattern one dot at a time.",
        "Students can use spacing = wavelength × distance ÷ separation to predict and check fringe spacing.",
        "Students can explain why recording which slit a photon used removes the stripes.",
        "Students can tell apart the random landing spot of one photon and the predictable pattern of many."
      ],
      plan: [
        {
          min: 5,
          what: "Prediction: students answer the worksheet predictions on their own, then compare with a partner."
        },
        {
          min: 10,
          what: "Class demo: slow the source to 1 photon per second, then speed it up. Discuss how random dots form a regular pattern."
        },
        {
          min: 15,
          what: "Activity 1: students measure the fringe spacing for several wavelengths and slit separations and compare with the formula."
        },
        {
          min: 10,
          what: "Activity 2: students switch on the which-path detector and close one slit, sketching what happens to the pattern."
        },
        {
          min: 10,
          what: "Wrap-up: discuss the questions, then do the quiz together. Return to the predictions and ask who changed their mind."
        }
      ],
      vocabulary: [
        {
          term: "Photon",
          def: "A single particle of light. A detector always registers a whole photon at one spot."
        },
        {
          term: "Interference",
          def: "What happens when two waves overlap: crest on crest adds up (bright), crest on trough cancels (dark)."
        },
        {
          term: "Fringe spacing",
          def: "The distance between neighbouring bright stripes on the screen."
        },
        {
          term: "Wavelength",
          def: "The distance from one wave crest to the next. For visible light it is a few hundred nanometres."
        },
        {
          term: "Which-path information",
          def: "Any record, anywhere, of which slit a photon went through."
        },
        {
          term: "Diffraction envelope",
          def: "The broad pattern a single slit makes. It sets how bright the stripes are across the screen."
        }
      ],
      misconceptions: [
        "Photons split in half and each half goes through one slit. In fact the detector always clicks for a whole photon; it is the probability wave that passes through both slits.",
        "The stripes come from photons bumping into each other. The pattern still forms when photons are sent one at a time, long after the previous one has landed.",
        "The detector removes the stripes by knocking photons off course. Even an ideal detector that never nudges the photon removes them; having the information is enough.",
        "A brighter source gives wider stripes. Brightness only changes how fast the pattern builds up; the spacing depends on wavelength, distance and slit separation."
      ],
      predictions: [
        "Photons are sent one at a time at two slits. What pattern do you expect on the screen after a few thousand have landed? Sketch it.",
        "What do you think will happen to the pattern if a detector records which slit each photon goes through?",
        "If you close one of the slits, could any spot on the screen get brighter? Explain your guess."
      ],
      activities: [
        {
          title: "Measuring the fringe spacing",
          steps: [
            "Check that Slits open is set to Both and that the which-path detector is off.",
            "Set Wavelength and Slit separation to the values in one row of the table. Changing a setting clears the screen.",
            "Let at least 1,000 photons land, then read the Fringe spacing readout.",
            "Work out wavelength × 1 m ÷ separation yourself and compare it with the readout.",
            "Repeat for the other rows, choosing your own values for the last two."
          ],
          table: {
            columns: [
              "Wavelength (nm)",
              "Slit separation (mm)",
              "Fringe spacing readout (mm)",
              "Your calculation (mm)"
            ],
            rows: 5
          }
        },
        {
          title: "Watching the path",
          steps: [
            "Press Clear screen and let about 1,000 photons land with both slits open. Sketch the pattern.",
            "Switch on Watch which slit each photon uses and let 1,000 photons land. Sketch the new pattern.",
            "Switch the detector off and choose Top only under Slits open. Let 1,000 photons land and sketch the pattern.",
            "Find a place that was dark with both slits open but receives photons with one slit. Mark it on your sketches."
          ],
          table: {
            columns: ["Setting", "Photons detected", "Stripes? (yes or no)", "Description of the pattern"],
            rows: 3
          }
        }
      ],
      questions: [
        "Each photon lands at a random spot. Why does the overall pattern always come out the same?",
        "Opening a second slit made some spots darker. How can adding a second path reduce the light reaching a spot?",
        "The detector in this experiment never pushes the photons. Why do the stripes still disappear when it is switched on?",
        "X-ray crystallography uses the spacing rule backwards. Which quantity does it solve for, and what is measured instead?"
      ],
      answers: [
        "Prediction 1: Many evenly spaced bright and dark stripes, even though each photon arrives as a single dot. Most students expect two bands.",
        "Prediction 2: The stripes disappear and two overlapping blobs remain, the pattern tiny bullets would make.",
        "Prediction 3: Yes. Spots that were dark because the two waves cancelled receive light again when only one slit is open.",
        "Question 1: The landing spot of each photon is random, but the probability of each spot is fixed by the wave pattern. With many photons the counts follow those probabilities closely.",
        "Question 2: Probabilities come from adding wave amplitudes, which can be positive or negative. Where the two waves arrive out of step they cancel, so the chance of a photon landing there drops to zero.",
        "Question 3: Interference needs the two paths to be indistinguishable. Once a record of the slit exists anywhere, the two possibilities no longer combine, whether or not the photon was disturbed.",
        "Question 4: It solves for the separation, which is the spacing between rows of atoms in the crystal. The X-ray wavelength is known, and the spot spacing and the distance to the detector are measured."
      ]
    }
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
    ],
    challenges: [
      {
        id: "bell",
        goal: "Run the Bell test and see quantum rules break the limit of 2.",
        hint: "The button is in the Bell test card below the experiment."
      },
      {
        id: "never-agree",
        goal: "With Quantum rules, set the polarizers 90° apart and measure at least 200 pairs that never agree.",
        hint: "Pairs at these angles counts only pairs measured at the current angle difference."
      },
      {
        id: "beat-plan",
        goal: "Under Quantum rules, find the angle difference where quantum rules beat the best hidden-instruction plan by the most, then measure 1,000 pairs there.",
        hint: "On the agreement chart, the shaded gap between the curve and the straight line is widest at one spot."
      }
    ],
    teach: {
      level: "Ages 14–18",
      minutes: 50,
      objectives: [
        "Students can describe entanglement in terms of correlated measurement results.",
        "Students can compare the quantum prediction cos²(Δ) with the best hidden-instruction plan at different angles.",
        "Students can explain what the Bell score S measures and why a score above 2 rules out hidden instructions.",
        "Students can explain why entanglement cannot be used to send a message."
      ],
      plan: [
        {
          min: 5,
          what: "Prediction: students answer the worksheet predictions alone, then share with a partner."
        },
        {
          min: 10,
          what: "Class demo: send single pairs with both polarizers at 0°, then 90° apart. Ask students to describe the pattern in the two rows of results."
        },
        {
          min: 15,
          what: "Activity 1: students measure the agreement at several angle differences and compare it with both predictions."
        },
        {
          min: 10,
          what: "Activity 2: students run the Bell test several times and discuss what the score means."
        },
        {
          min: 10,
          what: "Wrap-up: discuss the questions, especially why Bob alone only sees coin flips. Finish with the quiz."
        }
      ],
      vocabulary: [
        {
          term: "Entanglement",
          def: "A link between two particles whose measurement results agree more often than any plan made in advance allows."
        },
        {
          term: "Polarizer",
          def: "A filter that passes light lined up with its axis. A single photon either passes or is blocked."
        },
        {
          term: "Correlation",
          def: "How often two sets of results match. Here, the share of pairs where Alice and Bob get the same result."
        },
        {
          term: "Hidden instructions",
          def: "The idea that each photon leaves the source carrying a plan that fixes its result in advance (local hidden variables)."
        },
        {
          term: "Bell score S",
          def: "A combination of agreement scores at four pairs of settings. Hidden-instruction theories can never score above 2."
        }
      ],
      misconceptions: [
        "Measuring one photon sends a signal to the other. Bob's own results are always a 50/50 coin flip whatever Alice does, so no message can be sent.",
        "Entangled photons always give the same result. They only always agree when the polarizers are parallel; otherwise they agree with probability cos²(Δ).",
        "The photons simply had their answers decided at the source. That is exactly the hidden-instruction idea, and the Bell test shows it cannot match the results.",
        "Quantum rules always agree more often than hidden instructions. Between 45° and 90° apart, quantum rules agree less often; the curve crosses the straight line."
      ],
      predictions: [
        "If both polarizers are at the same angle, how often do you think Alice's and Bob's results will agree?",
        "If the polarizers are 90° apart, how often will they agree?",
        "If the polarizers are 45° apart, what agreement rate do you expect? Explain your reasoning."
      ],
      activities: [
        {
          title: "Agreement against angle",
          steps: [
            "Keep The universe runs on set to Quantum rules and Alice's polarizer at 0°.",
            "Set Bob's polarizer to an angle for the first row of the table, for example 0°, 22.5°, 45°, 67.5° and 90°.",
            "Press Send 500 two or three times, then read Results agree, Quantum predicts and Best hidden-instruction plan.",
            "Repeat for each row. Then switch to Hidden instructions and repeat two of the rows."
          ],
          table: {
            columns: [
              "Bob's polarizer (°)",
              "Pairs at these angles",
              "Results agree (%)",
              "Quantum predicts (%)",
              "Best hidden-instruction plan (%)"
            ],
            rows: 5
          }
        },
        {
          title: "The Bell test",
          steps: [
            "Read the description in the Bell test card and note the four pairs of angles it uses.",
            "Press Run the Bell test and record the score for Quantum rules and for Hidden instructions.",
            "Run it four more times. Does the hidden-instruction score ever go clearly above 2?"
          ],
          table: {
            columns: ["Run", "Quantum rules S", "Hidden instructions S"],
            rows: 5
          }
        }
      ],
      questions: [
        "Bob only looks at his own results. Why can he not tell which angle Alice chose?",
        "At which angle differences do the quantum and hidden-instruction predictions match, and where do they differ most?",
        "The hidden-instruction universe sometimes scores slightly above 2. Why does that not break Bell's limit?",
        "Quantum cryptography uses entangled photons to share secret keys. Why would an eavesdropper show up in the Bell score?"
      ],
      answers: [
        "Prediction 1: They agree every time (100%) when the polarizers are parallel.",
        "Prediction 2: They never agree (0%) when the polarizers are 90° apart.",
        "Prediction 3: 50%, since cos²(45°) = 0.5. Hidden instructions also give 50% there; the difference shows at angles such as 22.5°, about 85% against 75%.",
        "Question 1: Each of Bob's photons passes or is blocked 50/50 whatever Alice does. The pattern only appears when the two lists are compared, and comparing them needs an ordinary signal.",
        "Question 2: They match at 0°, 45° and 90°. They differ most near 20° (quantum about 10 points higher) and near 70° (quantum about 10 points lower).",
        "Question 3: The score comes from a finite number of random pairs, so it scatters a little around 2. The limit applies to the long-run average. Quantum rules reach about 2.83, far beyond that noise.",
        "Question 4: Measuring the photons on the way disturbs the entanglement, which weakens the correlations and pulls S down toward 2 or below."
      ]
    }
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
    ],
    challenges: [
      {
        id: "thick-wall",
        goal: "Make tunnelling rare: change the barrier until less than 1% of the wave is transmitted.",
        hint: "Inside the barrier the wave fades exponentially, so the width matters a lot."
      },
      {
        id: "bounce-back",
        goal: "Give the electron more energy than the barrier is high, yet make at least 30% of the wave reflect.",
        hint: "Try an energy only a little above the barrier height."
      },
      {
        id: "coin-flip",
        goal: "Make tunnelling a coin toss: with Electron energy below Barrier height, get between 48% and 52% transmitted.",
        hint: "Use a thin, low barrier and fine-tune one slider at a time."
      }
    ],
    teach: {
      level: "Ages 14–18",
      minutes: 45,
      objectives: [
        "Students can describe an electron as a wave packet whose height shows where it is likely to be found.",
        "Students can explain why a quantum particle can cross a barrier that a classical ball cannot.",
        "Students can describe how transmission depends on barrier width, barrier height and electron energy.",
        "Students can interpret a transmission percentage as a probability for a single electron."
      ],
      plan: [
        {
          min: 5,
          what: "Prediction: students answer the worksheet predictions, then vote on what happens with the default settings."
        },
        {
          min: 10,
          what: "Class demo: run the default settings and race the classical ball. Point out the part of the wave that leaks through."
        },
        {
          min: 15,
          what: "Activity 1: students change the barrier width and record the transmission, looking for an exponential pattern."
        },
        {
          min: 10,
          what: "Activity 2: students raise the energy above the barrier and look for reflection that a ball would never show."
        },
        {
          min: 5,
          what: "Wrap-up: link to flash memory and the scanning tunnelling microscope, then do the quiz."
        }
      ],
      vocabulary: [
        {
          term: "Quantum tunnelling",
          def: "A particle crossing an energy barrier higher than its own energy, which a classical object could never do."
        },
        {
          term: "Wave packet",
          def: "A short bump of wave that describes where a particle is likely to be; |ψ|² shows the probability."
        },
        {
          term: "Energy barrier",
          def: "A region where a particle would need more energy than it has to pass, like a hill for a rolling ball."
        },
        {
          term: "Electronvolt (eV)",
          def: "A tiny unit of energy used for electrons: the energy an electron gains crossing 1 volt."
        },
        {
          term: "Transmission",
          def: "The fraction of the wave, and so the probability, that ends up on the far side of the barrier."
        },
        {
          term: "Exponential decay",
          def: "Shrinking by the same factor over each equal step, so each extra bit of thickness multiplies the odds down."
        }
      ],
      misconceptions: [
        "The electron borrows energy to jump over the barrier. Its energy stays the same; its wave simply does not drop to zero inside the barrier.",
        "Part of the electron goes through and part bounces back. Each electron is always detected whole on one side; the percentages are probabilities.",
        "A particle with more energy than the barrier always gets through. A wave partly reflects at any sudden change, even one it has enough energy to cross.",
        "Doubling the width halves the transmission. Transmission falls exponentially, so doubling the width can cut it by far more than half."
      ],
      predictions: [
        "A ball rolls toward a hill it does not have enough energy to climb. What happens to it? What do you think happens to an electron in the same situation?",
        "If you make the barrier twice as wide, what will happen to the chance of getting through?",
        "If the electron has more energy than the barrier is high, will any of it bounce back?"
      ],
      activities: [
        {
          title: "Width and transmission",
          steps: [
            "Set Barrier height to 1.00 eV and Electron energy to 0.60 eV.",
            "Set Barrier width to 0.25 nm. The run restarts by itself.",
            "When the run shows finished, record the Transmitted and Quantum theory readouts. Switch on Magnify past the barrier ×20 if the transmitted wave is hard to see.",
            "Repeat for widths of 0.50, 0.75, 1.00 and 1.25 nm.",
            "Each time you add 0.25 nm, does the transmission go down by the same amount, or get divided by the same factor?"
          ],
          table: {
            columns: [
              "Barrier width (nm)",
              "Transmitted (%)",
              "Quantum theory (%)",
              "Classical ball gets through (%)"
            ],
            rows: 5
          }
        },
        {
          title: "Above the barrier",
          steps: [
            "Set Barrier height to 0.50 eV and Barrier width to 0.50 nm.",
            "Set Electron energy to a value above 0.50 eV, for example 0.60, 0.80, 1.20 and 2.00 eV.",
            "When each run finishes, record Transmitted and Reflected and compare them with Classical ball gets through."
          ],
          table: {
            columns: [
              "Electron energy (eV)",
              "Transmitted (%)",
              "Reflected (%)",
              "Classical ball gets through (%)"
            ],
            rows: 4
          }
        }
      ],
      questions: [
        "Why does the classical ball always bounce back when its energy is below the barrier, while part of the electron's wave gets through?",
        "Describe how the transmission changed as you made the barrier wider. Why is this called exponential?",
        "The readout shows 14% transmitted. What does that tell you about a single electron sent at the barrier?",
        "Flash memory stores data by trapping electrons behind a thin insulating layer. Why must that layer not be too thin?"
      ],
      answers: [
        "Prediction 1: The ball rolls back every time. The electron usually reflects but has a real chance of appearing on the far side, about 14% with the default settings.",
        "Prediction 2: It falls by much more than half, because the wave fades exponentially inside the barrier. Going from 0.5 nm to 1.0 nm takes it from about 14% to under 1%.",
        "Prediction 3: Yes. Part of the wave reflects even when the energy is above the barrier, most of all when the energy is only a little higher.",
        "Question 1: A classical ball needs enough energy at every point of its path. The electron's wave does not stop at the edge of the barrier; it fades inside, and if the barrier is thin some of it is left at the far side.",
        "Question 2: Each extra 0.25 nm divides the transmission by roughly the same factor instead of subtracting a fixed amount. Repeated division by a constant factor is exponential decay.",
        "Question 3: Each electron has a 14% chance of being detected on the far side and an 86% chance of being reflected. It is always found whole on one side.",
        "Question 4: If the layer is too thin, trapped electrons tunnel through it and leak away, and the stored data is lost. This limits how small memory cells can be made."
      ]
    }
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
    ],
    challenges: [
      {
        id: "read-path",
        goal: "Set the twin's polarizer to 0° to read the path, and sort at least 1,000 hits into D1 and D2.",
        hint: "Read the path (0°) under Polarizer presets does it in one click. Do either of the groups show stripes?"
      },
      {
        id: "delayed-choice",
        goal: "Turn on the delay, let at least 500 twins pile up in the fibre, then measure them at 45°.",
        hint: "Hits stay grey until you press Measure stored twins."
      },
      {
        id: "half-erased",
        goal: "Erase the path only halfway: set the polarizer so each sorted group has between 45% and 55% fringe visibility, then sort 2,000 hits.",
        hint: "Visibility follows |sin(2 × angle)|. Try angles between 0° and 45°."
      }
    ],
    teach: {
      level: "Ages 14–18",
      minutes: 50,
      objectives: [
        "Students can explain why the bare screen shows no stripes when the twin carries a which-path record.",
        "Students can describe how sorting screen hits by the twin's result reveals stripes and matching gaps.",
        "Students can explain why a delayed choice does not change where photons have already landed.",
        "Students can relate fringe visibility to how much which-path information can still be read."
      ],
      plan: [
        {
          min: 5,
          what: "Prediction: students answer the worksheet predictions on their own."
        },
        {
          min: 10,
          what: "Recap the double-slit experiment, then demo the eraser at 45° and explain the three panels."
        },
        {
          min: 15,
          what: "Activity 1: students compare several polarizer angles, recording the visibility and describing the sorted panels."
        },
        {
          min: 10,
          what: "Activity 2: the delayed choice. Students store twins, then measure, and discuss what changed and what did not."
        },
        {
          min: 10,
          what: "Wrap-up: discuss the questions and challenge the idea of changing the past. Do the quiz."
        }
      ],
      vocabulary: [
        {
          term: "Twin photons",
          def: "Two photons made together in a crystal whose properties are linked; here the twin records which slit its partner used."
        },
        {
          term: "Which-path tag",
          def: "A label on the path: the top slit gives horizontal polarization (H), the bottom slit vertical (V)."
        },
        {
          term: "Quantum eraser",
          def: "A measurement on the twin that makes the which-path record impossible to read, so interference shows up in sorted data."
        },
        {
          term: "Sorting by coincidence",
          def: "Grouping screen hits according to what happened to each one's twin."
        },
        {
          term: "Fringe visibility",
          def: "How strong the stripes are: 100% means fully dark gaps, 0% means no stripes at all."
        },
        {
          term: "Delayed choice",
          def: "Deciding how to measure the twin after its partner has already hit the screen."
        }
      ],
      misconceptions: [
        "Erasing the record makes stripes appear on the screen. The bare screen always shows a blob; stripes only appear after sorting by the twin's result.",
        "A later choice reaches back in time and moves earlier photons. No dot ever moves; the choice only decides how the existing dots can be grouped.",
        "The twin could be used to send a message to the screen. The screen pattern is the same whatever is done to the twin, so no information gets through."
      ],
      predictions: [
        "With which-path tags on, will the screen on its own show stripes? Why?",
        "If you measure the twin in a way that erases the path information, what do you expect to see on the screen?",
        "If you decide how to measure the twin after its partner has already landed, can that change the dots on the screen?"
      ],
      activities: [
        {
          title: "Reading or erasing the path",
          steps: [
            "Check that Each slit leaves a record in the twin is switched on.",
            "Set Twin's polarizer to an angle for the first row, for example 0°, 15°, 30°, 45° and 60°. Sorted hits are cleared when you change it.",
            "Wait until the two numbers in Twins at D1 · D2 add up to at least 1,000, then record Fringe visibility in each sorted group.",
            "Describe the D1 and D2 panels in a few words."
          ],
          table: {
            columns: [
              "Twin's polarizer (°)",
              "Fringe visibility in each sorted group (%)",
              "D1 panel",
              "D2 panel"
            ],
            rows: 5
          }
        },
        {
          title: "The delayed choice",
          steps: [
            "Press Clear screen, then switch on Hold twins in a fibre until I measure.",
            "Let about 1,000 hits collect. Notice that they are grey: none have been sorted.",
            "Decide on an angle, set it, then press Measure stored twins.",
            "Record what happened to the top panel and to the two sorted panels.",
            "Repeat with the other preset under Polarizer presets."
          ],
          table: {
            columns: [
              "Angle chosen (°)",
              "Screen hits",
              "Did the top panel change?",
              "What the sorted panels show"
            ],
            rows: 2
          }
        }
      ],
      questions: [
        "Why does the top panel never show stripes while the tags are on, whatever you do to the twin?",
        "At 45°, D1 shows stripes and D2 shows the gaps. Why do the two groups add back up to a plain blob?",
        "In the delayed choice, the decision was made after the hits had landed. Explain why this does not mean the future changed the past.",
        "To sort the hits, each one must be matched with its twin's result. Why does this stop anyone using the experiment to send a message faster than light?"
      ],
      answers: [
        "Prediction 1: No. The twin's polarization holds a which-path record, so the two paths cannot interfere and the screen shows a smooth blob.",
        "Prediction 2: The screen on its own still shows a blob. Sorting the hits by D1 and D2 reveals stripes in one group and the matching gaps in the other.",
        "Prediction 3: No. The dots stay where they are; the choice only decides which groups they can be sorted into.",
        "Question 1: The screen photon is tagged H or V by the slit it used, so the two paths can always be told apart in principle and the interference term is zero. Nothing done to the twin later can change its partner's statistics.",
        "Question 2: The stripes and the gaps are exactly out of step, so wherever one group has a bright stripe the other has a dark gap. Added together they fill in to the plain blob.",
        "Question 3: The screen record is identical whatever is chosen. The choice only creates a new record, D1 or D2, that tells you how to group dots that were already there, so nothing about the past is altered.",
        "Question 4: The screen alone shows the same blob whatever happens to the twin. The pattern only appears after the twin's results arrive by an ordinary signal, which cannot travel faster than light."
      ]
    }
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
    ],
    challenges: [
      {
        id: "vacuum",
        goal: "Pump out the gas and keep 100% coherence for a whole run.",
        hint: "A run ends when the coherence trace reaches the right edge of its panel."
      },
      {
        id: "one-hit",
        goal: "Set Coupling per collision to 100% and watch a single collision wipe out the fringes.",
        hint: "Keep some gas in the chamber, press New superposition for a fresh run, then wait for the first bounce."
      },
      {
        id: "slow-decay",
        goal: "Keep at least 100 gas particles and a coupling of 1% or more, yet make the Average decoherence time longer than 20 s.",
        hint: "You need fewer, gentler collisions per second. Think about temperature and coupling."
      }
    ],
    teach: {
      level: "Ages 14–18",
      minutes: 45,
      objectives: [
        "Students can explain that a superposition shows interference only while no record of the path exists.",
        "Students can describe how collisions with gas particles carry away which-path information.",
        "Students can relate pressure, temperature and coupling to how fast coherence decays.",
        "Students can explain why large objects are never seen in two places at once in everyday life."
      ],
      plan: [
        {
          min: 5,
          what: "Prediction: students answer the worksheet predictions on their own."
        },
        {
          min: 10,
          what: "Class demo: watch a run with the default gas, then press Pump out the gas. Explain the density matrix squares in plain words."
        },
        {
          min: 15,
          what: "Activity 1: students change pressure, temperature and coupling one at a time and record the average decoherence time."
        },
        {
          min: 10,
          what: "Activity 2: students use Scale it up to compare objects and surroundings, then rank them."
        },
        {
          min: 5,
          what: "Wrap-up: discuss why a cat is never seen in two places, and why quantum computers need cold, isolated hardware. Do the quiz."
        }
      ],
      vocabulary: [
        {
          term: "Superposition",
          def: "A state where an object is in two possibilities at once, here two places, which can still interfere."
        },
        {
          term: "Decoherence",
          def: "The loss of interference when the surroundings pick up information about which possibility is true."
        },
        {
          term: "Coherence",
          def: "How strongly the two branches can still interfere; it sets the fringe visibility."
        },
        {
          term: "Density matrix",
          def: "A 2×2 table describing the state: the diagonal gives the odds of each path, the off-diagonal how well they can still interfere."
        },
        {
          term: "Fringe visibility",
          def: "How strong the interference stripes are, from 100% (full contrast) to 0% (none)."
        },
        {
          term: "Environment",
          def: "Everything around the object, such as gas molecules and light, that can carry information away."
        }
      ],
      misconceptions: [
        "A collision forces the object to pick one place. Both branches still exist; the gas just carries a hint of which is which, so they can no longer interfere.",
        "Decoherence only happens when a scientist looks. Any stray particle that interacts with the object records information, whether or not anyone reads it.",
        "Big objects do not follow quantum rules. The same rules apply, but big objects are hit so often that their superpositions decohere almost instantly.",
        "Collisions push the object into one path. Here the odds of each path stay at 50/50; only the ability to interfere is lost."
      ],
      predictions: [
        "A gas molecule bounces off an object that is in two places at once. What do you think happens to the superposition?",
        "If you make the gas hotter, will the superposition last longer or shorter? Why?",
        "How long do you think a dust grain in ordinary air could stay in two places at once?"
      ],
      activities: [
        {
          title: "What makes coherence fade faster?",
          steps: [
            "Start from the default settings and read Average decoherence time.",
            "Change only Gas particles (pressure) and record the new time, then set it back to 40.",
            "Do the same for Temperature and for Coupling per collision.",
            "Describe in one sentence how each setting affects coherence."
          ],
          table: {
            columns: [
              "Setting changed",
              "New value",
              "Average decoherence time (s)",
              "Faster or slower decay?"
            ],
            rows: 6
          }
        },
        {
          title: "Scale it up",
          steps: [
            "In the Scale it up card, choose each object in turn with Air at room temperature.",
            "Record the time until the first gas molecule hits.",
            "Repeat for the dust grain in High vacuum and in Ultra-high vacuum."
          ],
          table: {
            columns: ["Object", "Surroundings", "Time until the first gas molecule hits"],
            rows: 6
          }
        }
      ],
      questions: [
        "Why do the off-diagonal squares of the density matrix shrink while the diagonal squares stay at 0.50?",
        "Explain why raising the temperature makes coherence die sooner.",
        "Use your Scale it up results to explain why we never see a cat in two places at once.",
        "Quantum computers keep their qubits very cold and well isolated. Use what you learned to explain why."
      ],
      answers: [
        "Prediction 1: The object is not forced into one place. The molecule carries away a partial record of where the object was, so the interference gets weaker.",
        "Prediction 2: Shorter. Hotter gas moves faster and hits the object more often, so which-path information builds up sooner.",
        "Prediction 3: Far less than a nanosecond. The Scale it up card estimates about 10⁻¹⁸ s, shorter than one wiggle of a light wave.",
        "Question 1: The diagonal squares are the odds of finding the object on each path, and collisions do not change those. The off-diagonal squares measure the ability to interfere, which shrinks as the gas learns which path was taken.",
        "Question 2: Faster particles collide more often each second, so the which-path record grows faster and the average decoherence time drops.",
        "Question 3: A cat in air is hit by an enormous number of molecules every second, so any superposition decoheres in a tiny fraction of a second, far too fast ever to be seen.",
        "Question 4: Every stray collision or bit of heat can carry away information about a qubit. Cold, empty, isolated surroundings mean fewer interactions, so coherence lasts long enough to compute."
      ]
    }
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
    ],
    challenges: [
      {
        id: "no-smear",
        goal: "With one magnet, turn on Show what classical magnets would do and send 1,000 atoms.",
        hint: "Choose 1 under Magnets in the chain. Do any atoms land inside the classical smear?"
      },
      {
        id: "same-answer",
        goal: "Ask the same question twice: get 500 atoms to the detector with none of them coming out down.",
        hint: "Use two magnets on the same axis."
      },
      {
        id: "one-quarter",
        goal: "Tilt the last magnet so only a quarter of the atoms go up, and confirm it with 1,000 atoms at the detector (between 22% and 28% up).",
        hint: "The chance of up is cos²(θ/2), where θ is the angle between the atom's spin and the magnet's axis."
      }
    ],
    teach: {
      level: "Ages 14–18",
      minutes: 45,
      objectives: [
        "Students can describe the Stern-Gerlach result: atoms land in exactly two spots, not a smear.",
        "Students can explain that repeating a measurement gives the same answer, while measuring along another axis resets it.",
        "Students can use cos²(θ/2) to predict the fraction of atoms that go up at a tilted magnet.",
        "Students can explain what it means for spin to be quantized."
      ],
      plan: [
        {
          min: 5,
          what: "Prediction: students answer the worksheet predictions on their own."
        },
        {
          min: 10,
          what: "Class demo: the Z set-up with the classical comparison, then Z, Z. Ask what is surprising."
        },
        {
          min: 15,
          what: "Activity 1: students record the up and down counts for each classic set-up and explain them."
        },
        {
          min: 10,
          what: "Activity 2: students tilt the second magnet and compare the measured fractions with cos²(θ/2)."
        },
        {
          min: 5,
          what: "Wrap-up: discuss Z, X, Z and how MRI scanners rely on spin. Do the quiz."
        }
      ],
      vocabulary: [
        {
          term: "Spin",
          def: "A built-in property of particles that makes them behave like tiny magnets."
        },
        {
          term: "Quantized",
          def: "Only certain values are possible. Here every spin measurement gives just up or down."
        },
        {
          term: "Stern-Gerlach magnet",
          def: "A magnet with shaped poles whose uneven field pushes tiny magnets up or down depending on how they point."
        },
        {
          term: "Axis",
          def: "The direction a magnet measures along, such as Z (up the page) or X (sideways)."
        },
        {
          term: "Probability",
          def: "How likely each outcome is. For a single atom, only the odds can be predicted."
        }
      ],
      misconceptions: [
        "Atoms are tiny compass needles pointing in random directions, so they should land in a smear. Experiments show only two spots.",
        "After passing a Z magnet, an atom keeps its Z answer forever. Measuring along X erases it, and a later Z measurement starts at 50/50 again.",
        "A measurement along X tells you nothing about Z, so it changes nothing. It changes the state, which is why down atoms reappear at the next Z magnet.",
        "Half the atoms go up at any tilted magnet. The fraction is cos²(θ/2), which is one half only at 90°."
      ],
      predictions: [
        "Silver atoms, each a tiny magnet pointing any way, fly through a shaped magnet. Sketch what you expect on the detector.",
        "Atoms that went up at a Z magnet enter a second Z magnet. What will happen?",
        "In the Z, X, Z set-up, the first magnet removes every down atom. Will any down atoms appear at the third magnet?"
      ],
      activities: [
        {
          title: "Classic set-ups",
          steps: [
            "Under Classic set-ups, press each button in turn.",
            "For each one, press Send 1,000 and record the two numbers in Final up · down.",
            "Work out what percentage of the atoms reaching the detector went up, and compare it with Last magnet predicts up."
          ],
          table: {
            columns: ["Set-up", "Final up", "Final down", "Up (%)", "Last magnet predicts up (%)"],
            rows: 5
          }
        },
        {
          title: "Tilting the second magnet",
          steps: [
            "Choose 2 under Magnets in the chain, with Magnet 1 axis at Z (0°) and Pass up selected.",
            "Set Magnet 2 axis to an angle θ for the first row, for example 30°, 60°, 90°, 120° and 180°.",
            "Press Send 1,000 and record the counts at the detector.",
            "Calculate cos²(θ/2) for each angle and compare it with your measured percentage."
          ],
          table: {
            columns: ["Magnet 2 angle θ (°)", "Final up", "Final down", "Up (%)", "cos²(θ/2) (%)"],
            rows: 5
          }
        }
      ],
      questions: [
        "Why does the Stern-Gerlach result show that spin is quantized?",
        "In the Z, Z set-up every atom goes up at the second magnet. What does this tell you about repeating a measurement?",
        "In the Z, X, Z set-up, explain where the down atoms at the third magnet come from.",
        "At what angle does magnet 2 send exactly a quarter of the atoms up? Show your working."
      ],
      answers: [
        "Prediction 1: Exactly two separate spots, one up and one down. A smear is what randomly tilted classical magnets would give.",
        "Prediction 2: They all go up again: asking the same question gives the same answer.",
        "Prediction 3: Yes. Half of the atoms reaching magnet 3 come out down, because the X measurement reset the Z answer.",
        "Question 1: Every atom lands in one of exactly two places instead of spreading over a range, so the measured spin can only take two values.",
        "Question 2: A measurement leaves the atom in the state it reported, so asking the same question straight away gives the same answer every time.",
        "Question 3: Measuring along X leaves each atom pointing along X, which is an equal mix of up and down along Z. The third magnet then finds up or down 50/50.",
        "Question 4: cos²(θ/2) = 0.25 means cos(θ/2) = 0.5, so θ/2 = 60° and θ = 120° (or 240°)."
      ]
    }
  }
});
