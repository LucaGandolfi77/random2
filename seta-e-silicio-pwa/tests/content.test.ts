import { describe, expect, it } from "vitest";
import { CHAPTERS, ENDINGS } from "../src/data/story";
import type { StoryState } from "../src/data/types";
import { activeNode, advanceDialogue, chooseOption, initialState, startDialogue, visibleChoices } from "../src/game/engine";

function allFactsAndFlags(): { facts: string[]; flags: string[] } {
  const facts = new Set<string>();
  const flags = new Set<string>();
  const absorb = (effects?: { facts?: string[]; flags?: string[] }) => {
    (effects?.facts ?? []).forEach((fact) => facts.add(fact));
    (effects?.flags ?? []).forEach((flag) => flags.add(flag));
  };
  for (const chapter of CHAPTERS) {
    for (const dialogue of chapter.dialogues) {
      absorb(dialogue.onEnd);
      for (const node of dialogue.nodes) {
        absorb(node.effects);
        for (const choice of node.choices ?? []) absorb(choice.effects);
      }
    }
  }
  return { facts: [...facts], flags: [...flags] };
}

function playDialogue(state: StoryState, id: string): StoryState {
  let run = startDialogue(state, id);
  let guard = 0;
  while (run.dialogue && guard < 60) {
    guard += 1;
    const node = activeNode(run);
    if (!node) throw new Error(`missing node in ${id}`);
    if (node.choices?.length) {
      const choice = visibleChoices(run).find((view) => !view.locked);
      if (!choice) throw new Error(`dead end in ${id} at ${node.id}`);
      run = chooseOption(run, choice.choice.id);
    } else {
      run = advanceDialogue(run);
    }
  }
  if (guard >= 60) throw new Error(`loop in ${id}`);
  return run;
}

describe("content completeness", () => {
  it("can play every dialogue to an end with a fully informed state", () => {
    const { facts, flags } = allFactsAndFlags();
    for (const chapter of CHAPTERS) {
      for (const dialogue of chapter.dialogues) {
        const state: StoryState = {
          ...initialState(),
          chapter: chapter.number,
          facts,
          flags,
          completed: []
        };
        const result = playDialogue(state, dialogue.id);
        expect(result.dialogue).toBeNull();
        expect(result.completed).toContain(dialogue.id);
      }
    }
  });

  it("has no ending id without a matching final choice", () => {
    expect(Object.keys(ENDINGS)).toEqual(["archive", "release", "community"]);
    for (const ending of Object.values(ENDINGS)) {
      expect(ending.body.it.length).toBeGreaterThan(80);
      expect(ending.body.en.length).toBeGreaterThan(80);
      expect(ending.epilogue.length).toBe(3);
    }
  });
});
