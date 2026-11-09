import { useGameStore } from '@/core/gameStore';
import { ModalShell } from './ModalShell';
import { HelpContent } from '@/ui/HelpContent';

export function HelpModal() {
  const closeModal = useGameStore((state) => state.closeModal);
  return (
    <ModalShell title="How to Play" kicker="A Field Guide to Elarion" onClose={closeModal} size="lg">
      <HelpContent />
    </ModalShell>
  );
}
