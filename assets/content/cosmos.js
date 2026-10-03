(window.WONDERS = window.WONDERS || {}).content = Object.assign(window.WONDERS.content || {}, {
  "time-dilation": {
    predict: {
      question: "A twin flies to Proxima Centauri and back at 0.866c. Earth waits about 9.8 years. How much does the traveller age?",
      options: ["About 9.8 years, the same as Earth", "About 4.9 years", "About 19.6 years", "No time at all"],
      answer: 1,
      reveal: "At 0.866c the Lorentz factor is exactly 2, so the traveller ages one year for every two on Earth. Most people expect time to pass the same for everyone, or think the difference is just an illusion of delayed signals.",
      tryIt: "Press the 0.866c button under Speed presets with Proxima Centauri as the Destination and compare Round trip, Earth clock with Round trip, ship clock."
    },
    quiz: [
      {
        q: "In the moving light clock, why does each tick take longer as seen from Earth?",
        options: ["The light slows down on the moving ship", "The light follows a longer slanted path at the same speed", "The mirrors move closer together", "The ship's engines disturb the clock"],
        answer: 1,
        why: "Light moves at the same speed for every observer, so a longer zig-zag path means a longer time per tick."
      },
      {
        q: "Each twin sees the other's clock running slow during the trip. Why is the traveller the younger one at the end?",
        options: ["Only the traveller turns around and changes from one moving frame to another", "The traveller's clock is broken by acceleration", "Earth's gravity speeds up the Earth twin's ageing", "It is random which twin ends up younger"],
        answer: 0,
        why: "The twins take different paths through spacetime, and the straight path of staying home holds the most time."
      },
      {
        q: "From on board, how does the ship cover 4.24 light-years in less than 4.24 years of its own time without beating light?",
        options: ["It briefly goes faster than light", "Its clock stops during the coasting part", "It measures the distance shrunk by the factor γ", "Light slows down near the star"],
        answer: 2,
        why: "The traveller sees the distance contracted by γ, which the demo shows as Distance as measured on board."
      }
    ],
    related: [
      { slug: "speed-of-light", why: "The fixed speed of light is what forces clocks to slow." },
      { slug: "curved-spacetime", why: "Gravity slows clocks too; GPS corrects for both effects." },
      { slug: "gravitational-waves", why: "Another prediction of Einstein's spacetime, now measured directly." }
    ],
    challenges: [
      {
        id: "ten-years",
        goal: "Finish a round trip that brings the traveller home at least 10 years younger than the twin on Earth.",
        hint: "Pick a farther Destination, then let the ship fly all the way home."
      },
      {
        id: "gamma-three",
        goal: "Set Ship speed so the Lorentz factor γ is between 2.95 and 3.05.",
        hint: "The 0.866c preset gives γ = 2. Go a little faster."
      },
      {
        id: "sirius-ten",
        goal: "Make the round trip to Sirius last 10.0 years on the ship clock (within 0.05 years).",
        hint: "Choose Sirius, then fine-tune Ship speed with the arrow keys and watch Round trip, ship clock."
      }
    ],
    teach: {
      level: "Ages 14–18",
      minutes: 50,
      objectives: [
        "Students can explain why a moving light clock ticks slower as seen from Earth, using the fact that light has the same speed for everyone.",
        "Students can find the Lorentz factor γ and use it to work out how long a round trip lasts for the traveller.",
        "Students can explain why the travelling twin, and not the twin on Earth, comes home younger.",
        "Students can describe real evidence for time dilation, such as muons from cosmic rays and GPS clocks."
      ],
      plan: [
        {
          min: 5,
          what: "Prediction: students answer the twin question on the worksheet without the experiment, then share guesses."
        },
        {
          min: 10,
          what: "Demonstrate the two light clocks. Ask why the moving clock's light path is longer, and what that means if light keeps the same speed."
        },
        {
          min: 10,
          what: "Activity 1: light clocks at four speeds. Students fill the table and spot how fast γ grows near c."
        },
        {
          min: 12,
          what: "Activity 2: trips to the stars. Pairs choose destinations and speeds, record the clocks and check that Earth time ÷ ship time = γ."
        },
        {
          min: 8,
          what: "Discussion: why is the traveller the younger one? Use the spacetime diagram and the turnaround. Then try the challenges."
        },
        {
          min: 5,
          what: "Wrap-up: muons and GPS as real examples. Students answer one question in their own words."
        }
      ],
      vocabulary: [
        {
          term: "Time dilation",
          def: "A moving clock runs slow compared with clocks that are at rest relative to the observer."
        },
        {
          term: "Lorentz factor γ",
          def: "γ = 1 / √(1 − v²/c²). It tells you how many seconds pass on Earth for each second on the moving ship."
        },
        {
          term: "Proper time",
          def: "The time a clock actually records as it is carried along its own path."
        },
        {
          term: "Light-year",
          def: "The distance light travels in one year, about 9.46 trillion km. It is a distance, not a time."
        },
        {
          term: "Frame of reference",
          def: "A point of view, at rest or moving steadily, from which positions and times are measured."
        },
        {
          term: "Length contraction",
          def: "A moving observer measures distances along their direction of motion shorter by the factor γ."
        }
      ],
      misconceptions: [
        "Time dilation is only an illusion caused by signals taking time to arrive. In fact the twins compare clocks side by side at the end, and they really disagree.",
        "The traveller feels time dragging. On board everything seems normal: their heart, watch and thoughts all run at the usual rate for them.",
        "Motion is relative, so the twins must end up the same age. Only the traveller turns around and changes frame, so the two situations are not the same.",
        "Time dilation only matters near the speed of light. It is tiny at everyday speeds but real, and GPS satellites must correct for it every day."
      ],
      predictions: [
        "A twin flies to Proxima Centauri (4.24 light-years away) and back at 0.866c. Earth waits about 9.8 years. How many years do you think the traveller ages?",
        "If the ship flies twice as fast, will its clock run twice as slow? Explain your guess."
      ],
      activities: [
        {
          title: "Activity 1: Light clocks at different speeds",
          steps: [
            "Under Speed presets, press 0.5c.",
            "Watch the two light clocks. Read the Lorentz factor γ in the readouts and the line under the moving clock that says how many Earth ticks pass for each ship tick.",
            "Repeat for 0.866c, 0.99c and 0.999c.",
            "Turn Show the light's path on and explain, using the slanted path, why the moving clock ticks more slowly."
          ],
          table: {
            columns: [
              "Ship speed",
              "Lorentz factor γ",
              "Earth ticks per ship tick"
            ],
            rows: 4
          }
        },
        {
          title: "Activity 2: Trips to the stars",
          steps: [
            "Choose a Destination and a speed preset.",
            "Press Launch again and watch the dials until the ship is home.",
            "Record Round trip, Earth clock, Round trip, ship clock, Age gap on return and Distance as measured on board.",
            "For each trip, divide the Earth clock time by the ship clock time and compare the answer with γ."
          ],
          table: {
            columns: [
              "Destination",
              "Ship speed",
              "Round trip, Earth clock",
              "Round trip, ship clock",
              "Age gap on return",
              "Distance as measured on board"
            ],
            rows: 5
          }
        }
      ],
      questions: [
        "Use the light clock to explain why the moving clock ticks slower as seen from Earth.",
        "At 0.866c the trip to Proxima Centauri takes 9.79 years on Earth's clock. Use γ = 2 to work out the traveller's time, then check it in the experiment.",
        "Seen from the ship, Earth's clocks run slow. Why does the traveller still come home younger?",
        "Muons made by cosmic rays about 15 km up live only about 2.2 microseconds on average. Explain how so many of them reach the ground."
      ],
      answers: [
        "Prediction 1: about 4.9 years. At 0.866c, γ = 2, so the traveller ages one year for every two on Earth. Many students say 9.8 years, the same as Earth.",
        "Prediction 2: no. γ grows slowly at first and then very fast close to c: about 1.155 at 0.5c, 2 at 0.866c, 7.1 at 0.99c and 22.4 at 0.999c. Doubling 0.5c would mean reaching c, which is impossible.",
        "Question 1: in the moving clock the light travels a longer, slanted path between the mirrors, but it still moves at the same speed c, so each tick takes longer as seen from Earth.",
        "Question 2: 9.79 ÷ 2 = 4.90 years, which matches Round trip, ship clock.",
        "Question 3: only the traveller turns around, switching from an outbound frame to an inbound one, so the situation is not symmetric. On the spacetime diagram the bent path holds less proper time than the straight one. On board, the distance is also contracted, so the traveller covers it in less of their own time.",
        "Question 4: these muons move at nearly the speed of light, with γ often 20 or more, so from the ground their clocks run slow and they live long enough to cross 15 km. From the muon's point of view, the atmosphere is contracted instead."
      ]
    }
  },

  "curved-spacetime": {
    predict: {
      question: "Around a black hole, how close can a planet or particle circle in a stable orbit according to Einstein?",
      options: ["All the way down to the event horizon", "No closer than 3 Schwarzschild radii", "No closer than 10 Schwarzschild radii", "Anywhere, as long as it moves fast enough"],
      answer: 1,
      reveal: "Einstein's extra term makes orbits inside 3 r s unstable, so anything that tries to circle closer spirals in. Newton's gravity, the common intuition, allows circular orbits all the way down.",
      tryIt: "Under Preset orbits press Last stable with Law of gravity set to Both, then press Plunge to see what happens just inside it."
    },
    quiz: [
      {
        q: "With Both selected, how does Einstein's orbit differ from Newton's dashed one?",
        options: ["It is a perfect circle", "Its closest point rotates a little further each lap, tracing a rosette", "It slowly drifts outward and escapes", "There is no difference at any distance"],
        answer: 1,
        why: "The extra 3GMu²/c² term makes the orbit precess, the same effect that explains Mercury's missing 43 arcseconds per century."
      },
      {
        q: "In 1919 Eddington measured starlight bending past the Sun. How did it compare with a Newtonian calculation?",
        options: ["It was about half as much", "It was the same", "It was about twice as much", "Light did not bend at all"],
        answer: 2,
        why: "Curved space adds to the bending, giving 4GM/(c²b), twice the Newtonian value."
      },
      {
        q: "In Light rays mode, what happens to a ray whose impact parameter b is set just below 2.598 r s?",
        options: ["It falls into the black hole", "It bends by a tiny angle and flies on", "It bounces back the way it came", "It orbits forever at 3 r s"],
        answer: 0,
        why: "Just above that value light wraps around the photon sphere at 1.5 r s before escaping; just below, it is captured."
      }
    ],
    related: [
      { slug: "time-dilation", why: "Clocks deeper in curved spacetime tick slower, like moving ones." },
      { slug: "gravitational-waves", why: "Ripples in the same spacetime curvature, sent out by orbiting masses." },
      { slug: "expanding-universe", why: "General relativity applied to the whole universe predicts expansion." }
    ],
    challenges: [
      {
        id: "own-orbit",
        goal: "Launch your own particle (drag on the sheet, or focus the sheet and press Enter) that completes 3 laps without falling in or escaping.",
        hint: "Launch sideways, not straight at the hole, at a moderate speed."
      },
      {
        id: "loop-light",
        goal: "In Light rays mode, find an impact parameter where the Einstein ray loops right around the hole and still escapes.",
        hint: "Look just above the critical value b = 2.598 rₛ."
      },
      {
        id: "close-orbit",
        goal: "With Einstein gravity, put your own particle on an orbit that comes within 4 rₛ of the hole and survives 5 laps.",
        hint: "Launch sideways from about 10 rₛ at a little under 0.2 c. The keyboard arrows give fine control of speed."
      }
    ],
    teach: {
      level: "Ages 14–18",
      minutes: 50,
      objectives: [
        "Students can describe gravity in general relativity as curved spacetime, and use the warped sheet as a model of it.",
        "Students can compare Newton's and Einstein's predictions for orbits and explain orbit precession.",
        "Students can explain why there is no stable orbit closer than 3 Schwarzschild radii, and what the event horizon is.",
        "Students can explain the bending of light by gravity, and why Einstein's value is twice Newton's."
      ],
      plan: [
        {
          min: 5,
          what: "Prediction: students answer the worksheet questions about the closest stable orbit and light bending."
        },
        {
          min: 8,
          what: "Introduce the warped sheet: the horizon, the last stable orbit at 3 rₛ and the photon sphere at 1.5 rₛ. Explain that the sheet is a picture, not a real surface."
        },
        {
          min: 14,
          what: "Activity 1: Newton against Einstein with the five preset orbits."
        },
        {
          min: 10,
          what: "Activity 2: bending light with Light rays mode and the impact parameter slider."
        },
        {
          min: 8,
          what: "Challenges: students launch their own orbits by dragging or with the keyboard."
        },
        {
          min: 5,
          what: "Wrap-up: Mercury's orbit, the 1919 eclipse and black hole images as evidence."
        }
      ],
      vocabulary: [
        {
          term: "Schwarzschild radius rₛ",
          def: "The radius of a black hole's event horizon, rₛ = 2GM/c². It grows in proportion to the mass."
        },
        {
          term: "Event horizon",
          def: "The boundary around a black hole from which nothing, not even light, can get out."
        },
        {
          term: "Precession",
          def: "The slow turning of an orbit, so its closest point moves round a little further each lap."
        },
        {
          term: "Last stable orbit",
          def: "The smallest circular orbit that survives a small nudge, at 3 rₛ for a non-spinning black hole."
        },
        {
          term: "Photon sphere",
          def: "The distance, 1.5 rₛ, where light can circle the black hole, though only unstably."
        },
        {
          term: "Impact parameter b",
          def: "How far to the side of the black hole a ray of light is aimed, measured before it starts to bend."
        }
      ],
      misconceptions: [
        "Black holes suck in everything near them. Far from the hole, orbits are almost exactly Newtonian, the same as around a star of the same mass.",
        "Light has no mass, so gravity cannot affect it. Light follows the curvature of spacetime, so it bends and can even be captured.",
        "The rubber sheet shows that gravity means rolling downhill. The sheet is only a picture of curved space; it leaves out curved time, which matters just as much.",
        "Einstein proved Newton wrong, so Newton's gravity is useless. Newton's law is an excellent approximation wherever gravity is weak, and spacecraft are still steered with it."
      ],
      predictions: [
        "How close to a black hole do you think a planet or particle can circle in a stable orbit?",
        "Does starlight passing the Sun bend? If it does, do you think Einstein predicts more or less bending than Newton?"
      ],
      activities: [
        {
          title: "Activity 1: Newton against Einstein",
          steps: [
            "Set Launch to Particles and Law of gravity to Both.",
            "Press Clear, then press one button under Preset orbits.",
            "Watch for at least three laps. Compare the solid Einstein orbit with the dashed Newton orbit and record Orbit shift per lap, Einstein and Latest launch.",
            "Repeat for Precessing, Circular, Last stable, Zoom-whirl and Plunge."
          ],
          table: {
            columns: [
              "Preset",
              "What the Einstein orbit does",
              "What the Newton orbit does",
              "Orbit shift per lap, Einstein",
              "Latest launch"
            ],
            rows: 5
          }
        },
        {
          title: "Activity 2: Bending light",
          steps: [
            "Set Launch to Light rays and Law of gravity to Both.",
            "Move the Impact parameter b slider to 8, 5, 3.5, 2.7 and 2.6 rₛ.",
            "For each value, record Bending, Einstein, Bending, Newton and Fate.",
            "Find the smallest b that still escapes."
          ],
          table: {
            columns: [
              "Impact parameter b",
              "Bending, Einstein",
              "Bending, Newton",
              "Weak-field 4GM/(c²b)",
              "Fate"
            ],
            rows: 5
          }
        }
      ],
      questions: [
        "Describe how the Einstein and Newton orbits differ in the Precessing preset. Which planet in our Solar System shows this effect?",
        "What happens to the Last stable orbit after a small nudge, and what happens to the Plunge orbit?",
        "Far from the hole, how does Bending, Einstein compare with Bending, Newton? Why is Einstein's bending bigger?",
        "Why is it wrong to say that black holes suck in everything near them?"
      ],
      answers: [
        "Prediction 1: no closer than 3 rₛ for a stable orbit. Inside that, any orbit eventually spirals in. Many students say right down to the horizon.",
        "Prediction 2: yes, starlight bends. Einstein predicts twice Newton's value, about 1.75 arcseconds at the edge of the Sun, which Eddington's 1919 eclipse measurement supported.",
        "Question 1: the Einstein orbit's closest point moves forward a little each lap, drawing a rosette, while the Newton orbit repeats the same ellipse. Mercury's closest point to the Sun moves an extra 43 arcseconds per century because of this.",
        "Question 2: the nudged Last stable orbit drifts slowly inward and then falls through the horizon, because no stable circle exists inside 3 rₛ. The Plunge particle has too little sideways speed and spirals through the horizon with Einstein's law, while Newton's version swings round and survives.",
        "Question 3: far from the hole Einstein's bending is about twice Newton's, matching 4GM/(c²b). Roughly half comes from the slowing of time near the mass, which Newton's law also gives, and half from the curvature of space itself.",
        "Question 4: at a large distance a black hole pulls just like any star of the same mass, and particles orbit it normally. Capture only becomes unavoidable within a few rₛ."
      ]
    }
  },

  "gravitational-waves": {
    predict: {
      question: "You move a black hole merger twice as far from Earth. What happens to the peak strain a detector records?",
      options: ["It drops to a quarter", "It halves", "It stays the same", "It drops to an eighth"],
      answer: 1,
      reveal: "Wave amplitude falls as 1/distance, so twice as far gives half the strain. Most people expect the inverse-square law of brightness, but that applies to energy, not to the stretch a detector measures.",
      tryIt: "Load the GW150914 preset, note the Peak strain, then double the Distance slider and read it again."
    },
    quiz: [
      {
        q: "How do the Plus and Cross polarizations differ on the ring of particles?",
        options: ["Plus stretches space and Cross compresses it", "They are the same stretch-and-squeeze pattern rotated by 45°", "Cross only happens for heavy black holes", "Plus moves the ring sideways, Cross moves it up and down"],
        answer: 1,
        why: "Both stretch one direction while squeezing the perpendicular one; the axes are simply rotated 45° apart."
      },
      {
        q: "You make both black holes lighter. What happens to the chirp?",
        options: ["It gets lower and shorter", "Nothing changes except loudness", "It stops chirping and becomes a steady tone", "It sweeps to higher frequencies and lasts longer"],
        answer: 3,
        why: "Lighter objects can orbit closer and faster before they touch, so the signal reaches higher pitches and spends longer in band."
      },
      {
        q: "How many stretch-and-squeeze cycles does the ring go through for each orbit of the pair?",
        options: ["One", "Two", "Four", "It depends on the distance"],
        answer: 1,
        why: "The pair looks the same after half a turn, so each orbit sends out two crests and the wave frequency is twice the orbital frequency."
      }
    ],
    related: [
      { slug: "curved-spacetime", why: "The waves are travelling ripples in spacetime curvature." },
      { slug: "expanding-universe", why: "Chirps act as standard sirens for measuring the Hubble constant." },
      { slug: "speed-of-light", why: "GW170817 showed gravitational waves travel at light speed." }
    ],
    challenges: [
      {
        id: "half-strain",
        goal: "Keep GW150914's masses (36 and 29 M☉) and move the merger until its Peak strain is half the original value.",
        hint: "Strain falls as 1 / distance."
      },
      {
        id: "energy",
        goal: "Turn more than 7 M☉ of mass into gravitational waves.",
        hint: "Make both black holes heavy and nearly equal."
      },
      {
        id: "peak-pause",
        goal: "Press Pause at a moment when Strain now is at least 80% of the Peak strain.",
        hint: "Set Polarization on the ring to Both so the strain stops swinging through zero, then pause right at the merger."
      }
    ],
    teach: {
      level: "Ages 14–18",
      minutes: 45,
      objectives: [
        "Students can describe a gravitational wave as a ripple in spacetime that stretches and squeezes distances at right angles to each other.",
        "Students can explain why the chirp rises in frequency and amplitude as two black holes spiral together, and then rings down.",
        "Students can explain why the strain a detector measures falls as 1 / distance, and how tiny it is.",
        "Students can describe how LIGO uses two long arms at right angles to measure the strain."
      ],
      plan: [
        {
          min: 5,
          what: "Prediction: students answer the worksheet questions about distance and pitch."
        },
        {
          min: 8,
          what: "Watch one GW150914 merger together. Point out the orbit, the ring of particles and the waveform, then play the chirp."
        },
        {
          min: 12,
          what: "Activity 1: masses and the chirp, using the three presets."
        },
        {
          min: 10,
          what: "Activity 2: how strain fades with distance."
        },
        {
          min: 5,
          what: "Challenges, especially pausing at the peak with Polarization set to Both."
        },
        {
          min: 5,
          what: "Wrap-up: how LIGO's arms detect a stretch far smaller than a proton, and why two detectors are needed."
        }
      ],
      vocabulary: [
        {
          term: "Gravitational wave",
          def: "A ripple in the shape of spacetime that travels at the speed of light, sent out by accelerating masses."
        },
        {
          term: "Strain h",
          def: "The fraction by which a length is stretched or squeezed. A strain of 10⁻²¹ changes a 4 km arm by about 4×10⁻¹⁸ m."
        },
        {
          term: "Chirp",
          def: "The signal from merging objects, rising quickly in frequency and loudness, like a bird's chirp."
        },
        {
          term: "Chirp mass",
          def: "A combination of the two masses that sets how fast the chirp sweeps upward in frequency."
        },
        {
          term: "Ringdown",
          def: "The final part of the signal, when the newly formed black hole settles down, like a struck bell."
        },
        {
          term: "Solar mass M☉",
          def: "The mass of the Sun, about 2×10³⁰ kg, used as a unit for stars and black holes."
        }
      ],
      misconceptions: [
        "Gravitational waves are a kind of sound. They are ripples in spacetime that cross empty space at the speed of light; the chirp you hear is the signal turned into sound.",
        "The strain falls with the square of distance, like brightness. The energy does, but the strain itself falls as 1 / distance.",
        "A force pushes the particles in the ring. The distances between them change because space itself is stretched and squeezed.",
        "The black holes merge in a huge explosion of light. Two black holes in empty space give off almost nothing but gravitational waves."
      ],
      predictions: [
        "You move a black hole merger twice as far from Earth. What do you think happens to the peak strain a detector records?",
        "Do you think heavier black holes make a higher or a lower pitched chirp? Why?"
      ],
      activities: [
        {
          title: "Activity 1: Masses and the chirp",
          steps: [
            "Press the GW150914 preset and watch one full merger.",
            "Press Play the chirp and listen.",
            "Repeat with the 10 + 8 M☉ and 80 + 70 M☉ presets.",
            "For each, record Chirp mass, Peak strain and Mass turned into waves, and the highest Wave frequency you see near the merger."
          ],
          table: {
            columns: [
              "Masses (M☉)",
              "Chirp mass",
              "Peak strain",
              "Highest wave frequency",
              "Mass turned into waves"
            ],
            rows: 3
          }
        },
        {
          title: "Activity 2: How strain fades with distance",
          steps: [
            "Press the GW150914 preset and record the Peak strain at 1.3 billion ly.",
            "Move the Distance slider to about 2.6 billion ly, 650 million ly and 5.2 billion ly, recording the Peak strain each time.",
            "Multiply the distance by the peak strain for each row.",
            "Describe the pattern you find."
          ],
          table: {
            columns: [
              "Distance",
              "Peak strain",
              "Distance × peak strain"
            ],
            rows: 4
          }
        }
      ],
      questions: [
        "Why does the wave frequency rise as the black holes spiral closer together?",
        "Doubling the distance halves the strain, but a light bulb twice as far away looks four times dimmer. Explain the difference.",
        "GW150914's peak strain was about 1×10⁻²¹. By roughly how much did LIGO's 4 km arms change in length?",
        "Where did the energy carried away by the waves come from?"
      ],
      answers: [
        "Prediction 1: it halves. The strain falls as 1 / distance. Many students expect a quarter, by thinking of the inverse-square law for brightness.",
        "Prediction 2: lower. Heavier black holes are bigger, so they touch and merge while orbiting more slowly, and the chirp ends at a lower frequency.",
        "Question 1: as the orbit shrinks, the black holes move faster and go round more often. The wave frequency is twice the orbit frequency, so it climbs, which is the chirp.",
        "Question 2: brightness measures energy, which depends on the amplitude squared. Energy falls as 1 / distance², so the amplitude, which is what the strain measures, falls as 1 / distance.",
        "Question 3: about h × L = 1×10⁻²¹ × 4000 m = 4×10⁻¹⁸ m, less than a hundredth of the width of a proton.",
        "Question 4: from the mass of the black holes. For GW150914 about 3 M☉ of mass was turned into wave energy (E = mc²), shown as Mass turned into waves. The final black hole is lighter than the two added together."
      ]
    }
  },

  "expanding-universe": {
    predict: {
      question: "Every galaxy recedes from ours. If you stood in a galaxy at the edge of the field instead, what would you see?",
      options: ["Everything rushing back toward the centre", "Galaxies on one side approaching, the other receding", "Every galaxy receding from you, with the same Hubble slope", "All galaxies standing still"],
      answer: 2,
      reveal: "Uniform stretching multiplies every distance by the same factor, so every galaxy sees itself at the centre with the same slope. Most people picture an explosion from one special point, with us near the middle.",
      tryIt: "Click a galaxy near the edge of the field, or press Move to another galaxy, and watch the Fitted slope H stay the same."
    },
    quiz: [
      {
        q: "If light left its galaxy when the universe was 50% of today's size, what happens to its wavelength by the time it arrives?",
        options: ["It is unchanged", "It is twice as long", "It is half as long", "It is four times as long"],
        answer: 1,
        why: "The wavelength stretches by exactly the factor the universe grew while the light travelled, here a factor of 2, which is a redshift z of 1."
      },
      {
        q: "When you drag the Cosmic time slider into the past, what happens to the fitted slope H?",
        options: ["It gets steeper", "It stays exactly the same", "It gets shallower", "It turns negative"],
        answer: 0,
        why: "The expansion rate changes over time; H₀ is only its value today, and in this model H was larger in the past."
      },
      {
        q: "What does pressing Run the clock backwards show?",
        options: ["Galaxies converging on our galaxy only", "Galaxies shrinking in size while gaps stay fixed", "Nothing, since the expansion cannot be reversed", "Every galaxy meeting every other one at once, about 1/H₀ ago"],
        answer: 3,
        why: "Running uniform expansion backwards brings all distances to zero together, roughly 14 billion years ago for H₀ = 70 km/s/Mpc."
      }
    ],
    related: [
      { slug: "speed-of-light", why: "Light's travel time means looking far out is looking back." },
      { slug: "gravitational-waves", why: "Merger chirps give an independent measure of H₀." },
      { slug: "curved-spacetime", why: "Expansion comes from the same Einstein equations as orbits." }
    ],
    challenges: [
      {
        id: "infrared",
        goal: "Make the 486 nm hydrogen line arrive in the infrared, beyond 700 nm.",
        hint: "Send the light from further back, when the universe was smaller."
      },
      {
        id: "bang-home",
        goal: "Move to another galaxy, then run the clock backwards until every galaxy crowds onto your new home.",
        hint: "Use Move to another galaxy or click a galaxy, then press Run the clock backwards."
      },
      {
        id: "age",
        goal: "At today's cosmic time, change H₀ so that 1 / slope reads between 13.6 and 13.9 billion years, close to the measured age of the universe.",
        hint: "Move Cosmic time all the way to the right, then adjust Expansion rate today, H₀ by one step at a time."
      }
    ],
    teach: {
      level: "Ages 14–18",
      minutes: 45,
      objectives: [
        "Students can describe Hubble's law: galaxies move away from us at speeds proportional to their distance.",
        "Students can explain why every galaxy sees the same pattern, so the expansion has no centre.",
        "Students can estimate the age of the universe from 1 / H₀.",
        "Students can explain cosmological redshift as light being stretched by expanding space."
      ],
      plan: [
        {
          min: 5,
          what: "Prediction: students answer the worksheet questions about the centre of the universe and the effect of H₀."
        },
        {
          min: 8,
          what: "Demonstrate the galaxy field and the speed against distance plot at today's time. Point out the straight line and its slope."
        },
        {
          min: 12,
          what: "Activity 1: Hubble's law from different homes, and the effect of H₀ on 1 / slope."
        },
        {
          min: 10,
          what: "Activity 2: stretched light and redshift."
        },
        {
          min: 5,
          what: "Run the clock backwards together, then let students try the challenges."
        },
        {
          min: 5,
          what: "Wrap-up: the Big Bang happened everywhere, not at one point. Students answer one question in their own words."
        }
      ],
      vocabulary: [
        {
          term: "Hubble's law",
          def: "Speed away from us = H × distance. The further a galaxy is, the faster it recedes."
        },
        {
          term: "Hubble constant H₀",
          def: "Today's expansion rate, about 70 km/s for every megaparsec of distance."
        },
        {
          term: "Megaparsec (Mpc)",
          def: "A distance of about 3.26 million light-years, used for distances between galaxies."
        },
        {
          term: "Redshift z",
          def: "How much light has been stretched: observed wavelength = emitted wavelength × (1 + z)."
        },
        {
          term: "Scale factor",
          def: "The size of the universe compared with today, shown as Size vs today."
        },
        {
          term: "Big Bang",
          def: "The hot, dense early state of the whole universe, from which space has been expanding ever since."
        }
      ],
      misconceptions: [
        "The Big Bang was an explosion at one point and we are near the centre. It happened everywhere at once, and every galaxy sees the same pattern.",
        "Galaxies and everything in them stretch as the universe expands. Gravity holds galaxies together, so they keep their size while the gaps between them grow.",
        "Redshift is just galaxies racing through space like a passing siren. Cosmological redshift is the light wave being stretched by space expanding during its journey.",
        "1 / H₀ is exactly the age of the universe. It is a good estimate, but the expansion rate has changed over time."
      ],
      predictions: [
        "Every galaxy we see is moving away from us. Does that mean we are at the centre of the universe? Explain.",
        "If the universe were expanding faster today (a bigger H₀), would it be older or younger? Why?"
      ],
      activities: [
        {
          title: "Activity 1: Hubble's law from different homes",
          steps: [
            "Drag the Cosmic time slider all the way to the right, to today.",
            "Record Fitted slope H and 1 / slope.",
            "Press Move to another galaxy (or click a galaxy) and record the slope again. Do this three times.",
            "Set Expansion rate today, H₀ to 60 and then to 80. Each time, move Cosmic time back to today and record 1 / slope."
          ],
          table: {
            columns: [
              "Home galaxy",
              "H₀ setting",
              "Fitted slope H",
              "1 / slope"
            ],
            rows: 6
          }
        },
        {
          title: "Activity 2: Stretched light",
          steps: [
            "Set the slider Light left its galaxy when the universe was to 90%, 70%, 50% and 40% of today's size.",
            "For each, record Redshift z and the observed wavelength written under the spectrum.",
            "Work out 1 + z and compare it with 100% divided by the size when the light left."
          ],
          table: {
            columns: [
              "Size when the light left",
              "Redshift z",
              "Observed wavelength (nm)",
              "1 + z"
            ],
            rows: 4
          }
        }
      ],
      questions: [
        "Why does the fitted slope stay the same when you move home to another galaxy? What does this tell you about a centre?",
        "Use 1 / H₀ to estimate the age of the universe for H₀ = 70 km/s/Mpc. How does it compare with the measured 13.8 billion years?",
        "Light left a galaxy when the universe was half its present size. What is its redshift, and what has happened to its wavelength?",
        "When you run the clock backwards, where do the galaxies end up? Why is everywhere a better answer than at one point?"
      ],
      answers: [
        "Prediction 1: no. Every galaxy sees all the others moving away with the same Hubble law, so each would think it was the centre. There is no centre.",
        "Prediction 2: younger. With a bigger H₀, 1 / H₀ is shorter, so the universe took less time to reach its present size.",
        "Question 1: expansion stretches every distance by the same factor, so from any galaxy, speed is proportional to distance with the same slope. No galaxy is special, so there is no centre.",
        "Question 2: 977.8 ÷ 70 ≈ 14.0 billion years, very close to 13.8 billion. The expansion slowed down early on and has sped up recently, and these effects almost cancel.",
        "Question 3: z = 1. The wavelength has doubled, so the 486 nm hydrogen line arrives at 972 nm, in the infrared.",
        "Question 4: every galaxy crowds onto every other one. All distances shrink towards zero at the same time everywhere, so the hot, dense early universe filled all of space rather than sitting at one point."
      ]
    }
  },

  "speed-of-light": {
    predict: {
      question: "Mars is at its farthest. You see the rover start driving and instantly send \"stop\". How long after it started does your command arrive?",
      options: ["Instantly", "About 3 minutes", "About 22 minutes", "About 45 minutes"],
      answer: 3,
      reveal: "Your picture of the rover starting is already about 22 minutes old, and the stop command needs another 22 minutes to get there. Most people think of radio as instant, or count only one leg of the trip.",
      tryIt: "Drag the Earth to Mars slider to its maximum, then press Send \"drive\" followed by Send \"stop\" in the Drive a Mars rover panel."
    },
    quiz: [
      {
        q: "With Wait for it to bounce back switched on, how long does a light pulse take to reach the Moon and return?",
        options: ["About 2.56 seconds", "About 1.28 seconds", "About 8 minutes", "Too short to measure"],
        answer: 0,
        why: "The one-way trip takes about 1.28 seconds, so the echo returns after about 2.56 seconds, which laser ranging stations time to millimetre precision."
      },
      {
        q: "Why did Rømer see Io's eclipses run late when Earth was far from Jupiter?",
        options: ["Io orbits more slowly at that time of year", "Jupiter's shadow is longer then", "Light needed extra time to cross the extra distance", "His clocks ran slow in winter"],
        answer: 2,
        why: "Io keeps perfect time, but light from far-side eclipses travels farther, which is why the delays vanish with Pretend light is instant."
      },
      {
        q: "Why do radio messages to Mars take anywhere from about 3 to 22 minutes?",
        options: ["Radio slows down in Mars's atmosphere", "The Earth-Mars distance changes by a factor of about seven as both orbit the Sun", "The Sun's gravity bends signals by different amounts", "Mission control uses different transmitters"],
        answer: 1,
        why: "The speed of light is fixed, so the delay simply tracks the distance, which swings from about 55 to 400 million km."
      }
    ],
    related: [
      { slug: "time-dilation", why: "A constant light speed forces moving clocks to slow." },
      { slug: "expanding-universe", why: "Distant galaxies are seen as they were long ago." },
      { slug: "entanglement", why: "Correlated at a distance, yet still no faster-than-light messages." }
    ],
    challenges: [
      {
        id: "sun",
        goal: "Send a light pulse to the Sun and watch it arrive.",
        hint: "It takes about 8 minutes 20 seconds, so the playback speeds it up."
      },
      {
        id: "rover-stop",
        goal: "Stop the Mars rover by remote control before it hits the boulder, with its hazard cameras off.",
        hint: "Your pictures are old and your command is slow: send stop long before your screen shows the rover near the boulder."
      },
      {
        id: "rover-far",
        goal: "With Earth to Mars above 300 million km, stop the rover by remote control less than 10 m from the boulder.",
        hint: "Once the drive command lands, the rover moves about 2.5 m every second. Time your stop from the moment you sent drive."
      }
    ],
    teach: {
      level: "Ages 14–18",
      minutes: 45,
      objectives: [
        "Students can state the speed of light and use time = distance ÷ speed to find how long light takes to travel.",
        "Students can explain why we always see distant objects as they were in the past.",
        "Students can describe how Rømer used the eclipses of Io in 1676 to show that light takes time to travel.",
        "Students can explain why Mars rovers cannot be driven live from Earth and must partly drive themselves."
      ],
      plan: [
        {
          min: 5,
          what: "Prediction: students answer the worksheet questions about sunlight and the Mars rover."
        },
        {
          min: 10,
          what: "Activity 1: light travel times to five destinations, with one calculation checked by hand."
        },
        {
          min: 10,
          what: "Activity 2: Rømer's late eclipses."
        },
        {
          min: 10,
          what: "Activity 3: drive a Mars rover. Pairs try to stop it in time, then plan using the light time."
        },
        {
          min: 5,
          what: "Challenges, especially stopping the rover with Mars at its farthest."
        },
        {
          min: 5,
          what: "Wrap-up: looking out in space is looking back in time. Students answer one question in their own words."
        }
      ],
      vocabulary: [
        {
          term: "Speed of light c",
          def: "299,792 km/s in a vacuum, the same for every observer. Nothing carrying information goes faster."
        },
        {
          term: "Light travel time",
          def: "How long light takes to cross a distance: time = distance ÷ c."
        },
        {
          term: "Light-year",
          def: "The distance light travels in one year, about 9.46 trillion km. It measures distance, not time."
        },
        {
          term: "Astronomical unit (AU)",
          def: "The average distance from Earth to the Sun, about 150 million km. Light crosses it in about 8.3 minutes."
        },
        {
          term: "Signal delay",
          def: "The time between sending a radio message and it arriving, set by the distance and the speed of light."
        }
      ],
      misconceptions: [
        "Light arrives instantly. It is very fast but takes 1.28 seconds to reach the Moon and over 8 minutes to come from the Sun.",
        "When we look at a star we see it as it is now. We see it as it was when the light left, years or even thousands of years ago.",
        "A light-year is a length of time. It is a distance: how far light goes in a year.",
        "Radio signals are slower than light. Radio waves are light of a longer wavelength and travel at exactly the same speed."
      ],
      predictions: [
        "How long do you think sunlight takes to reach Earth?",
        "A Mars rover is 225 million km away. You see a boulder ahead in its camera picture and press stop. Will it stop in time? Explain."
      ],
      activities: [
        {
          title: "Activity 1: Light travel times",
          steps: [
            "Under Send light to, press each destination in turn.",
            "Record Distance and Light time from the readouts.",
            "Check one of them by calculation: light time = distance ÷ 299,792 km/s."
          ],
          table: {
            columns: [
              "Destination",
              "Distance",
              "Light time",
              "Your calculation"
            ],
            rows: 5
          }
        },
        {
          title: "Activity 2: Rømer's late eclipses",
          steps: [
            "In the Rømer card, let the plot fill with a year of eclipses.",
            "Record Earth to Jupiter and Latest eclipse seen when Jupiter is near Earth and when it is far away.",
            "Tick Pretend light is instant and describe what happens to the plot."
          ],
          table: {
            columns: [
              "Earth to Jupiter",
              "Latest eclipse seen",
              "Near or far?"
            ],
            rows: 4
          }
        },
        {
          title: "Activity 3: Drive a Mars rover",
          steps: [
            "Set Earth to Mars to 225 million km.",
            "Press Send \"drive\", then try to press Send \"stop\" in time to miss the boulder.",
            "Press Reset and try again, this time planning when to stop from the light time.",
            "Try 55 and 401 million km, and once with Let the rover use its own hazard cameras ticked."
          ],
          table: {
            columns: [
              "Earth to Mars",
              "Light time each way",
              "Where the rover stopped",
              "Crash or stop?"
            ],
            rows: 4
          }
        }
      ],
      questions: [
        "Sunlight takes about 8 minutes 20 seconds to reach us. If the Sun suddenly vanished, when would we find out?",
        "Why did Io's eclipses appear late when Earth was far from Jupiter?",
        "Explain why you cannot stop the rover in time by watching its pictures. How do real rovers avoid crashing?",
        "Voyager 1 is about 25 billion km away. How long do its signals take to reach us, and what would a conversation with it be like?"
      ],
      answers: [
        "Prediction 1: about 8 minutes 20 seconds. Many students think it is instant.",
        "Prediction 2: no. The picture is already about 12.5 minutes old when you see it, and the stop command takes another 12.5 minutes to arrive, so the rover keeps driving for about 25 minutes after the moment you saw.",
        "Question 1: about 8 minutes 20 seconds later, when the last light that left the Sun reached us. Its gravity would also keep acting for that long, because changes in gravity travel at the speed of light too.",
        "Question 2: Io keeps perfect time, but when Earth is far from Jupiter the light from each eclipse has extra distance to cover, up to about 16.6 minutes more when Jupiter is on the far side of the Sun.",
        "Question 3: your picture is out of date by one light time and your command arrives one light time later, so you would have to stop two light times early. Real rovers use their own hazard cameras and software to stop or steer around obstacles.",
        "Question 4: about 23.6 hours each way (25.5 billion km ÷ 299,792 km/s ≈ 85,000 s). Every question and answer would take about two days."
      ]
    }
  }
});
