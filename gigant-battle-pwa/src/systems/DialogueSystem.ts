import { DIALOGUE, type DialogueNode } from '../data/story/dialogue';

/** Owns the currently displayed dialogue beat; story effects are resolved by Game. */
export class DialogueSystem {
  nodeId: string | null = null;
  node: DialogueNode | null = null;
  revealed = 0;

  start(id: string): boolean {
    const node = DIALOGUE[id];
    if (!node) return false;
    this.nodeId = id;
    this.node = node;
    this.revealed = 0;
    return true;
  }

  close() { this.nodeId = null; this.node = null; this.revealed = 0; }

  get active() { return this.node !== null; }

  choice(index: number) {
    if (!this.node) return null;
    const choice = this.node.choices[index];
    if (!choice) return null;
    return choice;
  }
}
