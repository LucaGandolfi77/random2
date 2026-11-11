import { useGameStore } from '@/app/store';
import { navigate, useRoute } from '@/app/router';
import { levelProgress } from '@/game/progression/levels';
import { useOnline } from '@/pwa/PwaBanners';
import { Icon } from './Icon';
import { IconButton } from './primitives';
import { formatNumber } from '@/utils/format';

export const Hud = () => {
  const save = useGameStore((state) => state.save);
  const path = useRoute();
  const online = useOnline();
  const progress = levelProgress(save.player.xp);
  return (
    <header className="hud">
      <button type="button" className="hud__brand" onClick={() => navigate('/')} aria-label="Nori Nook home">
        <span className="hud__mark">の</span>
        <span className="hud__name">
          Nori Nook
          <small>little sushi, big dreams</small>
        </span>
      </button>
      <div className="hud__stats">
        <span className="hud-pill hud-pill--level" title={`Level ${progress.level}`}>
          <span className="hud-pill__dot" />
          <strong>Lv {progress.level}</strong>
        </span>
        <span className="hud-pill" title="Coins">
          <Icon name="coin" size={17} />
          <strong>{formatNumber(save.player.coins)}</strong>
        </span>
        <span className="hud-pill hud-pill--pearl" title="Pearls">
          <Icon name="pearl" size={17} />
          <strong>{formatNumber(save.player.pearls)}</strong>
        </span>
        {!online ? (
          <span className="hud-offline" title="Offline mode - everything still works">
            <Icon name="wifiOff" size={16} />
          </span>
        ) : null}
        <IconButton
          icon="settings"
          label="Settings"
          size={18}
          onClick={() => navigate('/settings')}
          className="hud__settings"
        />
      </div>
      <div className="hud__xp" aria-hidden="true">
        <span style={{ width: `${Math.round(progress.ratio * 100)}%` }} />
      </div>
      {path === '/kitchen' ? <div className="hud__kitchen-glow" /> : null}
    </header>
  );
};
