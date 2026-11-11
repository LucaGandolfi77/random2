import { useGameStore } from '@/app/store';
import { navigate } from '@/app/router';
import { Button, Card, Pill, SectionHead } from '@/components/ui/primitives';
import { Icon, type IconName } from '@/components/ui/Icon';
import { GAME_MODES } from '@/data/modes';
import { InstallButton, useOnline } from '@/pwa/PwaBanners';
import { formatNumber } from '@/utils/format';

const links: Array<{ label: string; description: string; icon: IconName; path: string; color: string; bg: string }> = [
  { label: 'Collection', description: 'Recipes, neighbors, decor and trophies', icon: 'collection', path: '/collection', color: '#7f5e61', bg: '#f8e8e9' },
  { label: 'Shop', description: 'Ingredients, upgrades, decorations, staff', icon: 'shop', path: '/shop', color: '#8a7157', bg: '#f5ecdf' },
  { label: 'Events', description: 'Seasonal festivals, weekly and daily missions', icon: 'calendar', path: '/events', color: '#997a6a', bg: '#f9ebe2' },
  { label: 'Photo Gallery', description: 'Plates you saved in the studio or Zen kitchen', icon: 'camera', path: '/gallery', color: '#8b6c80', bg: '#f7ebf1' },
  { label: 'Settings', description: 'Audio, accessibility, save backup and install', icon: 'settings', path: '/settings', color: '#5f756e', bg: '#e9f0ed' },
];

export const MoreScreen = () => {
  const save = useGameStore((state) => state.save);
  const online = useOnline();
  return (
    <div className="screen">
      <div className="page-head">
        <div className="page-head__copy">
          <span className="eyebrow">Everything else</span>
          <h1>The little drawer</h1>
          <p>Modes, collections, events and all the quiet corners of the nook.</p>
        </div>
        <div className="page-head__action">
          <Pill tone={online ? 'matcha' : 'danger'} icon={online ? 'wifi' : 'wifiOff'}>
            {online ? 'Online' : 'Offline'}
          </Pill>
        </div>
      </div>

      <Card variant="soft">
        <div className="row row--between">
          <div>
            <span className="eyebrow">Little Chef</span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20 }}>{save.player.name}</h2>
            <p className="muted small">
              Level {save.player.level} · {formatNumber(save.player.coins)} coins · {save.player.pearls} pearls ·{' '}
              {save.stats.customersServed} served
            </p>
          </div>
          <InstallButton compact />
        </div>
      </Card>

      <SectionHead title="All game modes" subtitle="Ten real little ways to play" icon="sparkles" />
      <div className="mode-grid">
        {GAME_MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className="mode-tile"
            style={{ '--tile-bg': mode.bg, '--tile-ink': mode.color } as React.CSSProperties}
            onClick={() => navigate(mode.path)}
          >
            <span className="mode-tile__icon">
              <Icon name={mode.icon} size={18} />
            </span>
            <span className="mode-tile__copy">
              <strong>{mode.short}</strong>
              <span>{mode.name}</span>
            </span>
          </button>
        ))}
      </div>

      <SectionHead title="Your nook" subtitle="Collections, supplies and memories" icon="restaurant" />
      <div className="shop-list">
        {links.map((link) => (
          <button
            key={link.path}
            type="button"
            className="item-row"
            style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}
            onClick={() => navigate(link.path)}
          >
            <span className="item-row__art" style={{ background: link.bg, color: link.color }}>
              <Icon name={link.icon} size={22} />
            </span>
            <span className="item-row__copy">
              <strong>{link.label}</strong>
              <span>{link.description}</span>
            </span>
            <Icon name="arrowRight" size={17} />
          </button>
        ))}
      </div>

      <Card className="screen--center" style={{ alignItems: 'center', textAlign: 'center' }}>
        <span className="hud__mark" style={{ width: 52, height: 52, fontSize: 26 }}>の</span>
        <h2 style={{ marginTop: 8, fontSize: 20 }}>Nori Nook</h2>
        <p className="muted small">Little Sushi, Big Dreams. Version 1.0.0 · offline-first · no accounts, no tracking.</p>
        <div className="row" style={{ justifyContent: 'center', marginTop: 10 }}>
          <Button variant="ghost" size="sm" icon="heart" onClick={() => navigate('/story')}>
            Back to the journey
          </Button>
        </div>
      </Card>
    </div>
  );
};
