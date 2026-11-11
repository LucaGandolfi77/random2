import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { MiniGameProps } from '../types';
import {
  scoreNigiriMaster,
  scoreNoriWrap,
  scorePerfectRice,
  scoreRiceCooker,
  scoreTeaMaster,
  scoreWasabiBalance,
} from '../scoring';
import { clamp } from '@/utils/math';
import { IngredientArt } from '@/components/art/IngredientArt';

export const PerfectRiceGame = ({ relax, onFinish }: MiniGameProps) => {
  const bowlRef = useRef<HTMLDivElement>(null);
  const active = useRef(false);
  const lastAngle = useRef<number | null>(null);
  const travel = useRef(0);
  const bins = useRef(new Set<number>());
  const speeds = useRef<number[]>([]);
  const finished = useRef(false);
  const [cleanliness, setCleanliness] = useState(0);
  const [coverage, setCoverage] = useState(0);
  const [ripple, setRipple] = useState(0);

  const update = () => {
    const clean = clamp((travel.current / (Math.PI * 2 * 3.2)) * 100);
    setCleanliness(clean);
    setCoverage((bins.current.size / 28) * 100);
    setRipple((bins.current.size % 4) + 1);
  };

  const handleMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!active.current || !bowlRef.current) return;
    const rect = bowlRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = event.clientX - cx;
    const dy = event.clientY - cy;
    const distance = Math.hypot(dx, dy);
    if (distance < rect.width * 0.14 || distance > rect.width * 0.52) {
      lastAngle.current = null;
      return;
    }
    const angle = Math.atan2(dy, dx);
    if (lastAngle.current !== null) {
      let delta = angle - lastAngle.current;
      if (delta > Math.PI) delta -= Math.PI * 2;
      if (delta < -Math.PI) delta += Math.PI * 2;
      if (Math.abs(delta) < 0.7) {
        travel.current += Math.abs(delta);
        speeds.current.push(Math.abs(delta));
        if (speeds.current.length > 80) speeds.current.shift();
      }
    }
    bins.current.add(Math.floor(((angle + Math.PI) / (Math.PI * 2)) * 28));
    lastAngle.current = angle;
    update();
  };

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    const values = speeds.current;
    const mean = values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    const variance =
      values.length > 0 ? values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length : 1;
    const consistency = mean > 0 ? 1 - Math.min(1, Math.sqrt(variance) / mean) : 0;
    const stopDelta = clamp(Math.abs((travel.current / (Math.PI * 2 * 3.2)) * 100 - (relax ? 80 : 82)) / 62);
    onFinish(
      scorePerfectRice({
        coverage: bins.current.size / 28,
        consistency,
        stopDelta,
      }),
    );
  };

  const stir = () => {
    travel.current += Math.PI * 2 * (relax ? 0.42 : 0.3);
    for (let index = 0; index < 6; index += 1) {
      bins.current.add((bins.current.size + index * 3) % 28);
    }
    speeds.current.push(0.45, 0.52, 0.4);
    update();
  };

  const cleanLabel = cleanliness < 38 ? 'Cloudy water' : cleanliness < 70 ? 'Getting there' : cleanliness < 92 ? 'Bright and clean' : 'A little too polished';

  return (
    <div className="mg-game mg-rice-wash">
      <div className="mg-bowl-wrap">
        <div
          ref={bowlRef}
          className="mg-rice-bowl"
          onPointerDown={(event) => {
            active.current = true;
            lastAngle.current = null;
            event.currentTarget.setPointerCapture(event.pointerId);
            handleMove(event);
          }}
          onPointerMove={handleMove}
          onPointerUp={() => {
            active.current = false;
            lastAngle.current = null;
          }}
          onPointerCancel={() => {
            active.current = false;
            lastAngle.current = null;
          }}
          onClick={() => {
            if (!active.current) {
              active.current = true;
              window.setTimeout(() => {
                active.current = false;
              }, 120);
            }
          }}
        >
          <div className="mg-bowl-rim" />
          <div className="mg-rice-water" style={{ opacity: 0.25 + cleanliness / 130 }}>
            <span className={`mg-ripple ripple-${ripple}`} />
            <span className="mg-ripple" />
          </div>
          <IngredientArt id="rice_white" size={104} animate={false} />
          <div className="mg-bowl-hint">draw circles in the water</div>
        </div>
      </div>
      <div className="mg-meter-stack">
        <div className="mg-meter">
          <span className="mg-meter__label">{cleanLabel}</span>
          <div className="mg-bar">
            <span style={{ width: `${cleanliness}%` }} />
            <i style={{ left: '82%' }} />
          </div>
          <span className="mg-meter__value">{Math.round(cleanliness)}%</span>
        </div>
        <div className="mg-meter">
          <span className="mg-meter__label">Water coverage</span>
          <div className="mg-bar mg-bar--sky">
            <span style={{ width: `${coverage}%` }} />
          </div>
          <span className="mg-meter__value">{Math.round(coverage)}%</span>
        </div>
      </div>
      <div className="mg-actions">
        <button type="button" className="btn btn--soft btn--sm" onClick={stir}>
          Gentle stir
        </button>
        <button type="button" className="btn btn--primary btn--sm" onClick={finish}>
          Stop washing
        </button>
      </div>
      <p className="mg-hint">Stop when the rice is bright, but not worn out. The dashed mark is the sweet spot.</p>
    </div>
  );
};

export const RiceCookerGame = ({ difficulty, relax, onFinish }: MiniGameProps) => {
  const [needle, setNeedle] = useState(50);
  const [stopped, setStopped] = useState(false);
  const finished = useRef(false);
  const zone = relax ? 26 : 16;
  const speed = relax ? 1.5 : 2.1 + difficulty * 0.25;
  const start = useRef(performance.now());

  useEffect(() => {
    if (stopped) return;
    let raf = 0;
    const tick = () => {
      const elapsed = (performance.now() - start.current) / 1000;
      setNeedle(50 + 49 * Math.sin(elapsed * speed));
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [speed, stopped]);

  const stop = () => {
    if (finished.current) return;
    finished.current = true;
    setStopped(true);
    onFinish(scoreRiceCooker({ needle, target: 50, window: zone }));
  };

  return (
    <div className="mg-game mg-rice-cooker">
      <div className="mg-cooker">
        <div className="mg-steam-cloud">
          <span />
          <span />
          <span />
        </div>
        <div className="mg-cooker-lid" />
        <div className="mg-cooker-body">
          <div className="mg-cooker-light" />
          <div className="mg-cooker-label">のり</div>
        </div>
      </div>
      <div className="mg-timing">
        <div className="mg-timing__bar">
          <span className="mg-timing__perfect" style={{ left: `${50 - zone / 2}%`, width: `${zone}%` }} />
          <span className="mg-timing__needle" style={{ left: `${needle}%` }} />
        </div>
        <div className="mg-timing__scale">
          <span>crisp</span>
          <span>perfect</span>
          <span>mushy</span>
        </div>
      </div>
      <button type="button" className="btn btn--primary btn--lg mg-big-button" onClick={stop} autoFocus>
        Stop the cooker
      </button>
      <p className="mg-hint">The rice is humming. Stop the needle in the green zone. Relaxed mode widens the zone.</p>
    </div>
  );
};

export const NoriWrapGame = ({ relax, onFinish }: MiniGameProps) => {
  const board = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 48, y: 46 });
  const [rotation, setRotation] = useState(0);
  const [dragging, setDragging] = useState(false);
  const finished = useRef(false);

  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging || !board.current) return;
    const rect = board.current.getBoundingClientRect();
    setPos({
      x: clamp(((event.clientX - rect.left) / rect.width) * 100, 10, 90),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100, 10, 90),
    });
  };

  const wrap = () => {
    if (finished.current) return;
    finished.current = true;
    const xError = clamp(Math.abs(pos.x - 50) / 38);
    const yError = clamp(Math.abs(pos.y - 48) / 38);
    const rotationError = clamp(Math.abs(rotation) / (relax ? 55 : 34));
    onFinish(scoreNoriWrap({ xError, yError, rotationError }));
  };

  return (
    <div className="mg-game mg-nori">
      <div className="mg-nori-board" ref={board}>
        <div className="mg-nori-target">
          <span>nori target</span>
        </div>
        <div className="mg-nori-rice">
          <IngredientArt id="rice_white" size={112} animate={false} />
        </div>
        <div
          className={`mg-nori-sheet ${dragging ? 'is-dragging' : ''}`.trim()}
          style={{
            left: `${pos.x}%`,
            top: `${pos.y}%`,
            transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
            touchAction: 'none',
          }}
          onPointerDown={(event) => {
            setDragging(true);
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={move}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
        >
          <span className="mg-nori-face">
            <i />
            <i />
            <b />
          </span>
        </div>
      </div>
      <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn--soft btn--sm" onClick={() => setRotation((value) => value - 12)}>
          Tilt left
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setRotation(0)}>
          Straighten
        </button>
        <button type="button" className="btn btn--soft btn--sm" onClick={() => setRotation((value) => value + 12)}>
          Tilt right
        </button>
      </div>
      <button type="button" className="btn btn--primary mg-big-button" onClick={wrap}>
        Wrap the rice
      </button>
      <p className="mg-hint">Drag the sleepy nori sheet over the rice. Keep it centered and straight.</p>
    </div>
  );
};

export const NigiriMasterGame = ({ relax, onFinish }: MiniGameProps) => {
  const [pressure, setPressure] = useState(8);
  const [holding, setHolding] = useState(false);
  const [time, setTime] = useState(0);
  const values = useRef({ pressure: 8, hold: 0, inZone: 0, holding: false });
  const finished = useRef(false);
  const [message, setMessage] = useState('Press and hold the rice');

  useEffect(() => {
    const timer = window.setInterval(() => {
      const state = values.current;
      if (state.holding) {
        state.pressure = Math.min(100, state.pressure + (relax ? 1.5 : 2.1));
        state.hold += 0.08;
        if (state.pressure >= 42 && state.pressure <= (relax ? 78 : 70)) state.inZone += 0.08;
        setTime(state.hold);
        setMessage(
          state.pressure < 42
            ? 'A little more pressure'
            : state.pressure <= (relax ? 78 : 70)
              ? 'Perfect pressure — hold it'
              : 'Too firm!',
        );
      } else {
        state.pressure = Math.max(0, state.pressure - 2.4);
      }
      setPressure(state.pressure);
      setHolding(state.holding);
    }, 80);
    return () => window.clearInterval(timer);
  }, [relax]);

  const release = () => {
    const state = values.current;
    state.holding = false;
    setHolding(false);
    if (finished.current || state.hold < 0.35) return;
    finished.current = true;
    const idealCenter = relax ? 60 : 56;
    const pressureError = clamp(Math.abs(state.pressure - idealCenter) / 48);
    onFinish(scoreNigiriMaster({ inZoneRatio: state.inZone / Math.max(0.2, state.hold), pressureError }));
  };

  return (
    <div className="mg-game mg-nigiri">
      <div className="mg-nigiri-stage">
        <div className="mg-nigiri-plate">
          <div
            role="button"
            tabIndex={0}
            aria-label="Press and hold to shape the nigiri"
            className={`mg-nigiri-rice ${holding ? 'is-held' : ''}`.trim()}
            style={{ transform: `scale(${1 - Math.min(0.2, pressure / 500)}, ${1 - Math.min(0.12, pressure / 700)})` }}
            onPointerDown={(event) => {
              values.current.holding = true;
              setHolding(true);
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerUp={release}
            onPointerCancel={release}
            onPointerLeave={release}
            onKeyDown={(event) => {
              if (event.key === ' ' || event.key === 'Enter') {
                event.preventDefault();
                if (!values.current.holding) {
                  values.current.holding = true;
                  setHolding(true);
                }
              }
            }}
            onKeyUp={(event) => {
              if (event.key === ' ' || event.key === 'Enter') release();
            }}
          >
            <span />
            <span />
            <span />
            <b />
          </div>
        </div>
        <div className="mg-pressure">
          <span className="mg-pressure__zone" style={{ bottom: `${relax ? 42 : 45}%`, height: `${relax ? 36 : 28}%` }} />
          <span className="mg-pressure__fill" style={{ height: `${pressure}%` }} />
          <span className="mg-pressure__ticks">
            {Array.from({ length: 6 }).map((_, index) => (
              <i key={index} />
            ))}
          </span>
        </div>
      </div>
      <div className="mg-meter">
        <span className="mg-meter__label">{message}</span>
        <div className="mg-bar mg-bar--salmon">
          <span style={{ width: `${Math.min(100, (time / 4) * 100)}%` }} />
        </div>
        <span className="mg-meter__value">{time.toFixed(1)}s</span>
      </div>
      <p className="mg-hint">Press and hold inside the rice to shape it. Release while the pressure is in the green band.</p>
    </div>
  );
};

export const WasabiBalanceGame = ({ onFinish }: MiniGameProps) => {
  const [amount, setAmount] = useState(0.05);
  const finished = useRef(false);
  const target = 0.38;
  const diff = Math.abs(amount - target);
  const mood = amount < 0.18 ? 'A very shy dab' : amount < 0.55 ? 'A happy little tingle' : 'Tears are approaching';
  return (
    <div className="mg-game mg-wasabi">
      <div className="mg-wasabi-stage">
        <div className="mg-wasabi-dish">
          <div
            className="mg-wasabi-blob"
            style={{ width: `${18 + amount * 88}px`, height: `${14 + amount * 72}px`, background: amount > 0.62 ? '#6f9c70' : 'var(--matcha)' }}
          >
            <span className="mg-wasabi-face" data-mood={amount > 0.62 ? 'angry' : 'happy'}>
              <i />
              <i />
              <b />
            </span>
          </div>
          <span className="mg-wasabi-plate" />
          <span className="mg-wasabi-target" style={{ left: `${target * 100}%` }}>
            ideal
          </span>
        </div>
      </div>
      <label className="mg-slider">
        <span>
          Wasabi <strong>{Math.round(amount * 100)}%</strong>
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={amount}
          onChange={(event) => setAmount(Number(event.target.value))}
          aria-label="Amount of wasabi"
        />
      </label>
      <div className="row" style={{ justifyContent: 'space-between', width: '100%' }}>
        <span className="muted tiny">Too little</span>
        <span className="pill pill--matcha">{mood}</span>
        <span className="muted tiny">Too much</span>
      </div>
      <button
        type="button"
        className="btn btn--primary mg-big-button"
        onClick={() => {
          if (finished.current) return;
          finished.current = true;
          onFinish(scoreWasabiBalance({ amount, target }));
        }}
      >
        Add to the plate
      </button>
      <p className="mg-hint">A tiny dab is a kindness. Slide the wasabi until it feels just right.</p>
    </div>
  );
};

export const TeaMasterGame = ({ relax, onFinish }: MiniGameProps) => {
  const [temp, setTemp] = useState(20);
  const [time, setTime] = useState(0);
  const [heating, setHeating] = useState(false);
  const [steeping, setSteeping] = useState(false);
  const finished = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (heating) setTemp((value) => Math.min(100, value + (relax ? 1.1 : 1.7)));
      else setTemp((value) => Math.max(20, value - 0.1));
      if (steeping) setTime((value) => Math.min(12, value + 0.12));
    }, 100);
    return () => window.clearInterval(timer);
  }, [heating, steeping, relax]);

  const pour = () => {
    if (finished.current) return;
    finished.current = true;
    const tempError = clamp(Math.abs(temp - 76) / (relax ? 32 : 20));
    const timeError = clamp(Math.abs(time - 3.2) / (relax ? 4 : 2.2));
    onFinish(scoreTeaMaster({ tempError, timeError }));
  };

  return (
    <div className="mg-game mg-tea">
      <div className="mg-tea-stage">
        <div className="mg-cup">
          <div className="mg-tea-fill" style={{ height: `${Math.min(80, time * 15 + temp / 4)}%` }} />
          <div className={`mg-tea-steam ${heating ? 'is-hot' : ''}`.trim()}>
            <span />
            <span />
            <span />
          </div>
          <span className="mg-cup-handle" />
        </div>
        <div className="mg-tea-readouts">
          <div className={`mg-gauge ${temp >= 65 && temp <= 87 ? 'is-good' : ''}`.trim()}>
            <span>Temperature</span>
            <div className="mg-bar">
              <span style={{ width: `${temp}%` }} />
              <i style={{ left: '68%', width: '20%' }} />
            </div>
            <strong>{Math.round(temp)}°C</strong>
          </div>
          <div className={`mg-gauge ${time >= 2.1 && time <= 4.4 ? 'is-good' : ''}`.trim()}>
            <span>Steeping</span>
            <div className="mg-bar mg-bar--salmon">
              <span style={{ width: `${(time / 8) * 100}%` }} />
              <i style={{ left: '26%', width: '30%' }} />
            </div>
            <strong>{time.toFixed(1)}s</strong>
          </div>
        </div>
      </div>
      <div className="mg-actions">
        <button type="button" className={`btn btn--soft btn--sm ${heating ? 'is-on' : ''}`.trim()} onClick={() => setHeating((value) => !value)}>
          {heating ? 'Stop heating' : 'Heat water'}
        </button>
        <button type="button" className={`btn btn--soft btn--sm ${steeping ? 'is-on' : ''}`.trim()} onClick={() => setSteeping((value) => !value)}>
          {steeping ? 'Stop steeping' : 'Steep tea'}
        </button>
        <button type="button" className="btn btn--primary btn--sm" onClick={pour}>
          Pour the tea
        </button>
      </div>
      <p className="mg-hint">Warm the water to the green zone, steep for a few seconds, then pour.</p>
    </div>
  );
};

