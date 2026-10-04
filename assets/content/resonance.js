(window.WONDERS = window.WONDERS || {}).content = Object.assign(window.WONDERS.content || {}, {
  "resonance": {
    predict: {
      question: "A wine glass rings at 660 Hz. You play it a steady tone just 1% lower, at 653 Hz, instead of exactly 660 Hz. How big is its vibration compared with the exact note?",
      options: [
        "About 99% as big: 1% off hardly matters",
        "About half as big",
        "Less than a tenth as big",
        "Bigger, because a lower note pushes harder"
      ],
      answer: 2,
      reveal: "A good glass has a quality factor Q of around 800, so its resonance is less than 1 Hz wide. Seven hertz away, the pushes drift out of step with the rim every few cycles and mostly cancel, and the steady vibration is only about 6% of what the exact note gives. That is why breaking a glass with sound needs a tone held within a fraction of a hertz of its note.",
      tryIt: "Pick the Wine glass and compare the Steady amplitude ahead readout at 653.40 Hz and at 660.00 Hz. Then lower Q and watch the peak of the resonance curve spread out and shrink."
    },
    quiz: [
      {
        q: "A swing is pushed exactly at its natural frequency and has settled. How does its motion line up with the push?",
        options: [
          "In step: it is furthest forward when the push is strongest",
          "A quarter cycle behind: the push is strongest as the swing rushes through the bottom",
          "Exactly opposite: it is furthest back when the push is strongest",
          "There is no fixed timing between them"
        ],
        answer: 1,
        why: "At resonance the phase lag is 90°. The push then lines up with the velocity, not the displacement, so it always pushes in the direction the swing is already moving and every push adds energy. Below resonance the lag drops toward 0°, above it rises toward 180°."
      },
      {
        q: "What happens to the resonance curve when you reduce the damping, so Q goes up?",
        options: [
          "The peak gets taller and narrower",
          "The peak moves to a much higher frequency",
          "The peak gets shorter and wider",
          "Nothing: damping only matters far from the peak"
        ],
        answer: 0,
        why: "At resonance the amplitude is Q times the response to a slow push, and the width of the peak is about f₀/Q. Less damping means a taller, sharper peak, and it also takes longer, about 2Q/ω₀, to build up or die away."
      },
      {
        q: "What really brought down the Tacoma Narrows Bridge in 1940?",
        options: [
          "Soldiers marching across in step",
          "Gusts of wind that happened to arrive at its natural frequency",
          "Aeroelastic flutter: a steady wind fed a twisting motion that grew by itself",
          "An earthquake"
        ],
        answer: 2,
        why: "The wind was fairly steady, about 64 km/h, not a rhythm. Once the deck started twisting, the way air flowed around it pushed it further in each twist, so the motion fed itself. That is self-excited flutter. Forced resonance needs a push that repeats at the right frequency, as in this experiment."
      }
    ],
    related: [
      { slug: "fourier", why: "Frequencies again: a sound is a sum of sines, and a resonator picks out just one of them." },
      { slug: "chaos", why: "Pendulums again: drive one hard enough, or add a second arm, and the motion can turn chaotic." },
      { slug: "double-slit", why: "Waves adding in and out of step: beats in time here, bright and dark fringes in space there." }
    ],
    challenges: [
      { id: "glass", goal: "Shatter the Wine glass with a steady tone by tuning the Drive frequency to its note.", hint: "The glass rings at 660 Hz and its resonance is less than 1 Hz wide. Focus the picture and use the arrow keys to step the frequency slowly." },
      { id: "bridge", goal: "Fix the Footbridge as engineers did: with footsteps at exactly 1.00 Hz and Driving strength at 50% or more, add damping until the sway settles below 2 cm.", hint: "Lower the quality factor Q. The steady amplitude at resonance is proportional to Q." },
      { id: "push", goal: "In Your pushes mode, build the Playground swing up from rest to 15° or more using only your own pushes.", hint: "Push once per swing, just as it passes you going forward. A push while it comes back toward you takes energy away." }
    ],
    teach: {
      level: "Ages 14–18",
      minutes: 45,
      objectives: [
        "Students can explain what the natural frequency of an object is and why driving it at that frequency produces a large response.",
        "Students can read a resonance curve and describe how damping (the quality factor Q) changes its height and width.",
        "Students can describe the phase lag between a driving force and the motion, and explain why a 90° lag at resonance means every push adds energy.",
        "Students can give real examples of resonance being used and being avoided, and tell resonance apart from other effects such as flutter."
      ],
      plan: [
        { min: 5, what: "Prediction: students answer the worksheet predictions on their own, then compare with a partner." },
        { min: 7, what: "Demonstration: with the Playground swing on Steady rhythm, show the swing building up at 0.315 Hz. Then move Drive frequency to 0.290 Hz and point out the beats and the much smaller steady amplitude." },
        { min: 8, what: "Your pushes: students take turns pushing the swing by hand, first once per swing as it passes going forward, then twice per swing or at random, and describe what the energy bar does." },
        { min: 12, what: "Activity 1 in pairs: record the steady amplitude and phase lag of the swing for several drive frequencies and sketch the resonance curve." },
        { min: 8, what: "Activity 2: the Wine glass and the Footbridge. Find the note that breaks the glass, then use damping to tame the bridge." },
        { min: 5, what: "Wrap-up: discuss the questions, the Millennium Bridge and Tacoma Narrows stories, and check the predictions." }
      ],
      vocabulary: [
        { term: "Natural frequency", def: "The frequency at which an object vibrates or swings by itself when it is disturbed and then left alone." },
        { term: "Driving frequency", def: "How many times per second a repeating push or force is applied to the object." },
        { term: "Resonance", def: "The large response of an object when it is driven at, or very near, its natural frequency." },
        { term: "Damping", def: "Anything, such as friction or air resistance, that removes energy from a vibration each cycle." },
        { term: "Quality factor (Q)", def: "A number that says how lightly damped an object is. A high Q means a tall, narrow resonance peak and a long ring." },
        { term: "Phase lag", def: "How far, as a fraction of a cycle or an angle, the motion trails behind the driving force." }
      ],
      misconceptions: [
        "A bigger push always gives a bigger swing. In fact the timing matters far more: a small push at the natural frequency beats a large push at the wrong rhythm.",
        "At resonance the object moves exactly in step with the push. Actually it lags a quarter cycle (90°) behind, so the push lines up with its velocity.",
        "Any bridge disaster involving wind or walkers is resonance. Tacoma Narrows was aeroelastic flutter driven by a steady wind, and the Millennium Bridge involved walkers changing their steps in response to the sway.",
        "More damping is always bad. Engineers add damping on purpose to bridges and tall buildings to keep resonance from growing."
      ],
      predictions: [
        "If you push a swing with the same small push but at different rhythms, which rhythm will make it swing highest? Why?",
        "When a swing is pushed exactly at its natural rhythm, will it move in step with the push, a quarter cycle behind, or opposite to the push?",
        "A wine glass rings at 660 Hz. Will a tone at 653 Hz make it vibrate almost as much, about half as much, or much less?"
      ],
      activities: [
        {
          title: "Drawing a resonance curve",
          steps: [
            "Choose Playground swing and Steady rhythm. Leave Driving strength at 60% and the quality factor at Q = 20.",
            "Set Drive frequency to the first value in your table and press Restart.",
            "Wait until the Beats readout says none and the cyan ring sits on the curve, then record Steady amplitude ahead and Phase lag.",
            "Repeat for drive frequencies of 0.20, 0.28, 0.315, 0.35 and 0.45 Hz, then sketch amplitude against frequency.",
            "Lower Q to 5 and repeat two of the frequencies. Describe how the curve changes."
          ],
          table: { columns: ["Drive frequency (Hz)", "Steady amplitude ahead", "Phase lag", "Beats while settling?"], rows: 5 }
        },
        {
          title: "Breaking and fixing",
          steps: [
            "Choose Wine glass. Record its Natural frequency and the starting Drive frequency.",
            "Move Drive frequency slowly toward 660 Hz until the glass breaks. Record the frequency where it broke.",
            "Press Restart, set Q to about 200 and try again at the same frequency. Does it still break?",
            "Choose Footbridge, set Drive frequency to 1.00 Hz and Driving strength to 50%. Record the steady sway at Q = 60.",
            "Lower Q until the sway settles below 2 cm. Record that Q value."
          ],
          table: { columns: ["Object", "Q", "Drive frequency (Hz)", "Result"], rows: 4 }
        }
      ],
      questions: [
        "Use the idea of timing to explain why pushes at the natural frequency build up a large motion, while pushes at other frequencies do not.",
        "Why did lowering Q stop the glass from breaking even at its exact note?",
        "What are beats, and why do they only appear for a while after you start or change the drive?",
        "London's Millennium Bridge was fixed by adding dampers. Using the resonance curve, explain why that works."
      ],
      answers: [
        "Prediction 1: the rhythm that matches the swing's natural frequency, about 0.32 Hz or one push every 3.2 s for a 2.5 m swing. Each push then arrives when the swing moves the same way, so the energy adds up cycle after cycle.",
        "Prediction 2: a quarter cycle (90°) behind. The push is strongest as the swing passes the bottom at top speed, in the direction it is moving.",
        "Prediction 3: much less, about 6% as much with Q = 800, because the glass's resonance is less than 1 Hz wide.",
        "Question 1: at the natural frequency each push arrives in the same part of the cycle and pushes along the motion, so it always does positive work. At other frequencies the timing slides, so some pushes help and others oppose the motion, and over a few cycles they mostly cancel.",
        "Question 2: the steady amplitude at resonance is proportional to Q. With more damping the glass loses more energy each cycle, so the same tone can only build it up to a smaller amplitude, below the breaking point.",
        "Question 3: beats are a slow swelling and fading of the motion. When the drive starts, the object also rings at its own natural frequency. The two motions drift in and out of step at the difference of their frequencies until damping removes the natural ringing, leaving only the steady motion at the drive frequency.",
        "Question 4: dampers lower Q. That flattens and lowers the resonance peak, so even when walkers push at the bridge's natural frequency the sway stays small. They also remove the sway quickly, so the walkers no longer get drawn into step with it."
      ]
    }
  }
});
