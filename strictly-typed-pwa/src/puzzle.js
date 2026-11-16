/* Pure game rules. No DOM, no storage: tests can run this in Node directly. */

export function hashString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle(items, seed) {
  const out = items.slice();
  const random = mulberry32(typeof seed === "number" ? seed : hashString(String(seed)));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Shuffle the canonical lines, never returning the solution order verbatim. */
export function createCards(solution, seed) {
  if (solution.length < 2) return solution.slice();
  let cards = seededShuffle(solution, seed);
  if (cards.every((line, i) => line === solution[i])) {
    cards = [cards[cards.length - 1], ...cards.slice(0, -1)];
  }
  return cards;
}

/** 3: flawless; 2: a little help; 1: you got there. */
export function starsFor(mistakes, hints) {
  if (mistakes === 0 && hints === 0) return 3;
  if (mistakes <= 2 && hints <= 1) return 2;
  return 1;
}

export function bossStars(heartsLeft) {
  return Math.max(1, Math.min(3, heartsLeft));
}

export function bossAnswer(round, choice) {
  if (round.type === "find") return choice === round.fault;
  return choice === round.answer;
}

export function bossAnswerIndex(round) {
  return round.type === "find" ? round.fault : round.answer;
}

/** A context-aware nudge that never spells out the whole answer. */
export function wrongLineHint(line, expected) {
  const got = line.trim();
  const want = expected.trim();

  if (want.startsWith("with ")) {
    return "The file begins with the library it needs. `with` comes before everything else.";
  }
  if (got.startsWith("with ")) {
    return "Context clauses come first — before the procedure, the package, or any declaration.";
  }
  if (want === "use Ada.Text_IO;") {
    return "After `with` brings the package into view, `use` makes its names directly visible.";
  }
  if (want === "begin") {
    return "The declarations are not executable. `begin` opens the part that actually runs.";
  }
  if (got === "begin") {
    return "`begin` arrives after the declarations. The Void needs its names before its actions.";
  }
  if (got.startsWith("end ") || got === "end;") {
    if (want.startsWith("end ")) {
      return "The `end` must close the most recent unit first. Which unit is still open?";
    }
    return "An `end` is trying to close something that has not been opened yet. Read upwards.";
  }
  if (want.startsWith("end ") || want === "end;") {
    return "Something is still open. Every `begin`, `if`, `loop`, `case`, record and unit has an end.";
  }
  if (got.startsWith("Put_Line") && want !== "") {
    return "`Put_Line` is a statement. It belongs after `begin`, inside the executable part.";
  }
  if (want.startsWith("Put_Line")) {
    return "The output statement comes after the structure that makes it legal. Keep building the skeleton.";
  }
  if (got.includes(":=") && got.includes("constant")) {
    return "A constant gets one value at declaration. You cannot assign to it later.";
  }
  if (got.includes(":=") && want.includes(": ")) {
    return "Declarations come before `begin`; assignments come after it. Ada has a place for everything.";
  }
  if (got.startsWith("procedure ") || got.startsWith("function ") || got.startsWith("package ")) {
    return "That declaration belongs earlier, before the executable part opens.";
  }
  if (got.startsWith("if ") || got.startsWith("for ") || got.startsWith("while ") || got.startsWith("case ")) {
    return "Control flow needs the declarations and `begin` around it before it can take a step.";
  }
  if (got.startsWith("return ")) {
    return "A `return` is executable: it belongs inside the function body, after `begin`.";
  }
  if (got.startsWith("raise ") || got.startsWith("exception")) {
    return "The `raise` goes inside the block; the `exception` section follows the block's statements.";
  }
  if (got.startsWith("when ")) {
    return "A `when` belongs inside a `case` or an exception handler. Find the room it fits in.";
  }
  if (got.startsWith("task ") || got.startsWith("generic") || got.startsWith("type ")) {
    return "This is a declaration. It wants the declarative part, before the body starts doing things.";
  }
  return "The compiler rejects this line here. Read what is still open, and place the next structural piece.";
}
