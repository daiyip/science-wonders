(window.WONDERS = window.WONDERS || {}).content = Object.assign(window.WONDERS.content || {}, {
  "doppler": {
    predict: {
      question: "An ambulance drives past you at a steady speed with its siren on. What happens to the pitch you hear?",
      options: [
        "It rises steadily as the ambulance gets closer, then falls as it leaves",
        "It stays high and almost steady on the way in, slides down as it passes, then stays low",
        "It stays the same; only the loudness changes",
        "It is normal on the way in and drops only once the ambulance is moving away"
      ],
      answer: 1,
      reveal: "The pitch depends on how fast the siren is closing in on you, not on how close it is. Far away it heads almost straight at you, so the pitch is high and nearly constant. As it passes, the direction swings round and the pitch slides down quickly, then settles low as it drives away. Most people expect the pitch to keep rising as it gets nearer, because it gets louder.",
      tryIt: "Press Play sound and watch the strip under the road during a pass at Mach 0.4: a flat line above ×1, a quick slide, then a flat line below it."
    },
    quiz: [
      {
        q: "A jet flies over you at Mach 2. When do you first hear it?",
        options: [
          "As it approaches, at a very high pitch",
          "When it is right overhead",
          "Only after it has passed, when its cone sweeps over you with a boom",
          "Never: sound cannot catch up with it"
        ],
        answer: 2,
        why: "Above Mach 1 the jet outruns every sound it makes. Nothing reaches you until the cone of piled-up crests trailing behind it arrives, and that cone is the boom. Then you hear the jet, even though it is already well past."
      },
      {
        q: "The driver of the ambulance listens to its own siren. What do they hear?",
        options: [
          "A higher pitch, since the siren moves forward",
          "The true pitch, because the siren is not moving relative to them",
          "A lower pitch, since the sound has to chase the siren",
          "A higher pitch on the way to the hospital and a lower one on the way back"
        ],
        answer: 1,
        why: "The pitch changes only when the distance between source and listener changes while the sound travels. The driver moves with the siren, so the crests reach them at the same rate they are made."
      },
      {
        q: "Light from a distant galaxy reaches us with every colour shifted toward red. What does that tell astronomers?",
        options: [
          "The galaxy is very hot",
          "The galaxy is moving away from us",
          "The galaxy is moving toward us",
          "The light has slowed down on the way"
        ],
        answer: 1,
        why: "Like the siren driving away, a source moving away stretches its waves to longer wavelengths, which for light means redder. Nearly all distant galaxies are redshifted, the further the more so, which is the evidence that the universe is expanding."
      }
    ],
    related: [
      { slug: "expanding-universe", why: "The Doppler idea applied to light: galaxies are redshifted because space is stretching." },
      { slug: "speed-of-light", why: "Another finite speed: what you see, like what you hear here, left its source some time ago." },
      { slug: "fourier", why: "What a pitch is: how frequency and harmonics make the sound you hear." }
    ],
    challenges: [
      { id: "double", goal: "Make the listener hear the siren at twice its own frequency or more.", hint: "Raise the Source speed and put the listener close to the road, ahead of the siren." },
      { id: "boom", goal: "Go faster than sound and let the Mach cone sweep over a listener standing at least 20 m from the road.", hint: "Drag the listener further from the road, then press Mach 2." },
      { id: "tenfold", goal: "Without breaking the sound barrier, make the listener hear ten times the siren's frequency.", hint: "Close to Mach 1 the crests sent forward almost pile up. Stand very close to the road, well ahead of the siren." }
    ],
    teach: {
      level: "Ages 14–18",
      minutes: 45,
      objectives: [
        "Students can explain the Doppler effect in terms of wave crests spreading from the point where they were made.",
        "Students can use f′ = f · c ÷ (c − v cos θ) to predict the pitch heard from a moving source.",
        "Students can describe how the heard pitch changes as a source passes and why it does not keep rising as the source gets closer.",
        "Students can explain what happens at and above the speed of sound, including the Mach cone and the sonic boom."
      ],
      plan: [
        { min: 5, what: "Prediction: students answer the worksheet predictions on their own, then compare with a partner." },
        { min: 7, what: "Demonstration: set the Source speed to 0, then raise it slowly. Students describe what happens to the rings ahead of and behind the siren. Press Play sound for one pass at Mach 0.4." },
        { min: 12, what: "Activity 1 in pairs: measure the heard frequency ahead of and behind the siren at several speeds and compare with the formula." },
        { min: 8, what: "Activity 2: move the listener away from the road and record how the pitch slide changes." },
        { min: 8, what: "Supersonic: press Mach 1 and Mach 2. Students record the Mach cone half-angle and describe what the listener hears and when." },
        { min: 5, what: "Wrap-up: discuss the questions, link to Doppler ultrasound, speed guns and redshift, and check the predictions." }
      ],
      vocabulary: [
        { term: "Frequency", def: "The number of wave crests passing a point each second, measured in hertz (Hz). For sound we hear it as pitch." },
        { term: "Wavelength", def: "The distance between one wave crest and the next." },
        { term: "Doppler effect", def: "The change in the frequency you receive when the source of a wave and you are moving toward or away from each other." },
        { term: "Mach number", def: "A speed divided by the speed of sound. Mach 1 is the speed of sound, about 343 m/s in air at 20 °C." },
        { term: "Mach cone", def: "The cone of piled-up wave crests trailing behind a source that moves faster than its own waves." },
        { term: "Sonic boom", def: "The sudden bang heard when a Mach cone passes over you, because sound made over a stretch of time arrives all at once." }
      ],
      misconceptions: [
        "The pitch rises as the source gets closer. In fact, at a steady speed the approaching pitch is high and nearly steady; the change happens as the source goes by.",
        "The source itself changes its frequency. The siren's note never changes and the driver hears it steady; only listeners it moves toward or away from hear a shift.",
        "A sonic boom happens only at the moment a plane breaks the sound barrier. It is heard by everyone under the path of a supersonic plane, all the time it flies faster than sound.",
        "Sound from a faster source travels faster. The crests always spread at the speed of sound in the air; only where they start from changes."
      ],
      predictions: [
        "An ambulance drives past you at a steady speed. Sketch how you think the pitch you hear changes with time, from far away on the left to far away on the right.",
        "If the siren moves at half the speed of sound straight toward you, will the pitch you hear be a bit higher, double, or something else?",
        "A plane flies over you faster than sound. When will you first hear it?"
      ],
      activities: [
        {
          title: "Ahead and behind",
          steps: [
            "Drag the listener very close to the road, about 2 m from it, near the right side of the picture.",
            "Set Siren frequency to 400 Hz and Source speed to the value in the table.",
            "While the siren is still far to the left, read Heard now. After it has passed, read Heard now again.",
            "Calculate 400 × 1 ÷ (1 − M) and 400 × 1 ÷ (1 + M) and compare with your readings."
          ],
          table: { columns: ["Source speed (Mach)", "Heard now, approaching (Hz)", "Predicted, approaching (Hz)", "Heard now, going away (Hz)", "Predicted, going away (Hz)"], rows: 5 }
        },
        {
          title: "Distance from the road",
          steps: [
            "Set Source speed to Mach 0.4 and keep Siren frequency at 400 Hz.",
            "Put the listener 5 m from the road and watch the pitch strip during one pass. Estimate how long, in seconds on the strip, the slide from high to low takes.",
            "Repeat with the listener 15 m and 25 m from the road.",
            "For each pass, note how far past the listener the siren is when Heard now equals 400 Hz."
          ],
          table: { columns: ["Distance from road (m)", "Highest heard (Hz)", "Lowest heard (Hz)", "Slide time on the strip (s)"], rows: 4 }
        },
        {
          title: "Breaking the sound barrier",
          steps: [
            "Press Mach 1 and describe the rings in front of the siren.",
            "Press Mach 2. Read the Mach cone half-angle and check that sin α = 1 ÷ M.",
            "Watch the listener during a pass. Record what they hear before the cone arrives, at the moment it arrives, and after it."
          ],
          table: { columns: ["Source speed (Mach)", "Mach cone half-angle", "1 ÷ M", "sin of the half-angle"], rows: 4 }
        }
      ],
      questions: [
        "Why is the pitch you hear from an approaching siren almost steady, even though the siren gets much closer?",
        "When the listener hears exactly the siren's own frequency, where is the siren? Explain why.",
        "Why does a listener under a supersonic plane hear nothing at first, then a boom?",
        "A doctor uses ultrasound to measure blood flow. Explain how the Doppler effect lets the machine tell the speed and direction of the blood."
      ],
      answers: [
        "Prediction 1: the pitch is high and almost flat while the siren is far away and approaching, slides down quickly as it passes, then is low and almost flat as it leaves. The slide is quicker the closer you stand to the road.",
        "Prediction 2: double. Straight toward you at half the speed of sound, f′ = f ÷ (1 − 0.5) = 2f, a full octave higher.",
        "Prediction 3: only after it has passed overhead, when the Mach cone trailing behind it reaches you. The first thing you hear is the boom.",
        "Question 1: the pitch depends on how fast the distance is shrinking, v cos θ, not on the distance itself. Far away the siren comes almost straight at you, so cos θ is close to 1 and barely changes; only near you does the direction swing round.",
        "Question 2: the sound you hear then was made when the siren was exactly abreast of you (cos θ = 0). By the time that sound reaches you the siren has moved on, so it is already past you.",
        "Question 3: the plane moves faster than the sound it makes, so no sound can get ahead of it. The crests overlap along a cone behind it. When the cone reaches you, sound made over a stretch of the flight arrives at the same moment, which you hear as a bang.",
        "Question 4: the probe sends ultrasound of a known frequency. Blood moving toward the probe returns a higher frequency, blood moving away a lower one. The size of the shift gives the speed and its sign the direction."
      ]
    }
  }
});
