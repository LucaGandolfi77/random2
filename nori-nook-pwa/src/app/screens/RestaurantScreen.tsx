import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useGameStore } from '@/app/store';
import { navigate } from '@/app/router';
import { Button, Card, EmptyState, IconButton, Pill, ProgressBar, SectionHead } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { RestaurantScene } from '@/components/art/RestaurantScene';
import { DecorArt } from '@/components/art/DecorArt';
import { decorationById } from '@/data/decorations';
import { DECORATIONS } from '@/data/decorations';
import { decorationAmbiance, restaurantTier } from '@/game/restaurant/decor';
import { RESTAURANT_TIERS } from '@/data/restaurantTiers';
import { formatNumber } from '@/utils/format';
import { audio } from '@/audio/engine';

interface DragState {
  uid: string;
  x: number;
  y: number;
}

export const RestaurantScreen = () => {
  const save = useGameStore((state) => state.save);
  const placeDecorationAction = useGameStore((state) => state.placeDecorationAction);
  const removeDecorationAction = useGameStore((state) => state.removeDecorationAction);
  const [editMode, setEditMode] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const sceneRef = useRef<HTMLDivElement>(null);

  const tier = restaurantTier(save);
  const ambiance = decorationAmbiance(save);
  const nextTier = RESTAURANT_TIERS.find((entry) => entry.reputation > save.player.reputation);
  const reputationSpan = nextTier ? nextTier.reputation - tier.reputation : 1;
  const reputationInto = save.player.reputation - tier.reputation;

  const palette = useMemo(() => {
    const counts = new Map<string, number>();
    save.ownedDecorations.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1));
    save.restaurant.decorations.forEach((placed) => {
      const current = counts.get(placed.decorationId) ?? 0;
      if (current > 0) counts.set(placed.decorationId, current - 1);
    });
    return DECORATIONS.filter((decoration) => (counts.get(decoration.id) ?? 0) > 0).map((decoration) => ({
      decoration,
      available: counts.get(decoration.id) ?? 0,
    }));
  }, [save.ownedDecorations, save.restaurant.decorations]);

  const decorations = useMemo(
    () =>
      save.restaurant.decorations.map((placed) =>
        drag && drag.uid === placed.uid ? { ...placed, x: drag.x, y: drag.y } : placed,
      ),
    [save.restaurant.decorations, drag],
  );

  const getPoint = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = sceneRef.current?.getBoundingClientRect();
    if (!rect) return { x: 50, y: 50 };
    return {
      x: Math.max(4, Math.min(96, ((event.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(6, Math.min(94, ((event.clientY - rect.top) / rect.height) * 100)),
    };
  };

  useEffect(() => {
    if (!drag) return;
    const move = (event: globalThis.PointerEvent) => {
      const rect = sceneRef.current?.getBoundingClientRect();
      if (!rect) return;
      setDrag((state) =>
        state
          ? {
              ...state,
              x: Math.max(4, Math.min(96, ((event.clientX - rect.left) / rect.width) * 100)),
              y: Math.max(6, Math.min(94, ((event.clientY - rect.top) / rect.height) * 100)),
            }
          : state,
      );
    };
    const up = () => {
      const state = drag;
      if (state) {
        const placed = save.restaurant.decorations.find((item) => item.uid === state.uid);
        if (placed) {
          const result = placeDecorationAction(placed.decorationId, state.x, state.y, state.uid);
          if (result.ok) void audio.playSfx('drop');
        }
      }
      setDrag(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [drag, save.restaurant.decorations, placeDecorationAction]);

  const handleSceneDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!editMode) return;
    if (!pendingId) {
      setSelectedUid(null);
      return;
    }
    const point = getPoint(event);
    const result = placeDecorationAction(pendingId, point.x, point.y);
    if (result.ok) {
      void audio.playSfx('drop');
      const available = palette.find((entry) => entry.decoration.id === pendingId)?.available ?? 0;
      if (available <= 1) setPendingId(null);
    }
  };

  const handleItemDown = (uid: string, event: ReactPointerEvent<HTMLDivElement>) => {
    if (!editMode) return;
    event.stopPropagation();
    setSelectedUid(uid);
    setPendingId(null);
    const point = getPoint(event);
    setDrag({ uid, x: point.x, y: point.y });
    setSelectedUid(uid);
  };

  const selected = save.restaurant.decorations.find((item) => item.uid === selectedUid);

  return (
    <div className="screen">
      <div className="page-head">
        <div className="page-head__copy">
          <span className="eyebrow">Your little restaurant</span>
          <h1>{tier.name}</h1>
          <p>{tier.description}</p>
        </div>
        <div className="page-head__action">
          <Button
            variant={editMode ? 'primary' : 'soft'}
            size="sm"
            icon={editMode ? 'check' : 'edit'}
            onClick={() => {
              setEditMode((value) => !value);
              setPendingId(null);
              setSelectedUid(null);
            }}
          >
            {editMode ? 'Done' : 'Decorate'}
          </Button>
        </div>
      </div>

      <div
        ref={sceneRef}
        className={editMode ? 'decor-edit-wrap is-editing' : ''}
        onPointerDown={handleSceneDown}
        style={{ touchAction: editMode ? 'none' : undefined }}
      >
        <RestaurantScene
          tier={tier}
          decorations={decorations}
          interactive={editMode}
          selectedUid={selectedUid}
          onItemPointerDown={handleItemDown}
        />
        {editMode ? (
          <div className="decor-edit-hint">
            <Icon name="shuffle" size={14} />
            <span>
              {pendingId
                ? 'Tap the room to place your decoration.'
                : selected
                  ? 'Drag the selected piece, or put it back in storage.'
                  : 'Pick a piece below, then tap the room. Drag placed pieces to move them.'}
            </span>
          </div>
        ) : null}
      </div>

      {editMode ? (
        <Card className="restaurant-sheet">
          <SectionHead
            title="Decoration storage"
            subtitle={`${palette.length} kinds available · ambiance +${ambiance}`}
            icon="plant"
            action={
              <Button size="sm" variant="ghost" icon="shop" onClick={() => navigate('/shop')}>
                Shop
              </Button>
            }
          />
          {selected ? (
            <div className="row row--between" style={{ padding: '8px 2px' }}>
              <div className="row">
                <Icon name="edit" size={16} />
                <strong className="small">{decorationById(selected.decorationId)?.name}</strong>
              </div>
              <Button size="sm" variant="ghost" icon="trash" onClick={() => removeDecorationAction(selected.uid)}>
                Put back
              </Button>
            </div>
          ) : null}
          {palette.length > 0 ? (
            <div className="decor-palette">
              {palette.map(({ decoration, available }) => (
                <button
                  key={decoration.id}
                  type="button"
                  className={`decor-chip ${pendingId === decoration.id ? 'is-selected' : ''}`.trim()}
                  onClick={() => setPendingId((current) => (current === decoration.id ? null : decoration.id))}
                  aria-label={`Place ${decoration.name}`}
                >
                  <DecorArt decoration={decoration} size={42} />
                  <span>{decoration.name}</span>
                  <small>×{available}</small>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="plant"
              title="Your storage is cozy but empty"
              message="Buy a few decorations in the shop and they will appear here."
              action={<Button size="sm" variant="secondary" icon="shop" onClick={() => navigate('/shop')}>Visit the shop</Button>}
            />
          )}
        </Card>
      ) : (
        <>
          <Card>
            <SectionHead
              title="The nook today"
              subtitle="Every chair, lamp and plant makes the room feel more like you."
              icon="restaurant"
              action={
                <IconButton icon="edit" label="Decorate" variant="soft" onClick={() => setEditMode(true)} />
              }
            />
            <div className="restaurant-meta" style={{ marginTop: 10 }}>
              <Pill tone="matcha" icon="star">Ambiance +{ambiance}</Pill>
              <Pill tone="sakura" icon="users">{tier.seats} seats</Pill>
              <Pill tone="gold" icon="restaurant">{save.restaurant.decorations.length} {save.restaurant.decorations.length === 1 ? 'piece' : 'pieces'} placed</Pill>
              <Pill icon="coin">{formatNumber(save.player.coins)}</Pill>
            </div>
            <div style={{ marginTop: 12 }}>
              <ProgressBar
                value={nextTier ? reputationInto : 1}
                max={nextTier ? reputationSpan : 1}
                tone="gold"
                label={nextTier ? `Next: ${nextTier.name}` : 'Grand restaurant'}
                showValue={Boolean(nextTier)}
              />
            </div>
            <p className="muted small" style={{ marginTop: 8 }}>
              Reputation {save.player.reputation}
              {nextTier ? ` · ${Math.max(0, nextTier.reputation - save.player.reputation)} more to grow the room.` : ' · The whole street loves you.'}
            </p>
          </Card>

          <Card variant="soft">
            <SectionHead title="Kitchen & nook upgrades" subtitle="Small changes you can feel while cooking" icon="shop" />
            <div className="tag-row" style={{ marginTop: 10 }}>
              {(['rice_cooker', 'knives', 'fridge', 'conveyor', 'takeaway'] as const).map((id) => {
                const labels: Record<string, string> = {
                  rice_cooker: 'Rice cooker',
                  knives: 'Knives',
                  fridge: 'Fridge',
                  conveyor: 'Conveyor',
                  takeaway: 'Bento station',
                };
                return (
                  <Pill key={id} tone="matcha" icon="edit">
                    {labels[id]} Lv {save.restaurant.upgrades[id] ?? 0}
                  </Pill>
                );
              })}
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <Button size="sm" variant="secondary" icon="shop" onClick={() => navigate('/shop')}>
                Upgrade kitchen
              </Button>
              <Button size="sm" variant="ghost" icon="users" onClick={() => navigate('/shop')}>
                Meet the staff
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};
