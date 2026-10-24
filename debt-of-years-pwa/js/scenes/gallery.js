import { label, button, panel, C, W, H } from '../ui/core.js';
import { ENDINGS } from '../data/endings.js';
import { loadMeta } from '../systems/meta.js';

export default class GalleryScene extends Phaser.Scene {
  constructor() {
    super('Gallery');
  }

  create() {
    const meta = loadMeta();
    const discovered = new Set(meta.endings);
    const endings = Object.values(ENDINGS);

    this.add.image(W / 2, H / 2, 'bg');
    this.add.rectangle(W / 2, H / 2, W, H, 0xe9e0cc, 0.78);

    label(this, W / 2, 54, 'THE LEDGER OF ENDINGS', 15, C.emberText, {
      originX: 0.5,
      align: 'center'
    });
    label(this, W / 2, 94, 'Every page you have closed.', 30, C.inkText, {
      originX: 0.5,
      align: 'center'
    });
    label(this, W / 2, 132, `${discovered.size} / ${endings.length} endings recorded`, 16, C.softText, {
      originX: 0.5,
      align: 'center'
    });

    const top = 176;
    const cardW = 310;
    const cardH = 150;
    const gapX = 24;
    const gapY = 14;
    const leftX = 190;
    const rightX = 530;

    endings.forEach((ending, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = col === 0 ? leftX : rightX;
      const y = top + cardH / 2 + row * (cardH + gapY);
      const found = discovered.has(ending.id);

      panel(this, x, y, cardW, cardH, {
        fill: found ? C.paperLight : C.paperDark,
        lineAlpha: found ? 0.3 : 0.15,
        radius: 12
      });

      if (found) {
        label(this, x - cardW / 2 + 18, y - 44, ending.title, 18, C.inkText, {
          wrap: cardW - 36,
          lineSpacing: 2
        });
        label(this, x - cardW / 2 + 18, y + 2, ending.kicker, 12, C.softText, {
          wrap: cardW - 36,
          lineSpacing: 3
        });
        label(this, x - cardW / 2 + 18, y + cardH / 2 - 26, 'RECORDED', 10, C.emberText);
      } else {
        label(this, x, y - 18, '???', 30, C.fadedText, {
          originX: 0.5,
          align: 'center'
        });
        label(this, x, y + 24, 'LOCKED', 11, C.fadedText, {
          originX: 0.5,
          align: 'center'
        });
      }
    });

    button(this, {
      x: W / 2,
      y: 1086,
      w: 260,
      h: 58,
      text: 'Back',
      fontSize: 19,
      fill: C.paperDark,
      color: C.inkText,
      onClick: () => this.scene.start('Title')
    });

    label(this, W / 2, 1160, 'The ledger keeps what the village forgets.', 14, C.softText, {
      originX: 0.5,
      align: 'center',
      italic: true
    });

    this.cameras.main.fadeIn(300, 20, 17, 14);
  }
}
