import { useGameStore } from '../store/gameStore';
import { Modal } from './Common';
import { Icon } from './Icons';
import { formatNumber } from '../game/format';

export function GameOver() {
  const game = useGameStore((state) => state.game);
  const resetGame = useGameStore((state) => state.resetGame);
  if (game.survivors.length > 0) return null;

  return (
    <Modal
      open
      title="The fire has gone out"
      subtitle="No one is left to keep the last ember alive."
      variant="full"
      dismissible={false}
      footer={
        <button type="button" className="primary-button w-full justify-center" onClick={resetGame}>
          Light a new fire <Icon name="flame" size={15} />
        </button>
      }
    >
      <div className="gameover-art">
        <span className="gameover-snow" />
        <Icon name="snow" size={50} />
        <div className="gameover-furnace">
          <Icon name="furnace" size={26} />
        </div>
      </div>
      <div className="gameover-copy">
        <p>
          The settlement lasted <b>{game.day} days</b>, weathered <b>{game.stats.blizzardsSurvived}</b>{' '}
          whiteouts and recovered <b>{formatNumber(game.stats.resourcesGained)}</b> supplies.
        </p>
        <p>
          Its story ends here. The next settlement will begin with the same furnace, the same cold and
          the chance to do better.
        </p>
      </div>
    </Modal>
  );
}
