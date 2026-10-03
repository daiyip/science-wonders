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
    ],
    challenges: [
      { id: "fan", goal: "Pick 100 fan and run until the separation plot reaches the unrelated band (1 or more).", hint: "Press 100 fan under Pendulums, then just wait about ten seconds." },
      { id: "late", goal: "With the arms at 150° and 0°, keep two pendulums together for more than 12 seconds before they are visibly apart.", hint: "Only the Starting difference slider can help. How far down does it go?" },
      { id: "calm", goal: "With the Starting difference at its largest (1e-2 rad), find start angles where two pendulums are still together after 30 seconds.", hint: "Chaos needs energy. Try small swings, below about 40°." }
    ],
    teach: {
      level: "Ages 14–18",
      minutes: 45,
      objectives: [
        "Students can explain sensitive dependence on initial conditions using two double pendulums.",
        "Students can read a logarithmic scale and recognise a straight climb as exponential growth.",
        "Students can use data to show that each tenfold gain in starting precision buys only a fixed extra slice of time.",
        "Students can explain why a system with exact, non-random laws can still be unpredictable in practice."
      ],
      plan: [
        { min: 5, what: "Predictions: students answer the worksheet predictions on their own, without the experiment." },
        { min: 5, what: "Demonstration: run the default setup. Point out the two overlaid pendulums, the log-scale separation plot and the Visibly apart after reading." },
        { min: 15, what: "Activity 1 in pairs: measure how long the pendulums stay together for different starting differences." },
        { min: 8, what: "Activity 2: lower the start angles and find out when the motion stops being chaotic." },
        { min: 7, what: "Discussion: weather forecasts and ensembles. Show the 100 fan option as a forecast ensemble." },
        { min: 5, what: "Wrap-up: questions, the quiz on the page and a one-sentence summary of the butterfly effect." }
      ],
      vocabulary: [
        { term: "Deterministic", def: "Following exact rules with no randomness, so the same start always gives the same result." },
        { term: "Chaos", def: "Motion that is deterministic but so sensitive to its starting state that long-term prediction is impossible in practice." },
        { term: "Butterfly effect", def: "The idea that a tiny change in the starting state can grow into a completely different outcome." },
        { term: "Exponential growth", def: "Growth by the same factor in each equal step of time, such as doubling every second." },
        { term: "Logarithmic scale", def: "A scale where each step up means multiplying by ten, so exponential growth looks like a straight line." },
        { term: "Lyapunov exponent", def: "The average rate at which nearby starting states move apart; positive for chaotic motion." }
      ],
      misconceptions: [
        "Chaotic means random. In fact the rules are exact, and the same numbers give exactly the same run every time.",
        "A better computer could predict forever. Each tenfold gain in precision adds only about the same short extra time.",
        "Small causes always have small effects. In chaotic systems small differences grow exponentially.",
        "Every pendulum is chaotic. At small swings the double pendulum moves regularly and stays predictable."
      ],
      predictions: [
        "If you make the starting difference between the two pendulums 1000 times smaller, how much longer do you think they will stay together?",
        "Will two pendulums released from small angles split apart as quickly as two released from high up? Why?"
      ],
      activities: [
        {
          title: "How much time does precision buy?",
          steps: [
            "Under Pendulums choose 2. Leave Upper arm start angle at 150° and Lower arm start angle at 0°.",
            "Set Starting difference to 1e-2 rad, press Restart and wait for the Visibly apart after reading. Record it with the Growth rate reading.",
            "Repeat with 1e-4, 1e-6, 1e-8 and 1e-9 rad.",
            "Plot Visibly apart after against the power of ten of the starting difference, and describe the shape of the graph."
          ],
          table: { columns: ["Starting difference (rad)", "Visibly apart after (s)", "Growth rate"], rows: 5 }
        },
        {
          title: "When is a pendulum chaotic?",
          steps: [
            "Set Starting difference to 1e-2 rad and Lower arm start angle to 0°.",
            "Try Upper arm start angle values of 20°, 45°, 90°, 120° and 150°.",
            "For each, watch for 30 seconds. Record whether the pendulums become visibly apart and whether the separation plot climbs in a straight line."
          ],
          table: { columns: ["Upper arm start angle", "Visibly apart after (s)", "Shape of the separation plot"], rows: 5 }
        }
      ],
      questions: [
        "Why does the separation plot use a logarithmic scale? What would a straight line on an ordinary scale have meant?",
        "From your Activity 1 data, about how many extra seconds does each tenfold improvement in precision buy?",
        "Weather centres run their forecast model about 50 times from slightly different starting states. Use the 100 fan option to explain why.",
        "Nothing in this simulation is random. Explain why its long-term future is still unpredictable."
      ],
      answers: [
        "Prediction 1: only a few seconds longer. At 150° and 0° each tenfold improvement adds roughly 1.5 s, so 1000 times smaller adds about 4 to 5 s, not 1000 times as long.",
        "Prediction 2: no. At small angles the motion is regular and the gap grows slowly, so the pendulums can stay together for minutes. Chaos needs enough energy for big swings and flips.",
        "Question 1: the gap grows by a similar factor every second, so it spans many powers of ten. On a log scale equal factors are equal steps, so exponential growth is a straight line. A straight line on an ordinary scale would mean steady, linear growth.",
        "Question 2: about 1.5 s. The split moves from about 3 s at 1e-2 rad to about 13 s at 1e-9 rad, which is seven powers of ten for about 10 s.",
        "Question 3: each pendulum in the fan is like one forecast from a slightly different measurement. While the runs stay together the forecast is reliable; once they spread out, only probabilities make sense.",
        "Question 4: every real measurement of the starting state has some error, and chaos multiplies that error by about the same factor every second until it is as large as the motion itself."
      ]
    }
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
    ],
    challenges: [
      { id: "unmix", goal: "Press Reverse time and let the gas run back to t = 0 with every particle on the left.", hint: "Let the gas spread for a few seconds first, then press Reverse time and wait." },
      { id: "nudge", goal: "Turn on Imperfect reversal and make a reversal fail: the clock gets back to 0 with particles still on the right.", hint: "Use a few hundred particles and let them mix for at least five seconds before reversing." },
      { id: "by-chance", goal: "With 10 or more particles, catch them all in the left half by chance, without reversing time.", hint: "Fewer particles means better odds. Set Particles to 10 and Simulation speed to 30×, then watch Seen all on the left." }
    ],
    teach: {
      level: "Ages 14–18",
      minutes: 45,
      objectives: [
        "Students can describe entropy as a count of the ways the particles can be arranged.",
        "Students can explain why a gas spreads out even though every collision could run backwards.",
        "Students can use the probability (1/2)^N to explain why un-mixing by chance becomes practically impossible as N grows.",
        "Students can explain why a tiny error makes a reversal of time fail."
      ],
      plan: [
        { min: 5, what: "Predictions: students answer the worksheet predictions on their own." },
        { min: 5, what: "Demonstration: the wall is pulled out and the gas spreads. Point out the two graphs and the Chance all are on the left reading." },
        { min: 12, what: "Activity 1 in pairs: count how often all particles end up on the left by chance for different numbers of particles." },
        { min: 10, what: "Activity 2: reverse time, with and without Imperfect reversal." },
        { min: 8, what: "Discussion: the second law as a law of overwhelming odds, and why we remember the past but not the future." },
        { min: 5, what: "Wrap-up: questions and the quiz on the page." }
      ],
      vocabulary: [
        { term: "Entropy", def: "A measure of how many arrangements of the particles look the same from outside; here S = ln C(N, n_left)." },
        { term: "Microstate", def: "One exact arrangement: which particles are where." },
        { term: "Macrostate", def: "What we can see from outside, such as how many particles are in the left half." },
        { term: "Second law of thermodynamics", def: "The entropy of an isolated system almost always increases until it reaches its maximum." },
        { term: "Reversible", def: "A process that can run backwards using the same laws, like a single collision." },
        { term: "Fluctuation", def: "A random, temporary departure from the most likely state." }
      ],
      misconceptions: [
        "Entropy just means messiness. It counts how many arrangements give the same overall picture.",
        "The second law is absolute. It is a statement about probabilities, which become overwhelming for large numbers of particles.",
        "Something pushes the particles toward the empty side. No force does this; random motion simply visits the far more numerous mixed arrangements.",
        "Physics forbids time running backwards. The laws allow it; the problem is the impossibly perfect precision it needs."
      ],
      predictions: [
        "The gas has spread across the whole box. If every particle's velocity is reversed exactly, what will happen?",
        "With 10 particles, how often do you think all of them will be in the left half by chance? What about with 1000?"
      ],
      activities: [
        {
          title: "Could it happen by itself?",
          steps: [
            "Set Simulation speed to 30×.",
            "Set Particles to 4. Watch for 30 seconds and record the Seen all on the left count and the Chance all are on the left reading.",
            "Repeat with 8, 10 and 20 particles, pressing Start over each time.",
            "Set Particles to 200 and record the Chance all are on the left reading. Compare it with how long you watched."
          ],
          table: { columns: ["Particles", "Chance all are on the left", "Seen all on the left in 30 s"], rows: 5 }
        },
        {
          title: "Running time backwards",
          steps: [
            "Set Particles to 200 and press Start over. When the Clock reads about 5 s, press Reverse time. Record how many particles are in the left half when the clock reaches 0.",
            "Turn on Imperfect reversal, press Start over and repeat.",
            "Repeat both runs with Particles set to 20 and to 400."
          ],
          table: { columns: ["Particles", "Imperfect reversal", "Clock when reversed (s)", "In the left half at t = 0"], rows: 6 }
        }
      ],
      questions: [
        "Every collision in the simulation can run backwards. Why then do we never see a real gas un-mix?",
        "The Entropy reading is highest at an even split. Explain why, using the number of arrangements.",
        "Why does a nudge of 1/65,536 of a pixel ruin the reversal with hundreds of particles but not with a handful?",
        "A room holds about 10²⁷ air molecules. Use your table to explain why the air never gathers in one half of the room."
      ],
      answers: [
        "Prediction 1: the gas un-mixes. Every particle retraces its path and all of them are back in the left half at t = 0. The laws allow it; it just never happens without a perfect reversal.",
        "Prediction 2: with 10 particles the chance at any moment is (1/2)^10, about 1 in 1000, so you see it now and then. With 1000 it is about 1 in 10^301, which in practice never happens.",
        "Question 1: un-mixing needs every velocity exactly reversed. Out of all the ways the particles could be moving, only a vanishingly small fraction leads back into one half, so random motion essentially never finds them.",
        "Question 2: the entropy is ln C(N, n), the logarithm of the number of ways to choose which n particles are on the left. That number is by far the largest when n is half of N.",
        "Question 3: each collision multiplies a small error, as in chaos. With many particles there are many collisions before t = 0, so the error grows until the paths no longer match. With a handful there are too few collisions for it to grow.",
        "Question 4: the chance is 1/2 multiplied by itself about 10²⁷ times, a number so small it would not happen once in many lifetimes of the universe. The second law is a statement of overwhelming odds."
      ]
    }
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
    ],
    challenges: [
      { id: "dark", goal: "Switch the background to Sooty bark and get the average colour below 0.30.", hint: "Use Skip 10 generations to speed things up." },
      { id: "litter", goal: "On Leaf litter, keep the average colour between 0.45 and 0.55 for 5 generations in a row.", hint: "Selection pushes toward the ground's shade of 0.50. A small Mutation size keeps the population steady." },
      { id: "slow", goal: "Set Predation pressure to none and let the average speed fall below 0.15.", hint: "Without hawks, speed only costs offspring. Raise Mutation size to give selection more variety to work on, and skip many generations." }
    ],
    teach: {
      level: "Ages 14–18",
      minutes: 45,
      objectives: [
        "Students can identify variation, inheritance and selection in the simulation.",
        "Students can explain how predators change the average colour of a population over generations.",
        "Students can explain that populations evolve while individual creatures do not change.",
        "Students can describe a trade-off between running speed and number of offspring."
      ],
      plan: [
        { min: 5, what: "Predictions: students answer the worksheet predictions on their own." },
        { min: 5, what: "Demonstration: point out the creatures, the hawks' sight circles, the colour histogram with its ground marker and the chart of average traits." },
        { min: 12, what: "Activity 1 in pairs: change the background and track the average colour." },
        { min: 10, what: "Activity 2: remove the hawks and track the average speed." },
        { min: 8, what: "Discussion: the peppered moth in industrial England, and what mutation size does." },
        { min: 5, what: "Wrap-up: questions and the quiz on the page." }
      ],
      vocabulary: [
        { term: "Natural selection", def: "Individuals with traits that suit their environment survive and breed more, so those traits become more common." },
        { term: "Variation", def: "Differences between individuals in a population, such as colour or speed." },
        { term: "Inheritance", def: "Offspring receive their traits from their parents." },
        { term: "Mutation", def: "A small random change in a trait when it is passed on." },
        { term: "Camouflage", def: "Colouring that makes an animal hard for predators to see against its background." },
        { term: "Trade-off", def: "A trait that helps in one way but costs in another, such as speed that saves lives but means fewer young." }
      ],
      misconceptions: [
        "Individual creatures change colour to match the ground. In fact each keeps its colour for life; only the mix in the next generation changes.",
        "Animals evolve because they need or want to. Selection has no goal; it only filters the variation that is already there.",
        "Mutations happen in order to help. They are random, and selection decides which ones spread.",
        "Evolution always makes animals faster or stronger. Without hawks the average speed falls, because speed has a cost."
      ],
      predictions: [
        "The background changes from pale sand to black soot. What will happen to the creatures' average colour, and how quickly?",
        "If there are no hawks at all, what will happen to the creatures' running speed over many generations?"
      ],
      activities: [
        {
          title: "Changing the background",
          steps: [
            "Press New population and choose Pale sand under Background. Record the generation and the Average colour.",
            "Press Skip 10 generations twice, recording the Average colour each time.",
            "Choose Sooty bark. Press Skip 10 generations four times, recording the Average colour after each.",
            "Set Mutation size to 0, press Change the environment and skip 30 generations. Describe what is different."
          ],
          table: { columns: ["Generation", "Background", "Average colour", "Ground shade"], rows: 8 }
        },
        {
          title: "Speed has a price",
          steps: [
            "Set Mutation size to 0.030 and Predation pressure to 6 hawks. Press Skip 10 generations three times and record the Average speed.",
            "Set Predation pressure to none. Skip 30 generations and record the Average speed.",
            "Raise Mutation size to 0.100 and skip 30 more generations. Record the Average speed again."
          ],
          table: { columns: ["Predation pressure", "Mutation size", "Generation", "Average speed"], rows: 5 }
        }
      ],
      questions: [
        "Did any single creature change colour during its life? So what actually changed?",
        "Why did the average colour change quickly just after the background changed, then more slowly?",
        "With no hawks, why did the average speed fall? What does this tell you about the cost of a trait?",
        "In England in the 1800s dark peppered moths became common near sooty cities, then rare again after clean-air laws. Explain this using your results."
      ],
      answers: [
        "Prediction 1: it shifts toward dark within about 10 to 20 generations. Pale creatures stand out on soot and are eaten more often, so dark ones leave more offspring.",
        "Prediction 2: it slowly falls. Speed only helps when escaping hawks, and fast creatures have fewer young, so without predators slower ones leave more offspring.",
        "Question 1: no. Each creature keeps its colour for life. What changes is which creatures survive to breed, so the mix of colours in each new generation shifts.",
        "Question 2: at first many creatures contrast with the ground and are eaten, so selection is strong. As the average gets close to the ground shade the contrast, and so the selection, gets weaker.",
        "Question 3: in this model the number of young is 1 − 0.3 × speed. Without hawks nothing balances that cost, so slower creatures leave more young each generation. Larger mutations give selection more variety to act on, so the change is faster.",
        "Question 4: on soot-darkened trees, birds spotted pale moths more easily, so dark moths survived and bred more. When the air was cleaned the bark became pale again and selection reversed."
      ]
    }
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
    ],
    challenges: [
      { id: "soup", goal: "Start a Random soup and keep it running until generation 500.", hint: "Raise Generations per second to get there faster." },
      { id: "flock", goal: "In Flocking, with 100 or more birds, get every bird into a single flock (Separate flocks shows 1).", hint: "Set Number of birds to 100 and Cohesion to 3.0, then be patient: flocks merge when they meet." },
      { id: "hand", goal: "Press Clear, then draw 10 cells or fewer by hand that grow to more than 100 live cells.", hint: "The R-pentomino has only five cells. Draw its shape yourself, or invent your own." }
    ],
    teach: {
      level: "Ages 14–18",
      minutes: 45,
      objectives: [
        "Students can define emergence as complex group behaviour that arises from simple local rules.",
        "Students can state the three rules of the Game of Life and apply them by hand to a small pattern.",
        "Students can describe what each flocking rule (separation, alignment, cohesion) does to the flock.",
        "Students can give real examples of emergence and suggest the local rules behind them."
      ],
      plan: [
        { min: 5, what: "Predictions: students answer the worksheet predictions on their own." },
        { min: 5, what: "Demonstration: run the opening scene and read the complete rules panel aloud. Point out the glider gun and the pulsar." },
        { min: 12, what: "Activity 1 in pairs: build and test patterns in the Game of Life." },
        { min: 12, what: "Activity 2: switch each flocking rule off in turn and record what changes." },
        { min: 6, what: "Discussion: ant trails, traffic jams and fish schools. Who is in charge?" },
        { min: 5, what: "Wrap-up: questions and the quiz on the page." }
      ],
      vocabulary: [
        { term: "Emergence", def: "Behaviour of a whole system that none of its parts shows on its own and no rule describes directly." },
        { term: "Cellular automaton", def: "A grid of cells that all update together by the same simple rule based on their neighbours." },
        { term: "Generation", def: "One update of every cell in the Game of Life." },
        { term: "Glider", def: "A five-cell Life pattern that rebuilds itself one cell diagonally further along every 4 generations." },
        { term: "Oscillator", def: "A pattern that repeats itself in place after a fixed number of generations, such as the blinker or the pulsar." },
        { term: "Flocking", def: "Group motion of birds, fish or simulated agents that each follow a few local steering rules." }
      ],
      misconceptions: [
        "There must be a leader bird, or someone who designed the glider. Every bird and every cell follows the same local rules; nobody is in charge.",
        "Complex behaviour needs complicated rules. Life has three rules and flocking has three, yet both produce rich behaviour.",
        "Knowing the rules means you can predict the outcome. For Life there is in general no shortcut: you have to run it to see."
      ],
      predictions: [
        "In the Game of Life each cell lives or dies only by counting its 8 neighbours. Can rules this simple make a pattern that travels across the grid?",
        "What will the birds do if each one ignores the heading of its neighbours, so there is no alignment rule?"
      ],
      activities: [
        {
          title: "Patterns from three rules",
          steps: [
            "Choose Game of Life and press Clear. Draw three cells in a row by clicking, or by using the arrow keys and Space on the grid.",
            "Press Step several times and describe what happens.",
            "Press Glider, then press Step four times. Describe how the shape moves.",
            "Press Random soup and let it run. Record the Live cells reading at generations 0, 100, 300 and 500."
          ],
          table: { columns: ["Pattern", "Generation", "Live cells", "What it does"], rows: 6 }
        },
        {
          title: "Testing the flocking rules",
          steps: [
            "Choose Flocking. Wait 20 seconds and record Separate flocks and Alignment.",
            "Drag the Alignment slider to 0, wait 20 seconds and record again.",
            "Put Alignment back to 1.0 and drag Cohesion to 0. Record again.",
            "Put Cohesion back to 1.0 and drag Separation to 0. Record again and describe the shape of the flocks.",
            "Put Separation back to 1.5, turn on Add a hawk and describe how the flocks respond."
          ],
          table: { columns: ["Rule switched off", "Separate flocks", "Alignment", "What the birds do"], rows: 5 }
        }
      ],
      questions: [
        "No rule in the Game of Life mentions movement. How does a glider move?",
        "Which flocking rule makes the birds fly the same way, and which keeps them in groups? Use your data.",
        "Name one real system where group behaviour emerges without a leader, and suggest the simple local rules behind it.",
        "Why can't you always tell what a Life pattern will do just by reading the rules?"
      ],
      answers: [
        "Prediction 1: yes. The glider is five cells that rebuild themselves one cell diagonally further along every 4 generations, so the pattern travels although no cell moves.",
        "Prediction 2: they still clump, because cohesion and separation still act, but the clumps mill around instead of travelling together and the Alignment reading drops well below 1.",
        "Question 1: each generation cells die on one side of the shape and new ones are born on the other. After 4 generations the same shape appears one square further along, so the pattern moves while every cell stays where it is.",
        "Question 2: alignment makes them fly the same way; with it at 0 the Alignment reading falls to about 0.4. Cohesion keeps them in groups; with it at 0 they still fly the same way but split into many small, loose groups. With Separation at 0 they crowd into tight clumps.",
        "Question 3: examples include ant trails (follow scent and lay more of it), traffic jams (keep a gap and brake when the car ahead brakes), fish schools and crowds leaving a stadium.",
        "Question 4: Life can imitate any computer, so asking whether a pattern ever dies out is as hard as the halting problem. In general the only way to find out is to run it."
      ]
    }
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
    ],
    challenges: [
      { id: "herd", goal: "Vaccinate above the herd-immunity threshold and run an outbreak that ends with fewer than 20 new cases.", hint: "Compare Vaccinated before the outbreak with the Herd-immunity threshold reading." },
      { id: "flatten", goal: "With R0 at 3.0 or more and nobody vaccinated, use Social distancing to keep the peak below 60 infected at once, with at least 20 cases.", hint: "Try a high share staying put, and run a few outbreaks." },
      { id: "measles", goal: "Stop a measles outbreak: with R0 at 15 or more, finish an outbreak with fewer than 10 new cases.", hint: "The threshold is 93%. Try 90%, then 95%." }
    ],
    teach: {
      level: "Ages 14–18",
      minutes: 45,
      objectives: [
        "Students can explain what R0 means and how it controls whether an outbreak grows.",
        "Students can calculate the herd-immunity threshold 1 − 1/R0 and test it in the simulation.",
        "Students can explain how social distancing lowers and delays the peak of an outbreak.",
        "Students can compare a simulation of individuals with the SIR equations."
      ],
      plan: [
        { min: 5, what: "Predictions: students answer the worksheet predictions on their own." },
        { min: 5, what: "Demonstration: run the default outbreak. Point out the four colours, the chart, the dashed SIR curves and the herd-immunity gauge." },
        { min: 12, what: "Activity 1 in pairs: find the herd-immunity threshold for early COVID-19." },
        { min: 10, what: "Activity 2: flatten the curve with social distancing." },
        { min: 8, what: "Discussion: measles, vaccine coverage and why a lower peak matters for hospitals." },
        { min: 5, what: "Wrap-up: questions and the quiz on the page." }
      ],
      vocabulary: [
        { term: "SIR model", def: "A model that sorts people into Susceptible, Infected and Recovered groups and tracks how many move between them." },
        { term: "R0 (basic reproduction number)", def: "The average number of people one case infects in a population where nobody is immune." },
        { term: "Herd immunity", def: "Protection of a whole population when so many are immune that each case infects fewer than one other on average." },
        { term: "Herd-immunity threshold", def: "The share of people who must be immune for herd immunity: 1 − 1/R0." },
        { term: "Peak", def: "The largest number of people infected at the same time." },
        { term: "Flattening the curve", def: "Slowing the spread so the peak is lower and later." }
      ],
      misconceptions: [
        "Herd immunity needs everyone to be vaccinated. It needs only the threshold share, 1 − 1/R0, which is lower for less contagious diseases.",
        "An outbreak stops because everyone has caught it. It stops when cases meet too few susceptible people, so many are never infected.",
        "Above the threshold there are no cases at all. Small clusters still happen; they just die out instead of growing.",
        "Flattening the curve only delays the same number of cases. Lowering the spread also lowers the total number infected."
      ],
      predictions: [
        "Measles has an R0 around 15. What share of people do you think must be vaccinated to stop it spreading?",
        "When an outbreak ends with no vaccine and no distancing, will everyone have caught it?"
      ],
      activities: [
        {
          title: "Finding the threshold",
          steps: [
            "Press Early COVID-19 (R0 2.5) and read the Herd-immunity threshold.",
            "Set Vaccinated before the outbreak to 20 points below the threshold. Wait for the outbreak to end and record Peak infected and Recovered.",
            "Repeat at 10 points below the threshold, at the threshold and 10 points above, pressing New outbreak each time.",
            "Run each setting a second time. Are the results the same? Why not?"
          ],
          table: { columns: ["Vaccinated (%)", "Herd-immunity threshold (%)", "Peak infected", "Recovered at the end"], rows: 6 }
        },
        {
          title: "Flattening the curve",
          steps: [
            "Set R0 to 3.0 and Vaccinated before the outbreak to 0%.",
            "For Social distancing values of 0%, 30%, 60% and 80%, wait for the outbreak to end each time.",
            "Record Peak infected, the day of the peak from the chart and Recovered at the end."
          ],
          table: { columns: ["Social distancing (%)", "Peak infected", "Day of the peak", "Recovered at the end"], rows: 5 }
        }
      ],
      questions: [
        "Use 1 − 1/R0 to calculate the threshold for a disease with R0 = 4. Check your answer with the experiment.",
        "Why did the outbreak end even though some people were never infected?",
        "How did social distancing change the peak and the length of the outbreak? Why does a lower peak matter for hospitals?",
        "The dashed SIR curves assume everyone mixes evenly and nobody stays put. Why might the dots differ from them?"
      ],
      answers: [
        "Prediction 1: about 1 − 1/15, which is roughly 93%. Measles is so contagious that almost everyone must be immune.",
        "Prediction 2: no. The outbreak burns out when each case meets too few susceptible people to replace itself, so some people are never infected.",
        "Question 1: 1 − 1/4 = 0.75, so 75%. Above it outbreaks fizzle out; below it they can take off.",
        "Question 2: once the susceptible share falls below 1/R0, each case infects fewer than one other on average, so the number of infected people shrinks to zero.",
        "Question 3: distancing lowers the peak and spreads the cases over a longer time, and usually lowers the total too. A lower peak keeps the number of people sick at once within what hospitals can treat.",
        "Question 4: people who stay put meet far fewer others than the equations assume, and with only 400 people chance plays a big part, especially early on. The equations describe an average, evenly mixed crowd."
      ]
    }
  }
});
