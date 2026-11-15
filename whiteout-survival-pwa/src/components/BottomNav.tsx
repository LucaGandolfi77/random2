import type { TabId } from '../game/types';
import { useGameStore } from '../store/gameStore';
import { Icon, type IconName } from './Icons';

const TABS: Array<{ id: TabId; label: string; icon: IconName }> = [
  { id: 'city', label: 'City', icon: 'city' },
  { id: 'survivors', label: 'Survivors', icon: 'survivors' },
  { id: 'heroes', label: 'Heroes', icon: 'heroes' },
  { id: 'tech', label: 'Tech', icon: 'tech' },
];

export function BottomNav() {
  const tab = useGameStore((state) => state.tab);
  const setTab = useGameStore((state) => state.setTab);

  return (
    <nav className="bottom-nav" aria-label="Game sections">
      {TABS.map((entry) => (
        <button
          key={entry.id}
          type="button"
          className={`nav-tab ${tab === entry.id ? 'is-active' : ''}`}
          onClick={() => setTab(entry.id)}
          aria-current={tab === entry.id ? 'page' : undefined}
        >
          <span className="nav-icon">
            <Icon name={entry.icon} size={20} />
          </span>
          <span>{entry.label}</span>
        </button>
      ))}
    </nav>
  );
}
