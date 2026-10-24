import { label, button, panel, choice, C, W, H } from '../ui/core.js';
import { startNewGame, setCurrent } from '../systems/store.js';
import { saveState, loadState, hasSave, clearSave } from '../systems/save.js';
import { isMuted, toggleMuted, initAudio } from '../audio.js';
import { loadMeta } from '../systems/meta.js';
import { offerNgPlus } from '../ui/ngplus.js';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    this.add.image(W / 2, H / 2, 'bg');

    const g = this.add.graphics();
    g.lineStyle(2, C.ink, 0.5);
    g.lineBetween(200, 150, 520, 150);
    g.lineBetween(200, 152, 520, 152);
    g.lineStyle(1, C.ink, 0.2);
    g.lineBetween(250, 400, 470, 400);

    label(this, W / 2, 250, 'The Debt of Years', 54, C.inkText, {
      originX: 0.5,
      align: 'center'
    });
    label(this, W / 2, 330, 'A FIVE-CHAPTER INK-AND-LEDGER JRPG', 17, C.softText, {
      originX: 0.5,
      align: 'center'
    });

    this.drawHourglass(360, 472);

    const save = this.peekSave();
    const ended = !!(save && save.endingId);
    const canContinue = !!save && !ended;

    panel(this, W / 2, 680, 620, 176, { fill: C.paperLight, lineAlpha: 0.25 });
    label(this, W / 2, 630, 'A NOTE BEFORE YOU BEGIN', 16, C.emberText, {
      originX: 0.5,
      align: 'center'
    });
    label(this, W / 2, 660, 'This story is about debt, death, and complicity.\nCharacters include a child and an elderly man.\nThere is no graphic violence. There is arithmetic.', 19, C.softText, {
      originX: 0.5,
      align: 'center',
      lineSpacing: 9
    });

    const meta = loadMeta();
    const canNgPlus = meta.endings.length > 0;

    button(this, {
      x: W / 2, y: 836, w: 440, h: 88,
      text: 'New game',
      subtext: 'Begin the season',
      fontSize: 27,
      onClick: () => this.startNew(save)
    });

    button(this, {
      x: W / 2, y: 936, w: 440, h: 88,
      text: canContinue ? 'Continue' : (ended ? 'The ledger is closed' : 'No ledger open'),
      subtext: canContinue ? 'Return to the village' : (ended ? 'Begin again to change the arithmetic' : 'Begin a season first'),
      fontSize: 25,
      fill: canContinue ? C.emberDark : C.inkSoft,
      disabled: !canContinue,
      onClick: () => this.resume(save)
    });

    if (canNgPlus) {
      button(this, {
        x: W / 2, y: 1016, w: 440, h: 64,
        text: 'New Game+',
        subtext: 'Carry one final choice into a harder season',
        fontSize: 22,
        fill: C.paperDark,
        color: C.inkText,
        onClick: () => this.startNgPlus()
      });
    }

    const soundLabel = () => (isMuted() ? 'Sound: off' : 'Sound: on');
    const sound = button(this, {
      x: 210, y: 1084, w: 260, h: 56,
      text: soundLabel(),
      fontSize: 19,
      fill: C.paperDark,
      color: C.inkText,
      onClick: () => {
        initAudio();
        const muted = toggleMuted();
        sound.setLabel(muted ? 'Sound: off' : 'Sound: on');
      }
    });

    button(this, {
      x: 510, y: 1084, w: 260, h: 56,
      text: 'How to play',
      fontSize: 19,
      fill: C.paperDark,
      color: C.inkText,
      onClick: () => this.showHelp()
    });

    button(this, {
      x: W / 2, y: 1150, w: 360, h: 52,
      text: 'Ending gallery',
      fontSize: 18,
      fill: C.paperDark,
      color: C.inkText,
      onClick: () => this.scene.start('Gallery')
    });

    label(this, W / 2, 1214, 'Comfort is never free. Someone, somewhere, is paying.', 16, C.softText, {
      originX: 0.5,
      align: 'center',
      italic: true
    });

    this.input.once('pointerdown', () => initAudio());
    this.cameras.main.fadeIn(450, 20, 17, 14);
  }

  peekSave() {
    try {
      return loadState();
    } catch (err) {
      return null;
    }
  }

  drawHourglass(cx, cy) {
    const g = this.add.graphics();
    g.lineStyle(2, C.ink, 0.55);
    g.strokeCircle(cx, cy, 92);
    g.lineStyle(3, C.ink, 0.85);
    g.lineBetween(cx - 34, cy - 46, cx + 34, cy - 46);
    g.lineBetween(cx - 34, cy + 46, cx + 34, cy + 46);
    g.lineStyle(2, C.ink, 0.75);
    g.lineBetween(cx - 34, cy - 46, cx, cy);
    g.lineBetween(cx + 34, cy - 46, cx, cy);
    g.lineBetween(cx - 34, cy + 46, cx, cy);
    g.lineBetween(cx + 34, cy + 46, cx, cy);
    g.fillStyle(C.ember, 0.85);
    g.fillTriangle(cx - 12, cy + 37, cx + 12, cy + 37, cx, cy + 16);
    g.fillStyle(C.ink, 0.75);
    g.fillCircle(cx, cy + 6, 3);
    g.fillCircle(cx, cy + 20, 2);
  }

  startNew(save) {
    if (save && !save.endingId) {
      choice(this, {
        prompt: 'A season is already open. Begin again? The old ledger will be lost.',
        options: [
          { label: 'Begin again', value: 'new' },
          { label: 'Keep the old ledger', value: 'cancel' }
        ],
        onPick: (value) => {
          if (value === 'new') this.beginNew();
        }
      });
      return;
    }
    this.beginNew();
  }

  beginNew(opts = {}) {
    clearSave();
    const state = startNewGame(opts);
    saveState(state);
    this.scene.start('Hub');
  }

  startNgPlus() {
    offerNgPlus(this);
  }

  resume(save) {
    if (!save) return;
    setCurrent(save);
    this.scene.start('Hub');
  }

  showHelp() {
    choice(this, {
      prompt: 'Touch the lower screen and drag to walk. Get close to people and places, then use the button.\n\nEvery spell spends years from a named villager. Years are their life. The ledger remembers who paid, and sometimes it forgets.\n\nYou can spend your own forty years. It is the only clean cost.',
      options: [{ label: 'Understood', value: 'ok' }],
      onPick: () => {}
    });
  }
}
