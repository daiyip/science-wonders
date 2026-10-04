(window.WONDERS = window.WONDERS || {}).content = Object.assign(window.WONDERS.content || {}, {
  "tides": {
    predict: {
      question: "The Moon's gravity pulls the ocean toward it. How many high tides does a seaside town get in a day?",
      options: [
        "One, when the Moon is overhead",
        "Two, about 12 h 25 min apart",
        "Two, exactly 12 hours apart",
        "Four, one for each quarter of the Moon"
      ],
      answer: 1,
      reveal: "There is a second bulge on the side of Earth facing away from the Moon, so a town passes through two of them a day. They are not exactly 12 hours apart: the Moon moves along its orbit while Earth turns, so the town needs about 12 h 25 min to reach the next bulge. Many people expect only one high tide, under the Moon.",
      tryIt: "Keep the Tidal force view and watch the town's chart: two triangles mark two highs a day, and the bracket shows the time between them."
    },
    quiz: [
      {
        q: "Why does the ocean bulge on the side of Earth facing away from the Moon?",
        options: [
          "The Moon pushes the water away on that side",
          "The far side is pulled less than Earth's centre, so it is left behind as Earth falls toward the Moon",
          "Earth's spin flings the water outward on that side",
          "The Sun pulls it there"
        ],
        answer: 1,
        why: "Gravity always pulls toward the Moon. But the whole Earth is falling toward the Moon with the pull felt at its centre. The far side is pulled a little less than that, so relative to Earth it is left behind, which looks like a bulge pointing away from the Moon."
      },
      {
        q: "If the Moon were half as far away, how much stronger would the tidal force be?",
        options: [
          "2 times",
          "4 times",
          "8 times",
          "The same: only the Moon's mass matters"
        ],
        answer: 2,
        why: "The pull itself grows as 1/d², four times, but the tide depends on the difference in pull across Earth, which goes as 2GMr/d³. Halving d multiplies that by 2³ = 8."
      },
      {
        q: "When do spring tides, the ones with the biggest range, happen?",
        options: [
          "In spring, around March",
          "At first and last quarter, when the Sun and Moon are at right angles",
          "At new moon and full moon, when the Sun, Earth and Moon are in a line",
          "Only when the Moon is closest to Earth"
        ],
        answer: 2,
        why: "The Sun makes its own pair of bulges, 46% as tall as the Moon's. At new and full moon they line up with the Moon's and add. At the quarters they sit over the Moon's low belts and partly cancel, giving neap tides. The name comes from the water springing up, not from the season."
      }
    ],
    related: [
      { slug: "gravitational-waves", why: "The same stretch-one-way, squeeze-the-other pattern, carried by ripples in spacetime." },
      { slug: "curved-spacetime", why: "In Einstein's picture, tidal forces are what curved spacetime feels like." },
      { slug: "fourier", why: "Tide tables are built by adding sine waves, one for each motion of the Moon and Sun." }
    ],
    challenges: [
      { id: "views", goal: "Step through all three arrow views: Moon's pull, Subtract the average, then back to Tidal force.", hint: "The pull arrows look almost the same everywhere. The tide comes from the small difference." },
      { id: "neap", goal: "Add the Sun's tide and, at today's Moon distance, run the clock until the town's tidal range drops below 0.35 m (a neap tide).", hint: "Neap tides come at first and last quarter. Raise the Speed to get there faster." },
      { id: "slow-tides", goal: "With the Sun's tide off, move the Moon close enough that the town's high tides come more than 13 hours apart.", hint: "A closer Moon orbits faster, so the turning Earth takes longer to catch up with it." }
    ],
    teach: {
      level: "Ages 14–18",
      minutes: 45,
      objectives: [
        "Students can explain why there are two tidal bulges, one facing the Moon and one on the far side, using the difference between the Moon's pull at the surface and at Earth's centre.",
        "Students can explain why high tides are about 12 h 25 min apart rather than 12 hours.",
        "Students can describe spring and neap tides and link them to the phases of the Moon.",
        "Students can use the 1/d³ dependence of the tidal force to predict how the tide changes with the Moon's distance."
      ],
      plan: [
        { min: 5, what: "Prediction: students answer the worksheet predictions on their own, then compare with a partner." },
        { min: 8, what: "Demonstration: the teacher clicks Moon's pull, Subtract the average and Tidal force in turn. Students describe what changes and sketch the tidal force arrows." },
        { min: 10, what: "Activity 1 in pairs: time the gap between high tides and explain the extra 25 minutes." },
        { min: 10, what: "Activity 2: add the Sun's tide, speed up the clock, and record the tidal range at different Moon phases." },
        { min: 7, what: "Activity 3: change the Moon distance and test the 1/d³ rule with the tidal acceleration readout." },
        { min: 5, what: "Wrap-up: discuss why real tides differ from the model (continents, ocean basins, resonance such as the Bay of Fundy) and check the predictions." }
      ],
      vocabulary: [
        { term: "Tidal force", def: "The difference between a body's gravitational pull at one place and its pull at the centre of the Earth. It stretches Earth along the line to the Moon and squeezes it across." },
        { term: "Tidal bulge", def: "The raised water on the side of Earth facing the Moon and on the opposite side, caused by the tidal force." },
        { term: "Tidal range", def: "The difference in height between high water and the next low water." },
        { term: "Spring tide", def: "A tide with a large range, near new and full moon, when the Sun's and Moon's bulges line up." },
        { term: "Neap tide", def: "A tide with a small range, near first and last quarter, when the Sun's bulges sit over the Moon's low water." },
        { term: "Equilibrium tide", def: "The shape the ocean would take if it settled instantly under the tidal force. A useful simplified model of the real tide." }
      ],
      misconceptions: [
        "The Moon pulls the water on the far side away from Earth. In fact the Moon pulls everything toward it; the far side bulges because it is pulled less than Earth's centre.",
        "High tides happen exactly every 12 hours. They come about every 12 h 25 min because the Moon moves along its orbit while Earth turns.",
        "Spring tides happen in spring. The name means the water springs up; they happen twice a month, near new and full moon.",
        "The Sun's tide is tiny because the Sun is so far away. Its pull on Earth is about 180 times the Moon's, but its tidal effect is still 46% of the Moon's, which is why it matters."
      ],
      predictions: [
        "How many high tides does a seaside town get each day, and how far apart are they?",
        "If the Moon were half as far away, would the tides be twice as big, four times as big, or more?",
        "At which phases of the Moon would you expect the biggest tides? Why?"
      ],
      activities: [
        {
          title: "Two bulges and the 25 extra minutes",
          steps: [
            "Click Moon's pull and describe the arrows. Then click Subtract the average and Tidal force. Sketch the Tidal force arrows around Earth.",
            "Keep the Sun switch off. Read the Time between high tides readout and check it against the bracket on the 48-hour chart.",
            "Set the Speed to 1 h per second and use the Clock readout to time three high tides in a row.",
            "Explain, with a sketch of the Moon's movement during one day, why the gap is longer than 12 hours."
          ],
          table: { columns: ["High tide number", "Clock time", "Time since previous high", "Tide at the town (m)"], rows: 5 }
        },
        {
          title: "Spring and neap tides",
          steps: [
            "Turn on Add the Sun's tide. Press Restart and set Speed to 24 h per second.",
            "Every few days, press Pause and record the Moon phase, the Sun's tide readout and the Tidal range.",
            "Look at the 30-day chart. Mark where the biggest and smallest ranges fall compared with the new and full moon symbols.",
            "Work out the ratio of the largest range to the smallest."
          ],
          table: { columns: ["Clock (day)", "Moon phase", "Sun's tide", "Tidal range (m)"], rows: 6 }
        },
        {
          title: "Testing the 1/d³ rule",
          steps: [
            "Press Today's distance and turn the Sun's tide off. Record the Tidal acceleration and Tidal range.",
            "Set Moon distance to the values in the table and record the same readouts and the Time between high tides.",
            "Calculate (60.3 ÷ distance)³ for each row and compare it with the factor shown next to the tidal acceleration."
          ],
          table: { columns: ["Moon distance (Earth radii)", "Tidal acceleration", "Tidal range (m)", "Time between high tides", "(60.3 ÷ distance)³"], rows: 5 }
        }
      ],
      questions: [
        "Use the Subtract the average view to explain in your own words why there is a bulge on the side of Earth facing away from the Moon.",
        "The Sun pulls on Earth about 180 times harder than the Moon does, yet its tide is only 46% of the Moon's. Explain why.",
        "When the Moon is moved closer, the time between high tides gets longer. Why?",
        "The real tide in the Bay of Fundy reaches about 16 m, but the model gives less than 1 m. Give two reasons why real tides differ from this model."
      ],
      answers: [
        "Prediction 1: two high tides a day, about 12 h 25 min apart, because there is a bulge facing the Moon and another on the far side.",
        "Prediction 2: eight times. The tidal force depends on the difference in pull across Earth, which goes as 1/d³, so halving d gives 2³ = 8.",
        "Prediction 3: near new moon and full moon, when the Sun, Earth and Moon are in a line and the Sun's bulges add to the Moon's (spring tides). At the quarters they partly cancel (neap tides).",
        "Question 1: after the average pull is taken away, the near side is left with a small pull toward the Moon (it is pulled more than the centre) and the far side with a small pull away from it (it is pulled less). Both point outward, so water collects on both sides.",
        "Question 2: tides depend on how much the pull changes across Earth's width, not on its size. The Sun is about 390 times farther away than the Moon, so its pull changes much less across Earth. The tidal effect scales as M/d³: 27 million times the mass divided by 390³, about 59 million, gives about 0.46.",
        "Question 3: by Kepler's third law a closer Moon orbits faster. Each day it moves further along its orbit, so the turning Earth needs more time to bring the town back under a bulge.",
        "Question 4: continents block the bulges, so the tide travels round each ocean basin as a wave; the shape and depth of a bay can make it resonate with the 12 h 25 min tide (the Bay of Fundy's natural period is close to this); the ocean cannot respond instantly and friction delays it; the Moon's orbit is tilted and its distance varies."
      ]
    }
  }
});
