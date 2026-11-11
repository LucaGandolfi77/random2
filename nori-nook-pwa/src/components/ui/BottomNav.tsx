import { navigate, useRoute } from '@/app/router';
import { Icon, type IconName } from './Icon';
import { audio } from '@/audio/engine';

const items: Array<{ path: string; label: string; icon: IconName }> = [
  { path: '/', label: 'Home', icon: 'home' },
  { path: '/story', label: 'Story', icon: 'story' },
  { path: '/restaurant', label: 'Nook', icon: 'restaurant' },
  { path: '/recipes', label: 'Recipes', icon: 'recipe' },
  { path: '/more', label: 'More', icon: 'more' },
];

export const BottomNav = () => {
  const path = useRoute();
  const active =
    path === '/' || path === '/story' || path === '/restaurant' || path === '/recipes' || path === '/more'
      ? path
      : ['/collection', '/shop', '/events', '/gallery', '/settings', '/zen', '/puzzle', '/merge', '/chef', '/studio'].includes(path)
        ? '/more'
        : '';
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {items.map((item) => (
        <button
          key={item.path}
          type="button"
          className={`bottom-nav__item ${active === item.path ? 'is-active' : ''}`}
          onClick={() => {
            void audio.playSfx('step');
            navigate(item.path);
          }}
          aria-current={active === item.path ? 'page' : undefined}
        >
          <span className="bottom-nav__icon">
            <Icon name={item.icon} size={21} />
          </span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
};
