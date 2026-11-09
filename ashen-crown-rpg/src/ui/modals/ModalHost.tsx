import { useGameStore } from '@/core/gameStore';
import { InventoryModal } from './InventoryModal';
import { JournalModal } from './JournalModal';
import { PartyModal } from './PartyModal';
import { CharacterModal } from './CharacterModal';
import { MapModal } from './MapModal';
import { SettingsModal } from './SettingsModal';
import { SaveModal } from './SaveModal';
import { HelpModal } from './HelpModal';
import { LevelUpModal } from './LevelUpModal';
import { ShopModal } from './ShopModal';
import { SubclassModal } from './SubclassModal';

export function ModalHost() {
  const modal = useGameStore((state) => state.modal);
  if (!modal) return null;
  switch (modal) {
    case 'inventory':
      return <InventoryModal />;
    case 'journal':
      return <JournalModal />;
    case 'party':
      return <PartyModal />;
    case 'character':
      return <CharacterModal />;
    case 'map':
      return <MapModal />;
    case 'settings':
      return <SettingsModal />;
    case 'save':
      return <SaveModal mode="save" />;
    case 'load':
      return <SaveModal mode="load" />;
    case 'help':
      return <HelpModal />;
    case 'levelup':
      return <LevelUpModal />;
    case 'shop':
      return <ShopModal />;
    case 'subclass':
      return <SubclassModal />;
    default:
      return null;
  }
}
