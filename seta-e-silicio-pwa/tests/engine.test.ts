import { describe, expect, it } from "vitest";
import { CHAPTERS, CHARACTERS, ENDINGS, JOURNAL } from "../src/data/story";
import type { StoryState } from "../src/data/types";
import {
  activeJournal,
  activeNode,
  advanceChapter,
  advanceDialogue,
  availableHotspots,
  canRewind,
  chooseOption,
  currentChapter,
  endingFor,
  findDialogue,
  initialState,
  isChapterComplete,
  rewindDialogue,
  startDialogue,
  visibleChoices
} from "../src/game/engine";

function runDialogue(state: StoryState, id: string, picks: string[] = []): StoryState {
  let next = startDialogue(state, id);
  let guard = 0;
  const queue = [...picks];
  while (next.dialogue && guard < 40) {
    guard += 1;
    const node = activeNode(next);
    if (!node) throw new Error(`No active node in ${id}`);
    if (node.choices?.length) {
      const choices = visibleChoices(next).filter((view) => !view.locked);
      const wanted = queue.shift();
      const pick = (wanted ? choices.find((view) => view.choice.id === wanted) : undefined) ?? choices[0];
      if (!pick) throw new Error(`No available choice in ${id} at ${node.id}`);
      next = chooseOption(next, pick.choice.id);
    } else {
      next = advanceDialogue(next);
    }
  }
  if (guard >= 40) throw new Error(`Dialogue ${id} did not terminate`);
  return next;
}

describe("story data", () => {
  it("has five chapters, each with a complete cast of dialogues and hotspots", () => {
    expect(CHAPTERS).toHaveLength(5);
    expect(CHAPTERS.map((chapter) => chapter.number)).toEqual([1, 2, 3, 4, 5]);
    for (const chapter of CHAPTERS) {
      expect(chapter.dialogues.length).toBeGreaterThan(3);
      expect(chapter.hotspots.length).toBeGreaterThan(3);
      for (const dialogue of chapter.dialogues) {
        expect(dialogue.chapter).toBe(chapter.id);
        expect(findDialogue(dialogue.id)).toBe(dialogue);
      }
      for (const hotspot of chapter.hotspots) {
        expect(hotspot.chapter).toBe(chapter.id);
        if (hotspot.dialogueId) expect(findDialogue(hotspot.dialogueId)?.chapter).toBe(chapter.id);
      }
    }
  });

  it("has valid node links, choices and localized text", () => {
    const ids = new Set<string>();
    for (const chapter of CHAPTERS) {
      for (const dialogue of chapter.dialogues) {
        expect(ids.has(dialogue.id)).toBe(false);
        ids.add(dialogue.id);
        const nodeIds = new Set(dialogue.nodes.map((node) => node.id));
        expect(nodeIds.size).toBe(dialogue.nodes.length);
        expect(nodeIds.has(dialogue.start)).toBe(true);
        for (const node of dialogue.nodes) {
          expect(node.text.it.length).toBeGreaterThan(0);
          expect(node.text.en.length).toBeGreaterThan(0);
          if (node.next) expect(nodeIds.has(node.next)).toBe(true);
          for (const choice of node.choices ?? []) {
            expect(choice.text.it.length).toBeGreaterThan(0);
            expect(choice.text.en.length).toBeGreaterThan(0);
            if (choice.next) expect(nodeIds.has(choice.next)).toBe(true);
            if (choice.ending) expect(ENDINGS[choice.ending]).toBeDefined();
          }
        }
      }
    }
  });

  it("keeps every journal requirement backed by a fact or flag used in the story", () => {
    const facts = new Set<string>();
    const flags = new Set<string>();
    for (const chapter of CHAPTERS) {
      for (const dialogue of chapter.dialogues) {
        for (const node of dialogue.nodes) {
          (node.effects?.facts ?? []).forEach((fact) => facts.add(fact));
          (node.effects?.flags ?? []).forEach((flag) => flags.add(flag));
          for (const choice of node.choices ?? []) {
            (choice.effects?.facts ?? []).forEach((fact) => facts.add(fact));
            (choice.effects?.flags ?? []).forEach((flag) => flags.add(flag));
          }
        }
        (dialogue.onEnd?.facts ?? []).forEach((fact) => facts.add(fact));
        (dialogue.onEnd?.flags ?? []).forEach((flag) => flags.add(flag));
      }
    }
    for (const entry of JOURNAL) {
      for (const fact of entry.requires?.facts ?? []) expect(facts.has(fact)).toBe(true);
      for (const flag of entry.requires?.flags ?? []) expect(flags.has(flag)).toBe(true);
    }
  });

  it("has a character record for every speaker and a complete ending set", () => {
    for (const chapter of CHAPTERS) {
      for (const dialogue of chapter.dialogues) {
        for (const node of dialogue.nodes) expect(CHARACTERS[node.speaker]).toBeDefined();
      }
    }
    expect(Object.keys(ENDINGS).sort()).toEqual(["archive", "community", "release"]);
    for (const ending of Object.values(ENDINGS)) {
      expect(ending.title.it.length).toBeGreaterThan(2);
      expect(ending.title.en.length).toBeGreaterThan(2);
      expect(ending.epilogue.length).toBeGreaterThan(1);
    }
  });
});

describe("engine: start, facts and locked choices", () => {
  it("starts a dialogue and applies facts when their node is entered", () => {
    const state = startDialogue(initialState(), "d1_photo");
    expect(state.dialogue?.dialogueId).toBe("d1_photo");
    expect(activeNode(state)?.id).toBe("d1p_1");
    const next = advanceDialogue(state);
    expect(activeNode(next)?.id).toBe("d1p_2");
    expect(next.facts).toContain("flood1998");
    expect(next.facts).toContain("heronPromise");
  });

  it("rejects a dialogue from another chapter and a completed optional one", () => {
    const state = initialState();
    expect(() => startDialogue(state, "d2_chen")).toThrow(/another chapter/);
    const completed = runDialogue(state, "d1_photo");
    expect(() => startDialogue(completed, "d1_photo")).toThrow(/already completed/);
  });

  it("hides a locked option with no hint and exposes a hinted locked option", () => {
    const state: StoryState = { ...initialState(), chapter: 5 };
    let run = startDialogue(state, "d5_final");
    let node = activeNode(run);
    let guard = 0;
    while (node && !node.choices && guard < 10) {
      run = advanceDialogue(run);
      node = activeNode(run);
      guard += 1;
    }
    expect(node?.choices?.length).toBe(3);
    const views = visibleChoices(run);
    const community = views.find((view) => view.choice.id === "community");
    expect(community).toBeDefined();
    expect(community?.locked).toBe(true);
    expect(community?.choice.lockedHint).toBeDefined();
    expect(() => chooseOption(run, "community")).toThrow(/locked/);
  });

  it("unlocks the community ending when the required facts and flags are present", () => {
    let state: StoryState = {
      ...initialState(),
      chapter: 5,
      facts: ["nainaiWish"],
      flags: ["helpedFeng", "metChen"]
    };
    state = startDialogue(state, "d5_final");
    let guard = 0;
    while (activeNode(state)?.id !== "d5f_4" && guard < 10) {
      state = advanceDialogue(state);
      guard += 1;
    }
    const community = visibleChoices(state).find((view) => view.choice.id === "community");
    expect(community?.locked).toBe(false);
    state = chooseOption(state, "community");
    expect(state.finalChoice).toBe("community");
    expect(endingFor(state)?.id).toBe("community");
  });
});

describe("engine: rewind", () => {
  it("rewinds during a dialogue, keeps facts, clears flags and counts the use", () => {
    let state = startDialogue(initialState(), "d1_nainai");
    let guard = 0;
    while (!activeNode(state)?.choices && guard < 10) {
      state = advanceDialogue(state);
      guard += 1;
    }
    state = chooseOption(state, "force");
    expect(state.flags).toContain("nainaiHurt");
    state = advanceDialogue(state);
    expect(state.dialogue).toBeNull();
    expect(canRewind(state)).toBe(true);
    state = rewindDialogue(state);
    expect(state.dialogue?.dialogueId).toBe("d1_nainai");
    expect(state.dialogue?.rewound).toBe(true);
    expect(state.flags).not.toContain("nainaiHurt");
    expect(state.rewinds).toBe(1);
    expect(state.lastDialogue).toBeNull();
  });

  it("keeps a fact learned in the abandoned branch after rewinding", () => {
    let state = startDialogue(initialState(), "d1_photo");
    state = advanceDialogue(state);
    expect(state.facts).toContain("flood1998");
    state = rewindDialogue(state);
    expect(state.facts).toContain("flood1998");
    expect(state.dialogue?.nodeId).toBe("d1p_1");
  });

  it("allows a retryable dialogue to be started again after a bad end", () => {
    let state = startDialogue(initialState(), "d1_nainai");
    let guard = 0;
    while (!activeNode(state)?.choices && guard < 10) {
      state = advanceDialogue(state);
      guard += 1;
    }
    state = chooseOption(state, "force");
    state = advanceDialogue(state);
    expect(state.completed).toContain("d1_nainai");
    const retry = startDialogue(state, "d1_nainai");
    expect(retry.dialogue?.dialogueId).toBe("d1_nainai");
  });
});

describe("engine: chapter progress and endings", () => {
  it("completes chapter one only through the empathic choice", () => {
    let state = runDialogue(initialState(), "d1_photo");
    state = runDialogue(state, "d1_nainai", ["empathy"]);
    expect(state.flags).toContain("chapterComplete:alba");
    expect(state.facts).toContain("nainaiAcceptsHao");
    expect(isChapterComplete(state, currentChapter(state))).toBe(true);
    expect(advanceChapter(state).chapter).toBe(2);
  });

  it("does not advance a chapter that is not complete", () => {
    const state = initialState();
    expect(advanceChapter(state).chapter).toBe(1);
  });

  it("reaches the community ending through a coherent five-episode path", () => {
    let state: StoryState = initialState();
    state = runDialogue(state, "d1_photo");
    state = runDialogue(state, "d1_hao", ["stop"]);
    state = runDialogue(state, "d1_nainai", ["empathy"]);
    expect(isChapterComplete(state, currentChapter(state))).toBe(true);
    state = advanceChapter(state);

    state = runDialogue(state, "d2_chen", ["robots"]);
    state = runDialogue(state, "d2_feng", ["listen", "encourage"]);
    state = runDialogue(state, "d2_shen", ["wait"]);
    expect(state.flags).toContain("metChen");
    expect(state.flags).toContain("helpedFeng");
    expect(isChapterComplete(state, currentChapter(state))).toBe(true);
    state = advanceChapter(state);

    state = runDialogue(state, "d3_voice");
    state = runDialogue(state, "d3_hao", ["ask"]);
    state = runDialogue(state, "d3_zhou", ["consent"]);
    expect(state.facts).toContain("nainaiWish");
    expect(state.flags).toContain("haoConsent");
    expect(isChapterComplete(state, currentChapter(state))).toBe(true);
    state = advanceChapter(state);

    state = runDialogue(state, "d4_umbrella");
    state = runDialogue(state, "d4_bridge", ["hao"]);
    expect(state.facts).toContain("rescuedNainai");
    expect(isChapterComplete(state, currentChapter(state))).toBe(true);
    state = advanceChapter(state);

    state = runDialogue(state, "d5_hao", ["yes"]);
    state = runDialogue(state, "d5_final", ["community"]);
    expect(state.finalChoice).toBe("community");
    expect(endingFor(state)?.id).toBe("community");
    expect(activeJournal(state).some((entry) => entry.id === "j-final")).toBe(true);
  });

  it("supports the archive and release endings directly", () => {
    for (const choice of ["archive", "release"] as const) {
      let state: StoryState = { ...initialState(), chapter: 5 };
      state = startDialogue(state, "d5_final");
      let guard = 0;
      while (activeNode(state)?.id !== "d5f_4" && guard < 10) {
        state = advanceDialogue(state);
        guard += 1;
      }
      state = chooseOption(state, choice);
      expect(state.finalChoice).toBe(choice);
      expect(endingFor(state)?.id).toBe(choice);
    }
  });

  it("exposes only available hotspots, keeping retryable scenes and sitting spots", () => {
    let state = runDialogue(initialState(), "d1_photo");
    state = { ...state, completed: [...state.completed, "d1_nainai"] };
    const hotspots = availableHotspots(state, currentChapter(state));
    expect(hotspots.some((hotspot) => hotspot.id === "nainai")).toBe(true);
    expect(hotspots.some((hotspot) => hotspot.id === "photo")).toBe(false);
  });
});
