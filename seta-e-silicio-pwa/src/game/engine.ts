import { CHAPTERS, ENDINGS, JOURNAL, chapterByNumber, chapterById } from "../data/story";
import type {
  Chapter,
  ChoiceView,
  Dialogue,
  Effects,
  Ending,
  JournalEntry,
  Requirements,
  StoryNode,
  StoryState
} from "../data/types";

export const START_CHAPTER = 1;

export function initialState(): StoryState {
  return {
    version: 1,
    chapter: START_CHAPTER,
    facts: [],
    flags: [],
    completed: [],
    rewinds: 0,
    dialogue: null,
    lastDialogue: null,
    finalChoice: null
  };
}

export function currentChapter(state: StoryState): Chapter {
  const chapter = chapterByNumber(state.chapter);
  if (!chapter) throw new Error(`Unknown chapter ${state.chapter}`);
  return chapter;
}

export function findDialogue(id: string): Dialogue | undefined {
  for (const chapter of CHAPTERS) {
    const dialogue = chapter.dialogues.find((entry) => entry.id === id);
    if (dialogue) return dialogue;
  }
  return undefined;
}

export function requireDialogue(id: string): Dialogue {
  const dialogue = findDialogue(id);
  if (!dialogue) throw new Error(`Unknown dialogue ${id}`);
  return dialogue;
}

export function findNode(dialogue: Dialogue, nodeId: string): StoryNode | undefined {
  return dialogue.nodes.find((node) => node.id === nodeId);
}

export function requirementsMet(state: StoryState, requirements?: Requirements): boolean {
  if (!requirements) return true;
  const facts = requirements.facts ?? [];
  const flags = requirements.flags ?? [];
  return facts.every((fact) => state.facts.includes(fact)) && flags.every((flag) => state.flags.includes(flag));
}

function applyEffects(state: StoryState, effects?: Effects): StoryState {
  if (!effects) return state;
  const facts = new Set(state.facts);
  const flags = new Set(state.flags);
  for (const fact of effects.facts ?? []) facts.add(fact);
  for (const flag of effects.flags ?? []) flags.add(flag);
  for (const flag of effects.removeFlags ?? []) flags.delete(flag);
  return { ...state, facts: [...facts], flags: [...flags] };
}

function addCompleted(state: StoryState, id: string): StoryState {
  if (state.completed.includes(id)) return state;
  return { ...state, completed: [...state.completed, id] };
}

function enterNode(state: StoryState, dialogue: Dialogue, nodeId: string): StoryState {
  const node = findNode(dialogue, nodeId);
  if (!node) throw new Error(`Unknown node ${nodeId} in ${dialogue.id}`);
  const withEffects = applyEffects(state, node.effects);
  return {
    ...withEffects,
    dialogue: {
      dialogueId: dialogue.id,
      nodeId,
      baseFlags: state.dialogue?.baseFlags ?? [...state.flags],
      baseCompleted: state.dialogue?.baseCompleted ?? [...state.completed],
      rewound: state.dialogue?.rewound ?? false
    }
  };
}

export function startDialogue(state: StoryState, dialogueId: string): StoryState {
  if (state.dialogue) throw new Error("A dialogue is already open");
  const dialogue = requireDialogue(dialogueId);
  const chapter = chapterById(dialogue.chapter);
  if (!chapter || chapter.number !== state.chapter) throw new Error("Dialogue belongs to another chapter");
  if (state.completed.includes(dialogue.id) && !dialogue.retryable) throw new Error("Dialogue already completed");

  const runtimeState: StoryState = {
    ...state,
    dialogue: {
      dialogueId,
      nodeId: dialogue.start,
      baseFlags: [...state.flags],
      baseCompleted: [...state.completed],
      rewound: false
    },
    lastDialogue: null
  };
  const node = findNode(dialogue, dialogue.start);
  if (!node) throw new Error(`Unknown start node ${dialogue.start}`);
  return enterNode(runtimeState, dialogue, dialogue.start);
}

export function activeDialogue(state: StoryState): Dialogue | null {
  if (!state.dialogue) return null;
  return findDialogue(state.dialogue.dialogueId) ?? null;
}

export function activeNode(state: StoryState): StoryNode | null {
  const dialogue = activeDialogue(state);
  if (!dialogue || !state.dialogue) return null;
  return findNode(dialogue, state.dialogue.nodeId) ?? null;
}

export function choicesView(state: StoryState): ChoiceView[] {
  const node = activeNode(state);
  if (!node?.choices) return [];
  return node.choices.map((choice) => ({
    choice,
    locked: !requirementsMet(state, choice.requires)
  }));
}

export function visibleChoices(state: StoryState): ChoiceView[] {
  return choicesView(state).filter((view) => !view.locked || Boolean(view.choice.lockedHint));
}

export function canAdvance(state: StoryState): boolean {
  const node = activeNode(state);
  if (!node) return false;
  return !node.choices?.length;
}

export function canRewind(state: StoryState): boolean {
  return Boolean(state.dialogue || state.lastDialogue);
}

export function advanceDialogue(state: StoryState): StoryState {
  const dialogue = activeDialogue(state);
  const node = activeNode(state);
  if (!dialogue || !node || !state.dialogue) throw new Error("No active dialogue");
  if (node.choices?.length) throw new Error("This node requires a choice");
  if (!node.next) return endDialogue(state, dialogue);
  return enterNode(state, dialogue, node.next);
}

export function chooseOption(state: StoryState, choiceId: string): StoryState {
  const dialogue = activeDialogue(state);
  const node = activeNode(state);
  if (!dialogue || !node || !state.dialogue) throw new Error("No active dialogue");
  const choice = node.choices?.find((entry) => entry.id === choiceId);
  if (!choice) throw new Error("Choice not found on this node");
  if (!requirementsMet(state, choice.requires)) throw new Error("Choice is locked");

  let nextState = applyEffects(state, choice.effects);
  if (choice.ending) nextState = { ...nextState, finalChoice: choice.ending };
  if (choice.next) {
    nextState = enterNode(nextState, dialogue, choice.next);
    return nextState;
  }
  return endDialogue(nextState, dialogue);
}

export function endDialogue(state: StoryState, dialogue: Dialogue): StoryState {
  const runtime = state.dialogue;
  if (!runtime) throw new Error("No active dialogue");
  const withEnd = applyEffects(state, dialogue.onEnd);
  const completed = addCompleted(withEnd, dialogue.id);
  return {
    ...completed,
    dialogue: null,
    lastDialogue: runtime
  };
}

export function rewindDialogue(state: StoryState): StoryState {
  const runtime = state.dialogue ?? state.lastDialogue;
  if (!runtime) throw new Error("Nothing to rewind");
  const dialogue = requireDialogue(runtime.dialogueId);
  const restored: StoryState = {
    ...state,
    flags: [...runtime.baseFlags],
    completed: [...runtime.baseCompleted],
    finalChoice: null,
    dialogue: {
      dialogueId: runtime.dialogueId,
      nodeId: dialogue.start,
      baseFlags: [...runtime.baseFlags],
      baseCompleted: [...runtime.baseCompleted],
      rewound: true
    },
    lastDialogue: null,
    rewinds: state.rewinds + 1
  };
  const node = findNode(dialogue, dialogue.start);
  if (!node) throw new Error(`Unknown start node ${dialogue.start}`);
  const entered = enterNode(restored, dialogue, dialogue.start);
  return {
    ...entered,
    dialogue: entered.dialogue ? { ...entered.dialogue, rewound: true } : null
  };
}

export function isChapterComplete(state: StoryState, chapter: Chapter): boolean {
  return state.flags.includes(`chapterComplete:${chapter.id}`);
}

export function advanceChapter(state: StoryState): StoryState {
  const chapter = currentChapter(state);
  if (!isChapterComplete(state, chapter)) return state;
  if (chapter.number >= CHAPTERS.length) return state;
  return {
    ...state,
    chapter: chapter.number + 1,
    dialogue: null,
    lastDialogue: null
  };
}

export function activeJournal(state: StoryState): JournalEntry[] {
  return JOURNAL.filter((entry) => {
    if (entry.id === "j-final" && !state.finalChoice) return false;
    return requirementsMet(state, entry.requires);
  });
}

export function endingFor(state: StoryState): Ending | null {
  if (!state.finalChoice) return null;
  return state.finalChoice === "archive"
    ? ENDING_ARCHIVE
    : state.finalChoice === "release"
      ? ENDING_RELEASE
      : ENDING_COMMUNITY;
}

const ENDING_ARCHIVE = ENDINGS.archive;
const ENDING_RELEASE = ENDINGS.release;
const ENDING_COMMUNITY = ENDINGS.community;

export function availableHotspots(state: StoryState, chapter: Chapter) {
  return chapter.hotspots.filter((hotspot) => {
    if (!hotspot.dialogueId) return true;
    if (hotspot.kind === "sit") return true;
    if (!state.completed.includes(hotspot.dialogueId)) return true;
    return Boolean(findDialogue(hotspot.dialogueId)?.retryable);
  });
}

export function factsCount(state: StoryState): number {
  return state.facts.length;
}

export function resetState(): StoryState {
  return initialState();
}
