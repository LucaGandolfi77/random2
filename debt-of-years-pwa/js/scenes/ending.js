import { label, button, panel, choice, toast, C, W, H } from '../ui/core.js';
import { getState, startNewGame } from '../systems/store.js';
import { saveState, clearSave } from '../systems/save.js';
import { computeEnding, getCharacterEpilogue } from '../systems/endings.js';
import { ENDINGS, BALANCES_BROKEN_CONTRACT } from '../data/endings.js';
import { recordEnding } from '../systems/meta.js';
import { offerNgPlus } from '../ui/ngplus.js';

export default class EndingScene extends Phaser.Scene {
  constructor() {
    super('Ending');
  }

  create() {
    const state = getState();
    if (!state) {
      this.scene.start('Title');
      return;
    }

    const id = computeEnding(state);
    const ending = ENDINGS[id];
    state.endingId = id;
    saveState(state);
    recordEnding(id, state);

    this.add.image(W / 2, H / 2, 'bg');
    this.add.rectangle(W / 2, H / 2, W, H, 0xe9e0cc, 0.55);

    label(this, W / 2, 66, 'THE DEBT OF YEARS', 14, C.emberText, {
      originX: 0.5,
      align: 'center'
    });

    label(this, W / 2, 128, ending.title, 42, C.inkText, {
      originX: 0.5,
      align: 'center',
      wrap: 620
    });
    label(this, W / 2, 188, ending.kicker, 19, C.softText, {
      originX: 0.5,
      align: 'center',
      italic: true,
      wrap: 560
    });

    const bodyText = ending.body.join('\n\n');
    const body = label(this, W / 2, 232, bodyText, 21, C.inkText, {
      originX: 0.5,
      originY: 0,
      align: 'center',
      wrap: 600,
      lineSpacing: 8
    });

    const epilogueLines = getCharacterEpilogue(state);
    let epilogue = null;
    if (epilogueLines.length > 0) {
      label(this, W / 2, body.y + body.height + 10, 'WHAT REMAINED', 13, C.emberText, {
        originX: 0.5,
        align: 'center'
      });
      epilogue = label(this, W / 2, body.y + body.height + 32, epilogueLines.join(' '), 14, C.softText, {
        originX: 0.5,
        originY: 0,
        align: 'center',
        wrap: 620,
        lineSpacing: 2,
        italic: true
      });
    }

    const dividerY = Math.max(486, (epilogue ? epilogue.y + epilogue.height : body.y + body.height) + 14);
    const g = this.add.graphics();
    g.lineStyle(1, C.ink, 0.22);
    g.lineBetween(120, dividerY, 600, dividerY);

    label(this, W / 2, dividerY + 24, 'THE LEDGER', 14, C.emberText, {
      originX: 0.5,
      align: 'center'
    });
    const stats = `Taken: ${state.flags.totalDrawn} years   ·   Your own: ${state.flags.selfDrawn}   ·   Deaths: ${state.stats.deaths}   ·   Forgotten: ${state.stats.forgotten}`;
    label(this, W / 2, dividerY + 52, stats, 16, C.softText, {
      originX: 0.5,
      align: 'center',
      wrap: 600
    });

    const roster = state.villagers;
    const rowH = 28;
    const maxRows = 7;
    const rosterBottom = dividerY + 102 + maxRows * rowH;
    for (let i = 0; i < roster.length; i += 1) {
      const villager = roster[i];
      const col = i < maxRows ? 0 : 1;
      const row = i % maxRows;
      const x = 66 + col * 316;
      const rowY = dividerY + 102 + row * rowH;
      let text;
      let color = C.inkText;
      if (villager.departed) {
        text = `${villager.name} — left the village.`;
        color = C.softText;
      } else if (villager.alive) {
        text = `${villager.name} — ${villager.years} year${villager.years === 1 ? '' : 's'} left.`;
      } else if (villager.remembered) {
        text = `${villager.name} — ${villager.epitaph}`;
        color = C.softText;
      } else {
        text = '—  —  unremembered.';
        color = C.emberText;
      }
      label(this, x, rowY, text, 13, color, {
        wrap: 284,
        lineSpacing: 2
      });
    }

    if (state.flags.brokeContract && id === 'balances') {
      label(this, 100, rosterBottom + 8, BALANCES_BROKEN_CONTRACT.join(' '), 15, C.softText, {
        wrap: 560,
        lineSpacing: 4,
        italic: true
      });
    }

    button(this, {
      x: 200, y: 1028, w: 280, h: 66,
      text: 'Copy ledger',
      fontSize: 19,
      fill: C.ink,
      onClick: () => this.copyLedger(ending, state)
    });

    button(this, {
      x: 520, y: 1028, w: 280, h: 66,
      text: 'Save card',
      fontSize: 19,
      fill: C.emberDark,
      onClick: () => this.saveCard(ending, state)
    });

    button(this, {
      x: 190, y: 1118, w: 300, h: 58,
      text: 'New game',
      fontSize: 19,
      fill: C.paperDark,
      color: C.inkText,
      onClick: () => {
        choice(this, {
          prompt: 'Begin a new season? This ledger will be closed for good.',
          options: [
            { label: 'Begin again', value: 'yes' },
            { label: 'Stay here', value: 'no' }
          ],
          onPick: (value) => {
            if (value !== 'yes') return;
            clearSave();
            const next = startNewGame();
            saveState(next);
            this.scene.start('Hub');
          }
        });
      }
    });

    button(this, {
      x: 530, y: 1118, w: 300, h: 58,
      text: 'New Game+',
      fontSize: 19,
      fill: C.emberDark,
      onClick: () => offerNgPlus(this)
    });

    button(this, {
      x: 230, y: 1182, w: 220, h: 46,
      text: 'Gallery',
      fontSize: 16,
      fill: C.paperDark,
      color: C.inkText,
      onClick: () => this.scene.start('Gallery')
    });

    button(this, {
      x: 490, y: 1182, w: 220, h: 46,
      text: 'Title',
      fontSize: 16,
      fill: C.paper,
      color: C.inkText,
      onClick: () => this.scene.start('Title')
    });

    label(this, W / 2, 1234, `"${ending.moral}"`, 12, C.softText, {
      originX: 0.5,
      align: 'center',
      italic: true,
      wrap: 600
    });

    this.cameras.main.fadeIn(700, 20, 17, 14);
  }

  ledgerText(ending, state) {
    const lines = [];
    lines.push('THE DEBT OF YEARS');
    lines.push(ending.title);
    lines.push(ending.kicker);
    lines.push('');
    lines.push(`Taken: ${state.flags.totalDrawn} years. Your own: ${state.flags.selfDrawn}.`);
    lines.push(`Deaths: ${state.stats.deaths}. Forgotten: ${state.stats.forgotten}.`);
    lines.push('');
    for (const villager of state.villagers) {
      if (villager.departed) {
        lines.push(`${villager.name} — left the village.`);
      } else if (villager.alive) {
        lines.push(`${villager.name} — ${villager.years} year${villager.years === 1 ? '' : 's'} left.`);
      } else if (villager.remembered) {
        lines.push(`${villager.name} — ${villager.epitaph}`);
      } else {
        lines.push('— — unremembered.');
      }
    }
    lines.push('');
    lines.push(`"${ending.moral}"`);
    return lines.join('\n');
  }

  copyLedger(ending, state) {
    const text = this.ledgerText(ending, state);
    const done = () => toast(this, 'The ledger is copied.', { y: 900 });
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => this.fallbackCopy(text, done));
    } else {
      this.fallbackCopy(text, done);
    }
  }

  fallbackCopy(text, done) {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      document.body.removeChild(area);
      done();
    } catch (err) {
      toast(this, 'Copying is blocked here. Select the text manually.', { y: 900 });
    }
  }

  saveCard(ending, state) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1350;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#e9e0cc';
      ctx.fillRect(0, 0, 1080, 1350);
      ctx.strokeStyle = 'rgba(31,26,23,0.25)';
      ctx.lineWidth = 3;
      ctx.strokeRect(48, 48, 984, 1254);

      ctx.fillStyle = '#9d431f';
      ctx.font = '22px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('THE DEBT OF YEARS', 540, 130);

      ctx.fillStyle = '#241d18';
      ctx.font = '54px Georgia, serif';
      this.wrapText(ctx, ending.title, 540, 220, 820, 64);

      ctx.fillStyle = '#5c5044';
      ctx.font = 'italic 24px Georgia, serif';
      this.wrapText(ctx, ending.kicker, 540, 330, 800, 34);

      ctx.fillStyle = '#241d18';
      ctx.font = '25px Georgia, serif';
      let y = 430;
      for (const paragraph of ending.body) {
        y = this.wrapText(ctx, paragraph, 540, y, 800, 37) + 24;
      }

      ctx.strokeStyle = 'rgba(31,26,23,0.25)';
      ctx.beginPath();
      ctx.moveTo(180, y + 6);
      ctx.lineTo(900, y + 6);
      ctx.stroke();

      y += 54;
      ctx.fillStyle = '#9d431f';
      ctx.font = '18px Georgia, serif';
      ctx.fillText('THE LEDGER', 540, y);
      y += 36;

      ctx.fillStyle = '#5c5044';
      ctx.font = '20px Georgia, serif';
      ctx.fillText(`Taken ${state.flags.totalDrawn} years  ·  Your own ${state.flags.selfDrawn}  ·  Deaths ${state.stats.deaths}  ·  Forgotten ${state.stats.forgotten}`, 540, y);
      y += 52;

      ctx.font = '14px Georgia, serif';
      const rosterY = y;
      for (let i = 0; i < state.villagers.length; i += 1) {
        const villager = state.villagers[i];
        const col = i < 7 ? 0 : 1;
        const row = i % 7;
        let text;
        if (villager.departed) {
          text = `${villager.name} — left the village.`;
          ctx.fillStyle = '#5c5044';
        } else if (villager.alive) {
          text = `${villager.name} — ${villager.years} year${villager.years === 1 ? '' : 's'} left.`;
          ctx.fillStyle = '#241d18';
        } else if (villager.remembered) {
          text = `${villager.name} — ${villager.epitaph}`;
          ctx.fillStyle = '#5c5044';
        } else {
          text = '— — unremembered.';
          ctx.fillStyle = '#9d431f';
        }
        ctx.textAlign = 'left';
        ctx.fillText(text, 100 + col * 440, rosterY + row * 26);
      }
      y = rosterY + 7 * 26 + 24;

      ctx.textAlign = 'center';
      ctx.fillStyle = '#5c5044';
      ctx.font = 'italic 22px Georgia, serif';
      this.wrapText(ctx, `"${ending.moral}"`, 540, 1230, 820, 30);

      canvas.toBlob((blob) => {
        if (!blob) {
          toast(this, 'The card could not be drawn.', { y: 900 });
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `debt-of-years-${ending.id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        toast(this, 'Ledger card saved.', { y: 900 });
      }, 'image/png');
    } catch (err) {
      toast(this, 'The card could not be drawn.', { y: 900 });
    }
  }

  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = String(text).split(' ');
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, y);
        line = word;
        y += lineHeight;
      } else {
        line = test;
      }
    }
    if (line) {
      ctx.fillText(line, x, y);
      y += lineHeight;
    }
    return y;
  }
}
