import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Dish } from '@/types/game';
import { SushiArt } from '@/components/art/SushiArt';
import { Button } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { scorePlateArt } from '@/game/mini-games/scoring';
import { clamp } from '@/utils/math';
import { audio } from '@/audio/engine';

interface PlatePiece {
  id: string;
  x: number;
  y: number;
}

interface PlateBoardProps {
  dish: Dish;
  onServe: (score: number) => void;
  onBack?: () => void;
  busy?: boolean;
}

const initial = [
  { id: 'one', x: 28, y: 43 },
  { id: 'two', x: 50, y: 31 },
  { id: 'three', x: 72, y: 45 },
];

const metrics = (pieces: PlatePiece[], garnish: boolean, moved: number) => {
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
  const score = scorePlateArt({ symmetry, spacing, coverage, creativity });
  return { score, symmetry, spacing, coverage, creativity };
};

export const PlateBoard = ({ dish, onServe, onBack, busy = false }: PlateBoardProps) => {
  const plateRef = useRef<HTMLDivElement>(null);
  const [pieces, setPieces] = useState<PlatePiece[]>(initial);
  const [dragging, setDragging] = useState<string | null>(null);
  const [garnish, setGarnish] = useState(false);
  const [moved, setMoved] = useState(0);
  const pieceMetrics = metrics(pieces, garnish, moved);

  const movePiece = (id: string, event: ReactPointerEvent<HTMLDivElement>) => {
    if (!plateRef.current) return;
    const rect = plateRef.current.getBoundingClientRect();
    const x = clamp(((event.clientX - rect.left) / rect.width) * 100, 12, 88);
    const y = clamp(((event.clientY - rect.top) / rect.height) * 100, 18, 82);
    setPieces((current) => current.map((piece) => (piece.id === id ? { ...piece, x, y } : piece)));
  };

  const serve = (score: number) => {
    void audio.playSfx('plate');
    onServe(score);
  };

  return (
    <div className="plate-board">
      <div className="plate-board__head">
        {onBack ? (
          <button type="button" className="text-btn" onClick={onBack}>
            <Icon name="back" size={13} /> Back to assembly
          </button>
        ) : (
          <span className="eyebrow">Plate art</span>
        )}
        <div className="plate-live-score">
          <span>Presentation</span>
          <strong>{pieceMetrics.score}</strong>
        </div>
      </div>
      <div ref={plateRef} className="plate-canvas" onPointerUp={() => setDragging(null)}>
        <span className="plate-canvas__rim" />
        <span className="plate-canvas__inner" />
        {pieces.map((piece) => (
          <div
            key={piece.id}
            className={`plate-piece ${dragging === piece.id ? 'is-dragging' : ''}`.trim()}
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
            <SushiArt recipeId={dish.recipeId} ingredients={dish.ingredients} size={118} />
          </div>
        ))}
        {garnish ? (
          <span className="plate-canvas__garnish" aria-hidden="true">
            <i />
            <i />
            <b />
          </span>
        ) : null}
        <span className="plate-canvas__chopsticks" aria-hidden="true" />
      </div>
      <div className="plate-meter-row">
        <span>Symmetry {Math.round(pieceMetrics.symmetry)}</span>
        <span>Spacing {Math.round(pieceMetrics.spacing)}</span>
        <span>Balance {Math.round(pieceMetrics.coverage)}</span>
      </div>
      <div className="plate-actions">
        <Button variant="soft" size="sm" icon="leaf" onClick={() => setGarnish((value) => !value)}>
          {garnish ? 'Remove garnish' : 'Add garnish'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setPieces(initial);
            setGarnish(false);
            setMoved(0);
          }}
        >
          Reset
        </Button>
      </div>
      <div className="plate-actions">
        <Button variant="ghost" disabled={busy} onClick={() => serve(65)}>
          Serve without plating
        </Button>
        <Button variant="primary" iconRight="arrowRight" disabled={busy} onClick={() => serve(pieceMetrics.score)}>
          Serve this plate
        </Button>
      </div>
      <p className="muted tiny" style={{ textAlign: 'center' }}>
        A balanced plate is worth a little more love. Drag the pieces into a pleasing shape.
      </p>
    </div>
  );
};
