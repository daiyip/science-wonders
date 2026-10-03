(window.WONDERS = window.WONDERS || {}).content = Object.assign(window.WONDERS.content || {}, {
  "ladder-paradox": {
    predict: {
      question: "A 10 m ladder flies at 0.8c through an 8 m barn. The farmer measures the ladder at 6 m and shuts both doors at the same instant with it inside. What does someone riding the ladder say happened?",
      options: [
        "The ladder was crushed, because from the ladder the barn is too short",
        "The doors did not shut at the same time, so the ladder got through untouched",
        "The ladder really is 6 m long, so it fits from every point of view",
        "The farmer was wrong: the doors could never have shut"
      ],
      answer: 1,
      reveal: "From the ladder, the barn is only 4.8 m long, so the ladder never fits. But in its frame the exit door shuts about 36 ns before the entrance door: first the exit shuts and opens before the front arrives, then the entrance shuts after the rear is in. Most people assume one side must be wrong, but both descriptions are right.",
      tryIt: "Watch both doors shut in the Barn view, then press Ladder under View from and read the order of events on the right of the bench."
    },
    quiz: [
      {
        q: "In the ladder's frame, why doesn't the 10 m ladder hit a barn that is only 4.8 m long?",
        options: ["The ladder bends to fit", "The two doors do not shut at the same time in that frame", "The doors pass through the ladder", "The barn is really 8 m long in every frame"],
        answer: 1,
        why: "The exit door shuts and reopens before the ladder's front gets there, and the entrance door shuts after the rear is inside. The order of the two distant door events depends on the frame."
      },
      {
        q: "At a low speed the doors hit the ladder in the barn frame. What does an observer riding the ladder see?",
        options: ["The doors hit the ladder too", "The doors miss the ladder", "Only one door hits the ladder", "It depends on how fast the observer thinks the barn is moving"],
        answer: 0,
        why: "A door meeting the ladder is one event at one place and time. Every observer agrees on whether it happens; they only disagree about the timing of events far apart."
      },
      {
        q: "With the exit kept shut like a wall, why does the ladder end up shorter than its contracted length?",
        options: ["The wall pushes the whole ladder back at once", "Its rear keeps moving until a signal from the crashed front reaches it, and no signal is faster than light", "Length contraction gets stronger once it stops", "The farmer measures it wrongly"],
        answer: 1,
        why: "No object can be perfectly rigid. Even a stop signal travelling at light speed lets the rear move on, squashing the ladder to L√((1 − β)/(1 + β))."
      }
    ],
    related: [
      { slug: "time-dilation", why: "The other half of special relativity: moving clocks tick slowly." },
      { slug: "speed-of-light", why: "Why the speed of light sets every limit in this puzzle." },
      { slug: "curved-spacetime", why: "Spacetime diagrams again, now bent by gravity." }
    ],
    challenges: [
      { id: "ladder-order", goal: "Switch to the Ladder view and watch both doors shut without touching the ladder.", hint: "Press Ladder under View from and let the animation play through both door events." },
      { id: "reverse-order", goal: "Find an observer who sees the entrance door shut before the exit door, with the ladder still getting through.", hint: "Try a negative Observer speed, relative to the barn." },
      { id: "trap-long", goal: "With the exit kept shut like a wall, trap a ladder at least twice as long as the barn inside it.", hint: "Set Ladder length at rest to at least twice Barn length at rest, then raise the speed until the rear end gets in." }
    ],
    teach: {
      level: "Ages 15–18",
      minutes: 50,
      objectives: [
        "Students can explain length contraction and calculate L/γ for a given speed.",
        "Students can explain why two events that are simultaneous in one frame need not be simultaneous in another.",
        "Students can read a simple spacetime diagram showing worldlines and lines of simultaneity.",
        "Students can explain why observers always agree on whether a door hits the ladder, even though they disagree about lengths."
      ],
      plan: [
        { min: 5, what: "Prediction: students write down whether the ladder fits, from the farmer's and from the ladder's point of view." },
        { min: 10, what: "Demonstration in the Barn view: work out γ, the ladder's contracted length and why both doors can shut together." },
        { min: 12, what: "Activity 1 in pairs: compare the Barn and Ladder views and record the lengths and the order of events." },
        { min: 10, what: "Activity 2: find the slowest speed at which the ladder still fits, and check that the doors hit it in every view below that speed." },
        { min: 8, what: "Spacetime diagram discussion: lines of simultaneity, and why the solid-wall version squashes the ladder." },
        { min: 5, what: "Wrap-up: the questions, then each student writes one sentence on what 'at the same time' means." }
      ],
      vocabulary: [
        { term: "Frame of reference", def: "The point of view of an observer moving at a steady speed, with their own rulers and synchronised clocks." },
        { term: "Lorentz factor γ", def: "1 / √(1 − v²/c²). It is 1 at rest and grows without limit as v approaches the speed of light." },
        { term: "Length contraction", def: "A moving object measures shorter along its direction of motion, by the factor γ." },
        { term: "Relativity of simultaneity", def: "Two events at different places that happen at the same time for one observer can happen at different times for another." },
        { term: "Event", def: "Something that happens at one place at one moment, such as a door shutting." },
        { term: "Worldline", def: "The path of an object through space and time, drawn on a spacetime diagram." }
      ],
      misconceptions: [
        "Length contraction is an optical illusion. It is not: it is what you measure when you mark both ends at the same moment in your frame.",
        "One of the two observers must be wrong about whether the ladder fits. Both are right; 'fits' depends on which moments count as simultaneous.",
        "Solid objects are perfectly rigid, so pushing one end moves the other end instantly. Nothing travels faster than light, so the far end always moves later.",
        "Different observers can disagree about whether a door hits the ladder. A collision is one event at one place and every observer agrees on it."
      ],
      predictions: [
        "A 10 m ladder moves at 0.8c through an 8 m barn. From the farmer's point of view, does it fit inside? From the ladder's point of view?",
        "The farmer shuts both doors at exactly the same time. Will someone riding the ladder agree they shut at the same time?"
      ],
      activities: [
        {
          title: "Two views of the same run",
          steps: [
            "Set Ladder speed to 0.8c, Ladder length at rest to 10 m and Barn length at rest to 8 m.",
            "With View from set to Barn, read the Lorentz factor γ and Ladder, measured in the barn frame.",
            "Press Ladder under View from and read Barn, measured in the ladder frame.",
            "Read the order of events on the right of the bench in both views and write down which door shuts first.",
            "Repeat at Ladder speed 0.9c and 0.95c."
          ],
          table: { columns: ["Ladder speed", "γ", "Ladder in barn frame (m)", "Barn in ladder frame (m)", "Door events, ladder frame"], rows: 5 }
        },
        {
          title: "The edge of fitting",
          steps: [
            "With View from set to Barn, lower Ladder speed until the Result readout says the doors hit the ladder.",
            "Raise it step by step to find the slowest speed at which the ladder fits. Record it.",
            "Calculate the speed at which L/γ equals the barn length and compare. (The 1 ns door time adds a little.)",
            "Just below that speed, switch to the Ladder view. Check that the doors still hit the ladder.",
            "Change Barn length at rest and repeat."
          ],
          table: { columns: ["Ladder length (m)", "Barn length (m)", "Slowest speed that fits", "Calculated speed"], rows: 5 }
        },
        {
          title: "The solid wall",
          steps: [
            "Switch on Keep it shut, like a solid wall under Exit door.",
            "Watch the pink dashed line on the spacetime diagram: it is a stop signal running back along the ladder at light speed.",
            "Record the Result readout for several speeds.",
            "Compare each length with L√((1 − β)/(1 + β))."
          ]
        }
      ],
      questions: [
        "Why is the time gap between the door events zero in the barn frame but not in the ladder frame?",
        "Explain in your own words how a 10 m ladder passes through a 4.8 m barn without being hit in the ladder's frame.",
        "Why must every observer agree about whether a door hits the ladder?",
        "In the solid-wall version, why does the ladder end up shorter than L/γ?"
      ],
      answers: [
        "Prediction 1: in the farmer's frame the ladder is 10/γ = 6 m, so it fits in the 8 m barn. In the ladder's frame the barn is 8/γ = 4.8 m, so the ladder does not fit.",
        "Prediction 2: no. In the ladder's frame the exit door shuts γvB/c² ≈ 35.6 ns before the entrance door.",
        "Q1: the doors are 8 m apart. Clocks synchronised in the barn frame are out of step in the ladder frame by vB/c², so events at the same barn time happen at different ladder times.",
        "Q2: the exit door shuts and reopens before the front reaches it. The barn keeps moving, and the entrance door shuts only after the rear has passed it. The ladder is never fully inside with both doors shut.",
        "Q3: a door meeting the ladder is one event, at one place and one moment. Coordinates change from frame to frame, but whether two things are at the same place at the same moment does not.",
        "Q4: the front stops at the wall, but the rear does not know yet. It keeps moving until a stop signal reaches it, and that signal can travel at most at light speed. The final length is L√((1 − β)/(1 + β)), 3.3 m at 0.8c for a 10 m ladder."
      ]
    }
  }
});
