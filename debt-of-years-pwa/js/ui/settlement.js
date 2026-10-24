import { panel, button, holdButton, modal, label, C, W } from './core.js';
import { CONSENT_LABEL } from '../data/villagers.js';

export function settlement(scene, opts) {
  const { state, quietAvailable = false, quietDefault = false, onDeliver, onAuto, onBack } = opts;
  const owed = Math.max(0, state.quota.owed - state.quota.paid);
  const depth = 1600;
  const root = modal(scene, { depth, dimAlpha: 0.7 });

  const panelTop = 50;
  const panelH = 1220;
  const panelY = panelTop + panelH / 2;
  root.add(panel(scene, W / 2, panelY, 700, panelH, { fill: C.paper, lineAlpha: 0.4, radius: 22 }));

  root.add(label(scene, W / 2, panelTop + 58, 'The Gate', 40, C.inkText, {
    originX: 0.5,
    depth: depth + 1
  }));
  root.add(label(scene, W / 2, panelTop + 112, `The city asks for ${owed} years. The city does not ask who.`, 19, C.softText, {
    originX: 0.5,
    align: 'center',
    wrap: 600,
    depth: depth + 1
  }));

  const alloc = {};
  const villagers = state.villagers.filter((v) => v.alive && v.consent !== 'protected');
  const perPage = 4;
  let page = 0;
  let quiet = !!quietDefault && quietAvailable;
  let rowsLayer = scene.add.container(0, 0).setDepth(depth + 1);
  root.add(rowsLayer);
  let rowRefs = [];

  const total = () => Object.values(alloc).reduce((sum, n) => sum + n, 0);
  const pageCount = Math.max(1, Math.ceil(villagers.length / perPage));

  const allocatedText = label(scene, W / 2, panelTop + 806, '', 24, C.inkText, {
    originX: 0.5,
    depth: depth + 2
  });
  root.add(allocatedText);

  const quietNote = label(scene, W / 2, panelTop + 838, '', 16, C.emberText, {
    originX: 0.5,
    align: 'center',
    wrap: 600,
    depth: depth + 2
  });
  root.add(quietNote);

  const deliver = holdButton(scene, {
    x: W / 2,
    y: panelTop + 982,
    w: 600,
    h: 88,
    text: 'Deliver the years',
    subtext: 'Hold to open the gate.',
    fontSize: 25,
    ms: 700,
    depth: depth + 3,
    disabled: true,
    onComplete: () => {
      if (total() !== owed) return;
      const allocations = {};
      for (const [id, years] of Object.entries(alloc)) {
        if (years > 0) allocations[id] = years;
      }
      root.close();
      scene.time.delayedCall(30, () => onDeliver?.(allocations, quiet));
    }
  });
  root.add(deliver.container);

  const auto = holdButton(scene, {
    x: W / 2,
    y: panelTop + 1075,
    w: 600,
    h: 78,
    text: 'Let the collector choose',
    subtext: 'He takes the shortest lives first.',
    fontSize: 22,
    fill: C.emberDark,
    ms: 800,
    depth: depth + 3,
    onComplete: () => {
      root.close();
      scene.time.delayedCall(30, () => onAuto?.(quiet));
    }
  });
  root.add(auto.container);

  const back = button(scene, {
    x: W / 2,
    y: panelTop + 1160,
    w: 240,
    h: 58,
    text: 'Back',
    fontSize: 20,
    fill: C.paperDark,
    color: C.inkText,
    depth: depth + 3,
    onClick: () => {
      root.close();
      scene.time.delayedCall(20, () => onBack?.());
    }
  });
  root.add(back.container);

  const quietButton = () => {
    if (!quietAvailable) {
      quietNote.setText('');
      return;
    }
    const btn = button(scene, {
      x: W / 2,
      y: panelTop + 892,
      w: 430,
      h: 52,
      text: `Take quietly: ${quiet ? 'on' : 'off'}`,
      fontSize: 19,
      fill: quiet ? C.ember : C.paperDark,
      color: quiet ? C.creamText : C.inkText,
      depth: depth + 3,
      onClick: () => {
        quiet = !quiet;
        btn.container.destroy();
        quietButton();
      }
    });
    root.add(btn.container);
    quietNote.setText(quiet ? 'Unwitnessed. The town will not know who paid.' : '');
  };
  quietButton();

  const pager = scene.add.container(0, 0).setDepth(depth + 2);
  root.add(pager);

  const renderRows = () => {
    rowsLayer.removeAll(true);
    rowRefs = [];
    pager.removeAll(true);

    const start = page * perPage;
    const slice = villagers.slice(start, start + perPage);

    slice.forEach((villager, i) => {
      const rowY = panelTop + 195 + i * 135;
      const card = panel(scene, W / 2, rowY, 650, 120, {
        fill: C.paperLight,
        lineAlpha: 0.2,
        radius: 14
      });
      rowsLayer.add(card);

      const portrait = scene.add.image(94, rowY, `portrait_${villager.id}`).setScale(0.62);
      rowsLayer.add(portrait);

      const name = label(scene, 150, rowY - 30, villager.name, 23, C.inkText);
      const sub = label(scene, 150, rowY + 4, `${villager.role} · ${CONSENT_LABEL[villager.consent]}`, 16, C.softText);
      const years = label(scene, 150, rowY + 30, `${villager.years} year${villager.years === 1 ? '' : 's'} left`, 16, C.softText);
      rowsLayer.add([name, sub, years]);

      const minus = button(scene, {
        x: 474, y: rowY, w: 54, h: 54,
        text: '-', fontSize: 28,
        fill: C.paperDark, color: C.inkText,
        depth: depth + 2,
        onClick: () => {
          if ((alloc[villager.id] || 0) > 0) {
            alloc[villager.id] -= 1;
            updateRows();
          }
        }
      });
      const count = label(scene, 538, rowY, '0', 28, C.inkText, {
        originX: 0.5, originY: 0.5
      });
      const plus = button(scene, {
        x: 604, y: rowY, w: 54, h: 54,
        text: '+', fontSize: 28,
        fill: C.paperDark, color: C.inkText,
        depth: depth + 2,
        onClick: () => {
          const current = alloc[villager.id] || 0;
          if (total() < owed && current < villager.years) {
            alloc[villager.id] = current + 1;
            updateRows();
          }
        }
      });
      rowsLayer.add([minus.container, count, plus.container]);

      rowRefs.push({ villager, name, sub, years, count, minus, plus });
    });

    if (slice.length === 0) {
      rowsLayer.add(label(scene, W / 2, panelTop + 300, 'No one is left to ask.', 24, C.softText, {
        originX: 0.5
      }));
    }

    if (pageCount > 1) {
      const prev = button(scene, {
        x: 150, y: panelTop + 730, w: 130, h: 58,
        text: 'Prev', fontSize: 18, fill: C.paperDark, color: C.inkText,
        disabled: page <= 0, depth: depth + 2,
        onClick: () => scene.time.delayedCall(0, () => { page -= 1; renderRows(); })
      });
      const next = button(scene, {
        x: 570, y: panelTop + 730, w: 130, h: 58,
        text: 'Next', fontSize: 18, fill: C.paperDark, color: C.inkText,
        disabled: page >= pageCount - 1, depth: depth + 2,
        onClick: () => scene.time.delayedCall(0, () => { page += 1; renderRows(); })
      });
      pager.add(prev.container);
      pager.add(next.container);
      pager.add(label(scene, W / 2, panelTop + 730, `${page + 1} / ${pageCount}`, 18, C.softText, {
        originX: 0.5, originY: 0.5
      }));
    }

    if (state.villagers.some((v) => v.id === 'nel' && v.alive)) {
      pager.add(label(scene, W / 2, panelTop + 780, 'Nel is not on this page. She is not on any page.', 16, C.emberText, {
        originX: 0.5,
        align: 'center'
      }));
    }

    updateRows();
    root.setScrollFactor(0, 0, true);
  };

  const updateRows = () => {
    const sum = total();
    for (const ref of rowRefs) {
      const amount = alloc[ref.villager.id] || 0;
      ref.count.setText(String(amount));
      ref.minus.setEnabled(amount > 0);
      ref.plus.setEnabled(sum < owed && amount < ref.villager.years);
      const willDie = amount >= ref.villager.years;
      ref.name.setColor(willDie ? C.emberText : C.inkText);
      ref.sub.setColor(willDie ? C.emberText : C.softText);
      ref.sub.setText(willDie
        ? 'This will take everything they have.'
        : `${ref.villager.role} · ${CONSENT_LABEL[ref.villager.consent]}`);
    }
    allocatedText.setText(`${sum} of ${owed} years assigned`);
    allocatedText.setColor(sum === owed ? C.emberText : C.inkText);
    deliver.setEnabled(sum === owed);
    deliver.setLabel(sum === owed ? 'Deliver the years' : `Deliver ${sum} / ${owed} years`);
  };

  renderRows();
  root.setScrollFactor(0, 0, true);
}
