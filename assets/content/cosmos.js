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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
  }
});
