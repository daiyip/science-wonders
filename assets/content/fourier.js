(window.WONDERS = window.WONDERS || {}).content = Object.assign(window.WONDERS.content || {}, {
  "fourier": {
    predict: {
      question: "You build a square wave by adding more and more sine waves. What happens to the little spike that overshoots each jump?",
      options: [
        "It shrinks and disappears after about 10 terms",
        "It gets narrower but stays about 9% of the jump tall",
        "It grows taller with every term",
        "There is no spike: the sum matches the square wave exactly"
      ],
      answer: 1,
      reveal: "The spike squeezes closer to the jump as you add terms, but its height settles at about 9% of the jump and never goes away. This is the Gibbs phenomenon. Most people expect more terms to fix every error, and they do fix the error almost everywhere, just not right next to a jump.",
      tryIt: "Keep the Square wave and drag Terms from 5 to 50. Watch the Overshoot at the jump readout stay near 9% while the Error (RMS) keeps falling."
    },
    quiz: [
      {
        q: "A square wave and a pure sine wave are played at the same pitch. Why do they sound different?",
        options: [
          "The square wave is played at a higher frequency",
          "The square wave adds higher harmonics at 3, 5, 7… times the pitch",
          "The sine wave is quieter, and loudness changes the sound",
          "They don't: the ear only hears the pitch"
        ],
        answer: 1,
        why: "Both repeat at the same rate, so they share a pitch. The square wave also contains odd harmonics with sizes 1/3, 1/5, 1/7… of the first, and the ear hears that mix as a brighter, buzzier tone."
      },
      {
        q: "Why does the triangle wave need far fewer terms than the square wave to look right?",
        options: [
          "It has no jumps, so its harmonics shrink as 1/n² instead of 1/n",
          "It uses cosines instead of sines",
          "It has a lower pitch",
          "It has fewer corners per period"
        ],
        answer: 0,
        why: "The smoother a wave is, the faster its harmonics fade. A jump forces harmonics that shrink only as 1/n; a corner without a jump gives 1/n², so the ninth harmonic is already 81 times smaller than the first."
      },
      {
        q: "In Redraw a shape, what does each rotating circle stand for?",
        options: [
          "One point of the drawing",
          "One term c·e^(2πikt): a fixed size, turning k whole times per loop",
          "A random guess that is improved over time",
          "One straight edge of the outline"
        ],
        answer: 1,
        why: "Each circle is one complex Fourier coefficient: its radius is |c_k| and it turns k times per trip round the shape, backwards when k is negative. Adding the circles tip to tail adds the terms."
      }
    ],
    related: [
      { slug: "double-slit", why: "Adding waves again: there they add up across space to make bright and dark stripes." },
      { slug: "gravitational-waves", why: "A signal you can hear, whose changing frequency tells you about the black holes that made it." },
      { slug: "infinity", why: "An infinite sum that still lands on a definite answer, with a catch at the edges." }
    ],
    challenges: [
      { id: "gibbs", goal: "Build the Square wave from 25 or more terms and check that the overshoot at the jump is still about 9%.", hint: "Drag the Terms slider; the Overshoot at the jump readout tells you the spike's height." },
      { id: "hear", goal: "Press Play sound and listen to both the Square wave and the Pure sine at the same pitch.", hint: "Start the sound, then switch the Target wave between Square wave and Pure sine." },
      { id: "own-shape", goal: "In Redraw a shape, draw your own closed shape and get the redraw error below 2% with 15 circles or fewer.", hint: "Smooth, rounded shapes need few circles; sharp corners need many. Set the Circles slider to 15 or lower." }
    ],
    teach: {
      level: "Ages 14–18",
      minutes: 45,
      objectives: [
        "Students can describe how a periodic wave can be built by adding sine waves whose frequencies are whole-number multiples of the lowest one.",
        "Students can read a spectrum bar chart and connect it to the shape of a wave and to how it sounds.",
        "Students can explain why a wave with jumps needs many more terms than a smooth wave, and describe the 9% overshoot that never goes away.",
        "Students can explain how rotating circles (epicycles) can redraw a closed shape."
      ],
      plan: [
        { min: 5, what: "Prediction: students answer the worksheet predictions on their own, then compare with a partner." },
        { min: 8, what: "Demonstration: with Square wave selected, the teacher slowly raises Terms from 1 to 10 while students describe what each new circle adds. Point out the spectrum bars." },
        { min: 12, what: "Activity 1 in pairs: record the overshoot and the error for different numbers of terms, for the square and the triangle wave." },
        { min: 6, what: "Listening: play the Pure sine, then the Square wave and Sawtooth wave at the same pitch. Students describe the difference in words." },
        { min: 9, what: "Activity 2: Redraw a shape. Students compare how many circles the heart, the star and their own drawing need for a 2% error." },
        { min: 5, what: "Wrap-up: discuss the questions, link to music, MP3 and JPEG, and check the predictions." }
      ],
      vocabulary: [
        { term: "Sine wave", def: "The smooth, regular wave traced by the height of a point going round a circle at a steady speed." },
        { term: "Harmonic", def: "A sine wave whose frequency is a whole-number multiple of the lowest (fundamental) frequency." },
        { term: "Fourier series", def: "A way to write a repeating wave as a sum of sine and cosine waves at the fundamental frequency and its harmonics." },
        { term: "Spectrum", def: "The list or bar chart of how big each frequency component of a signal is." },
        { term: "Gibbs phenomenon", def: "The overshoot of about 9% of the jump that a sum of sine waves makes next to every sudden jump, however many terms are used." },
        { term: "Timbre", def: "The quality or colour of a sound that lets you tell two instruments apart at the same pitch, set mainly by its mix of harmonics." }
      ],
      misconceptions: [
        "Adding more terms makes the sum match the wave perfectly everywhere. In fact the overshoot next to a jump stays at about 9% of the jump; it only gets narrower.",
        "Two sounds with the same pitch must contain the same frequencies. They share the fundamental, but the harmonics above it can be completely different.",
        "Only smooth, wavy shapes can be made from sine waves. Square corners and even your own drawing can be built from them, given enough terms.",
        "A bigger number of terms always means a much better picture. For a smooth wave a few terms are enough; extra terms add very little."
      ],
      predictions: [
        "If you add more and more sine waves to build a square wave, will the overshoot next to each jump shrink to nothing, stay the same height, or grow?",
        "Will a square wave and a pure sine wave at the same pitch sound the same? Why or why not?",
        "Which do you think needs more circles to redraw well: a heart or a star? Why?"
      ],
      activities: [
        {
          title: "Counting terms",
          steps: [
            "Make sure Build a wave is selected and choose Square wave as the Target wave.",
            "Set Terms (sine waves added) to each value in the table. For each, record Highest harmonic, Overshoot at the jump and Error (RMS).",
            "Repeat for the Triangle wave at the same numbers of terms.",
            "Describe how the spike next to the jump changes as you add terms, and how the triangle is different."
          ],
          table: { columns: ["Terms", "Highest harmonic", "Square: overshoot", "Square: error (RMS)", "Triangle: error (RMS)"], rows: 5 }
        },
        {
          title: "Redrawing shapes",
          steps: [
            "Choose Redraw a shape and select the Heart.",
            "Move the Circles slider down until the Redraw error (RMS) is just under 2%. Record the number of circles.",
            "Do the same for the Star and the Square.",
            "Press Clear and draw, draw your own closed shape, and find the fewest circles that give an error under 2%."
          ],
          table: { columns: ["Shape", "Circles for under 2% error", "Circles for under 0.5% error"], rows: 4 }
        }
      ],
      questions: [
        "Look at the spectrum bars for the square wave. Which harmonics are missing, and how do the sizes of the others change?",
        "Why does the error (RMS) keep falling as you add terms even though the overshoot does not?",
        "Explain in your own words why a square wave sounds buzzier than a pure sine at the same pitch.",
        "JPEG and MP3 files throw away small Fourier components. Using what you saw, explain why this saves space without changing the picture or sound much."
      ],
      answers: [
        "Prediction 1: the overshoot stays at about 9% of the jump (it settles near 8.95%). It gets narrower and moves closer to the jump, but it does not shrink in height.",
        "Prediction 2: no. They have the same fundamental frequency, so the same pitch, but the square wave also contains odd harmonics (3, 5, 7… times the pitch) that make it sound brighter and buzzier.",
        "Prediction 3: the star. Its sharp points need many fast-turning small circles. The smooth heart is redrawn to within 2% by only a handful of circles.",
        "Question 1: only odd harmonics appear (n = 1, 3, 5, …); the even ones are zero. Each bar has size 4/(πn), so the third is a third of the first, the fifth a fifth, and so on.",
        "Question 2: the overshoot gets narrower as terms are added, so the region where the sum is wrong shrinks. The RMS error averages over the whole period, so it keeps falling even though the peak height of the overshoot stays the same.",
        "Question 3: the ear separates a sound into its frequencies. A sine has only the fundamental; the square wave adds many higher harmonics, and the ear hears that extra high-frequency content as buzz or brightness.",
        "Question 4: most of a real signal's size is in a few large components. Dropping the many tiny ones changes the wave very little, as the small bars on the spectrum show, but it saves storing all those numbers."
      ]
    }
  }
});
