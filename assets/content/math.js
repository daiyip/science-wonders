(window.WONDERS = window.WONDERS || {}).content = Object.assign(window.WONDERS.content || {}, {
  "monty-hall": {
    predict: {
      question: "You pick one of three doors. The host, who knows where the car is, opens a goat door. Should you switch?",
      options: [
        "It makes no difference: two doors left, so 50/50",
        "Yes: switching wins 2 times out of 3",
        "No: staying wins 2 times out of 3",
        "Yes, but switching only wins slightly more often"
      ],
      answer: 1,
      reveal: "Your first pick is right only 1 time in 3, and switching wins every time that first pick was wrong, so it wins 2 times in 3. Most people see two closed doors and assume a coin toss, but the host's choice was forced to avoid the car.",
      tryIt: "Press \"Simulate 1,000 games\" and watch the switch line settle near 2/3 while the stay line settles near 1/3."
    },
    quiz: [
      {
        q: "With the \"Number of doors\" slider at 100, the host opens 98 goat doors. How often does switching win?",
        options: ["1 time in 2", "99 times in 100", "2 times in 3", "1 time in 100"],
        answer: 1,
        why: "Your first pick is right only 1 time in 100, and switching wins in all the other 99 cases."
      },
      {
        q: "When the host is set to \"Opens at random\" and happens to reveal only goats, what are the odds?",
        options: ["Staying and switching are both 50/50", "Switching still wins 2 times in 3", "Staying wins 2 times in 3"],
        answer: 0,
        why: "A random host's choice carries no information about where the car is, so once the car survives by luck, both remaining doors are equally likely."
      },
      {
        q: "Why does the host's choice raise the other door's chance but not yours?",
        options: [
          "Because the host prefers to open doors with lower numbers",
          "Because the car is moved after you pick",
          "Because the host had to avoid both your door and the car, so only the door he skipped carries information"
        ],
        answer: 2,
        why: "He never opens your door, so his move tells you nothing new about it, but skipping a door might mean he was forced to, which favours that door."
      }
    ],
    challenges: [
      {
        "id": "switch-win",
        "goal": "Win the car by pressing Switch in a game you play yourself.",
        "hint": "Pick any door, then switch to the door the host left closed."
      },
      {
        "id": "fair-test",
        "goal": "With the host on Knows, play at least 5 games staying and 5 switching, and finish with switching ahead on win rate.",
        "hint": "Your tally keeps both strategies. Reset my tally starts over if luck goes against you."
      },
      {
        "id": "random-host",
        "goal": "Set the host to Opens at random and finish a 1,000-game simulation with stay and switch both between 45% and 55%.",
        "hint": "With 3 doors about two thirds of the games count, which is plenty."
      }
    ],
    teach: {
      "level": "Ages 14–18",
      "minutes": 45,
      "objectives": [
        "Students can explain why sticking with the first pick wins only 1 time in 3 and switching wins 2 times in 3.",
        "Students can use a simulation to estimate a probability and explain why more trials give a more reliable estimate.",
        "Students can explain how the host's knowledge changes the answer, by comparing a knowing host with a random one.",
        "Students can use conditional probability (Bayes' rule) to update a probability after new evidence."
      ],
      "plan": [
        {
          "min": 5,
          "what": "Prediction: read the puzzle aloud and take a class vote on stay, switch, or no difference. Write the vote on the board."
        },
        {
          "min": 10,
          "what": "Activity 1 in pairs: play 20 games on the doors, 10 staying and 10 switching. Combine the class totals."
        },
        {
          "min": 10,
          "what": "Activity 2: press Simulate 1,000 games, then try 4, 10 and 100 doors. Discuss why switching gets better with more doors."
        },
        {
          "min": 10,
          "what": "Activity 3: set the host to Opens at random and compare. Work through the Bayes calculation on the page together."
        },
        {
          "min": 10,
          "what": "Wrap-up: questions and the quiz. Each student writes one sentence for a friend who still thinks it is 50/50."
        }
      ],
      "vocabulary": [
        {
          "term": "Probability",
          "def": "How likely an event is, from 0 (impossible) to 1 (certain), often written as a fraction or a percentage."
        },
        {
          "term": "Conditional probability",
          "def": "The probability of an event once you know something else has happened, written P(A | B)."
        },
        {
          "term": "Simulation",
          "def": "Using a computer to repeat a random experiment many times so the results can be counted."
        },
        {
          "term": "Bayes' rule",
          "def": "A way to update a probability when new evidence arrives, by weighing how well each possibility explains the evidence."
        },
        {
          "term": "Law of large numbers",
          "def": "As the number of trials grows, the measured share of an outcome settles close to its true probability."
        }
      ],
      "misconceptions": [
        "Two closed doors left means a 50/50 chance. This ignores that the host's choice was forced by where the car is.",
        "Opening a goat door raises the chance of my door too. The host can always find a goat to open, so his move tells you nothing new about your door.",
        "A few games prove the answer. Ten games can easily look 50/50 by luck; the pattern only shows over many games.",
        "The host's knowledge doesn't matter. With a host who opens doors at random and happens to miss the car, it really is 50/50."
      ],
      "predictions": [
        "Out of 30 games where you always switch, how many do you expect to win? Explain your reasoning.",
        "With 100 doors, you pick one and the host opens 98 goat doors. Would you switch? Why?",
        "Does it matter whether the host knows where the car is? Predict the win rates for staying and switching with a host who opens doors at random."
      ],
      "activities": [
        {
          "title": "Play it yourself",
          "steps": [
            "Keep Number of doors at 3 and the host on Knows.",
            "Play 10 games: pick a door, then always press Stay. Press Play again after each game.",
            "Play 10 more games, this time always pressing Switch.",
            "Read Won by staying and Won by switching under the doors and record them.",
            "Add your results to the class totals on the board."
          ],
          "table": {
            "columns": [
              "Strategy",
              "Games played",
              "Games won",
              "Win rate (%)"
            ],
            "rows": 4
          }
        },
        {
          "title": "Simulate many games",
          "steps": [
            "Press Simulate 1,000 games and watch the two lines on the chart.",
            "Record Simulated stay wins and Simulated switch wins.",
            "Move the Number of doors slider to 4, 10 and 100. A new simulation starts each time; record its results.",
            "Compare each result with the theory value printed next to the lines."
          ],
          "table": {
            "columns": [
              "Number of doors",
              "Simulated stay wins (%)",
              "Simulated switch wins (%)",
              "Theory for switching"
            ],
            "rows": 5
          }
        },
        {
          "title": "A host who doesn't know",
          "steps": [
            "Set Number of doors back to 3 and press Opens at random.",
            "Press Simulate 1,000 games. Record how many games counted and both win rates.",
            "Play a few games yourself and note what happens when the host reveals the car.",
            "Compare with your results from the previous activity."
          ],
          "table": {
            "columns": [
              "Host",
              "Games counted",
              "Stay wins (%)",
              "Switch wins (%)"
            ],
            "rows": 3
          }
        }
      ],
      "questions": [
        "Explain in your own words why switching wins 2 times out of 3 when the host knows where the car is.",
        "Why does the simulation need hundreds of games before the lines settle, when your own 10 games might look very different?",
        "With a random host, games where the car is revealed are thrown out. Why does this make staying and switching equally good?",
        "Write the general rule: with n doors and a knowing host, how often does switching win?"
      ],
      "answers": [
        "Prediction 1: about 20 wins, because switching wins 2 times in 3. Real results vary, often anywhere from about 15 to 25.",
        "Prediction 2: yes. Your first pick is right only 1 time in 100, and the one door the host skips almost always hides the car, so switching wins 99 times in 100.",
        "Prediction 3: yes. A random host who happens to show only goats gives no information, so the two closed doors are 50/50.",
        "Question 1: your first pick is right 1 time in 3. When it is wrong (2 times in 3), the host must leave the car closed, so switching wins exactly in those games.",
        "Question 2: random variation. The typical scatter after N games is the square root of p(1 − p)/N: about 15 percentage points after 10 games but only about 1.5 points after 1,000.",
        "Question 3: the car survives a random opening only when it is behind your door or the door left closed, and those two cases are equally likely (1/n each), so each strategy wins half of the counted games.",
        "Question 4: switching wins (n − 1)/n of the time and staying wins 1/n."
      ]
    },
    related: [
      { slug: "birthday-paradox", why: "Another probability result that intuition gets badly wrong." },
      { slug: "quantum-eraser", why: "What you learn later changes how you read earlier results." },
      { slug: "benford", why: "Counting outcomes beats trusting the 'obvious' even split." }
    ]
  },

  "infinity": {
    predict: {
      question: "Hilbert's hotel has infinitely many rooms, all full. Infinitely many buses arrive, each with infinitely many guests. Can everyone get a room?",
      options: [
        "No, a full hotel cannot take anyone",
        "Only one extra guest can fit",
        "One bus can fit, but not infinitely many buses",
        "Yes, every guest gets a room"
      ],
      answer: 3,
      reveal: "By moving every guest with a clear rule, such as the diagonal zigzag, all buses fit with no one turned away, because a grid of (bus, seat) can be listed like the counting numbers. Most people think infinitely many buses must be 'too many', but countable infinity times countable infinity is still countable.",
      tryIt: "Under \"Arrivals\", press \"Infinitely many buses\" and check that \"Guests turned away\" stays at 0."
    },
    quiz: [
      {
        q: "When \"1 new guest\" arrives, which rule frees room 1?",
        options: ["Every guest moves from room n to room 2n", "Every guest moves from room n to room n + 1", "The guest in room 1 leaves the hotel"],
        answer: 1,
        why: "Shifting everyone up by one gives each current guest a new room and leaves room 1 empty."
      },
      {
        q: "In Cantor's diagonal argument, why can the new string never be on the list?",
        options: [
          "It differs from row k in its k-th digit, for every k",
          "It is longer than every string on the list",
          "It uses digits that never appear in the list",
          "It is chosen at random, so it is unlikely to match"
        ],
        answer: 0,
        why: "Changing the k-th digit of row k guarantees the new string disagrees with every row somewhere."
      },
      {
        q: "What happens when you press \"Add the new string to the top\"?",
        options: [
          "The list is finally complete",
          "The diagonal runs again and produces another string that is not on the list",
          "The new string turns out to be a repeat of row 1"
        ],
        answer: 1,
        why: "Any list, however patched, has its own diagonal escapee, which is why the real numbers are uncountable."
      }
    ],
    challenges: [
      {
        "id": "prime",
        "goal": "Choose Prime powers, then fit Infinitely many buses into the hotel.",
        "hint": "Afterwards, look for rooms that stay empty, such as room 6."
      },
      {
        "id": "dodge",
        "goal": "Change a diagonal digit the new string has already used, and watch the new string change with it.",
        "hint": "Press Pause, then click an amber diagonal digit, or Tab to the grid and use the arrow keys and Enter."
      },
      {
        "id": "three-escapees",
        "goal": "Press Add the new string to the top three times, finding another missing string each time.",
        "hint": "Each time, the new string becomes row 1 and the diagonal builds another one."
      }
    ],
    teach: {
      "level": "Ages 14–18",
      "minutes": 45,
      "objectives": [
        "Students can explain what it means for two sets to have the same size, using one-to-one pairing.",
        "Students can describe room-change rules that fit 1 new guest, one bus, and infinitely many buses into a full Hilbert's hotel.",
        "Students can follow Cantor's diagonal argument and explain why no list can contain every infinite string of digits.",
        "Students can tell countable sets (whole numbers, fractions) from uncountable ones (real numbers)."
      ],
      "plan": [
        {
          "min": 5,
          "what": "Prediction: ask whether a full hotel with infinitely many rooms can take one more guest, then infinitely many buses. Take a quick vote."
        },
        {
          "min": 10,
          "what": "Introduce one-to-one pairing with a finite example (chairs and students), then Activity 1: the three kinds of arrivals in Hilbert's hotel."
        },
        {
          "min": 8,
          "what": "Compare Diagonal zigzag with Prime powers, and use the Same size or bigger? table to connect the zigzag to listing every fraction."
        },
        {
          "min": 12,
          "what": "Activities 2 and 3: Cantor's diagonal argument in binary, step by step, then try to patch the list."
        },
        {
          "min": 10,
          "what": "Wrap-up: questions and the quiz. Each student explains in one sentence why the real numbers cannot be listed."
        }
      ],
      "vocabulary": [
        {
          "term": "One-to-one pairing",
          "def": "Matching the members of two sets so that each member of one has exactly one partner in the other, with none left over."
        },
        {
          "term": "Countable",
          "def": "A set whose members can be put in a list: first, second, third, and so on. Whole numbers, integers and fractions are countable."
        },
        {
          "term": "Uncountable",
          "def": "An infinite set too big to be put in any list, like the real numbers."
        },
        {
          "term": "ℵ₀ (aleph-null)",
          "def": "The size of the set of counting numbers, the smallest infinity."
        },
        {
          "term": "Diagonal argument",
          "def": "Cantor's method of building a string that differs from the k-th string on a list in its k-th digit, so it cannot be on the list."
        },
        {
          "term": "Prime power",
          "def": "A prime multiplied by itself some number of times, such as 2, 4, 8 or 3, 9, 27."
        }
      ],
      "misconceptions": [
        "All infinities are the same size. Cantor showed the real numbers form a strictly bigger infinity than the counting numbers.",
        "A full hotel cannot take anyone, because infinity plus one is more than infinity. For infinite sets, adding one, or even infinitely many, need not change the size.",
        "Adding the missing string to the list makes the list complete. The new list has its own diagonal string that is missing from it.",
        "Infinity is just a very big number. It is not a number you reach by counting; it describes the size of a collection that never ends."
      ],
      "predictions": [
        "A hotel with infinitely many rooms is full. One new guest arrives. Can the guest get a room without anyone leaving? How?",
        "Infinitely many buses arrive, each with infinitely many passengers. Do you think they can all fit?",
        "Are there more fractions than whole numbers? Are there more decimal numbers between 0 and 1 than whole numbers?"
      ],
      "activities": [
        {
          "title": "Make room in Hilbert's hotel",
          "steps": [
            "Press Start over with a full hotel.",
            "Press 1 new guest. Write down the Rule and which room the new guest takes.",
            "Press A bus of infinitely many guests. Record the rule and which rooms the old guests and the passengers end up in.",
            "Press Infinitely many buses with Diagonal zigzag selected. Then press Start over with a full hotel and repeat with Prime powers.",
            "Each time, read Guests turned away and Empty rooms."
          ],
          "table": {
            "columns": [
              "Arrivals",
              "Rule",
              "Guests turned away",
              "Empty rooms"
            ],
            "rows": 4
          }
        },
        {
          "title": "Build a missing string",
          "steps": [
            "In Part 2, choose Binary 0 / 1, press Restart, then press Pause.",
            "Press Next digit eight times. Each time, record digit k of row k and the digit the new string gets.",
            "Change a digit on the diagonal: click it, or Tab to the grid and use the arrow keys and Enter. What happens to the new string?",
            "Change a digit that is not on the diagonal. Does the new string change?"
          ],
          "table": {
            "columns": [
              "Row k",
              "Digit k of row k",
              "Digit k of the new string"
            ],
            "rows": 8
          }
        },
        {
          "title": "Try to patch the list",
          "steps": [
            "Press Add the new string to the top. The list shifts down and the diagonal runs again.",
            "Read New string starts and compare it with the new row 1.",
            "Repeat twice more, recording the start of each new string.",
            "Switch to Decimal 0.d₁d₂… and repeat once. Note how the page changes decimal digits."
          ],
          "table": {
            "columns": [
              "Times added",
              "New string starts",
              "Is it on the list?"
            ],
            "rows": 4
          }
        }
      ],
      "questions": [
        "Explain why the rule room n → room 2n leaves every odd-numbered room free.",
        "Why must every guest be able to work out their new room from a formula, without waiting for anyone else to move?",
        "Explain why the new string in Cantor's argument cannot be row 37 of the list.",
        "Prime powers leave infinitely many rooms empty. Why is that still a valid way to fit everyone in?"
      ],
      "answers": [
        "Prediction 1: yes. Everyone moves from room n to room n + 1, which frees room 1.",
        "Prediction 2: yes. The zigzag lists every (bus, seat) pair, so infinitely many buses of infinitely many guests can still be listed and given rooms.",
        "Prediction 3: fractions, no: zigzagging through the grid of p/q lists them all, so there are just as many as whole numbers. Decimals between 0 and 1, yes: the diagonal argument shows they cannot be listed.",
        "Question 1: 2n is always even, so the odd rooms are left for the passengers, and no two guests collide because different n give different 2n.",
        "Question 2: in an infinite hotel there is no last guest to wait for. A formula lets every guest move at the same time.",
        "Question 3: the new string's 37th digit was chosen to differ from the 37th digit of row 37, so the two strings differ in at least that place.",
        "Question 4: the hotel only needs each guest to have their own room. Every number factors into primes in only one way, so no two guests are sent to the same room; empty rooms are allowed."
      ]
    },
    related: [
      { slug: "benford", why: "Number patterns that seem impossible until you count carefully." },
      { slug: "expanding-universe", why: "A universe that may be infinite yet still grows." },
      { slug: "chaos", why: "Infinitely fine detail: tiny digit changes, huge consequences." }
    ]
  },

  "birthday-paradox": {
    predict: {
      question: "How many people must be in a room before there is better than a 50% chance two share a birthday?",
      options: ["23", "183", "365", "57"],
      answer: 0,
      reveal: "With 23 people there are 253 pairs, and the chance of at least one match reaches 50.7%. Most people guess around 180 because they picture someone matching their own birthday, not any pair matching.",
      tryIt: "Set the \"People in the room\" slider to 23 and read \"Chance of a shared birthday\", then press \"Run 1,000 rooms\" to check it."
    },
    quiz: [
      {
        q: "With 23 people, how many pairs can be compared?",
        options: ["23", "46", "253", "529"],
        answer: 2,
        why: "Each of 23 people pairs with 22 others, and dividing by 2 avoids counting each pair twice: 23 x 22 / 2 = 253."
      },
      {
        q: "In a room of 23, what is the chance that someone shares YOUR birthday?",
        options: ["About 6%", "About 50%", "About 23%"],
        answer: 0,
        why: "Only your 22 pairings count, giving 1 - (364/365)^22, roughly 5.9%."
      },
      {
        q: "Why does the chance of a match climb so fast as people are added?",
        options: [
          "Birthdays cluster in certain months",
          "Each new person adds a fixed 1/365 to the chance",
          "Later people are more likely to share a birthday",
          "The number of pairs grows roughly with the square of the number of people"
        ],
        answer: 3,
        why: "Each new person can match everyone already there, so pairs, and chances for a match, pile up quickly."
      }
    ],
    challenges: [
      {
        "id": "early-match",
        "goal": "Press Add people until a match and have it stop at 20 people or fewer.",
        "hint": "There is about a 41% chance each time, so try a few times."
      },
      {
        "id": "lucky-40",
        "goal": "Get a room of 40 or more people with no shared birthday.",
        "hint": "Set People in the room to 40 and press New room until no dots are amber. About 1 room in 9 works."
      },
      {
        "id": "close-sim",
        "goal": "Simulate at least 5,000 rooms and, with 23 people in the room, get the simulated rate within 1 point of the exact 50.7%.",
        "hint": "Press Run 1,000 rooms several times, then read Simulated rooms with a match."
      }
    ],
    teach: {
      "level": "Ages 14–18",
      "minutes": 45,
      "objectives": [
        "Students can count the pairs in a group of n people using n(n − 1)/2.",
        "Students can explain why only 23 people give a better than even chance of a shared birthday.",
        "Students can calculate the chance of no match as a product of fractions and use the complement to find the chance of a match.",
        "Students can compare results from a simulation with an exact probability."
      ],
      "plan": [
        {
          "min": 5,
          "what": "Prediction: ask how many people are needed for a 50% chance that two share a birthday, and record guesses. With 23 or more students, check the class for a match."
        },
        {
          "min": 10,
          "what": "Activity 1 in pairs: use Add people until a match ten times and record when the first match appears. Pool the class data."
        },
        {
          "min": 10,
          "what": "Activity 2: count pairs with Draw a line for every pair and read the exact chance at several room sizes."
        },
        {
          "min": 10,
          "what": "Activity 3: run simulations, compare the amber line with the white curve, and build the formula for the chance of no match."
        },
        {
          "min": 10,
          "what": "Wrap-up: the difference between matching your birthday and any pair matching, then the questions and the quiz."
        }
      ],
      "vocabulary": [
        {
          "term": "Pair",
          "def": "Two people from the group. A group of n people has n(n − 1)/2 different pairs."
        },
        {
          "term": "Complement",
          "def": "The event that something does not happen. P(at least one match) = 1 − P(no match)."
        },
        {
          "term": "Independent events",
          "def": "Events where the result of one does not affect the other, like two strangers' birthdays."
        },
        {
          "term": "Simulation",
          "def": "Using a computer to repeat a random experiment many times so the results can be counted."
        },
        {
          "term": "Pairs estimate",
          "def": "The shortcut 1 − e^(−pairs/365), which treats every pair as a separate 1 in 365 chance of a match."
        }
      ],
      "misconceptions": [
        "You need about half of 365 people, roughly 183, for an even chance. That mixes up any pair matching with matching one particular birthday.",
        "The question is whether someone shares my birthday. In a room of 23 that is only about 6%; the paradox is about any two people.",
        "Each new person adds a fixed 1/365 to the chance. Each new person can match everyone already there, so the chance climbs faster and faster at first.",
        "If a room of 23 has no match, the maths is wrong. A 50.7% chance means a match in only about half of such rooms."
      ],
      "predictions": [
        "How many people are needed for a better than 50% chance that two of them share a birthday?",
        "In a room of 23 people, what is the chance that someone shares your own birthday?",
        "How many different pairs of people are there in a class of 30?"
      ],
      "activities": [
        {
          "title": "Fill the room",
          "steps": [
            "Press Add people until a match. People arrive one at a time until two share a birthday.",
            "Record the number of people shown in the centre of the ring when it stops.",
            "Repeat ten times.",
            "Find the median of your ten results and compare it with 23."
          ],
          "table": {
            "columns": [
              "Trial",
              "People when the first match appeared"
            ],
            "rows": 10
          }
        },
        {
          "title": "Count the pairs",
          "steps": [
            "Turn on Draw a line for every pair.",
            "Set People in the room to 5, 10, 23, 40 and 70 in turn.",
            "Each time, record Pairs to compare and Chance of a shared birthday.",
            "Check the number of pairs with the formula n(n − 1)/2."
          ],
          "table": {
            "columns": [
              "People",
              "Pairs to compare",
              "Chance of a shared birthday"
            ],
            "rows": 5
          }
        },
        {
          "title": "Theory against simulation",
          "steps": [
            "Press Clear, then Run 1,000 rooms.",
            "Set People in the room to 10, 23 and 50 and record Simulated rooms with a match beside the exact chance.",
            "Press Run 1,000 rooms four more times and record the values at 23 people again.",
            "Describe how the amber line moves compared with the white curve as more rooms are simulated."
          ],
          "table": {
            "columns": [
              "People",
              "Rooms simulated",
              "Simulated rooms with a match",
              "Chance of a shared birthday"
            ],
            "rows": 5
          }
        }
      ],
      "questions": [
        "Explain why the chance of no match among 3 people is (365/365) × (364/365) × (363/365).",
        "Why does the number of pairs grow much faster than the number of people?",
        "Use the page to find the smallest room with a better than 90% chance of a match.",
        "Real birthdays are not spread perfectly evenly through the year. Does that make a match more or less likely? Why?"
      ],
      "answers": [
        "Prediction 1: 23 people give a 50.7% chance. Most students guess much higher, often around 180.",
        "Prediction 2: about 5.9%, from 1 − (364/365)^22. You would need 253 other people to reach 50%.",
        "Prediction 3: 30 × 29 / 2 = 435 pairs. A class of 30 has about a 70.6% chance of a shared birthday.",
        "Question 1: the first person can have any birthday, the second must avoid 1 day (364 of 365), the third must avoid 2 days (363 of 365). Multiplying gives the chance that all three differ.",
        "Question 2: each new person pairs with everyone already in the room, so the pairs grow roughly with the square of the number of people: n(n − 1)/2.",
        "Question 3: 41 people, at about 90.3% (40 people give 89.1%).",
        "Question 4: more likely. The chance of no match is largest when every day is equally likely, so any clustering of birthdays raises the chance of a match slightly."
      ]
    },
    related: [
      { slug: "monty-hall", why: "Another probability puzzle where intuition fails badly." },
      { slug: "epidemics", why: "Contacts between pairs drive how quickly things spread." },
      { slug: "entropy", why: "Counting arrangements explains which outcomes become likely." }
    ]
  },

  "benford": {
    predict: {
      question: "Towns start at the same size and grow randomly for many generations. Afterwards, what share of populations start with the digit 1?",
      options: ["About 11%, one in nine", "About 30%", "About 50%", "About 20%"],
      answer: 1,
      reveal: "Benford's law predicts the digit 1 leads about 30.1% of the time and 9 only about 4.6%. Most people expect each digit to lead one time in nine, which is what you get only for data like the uniform control.",
      tryIt: "Keep \"Data\" on \"Growing populations (random growth)\", turn on \"Show Benford's share\", and let the towns finish growing, then compare the first bar with its white mark."
    },
    quiz: [
      {
        q: "Why does the uniform control (1 to 9,999) give every digit about 11%?",
        options: [
          "It spans too few numbers",
          "It is spread evenly on an ordinary scale, not on a log scale",
          "Random numbers can never follow Benford's law"
        ],
        answer: 1,
        why: "Each leading digit covers the same count of numbers from 1 to 9,999, so all nine get a near equal share."
      },
      {
        q: "On the log strip folded into one decade, how much wider is the 1 band than the 9 band?",
        options: ["The same width", "About twice as wide", "About six and a half times wider"],
        answer: 2,
        why: "log10(2) is about 0.301 while log10(10/9) is about 0.046, a ratio of roughly 6.6."
      },
      {
        q: "What happens when you slide \"How many numbers\" down to 20?",
        options: [
          "The data stops following Benford's law entirely",
          "Every digit lands exactly on its Benford share",
          "The digit 9 starts to lead most often",
          "The bars wobble a lot, because the law is about proportions in large samples"
        ],
        answer: 3,
        why: "With few numbers, random chance pushes the shares well away from the long-run pattern."
      }
    ],
    challenges: [
      {
        "id": "uniform-fails",
        "goal": "Choose the uniform control under Data and count it until the verdict says it does not follow Benford.",
        "hint": "Every leading digit covers the same count of numbers from 1 to 9,999."
      },
      {
        "id": "sequence-close",
        "goal": "Find a famous sequence (powers of 2, Fibonacci or factorials) that reaches close conformity with at least 500 numbers.",
        "hint": "Pick one under Data and keep How many numbers at 500 or more."
      },
      {
        "id": "own-data",
        "goal": "Paste at least 50 numbers of your own and press Count my numbers.",
        "hint": "Try country populations, river lengths or the prices on a shopping receipt."
      }
    ],
    teach: {
      "level": "Ages 14–18",
      "minutes": 45,
      "objectives": [
        "Students can state Benford's law and the predicted shares for leading digits 1 and 9.",
        "Students can explain, using a log scale, why data that spreads over many powers of ten follows Benford's law.",
        "Students can tell data that should follow Benford's law (growth, many scales) from data that should not (uniform, narrow range).",
        "Students can judge how sample size affects how closely data matches a predicted distribution."
      ],
      "plan": [
        {
          "min": 5,
          "what": "Prediction: ask what share of town populations start with the digit 1. Record guesses; most students say about 11%."
        },
        {
          "min": 10,
          "what": "Activity 1: compare Growing populations with the uniform control and record the share for several leading digits."
        },
        {
          "min": 10,
          "what": "Activity 2: explore the famous sequences, change How many numbers, and measure the bands on the log strip."
        },
        {
          "min": 12,
          "what": "Activity 3: paste a real data set (prepared in advance or found by students) and judge whether it follows Benford's law."
        },
        {
          "min": 8,
          "what": "Wrap-up: fraud detection as an application, then the questions and the quiz."
        }
      ],
      "vocabulary": [
        {
          "term": "Leading digit",
          "def": "The first digit of a number that is not zero. The leading digit of 3,720 and of 0.0372 is 3."
        },
        {
          "term": "Benford's law",
          "def": "The rule that leading digit d appears with probability log₁₀(1 + 1/d), so 1 leads about 30.1% of the time and 9 about 4.6%."
        },
        {
          "term": "Logarithmic scale",
          "def": "A scale where each step multiplies by the same factor, so 1 to 10 takes the same space as 10 to 100."
        },
        {
          "term": "Uniform distribution",
          "def": "Data where every value in a range is equally likely."
        },
        {
          "term": "Mean absolute deviation",
          "def": "The average gap between the observed shares and Benford's shares. Smaller means a closer fit."
        },
        {
          "term": "Sample size",
          "def": "How many numbers are counted. Small samples wobble more by chance."
        }
      ],
      "misconceptions": [
        "Random numbers always have each leading digit about equally often. That is only true for data spread evenly on an ordinary scale, like the uniform control.",
        "Benford's law applies to all data. It needs data that spans several powers of ten; adult heights or dice rolls do not follow it.",
        "Data that breaks Benford's law must be faked. Small samples, narrow ranges and assigned numbers, like phone numbers, also break it.",
        "Benford's law depends on the units. Changing units, such as dollars to euros, multiplies every number by the same factor and keeps the pattern."
      ],
      "predictions": [
        "In a list of the populations of all the world's towns, what share do you think start with the digit 1?",
        "Will a list of random whole numbers from 1 to 9,999 follow the same pattern? Why or why not?",
        "Which start with 1 more often: powers of 2 (2, 4, 8, 16, …) or the whole numbers from 1 to 100?"
      ],
      "activities": [
        {
          "title": "Growth against uniform",
          "steps": [
            "Set Data to Growing populations (random growth) and wait until the growth reaches generation 60.",
            "Record the share above the bars for digits 1, 2, 5 and 9, and the Verdict.",
            "Set Data to Uniform random, 1 to 9,999 (control) and record the same values.",
            "Compare both with the white marks, which show Benford's share."
          ],
          "table": {
            "columns": [
              "Data",
              "Digit 1 (%)",
              "Digit 2 (%)",
              "Digit 5 (%)",
              "Digit 9 (%)",
              "Verdict"
            ],
            "rows": 3
          }
        },
        {
          "title": "Sequences and the log strip",
          "steps": [
            "Choose Powers of 2, Fibonacci and Factorials in turn, with How many numbers at 1,000.",
            "Record Start with 1, Mean abs. deviation and Verdict for each.",
            "For one sequence, slide How many numbers down to 20 and up to 3,000, and record how the verdict changes.",
            "On the strip under the bars, measure the widths of the 1 band and the 9 band with a ruler and find their ratio."
          ],
          "table": {
            "columns": [
              "Data",
              "How many numbers",
              "Start with 1",
              "Mean abs. deviation",
              "Verdict"
            ],
            "rows": 5
          }
        },
        {
          "title": "Test real data",
          "steps": [
            "Find a list of at least 50 real numbers, such as country populations, river lengths, house prices or the areas of lakes.",
            "Paste them into Paste your own numbers and press Count my numbers.",
            "Record Numbers counted, Spread, Start with 1 and Verdict.",
            "Decide whether your data should follow Benford's law, using the Spread reading to explain."
          ],
          "table": {
            "columns": [
              "Data set",
              "Numbers counted",
              "Spread",
              "Start with 1",
              "Verdict"
            ],
            "rows": 3
          }
        }
      ],
      "questions": [
        "Why does data that grows by multiplying, like populations or savings, end up following Benford's law?",
        "On the log strip, the 1 band is about 6.6 times wider than the 9 band. Explain why that matches the bar chart.",
        "Give an example of real data that should not follow Benford's law, and explain why.",
        "Tax investigators use Benford's law to flag suspicious accounts. Why might invented numbers fail the test?"
      ],
      "answers": [
        "Prediction 1: about 30%, as Benford's law predicts. Most people guess 11%.",
        "Prediction 2: no. Each leading digit covers the same count of numbers from 1 to 9,999, so each gets about 11%.",
        "Prediction 3: powers of 2. About 30% of them start with 1, while only 12 of the numbers from 1 to 100 do (1, 10 to 19, and 100).",
        "Question 1: multiplying by random factors spreads the numbers evenly on a log scale across many powers of ten, and on a log scale the stretch where 1 leads (1 to 2) is the widest.",
        "Question 2: the share of numbers starting with d equals the fraction of the strip covered by the d band, log₁₀(1 + 1/d): 30.1% for 1 and 4.6% for 9.",
        "Question 3: adult heights, test scores out of 100 or phone numbers. They cover a narrow range or are assigned rather than grown, so they do not spread over many powers of ten.",
        "Question 4: people making up numbers tend to spread first digits evenly or favour digits that feel random, so their data has too few 1s and too many large leading digits."
      ]
    },
    related: [
      { slug: "evolution", why: "Multiplicative growth spreads values across many scales." },
      { slug: "epidemics", why: "Exponential growth, the engine behind Benford's pattern." },
      { slug: "birthday-paradox", why: "Counting carefully overturns the 'everything equally likely' guess." }
    ]
  }
});
