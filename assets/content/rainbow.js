(window.WONDERS = window.WONDERS || {}).content = Object.assign(window.WONDERS.content || {}, {
  "rainbow": {
    predict: {
      question: "Sunlight that enters a raindrop and reflects once inside comes back out at many different angles, anywhere from 0° to about 42° from the point opposite the sun. Where is that returning light brightest?",
      options: [
        "Spread evenly over all those angles",
        "Straight back, at 0°",
        "Piled up at the 42° edge",
        "In the middle, around 21°"
      ],
      answer: 2,
      reveal: "As you move a ray from the centre of the drop toward its edge, its exit angle rises, stops near 42° and turns back. Near that turning point a wide band of rays all leave at almost the same angle, so the light piles up there. That pile-up, seen from every drop at 42° from the shadow of your head, is the rainbow.",
      tryIt: "Keep the Fan of rays and look at where the exit rays crowd together, then check the sideways histogram: it spikes at the turning point on the plot."
    },
    quiz: [
      {
        q: "Why is red on the outside of the main rainbow?",
        options: [
          "Red light is reflected more strongly at the back of the drop",
          "Water bends red slightly less than violet, so red's turning point is at a larger angle",
          "Red light comes from higher up in the sky",
          "Red light travels faster through air than violet"
        ],
        answer: 1,
        why: "Water's refractive index is about 1.330 for red and 1.343 for violet. The smaller bending gives red a turning point at about 42.5° and violet one at about 40.6°, so red forms the outer edge of the bow."
      },
      {
        q: "Why is the sky darker in the band between the main bow and the second bow?",
        options: [
          "The drops there are too small to reflect light",
          "The two bows cast a shadow on each other",
          "One-reflection light never leaves at more than about 42°, and two-reflection light never at less than about 51°",
          "The sun's light is absorbed by the drops between the bows"
        ],
        answer: 2,
        why: "Both turning points are limits. All primary light leaves inside 42°, filling the sky inside the bow, and all secondary light leaves outside 51°. Drops in between send you almost nothing from one or two reflections: Alexander's dark band."
      },
      {
        q: "Why do you rarely see a rainbow around midday in summer?",
        options: [
          "Raindrops evaporate in strong sunlight",
          "The bow is a circle around the point opposite the sun, which is then far below the horizon",
          "Sunlight is too white at midday to split into colours",
          "Rain only falls in the morning and evening"
        ],
        answer: 1,
        why: "The bow sits 42° from the shadow of your head. When the sun is higher than about 42°, that point is more than 42° below the horizon and the whole primary bow is hidden below the ground."
      }
    ],
    related: [
      { slug: "path-integral", why: "Snell's law from adding up every path, and why light piles up wherever a quantity stops changing." },
      { slug: "speed-of-light", why: "Light slows down in water, and that slowing is what bends each ray in the drop." },
      { slug: "double-slit", why: "Light is also a wave; interference near the turning point adds faint extra bows the ray picture misses." }
    ],
    challenges: [
      { id: "turning-point", goal: "With One colour, move the Impact height until the primary ray leaves within 0.1° of its largest possible angle.", hint: "Watch the white dot on the plot climb toward the circle marked turning point; the bow readout gives the target angle." },
      { id: "below-horizon", goal: "Raise the Sun height until the whole primary bow sinks below the horizon.", hint: "The bow's top sits about 42.5° minus the sun's height above the horizon." },
      { id: "violet-secondary", goal: "With 2 reflections showing and a violet ray of 420 nm or less, find the impact height where the secondary ray leaves at its smallest angle, within 0.1°.", hint: "The secondary turning point is near the edge of the drop, at an impact height around 0.95." }
    ],
    teach: {
      level: "Ages 14–18",
      minutes: 45,
      objectives: [
        "Students can describe the path of sunlight through a raindrop: refraction on entry, reflection at the back and refraction on exit.",
        "Students can explain why the light piles up at a turning point of the exit angle, making the bow appear at about 42°.",
        "Students can explain the colour order of the primary and secondary bows using dispersion.",
        "Students can use the geometry of the antisolar point to predict where and when a rainbow can be seen."
      ],
      plan: [
        { min: 5, what: "Prediction: students answer the worksheet predictions on their own, then compare with a partner." },
        { min: 8, what: "Demonstration: with One ray, the teacher drags the Impact height from 0 to 1 while students call out the primary exit angle. Ask what is special about the highest value." },
        { min: 12, what: "Activity 1 in pairs: record the exit angle at a range of impact heights for red and violet light, and find each turning point." },
        { min: 10, what: "Activity 2: the sky panel. Students switch between 1, 2 and 1 and 2 reflections, describe the dark band, and find the sun height at which the bow disappears." },
        { min: 10, what: "Wrap-up: discuss the questions, link to sightings of real rainbows, and check the predictions." }
      ],
      vocabulary: [
        { term: "Refraction", def: "The bending of light when it passes from one material into another, such as from air into water, because it changes speed." },
        { term: "Refractive index", def: "A number n that says how much a material slows and bends light. Water's is about 1.33, slightly higher for violet than for red." },
        { term: "Dispersion", def: "The way the refractive index changes with colour, so that different colours bend by different amounts and spread apart." },
        { term: "Impact height", def: "How far from the centre line of the drop a ray of sunlight hits it: 0 is the centre, 1 is the very edge." },
        { term: "Antisolar point", def: "The point in the sky exactly opposite the sun, where the shadow of your head falls. A rainbow is a circle around it." },
        { term: "Alexander's dark band", def: "The darker strip of sky between the primary and secondary bows, where drops send almost no light toward you." }
      ],
      misconceptions: [
        "A rainbow is an object in a fixed place that you could reach. It is a set of directions, 42° from the shadow of your head, and every observer sees light from different drops.",
        "Each drop makes the whole rainbow. Each drop sends you light of only one colour at a time, depending on its angle; the bow is made by many drops.",
        "Raindrops only send light out at 42°. They send light over a wide range of angles; 42° is just where it piles up.",
        "The second bow is a reflection of the first. It is made by light that reflects twice inside each drop, which is why its colours are reversed."
      ],
      predictions: [
        "Sunlight reflected once inside a drop leaves at angles from 0° to about 42°. Do you expect it to be spread evenly, or brightest at some angle? Which one?",
        "On the main bow, is red on the inside or the outside? What about the second bow?",
        "Can you see a rainbow when the sun is high in the sky at noon? Explain your guess."
      ],
      activities: [
        {
          title: "Finding the turning point",
          steps: [
            "Choose One colour, One ray and Reflections inside the drop: 1. Set Colour (wavelength) to 700 nm.",
            "Set the Impact height to each value in the table and record the Primary ray leaves at readout.",
            "Fine-tune the Impact height to find the largest exit angle you can. Record it and compare with This colour's bows.",
            "Repeat with the Colour set to 400 nm. Which colour has the larger turning-point angle?"
          ],
          table: { columns: ["Impact height", "Exit angle at 700 nm", "Exit angle at 400 nm"], rows: 6 }
        },
        {
          title: "Building the sky",
          steps: [
            "Choose White sunlight and Reflections inside the drop: 1 and 2. Press Clear the sky and watch the right-hand panel.",
            "Describe the brightness of the sky inside the main bow, between the bows and outside the second bow.",
            "Note the colour order of each bow, from the inside out.",
            "Raise the Sun height step by step. Record the sun height at which the top of the primary bow touches the horizon."
          ],
          table: { columns: ["Sun height", "Top of primary bow above horizon", "Top of secondary bow above horizon"], rows: 5 }
        }
      ],
      questions: [
        "Use the plot of exit angle against impact height to explain why the rainbow is a bright, sharp band and not an even glow.",
        "Why is the colour order of the secondary bow the reverse of the primary bow?",
        "Two friends stand 10 m apart looking at a rainbow. Do they see light from the same raindrops? Explain.",
        "The Light out after 1 / 2 reflections readout shows only a few percent of each ray leaving. Where does the rest of the light go?"
      ],
      answers: [
        "Prediction 1: the light is brightest at the 42° edge. The exit angle has a turning point there, so many rays with different impact heights leave at nearly the same angle and pile up.",
        "Prediction 2: red is on the outside of the main bow and on the inside of the second bow.",
        "Prediction 3: usually not. The bow is centred on the point opposite the sun, which is as far below the horizon as the sun is above it. Once the sun is higher than about 42°, the primary bow is entirely below the horizon.",
        "Question 1: near the turning point the curve is flat, so a wide range of impact heights gives almost the same exit angle. All that light leaves in nearly one direction and makes a bright band. Elsewhere the curve is steep, so the light is spread thinly over many angles.",
        "Question 2: with two reflections the turning point is a smallest angle, not a largest one. Violet still bends more, but now that pushes its turning point to a larger angle (about 53.6°) than red (about 50.2°), so red is on the inside.",
        "Question 3: no. Each person sees light from the drops that lie 42° from the shadow of their own head. Their two cones of directions point at different sets of drops, so each sees their own rainbow.",
        "Question 4: most of the light passes straight through the back of the drop and carries on away from the sun, and some is reflected off the outside of the drop at entry. Only the small reflected share at each inside bounce stays in the drop to make the bows."
      ]
    }
  }
});
