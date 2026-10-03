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
    related: [
      { slug: "evolution", why: "Multiplicative growth spreads values across many scales." },
      { slug: "epidemics", why: "Exponential growth, the engine behind Benford's pattern." },
      { slug: "birthday-paradox", why: "Counting carefully overturns the 'everything equally likely' guess." }
    ]
  }
});
