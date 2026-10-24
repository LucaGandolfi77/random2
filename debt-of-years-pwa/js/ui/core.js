import { sfx } from '../audio.js';
import { speakerName } from '../data/villagers.js';

export const W = 720;
export const H = 1280;
export const FONT = 'Georgia, "Iowan Old Style", "Times New Roman", serif';

export const C = {
  paper: 0xe9e0cc,
  paperDark: 0xddd0b6,
  paperLight: 0xf3ecdb,
  ink: 0x1f1a17,
  inkSoft: 0x4a4038,
  ember: 0xb4532a,
  emberDark: 0x8d3d1e,
  dim: 0x0d0b09,
  inkText: '#241d18',
  softText: '#5c5044',
  emberText: '#9d431f',
  creamText: '#f2ead8',
  fadedText: '#8a7c6c'
};

export function label(scene, x, y, str, size = 26, color = C.inkText, opts = {}) {
  const style = {
    fontFamily: FONT,
    fontSize: `${size}px`,
    color,
    align: opts.align || 'left',
    lineSpacing: opts.lineSpacing !== undefined ? opts.lineSpacing : 8,
    fontStyle: opts.italic ? 'italic' : 'normal'
  };
  if (opts.wrap) style.wordWrap = { width: opts.wrap, useAdvancedWrap: true };
  if (opts.stroke) {
    style.stroke = opts.stroke;
    style.strokeThickness = opts.strokeThickness || 3;
  }
  const t = scene.add.text(x, y, str, style);
  t.setOrigin(opts.originX !== undefined ? opts.originX : 0, opts.originY !== undefined ? opts.originY : 0);
  t.setDepth(opts.depth || 0);
  return t;
}

export function panel(scene, x, y, w, h, opts = {}) {
  const g = scene.add.graphics();
  const radius = opts.radius !== undefined ? opts.radius : 18;
  const fill = opts.fill !== undefined ? opts.fill : C.paperDark;
  const alpha = opts.alpha !== undefined ? opts.alpha : 1;
  g.fillStyle(fill, alpha);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, radius);
  if (opts.stroke !== false) {
    g.lineStyle(opts.lineWidth || 2, opts.stroke || C.ink, opts.lineAlpha !== undefined ? opts.lineAlpha : 0.22);
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, radius);
  }
  g.setDepth(opts.depth || 0);
  return g;
}

export function bar(scene, x, y, w, h, value, max, opts = {}) {
  const g = scene.add.graphics().setDepth(opts.depth || 0);
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  g.fillStyle(opts.track || 0xc9b998, 0.7);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, h / 2);
  if (ratio > 0) {
    g.fillStyle(opts.fill || C.ember, 1);
    g.fillRoundedRect(x - w / 2, y - h / 2, Math.max(h, w * ratio), h, h / 2);
  }
  return g;
}

export function button(scene, opts) {
  const {
    x, y, w = 520, h = 84,
    text = '', subtext = '',
    onClick,
    fill = C.ink,
    color = C.creamText,
    fontSize = 28,
    depth = 50,
    disabled = false,
    radius = 16
  } = opts;

  const container = scene.add.container(x, y).setDepth(depth);
  const bg = scene.add.graphics();
  const body = scene.add.text(0, subtext ? -12 : 0, text, {
    fontFamily: FONT,
    fontSize: `${fontSize}px`,
    color,
    align: 'center',
    wordWrap: { width: w - 40 }
  }).setOrigin(0.5);
  const extra = subtext
    ? scene.add.text(0, 24, subtext, {
        fontFamily: FONT,
        fontSize: `${Math.max(14, fontSize - 11)}px`,
        color,
        align: 'center',
        wordWrap: { width: w - 44 }
      }).setOrigin(0.5).setAlpha(0.65)
    : null;
  const zone = scene.add.zone(0, 0, w, h).setOrigin(0.5).setInteractive({ useHandCursor: true });

  let isDisabled = !!disabled;
  let enabledAlpha = 1;

  const draw = () => {
    bg.clear();
    bg.fillStyle(fill, isDisabled ? 0.35 : 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
    bg.lineStyle(2, C.paperLight, 0.12);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
    container.setAlpha(isDisabled ? 0.5 : enabledAlpha);
  };

  draw();
  container.add([bg, body]);
  if (extra) container.add(extra);
  container.add(zone);

  zone.on('pointerdown', () => {
    if (isDisabled) return;
    sfx('tap');
    container.setScale(0.985);
  });
  zone.on('pointerup', () => {
    if (isDisabled) return;
    container.setScale(1);
    onClick?.();
  });
  zone.on('pointerout', () => container.setScale(1));

  const api = {
    container,
    setEnabled(value) {
      isDisabled = !value;
      draw();
    },
    setLabel(value) {
      body.setText(value);
    },
    setSubtext(value) {
      if (extra) extra.setText(value);
    },
    setAlpha(value) {
      enabledAlpha = value;
      draw();
    },
    destroy() {
      container.destroy();
    }
  };
  container.setData('api', api);
  return api;
}

export function holdButton(scene, opts) {
  const {
    x, y, w = 520, h = 88,
    text = '', subtext = '',
    onComplete,
    ms = 650,
    fill = C.ink,
    color = C.creamText,
    textColor = color,
    fontSize = 27,
    depth = 50,
    disabled = false,
    radius = 16
  } = opts;

  const container = scene.add.container(x, y).setDepth(depth);
  const base = scene.add.graphics();
  const progress = scene.add.graphics();
  const body = scene.add.text(0, subtext ? -10 : 0, text, {
    fontFamily: FONT,
    fontSize: `${fontSize}px`,
    color: textColor,
    align: 'center',
    wordWrap: { width: w - 36 }
  }).setOrigin(0.5);
  const extra = subtext
    ? scene.add.text(0, 24, subtext, {
        fontFamily: FONT,
        fontSize: '16px',
        color: textColor,
        align: 'center',
        wordWrap: { width: w - 40 }
      }).setOrigin(0.5).setAlpha(0.66)
    : null;
  const zone = scene.add.zone(0, 0, w, h).setOrigin(0.5).setInteractive({ useHandCursor: true });

  let isDisabled = !!disabled;
  let tween = null;
  let completed = false;
  const progressValue = { v: 0 };

  const drawBase = () => {
    base.clear();
    base.fillStyle(fill, isDisabled ? 0.32 : 1);
    base.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
    base.lineStyle(2, isDisabled ? C.inkSoft : C.paperLight, isDisabled ? 0.15 : 0.14);
    base.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
    container.setAlpha(isDisabled ? 0.5 : 1);
  };

  const drawProgress = () => {
    progress.clear();
    if (progressValue.v <= 0) return;
    progress.fillStyle(C.ember, 0.45);
    progress.fillRoundedRect(-w / 2 + 2, -h / 2 + 2, (w - 4) * progressValue.v, h - 4, Math.max(4, radius - 2));
  };

  const cancel = () => {
    if (tween) {
      tween.stop();
      tween = null;
    }
    progressValue.v = 0;
    drawProgress();
  };

  drawBase();
  container.add([base, progress, body]);
  if (extra) container.add(extra);
  container.add(zone);

  zone.on('pointerdown', () => {
    if (isDisabled || completed) return;
    sfx('tap');
    progressValue.v = 0;
    drawProgress();
    tween = scene.tweens.add({
      targets: progressValue,
      v: 1,
      duration: ms,
      ease: 'Linear',
      onUpdate: drawProgress,
      onComplete: () => {
        completed = true;
        tween = null;
        progressValue.v = 1;
        drawProgress();
        sfx('draw');
        onComplete?.();
      }
    });
  });
  zone.on('pointerup', cancel);
  zone.on('pointerout', cancel);

  return {
    container,
    setEnabled(value) {
      isDisabled = !value;
      drawBase();
    },
    setLabel(value) {
      body.setText(value);
    },
    setSubtext(value) {
      if (extra) extra.setText(value);
    },
    destroy() {
      cancel();
      container.destroy();
    }
  };
}

export function modal(scene, opts = {}) {
  const depth = opts.depth || 1000;
  const root = scene.add.container(0, 0).setDepth(depth).setScrollFactor(0);
  const dim = scene.add.rectangle(W / 2, H / 2, W, H, C.dim, opts.dimAlpha !== undefined ? opts.dimAlpha : 0.58);
  const blocker = scene.add.zone(W / 2, H / 2, W, H).setOrigin(0.5).setInteractive();
  const add = root.add.bind(root);
  root.add = (child) => {
    const items = Array.isArray(child) ? child : [child];
    for (const item of items) {
      if (item && item.setScrollFactor) {
        if (item.list) item.setScrollFactor(0, 0, true);
        else item.setScrollFactor(0);
      }
    }
    return add(child);
  };
  root.add([dim, blocker]);
  if (scene.uiCamera) scene.cameras.main.ignore(root);
  root.blocker = blocker;
  root.close = () => {
    root.destroy(true);
    if (scene.activeModal === root) scene.activeModal = null;
  };
  scene.activeModal = root;
  return root;
}

function splitLine(text, limit = 300) {
  if (text.length <= limit) return [text];
  const words = text.split(' ');
  const chunks = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > limit) {
      if (current) chunks.push(current.trim());
      current = word;
    } else {
      current += ' ' + word;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export function dialog(scene, opts) {
  const lines = [];
  for (const line of opts.lines || []) {
    if (!line || !line.text) continue;
    for (const chunk of splitLine(line.text)) {
      lines.push({ who: line.who, text: chunk });
    }
  }
  if (lines.length === 0) {
    opts.onDone?.();
    return;
  }

  const depth = opts.depth || 1300;
  const root = modal(scene, { depth, dimAlpha: 0.5 });
  const panelTop = 430;
  const panelHeight = 690;
  const panelCenter = panelTop + panelHeight / 2;
  root.add(panel(scene, W / 2, panelCenter, 660, panelHeight, { fill: C.paper, lineAlpha: 0.35, radius: 20 }));

  const speaker = label(scene, 72, panelTop + 36, '', 20, C.emberText, { depth: depth + 1 });
  speaker.setLetterSpacing?.(2);
  const body = label(scene, 72, panelTop + 92, '', 27, C.inkText, {
    wrap: 578,
    lineSpacing: 10,
    depth: depth + 1
  });
  const counter = label(scene, 72, panelTop + panelHeight - 52, '', 17, C.fadedText, { depth: depth + 1 });
  const hint = label(scene, W - 72, panelTop + panelHeight - 52, 'tap to continue', 18, C.fadedText, {
    originX: 1,
    depth: depth + 1
  });
  root.add([speaker, body, counter, hint]);

  const advanceZone = scene.add.zone(W / 2, panelCenter, 660, panelHeight).setOrigin(0.5).setInteractive();
  advanceZone.setDepth(depth - 1);
  root.add(advanceZone);

  const skip = label(scene, W - 72, panelTop + 36, 'skip', 18, C.fadedText, {
    originX: 1,
    depth: depth + 1
  });
  skip.setInteractive({ useHandCursor: true });
  skip.on('pointerup', () => {
    sfx('page');
    close();
  });
  root.add(skip);

  let index = 0;
  let typing = false;
  let fullText = '';
  let shown = 0;
  let timer = null;
  let closed = false;

  const finishTyping = () => {
    if (timer) {
      timer.remove(false);
      timer = null;
    }
    typing = false;
    body.setText(fullText);
    shown = fullText.length;
    hint.setText(index >= lines.length - 1 ? 'tap to close' : 'tap to continue');
  };

  const showPage = () => {
    const line = lines[index];
    fullText = line.text;
    shown = 0;
    typing = true;
    body.setText('');
    speaker.setText(speakerName(line.who).toUpperCase());
    speaker.setVisible(!!speakerName(line.who));
    body.setFontStyle(line.who === 'narrator' ? 'italic' : 'normal');
    body.setColor(line.who === 'narrator' ? C.softText : C.inkText);
    counter.setText(`${index + 1} / ${lines.length}`);
    hint.setText('tap to continue');

    if (timer) timer.remove(false);
    timer = scene.time.addEvent({
      delay: 14,
      loop: true,
      callback: () => {
        shown = Math.min(fullText.length, shown + 2);
        body.setText(fullText.slice(0, shown));
        if (shown >= fullText.length) finishTyping();
      }
    });
  };

  const close = () => {
    if (closed) return;
    closed = true;
    if (timer) timer.remove(false);
    root.close();
    scene.time.delayedCall(20, () => opts.onDone?.());
  };

  const finish = () => {
    if (typing) {
      finishTyping();
      return;
    }
    if (index >= lines.length - 1) {
      close();
      return;
    }
    index += 1;
    sfx('page');
    showPage();
  };

  advanceZone.on('pointerup', finish);
  showPage();
  root.setScrollFactor(0, 0, true);
}

export function choice(scene, opts) {
  const depth = opts.depth || 1400;
  const root = modal(scene, { depth, dimAlpha: 0.6 });
  const prompt = opts.prompt || '';
  const options = (opts.options || []).filter((o) => !o.hidden);
  const panelH = 150 + options.length * 104 + 30;
  const panelY = Math.min(H - panelH / 2 - 40, 640 + Math.max(0, 3 - options.length) * 30);
  root.add(panel(scene, W / 2, panelY, 660, panelH, { fill: C.paper, lineAlpha: 0.35, radius: 20 }));

  const title = label(scene, W / 2, panelY - panelH / 2 + 56, prompt, 24, C.inkText, {
    wrap: 580,
    align: 'center',
    originX: 0.5,
    depth: depth + 1
  });
  root.add(title);

  let y = panelY - panelH / 2 + 130;
  for (const option of options) {
    const btn = button(scene, {
      x: W / 2,
      y: y + 42,
      w: 580,
      h: 84,
      text: option.label,
      fill: option.fill || C.ink,
      color: option.color || C.creamText,
      fontSize: 23,
      disabled: option.disabled,
      depth: depth + 2,
      onClick: () => {
        if (option.disabled) return;
        root.close();
        scene.time.delayedCall(20, () => opts.onPick?.(option.value));
      }
    });
    root.add(btn.container);
    y += 104;
  }
  root.setScrollFactor(0, 0, true);
}

export function listPicker(scene, opts) {
  const { title, subtitle = '', items = [], onCancel } = opts;
  const depth = opts.depth || 1500;
  const root = modal(scene, { depth, dimAlpha: 0.66 });
  const panelTop = 210;
  const panelH = 900;
  root.add(panel(scene, W / 2, panelTop + panelH / 2, 660, panelH, {
    fill: C.paper,
    lineAlpha: 0.35,
    radius: 20
  }));
  root.add(label(scene, W / 2, panelTop + 54, title, 32, C.inkText, {
    originX: 0.5,
    depth: depth + 1
  }));
  if (subtitle) {
    root.add(label(scene, W / 2, panelTop + 100, subtitle, 19, C.softText, {
      originX: 0.5,
      align: 'center',
      wrap: 580,
      depth: depth + 1
    }));
  }

  const perPage = 5;
  let page = 0;
  const pageCount = Math.max(1, Math.ceil(items.length / perPage));
  const layer = scene.add.container(0, 0).setDepth(depth + 1);
  root.add(layer);

  const render = () => {
    layer.removeAll(true);
    const start = page * perPage;
    const slice = items.slice(start, start + perPage);
    let y = panelTop + 175;

    if (slice.length === 0) {
      layer.add(label(scene, W / 2, y + 60, 'Nothing here.', 22, C.softText, { originX: 0.5 }));
    }

    for (const item of slice) {
      const btn = button(scene, {
        x: W / 2,
        y: y + 50,
        w: 580,
        h: 96,
        text: item.label,
        subtext: item.subtext || '',
        fontSize: 22,
        fill: item.fill || C.ink,
        color: item.color || C.creamText,
        disabled: item.disabled,
        depth: depth + 2,
        onClick: () => {
          root.close();
          scene.time.delayedCall(20, () => item.onPick?.());
        }
      });
      layer.add(btn.container);
      y += 112;
    }

    if (pageCount > 1) {
      const prev = button(scene, {
        x: 190, y: panelTop + panelH - 150, w: 130, h: 56,
        text: 'Prev', fontSize: 18, fill: C.paperDark, color: C.inkText,
        disabled: page <= 0, depth: depth + 2,
        onClick: () => scene.time.delayedCall(0, () => { page -= 1; render(); })
      });
      const next = button(scene, {
        x: 530, y: panelTop + panelH - 150, w: 130, h: 56,
        text: 'Next', fontSize: 18, fill: C.paperDark, color: C.inkText,
        disabled: page >= pageCount - 1, depth: depth + 2,
        onClick: () => scene.time.delayedCall(0, () => { page += 1; render(); })
      });
      layer.add(prev.container);
      layer.add(next.container);
      layer.add(label(scene, W / 2, panelTop + panelH - 150, `${page + 1} / ${pageCount}`, 18, C.softText, {
        originX: 0.5, originY: 0.5
      }));
    }

    const cancel = button(scene, {
      x: W / 2, y: panelTop + panelH - 70, w: 240, h: 58,
      text: 'Back', fontSize: 19, fill: C.paperDark, color: C.inkText,
      depth: depth + 2,
      onClick: () => {
        root.close();
        scene.time.delayedCall(20, () => onCancel?.());
      }
    });
    layer.add(cancel.container);
    root.setScrollFactor(0, 0, true);
  };

  render();
}

export function toast(scene, message, opts = {}) {
  const t = label(scene, W / 2, opts.y || 1180, message, opts.size || 20, opts.color || C.creamText, {
    originX: 0.5,
    align: 'center',
    wrap: 600,
    depth: 2000
  }).setScrollFactor(0);
  const bg = scene.add.graphics().setDepth(1999).setScrollFactor(0);
  if (scene.uiCamera) scene.cameras.main.ignore([t, bg]);
  bg.fillStyle(C.ink, 0.92);
  bg.fillRoundedRect(W / 2 - 300, t.y - 32, 600, 64, 14);
  scene.tweens.add({
    targets: [t, bg],
    alpha: 0,
    delay: opts.delay || 1500,
    duration: 500,
    onComplete: () => {
      t.destroy();
      bg.destroy();
    }
  });
}

export function yearPicker(scene, opts) {
  const { state, cost, onPick, onCancel } = opts;
  const depth = opts.depth || 1500;
  const root = modal(scene, { depth, dimAlpha: 0.66 });

  const panelTop = 150;
  const panelH = 1020;
  const panelCenter = panelTop + panelH / 2;
  root.add(panel(scene, W / 2, panelCenter, 660, panelH, { fill: C.paper, lineAlpha: 0.35, radius: 20 }));

  root.add(label(scene, W / 2, panelTop + 58, 'Who pays?', 36, C.inkText, {
    originX: 0.5,
    depth: depth + 1
  }));
  root.add(label(scene, W / 2, panelTop + 110, `${cost} year${cost === 1 ? '' : 's'}, taken by name`, 20, C.softText, {
    originX: 0.5,
    depth: depth + 1
  }));

  const targets = state.villagers.filter((v) => v.alive && v.consent !== 'protected' && v.years >= cost);
  const rows = targets.map((v) => ({
    id: v.id,
    name: v.name,
    years: v.years,
    consent: v.consent,
    role: v.role
  }));
  if (state.hero.years >= cost) {
    rows.push({
      id: 'hero',
      name: 'Yourself',
      years: state.hero.years,
      consent: 'self',
      role: 'The only clean cost'
    });
  }

  const perPage = 4;
  let page = 0;
  const pageCount = Math.max(1, Math.ceil(rows.length / perPage));
  const rowsLayer = scene.add.container(0, 0).setDepth(depth + 1);
  root.add(rowsLayer);

  const consentText = {
    willing: 'Willing',
    unaware: 'Does not know',
    refuses: 'Refuses. Taking is still possible.',
    self: 'Your own years. It ages you.',
    protected: 'Protected'
  };

  const render = () => {
    rowsLayer.removeAll(true);
    const start = page * perPage;
    const slice = rows.slice(start, start + perPage);
    let y = panelTop + 250;
    if (slice.length === 0) {
      rowsLayer.add(label(scene, W / 2, y, 'No one can pay this price.', 24, C.softText, {
        originX: 0.5,
        align: 'center'
      }));
    }
    for (const row of slice) {
      const isSelf = row.id === 'hero';
      const sub = `${consentText[row.consent]} — ${row.years} year${row.years === 1 ? '' : 's'} left`;
      const hold = holdButton(scene, {
        x: W / 2,
        y: y + 62,
        w: 580,
        h: 122,
        text: `${row.name} — take ${cost}`,
        subtext: isSelf ? 'Hold. This is your own life.' : `${sub}\nHold to take ${cost} year${cost === 1 ? '' : 's'}.`,
        fill: isSelf ? C.ember : C.ink,
        color: C.creamText,
        fontSize: 24,
        ms: 620,
        depth: depth + 2,
        onComplete: () => {
          root.close();
          scene.time.delayedCall(20, () => onPick?.(row.id));
        }
      });
      rowsLayer.add(hold.container);
      y += 140;
    }

    if (pageCount > 1) {
      const prev = button(scene, {
        x: 170, y: panelTop + panelH - 200, w: 150, h: 64,
        text: 'Prev', fontSize: 20, fill: C.paperDark, color: C.inkText,
        disabled: page <= 0, depth: depth + 2,
        onClick: () => scene.time.delayedCall(0, () => { page -= 1; render(); })
      });
      const next = button(scene, {
        x: 550, y: panelTop + panelH - 200, w: 150, h: 64,
        text: 'Next', fontSize: 20, fill: C.paperDark, color: C.inkText,
        disabled: page >= pageCount - 1, depth: depth + 2,
        onClick: () => scene.time.delayedCall(0, () => { page += 1; render(); })
      });
      rowsLayer.add(prev.container);
      rowsLayer.add(next.container);
      rowsLayer.add(label(scene, W / 2, panelTop + panelH - 200, `${page + 1} / ${pageCount}`, 20, C.softText, {
        originX: 0.5,
        originY: 0.5
      }));
    }

    const hasNel = state.villagers.some((v) => v.id === 'nel' && v.alive);
    if (hasNel) {
      rowsLayer.add(label(scene, W / 2, panelTop + panelH - 150, 'Nel is protected. The ledger stays shut.', 18, C.emberText, {
        originX: 0.5,
        align: 'center'
      }));
    }

    const cancel = button(scene, {
      x: W / 2, y: panelTop + panelH - 70, w: 300, h: 64,
      text: 'Step back', fontSize: 21,
      fill: C.paperDark, color: C.inkText, depth: depth + 2,
      onClick: () => {
        root.close();
        scene.time.delayedCall(20, () => (onCancel ? onCancel() : null));
      }
    });
    rowsLayer.add(cancel.container);
    root.setScrollFactor(0, 0, true);
  };

  render();
}
