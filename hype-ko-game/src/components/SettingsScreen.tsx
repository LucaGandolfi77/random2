import { useEffect, useState } from 'react';
import {
  ACTIONS,
  ACTION_LABELS,
  DEFAULT_P1_BINDINGS,
  DEFAULT_P2_BINDINGS,
  cloneBindings,
  keyLabel,
  type Action,
  type Bindings
} from '../game/input/bindings';
import { DEFAULT_SETTINGS, type GameSettings } from '../utils/storage';
import { BackButton, NeonButton, SectionTitle } from './ui';

export interface SettingsScreenProps {
  settings: GameSettings;
  onChange: (settings: GameSettings) => void;
  onBack: () => void;
}

type Listening = { player: 0 | 1; action: Action } | null;

export function SettingsScreen({ settings, onChange, onBack }: SettingsScreenProps) {
  const [listening, setListening] = useState<Listening>(null);
  const [controlTab, setControlTab] = useState<0 | 1>(0);

  useEffect(() => {
    if (!listening) return;
    const onKey = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.code === 'Escape') {
        setListening(null);
        return;
      }
      if (event.repeat) return;
      assignKey(listening.player, listening.action, event.code);
      setListening(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [listening]);

  const update = (patch: Partial<GameSettings>) => onChange({ ...settings, ...patch });

  const assignKey = (player: 0 | 1, action: Action, code: string) => {
    const bindings: Bindings = cloneBindings(player === 0 ? settings.bindingsP1 : settings.bindingsP2);
    for (const other of ACTIONS) {
      if (other !== action) bindings[other] = bindings[other].filter((item) => item !== code);
    }
    bindings[action] = [code];
    update(player === 0 ? { bindingsP1: bindings } : { bindingsP2: bindings });
  };

  const resetBindings = (player: 0 | 1) => {
    update(
      player === 0
        ? { bindingsP1: cloneBindings(DEFAULT_P1_BINDINGS) }
        : { bindingsP2: cloneBindings(DEFAULT_P2_BINDINGS) }
    );
  };

  const resetAll = () => {
    onChange({
      ...DEFAULT_SETTINGS,
      bindingsP1: cloneBindings(DEFAULT_P1_BINDINGS),
      bindingsP2: cloneBindings(DEFAULT_P2_BINDINGS)
    });
    setListening(null);
  };

  const bindings = controlTab === 0 ? settings.bindingsP1 : settings.bindingsP2;

  return (
    <div className="screen settings-screen">
      <div className="screen__topbar">
        <BackButton onClick={onBack} />
        <div className="screen__mode">IMPOSTAZIONI</div>
        <span className="screen__micro">salvate in locale</span>
      </div>

      <SectionTitle
        eyebrow="REGIA"
        title="CALIBRA L'ESPERIENZA"
        subtitle="Audio, video, comandi. Tutto quello che i critici dicono non conti."
      />

      <div className="settings-layout">
        <section className="settings-card">
          <h3>AUDIO</h3>
          <Slider
            label="VOLUME GENERALE"
            value={settings.masterVolume}
            onChange={(value) => update({ masterVolume: value })}
          />
          <Slider
            label="MUSICA"
            value={settings.musicVolume}
            onChange={(value) => update({ musicVolume: value })}
          />
          <Slider label="EFFETTI" value={settings.sfxVolume} onChange={(value) => update({ sfxVolume: value })} />
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={settings.announcer}
              onChange={(event) => update({ announcer: event.target.checked })}
            />
            <span>Vocina dell'annunciatore</span>
            <small>Spegni se hai vicini che lavorano.</small>
          </label>
        </section>

        <section className="settings-card">
          <h3>VIDEO</h3>
          <div className="option-group">
            <span className="option-label">QUALITÀ</span>
            <div className="chip-row">
              {(['low', 'medium', 'high'] as const).map((quality) => (
                <button
                  key={quality}
                  type="button"
                  className={`chip ${settings.quality === quality ? 'is-active' : ''}`}
                  onClick={() => update({ quality })}
                >
                  {quality === 'low' ? 'BASSA' : quality === 'medium' ? 'MEDIA' : 'ALTA'}
                </button>
              ))}
            </div>
            <span className="option-hint">
              Il gioco usa WebGPU quando disponibile, con fallback automatico a WebGL2.
            </span>
          </div>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={settings.reduceMotion}
              onChange={(event) => update({ reduceMotion: event.target.checked })}
            />
            <span>Riduci movimento</span>
            <small>Meno camera shake e lampeggi.</small>
          </label>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={settings.showHints}
              onChange={(event) => update({ showHints: event.target.checked })}
            />
            <span>Mostra suggerimenti in partita</span>
          </label>
          <div className="option-group">
            <span className="option-label">COMANDI TOUCH</span>
            <div className="chip-row">
              {(['auto', 'on', 'off'] as const).map((touchControls) => (
                <button
                  key={touchControls}
                  type="button"
                  className={`chip ${settings.touchControls === touchControls ? 'is-active' : ''}`}
                  onClick={() => update({ touchControls })}
                >
                  {touchControls === 'auto' ? 'AUTO' : touchControls === 'on' ? 'SEMPRE' : 'MAI'}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="settings-card settings-card--controls">
          <div className="settings-card__head">
            <h3>COMANDI</h3>
            <div className="chip-row">
              <button
                type="button"
                className={`chip ${controlTab === 0 ? 'is-active' : ''}`}
                onClick={() => {
                  setControlTab(0);
                  setListening(null);
                }}
              >
                P1
              </button>
              <button
                type="button"
                className={`chip ${controlTab === 1 ? 'is-active' : ''}`}
                onClick={() => {
                  setControlTab(1);
                  setListening(null);
                }}
              >
                P2
              </button>
            </div>
          </div>
          <p className="settings-card__hint">
            Clicca un tasto e premi il nuovo input. Esc annulla. Supporto gamepad automatico.
          </p>
          <div className="keybind-list">
            {ACTIONS.map((action) => (
              <div key={action} className="keybind-row">
                <span>{ACTION_LABELS[action]}</span>
                <div className="keybind-keys">
                  {bindings[action].map((code) => (
                    <kbd key={code}>{keyLabel(code)}</kbd>
                  ))}
                </div>
                <button
                  type="button"
                  className={`keybind-edit ${
                    listening?.player === controlTab && listening.action === action ? 'is-listening' : ''
                  }`}
                  onClick={() => setListening({ player: controlTab, action })}
                >
                  {listening?.player === controlTab && listening.action === action ? 'PREMI…' : 'CAMBIA'}
                </button>
              </div>
            ))}
          </div>
          <div className="settings-card__actions">
            <NeonButton variant="ghost" onClick={() => resetBindings(controlTab)}>
              RIPRISTINA COMANDI {controlTab === 0 ? 'P1' : 'P2'}
            </NeonButton>
            <NeonButton variant="danger" onClick={resetAll}>
              RIPRISTINA TUTTO
            </NeonButton>
          </div>
        </section>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="slider-row">
      <span>{label}</span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <strong>{Math.round(value * 100)}%</strong>
    </label>
  );
}
