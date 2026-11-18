import { CHAPTER_COUNT, STORY_CHAPTERS, type StoryChapter } from '../data/story/chapters';
import type { DialogueEffects } from '../data/story/dialogue';
import type { Progression } from './Progression';

export interface StoryEffectResult {
  startBattle?: boolean;
  nextChapter?: boolean;
  ending?: string;
  retry?: boolean;
}

export class StorySystem {
  chapterIndex = 0;
  flags = new Set<string>();
  morale = 0;

  constructor(private progression: Progression) {
    this.syncFromSave();
  }

  syncFromSave() {
    this.chapterIndex = Math.min(CHAPTER_COUNT - 1, Math.max(0, this.progression.data.storyChapter));
    this.flags = new Set(this.progression.data.storyFlags);
    this.morale = this.progression.data.morale;
  }

  get chapter(): StoryChapter { return STORY_CHAPTERS[this.chapterIndex]; }
  get finished() { return this.progression.data.storyChapter >= CHAPTER_COUNT; }

  introNode() { return this.chapter.intro; }
  winNode() { return this.chapter.win; }
  loseNode() { return this.chapter.lose; }

  apply(effects: DialogueEffects): StoryEffectResult {
    if (effects.flag) this.flags.add(effects.flag);
    if (effects.morale) this.morale = Math.max(-5, Math.min(20, this.morale + effects.morale));
    if (effects.unlock) this.progression.unlockFighter(effects.unlock);
    const result: StoryEffectResult = {
      startBattle: effects.startBattle,
      retry: effects.retry,
      ending: effects.ending
    };
    if (effects.nextChapter && !effects.ending) {
      this.chapterIndex = Math.min(CHAPTER_COUNT, this.chapterIndex + 1);
      result.nextChapter = true;
      if (this.chapterIndex >= CHAPTER_COUNT) {
        result.ending = this.resolveEnding();
      }
    }
    this.save();
    return result;
  }

  resolveEnding(): string {
    if (this.flags.has('ending_fallen')) return 'fallen';
    if (this.flags.has('ending_truth') || (this.flags.has('truth_known') && this.morale >= 4)) return 'truth';
    if (this.flags.has('ending_loyal') || this.morale >= 7) return 'loyal';
    return 'legend';
  }

  save() { this.progression.saveStory(this.chapterIndex, [...this.flags], this.morale); }

  newGame() {
    this.chapterIndex = 0;
    this.flags.clear();
    this.morale = 0;
    this.save();
  }
}
