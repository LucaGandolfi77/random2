import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useGameStore } from '@/app/store';
import { navigate } from '@/app/router';
import { Button, Card, Modal, Pill, SectionHead } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { SushiArt } from '@/components/art/SushiArt';
import { IngredientArt } from '@/components/art/IngredientArt';
import { RECIPES, recipeById } from '@/data/recipes';
import { renderPlatePng, type ExportPlacement, type StudioBackground } from '@/utils/canvas';
import { makeId } from '@/utils/id';
import { clamp } from '@/utils/math';
import { audio } from '@/audio/engine';

interface StudioPlacement extends ExportPlacement {
  label: string;
}

const backgrounds: Array<{ id: StudioBackground; name: string; color: string }> = [
  { id: 'cream', name: 'Warm cream', color: '#F7F1E5' },
  { id: 'sakura', name: 'Sakura', color: '#F2D5DA' },
  { id: 'matcha', name: 'Matcha', color: '#DCE6D4' },
  { id: 'midnight', name: 'Midnight', color: '#2F332F' },
  { id: 'coastal', name: 'Coastal', color: '#C9E2E8' },
  { id: 'autumn', name: 'Autumn', color: '#F0D2B2' },
  { id: 'winter', name: 'Winter', color: '#D6E4E8' },
];

const decoPalette: Array<{ id: 'flower' | 'leaf' | 'sesame' | 'ginger'; name: string; ingredientId: string }> = [
  { id: 'flower', name: 'Little flower', ingredientId: 'seasonal_leaf' },
  { id: 'leaf', name: 'Green leaf', ingredientId: 'asparagus' },
  { id: 'sesame', name: 'Sesame', ingredientId: 'sesame' },
  { id: 'ginger', name: 'Ginger', ingredientId: 'ginger' },
];

export const StudioScreen = () => {
  const save = useGameStore((state) => state.save);
  const saveGalleryEntry = useGameStore((state) => state.saveGalleryEntry);
  const [background, setBackground] = useState<StudioBackground>('cream');
  const [title, setTitle] = useState('A quiet little plate');
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [placements, setPlacements] = useState<StudioPlacement[]>([
    { id: 'a', kind: 'sushi', recipeId: 'salmon_nigiri', label: 'Salmon Nigiri', x: 36, y: 48, scale: 1, rotation: 0 },
    { id: 'b', kind: 'sushi', recipeId: 'cucumber_maki', label: 'Cucumber Maki', x: 50, y: 34, scale: 1, rotation: 0 },
    { id: 'c', kind: 'sushi', recipeId: 'tamago_nigiri', label: 'Tamago Nigiri', x: 65, y: 50, scale: 1, rotation: 0 },
  ]);
  const [drag, setDrag] = useState<string | null>(null);

  const availableRecipes = useMemo(() => {
    const discovered = RECIPES.filter((recipe) => save.discoveredRecipes.includes(recipe.id));
    const base = discovered.length > 0 ? discovered : RECIPES.filter((recipe) => ['salmon_nigiri', 'cucumber_maki', 'tamago_nigiri'].includes(recipe.id));
    return base.slice(0, 12);
  }, [save.discoveredRecipes]);

  useEffect(() => {
    if (!drag) return;
    const move = (event: globalThis.PointerEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      setPlacements((current) =>
        current.map((placement) =>
          placement.id === drag
            ? {
                ...placement,
                x: clamp(((event.clientX - rect.left) / rect.width) * 100, 8, 92),
                y: clamp(((event.clientY - rect.top) / rect.height) * 100, 12, 88),
              }
            : placement,
        ),
      );
    };
    const up = () => setDrag(null);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [drag]);

  const addRecipe = (recipeId: string) => {
    if (placements.filter((placement) => placement.kind === 'sushi').length >= 6) return;
    const recipe = recipeById(recipeId);
    if (!recipe) return;
    const placement: StudioPlacement = {
      id: makeId('studio'),
      kind: 'sushi',
      recipeId,
      label: recipe.name,
      x: 28 + ((placements.length * 13) % 44),
      y: 30 + ((placements.length * 9) % 36),
      scale: 1,
      rotation: 0,
    };
    setPlacements((current) => [...current, placement]);
    setSelected(placement.id);
    void audio.playSfx('pickup');
  };

  const addDecor = (deco: StudioPlacement['deco'], label: string) => {
    if (placements.length >= 12) return;
    const placement: StudioPlacement = {
      id: makeId('studio'),
      kind: 'decor',
      deco,
      label,
      x: 24 + ((placements.length * 17) % 52),
      y: 62 + ((placements.length * 5) % 18),
      scale: 1,
      rotation: 0,
    };
    setPlacements((current) => [...current, placement]);
    setSelected(placement.id);
    void audio.playSfx('drop');
  };

  const selectedPlacement = placements.find((placement) => placement.id === selected);

  const updateSelected = (patch: Partial<StudioPlacement>) => {
    if (!selected) return;
    setPlacements((current) => current.map((placement) => (placement.id === selected ? { ...placement, ...patch } : placement)));
  };

  const removeSelected = () => {
    if (!selected) return;
    setPlacements((current) => current.filter((placement) => placement.id !== selected));
    setSelected(null);
  };

  const savePhoto = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const dataUrl = renderPlatePng({
        background,
        placements: placements.map(({ label: _label, ...rest }) => rest),
        title: title || 'A little Nori Nook plate',
      });
      await saveGalleryEntry({
        title: title || 'A little Nori Nook plate',
        dataUrl,
        recipeIds: placements.filter((item) => item.kind === 'sushi' && item.recipeId).map((item) => item.recipeId!),
        background,
      });
      setSaved(dataUrl);
      void audio.playSfx('camera');
    } finally {
      setSaving(false);
    }
  };

  const download = () => {
    if (!saved) return;
    const anchor = document.createElement('a');
    anchor.href = saved;
    anchor.download = `nori-nook-${title.replace(/\s+/g, '-').toLowerCase()}.png`;
    anchor.click();
  };

  return (
    <div className="screen">
      <div className="page-head">
        <div className="page-head__copy">
          <span className="eyebrow">Compose, arrange, remember</span>
          <h1>Creative Studio</h1>
          <p>Build a plate, choose a mood and take a photo. It goes straight to your local gallery.</p>
        </div>
        <div className="page-head__action">
          <Button size="sm" variant="soft" icon="camera" onClick={() => navigate('/gallery')}>Gallery</Button>
        </div>
      </div>

      <div className="studio-layout">
        <Card className="studio-canvas-card">
          <div
            ref={canvasRef}
            className={`studio-canvas studio-canvas--${background}`}
            onPointerDown={(event) => {
              if (event.target === event.currentTarget) setSelected(null);
            }}
          >
            <div className="studio-plate">
              <span className="studio-plate__rim" />
              {placements.map((placement) => (
                <div
                  key={placement.id}
                  className={`studio-placement ${selected === placement.id ? 'is-selected' : ''}`.trim()}
                  style={{
                    left: `${placement.x}%`,
                    top: `${placement.y}%`,
                    transform: `translate(-50%, -50%) rotate(${placement.rotation}deg) scale(${placement.scale})`,
                    touchAction: 'none',
                  }}
                  onPointerDown={(event: ReactPointerEvent<HTMLDivElement>) => {
                    event.stopPropagation();
                    setSelected(placement.id);
                    setDrag(placement.id);
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                >
                  {placement.kind === 'sushi' ? (
                    <SushiArt
                      recipeId={placement.recipeId}
                      ingredients={recipeById(placement.recipeId ?? '')?.ingredients}
                      size={120}
                    />
                  ) : (
                    <IngredientArt
                      id={
                        placement.deco === 'flower'
                          ? 'seasonal_leaf'
                          : placement.deco === 'leaf'
                            ? 'asparagus'
                            : placement.deco === 'sesame'
                              ? 'sesame'
                              : 'ginger'
                      }
                      size={42}
                      animate={false}
                    />
                  )}
                </div>
              ))}
              <span className="studio-chopsticks" aria-hidden="true" />
              <span className="studio-signature">NORI NOOK</span>
            </div>
            <div className="studio-caption">{title || 'A little Nori Nook plate'}</div>
          </div>
          {selectedPlacement ? (
            <div className="studio-controls">
              <Pill tone="matcha" icon="edit">{selectedPlacement.label}</Pill>
              <Button size="sm" variant="ghost" icon="refresh" onClick={() => updateSelected({ rotation: (selectedPlacement.rotation + 15) % 360 })}>
                Rotate
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => updateSelected({ scale: clamp(selectedPlacement.scale - 0.15, 0.6, 1.6) })}
              >
                <Icon name="minus" size={13} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => updateSelected({ scale: clamp(selectedPlacement.scale + 0.15, 0.6, 1.6) })}
              >
                <Icon name="plus" size={13} />
              </Button>
              <Button size="sm" variant="ghost" icon="trash" onClick={removeSelected}>Remove</Button>
            </div>
          ) : (
            <p className="studio-hint"><Icon name="drag" size={14} /> Drag anything on the plate. Tap a piece to select it.</p>
          )}
        </Card>

        <div className="studio-side">
          <Card>
            <SectionHead title="Mood" subtitle="The background sets the whole little scene" icon="camera" />
            <div className="background-grid">
              {backgrounds.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`background-chip ${background === option.id ? 'is-active' : ''}`.trim()}
                  onClick={() => setBackground(option.id)}
                >
                  <span style={{ background: option.color }} />
                  {option.name}
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <SectionHead title="Add to the plate" subtitle={`${placements.length} pieces on the plate`} icon="sushi" />
            <div className="studio-palette">
              {availableRecipes.map((recipe) => (
                <button key={recipe.id} type="button" className="studio-palette__item" onClick={() => addRecipe(recipe.id)}>
                  <SushiArt recipeId={recipe.id} size={72} />
                  <span>{recipe.name}</span>
                </button>
              ))}
            </div>
            <div className="tag-row" style={{ marginTop: 8 }}>
              {decoPalette.map((deco) => (
                <button
                  key={deco.id}
                  type="button"
                  className="pill pill--sakura"
                  onClick={() => addDecor(deco.id, deco.name)}
                >
                  <IngredientArt id={deco.ingredientId} size={16} animate={false} />
                  {deco.name}
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <SectionHead title="Save this little moment" subtitle="A PNG is saved in your local gallery" icon="save" />
            <label className="studio-title-field">
              <span>Plate title</span>
              <input
                value={title}
                maxLength={42}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="A quiet little plate"
              />
            </label>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <Button variant="primary" icon="camera" onClick={() => void savePhoto()} disabled={saving}>
                {saving ? 'Taking photo...' : 'Take photo'}
              </Button>
              <Button variant="ghost" icon="refresh" onClick={() => setPlacements([])}>Clear plate</Button>
            </div>
            <p className="muted tiny">
              Photos are stored in IndexedDB on this device. No upload, no account. Add pieces from your discovered
              recipes; if the book is empty, three classics are provided.
            </p>
          </Card>
        </div>
      </div>

      <Modal
        open={Boolean(saved)}
        onClose={() => setSaved(null)}
        title="A photo for the little wall"
        size="md"
        footer={
          <div className="modal__actions">
            <Button variant="ghost" onClick={() => setSaved(null)}>Keep editing</Button>
            <Button variant="soft" icon="camera" onClick={() => navigate('/gallery')}>Open gallery</Button>
            <Button variant="primary" icon="download" onClick={download}>Download PNG</Button>
          </div>
        }
      >
        {saved ? (
          <div className="gallery-view">
            <img src={saved} alt={title} />
            <p className="muted small">Saved to your local gallery. It will be here even offline.</p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};
