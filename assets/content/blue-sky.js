(window.WONDERS = window.WONDERS || {}).content = Object.assign(window.WONDERS.content || {}, {
  "blue-sky": {
    predict: {
      question: "Sunlight is white, a mix of every colour. Why is the sky overhead blue?",
      options: [
        "Air is a faint blue gas, like tinted glass",
        "The sky reflects the blue of the oceans",
        "Air molecules scatter blue light toward you much more than red light",
        "Blue light is the only colour that can get through the atmosphere"
      ],
      answer: 2,
      reveal: "Molecules much smaller than the wavelength scatter light in proportion to 1/λ⁴, so blue is knocked sideways about six times more often than red. That scattered blue reaches you from every direction. Many people think air or the ocean is the source of the colour, but air is clear and the sky is just as blue over deserts.",
      tryIt: "Switch What scatters the light from Tiny molecules to Large droplets and watch the blue disappear from the sky."
    },
    quiz: [
      {
        q: "Why does the sun look orange or red when it is close to the horizon?",
        options: [
          "The sun cools down in the evening",
          "Its light crosses much more air, and most of the blue is scattered out on the way",
          "The ground reflects red light back up into the sky",
          "Red light bends around the Earth more easily"
        ],
        answer: 1,
        why: "Near the horizon the air mass reaches about 38, so blue, which scatters most, is almost all removed from the direct beam, leaving mostly orange and red."
      },
      {
        q: "Clouds and thick haze look white or grey rather than blue. Why?",
        options: [
          "Their droplets are much larger than the wavelength of light and scatter all colours about equally",
          "Water absorbs blue light",
          "Clouds are too cold to scatter blue",
          "Clouds contain no air molecules"
        ],
        answer: 0,
        why: "The 1/λ⁴ rule only holds for particles much smaller than the wavelength. Droplets micrometres across scatter every colour roughly the same, so the mix stays white."
      },
      {
        q: "Molecules scatter violet even more strongly than blue. Why does the sky still look blue rather than violet?",
        options: [
          "Violet light cannot travel through air at all",
          "The sun sends less violet than blue, our eyes are weak at violet, and the broad mix reads as pale blue",
          "Violet light is absorbed by the oceans",
          "The sky really is violet, but cameras and eyes are wrong"
        ],
        answer: 1,
        why: "The scattered light is strongest near 410 nm in this model, but it is a broad mix of all colours, and weighted by how our cone cells respond, it looks pale blue."
      }
    ],
    related: [
      { slug: "double-slit", why: "Colour is wavelength: the same light, measured with interference." },
      { slug: "fourier", why: "White sunlight is a sum of pure colours, as a sound is a sum of sines." },
      { slug: "expanding-universe", why: "Another case where reading the colour of light reveals what it crossed." }
    ],
    challenges: [
      { id: "red-sun", goal: "On Earth with tiny molecules and the normal amount of air, lower the sun until less than 10% of its blue (450 nm) light comes straight through.", hint: "Use the Sun height slider or Watch a sunset, and watch the Blue straight through readout." },
      { id: "white-noon", goal: "With the sun at least 60° high, turn the sky overhead white by changing only what scatters the light.", hint: "Raise the sun, then try the other option under What scatters the light." },
      { id: "blue-sunset", goal: "Find a blue sunset: with the sun below 10°, make the sky just above the sun bluer than the sky overhead.", hint: "That never happens with Earth's air. Try another planet." }
    ],
    teach: {
      level: "Ages 14–18",
      minutes: 45,
      objectives: [
        "Students can explain that the sky is blue because air molecules scatter short wavelengths much more than long ones.",
        "Students can use air mass to explain why the sun looks orange or red near the horizon.",
        "Students can explain why clouds and haze look white, using particle size compared with the wavelength.",
        "Students can give two reasons why the sky looks blue rather than violet."
      ],
      plan: [
        { min: 5, what: "Predictions: students answer the worksheet predictions on their own, without the experiment." },
        { min: 7, what: "Demonstration: show the panorama, the photons in the side view and the spectrum chart. Point out the Air mass and the two straight-through readouts." },
        { min: 13, what: "Activity 1 in pairs: lower the sun step by step and record how much blue and red light comes straight through." },
        { min: 8, what: "Activity 2: compare tiny molecules, large droplets, more and less air, and Mars." },
        { min: 7, what: "Discussion: why not violet? Switch on the eye-sensitivity curve and compare the two peaks on the chart." },
        { min: 5, what: "Wrap-up: questions, the quiz on the page and a one-sentence explanation of the blue sky and the red sunset." }
      ],
      vocabulary: [
        { term: "Scattering", def: "When light hits a particle and is sent off in a new direction instead of carrying straight on." },
        { term: "Rayleigh scattering", def: "Scattering by particles much smaller than the wavelength, such as air molecules. It is far stronger for short wavelengths, in proportion to 1/λ⁴." },
        { term: "Wavelength", def: "The distance between wave crests. For visible light it runs from about 400 nm (violet) to 700 nm (red)." },
        { term: "Air mass", def: "How many times more air sunlight crosses than when the sun is straight overhead. About 38 at the horizon." },
        { term: "Spectrum", def: "How much light there is at each wavelength." },
        { term: "Mie scattering", def: "Scattering by particles about as large as the wavelength or larger, such as cloud droplets. It depends only weakly on colour." }
      ],
      misconceptions: [
        "The sky reflects the ocean. The sky is just as blue over deserts; the colour comes from scattering by air itself.",
        "Air is blue. Air is clear; it only looks blue because it scatters blue sunlight toward you from every direction.",
        "Sunsets are red because the sun changes colour. The sun's light is the same; the long path through the air removes the blue.",
        "Clouds are white because water is white. Large droplets scatter all colours about equally, so white sunlight stays white."
      ],
      predictions: [
        "If air scattered every colour equally, what colour would the sky be?",
        "When the sun is near the horizon, does its light cross a little more air than at noon, or a lot more? Guess a number.",
        "Would the sky look the same colour on top of a high mountain as at sea level? Why or why not?"
      ],
      activities: [
        {
          title: "How a sunset removes blue",
          steps: [
            "Choose Earth and Tiny molecules, and set Amount of air to 1.00×.",
            "Set Sun height above the horizon to 60°, 30°, 10°, 5° and 1° in turn.",
            "For each, record the Air mass, Blue (450 nm) straight through, Red (700 nm) straight through and the colour shown next to Sun.",
            "Describe how the blue and red readouts change as the air mass grows."
          ],
          table: { columns: ["Sun height (°)", "Air mass", "Blue straight through (%)", "Red straight through (%)", "Sun colour"], rows: 5 }
        },
        {
          title: "What decides the colour of the sky?",
          steps: [
            "Set Sun height above the horizon to 60°.",
            "Record the Sky overhead colour with Tiny molecules, then with Large droplets.",
            "Return to Tiny molecules. Record the Sky overhead colour with Amount of air at 0, 0.3×, 1.00× and 3.00×.",
            "Choose Mars (illustration), lower the sun below 10° and describe the sky near the sun and overhead."
          ],
          table: { columns: ["Setting", "Sky overhead", "Sun"], rows: 6 }
        }
      ],
      questions: [
        "Using your Activity 1 data, explain why the sun turns red near the horizon while the sky overhead stays blue.",
        "Why does a cloud look white, while clear air looks blue?",
        "Astronauts on the Moon saw a black sky with the sun up. Use the Amount of air slider to explain why.",
        "The light from the sky overhead is strongest at about 410 nm, which is violet. Give two reasons why the sky still looks blue."
      ],
      answers: [
        "Prediction 1: white, or pale grey. Every colour of sunlight would be scattered toward you in the same proportions, as with clouds.",
        "Prediction 2: a lot more. The air mass is about 2 at 30°, about 5.6 at 10° and about 38 at the horizon, because the light skims through the air for hundreds of kilometres.",
        "Prediction 3: no. With less air above you, less light is scattered, so the sky looks a darker, deeper blue. Try Amount of air at 0.3×.",
        "Question 1: as the air mass grows, the blue straight-through readout drops much faster than the red one, because blue scatters about six times more. The direct beam keeps mostly red. The sky overhead is lit by sunlight that has crossed less air high up, and scattering still favours blue there.",
        "Question 2: cloud droplets are thousands of times bigger than air molecules and scatter all colours about equally, so the scattered light is white. Molecules are much smaller than the wavelength and scatter mainly blue.",
        "Question 3: with no air there is nothing to scatter sunlight toward you, so the sky away from the sun stays black. Set Amount of air to 0 to see it.",
        "Question 4: the sun sends less violet than blue, our eyes are much less sensitive to violet, and sky light is a broad mix of all colours that our three types of cone cells report together as pale blue."
      ]
    }
  }
});
