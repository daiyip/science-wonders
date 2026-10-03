(window.WONDERS = window.WONDERS || {}).content = Object.assign(window.WONDERS.content || {}, {
  "chaos": {
    predict: {
      question: "Make the starting difference between two pendulums ten million times smaller. How much longer do they swing together?",
      options: [
        "About ten million times longer",
        "About a thousand times longer",
        "Only about four times longer",
        "Forever, since they now start identical"
      ],
      answer: 2,
      reveal: "The gap between the pendulums grows by roughly the same factor every second, so each tenfold gain in precision buys only a fixed extra slice of time. Most people expect agreement to last in proportion to the precision, but exponential growth eats up any head start quickly.",
      tryIt: "Drag the Starting difference slider from 1e-2 down to 1e-9 rad and compare the Visibly apart after reading."
    },
    quiz: [
      {
        q: "Why does the separation plot climb in a roughly straight line for the default settings?",
        options: [
          "The pendulums drift apart at a constant speed",
          "The vertical scale is logarithmic, so steady exponential growth looks straight",
          "Friction slowly adds error at a steady rate",
          "The simulation adds a little random noise each step"
        ],
        answer: 1,
        why: "On a log scale, multiplying by the same factor each second shows up as equal upward steps, which is a straight line."
      },
      {
        q: "You set the arms to small angles like 20 degrees and 0 degrees. What changes?",
        options: [
          "The pendulums split apart even faster",
          "Nothing, chaos does not depend on the starting angles",
          "The motion is regular and the gap grows slowly, because chaos needs enough energy"
        ],
        answer: 2,
        why: "At low energy the double pendulum moves almost like two simple oscillators, so small differences stay small."
      },
      {
        q: "Nothing in this simulation is random. Why is its long-term future still unpredictable in practice?",
        options: [
          "Any error in the starting state, however tiny, is multiplied until it dominates",
          "The computer rounds numbers differently on every run",
          "Gravity changes slightly over time",
          "The equations of motion are only approximately known"
        ],
        answer: 0,
        why: "The laws are exact and deterministic, but we can never measure a real starting state perfectly, and chaos amplifies that error exponentially."
      }
    ],
    related: [
      { slug: "entropy", why: "Chaos amplifies tiny errors and spoils time reversal." },
      { slug: "emergence", why: "Simple exact rules, yet behaviour you cannot shortcut." },
      { slug: "decoherence", why: "Another way tiny disturbances wipe out a delicate state." }
    ]
  },
  "entropy": {
    predict: {
      question: "The gas has spread across the whole box. You reverse every particle's velocity exactly. What happens next?",
      options: [
        "It stays mixed, because entropy can never go down",
        "It crowds back into the left half on its own",
        "Half of it gathers on the right side instead",
        "The particles slow down and stop"
      ],
      answer: 1,
      reveal: "Every collision obeys laws that run equally well backwards, so a perfect reversal retraces each path and the gas un-mixes. Most people expect the second law to forbid this, but it only says un-mixing is overwhelmingly unlikely, not impossible.",
      tryIt: "Let the gas mix for a few seconds, then press Reverse time and watch the In the left half reading climb back up."
    },
    quiz: [
      {
        q: "Why does the gas spend nearly all its time close to an even split between the two halves?",
        options: [
          "A force pushes particles toward the emptier side",
          "Particles repel each other more strongly when crowded",
          "Even splits can be arranged in vastly more ways than lopsided ones"
        ],
        answer: 2,
        why: "Entropy counts arrangements, and C(N, n) is hugely larger near n = N/2, so random motion almost always lands there."
      },
      {
        q: "With Imperfect reversal on, one particle is nudged by 1/65,536 of a pixel. Why does the gas then fail to un-mix?",
        options: [
          "The nudge adds enough energy to keep the gas hot",
          "Each collision magnifies the tiny error and passes it on, until every path is wrong",
          "The nudged particle blocks the others from reaching the left side",
          "The simulation detects the error and stops reversing"
        ],
        answer: 1,
        why: "Collisions between disks are chaotic, so a minute error grows and spreads until the reversed motion no longer retraces the original."
      },
      {
        q: "With only 4 particles, how often will you see all of them on the left?",
        options: [
          "About one look in sixteen",
          "Never",
          "About half the time",
          "About one look in a billion"
        ],
        answer: 0,
        why: "Each particle is on the left about half the time, so all four is (1/2)^4 = 1/16; with 100 particles it becomes about 1 in 10^30."
      }
    ],
    related: [
      { slug: "chaos", why: "The error growth that makes reversal fail." },
      { slug: "decoherence", why: "Spreading information into surroundings is effectively irreversible too." },
      { slug: "expanding-universe", why: "The early universe set the low-entropy starting point." }
    ]
  },
  "evolution": {
    predict: {
      question: "Mutation is set to zero and the environment changes twice. What does the population do?",
      options: [
        "It adapts to each new background just as fast as before",
        "Creatures change colour during their lives to match",
        "It can only use variation it already has, and soon gets stuck",
        "It adapts even faster, since there are no harmful mutations"
      ],
      answer: 2,
      reveal: "Selection can only pick from variation that exists. Without mutation, each round of selection uses some up, and once the population is uniform there is nothing left to choose from. Many people picture selection as creating new traits on demand, but it only filters.",
      tryIt: "Drag Mutation size to 0, let the colours settle, then press Change the environment twice."
    },
    quiz: [
      {
        q: "Where does the direction of change in this simulation come from?",
        options: [
          "Creatures try to blend in and pass that effort to their young",
          "Hawks remove conspicuous variants more often, generation after generation",
          "Mutations tend to push colour toward the background",
          "The program steers the average colour toward the target"
        ],
        answer: 1,
        why: "Mutations are random in direction; only the biased removal by hawks, repeated every generation, makes the population track its background."
      },
      {
        q: "What happens to average speed if you take all the hawks away?",
        options: [
          "It slowly falls, because speed costs energy and nothing rewards it",
          "It stays exactly the same forever",
          "It rises, because there is more food to go around"
        ],
        answer: 0,
        why: "Faster creatures raise fewer young, so without predators to escape from, the cost of speed wins out."
      },
      {
        q: "Raising the Predation pressure slider mostly does what?",
        options: [
          "Makes mutations larger",
          "Changes which colour is best camouflaged",
          "Makes creatures change colour within their lifetime",
          "Strengthens selection, so the population shifts faster and speed climbs"
        ],
        answer: 3,
        why: "More hawks remove poorly matched and slow creatures more often, so both colour and speed respond more quickly."
      }
    ],
    related: [
      { slug: "emergence", why: "Order appears from simple local rules, no designer." },
      { slug: "epidemics", why: "Germs and their spread through populations." },
      { slug: "chaos", why: "Small random differences, amplified over time." }
    ]
  },
  "emergence": {
    predict: {
      question: "In Flocking, you set Alignment to zero, so birds ignore their neighbours' heading. What happens?",
      options: [
        "The birds scatter and fly alone",
        "The birds still clump, but each clump swirls instead of travelling together",
        "Nothing changes, the flock moves exactly as before",
        "All birds stop moving"
      ],
      answer: 1,
      reveal: "Cohesion still pulls birds together and separation keeps them spaced, so clumps remain, but without alignment they lose a shared direction and mill around. Most people expect the flock to fall apart completely, yet each rule controls a different part of the pattern.",
      tryIt: "Choose Flocking, then drag the Alignment slider down to 0."
    },
    quiz: [
      {
        q: "In the Game of Life, what happens to a dead cell with exactly three live neighbours?",
        options: [
          "It stays dead",
          "It becomes alive",
          "It kills its neighbours"
        ],
        answer: 1,
        why: "That is the birth rule; a live cell survives with two or three neighbours and every other cell dies or stays empty."
      },
      {
        q: "The rules never mention gliders. Where does the glider come from?",
        options: [
          "It is a pattern in the behaviour of the whole grid, found only by running the rules",
          "It is a special object the programmer added to the grid",
          "It appears because the rules include a hidden movement rule",
          "It is a display effect, not something the cells actually do"
        ],
        answer: 0,
        why: "Gliders are emergent: the same local rules applied to five cells happen to reproduce the shape one step over every four generations."
      },
      {
        q: "Why is there no general shortcut to predict whether a Life pattern eventually dies out?",
        options: [
          "The rules are random",
          "The grid is too small",
          "Nobody has written fast enough software yet",
          "Life can run any computer program, so the question is as hard as the halting problem"
        ],
        answer: 3,
        why: "Because Life is Turing complete, predicting its long-term fate in general is undecidable; you have to run it and watch."
      }
    ],
    related: [
      { slug: "evolution", why: "Design-like order arising with no designer." },
      { slug: "chaos", why: "Simple deterministic rules with unpredictable outcomes." },
      { slug: "epidemics", why: "Individual meetings add up to a population-wide curve." }
    ]
  },
  "epidemics": {
    predict: {
      question: "Measles has an R0 around 15. If 90% of people are vaccinated, can an outbreak still spread?",
      options: [
        "No, 90% is far more than enough",
        "Yes, the threshold is about 93%, so it can still spread",
        "Only among the vaccinated people",
        "No, any vaccination above 50% stops every disease"
      ],
      answer: 1,
      reveal: "The herd-immunity threshold is 1 minus 1/R0, which for R0 = 15 is about 93%. Most people assume 90% must be plenty, but with each case reaching so many others, the remaining 10% is enough to keep chains of infection going.",
      tryIt: "Pick Measles under Disease, set Vaccinated before the outbreak to 90% and then 95%, pressing New outbreak each time."
    },
    quiz: [
      {
        q: "On the chart, infections peak at a particular moment. When?",
        options: [
          "When the susceptible share falls through 1/R0",
          "Exactly halfway through the outbreak",
          "When half the people have been infected",
          "When the first person recovers"
        ],
        answer: 0,
        why: "Below a susceptible share of 1/R0, each case infects fewer than one new person on average, so new infections start to fall."
      },
      {
        q: "What does turning up social distancing do to the outbreak curve?",
        options: [
          "Raises the peak and makes it arrive sooner",
          "Changes nothing, since R0 is fixed by the disease",
          "Lowers the peak and makes it arrive later"
        ],
        answer: 2,
        why: "Fewer meetings mean fewer transmissions per day, which flattens the curve; the SIR equations do not include this, so the dots fall below them."
      },
      {
        q: "Why does vaccinating above the threshold also protect people who are not vaccinated?",
        options: [
          "Vaccinated people pass immunity to others by contact",
          "The virus becomes weaker over time",
          "Unvaccinated people are given a lower R0",
          "Each case infects fewer than one other, so chains die out before reaching most unprotected people"
        ],
        answer: 3,
        why: "Once enough people are immune, the infection cannot sustain itself, so it fizzles before reaching most of the susceptible ones."
      }
    ],
    related: [
      { slug: "evolution", why: "Pathogens evolve under pressure from drugs and vaccines." },
      { slug: "emergence", why: "Crowd-level patterns from individual encounters." },
      { slug: "birthday-paradox", why: "Counting chance meetings in a crowd." }
    ]
  }
});
