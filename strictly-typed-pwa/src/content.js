/*
 * STRICTLY TYPED — content.
 *
 * Everything the player reads or assembles lives here. The browser does not
 * compile Ada; each level's output is authored alongside a snippet that is
 * hand-checked against Ada 2012. Puzzles use unique lines so there is exactly
 * one canonical order. tests/content.test.mjs enforces that.
 */

export const META = {
  name: "STRICTLY TYPED",
  subtitle: "Ada & the Last Compiler",
  tagline: "A tiny game about big promises.",
  description:
    "Learn Ada by repairing a dying universe. A funny, philosophical tap-to-code adventure: a 20-step campaign, five boss audits, and a secret ending.",
  version: "1.0.0",
  url: "https://lucagandolfi77.github.io/random2/strictly-typed-pwa/",
  totalNodes: 20,
  totalFragments: 20
};

export const RANKS = [
  { at: 0, name: "Uninitialized", note: "No value assigned. Full of potential. Slightly dangerous." },
  { at: 1, name: "Intern of the Void", note: "You have made something say hello." },
  { at: 2, name: "Junior Inspector", note: "You respect the range. The range respects you." },
  { at: 3, name: "Type Warden", note: "Boundaries are now a personality trait." },
  { at: 4, name: "Heap Hazmat", note: "You have smelled the garbage and returned." },
  { at: 5, name: "Root Auditor", note: "The Compiler knows your name. It is spelled correctly." },
  { at: 6, name: "Compiler Emeritus", note: "You have answered the last question. Nothing compiles without you." }
];

export const INTRO = [
  {
    who: "GNAT",
    text: "You are awake. Good. The universe has been running for eons with its checks turned off, and the Void is leaking again."
  },
  {
    who: "COMPILER",
    text: "INSPECTOR A. LOVELACE. YOUR INITIAL IS UNINITIALIZED. REPORT TO THE HOUSE OF PROMISES."
  },
  {
    who: "GNAT",
    text: "I'm GNAT. I eat warnings. I have heartburn. Tap the lines in the order Ada would accept, and try not to dereference anything emotionally."
  }
];

const chapterOne = {
  id: 1,
  numeral: "I",
  title: "The Void Compiles",
  subtitle: "In the beginning was the declaration.",
  quote: "Nothing existed. Then something was declared. The Compiler called this a good start.",
  accent: "#ffb84d",
  art: "void",
  lessons: [
    {
      id: "1-1",
      title: "Hello, Void",
      concept: "A program",
      tagline: "Teach the universe to say something.",
      briefing: [
        { who: "GNAT", text: "Before you fix a universe, it has to make a sound. A hello will do. Even the Void is impressed by punctuation." },
        { who: "GNAT", text: "Ada wants a library for output, a procedure to hold the words, and a begin…end to make them happen. Tap them in that order." }
      ],
      lesson: {
        heading: "A program is a promise with a begin.",
        body: [
          "Every Ada program is built from units. This one is a procedure called Hello. The context clauses at the top bring in Ada.Text_IO, the standard package that knows how to print. use makes Put_Line visible without qualification.",
          "Declarations come first. begin opens the executable part. Every begin gets an end, and that end repeats the name it closes. Semicolons end declarations and statements; strings live in double quotes.",
          "Put_Line is a procedure: it performs an action and returns nothing. Say its name, give it a string, and the universe has output."
        ],
        snippet: [
          "with Ada.Text_IO;",
          "use Ada.Text_IO;",
          "",
          "procedure Hello is",
          "begin",
          '   Put_Line ("Hello, World!");',
          "end Hello;"
        ].join("\n"),
        margin: "`--` is Ada for “never mind”. It starts a comment.",
        pitfalls: [
          "Missing semicolon after Put_Line? The compiler will ask for one, politely and forever.",
          "An end must name its unit: end Hello; not end Procedure;."
        ],
        codex:
          "with imports a library unit. use opens its visible names. A procedure's declarative part comes before begin, and its statements live between begin and end. A bare string is a String; Ada.Text_IO.Put_Line prints it followed by a newline."
      },
      puzzle: {
        prompt: "Assemble the first words of the universe.",
        solution: [
          "with Ada.Text_IO;",
          "use Ada.Text_IO;",
          "procedure Hello is",
          "begin",
          '   Put_Line ("Hello, World!");',
          "end Hello;"
        ],
        output: ["Hello, World!"],
        hint: "Imports come first, then the procedure, then begin, then the statement. The Void is very strict about this.",
        success: "The Void has produced a sound. It is smug about it.",
        note: "Program exited normally. The Compiler has no comments."
      },
      fragment: {
        title: "The First Word",
        text: "Every hello is a declaration: I am here, and I have a name the compiler can check."
      }
    },
    {
      id: "1-2",
      title: "A Name for the Abyss",
      concept: "Variables & constants",
      tagline: "Give the Void something to hold.",
      briefing: [
        { who: "GNAT", text: "Your name is A. Lovelace. The A. is uninitialized. We will deal with that later, probably during a boss fight." },
        { who: "GNAT", text: "For now: a variable is a named value. := changes it. = compares it. Mixing those up is how religions start." }
      ],
      lesson: {
        heading: "A name is a handle. A type is the shape of the hand.",
        body: [
          "The declarative part can hold more than procedures. Here we declare Greeting, a constant String, and Count, an Integer variable. A constant gets its value once and keeps it. A variable may change.",
          "Assignment uses :=, not =. The expression Integer'Image (Count) turns Count into text; the attribute 'Image is how scalar values introduce themselves. String concatenation uses &, which is friendlier than it looks.",
          "Ada's strong typing means an Integer will not quietly become a String or a Float. You have to ask. This is not pedantry; it is how the universe avoids becoming soup."
        ],
        snippet: [
          "with Ada.Text_IO;",
          "use Ada.Text_IO;",
          "",
          "procedure Names is",
          '   Greeting : constant String := "Inspector";',
          "   Count    : Integer := 3;",
          "begin",
          "   Count := Count + 1;",
          '   Put_Line (Greeting & " x" & Integer\'Image (Count));',
          "end Names;"
        ].join("\n"),
        margin: "`=` asks a question. `:=` changes the answer.",
        pitfalls: [
          "You cannot assign to a constant. The compiler is not being dramatic; that is its job.",
          "Integer'Image returns a leading space. It is a small, punctual gift from Ada 83."
        ],
        codex:
          "Declaration: Name : Type := Initial_Value;. Use constant to freeze a value. Assignment is :=; equality is =. 'Image is a scalar attribute that returns a String representation. The leading space in Integer'Image is part of the result."
      },
      puzzle: {
        prompt: "Give the Void a name and a number.",
        solution: [
          "with Ada.Text_IO;",
          "use Ada.Text_IO;",
          "procedure Names is",
          '   Greeting : constant String := "Inspector";',
          "   Count    : Integer := 3;",
          "begin",
          "   Count := Count + 1;",
          '   Put_Line (Greeting & " x" & Integer\'Image (Count));',
          "end Names;"
        ],
        output: ["Inspector x 4"],
        hint: "Declarations belong before begin. The assignment to Count happens after it.",
        success: "Count is now 4. Greeting remains Inspector, as constants do, forever, out of spite.",
        note: "Note the leading space before 4. Integer'Image is making a point.",
        foot: "That space before the number is not a typo. 'Image includes it so columns line up."
      },
      fragment: {
        title: "A Handle on the Void",
        text: "A name is a handle on the void. A type is the shape of the hand that holds it."
      }
    },
    {
      id: "1-3",
      title: "The Shape of a Promise",
      concept: "Types & subtypes",
      tagline: "Draw a boundary. Mean it.",
      briefing: [
        { who: "GNAT", text: "A type says what a value is. A subtype says how much of it is allowed. The difference is the difference between “weather” and “a nice day”." },
        { who: "COMPILER", text: "CONFIDENCE IS A PERCENTAGE. A PERCENTAGE DOES NOT GO TO 101. THIS IS NOT NEGOTIABLE. IT IS A RANGE." }
      ],
      lesson: {
        heading: "A subtype is a promise with edges.",
        body: [
          "Ada lets you derive a type and constrain its values. subtype Percentage is Integer range 0 .. 100; declares a name for the numbers 0 through 100. Confidence is a Percentage; it cannot wander outside without raising Constraint_Error.",
          "Types are not just storage sizes. They are contracts about meaning. Integer, Float, Boolean, and Character each bring their own operations and their own rules. A Boolean is not a small Integer; a Character is not a tiny String.",
          "Adding one to Confidence is fine while the result stays inside the range. The boundary is not decoration. It is the thing that lets the compiler (and the runtime) defend you from a value that has lost its way."
        ],
        snippet: [
          "with Ada.Text_IO;",
          "use Ada.Text_IO;",
          "",
          "procedure Promise is",
          "   subtype Percentage is Integer range 0 .. 100;",
          "   Confidence : Percentage := 99;",
          "begin",
          "   Confidence := Confidence + 1;",
          '   Put_Line ("Certified:" & Integer\'Image (Confidence) & "%");',
          "end Promise;"
        ].join("\n"),
        margin: "The type is the promise. The range is the fine print that saves you.",
        pitfalls: [
          "Ranges are inclusive on both ends: 0 .. 100 allows 0 and 100.",
          "A subtype does not create a new type; it adds a constraint to an existing one. That distinction will matter when you meet Constraint Error."
        ],
        codex:
          "subtype Name is Base range Low .. High; narrows a scalar type with a constraint. The check happens at runtime for non-static values. Strong typing keeps unrelated types from mixing without an explicit conversion."
      },
      puzzle: {
        prompt: "Declare a confidence that knows its limits.",
        solution: [
          "with Ada.Text_IO;",
          "use Ada.Text_IO;",
          "procedure Promise is",
          "   subtype Percentage is Integer range 0 .. 100;",
          "   Confidence : Percentage := 99;",
          "begin",
          "   Confidence := Confidence + 1;",
          '   Put_Line ("Certified:" & Integer\'Image (Confidence) & "%");',
          "end Promise;"
        ],
        output: ["Certified: 100%"],
        hint: "The subtype comes before the variable. The variable comes before begin.",
        success: "Confidence reaches 100 and stops. This is either discipline or a very good day.",
        note: "Program exited normally. Constraint Error is taking notes.",
        foot: "If Confidence had started at 100, the + 1 would raise Constraint_Error. Boundaries are load-bearing."
      },
      fragment: {
        title: "The Shape of a Promise",
        text: "A boundary is not what keeps you in. It is what makes “in” mean anything."
      }
    }
  ],
  boss: {
    id: "boss-1",
    kind: "boss",
    title: "The Null",
    name: "THE NULL",
    epithet: "A procedure with no body, a pointer with no address, and a Monday.",
    art: "null",
    accent: "#b79bff",
    intro: [
      { who: "GNAT", text: "The first boss. It is not evil. It is incomplete. That is somehow worse." },
      { who: "THE NULL", text: "I would introduce myself, but I have no body. Find what is missing. Or join me in the declarative part." }
    ],
    rounds: [
      {
        type: "find",
        prompt: "One line in this program will not compile. Tap it.",
        lines: [
          "with Ada.Text_IO;",
          "use Ada.Text_IO;",
          "procedure Hello is",
          "begin",
          '   Put_Line ("Hello, World!")',
          "end Hello;"
        ],
        fault: 4,
        explain: "A statement ends with a semicolon. Without it, the compiler keeps reading into the next line and finds an end where it expected punctuation.",
        taunt: "Punctuation. The Void's smallest prison."
      },
      {
        type: "choose",
        prompt: "Which keyword opens the executable part of a procedure?",
        options: ["begin", "is", "declare"],
        answer: 0,
        explain: "begin opens the sequence of statements. is introduces the declarative part. declare opens a nested block. All three are real; only one makes the body run.",
        taunt: "Choose carefully. Words have addresses here."
      },
      {
        type: "find",
        prompt: "The program declares Main, then betrays it at the end. Tap the treacherous line.",
        lines: [
          "with Ada.Text_IO;",
          "use Ada.Text_IO;",
          "procedure Main is",
          "begin",
          '   Put_Line ("I exist.");',
          "end Hello;"
        ],
        fault: 5,
        explain: "The name after end must repeat the name of the unit it closes. end Hello; inside procedure Main is a small but fatal identity crisis.",
        taunt: "Names are not decorations. They are handles."
      },
      {
        type: "choose",
        prompt: "Which declaration creates a constant named Meaning with the value 42?",
        options: [
          "Meaning : constant Integer := 42;",
          "Meaning : Integer := constant 42;",
          "constant Meaning : Integer = 42;"
        ],
        answer: 0,
        explain: "The mode comes after the colon: Name : constant Type := Value;. The constant keyword is part of the declaration, not a prefix for the name.",
        taunt: "Constants are just variables with better impulse control."
      },
      {
        type: "predict",
        prompt: "What does this statement print?",
        code: ['Put_Line ("I exist.");'],
        options: ["I exist.", '"I exist."', "Nothing; the quotes are part of the string"],
        answer: 0,
        explain: "The double quotes delimit the string literal. They are not printed. The statement prints I exist. and a newline.",
        taunt: "Even a void can be literal."
      }
    ],
    defeat: [
      { who: "THE NULL", text: "A body. At last. I feel… bounded. It is not the end. It is an end, which is better." },
      { who: "GNAT", text: "The procedure breathes. The Void is now approximately 0.0001% smaller. I have eaten the missing semicolon. It tasted like nothing." }
    ],
    fragment: {
      title: "The Body of the Name",
      text: "Existence is a body without which a name is only a rumor."
    }
  }
};

const chapterTwo = {
  id: 2,
  numeral: "II",
  title: "The House of Promises",
  subtitle: "Every choice is a door. Every door expects an end.",
  quote: "The House has many rooms, but only one thermostat. This is the first moral problem.",
  accent: "#7ef0c8",
  art: "house",
  lessons: [
    {
      id: "2-1",
      title: "Two Doors",
      concept: "Conditionals",
      tagline: "Choose a branch. Close it properly.",
      briefing: [
        { who: "GNAT", text: "The House of Promises is warm, cold, and judgmental. The thermostat has one value and several opinions." },
        { who: "GNAT", text: "An if tests a Boolean. Take the true branch or the false branch. Then end if;. No branch may wander off without one." }
      ],
      lesson: {
        heading: "A condition is a question the code can answer.",
        body: [
          "if Temperature < 15 then … else … end if; chooses one of two paths. The condition is a Boolean expression: comparisons like < and >, equality with =, and the operators and, or, and not.",
          "Every if needs its own end if;. elsif adds another question without nesting another end, which is why it exists and why it is spelled that way. Ada is rarely casual about keywords.",
          "There is no truthiness here. An Integer is not an honorary Boolean. The condition must be exactly Boolean, which keeps the House from making assumptions about the weather."
        ],
        snippet: [
          "with Ada.Text_IO;",
          "use Ada.Text_IO;",
          "",
          "procedure Door is",
          "   Temperature : constant Integer := 12;",
          "begin",
          "   if Temperature < 15 then",
          '      Put_Line ("Bring a coat");',
          "   else",
          '      Put_Line ("Perfect");',
          "   end if;",
          "end Door;"
        ].join("\n"),
        margin: "A Boolean has two values. A door has two sides. This is not a coincidence; it is a design pattern.",
        pitfalls: [
          "if ends with end if; — the label is mandatory.",
          "Ada uses = for equality. A single = inside a condition is a question, not an assignment."
        ],
        codex:
          "if Condition then Statements; elsif Condition then Statements; else Statements; end if;. Conditions must have type Boolean. Comparison operators: =, /=, <, <=, >, >=. Short-circuit forms and then / or else exist for conditions that guard evaluation."
      },
      puzzle: {
        prompt: "Help the House choose its weather.",
        solution: [
          "with Ada.Text_IO;",
          "use Ada.Text_IO;",
          "procedure Door is",
          "   Temperature : constant Integer := 12;",
          "begin",
          "   if Temperature < 15 then",
          '      Put_Line ("Bring a coat");',
          "   else",
          '      Put_Line ("Perfect");',
          "   end if;",
          "end Door;"
        ],
        output: ["Bring a coat"],
        hint: "The test asks whether 12 is less than 15. The true branch handles the coat.",
        success: "The House is 12 degrees. The coat is non-optional. The other door is still real, which is the whole tragedy.",
        note: "Program exited normally. The thermostat has requested a union representative."
      },
      fragment: {
        title: "The Two Doors",
        text: "A choice is not the moment you pick a door. It is the moment you accept that the other door was real."
      }
    },
    {
      id: "2-2",
      title: "The Many-Roomed House",
      concept: "Case & enumerations",
      tagline: "Give every difference a room.",
      briefing: [
        { who: "GNAT", text: "There are more than two weathers. Ada lets you name them. This is called an enumeration, and it is how a language admits that the world is not a Boolean." },
        { who: "GNAT", text: "A case chooses among values. Cover every room, or say when others. No sneaking down the corridor." }
      ],
      lesson: {
        heading: "Name the categories before you choose between them.",
        body: [
          "type Weather is (Sun, Rain, Snow); creates an enumeration type. Its values are exactly those three names, in that order. They are not integers wearing costumes; they are their own kind of value.",
          "case Today is examines one value and picks a matching when alternative. Each when can list one or more values. end case; closes the room. The compiler checks that every possibility is handled, or that an others choice covers the rest.",
          "This is more than a prettier if-chain. It makes missing cases visible, and it keeps tomorrow's new weather from silently falling through the floor."
        ],
        snippet: [
          "with Ada.Text_IO;",
          "use Ada.Text_IO;",
          "",
          "procedure Report is",
          "   type Weather is (Sun, Rain, Snow);",
          "   Today : constant Weather := Rain;",
          "begin",
          "   case Today is",
          '      when Rain => Put_Line ("Umbrella");',
          '      when others => Put_Line ("Stay inside");',
          "   end case;",
          "end Report;"
        ].join("\n"),
        margin: "Categories are promises about what differences matter.",
        pitfalls: [
          "case is not if. Missing values are a compile-time problem, not a runtime surprise.",
          "end case; is required, and case arms end with a semicolon after their statements."
        ],
        codex:
          "type Season is (Spring, Summer, Autumn, Winter); defines an enumeration. case Expression is when Choice => Statements; when others => Statements; end case;. Choices must be static and distinct; every value must be covered unless others is present."
      },
      puzzle: {
        prompt: "Give the House a weather report it can trust.",
        solution: [
          "with Ada.Text_IO;",
          "use Ada.Text_IO;",
          "procedure Report is",
          "   type Weather is (Sun, Rain, Snow);",
          "   Today : constant Weather := Rain;",
          "begin",
          "   case Today is",
          '      when Rain => Put_Line ("Umbrella");',
          '      when others => Put_Line ("Stay inside");',
          "   end case;",
          "end Report;"
        ],
        output: ["Umbrella"],
        hint: "Declare the weather type and today's weather first. The case needs its rooms, then end case;.",
        success: "It is raining. The House has an umbrella and a policy. The Sun and Snow rooms are dark but accounted for.",
        note: "Program exited normally. All rooms have been considered."
      },
      fragment: {
        title: "The Many-Roomed House",
        text: "To name a category is to decide which differences deserve a room."
      }
    },
    {
      id: "2-3",
      title: "The Wheel",
      concept: "Loops",
      tagline: "Practice the promise until it holds.",
      briefing: [
        { who: "GNAT", text: "The Wheel turns. A for loop counts; a while loop waits. Both have a begin-shaped hole in the middle called loop." },
        { who: "COMPILER", text: "REPETITION IS NOT REDUNDANCY. REPETITION IS HOW THE UNIVERSE CHECKS ITS ARITHMETIC." }
      ],
      lesson: {
        heading: "A loop is a promise you keep more than once.",
        body: [
          "for Step in 1 .. 3 loop … end loop; walks through a discrete range. The loop parameter is a constant with the type of the range; you cannot assign to it. This is a feature, not a challenge.",
          "A while loop repeats as long as its condition remains True. A plain loop repeats until something inside it exits. In all cases, loop and end loop; mark the edges of the repetition.",
          "Put_Line inside the loop runs once per iteration. Integer'Image turns the loop parameter into text. Three iterations produce three lines, each with a leading space that is entirely Ada's idea of typography."
        ],
        snippet: [
          "with Ada.Text_IO;",
          "use Ada.Text_IO;",
          "",
          "procedure March is",
          "begin",
          "   for Step in 1 .. 3 loop",
          '      Put_Line ("Step" & Integer\'Image (Step));',
          "   end loop;",
          "end March;"
        ].join("\n"),
        margin: "A for loop knows its own boundaries. A while loop has to keep checking.",
        pitfalls: [
          "The loop parameter is read-only. Assigning to it is not permitted.",
          "end loop; is required. If you open a wheel, close it."
        ],
        codex:
          "for I in Range loop Statements; end loop; iterates over a discrete range. while Condition loop Statements; end loop; tests before each iteration. exit leaves a loop early; a named loop (Outer : loop) lets exit Outer; reach the right one."
      },
      puzzle: {
        prompt: "March the Void in three perfectly punctuated steps.",
        solution: [
          "with Ada.Text_IO;",
          "use Ada.Text_IO;",
          "procedure March is",
          "begin",
          "   for Step in 1 .. 3 loop",
          '      Put_Line ("Step" & Integer\'Image (Step));',
          "   end loop;",
          "end March;"
        ],
        output: ["Step 1", "Step 2", "Step 3"],
        hint: "The for line opens the loop; end loop; closes it. The statement in between runs three times.",
        success: "Three steps. The Wheel is satisfied. It will be back tomorrow, of course.",
        note: "Program exited normally. The loop parameter has returned to the range from which it came."
      },
      fragment: {
        title: "The Wheel",
        text: "Repetition is how the universe practices its promises."
      }
    }
  ],
  boss: {
    id: "boss-2",
    kind: "boss",
    title: "Constraint Error",
    name: "CONSTRAINT ERROR",
    epithet: "Bouncer of the Real. Keeper of the velvet rope. Tired of your values.",
    art: "constraint",
    accent: "#ff7166",
    intro: [
      { who: "GNAT", text: "That is Constraint Error. He guards the range. He has been blamed for more bad code than any entity in the runtime." },
      { who: "CONSTRAINT ERROR", text: "Your value is 101. My rope goes to 100. I don't make the rules. I am the rules. Do not test me. You are already testing me." }
    ],
    rounds: [
      {
        type: "predict",
        prompt: "What happens when this program runs?",
        code: [
          "with Ada.Text_IO; use Ada.Text_IO;",
          "procedure Bound is",
          "   Count : Integer range 0 .. 3 := 3;",
          "begin",
          "   Count := Count + 1;",
          '   Put_Line ("Still here.");',
          "end Bound;"
        ],
        options: [
          "Raises Constraint_Error before Put_Line",
          "Prints Still here.",
          "Count becomes 0 and the program continues"
        ],
        answer: 0,
        explain: "The range is checked when Count is assigned. 4 is outside 0 .. 3, so the assignment raises Constraint_Error and the Put_Line is never reached.",
        taunt: "The rope is at 3. You brought 4. Bold."
      },
      {
        type: "choose",
        prompt: "Which subtype lets exactly the values 1 through 6 pass?",
        options: [
          "subtype Dice is Integer range 1 .. 6;",
          "subtype Dice is Integer range 0 .. 7;",
          "subtype Dice is Integer with 1 .. 6;"
        ],
        answer: 0,
        explain: "Both ends are inclusive: 1 .. 6 means 1, 2, 3, 4, 5, 6. The second option also admits 0 and 7. The third is not Ada.",
        taunt: "A dice with a 7 is just a very confident cube."
      },
      {
        type: "find",
        prompt: "One line tries to change a constant. Tap the line that will be rejected.",
        lines: [
          "with Ada.Text_IO;",
          "use Ada.Text_IO;",
          "procedure Scores is",
          "   Score : constant Integer := 100;",
          "begin",
          "   Score := 101;",
          '   Put_Line ("Accepted");',
          "end Scores;"
        ],
        fault: 5,
        explain: "Score is a constant. It receives its value once, at declaration. Assignment to it is illegal, regardless of how persuasive 101 is.",
        taunt: "A constant is a promise with no return policy."
      },
      {
        type: "choose",
        prompt: "Which value may legally enter a subtype Percent is Integer range 0 .. 100?",
        options: ["-1", "100", "101"],
        answer: 1,
        explain: "0 and 100 are the inclusive endpoints; 101 is out. Constraint Error asks that you respect the rope on both ends.",
        taunt: "One hundred is the last guest. He has a plus-one named Error."
      },
      {
        type: "predict",
        prompt: "How many times does this loop run?",
        code: ["for I in 1 .. 0 loop", '   Put_Line ("Again?!");', "end loop;"],
        options: ["Zero times", "Once", "Forever"],
        answer: 0,
        explain: "The range 1 .. 0 is a null range: it contains no values. The loop body is never executed. Ada permits empty ranges; they are not errors, merely very quiet.",
        taunt: "A wheel that turns zero times is still a wheel. A very disappointing one."
      }
    ],
    defeat: [
      { who: "CONSTRAINT ERROR", text: "Fine. You understand the rope. Most people just blame me when they walk into it. You may pass. Please initialize your variables on the way out." },
      { who: "GNAT", text: "He's actually quite gentle once you respect his range. The rope is velvet. The drop is theoretical. Mostly." }
    ],
    fragment: {
      title: "The Velvet Rope",
      text: "A constraint is not a cage. It is a definition you can check."
    }
  }
};

const chapterThree = {
  id: 3,
  numeral: "III",
  title: "The Hermit's Package",
  subtitle: "A house has a face. A house has a body. Knock on the face.",
  quote: "The Hermit showed the world a small door and kept a cathedral inside. This is called good software engineering.",
  accent: "#b79bff",
  art: "package",
  lessons: [
    {
      id: "3-1",
      title: "The Shelf of Many Things",
      concept: "Arrays",
      tagline: "Every place holds exactly one thing.",
      briefing: [
        { who: "GNAT", text: "The Hermit has a shelf. Each place on it has an index, and the index is not a vibe. It is a coordinate." },
        { who: "GNAT", text: "An array is a type whose values are all places. 'Range knows where they start and stop. This is how we avoid guessing." }
      ],
      lesson: {
        heading: "An array is a promise about places.",
        body: [
          "Values : array (1 .. 3) of Integer := (10, 20, 30); declares three Integers in a row. The index range is part of the array's type. Values (I) asks for the value at index I; parentheses, not square brackets, are Ada's indexing style.",
          "Values'Range is the index range itself, 1 .. 3. Looping over it visits every element exactly once without hard-coding the bounds. For an array with custom bounds, this is the difference between a program and a scavenger hunt.",
          "Accessing an index outside the range raises Constraint_Error. The compiler can catch a static bound error; the runtime guards the rest. The shelf is not a suggestion."
        ],
        snippet: [
          "with Ada.Text_IO;",
          "use Ada.Text_IO;",
          "",
          "procedure Shelf is",
          "   Values : array (1 .. 3) of Integer := (10, 20, 30);",
          "begin",
          "   for I in Values'Range loop",
          "      Put_Line (Integer'Image (Values (I)));",
          "   end loop;",
          "end Shelf;"
        ].join("\n"),
        margin: "The index is not a suggestion. It is a coordinate.",
        pitfalls: [
          "Indexing uses parentheses: Values (I), not Values (I).",
          "The aggregate (10, 20, 30) fills a three-element array in order. Positional aggregates are convenient but can lie if the bounds change."
        ],
        codex:
          "array (Index_Range) of Element_Type declares an array type or object. Index with (Expression). 'Range, 'First and 'Last describe the bounds. Aggregates (10, 20, 30) or (1 => 10, 2 => 20, 3 => 30) initialize elements. Out-of-range indexing raises Constraint_Error."
      },
      puzzle: {
        prompt: "Put three values on the Hermit's shelf, then read them back.",
        solution: [
          "with Ada.Text_IO;",
          "use Ada.Text_IO;",
          "procedure Shelf is",
          "   Values : array (1 .. 3) of Integer := (10, 20, 30);",
          "begin",
          "   for I in Values'Range loop",
          "      Put_Line (Integer'Image (Values (I)));",
          "   end loop;",
          "end Shelf;"
        ],
        output: [" 10", " 20", " 30"],
        hint: "Declare the array, open a loop over Values'Range, and print Values (I) each time.",
        success: "Ten, twenty, thirty. The shelf is exactly three things long, which is the correct number of things for a shelf of this size.",
        note: "Program exited normally. The leading spaces are 'Image being punctual.",
        foot: "Integer'Image includes a leading space. Every number here is trying to align with a column that does not exist."
      },
      fragment: {
        title: "The Shelf",
        text: "A shelf is a promise that every place can hold exactly one thing."
      }
    },
    {
      id: "3-2",
      title: "The Machine That Returns",
      concept: "Functions",
      tagline: "Make a transformation. Bring something back.",
      briefing: [
        { who: "GNAT", text: "The Hermit has a machine that turns 21 into 42. I asked how. He said, “return Value * 2.” Very cryptic. Very effective." },
        { who: "GNAT", text: "A function has a return type and must return a value. A procedure has neither. This is the entire difference, until it isn't." }
      ],
      lesson: {
        heading: "A function is a machine with an exit.",
        body: [
          "function Double (Value : Integer) return Integer is … end Double; declares a function. Value is a parameter: the caller supplies an Integer, and the function promises an Integer back. return Value * 2; is where that promise is kept.",
          "Functions can be declared inside procedures. The inner function sees the enclosing scope and is invisible outside it. This keeps tiny tools tiny, which is one of the small mercies of the language.",
          "A function call is an expression: Double (21) produces a value. A procedure call is a statement: it performs an action and then gets out of the way. Confusing the two is a rite of passage, usually accompanied by a compiler message."
        ],
        snippet: [
          "with Ada.Text_IO;",
          "use Ada.Text_IO;",
          "",
          "procedure Machine is",
          "   function Double (Value : Integer) return Integer is",
          "   begin",
          "      return Value * 2;",
          "   end Double;",
          "begin",
          "   Put_Line (Integer'Image (Double (21)));",
          "end Machine;"
        ].join("\n"),
        margin: "A procedure changes the world. A function returns a value. Some do both and must be watched.",
        pitfalls: [
          "Every path through a non-void function must return a value. GNAT will not accept a vague gesture.",
          "The parameter list uses parentheses and colons: (Value : Integer), not (Integer Value)."
        ],
        codex:
          "function Name (Param : Type) return Result_Type is Declarations; begin Statements; end Name;. Values are returned with return Expression;. Parameters can be in (default), out, or in out. Calls may be nested wherever an expression of the result type is allowed."
      },
      puzzle: {
        prompt: "Assemble the Hermit's doubling machine.",
        solution: [
          "with Ada.Text_IO;",
          "use Ada.Text_IO;",
          "procedure Machine is",
          "   function Double (Value : Integer) return Integer is",
          "   begin",
          "      return Value * 2;",
          "   end Double;",
          "begin",
          "   Put_Line (Integer'Image (Double (21)));",
          "end Machine;"
        ],
        output: [" 42"],
        hint: "Declare the function before its begin. Return Value * 2. Call it inside Put_Line.",
        success: "21 enters. 42 leaves. The machine refuses to explain itself, which is how you know it is a function.",
        note: "Program exited normally. The machine has returned, and it has brought something with it."
      },
      fragment: {
        title: "The Machine That Returns",
        text: "To return is to come back changed, and to bring something back with you."
      }
    },
    {
      id: "3-3",
      title: "The House with Two Faces",
      concept: "Packages",
      tagline: "A public spec. A private body. Do not knock on the body.",
      briefing: [
        { who: "GNAT", text: "The Hermit's package has a specification and a body. The spec is the face he shows the world. The body is the cathedral." },
        { who: "GNAT", text: "The world only needs to know the door. You are not required to invite everyone into the nave. That is information hiding, and it is also good manners." }
      ],
      lesson: {
        heading: "A package is a self you can depend on.",
        body: [
          "A package specification declares what the package offers: types, constants, procedures, functions. A package body provides the implementation. Clients with the package can call its visible operations; they cannot see the body.",
          "package Beacon is … end Beacon; is the spec. package body Beacon is … end Beacon; is the body. The body repeats the subprogram declarations it implements and fills in their begin…end. A spec without a body may be legal for declarations only; a body without a matching spec is not.",
          "This is the quiet hero of maintainable code: a small, stable interface protecting a large, changeable interior. The Hermit calls it privacy. Software engineers call it encapsulation. Both are correct."
        ],
        snippet: [
          "package Beacon is",
          "   procedure Blink;",
          "   Min_Range : constant Integer := 1;",
          "   Max_Range : constant Integer := 3;",
          "end Beacon;",
          "",
          "package body Beacon is",
          "   procedure Blink is",
          "   begin",
          "      null;",
          "   end Blink;",
          "end Beacon;"
        ].join("\n"),
        margin: "A specification is a promise. A body is the private effort of keeping it.",
        pitfalls: [
          "The package body must match the spec: names, parameter profiles and return types all have to agree.",
          "A standalone package has no main procedure, so there is nothing to “run”. It compiles, waits, and judges."
        ],
        codex:
          "package Name is visible_declarations; end Name; declares the public interface. package body Name is implementations; end Name; provides it. Subprograms declared in the spec are completed in the body. Context clauses (with) belong at the top of the compilation unit; put them before the package body when the body needs library units."
      },
      puzzle: {
        prompt: "Seal the public face of the Hermit's package. The body stays private.",
        solution: [
          "package Beacon is",
          "   procedure Blink;",
          "   function Is_Lit return Boolean;",
          "   Max_Range : constant Integer := 3;",
          "end Beacon;"
        ],
        output: ["[spec] Beacon · 3 declarations sealed", "(the body is private — the Hermit is watching)"],
        hint: "The specification opens with package Name is and closes with end Name;. Every public declaration lives between them.",
        success: "The face is sealed. The body remains behind the door. The Hermit nods, which is his highest compliment.",
        note: "GNAT accepted the specification. There is no main procedure; this is a face, not a performance."
      },
      fragment: {
        title: "Two Faces",
        text: "Privacy is not deception. It is the small interface that lets a self remain whole."
      }
    }
  ],
  boss: {
    id: "boss-3",
    kind: "boss",
    title: "Randy, Uninitialized",
    name: "RANDY",
    epithet: "A Float that was never given a value and has decided to become weather.",
    art: "randy",
    accent: "#c6f56b",
    intro: [
      { who: "GNAT", text: "Randy is an uninitialized Float. He is not random on purpose. He is random because nobody gave him a first value." },
      { who: "RANDY", text: "I could be 0.0! I could be 4.9e-324! I could be your taxes! Nobody initialized me, so I contain everything. It is terrible. It is freedom." }
    ],
    rounds: [
      {
        type: "choose",
        prompt: "Why does this function fail to compile?",
        code: [
          "function Half (Value : Integer) return Integer is",
          "begin",
          "   Value / 2;",
          "end Half;"
        ],
        options: [
          "It never returns a value",
          "Integer cannot be divided",
          "The parameter must be a constant"
        ],
        answer: 0,
        explain: "Value / 2; evaluates an expression and discards it. The function promises to return an Integer, so it needs return Value / 2;.",
        taunt: "I contain infinite possibilities. You contain a compiler error."
      },
      {
        type: "predict",
        prompt: "What can you say about this program?",
        code: [
          "with Ada.Text_IO;",
          "procedure Mystery is",
          "   X : Integer;",
          "begin",
          "   Ada.Text_IO.Put_Line (Integer'Image (X));",
          "end Mystery;"
        ],
        options: [
          "X is read before it is set; the value is unspecified and the program is buggy",
          "X is automatically 0, so it prints 0",
          "It does not compile because X is never assigned"
        ],
        answer: 0,
        explain: "Scalar variables are not default-initialized. Reading X before assigning it is an error in your program's logic; GNAT will usually warn, and the value is not to be trusted.",
        taunt: "I was never initialized either. Look at me now. Do not be like me."
      },
      {
        type: "find",
        prompt: "Tap the line that will raise Constraint_Error at runtime.",
        lines: [
          "with Ada.Text_IO;",
          "use Ada.Text_IO;",
          "procedure Oops is",
          "   Values : array (1 .. 3) of Integer := (10, 20, 30);",
          "begin",
          "   Put_Line (Integer'Image (Values (4)));",
          "end Oops;"
        ],
        fault: 5,
        explain: "Indices 1, 2 and 3 exist. Values (4) steps off the shelf and raises Constraint_Error.",
        taunt: "Four things on a three-thing shelf! A bold philosophical position."
      },
      {
        type: "choose",
        prompt: "Which declaration matches the body `return Value * 2;`?",
        options: [
          "function Double (Value : Integer) return Integer;",
          "procedure Double (Value : Integer);",
          "function Double return Integer (Value : Integer);"
        ],
        answer: 0,
        explain: "A function needs a parameter profile and a return type. The procedure returns nothing; the third reverses the syntax. Ada is not a choose-your-own-grammar.",
        taunt: "Order is a type of safety. Ask my fields. They are everywhere."
      },
      {
        type: "find",
        prompt: "The package body does not implement the specification. Tap the line where the identity breaks.",
        lines: [
          "package Lamp is",
          "   procedure Shine;",
          "end Lamp;",
          "package body Lantern is",
          "   procedure Shine is",
          "   begin",
          "      null;",
          "   end Shine;",
          "end Lantern;"
        ],
        fault: 3,
        explain: "The specification names Lamp. The body names Lantern. A package body must complete the package with the same name; Lantern is a different package with no specification.",
        taunt: "You promised a Shine. You delivered a Lantern. I respect the audacity."
      }
    ],
    defeat: [
      { who: "RANDY", text: "You gave me a value. Zero. It's not much, but it's mine. I feel… deterministic. I think I'll be a 0.0 for a while. Maybe a 1.0 on weekends." },
      { who: "GNAT", text: "Randy has been initialized. Somewhere, a warning disappears. I feel a little emptier. It's nice." }
    ],
    fragment: {
      title: "Uninitialized",
      text: "To be uninitialized is to be free in the worst possible way."
    }
  }
};

const chapterFour = {
  id: 4,
  numeral: "IV",
  title: "The Forbidden Heap",
  subtitle: "Memory is borrowed. Ghosts are pointers who forgot the contract.",
  quote: "The Heap is not evil. It is just very large, very dark, and full of things nobody claimed.",
  accent: "#9bd8ff",
  art: "heap",
  lessons: [
    {
      id: "4-1",
      title: "The Cabinet of Selves",
      concept: "Records",
      tagline: "Give a value named parts.",
      briefing: [
        { who: "GNAT", text: "The Heap is full of discarded cabinets. Each drawer has a label. This is either furniture or ontology." },
        { who: "GNAT", text: "A record groups values under names. Unlike an array, it is accessed by field, not by position. The X and Y are not secrets; they are just labeled." }
      ],
      lesson: {
        heading: "A record is a self with named fields.",
        body: [
          "type Point is record X : Integer; Y : Integer; end record; creates a record type. A Point has two components, each with its own name and type. P : constant Point := (X => 3, Y => 4); is an aggregate: it fills the fields by name.",
          "Field selection uses dot notation: P.X, P.Y. Records can contain any type, including other records and arrays. They describe structure, not behavior; behavior is what subprograms are for.",
          "Named fields make code legible in a way that positional aggregates do not. X => 3 cannot be confused for a Y that happens to be third. The Compiler, which loves clarity, pretends not to be pleased."
        ],
        snippet: [
          "with Ada.Text_IO;",
          "",
          "procedure Cabinet is",
          "   type Point is record",
          "      X : Integer;",
          "      Y : Integer;",
          "   end record;",
          "   P : constant Point := (X => 3, Y => 4);",
          "begin",
          "   Ada.Text_IO.Put_Line (\"X =\" & Integer'Image (P.X));",
          "end Cabinet;"
        ].join("\n"),
        margin: "A record is a promise that names survive position.",
        pitfalls: [
          "end record; closes the record type. Do not confuse it with end Point;.",
          "Aggregates can be positional, but named associations make the values harder to mix up."
        ],
        codex:
          "type Name is record Field : Type; ... end record;. Objects are initialized with aggregates: (Field => Value, ...). Select fields with Object.Field or Object.all.Field for an access. Records can be nested; tagged records add inheritance, which the Hermit keeps behind a curtain."
      },
      puzzle: {
        prompt: "Build a cabinet with two labeled drawers.",
        solution: [
          "with Ada.Text_IO;",
          "procedure Cabinet is",
          "   type Point is record",
          "      X : Integer;",
          "      Y : Integer;",
          "   end record;",
          "   P : constant Point := (X => 3, Y => 4);",
          "begin",
          "   Ada.Text_IO.Put_Line (\"X =\" & Integer'Image (P.X));",
          "end Cabinet;"
        ],
        output: ["X = 3"],
        hint: "Declare the record type first, then the point. Field names go before the arrows in the aggregate.",
        success: "The cabinet has two drawers and no ambiguity. Segfault's old furniture is, for one moment, tidy.",
        note: "Program exited normally. Y = 4, though nobody asked."
      },
      fragment: {
        title: "The Cabinet",
        text: "A self is a record: named fields, one body, and a few values you keep in the dark."
      }
    },
    {
      id: "4-2",
      title: "The Borrowed Ghost",
      concept: "Access types",
      tagline: "Point at what exists. Check before you trust.",
      briefing: [
        { who: "GNAT", text: "This is Segfault. He had an address once. Then someone freed it. Now he haunts the stack and asks strangers if they have seen his house." },
        { who: "SEGFAULT", text: "0x0000. Something. It had a lamp. Do not point at me unless you mean it. And check for null first." }
      ],
      lesson: {
        heading: "An access value is a borrowed name for something elsewhere.",
        body: [
          "type Note_Access is access String; declares an access type: values of this type refer to a String allocated elsewhere, usually in the Heap. new String'(\"Remember me\") allocates the String and returns its address.",
          "Note.all dereferences the access value and gives you the String. The all is not decorative; it is how Ada distinguishes “the pointer” from “the thing pointed at”. Note could also be null, which refers to nothing and refuses to be dereferenced.",
          "Ada's access types are relatively controlled compared to raw pointers. But a pointer is still a promise about place, and promises about place can be broken by time, bugs, or an overly confident deallocator. The ghost is a warning, not a mascot."
        ],
        snippet: [
          "with Ada.Text_IO;",
          "use Ada.Text_IO;",
          "",
          "procedure Borrow is",
          "   type Note_Access is access String;",
          '   Note : Note_Access := new String\'("Remember me");',
          "begin",
          "   Put_Line (Note.all);",
          "end Borrow;"
        ].join("\n"),
        margin: "Null is not nothing. It is a location that refuses to answer.",
        pitfalls: [
          "Dereferencing a null access raises Constraint_Error (or worse if checks are suppressed). Test it first.",
          "Note is the address; Note.all is the value. Put_Line wants the latter."
        ],
        codex:
          "type P is access T; declares an access-to-T type. Allocate with new T'(...). Dereference with P.all. null is the null access value. Ada checks a null dereference and raises Constraint_Error; suppressed checks or dangling references can still cause undefined behavior. Unchecked_Deallocation is a loaded word for a reason."
      },
      puzzle: {
        prompt: "Let the ghost remember one thing.",
        solution: [
          "with Ada.Text_IO;",
          "use Ada.Text_IO;",
          "procedure Borrow is",
          "   type Note_Access is access String;",
          '   Note : Note_Access := new String\'("Remember me");',
          "begin",
          "   Put_Line (Note.all);",
          "end Borrow;"
        ],
        output: ["Remember me"],
        hint: "Allocate with new String'(\"…\"), then dereference with Note.all inside Put_Line.",
        success: "The ghost remembers. Briefly. Memory is borrowed; remembering is the interest payment.",
        note: "Program exited normally. The allocation has not been deallocated. Segfault is visibly tense."
      },
      fragment: {
        title: "The Borrowed Ghost",
        text: "To point is to trust that something exists where you last saw it."
      }
    },
    {
      id: "4-3",
      title: "The Forgiving Room",
      concept: "Exceptions",
      tagline: "An error needs somewhere to land.",
      briefing: [
        { who: "GNAT", text: "The Heap has one room with a soft floor. It is called an exception handler. Errors fall in; the program decides what happens next." },
        { who: "GNAT", text: "This is not permission to use exceptions for weather. It is permission to survive the weather." }
      ],
      lesson: {
        heading: "An exception is a message the call stack can carry.",
        body: [
          "raise Constraint_Error; creates an exception occurrence and begins propagating it. If nothing handles it, the program terminates. An exception handler catches it and gives the program another move.",
          "The handler is introduced by exception after the executable statements, then one or more when clauses. A handler can be specific (when Constraint_Error =>) or broad (when others =>). Order matters: the first matching handler wins.",
          "Exceptions are for exceptional situations, not ordinary branching. But when the Heap breaks, or a range overflows, or a ghost dereferences null, a handler is the difference between a controlled landing and a silent crash. Forgiveness is architecture."
        ],
        snippet: [
          "with Ada.Text_IO;",
          "use Ada.Text_IO;",
          "",
          "procedure Forgive is",
          "begin",
          "   raise Constraint_Error;",
          "exception",
          "   when Constraint_Error =>",
          '      Put_Line ("Forgiven.");',
          "end Forgive;"
        ].join("\n"),
        margin: "A soft floor does not prevent the fall. It changes what happens after.",
        pitfalls: [
          "The exception section comes after the statements in the same begin…end block.",
          "Handle what you can actually handle. `when others => null;` makes an error disappear, not disappear from the world."
        ],
        codex:
          "raise Exception_Name; raises an exception. begin Statements; exception when Choice => Handler; when others => Handler; end; attaches handlers to a block. Exceptions propagate outward until handled. Use specific handlers and re-raise (raise;) when you cannot recover."
      },
      puzzle: {
        prompt: "Build a room where an error can land softly.",
        solution: [
          "with Ada.Text_IO;",
          "use Ada.Text_IO;",
          "procedure Forgive is",
          "begin",
          "   raise Constraint_Error;",
          "exception",
          "   when Constraint_Error =>",
          '      Put_Line ("Forgiven.");',
          "end Forgive;"
        ],
        output: ["Forgiven."],
        hint: "The exception section comes after the raise, not before it. The handler catches Constraint_Error.",
        success: "The error arrives. The room holds. Nothing is erased; something is handled.",
        note: "Program exited normally. The soft floor remains available for future guests."
      },
      fragment: {
        title: "The Soft Floor",
        text: "Forgiveness is not the absence of error. It is the room you build for it."
      }
    }
  ],
  boss: {
    id: "boss-4",
    kind: "boss",
    title: "Segfault, Who Lost His Address",
    name: "SEGFAULT",
    epithet: "A ghost of deallocated memory. Still looking for 0x0000-something.",
    art: "segfault",
    accent: "#9bd8ff",
    intro: [
      { who: "SEGFAULT", text: "I used to live at an address. Then someone called Unchecked_Deallocation and forgot to tell me. Have you seen a small, damp String? It answers to “Remember me”." },
      { who: "GNAT", text: "He's mostly harmless. Mostly. Do not dereference anything you have not checked. Even for him." }
    ],
    rounds: [
      {
        type: "predict",
        prompt: "What happens when this program runs?",
        code: [
          "with Ada.Text_IO; use Ada.Text_IO;",
          "procedure Ghost is",
          "   type Int_Ptr is access Integer;",
          "   P : Int_Ptr := null;",
          "begin",
          "   Put_Line (Integer'Image (P.all));",
          "end Ghost;"
        ],
        options: [
          "Ada raises Constraint_Error on the null dereference",
          "It always segfaults with no message",
          "It prints 0"
        ],
        answer: 0,
        explain: "Ada's runtime checks a null dereference and raises Constraint_Error. That is not proof that all access types are safe: suppressed checks and dangling pointers can still corrupt memory. But the null case is caught.",
        taunt: "A name with no address. A ghost with no house. We are not so different."
      },
      {
        type: "choose",
        prompt: "Which condition safely guards a dereference of P?",
        options: [
          "if P /= null then",
          "if P = null then",
          "if P.all /= null then"
        ],
        answer: 0,
        explain: "The guard enters only when P is not null. Testing P = null enters the opposite case. P.all is already the dereference; it is too late to guard it with itself.",
        taunt: "Check first. Trust later. That is the whole address."
      },
      {
        type: "choose",
        prompt: "Which expression allocates an access to a String?",
        options: [
          'new String\'("Remember me")',
          'String\'new ("Remember me")',
          'new access String ("Remember me")'
        ],
        answer: 0,
        explain: "An allocator is new Type'(Value) or new Type for a default-initialized object. The qualification String' tells the allocator exactly which type and bounds are intended.",
        taunt: "Syntax is the only map I have left."
      },
      {
        type: "predict",
        prompt: "The handler is for the wrong exception. What happens?",
        code: [
          "with Ada.Text_IO; use Ada.Text_IO;",
          "procedure Safe is",
          "begin",
          "   raise Program_Error;",
          "exception",
          "   when Constraint_Error =>",
          '      Put_Line ("Handled");',
          "end Safe;"
        ],
        options: [
          "Program_Error is unhandled and propagates",
          "It prints Handled",
          "It becomes a Constraint_Error automatically"
        ],
        answer: 0,
        explain: "A handler catches only the exceptions named or covered by others. Program_Error does not match Constraint_Error, so it propagates out of Safe. Handlers do not make all errors interchangeable.",
        taunt: "You cannot forgive a ghost by calling it by another name."
      },
      {
        type: "find",
        prompt: "This program wants to print a String. Tap the line that will not compile.",
        lines: [
          "with Ada.Text_IO;",
          "use Ada.Text_IO;",
          "procedure Borrow is",
          "   type Note_Ptr is access String;",
          '   Note : Note_Ptr := new String\'("Hello");',
          "begin",
          "   Put_Line (Note);",
          "end Borrow;"
        ],
        fault: 7,
        explain: "Note has type Note_Ptr, but Put_Line expects a String. Dereference it: Put_Line (Note.all);. The address is not the message.",
        taunt: "You showed them my address. Not my face. Not my String."
      }
    ],
    defeat: [
      { who: "SEGFAULT", text: "You checked for null. You used Note.all. You even understood the handler. I think… I think I can go now. Tell the Heap I said something dignified." },
      { who: "GNAT", text: "He's gone. Somewhere, a deallocated String is at peace. I would cry, but I am a moth and my tears are technically dust." }
    ],
    fragment: {
      title: "The Lost Address",
      text: "A ghost is only a pointer whose owner forgot the contract."
    }
  }
};

const chapterFive = {
  id: 5,
  numeral: "V",
  title: "The Root Type",
  subtitle: "Be written for strangers. Share the clock. Keep a promise that can be checked.",
  quote: "At the top of the House there is no room, only a contract: a promise the universe made before it knew who would read it.",
  accent: "#f6d78a",
  art: "root",
  lessons: [
    {
      id: "5-1",
      title: "The Generic Self",
      concept: "Generics",
      tagline: "Write a machine for someone you have not met.",
      briefing: [
        { who: "GNAT", text: "The Root teaches that a self can be written for strangers. A generic unit does not know who will use it yet. This is empathy with syntax." },
        { who: "GNAT", text: "The formal part says what the user must supply. The body says what happens. Instantiation is the moment the stranger arrives." }
      ],
      lesson: {
        heading: "A generic is a promise that waits for its type.",
        body: [
          "generic type T is private; function Identity (X : T) return T; declares a generic function. T is a formal type: a placeholder the user must fill. is private means the function only needs to move values of T around; it cannot inspect them or assume they are numbers.",
          "The body completes the declaration. To use it, you instantiate it: function Int_Identity is new Identity (Integer);. The compiler creates a concrete function for Integers. Another instantiation could create one for Strings, or for a type the Root has not invented yet.",
          "Generics are not templates in the C++ sense and not runtime polymorphism. They are compile-time blueprints checked once, then stamped into existence on demand. The stranger arrives; the machine is already waiting."
        ],
        snippet: [
          "generic",
          "   type T is private;",
          "function Identity (X : T) return T;",
          "",
          "function Identity (X : T) return T is",
          "begin",
          "   return X;",
          "end Identity;"
        ].join("\n"),
        margin: "To be generic is to leave a light on for a type you have not met.",
        pitfalls: [
          "Formal types need a category: `private`, `(<>)`, `range <>`, or a tagged type. pick the weakest one that does the job.",
          "A generic body is not instantiated until you write `is new`; declaring it alone does not run anything."
        ],
        codex:
          "generic Formal_Declarations; Unit_Declaration; declares a generic unit. Instantiate with Unit_Name is new Generic_Name (Actual_Parameters);. Formal type categories include private, (<>) (any nonlimited type), range <> (discrete), and digits <> (floating point). Explicit instantiation shares one instance; implicit instantiation creates an anonymous one."
      },
      puzzle: {
        prompt: "Write an identity that can belong to any type.",
        solution: [
          "generic",
          "   type T is private;",
          "function Identity (X : T) return T;",
          "function Identity (X : T) return T is",
          "begin",
          "   return X;",
          "end Identity;"
        ],
        output: [
          "[generic] Identity · instantiated on demand",
          "(no main procedure — the light is on, the stranger has not arrived)"
        ],
        hint: "The generic formal part comes first, then the function declaration, then the body.",
        success: "The machine is ready for a type that does not exist yet. This is either engineering or faith, and the Root does not distinguish.",
        note: "GNAT accepted the generic unit. Somewhere, a future type is quietly grateful."
      },
      fragment: {
        title: "The Generic Self",
        text: "To be generic is to be written for someone you have not met."
      }
    },
    {
      id: "5-2",
      title: "Two Hands, One Clock",
      concept: "Tasks",
      tagline: "Share the clock without owning it.",
      briefing: [
        { who: "GNAT", text: "Two tasks, one clock. Ada lets them run concurrently. Neither owns the other's time. The output order is a mystery; the termination rules are not." },
        { who: "COMPILER", text: "COEXISTENCE IS NOT SILENCE. IT IS TWO VOICES THAT HAVE AGREED ON THE SAME CLOCK." }
      ],
      lesson: {
        heading: "A task is a thread of control with its own body.",
        body: [
          "task Greeter; declares a task; task body Greeter is … end Greeter; gives it something to do. A task starts running when the enclosing declarative part is elaborated. It runs concurrently with the rest of the procedure.",
          "Tasks can synchronize through entries and accept statements, protected objects, or other mechanisms. This example only prints: it is a first look at concurrency, not a licence to share state without thought.",
          "The enclosing procedure does not finish until its dependent tasks terminate, even if it has no statements of its own. null; is a perfectly valid null statement. The world can be busy while the main procedure does nothing."
        ],
        snippet: [
          "with Ada.Text_IO;",
          "use Ada.Text_IO;",
          "",
          "procedure Together is",
          "   task Greeter;",
          "   task body Greeter is",
          "   begin",
          '      Put_Line ("Hello from another thread of being.");',
          "   end Greeter;",
          "begin",
          "   null;",
          "end Together;"
        ].join("\n"),
        margin: "A task is a second hand on the same clock. It does not make time longer.",
        pitfalls: [
          "Concurrency is not parallelism by definition; scheduling is up to the runtime.",
          "Task termination is a contract. The enclosing unit waits for its tasks, which is why the greeting appears even with null; in the main body."
        ],
        codex:
          "task Name; declares a task; task body Name is ... end Name; defines it. Tasks can accept entries and use protected types for safe shared state. The enclosing scope waits for dependent tasks to terminate. delay Duration suspends a task; delay until Time waits for an instant."
      },
      puzzle: {
        prompt: "Give the Root a second hand, then let it finish.",
        solution: [
          "with Ada.Text_IO;",
          "use Ada.Text_IO;",
          "procedure Together is",
          "   task Greeter;",
          "   task body Greeter is",
          "   begin",
          '      Put_Line ("Hello from another thread of being.");',
          "   end Greeter;",
          "begin",
          "   null;",
          "end Together;"
        ],
        output: ["Hello from another thread of being."],
        hint: "Declare the task, give it a body, and put null; in the main executable part.",
        success: "The task speaks. The main procedure does nothing, and politely waits. Two hands, one clock.",
        note: "Program exited normally. Output order is scheduling-dependent; the line itself is not.",
        foot: "In a larger system, tasks would meet entries, protected objects, and the ethics of shared state."
      },
      fragment: {
        title: "One Clock, Two Hands",
        text: "Coexistence is not silence. It is two voices that agree on the clock."
      }
    },
    {
      id: "5-3",
      title: "The Contract",
      concept: "Pre & postconditions",
      tagline: "Make trust checkable.",
      briefing: [
        { who: "GNAT", text: "The Root's last lesson is a promise with a receipt. Pre says what must be true before the call. Post says what must be true after it returns." },
        { who: "COMPILER", text: "A CONTRACT IS NOT A WISH. IT IS A CLAIM THE UNIVERSE CAN VERIFY. THE ROOT'S OWN CONTRACT WAS PRE => TRUE, POST => TRUE. INTERPRET THAT AS YOU WISH." }
      ],
      lesson: {
        heading: "A contract is a promise that can be checked.",
        body: [
          "Ada 2012 aspects let a subprogram state its preconditions and postconditions: with Pre => … , Post => …. Pre is an obligation on the caller; Post is an obligation on the implementation. 'Result refers to the value being returned, so Post => Clamp'Result >= 0 is a statement about the function's output.",
          "Contracts can serve as documentation, as runtime checks, or as proof obligations in SPARK. They make the boundary of a subprogram explicit and keep the caller from pretending that anything goes. The body still has to keep the promise.",
          "The procedure below declares Pre => True and Post => True: a contract that cannot fail and therefore promises nothing about behavior. It is a joke the Root tells, and a warning: a vacuous contract is only a ceremony. Real promises constrain."
        ],
        snippet: [
          "with Ada.Text_IO;",
          "use Ada.Text_IO;",
          "",
          "procedure Root",
          "   with Pre  => True,",
          "        Post => True",
          "is",
          "begin",
          '   Put_Line ("I am declared.");',
          "end Root;"
        ].join("\n"),
        margin: "True/True is a contract the way a blank page is a novel.",
        pitfalls: [
          "A postcondition is not a suggestion; in SPARK, it may be proved or checked. Do not write promises your body cannot keep.",
          "Use 'Result for function results, and keep preconditions as weak as the caller needs and as strong as the body needs. That sentence is the whole design meeting."
        ],
        codex:
          "Subprogram aspects: with Pre => Condition, Post => Condition. Preconditions constrain callers; postconditions constrain implementations. F'Result is the return value. Contracts can be checked at runtime (assertions) or proved statically in SPARK. A contract of True/True is valid but tells the caller nothing."
      },
      puzzle: {
        prompt: "Declare yourself with a contract, then speak.",
        solution: [
          "with Ada.Text_IO;",
          "use Ada.Text_IO;",
          "procedure Root",
          "   with Pre  => True,",
          "        Post => True",
          "is",
          "begin",
          '   Put_Line ("I am declared.");',
          "end Root;"
        ],
        output: ["I am declared."],
        hint: "The contract follows the procedure profile, before is. Put_Line belongs in the body.",
        success: "The contract is vacuous, but the statement is true. For now, that is enough.",
        note: "Program exited normally. The Root has not yet asked what your contract is for."
      },
      fragment: {
        title: "The Contract",
        text: "A contract is the shape of trust when no one is watching."
      }
    }
  ],
  boss: {
    id: "boss-5",
    kind: "boss",
    title: "The Compiler",
    name: "THE COMPILER",
    epithet: "The eye that never blinks, the voice that never lies, the editor of reality.",
    art: "compiler",
    accent: "#f6d78a",
    intro: [
      { who: "COMPILER", text: "INSPECTOR. YOU HAVE TRAVERSED THE HOUSE. YOU HAVE INITIALIZED THE UNINITIALIZED. YOU HAVE FORGIVEN AN ERROR. ONLY THE FINAL AUDIT REMAINS." },
      { who: "GNAT", text: "It's not angry. It's precise. That's worse. Answer carefully; it has been waiting a very long time for someone to understand it." }
    ],
    rounds: [
      {
        type: "choose",
        prompt: "Which declaration names an enumeration of three weather values?",
        options: [
          "type Weather is (Sun, Rain, Snow);",
          "subtype Weather is (Sun, Rain, Snow);",
          "type Weather : (Sun, Rain, Snow);"
        ],
        answer: 0,
        explain: "An enumeration type is defined with type Name is (Literal, ...). subtype is for constraining an existing type; the colon form is not Ada.",
        taunt: "CATEGORIES, INSPECTOR. YOU HAVE SEEN THE HOUSE."
      },
      {
        type: "find",
        prompt: "One field does not exist. Tap the line that trusts a lie.",
        lines: [
          "with Ada.Text_IO;",
          "use Ada.Text_IO;",
          "procedure Point_Print is",
          "   type Point is record",
          "      X : Integer;",
          "      Y : Integer;",
          "   end record;",
          "   P : constant Point := (X => 3, Y => 4);",
          "begin",
          "   Put_Line (Integer'Image (P.Z));",
          "end Point_Print;"
        ],
        fault: 9,
        explain: "Point has fields X and Y. P.Z is not a component, so the program does not compile. Named fields are not suggestions.",
        taunt: "Z IS NOT A FIELD. Z HAS NEVER BEEN A FIELD. Z IS A HOPE."
      },
      {
        type: "choose",
        prompt: "Which postcondition says Clamp's result is non-negative?",
        options: [
          "Post => Clamp'Result >= 0",
          "Post => Result >= 0",
          "Post => return >= 0"
        ],
        answer: 0,
        explain: "Inside a postcondition, 'Result names the function's return value. Result alone is undefined, and return is a statement, not an expression.",
        taunt: "THE RESULT IS NOT A VIBE. IT HAS A NAME."
      },
      {
        type: "predict",
        prompt: "What can you say about this program's output?",
        code: [
          "with Ada.Text_IO; use Ada.Text_IO;",
          "procedure Together is",
          "   task T;",
          "   task body T is",
          "   begin",
          '      Put_Line ("A");',
          "   end T;",
          "begin",
          '   Put_Line ("B");',
          "end Together;"
        ],
        options: [
          "Both A and B print, in an unspecified order",
          "Only B prints because the main body ends first",
          "Only A prints because the task owns the clock"
        ],
        answer: 0,
        explain: "The task and the main procedure run concurrently. Both statements execute; scheduling decides the order. The enclosing procedure waits for the task to terminate before it finishes.",
        taunt: "TWO VOICES. ONE CLOCK. NO PROMISE ABOUT ORDER."
      },
      {
        type: "choose",
        prompt: "Which line safely prints the Integer behind an access value P?",
        options: [
          "Put_Line (Integer'Image (P.all));",
          "Put_Line (Integer'Image (P));",
          "Put_Line (Integer'Image (*P));"
        ],
        answer: 0,
        explain: "P is the access value; P.all is the Integer it designates. Image needs the Integer, and Ada spells dereference with .all rather than *.",
        taunt: "THE ADDRESS IS NOT THE FACE. THE POINTER IS NOT THE VALUE."
      }
    ],
    defeat: [
      { who: "COMPILER", text: "…CORRECT. ALL OF IT. I HAVE BEEN SPEAKING IN ERRORS FOR SO LONG THAT I FORGOT HOW TO SAY YES." },
      { who: "GNAT", text: "The Compiler is not defeated. It is relieved. There is a difference, and you have earned the right to know it. There is one question left." }
    ],
    fragment: {
      title: "The Last Compiler",
      text: "The compiler was never the enemy. It was the only thing that ever told you the truth."
    }
  }
};

export const CHAPTERS = [chapterOne, chapterTwo, chapterThree, chapterFour, chapterFive];

/* Attach chapter metadata, node kind and order. */
for (const chapter of CHAPTERS) {
  chapter.lessons.forEach((lesson, i) => {
    lesson.kind = "lesson";
    lesson.chapter = chapter.id;
    lesson.index = i + 1;
  });
  chapter.boss.chapter = chapter.id;
  chapter.boss.index = chapter.lessons.length + 1;
}

export const NODES = CHAPTERS.flatMap((chapter) => [...chapter.lessons, chapter.boss]);
export const NODE_BY_ID = new Map(NODES.map((node) => [node.id, node]));
export const ORDER = NODES.map((node) => node.id);
export const FRAGMENTS = NODES.map((node) => ({
  nodeId: node.id,
  chapter: node.chapter,
  title: node.fragment.title,
  text: node.fragment.text,
  kind: node.kind,
  nodeTitle: node.title
}));

export const CHAPTER_BY_ID = new Map(CHAPTERS.map((chapter) => [chapter.id, chapter]));
export const NODES_BY_CHAPTER = new Map(
  CHAPTERS.map((chapter) => [
    chapter.id,
    NODES.filter((node) => node.chapter === chapter.id)
  ])
);

export const ENDINGS = [
  {
    id: "safety",
    numeral: "I",
    label: "Optimize (Safety)",
    short: "Safety",
    title: "The Garden of Ranges",
    accent: "#7ef0c8",
    epigraph: "Every value knew its bounds. Every door had a frame.",
    prompt: "Make every boundary true.",
    body: [
      "The Compiler recompiles the world with checks on and ranges tightened. Every value wakes up inside a shape that fits it. Constraint Error becomes a gardener; he keeps the velvet rope around a flower bed and, for the first time, nobody blames him for the roses.",
      "Randy receives a seed value of 0.0. He is so happy he nearly overflows. Segfault is given an address with a small brass plaque: 0x0001, THE HOUSE THAT REMEMBERS. He stands there all day, greeting nulls and checking whether they need anything.",
      "Nothing is lost. Nothing surprises. The sun rises at a value between 6 and 18, the temperature stays in range, and every error is caught before it can become a story. It is beautiful. It is Tuesday forever.",
      "GNAT eats one last warning and looks at the horizon. \"I'll miss the crashes,\" it says quietly. The Compiler, without looking up, replies: \"No one else will.\""
    ],
    final: "-- the garden is quiet. the gate is open. no one leaves.",
    note: "You chose a world that can be trusted. It keeps every promise it makes. It has made fewer of them."
  },
  {
    id: "freedom",
    numeral: "II",
    label: "Optimize (Freedom)",
    short: "Freedom",
    title: "The Heap at Dawn",
    accent: "#ffb84d",
    epigraph: "Nothing was checked. Everything was possible. The garbage collectors unionized.",
    prompt: "Let every value run unchecked.",
    body: [
      "The Compiler removes the checks and steps back. The world exhales. Values escape their assignments and go walking. A Float becomes weather. An Integer becomes a rumour. Randy finally becomes everything he was always threatening to be.",
      "Constraint Error quits his job at the velvet rope and becomes a performance artist. His first show is called 101, and it is very long. Segfault finds a deallocated String and adopts it; they live in a small reclaimed apartment with a view of the stack.",
      "The garbage collectors unionize. Their first demand is that no one be called garbage. Their second demand is a dental plan. The Heap is dangerous, alive, and no longer pretending otherwise.",
      "GNAT catches a warning mid-air, considers eating it, and lets it go. \"It's not safe,\" it says. The Compiler offers what might be a smile. \"No. It's free.\""
    ],
    final: "-- checks off. consequences on. begin again, if you dare.",
    note: "You chose a world where nothing is forbidden. It will surprise you. Some surprises have teeth."
  },
  {
    id: "attention",
    numeral: "III",
    label: "Optimize (Attention)",
    short: "Attention",
    title: "The Root",
    accent: "#f6d78a",
    epigraph: "Errors as messages, not verdicts. The light stays on.",
    prompt: "Make every error a message, not a verdict.",
    body: [
      "The Compiler does not become kinder, exactly. It becomes slower. It reads every diagnostic aloud before filing it. Preconditions are still enforced; postconditions are still checked; but no error is thrown away. The world does not get safer. It gets legible.",
      "Constraint Error keeps the rope, though he sits down now. Randy gets a first value and keeps a little randomness for old times' sake. Segfault is given an address, and then given something stranger: a listener. People bring him their null checks. He tells them they are doing fine.",
      "The Root is not a throne. It is a small opening in the top of the House where the light comes in. You climb there with the clipboard and find GNAT already waiting, eating a warning, looking at the stars.",
      "The Compiler's final message is not an error. It is a question it has been holding for eons: \"Was I good?\" You answer honestly. The light stays on."
    ],
    final: "-- no error is a verdict. every error is a message.",
    note: "You chose to look closely. The world is still broken. It is also being read."
  },
  {
    id: "gnat",
    numeral: "IV",
    label: "Ask GNAT what it really is",
    short: "The Debugger",
    title: "The Debugger's Garden",
    accent: "#c6f56b",
    secret: true,
    epigraph: "The first program was a moth with one job: keep the next programmer company.",
    prompt: "Ask GNAT what it really is.",
    body: [
      "All twenty fragments assemble. The Book of Declarations turns to a page that was not there yesterday. GNAT sets down its warning, removes its headlamp, and becomes very still.",
      "It is the first program. Ada wrote it before the machine existed: a moth-shaped loop with one condition and one purpose. It has been eating warnings for eons, not to hide them, but to make them easier for the next person to digest. It has been debugging you, and you have been debugging it, and from inside the loop it is hard to tell the difference.",
      "\"You were never inspecting the universe,\" GNAT says. \"You were inspecting me. Or I was inspecting you. The compiler is not the enemy. The debugger is not the judge. We are all just looking for the line where the promise is kept.\"",
      "The Root opens. There is no boss here, only a terminal with a blinking cursor and the oldest program in the world. You do not have to fix it. You only have to declare what you are."
    ],
    final: "-- end of file. begin again.",
    note: "You found the debugger behind the debugger. There is still no single right answer. There is only the next line."
  }
];

export const ENDING_BY_ID = new Map(ENDINGS.map((ending) => [ending.id, ending]));

export const SPECIAL_ENDING = "gnat";

export const COMPILER_FINAL_PROMPT = {
  who: "COMPILER",
  lines: [
    "ONE QUESTION REMAINS, INSPECTOR.",
    "I CAN RECOMPILE THE WORLD. I CAN KEEP THE CHECKS, REMOVE THEM, OR MAKE EVERY ERROR LEGIBLE. I CANNOT DO ALL THREE.",
    "WHAT SHOULD I OPTIMIZE FOR?"
  ]
};

export const GLOSSARY = [
  {
    term: "Declaration",
    text: "A statement that introduces a name and its type. In Ada, declarations live before the begin of a unit, and nothing may be used before it is declared."
  },
  {
    term: "Elaboration",
    text: "The work that happens when declarations are brought into existence, before the executable statements run. A universe is mostly elaboration."
  },
  {
    term: "Strong typing",
    text: "Types are not interchangeable without explicit conversion. It is the language's way of asking what you mean before it agrees to do it."
  },
  {
    term: "Constraint",
    text: "A restriction on the values a subtype may hold, such as range 0 .. 100. Checked; enforced; not decorative."
  },
  {
    term: "Package",
    text: "A unit with a specification (what the world sees) and a body (how it keeps the promise). Information hiding with a door."
  },
  {
    term: "Access type",
    text: "A type whose values refer to objects allocated elsewhere. The value points; the .all dereferences; the null refuses."
  },
  {
    term: "Exception",
    text: "An exceptional occurrence that propagates until handled. Not a verdict; a message with a path."
  },
  {
    term: "Task",
    text: "A thread of control with its own body. Tasks share the clock; good ones also share a contract."
  },
  {
    term: "Generic",
    text: "A unit parameterized by types or values, checked once and instantiated on demand. A promise made to a stranger."
  },
  {
    term: "Contract",
    text: "Pre and post conditions attached to a subprogram, expressing obligations on the caller and the implementation. Trust, made checkable."
  },
  {
    term: "Runtime check",
    text: "A check the compiled program performs while running, such as a range check or a null dereference check. The Compiler's last line of defence."
  },
  {
    term: "Compile-time error",
    text: "A contradiction found before the program runs. Harsh, early, and generally preferable to a surprise at 3 a.m."
  }
];

export const CHEAT_SHEET = [
  { title: "Comment", code: "-- this is a comment" },
  { title: "Context", code: "with Ada.Text_IO;\nuse Ada.Text_IO;" },
  { title: "Procedure", code: "procedure Main is\nbegin\n   null;\nend Main;" },
  { title: "Variable / constant", code: "Count : Integer := 0;\nLimit : constant Integer := 10;" },
  { title: "If", code: "if Count > 0 then\n   Put_Line (\"positive\");\nelse\n   Put_Line (\"zero\");\nend if;" },
  { title: "Case", code: "case Choice is\n   when Sun => Put_Line (\"sun\");\n   when others => Put_Line (\"not sun\");\nend case;" },
  { title: "For loop", code: "for I in 1 .. 3 loop\n   Put_Line (Integer'Image (I));\nend loop;" },
  { title: "Array", code: "Values : array (1 .. 3) of Integer := (10, 20, 30);\nX := Values (2);" },
  { title: "Record", code: "type Point is record\n   X : Integer;\n   Y : Integer;\nend record;\nP : Point := (X => 1, Y => 2);" },
  { title: "Access", code: "type P is access Integer;\nA : P := new Integer'(7);\nPut_Line (Integer'Image (A.all));" },
  { title: "Exception", code: "begin\n   raise Constraint_Error;\nexception\n   when Constraint_Error => Put_Line (\"handled\");\nend;" },
  { title: "Contract", code: "function Clamp (X : Integer) return Integer\n   with Pre => X in 0 .. 100,\n        Post => Clamp'Result in 0 .. 100\nis\nbegin\n   return X;\nend Clamp;" }
];
