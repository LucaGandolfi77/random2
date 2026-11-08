import type { Simulation } from '../core/engine/Simulation';

export interface TrainingPanelCallbacks {
  reset(): void;
  setDummyDamage(value: number): void;
  toggleHitbox(): void;
  getHitbox(): boolean;
}

export class TrainingPanel {
  readonly root: HTMLDivElement;
  private frameData: HTMLElement;
  private inputHistory: HTMLElement;
  private jumpsButton: HTMLButtonElement;
  private meterButton: HTMLButtonElement;
  private hitboxButton: HTMLButtonElement;

  constructor(parent: HTMLElement, private readonly sim: Simulation, private readonly callbacks: TrainingPanelCallbacks) {
    this.root = document.createElement('div');
    this.root.className = 'training-panel';
    this.root.innerHTML = `
      <div class="training-title"><span>TRAINING LAB</span><span class="training-sub">FRAME DATA / SANDBOX</span></div>
      <div class="training-row">
        <button data-act="reset" class="mini-button">RESET POSITIONS</button>
        <button data-act="hitbox" class="mini-button">HITBOXES</button>
      </div>
      <div class="training-row training-dummy">
        <span class="training-label">DUMMY</span>
        <button data-damage="0" class="mini-button">0%</button>
        <button data-damage="50" class="mini-button">50%</button>
        <button data-damage="100" class="mini-button">100%</button>
        <button data-damage="150" class="mini-button">150%</button>
      </div>
      <div class="training-row">
        <button data-act="jumps" class="mini-button">INF JUMPS</button>
        <button data-act="meter" class="mini-button">INF HYPE</button>
      </div>
      <div class="training-framedata"></div>
      <div class="training-input"></div>
    `;
    parent.appendChild(this.root);
    this.frameData = this.root.querySelector('.training-framedata') as HTMLElement;
    this.inputHistory = this.root.querySelector('.training-input') as HTMLElement;
    this.jumpsButton = this.root.querySelector('[data-act="jumps"]') as HTMLButtonElement;
    this.meterButton = this.root.querySelector('[data-act="meter"]') as HTMLButtonElement;
    this.hitboxButton = this.root.querySelector('[data-act="hitbox"]') as HTMLButtonElement;
    this.updateToggles();
    this.root.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const damage = target.dataset.damage;
      if (damage) {
        this.callbacks.setDummyDamage(Number(damage));
        return;
      }
      const action = target.dataset.act;
      if (action === 'reset') this.callbacks.reset();
      else if (action === 'hitbox') {
        this.callbacks.toggleHitbox();
        this.updateToggles();
      } else if (action === 'jumps') {
        const options = this.sim.config.trainingOptions ?? {};
        options.infiniteJumps = !options.infiniteJumps;
        this.sim.config.trainingOptions = options;
        this.updateToggles();
      } else if (action === 'meter') {
        const options = this.sim.config.trainingOptions ?? {};
        options.infiniteMeter = !options.infiniteMeter;
        this.sim.config.trainingOptions = options;
        this.updateToggles();
      }
    });
  }

  update(): void {
    const fighter = this.sim.fighters[0];
    if (!fighter) return;
    const move = fighter.currentMove;
    if (move) {
      const hits = move.move.hits;
      const startup = hits.length > 0 ? hits[0].start : 0;
      const active = hits.length > 0 ? hits[hits.length - 1].end - hits[0].start + 1 : 0;
      const recovery = Math.max(0, move.move.totalFrames - (hits.length > 0 ? hits[hits.length - 1].end : 0) - 1);
      this.frameData.innerHTML = `
        <div class="fd-title">${move.move.name}</div>
        <div class="fd-grid">
          <span>STARTUP <b>${startup}</b></span>
          <span>ACTIVE <b>${active}</b></span>
          <span>RECOVERY <b>${recovery}</b></span>
          <span>FRAME <b>${move.frame}</b></span>
        </div>
      `;
    } else {
      this.frameData.innerHTML = `<div class="fd-title muted">NO ACTIVE MOVE</div>`;
    }
    this.inputHistory.textContent = `INPUT ${fighter.getInputHistory().slice(-26).join(' ')}`;
  }

  updateToggles(): void {
    const options = this.sim.config.trainingOptions ?? {};
    this.jumpsButton.classList.toggle('active', Boolean(options.infiniteJumps));
    this.meterButton.classList.toggle('active', Boolean(options.infiniteMeter));
    this.hitboxButton.classList.toggle('active', this.callbacks.getHitbox());
  }

  destroy(): void {
    this.root.remove();
  }
}
