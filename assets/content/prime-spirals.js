(window.WONDERS = window.WONDERS || {}).content = Object.assign(window.WONDERS.content || {}, {
  "prime-spirals": {
    predict: {
      question: "Write 1, 2, 3, … in a square spiral and colour in the primes. What pattern do you expect?",
      options: [
        "No pattern: primes look like random static",
        "Rings: the primes collect on certain rings",
        "Diagonal lines: many primes line up along diagonals",
        "Only the centre: primes thin out so fast the edges are empty"
      ],
      answer: 2,
      reveal: "The primes crowd onto diagonal streaks. Each diagonal is a quadratic formula, and some quadratics avoid small factors so they hit primes far more often than average. Most people expect static, because primes feel random.",
      tryIt: "Look at the default spiral, then switch on \"Swap the primes for random odd numbers\" and see the long streaks disappear."
    },
    quiz: [
      {
        q: "Why do half of the diagonals in the square spiral never contain a prime (apart from 2)?",
        options: [
          "They hold only even numbers, because odd and even numbers alternate like a chessboard",
          "They hold only perfect squares",
          "The spiral skips those cells",
          "Primes are too big to fit there"
        ],
        answer: 0,
        why: "Neighbouring cells differ in parity, so diagonals are all odd or all even. Even numbers above 2 are never prime."
      },
      {
        q: "Euler's n² + n + 41 is prime for n = 0 to 39. What happens at n = 40?",
        options: [
          "It gives the 41st prime in a row",
          "It gives 1681 = 41 × 41, which is not prime",
          "It gives an even number",
          "Nobody knows yet"
        ],
        answer: 1,
        why: "40² + 40 + 41 = 41². No polynomial with whole-number coefficients can be prime for every n, and the run has to break somewhere."
      },
      {
        q: "Is it proved that n² + 1 is prime for infinitely many n?",
        options: [
          "Yes, Euler proved it in 1772",
          "Yes, it follows from the prime number theorem",
          "No, it is an open problem that Landau listed in 1912",
          "No, it has been shown to be false"
        ],
        answer: 2,
        why: "The Hardy–Littlewood conjecture F predicts how often it happens, and computers agree, but there is no proof for any quadratic at all."
      }
    ],
    related: [
      { slug: "benford", why: "Another hidden regularity in numbers that should look random." },
      { slug: "infinity", why: "Euclid proved there are infinitely many primes; Cantor showed how to count infinities." },
      { slug: "emergence", why: "A one-line rule that produces structure nobody wrote in." }
    ],
    challenges: [
      {
        id: "euler-line",
        goal: "Line up Euler's formula: set Start at to 41 and highlight Euler: n² + n + 41 in the square spiral.",
        hint: "Then click along the amber diagonal: the first 40 values are all prime."
      },
      {
        id: "rich-diagonal",
        goal: "Trace a diagonal where at least 40% of the values shown are prime (with at least 20 values).",
        hint: "Click a cell on a long, bright streak, then press Trace. At the default size, look for streaks that run far from the centre."
      },
      {
        id: "big-gap",
        goal: "Find a gap of at least 100 between neighbouring primes, shown in the Longest gap readout.",
        hint: "Gaps grow slowly, roughly like (ln n)². Try Start at values above 300,000 with a large spiral."
      }
    ],
    teach: {
      level: "Ages 14–18",
      minutes: 45,
      objectives: [
        "Students can explain what a prime number is and factor a number into primes.",
        "Students can describe the Ulam spiral and explain why half of its diagonals hold no primes.",
        "Students can show that a diagonal of the spiral follows a quadratic formula and test how often its values are prime.",
        "Students can tell apart a proven result (the prime number theorem) from an open conjecture (Hardy–Littlewood)."
      ],
      plan: [
        { min: 5, what: "Predict: students sketch what they expect a spiral of numbers with the primes coloured in to look like." },
        { min: 8, what: "Build a small spiral by hand from 1 to 49 on squared paper and shade the primes. Compare with the 11 × 11 view on the page." },
        { min: 10, what: "Activity 1: parity and the fair test. Find the empty diagonals and turn the random comparison on and off." },
        { min: 12, what: "Activity 2: trace diagonals. Record formulas and prime shares; try Euler's polynomial starting at 41." },
        { min: 6, what: "Discuss the chart: how many primes are there up to N, and how good is N / ln N?" },
        { min: 4, what: "Wrap-up: what is proved and what is still conjecture? Quiz on the page." }
      ],
      vocabulary: [
        { term: "Prime number", def: "A whole number above 1 whose only divisors are 1 and itself, such as 2, 3, 5, 7 and 11." },
        { term: "Prime factorisation", def: "Writing a number as a product of primes, such as 84 = 2² × 3 × 7. Every number above 1 has exactly one." },
        { term: "Quadratic", def: "A formula of the form an² + bn + c, whose graph is a parabola. Every diagonal of the spiral is one." },
        { term: "Prime gap", def: "The difference between one prime and the next, such as 8 between 89 and 97." },
        { term: "Conjecture", def: "A statement that mathematicians believe and have tested, but have not proved." },
        { term: "Prime number theorem", def: "The proved fact that, near a large number N, roughly one number in ln N is prime." }
      ],
      misconceptions: [
        "\"Primes are random.\" Primes are completely determined; they only look random in some ways, and they avoid patterns forced by small factors.",
        "\"A formula that gives primes many times in a row always gives primes.\" Euler's n² + n + 41 fails at n = 40, and no polynomial is prime for every n.",
        "\"The lines prove something about primes.\" The picture suggests patterns; the explanation for prime-rich lines is still a conjecture.",
        "\"Primes run out eventually.\" Euclid proved there are infinitely many; they only become rarer, about one in ln N near N."
      ],
      predictions: [
        "If you colour the primes in a spiral of numbers, will you see a pattern? Sketch your guess.",
        "Out of the first 40,000 numbers, roughly what fraction do you think are prime?",
        "Can a simple formula like n² + n + 41 give a prime every single time? Why or why not?"
      ],
      activities: [
        {
          title: "Activity 1: Lines and the fair test",
          steps: [
            "Set Size to 11 × 11. Find 2, 3, 5 and 7 and check they are lit. Click 9, 15 and 21 and write down their factorisations.",
            "Look along the diagonals. Find a diagonal with no lit cells at all. Click three of its numbers. What do they have in common?",
            "Set Size back to 201 × 201. Switch on \"Swap the primes for random odd numbers\" and describe what changes. Switch it off again.",
            "Switch the Spiral to Sacks. Find the ray of perfect squares and describe the shapes the primes make."
          ],
          table: { columns: ["Size", "Primes shown", "Share of numbers that are prime", "Longest gap"], rows: 5 }
        },
        {
          title: "Activity 2: The formulas behind the diagonals",
          steps: [
            "Click a number on a bright diagonal streak and press \"Trace the diagonal through the selected number\".",
            "Copy the formula from the Highlighted readout and the number of values that are prime. Repeat for four different streaks, including a dim one.",
            "Set Start at to 41 and choose Euler: n² + n + 41 under Highlight. Click along the amber line and check the first values are prime.",
            "Choose Always even: n² + n + 2. Explain why none of its values above 2 can be prime."
          ],
          table: { columns: ["Formula", "Values shown", "Values prime", "Percent prime", "× random"], rows: 6 }
        }
      ],
      questions: [
        "Why do half of the diagonals in the square spiral contain no primes at all (apart from 2)?",
        "Calculate 40² + 40 + 41. Is it prime? What does this tell you about prime-generating formulas?",
        "The chart compares the number of primes up to N with N / ln N. Is the estimate too high or too low, and by roughly how much?",
        "What is the difference between the prime number theorem and the Hardy–Littlewood conjecture F?"
      ],
      answers: [
        "Prediction 1: Most students expect random static. The spiral shows clear diagonal streaks, but within a streak the primes still look irregular.",
        "Prediction 2: About 10%. Between 1 and 40,401 there are 4,236 primes, roughly one number in ln 40,000 ≈ 10.6.",
        "Prediction 3: No. Euler's formula gives primes for n = 0 to 39 but 1,681 = 41² at n = 40. A non-constant polynomial with whole-number coefficients can never be prime for every n.",
        "Question 1: Moving one cell sideways changes a number by an odd amount, so the cells form a chessboard of odd and even numbers and each diagonal is all odd or all even. Even numbers above 2 are divisible by 2.",
        "Question 2: 1,600 + 40 + 41 = 1,681 = 41 × 41, which is not prime. A formula that works many times in a row can still fail; patterns need proof.",
        "Question 3: Too low. Near 40,000, N / ln N is about 10% below the true count; the li(N) curve is much closer. The ratio slowly approaches 1 as N grows, which is what the prime number theorem says.",
        "Question 4: The prime number theorem (1896) is proved and says how many primes there are overall. Conjecture F (1923) predicts how many values of a quadratic like n² + 1 are prime; it matches every computer test but no one has proved it."
      ]
    }
  }
});
