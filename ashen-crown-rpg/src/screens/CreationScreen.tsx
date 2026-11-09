import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type { AncestryId, Appearance, AttributeKey, Attributes, BackgroundId, ClassId } from '@/core/types';
import { ancestries, ancestryById } from '@/data/ancestries';
import { backgrounds, classes, classById } from '@/data/classes';
import { abilityById } from '@/data/abilities';
import { useGameStore } from '@/core/gameStore';
import { modifier } from '@/core/rng';
import { Portrait } from '@/ui/Portrait';
import { CrownSigil, Eightsigil } from '@/ui/CrownSigil';
import { cx, signed } from '@/utils';

const ATTR_KEYS: AttributeKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const ATTR_LABELS: Record<AttributeKey, string> = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma'
};

const COST: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };

const PRESETS: Record<ClassId, Attributes> = {
  warrior: { str: 15, dex: 12, con: 14, int: 8, wis: 10, cha: 13 },
  rogue: { str: 8, dex: 15, con: 12, int: 11, wis: 12, cha: 14 },
  mage: { str: 8, dex: 13, con: 12, int: 15, wis: 14, cha: 10 },
  cleric: { str: 12, dex: 10, con: 14, int: 8, wis: 15, cha: 13 },
  ranger: { str: 12, dex: 15, con: 14, int: 8, wis: 13, cha: 10 },
  warlock: { str: 8, dex: 13, con: 14, int: 10, wis: 12, cha: 15 }
};

const SKINS = ['#f0d1b2', '#dcb493', '#c69b79', '#a87752', '#805339', '#5e3b2a', '#d8ad8a'];
const HAIRS = ['#201915', '#3a2820', '#5a3b28', '#8a6846', '#c6b18b', '#77362f', '#b4b8bb', '#432b45'];
const EYES = ['#6f8a6a', '#7a5f3d', '#4d6b82', '#8a7a52', '#9a5340', '#605675', '#aeb9a1', '#c19a58'];
const OUTFITS = ['#2f2b2a', '#3c3229', '#2b3038', '#3b2e34', '#283530', '#4b3a2e'];
const STYLES = ['Cropped', 'Tied back', 'Long', 'Braided', 'Wild', 'Hooded'];
const MARKINGS = ['none', 'scar', 'ritual', 'crown'] as const;

const NAMES: Record<AncestryId, string[]> = {
  erdan: ['Aren Voss', 'Brynna Vale', 'Cassian Rook', 'Dalia Fen', 'Ewan Marr'],
  aelborn: ['Aelith Rune', 'Serein Leth', 'Aeven Dusk', 'Nym Solace', 'Caelith Vey'],
  cindral: ['Torvald Ember', 'Raska Coalson', 'Vena Ash', 'Boldre Cinder', 'Hessa Forge'],
  tidewrought: ['Neris Tidal', 'Ondrei Salt', 'Maren Deep', 'Cove Ansel', 'Lirra Wrack'],
  stoneborn: ['Orun Stone', 'Dagna Deepdel', 'Barthol Granite', 'Kessa Marl', 'Grimm Under'],
  wraithmarked: ['Morrow', 'Leth Shade', 'Corvin Vane', 'Vale Unseen', 'Mora Thin']
};

const makeAppearance = (ancestry: AncestryId, seed = Math.floor(Math.random() * 900)): Appearance => ({
  seed,
  skin: SKINS[Math.floor(Math.random() * SKINS.length)],
  hair: HAIRS[Math.floor(Math.random() * HAIRS.length)],
  hairStyle: Math.floor(Math.random() * 6),
  eyes: EYES[Math.floor(Math.random() * EYES.length)],
  marking: ancestry === 'wraithmarked' ? 'ritual' : ancestry === 'cindral' ? 'scar' : 'none',
  accent: ancestryById[ancestry]?.palette ?? '#b08b51',
  outfit: OUTFITS[Math.floor(Math.random() * OUTFITS.length)]
});

const costTotal = (attributes: Attributes): number =>
  ATTR_KEYS.reduce((sum, key) => sum + (COST[attributes[key]] ?? 0), 0);

export function CreationScreen() {
  const newGame = useGameStore((state) => state.newGame);
  const setScreen = useGameStore((state) => state.setScreen);
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [ancestry, setAncestry] = useState<AncestryId>('erdan');
  const [classId, setClassId] = useState<ClassId>('warrior');
  const [background, setBackground] = useState<BackgroundId>('soldier');
  const [difficulty, setDifficulty] = useState<'story' | 'balanced' | 'tactician'>('balanced');
  const [attributes, setAttributes] = useState<Attributes>({ ...PRESETS.warrior });
  const [appearance, setAppearance] = useState<Appearance>(() => makeAppearance('erdan'));

  const ancestryDef = ancestryById[ancestry];
  const classDef = classById[classId];
  const backgroundDef = backgrounds.find((entry) => entry.id === background)!;
  const spent = costTotal(attributes);
  const remaining = 27 - spent;

  const finalAttributes = useMemo(() => {
    const result: Attributes = { ...attributes };
    for (const [key, bonus] of Object.entries(ancestryDef.bonuses)) {
      result[key as AttributeKey] += bonus ?? 0;
    }
    return result;
  }, [attributes, ancestryDef]);

  const maxHpPreview =
    classDef.hpBase + modifier(finalAttributes.con) + (background === 'soldier' ? 2 : 0);

  const chooseAncestry = (id: AncestryId) => {
    setAncestry(id);
    setAppearance((current) => ({
      ...current,
      accent: ancestryById[id].palette,
      marking: id === 'wraithmarked' ? 'ritual' : current.marking
    }));
  };

  const chooseClass = (id: ClassId) => {
    setClassId(id);
    setAttributes({ ...PRESETS[id] });
  };

  const adjustAttribute = (key: AttributeKey, delta: number) => {
    setAttributes((current) => {
      const next = { ...current };
      const nextValue = next[key] + delta;
      if (nextValue < 8 || nextValue > 15) return current;
      const costDelta = (COST[nextValue] ?? 0) - (COST[next[key]] ?? 0);
      if (costDelta > 0 && costDelta > 27 - costTotal(current)) return current;
      next[key] = nextValue;
      return next;
    });
  };

  const randomize = () => setAppearance(makeAppearance(ancestry));
  const suggestName = () => {
    const pool = NAMES[ancestry];
    setName(pool[Math.floor(Math.random() * pool.length)]);
  };

  const canContinue = step !== 2 || remaining === 0;
  const finalStep = step === 3;

  const next = () => {
    if (finalStep) {
      newGame({ name, ancestry, classId, background, attributes, appearance, difficulty });
      return;
    }
    if (canContinue) setStep((value) => Math.min(3, value + 1));
  };

  return (
    <main className="creation-screen">
      <div className="creation-backdrop" aria-hidden="true">
        <div className="creation-rays" />
        <div className="creation-ash" />
      </div>

      <header className="creation-header">
        <button className="text-btn" onClick={() => (step === 0 ? setScreen('menu') : setStep(step - 1))}>
          ← {step === 0 ? 'Main menu' : 'Previous'}
        </button>
        <div className="creation-steps">
          {['Soul', 'Calling', 'History', 'Oath'].map((label, index) => (
            <button
              key={label}
              className={cx('creation-step', index === step && 'is-active', index < step && 'is-done')}
              onClick={() => setStep(index)}
              disabled={index > step && (index === 3 || (index >= 2 && remaining !== 0))}
            >
              <span className="creation-step-number">{index < step ? '✓' : index + 1}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
        <div className="creation-header-mark">
          <Eightsigil />
          <span>Prologue</span>
        </div>
      </header>

      <div className="creation-layout">
        <aside className="creation-preview">
          <div className="creation-portrait-frame">
            <Portrait appearance={appearance} size="hero" name={name || 'The Unwritten'} />
            <span className="creation-portrait-corner corner-tl" />
            <span className="creation-portrait-corner corner-tr" />
            <span className="creation-portrait-corner corner-bl" />
            <span className="creation-portrait-corner corner-br" />
          </div>
          <h2 className="creation-name">{name.trim() || 'The Unwritten'}</h2>
          <p className="creation-epithet">
            {ancestryDef.name} · {classDef.name}
          </p>
          <div className="creation-tags">
            <span className="tag">{ancestryDef.epithet}</span>
            <span className="tag tag-muted">{backgroundDef.name}</span>
          </div>
          <div className="creation-vitals">
            <div>
              <span className="vital-label">Health</span>
              <span className="vital-value">{maxHpPreview}</span>
            </div>
            <div>
              <span className="vital-label">Resource</span>
              <span className="vital-value">{classDef.resourceBase}</span>
            </div>
            <div>
              <span className="vital-label">Primary</span>
              <span className="vital-value">{ATTR_LABELS[classDef.primary].slice(0, 3)}</span>
            </div>
          </div>
          <p className="creation-preview-note">
            Your portrait, name, and choices will follow you through every ending.
          </p>
          <CrownSigil className="creation-watermark" />
        </aside>

        <section className="creation-content">
          {step === 0 && (
            <div className="creation-step-body">
              <p className="section-kicker">I · The Soul</p>
              <h1>Who answers when the dark calls your name?</h1>
              <p className="section-lead">
                Elarion remembers every soul the Covenant has written. Yours is not in the book. Before the road, before
                the Crown, decide who you were when the story found you.
              </p>

              <div className="field-row name-row">
                <label className="field">
                  <span className="field-label">Name</span>
                  <input
                    className="text-input"
                    value={name}
                    maxLength={28}
                    placeholder="The Unwritten"
                    onChange={(event) => setName(event.target.value)}
                  />
                </label>
                <button className="btn btn-outline name-suggest" onClick={suggestName}>
                  Suggest a name
                </button>
              </div>

              <h3 className="subsection-title">Ancestry</h3>
              <div className="ancestry-grid">
                {ancestries.map((entry) => (
                  <button
                    key={entry.id}
                    className={cx('ancestry-card', ancestry === entry.id && 'is-selected')}
                    onClick={() => chooseAncestry(entry.id)}
                    style={{ '--ancestry-color': entry.palette } as CSSProperties}
                  >
                    <span className="ancestry-dot" />
                    <span className="ancestry-card-head">
                      <strong>{entry.name}</strong>
                      <small>{entry.epithet}</small>
                    </span>
                    <span className="ancestry-bonuses">
                      {Object.entries(entry.bonuses).map(([key, value]) => (
                        <span key={key}>
                          {key.toUpperCase()} {signed(value ?? 0)}
                        </span>
                      ))}
                    </span>
                  </button>
                ))}
              </div>

              <div className="ancestry-detail panel-inset">
                <p>{ancestryDef.description}</p>
                <div className="trait-line">
                  <span className="trait-label">{ancestryDef.traitName}</span>
                  <span>{ancestryDef.trait}</span>
                </div>
              </div>

              <div className="appearance-panel">
                <div className="appearance-head">
                  <h3 className="subsection-title">Appearance</h3>
                  <button className="btn btn-small btn-outline" onClick={randomize}>
                    ✦ Randomize
                  </button>
                </div>
                <div className="appearance-controls">
                  <div className="swatch-group">
                    <span className="field-label">Skin</span>
                    <div className="swatches">
                      {SKINS.map((color) => (
                        <button
                          key={color}
                          className={cx('swatch', appearance.skin === color && 'is-selected')}
                          style={{ background: color }}
                          aria-label={`Skin tone ${color}`}
                          onClick={() => setAppearance((current) => ({ ...current, skin: color }))}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="swatch-group">
                    <span className="field-label">Hair</span>
                    <div className="swatches">
                      {HAIRS.map((color) => (
                        <button
                          key={color}
                          className={cx('swatch', appearance.hair === color && 'is-selected')}
                          style={{ background: color }}
                          aria-label={`Hair color ${color}`}
                          onClick={() => setAppearance((current) => ({ ...current, hair: color }))}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="swatch-group">
                    <span className="field-label">Eyes</span>
                    <div className="swatches">
                      {EYES.map((color) => (
                        <button
                          key={color}
                          className={cx('swatch', appearance.eyes === color && 'is-selected')}
                          style={{ background: color }}
                          aria-label={`Eye color ${color}`}
                          onClick={() => setAppearance((current) => ({ ...current, eyes: color }))}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="appearance-row">
                  <div className="appearance-toggle">
                    <span className="field-label">Hair style</span>
                    <div className="stepper">
                      <button
                        className="stepper-btn"
                        onClick={() =>
                          setAppearance((current) => ({
                            ...current,
                            hairStyle: (current.hairStyle + 5) % 6
                          }))
                        }
                      >
                        ←
                      </button>
                      <span>{STYLES[appearance.hairStyle % 6]}</span>
                      <button
                        className="stepper-btn"
                        onClick={() =>
                          setAppearance((current) => ({
                            ...current,
                            hairStyle: (current.hairStyle + 1) % 6
                          }))
                        }
                      >
                        →
                      </button>
                    </div>
                  </div>
                  <div className="appearance-toggle">
                    <span className="field-label">Marking</span>
                    <div className="marking-pills">
                      {MARKINGS.map((marking) => (
                        <button
                          key={marking}
                          className={cx('pill', appearance.marking === marking && 'is-selected')}
                          onClick={() => setAppearance((current) => ({ ...current, marking }))}
                        >
                          {marking}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="creation-step-body">
              <p className="section-kicker">II · The Calling</p>
              <h1>What do you carry into the dark?</h1>
              <p className="section-lead">
                Six paths, each with its own resource, proficiencies, and tactical voice. There are no wrong answers —
                only different ways to survive.
              </p>

              <div className="class-grid">
                {classes.map((entry) => (
                  <button
                    key={entry.id}
                    className={cx('class-card', classId === entry.id && 'is-selected')}
                    onClick={() => chooseClass(entry.id)}
                  >
                    <span className="class-icon">{entry.icon}</span>
                    <span className="class-card-name">{entry.name}</span>
                    <span className="class-card-role">{entry.role}</span>
                    <span className="class-card-meta">
                      {entry.primary.toUpperCase()} / {entry.secondary.toUpperCase()} · {entry.resourceName}
                    </span>
                  </button>
                ))}
              </div>

              <div className="class-detail panel-inset">
                <div className="class-detail-head">
                  <div>
                    <p className="section-kicker">{classDef.role}</p>
                    <h2>{classDef.name}</h2>
                  </div>
                  <div className="class-detail-stats">
                    <span><strong>{classDef.hpBase}</strong> base HP</span>
                    <span><strong>{classDef.resourceBase}</strong> {classDef.resourceName}</span>
                  </div>
                </div>
                <p>{classDef.description}</p>
                <div className="detail-columns">
                  <div>
                    <h4>Armor</h4>
                    <p>{classDef.armor}</p>
                    <h4>Weapons</h4>
                    <p>{classDef.weapon}</p>
                  </div>
                  <div>
                    <h4>Proficiencies</h4>
                    <p>{classDef.proficiencies.join(' · ')}</p>
                    <h4>Favorite attribute</h4>
                    <p>{ATTR_LABELS[classDef.primary]} then {ATTR_LABELS[classDef.secondary]}</p>
                  </div>
                </div>
                <div className="starting-abilities">
                  <h4>Starting abilities</h4>
                  <div className="ability-chips">
                    {classDef.startingAbilities.map((id) => {
                      const ability = abilityById[id];
                      return (
                        <span key={id} className="ability-chip" title={ability?.description}>
                          <span>{ability?.icon}</span> {ability?.name ?? id}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              <h3 className="subsection-title">Difficulty</h3>
              <div className="difficulty-grid">
                {[
                  { id: 'story', label: 'Story', text: 'Enemies are gentler. The world still remembers every choice.' },
                  { id: 'balanced', label: 'Balanced', text: 'The intended experience. Tactics matter, failure is survivable.' },
                  { id: 'tactician', label: 'Tactician', text: 'More health, sharper enemies, less margin for error.' }
                ].map((entry) => (
                  <button
                    key={entry.id}
                    className={cx('difficulty-card', difficulty === entry.id && 'is-selected')}
                    onClick={() => setDifficulty(entry.id as typeof difficulty)}
                  >
                    <strong>{entry.label}</strong>
                    <span>{entry.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="creation-step-body">
              <p className="section-kicker">III · The History</p>
              <h1>What shaped you before the mark?</h1>
              <p className="section-lead">
                Your background grants proficiencies and a small advantage. Your attributes are a pool of 27 points —
                spend them all, then let your ancestry finish the portrait.
              </p>

              <div className="background-grid">
                {backgrounds.map((entry) => (
                  <button
                    key={entry.id}
                    className={cx('background-card', background === entry.id && 'is-selected')}
                    onClick={() => setBackground(entry.id)}
                  >
                    <strong>{entry.name}</strong>
                    <span>{entry.description}</span>
                    <small>{entry.bonus}</small>
                  </button>
                ))}
              </div>

              <div className="attributes-panel panel-inset">
                <div className="attributes-head">
                  <div>
                    <h3>Attributes</h3>
                    <p className="muted small">Base scores · ancestry bonuses are added on the right.</p>
                  </div>
                  <div className={cx('points-chip', remaining === 0 ? 'is-complete' : 'is-warning')}>
                    {remaining} / 27 points left
                  </div>
                </div>
                <div className="attribute-grid">
                  {ATTR_KEYS.map((key) => {
                    const base = attributes[key];
                    const final = finalAttributes[key];
                    const mod = modifier(final);
                    return (
                      <div key={key} className="attribute-row">
                        <div className="attribute-name">
                          <span>{ATTR_LABELS[key]}</span>
                          <small>{key.toUpperCase()}</small>
                        </div>
                        <div className="attribute-stepper">
                          <button
                            className="stepper-btn"
                            onClick={() => adjustAttribute(key, -1)}
                            disabled={base <= 8}
                            aria-label={`Decrease ${ATTR_LABELS[key]}`}
                          >
                            −
                          </button>
                          <span className="attribute-score">{final}</span>
                          <button
                            className="stepper-btn"
                            onClick={() => adjustAttribute(key, 1)}
                            disabled={base >= 15 || remaining <= 0}
                            aria-label={`Increase ${ATTR_LABELS[key]}`}
                          >
                            +
                          </button>
                        </div>
                        <div className="attribute-final">
                          <span className={cx('modifier', mod >= 0 ? 'is-positive' : 'is-negative')}>{signed(mod)}</span>
                          {final !== base && <small>base {base}</small>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {remaining !== 0 && (
                  <p className="form-warning">Spend all 27 points to continue. You can also reset to the recommended spread.</p>
                )}
                <button className="btn btn-small btn-outline" onClick={() => setAttributes({ ...PRESETS[classId] })}>
                  Reset to recommended spread
                </button>
              </div>

              <div className="background-detail panel-inset">
                <h3>{backgroundDef.name}</h3>
                <p>{backgroundDef.description}</p>
                <p className="muted">
                  <strong>Proficiencies:</strong> {backgroundDef.proficiencies.join(' · ')} · <strong>Bonus:</strong>{' '}
                  {backgroundDef.bonus}
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="creation-step-body review-step">
              <p className="section-kicker">IV · The Oath</p>
              <h1>One last look before the road.</h1>
              <p className="section-lead">
                The Fallen Bastion is waiting. You will wake with ash in your mouth, a mark on your soul, and a stranger
                named Kaelen watching you. Choose what you carry.
              </p>

              <div className="review-grid">
                <div className="review-block panel-inset">
                  <h3>{name.trim() || 'The Unwritten'}</h3>
                  <p className="muted">
                    {ancestryDef.name} {classDef.name} · {backgroundDef.name}
                  </p>
                  <div className="review-attributes">
                    {ATTR_KEYS.map((key) => (
                      <div key={key}>
                        <span>{key.toUpperCase()}</span>
                        <strong>{finalAttributes[key]}</strong>
                        <small>{signed(modifier(finalAttributes[key]))}</small>
                      </div>
                    ))}
                  </div>
                  <div className="review-derived">
                    <span>HP <strong>{maxHpPreview}</strong></span>
                    <span>{classDef.resourceName} <strong>{classDef.resourceBase}</strong></span>
                    <span>Difficulty <strong>{difficulty}</strong></span>
                  </div>
                </div>
                <div className="review-block panel-inset">
                  <h3>Your first companions</h3>
                  <p>
                    <strong>Kaelen Voss</strong>, the Grey Knight, waits in the ruins. Five more souls can join you:
                    Nyx, Ilyra, Oren, and Sable — each with a personal reckoning.
                  </p>
                  <div className="review-companion-row">
                    {['Kaelen', 'Nyx', 'Ilyra', 'Oren', 'Sable'].map((companion) => (
                      <span key={companion} className="tag">{companion}</span>
                    ))}
                  </div>
                </div>
                <div className="review-block panel-inset">
                  <h3>What waits below</h3>
                  <p>
                    Four regions, three gods, one Crown. Thirteen quests, four possible endings, and a secret path for
                    those who learn the truth about the Unwritten.
                  </p>
                  <div className="review-tags">
                    <span className="tag tag-muted">Tactical turns</span>
                    <span className="tag tag-muted">Branching dialogue</span>
                    <span className="tag tag-muted">4 endings</span>
                    <span className="tag tag-muted">Offline saves</span>
                  </div>
                </div>
              </div>

              <div className="oath-panel">
                <Eightsigil />
                <p>
                  “The Covenant will keep you. The Choir will free you. The woods will remember you. None of them will
                  tell you the whole truth.”
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      <footer className="creation-footer">
        <button className="btn btn-ghost" onClick={() => (step === 0 ? setScreen('menu') : setStep(step - 1))}>
          {step === 0 ? 'Abandon' : '← Back'}
        </button>
        <div className="creation-footer-mid">
          <span className="creation-footer-hint">
            {step === 0 && 'Every name is a promise.'}
            {step === 1 && `${classDef.name} · ${classDef.resourceName}`}
            {step === 2 && (remaining === 0 ? 'Your fate is balanced.' : `${remaining} points unspent`)}
            {step === 3 && 'The road is open.'}
          </span>
        </div>
        <button className="btn btn-primary creation-next" onClick={next} disabled={!canContinue}>
          {finalStep ? 'Begin the Chronicle ✦' : 'Continue →'}
        </button>
      </footer>
    </main>
  );
}
