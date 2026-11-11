import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { MiniGameProps } from '../types';
import { scoreFanRice, scorePlateArt, scoreRollMaster } from '../scoring';
import { clamp } from '@/utils/math';
import { SushiArt } from '@/components/art/SushiArt';

interface SwipeSample {
  duration: number;
  direction: number;
  straightness: number;
}

export const FanRiceGame = ({ relax, onFinish }: MiniGameProps) => {
  const [count, setCount] = useState(0);
  const [lastDirection, setLastDirection] = useState(0);
  const start = useRef<{ x: number; y: number; time: number } | null>(null);
  const samples = useRef<SwipeSample[]>([]);
  const finished = useRef(false);

  const complete = () => {
    if (finished.current) return;
    finished.current = true;
    const values = samples.current;
    const alternations = values.reduce((sum, sample, index) => {
      if (index === 0) return 0;
      return sum + (sample.direction !== values[index - 1]?.direction ? 1 : 0);
    }, 0);
    const rhythm = values.length > 1 ? alternations / (values.length - 1) : 0;
    const speeds = values.map((sample) => clamp(1 - Math.abs(sample.duration - (relax ? 0.45 : 0.36)) / 0.55, 0, 1));
    const averageSpeed = speeds.length > 0 ? speeds.reduce((sum, value) => sum + value, 0) / speeds.length : 0;
    const mean = speeds.length > 0 ? averageSpeed : 0;
    const variance = speeds.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, speeds.length);
    const consistency = clamp(1 - Math.sqrt(variance) / Math.max(0.05, mean));
    onFinish(scoreFanRice({ rhythm, speed: averageSpeed, consistency }));
  };

  const addSwipe = (direction: number, duration: number, straightness = 1) => {
    if (finished.current) return;
    samples.current.push({ direction, duration, straightness });
    setLastDirection(direction);
    const next = samples.current.length;
    setCount(next);
    if (next >= 6) window.setTimeout(complete, 350);
  };

  const handleDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    start.current = { x: event.clientX, y: event.clientY, time: performance.now() };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!start.current) return;
    const dx = event.clientX - start.current.x;
    const dy = event.clientY - start.current.y;
    const duration = (performance.now() - start.current.time) / 1000;
    start.current = null;
    if (Math.abs(dx) < 30 || Math.abs(dx) < Math.abs(dy)) return;
    const direction = Math.sign(dx);
    addSwipe(direction, duration, clamp(1 - Math.abs(dy) / Math.max(30, Math.abs(dx))));
  };

  return (
    <div className="mg-game mg-fan-game">
      <div className="mg-fan-stage" onPointerDown={handleDown} onPointerUp={handleUp}>
        <div className={`mg-fan ${lastDirection > 0 ? 'is-right' : 'is-left'}`.trim()}>
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="mg-fan-rice">
          <div className="mg-fan-grain g1" />
          <div className="mg-fan-grain g2" />
          <div className="mg-fan-grain g3" />
        </div>
        <div className="mg-fan-wave">
          {Array.from({ length: 6 }).map((_, index) => (
            <span key={index} className={index < count ? 'is-done' : ''} />
          ))}
        </div>
      </div>
      <div className="mg-meter">
        <span className="mg-meter__label">Fan strokes</span>
        <div className="mg-bar">
          <span style={{ width: `${(count / 6) * 100}%` }} />
        </div>
        <span className="mg-meter__value">{count}/6</span>
      </div>
      <div className="mg-actions">
        <button type="button" className="btn btn--soft btn--sm" onClick={() => addSwipe(-1, 0.4)}>
          ← Fan
        </button>
        <button type="button" className="btn btn--soft btn--sm" onClick={() => addSwipe(1, 0.4)}>
          Fan →
        </button>
      </div>
      <p className="mg-hint">Swipe left and right in a calm rhythm. Alternating directions keeps the grains happy.</p>
    </div>
  );
};

export const RollMasterGame = ({ relax, onFinish }: MiniGameProps) => {
  const [rolls, setRolls] = useState(0);
  const [message, setMessage] = useState('Swipe upward along the bamboo mat');
  const start = useRef<{ x: number; y: number; time: number } | null>(null);
  const samples = useRef<Array<{ duration: number; straightness: number }>>([]);
  const finished = useRef(false);

  const addRoll = (duration: number, straightness: number) => {
    samples.current.push({ duration, straightness: straightness });
    setRolls(samples.current.length);
    setMessage(samples.current.length >= 3 ? 'Close the roll with a gentle press' : 'Nice. Again, gently.');
  };

  const handleDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    start.current = { x: event.clientX, y: event.clientY, time: performance.now() };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!start.current) return;
    const dx = event.clientX - start.current.x;
    const dy = event.clientY - start.current.y;
    const duration = (performance.now() - start.current.time) / 1000;
    start.current = null;
    if (dy > -35) return;
    addRoll(duration, clamp(1 - Math.abs(dx) / Math.max(20, Math.abs(dy))));
  };

  const close = () => {
    if (finished.current) return;
    finished.current = true;
    const values = samples.current;
    const pressureError =
      values.length > 0
        ? values.reduce((sum, value) => sum + Math.min(1, Math.abs(value.duration - (relax ? 0.55 : 0.42)) / 0.6), 0) / values.length
        : 1;
    const smoothness =
      values.length > 0 ? values.reduce((sum, value) => sum + value.straightness, 0) / values.length : 0;
    onFinish(scoreRollMaster({ pressureError, smoothness, closure: Math.min(1, values.length / 3) }));
  };

  return (
    <div className="mg-game mg-roll">
      <div className="mg-roll-stage" onPointerDown={handleDown} onPointerUp={handleUp}>
        <div className="mg-bamboo">
          {Array.from({ length: 8 }).map((_, index) => (
            <span key={index} style={{ bottom: `${index * 11}%` }} />
          ))}
        </div>
        <div className="mg-roll-sushi" style={{ transform: `translate(-50%, -50%) rotate(${rolls * 28}deg)` }}>
          <SushiArt recipeId="salmon_avocado_roll" size={146} />
        </div>
        <div className="mg-roll-arrows">
          {Array.from({ length: 3 }).map((_, index) => (
            <span key={index} className={index < rolls ? 'is-done' : ''}>↑</span>
          ))}
        </div>
      </div>
      <div className="row row--between" style={{ width: '100%' }}>
        <div>
          <span className="eyebrow">Rolling</span>
          <p className="muted small">{message}</p>
        </div>
        <div className="row">
          <button type="button" className="btn btn--soft btn--sm" onClick={() => addRoll(0.42, 0.92)}>
            Roll gently
          </button>
          <button type="button" className="btn btn--primary btn--sm" onClick={close} disabled={rolls === 0}>
            Close roll
          </button>
        </div>
      </div>
      <p className="mg-hint">Three calm upward swipes, then close. Speed and a straight wrist make a tidy maki.</p>
    </div>
  );
};

interface Piece {
  id: string;
  recipeId: string;
  x: number;
  y: number;
}

const initialPieces: Piece[] = [
  { id: 'p1', recipeId: 'salmon_nigiri', x: 25, y: 35 },
  { id: 'p2', recipeId: 'cucumber_maki', x: 50, y: 25 },
  { id: 'p3', recipeId: 'tamago_nigiri', x: 74, y: 38 },
];

export const PlateArtGame = ({ onFinish }: MiniGameProps) => {
  const plateRef = useRef<HTMLDivElement>(null);
  const [pieces, setPieces] = useState(initialPieces);
  const [dragging, setDragging] = useState<string | null>(null);
  const [garnish, setGarnish] = useState(false);
  const [moved, setMoved] = useState(0);
  const finished = useRef(false);

  const movePiece = (id: string, event: ReactPointerEvent<HTMLDivElement>) => {
    if (!plateRef.current) return;
    const rect = plateRef.current.getBoundingClientRect();
    const x = clamp(((event.clientX - rect.left) / rect.width) * 100, 12, 88);
    const y = clamp(((event.clientY - rect.top) / rect.height) * 100, 18, 82);
    setPieces((current) => current.map((piece) => (piece.id === id ? { ...piece, x, y } : piece)));
  };

  const serve = () => {
    if (finished.current) return;
    finished.current = true;
    const avgX = pieces.reduce((sum, piece) => sum + piece.x, 0) / pieces.length;
    const avgY = pieces.reduce((sum, piece) => sum + piece.y, 0) / pieces.length;
    const minX = Math.min(...pieces.map((piece) => piece.x));
    const maxX = Math.max(...pieces.map((piece) => piece.x));
    const minY = Math.min(...pieces.map((piece) => piece.y));
    const maxY = Math.max(...pieces.map((piece) => piece.y));
    const pairDistance =
      (Math.hypot(pieces[0]!.x - pieces[1]!.x, pieces[0]!.y - pieces[1]!.y) +
        Math.hypot(pieces[1]!.x - pieces[2]!.x, pieces[1]!.y - pieces[2]!.y) +
        Math.hypot(pieces[0]!.x - pieces[2]!.x, pieces[0]!.y - pieces[2]!.y)) /
      3;
    const symmetry = clamp(100 - Math.abs(avgX - 50) * 2.8 - Math.abs(avgY - 50) * 1.4);
    const spacing = clamp(100 - Math.abs(pairDistance - 29) * 3.2);
    const coverage = clamp(((maxX - minX) / 62) * 70 + ((maxY - minY) / 38) * 30);
    const creativity = clamp(58 + Math.min(24, moved * 8) + (garnish ? 14 : 0));
    onFinish(scorePlateArt({ symmetry, spacing, coverage, creativity }));
  };

  return (
    <div className="mg-game mg-plate-game">
      <div ref={plateRef} className="mg-plate" onPointerUp={() => setDragging(null)}>
        <span className="mg-plate-ring" />
        {pieces.map((piece) => (
          <div
            key={piece.id}
            className={`mg-plate-piece ${dragging === piece.id ? 'is-dragging' : ''}`.trim()}
            style={{ left: `${piece.x}%`, top: `${piece.y}%`, touchAction: 'none' }}
            onPointerDown={(event) => {
              setDragging(piece.id);
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (dragging === piece.id) movePiece(piece.id, event);
            }}
            onPointerUp={(event) => {
              setDragging(null);
              setMoved((value) => value + 1);
              event.currentTarget.releasePointerCapture(event.pointerId);
            }}
          >
            <SushiArt recipeId={piece.recipeId} size={104} />
          </div>
        ))}
        {garnish ? (
          <span className="mg-plate-garnish">
            <i />
            <i />
            <b />
          </span>
        ) : null}
      </div>
      <div className="mg-actions">
        <button type="button" className="btn btn--soft btn--sm" onClick={() => setGarnish((value) => !value)}>
          {garnish ? 'Remove garnish' : 'Add a tiny flower'}
        </button>
        <button type="button" className="btn btn--primary btn--sm" onClick={serve}>
          Serve the plate
        </button>
      </div>
      <p className="mg-hint">Drag the pieces into a balanced composition. Space and little details matter.</p>
    </div>
  );
};
