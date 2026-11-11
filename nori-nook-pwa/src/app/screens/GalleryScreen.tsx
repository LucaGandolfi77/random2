import { useEffect, useState } from 'react';
import { useGameStore } from '@/app/store';
import { navigate } from '@/app/router';
import { Button, Card, EmptyState, Modal } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { listGallery } from '@/storage/db';
import type { GalleryEntry } from '@/types/game';

export const GalleryScreen = () => {
  const deleteGalleryImage = useGameStore((state) => state.deleteGalleryImage);
  const [entries, setEntries] = useState<GalleryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<GalleryEntry | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      setEntries(await listGallery());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [deleteGalleryImage]);

  const handleDelete = async (id: string) => {
    await deleteGalleryImage(id);
    setViewing(null);
    await refresh();
  };

  const download = (entry: GalleryEntry) => {
    const anchor = document.createElement('a');
    anchor.href = entry.dataUrl;
    anchor.download = `nori-nook-${entry.title.replace(/\s+/g, '-').toLowerCase()}.png`;
    anchor.click();
  };

  return (
    <div className="screen">
      <div className="page-head">
        <div className="page-head__copy">
          <span className="eyebrow">Little memories</span>
          <h1>Photo Gallery</h1>
          <p>Plates you composed and photographed. Saved locally and available offline.</p>
        </div>
        <div className="page-head__action">
          <Button size="sm" variant="soft" icon="camera" onClick={() => navigate('/studio')}>
            Studio
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="screen--center" style={{ alignItems: 'center', padding: 30 }}>
          <Icon name="camera" size={28} />
          <p className="muted small">Waking up the little camera...</p>
        </Card>
      ) : entries.length === 0 ? (
        <EmptyState
          icon="camera"
          title="No photos yet"
          message="Make a plate in the Creative Studio or Zen Kitchen and save a photo. It will live here forever."
          action={
            <Button variant="secondary" icon="camera" onClick={() => navigate('/studio')}>
              Open Creative Studio
            </Button>
          }
        />
      ) : (
        <div className="gallery-grid">
          {entries.map((entry) => (
            <button key={entry.id} type="button" className="gallery-card" onClick={() => setViewing(entry)}>
              <img src={entry.dataUrl} alt={entry.title} />
              <span>{entry.title}</span>
              <small>{new Date(entry.createdAt).toLocaleDateString()}</small>
            </button>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title={viewing?.title}
        size="lg"
        footer={
          viewing ? (
            <div className="modal__actions">
              <Button variant="ghost" icon="trash" onClick={() => void handleDelete(viewing.id)}>
                Delete
              </Button>
              <Button variant="primary" icon="download" onClick={() => download(viewing)}>
                Download PNG
              </Button>
            </div>
          ) : null
        }
      >
        {viewing ? (
          <div className="gallery-view">
            <img src={viewing.dataUrl} alt={viewing.title} />
            <p className="muted small">
              {new Date(viewing.createdAt).toLocaleString()} · {viewing.recipeIds.length} treats · {viewing.background} background
            </p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};
