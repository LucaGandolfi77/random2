import { useGameStore } from '@/core/gameStore';
import { ModalShell } from './ModalShell';
import { SaveList } from '@/ui/SaveList';

interface SaveModalProps {
  mode: 'save' | 'load';
}

export function SaveModal({ mode }: SaveModalProps) {
  const closeModal = useGameStore((state) => state.closeModal);
  return (
    <ModalShell
      title={mode === 'save' ? 'Write the Chronicle' : 'Open a Chronicle'}
      kicker={mode === 'save' ? 'Three Pages of Your Own' : 'Return to an Earlier Page'}
      onClose={closeModal}
      size="lg"
    >
      <SaveList mode={mode} onDone={closeModal} />
    </ModalShell>
  );
}
