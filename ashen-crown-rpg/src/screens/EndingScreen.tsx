import type { CSSProperties } from 'react';
import { useGameStore } from '@/core/gameStore';
import { endings, endingById } from '@/data/campaign';
import { questById } from '@/data/quests';
import { companionById } from '@/data/companions';
import { Portrait } from '@/ui/Portrait';
import { CrownSigil, Eightsigil } from '@/ui/CrownSigil';
import { cx, formatPlayTime } from '@/utils';

const MEMORIES: { flag: string; text: string }[] = [
  { flag: 'hollow_merchant_spared', text: 'The Hollow Merchant closed the shop and kept one summer for themselves.' },
  { flag: 'hollow_merchant_exposed', text: 'The wares of the Hollow Merchant were carried back to Greymoor, and the village remembered what it had lost.' },
  { flag: 'choir_ally', text: 'The Ashen Choir left Greymoor standing — changed, armed, and owing you a debt.' },
  { flag: 'choir_dealt', text: 'The Choir’s cell beneath Greymoor went silent before dawn.' },
  { flag: 'greymoor_free_rules', text: 'Greymoor chose to govern itself, without a Reeve or an Inquisitor.' },
  { flag: 'greymoor_marla_rules', text: 'Marla Grey kept her seat, and the village kept its careful lies.' },
  { flag: 'greymoor_halvard_rules', text: 'Inquisitor Halvard brought the Covenant’s order back to Greymoor.' },
  { flag: 'kaelen_forgiven', text: 'Kaelen Voss was forgiven for a crime the war had written on him.' },
  { flag: 'kaelen_accused', text: 'Kaelen Voss was made to answer for the old purge, and did not look away.' },
  { flag: 'sable_kept_shadow', text: 'Sable kept her reclaimed shadow as a second soul.' },
  { flag: 'ilyra_letgo', text: 'Ilyra Morn let her sister go into the archive of the unwritten.' },
  { flag: 'oren_faith_rebuilt', text: 'Oren Hale rebuilt his faith on smaller, steadier things.' },
  { flag: 'oren_faith_renounced', text: 'Oren Hale set the Covenant down and walked away lighter.' },
  { flag: 'nyx_loyal', text: 'Nyx Ardent chose loyalty over the knife the Choir had made of her.' }
];

export function EndingScreen() {
  const game = useGameStore((state) => state.game);
  const goToMenu = useGameStore((state) => state.goToMenu);
  const setScreen = useGameStore((state) => state.setScreen);

  if (!game) {
    return (
      <main className="ending-screen">
        <button className="btn btn-primary" onClick={goToMenu}>Return to the main menu</button>
      </main>
    );
  }

  const ending = endingById[game.ending ?? 'reforge'] ?? endings[0];
  const player = game.characters[game.playerId];
  const companions = Object.values(game.characters).filter((character) => character.recruited && !character.isPlayer);
  const completed = Object.entries(game.quests).filter(([, quest]) => quest.status === 'completed');
  const memories = MEMORIES.filter((entry) => Boolean(game.world.flags[entry.flag]));
  const endingIndex = endings.findIndex((entry) => entry.id === ending.id);

  return (
    <main
      className={cx('ending-screen', `ending-${ending.id}`)}
      style={{ '--ending-color': ending.color, '--ending-index': endingIndex } as CSSProperties}
    >
      <div className="ending-backdrop" aria-hidden="true">
        <div className="ending-glow" />
        <CrownSigil className="ending-crown" glow />
        <div className="ending-ash" />
      </div>

      <header className="ending-header">
        <div className="ending-brand">
          <Eightsigil />
          <span>Ashen Crown</span>
        </div>
        <span className="ending-label">Epilogue · {game.difficulty}</span>
      </header>

      <article className="ending-content">
        <p className="section-kicker">The Chronicle Closes</p>
        <h1 className="ending-title">{ending.title}</h1>
        <p className="ending-subtitle">{ending.subtitle}</p>
        <div className="ending-rule"><span /><Eightsigil /><span /></div>
        <p className="ending-text">{ending.text}</p>
        <p className="ending-epilogue">{ending.epilogue}</p>

        <section className="ending-chronicle">
          <h2>What the world remembers</h2>
          {memories.length ? (
            <ul>
              {memories.slice(0, 8).map((memory) => (
                <li key={memory.flag}>{memory.text}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">You walked through Elarion without leaving a mark — or so the Covenant would have it.</p>
          )}
        </section>

        <section className="ending-stats">
          <div>
            <span className="ending-stat-label">Name</span>
            <strong>{player?.name ?? 'The Unwritten'}</strong>
          </div>
          <div>
            <span className="ending-stat-label">Level</span>
            <strong>{player?.level ?? 1}</strong>
          </div>
          <div>
            <span className="ending-stat-label">Time</span>
            <strong>{formatPlayTime(game.playTime)}</strong>
          </div>
          <div>
            <span className="ending-stat-label">Quests</span>
            <strong>{completed.length}</strong>
          </div>
          <div>
            <span className="ending-stat-label">Companions</span>
            <strong>{companions.length}</strong>
          </div>
        </section>

        {companions.length > 0 && (
          <section className="ending-party">
            <h2>Those who walked with you</h2>
            <div className="ending-party-row">
              {companions.map((companion) => {
                const def = companion.companionId ? companionById[companion.companionId] : null;
                const quest = def ? questById[def.questId] : null;
                const questState = def ? game.quests[def.questId] : null;
                return (
                  <div key={companion.id} className="ending-companion">
                    <Portrait appearance={companion.portrait} size="sm" />
                    <div>
                      <strong>{companion.name}</strong>
                      <span>{quest?.title ?? 'Their road continues.'}</span>
                      <small className="muted">
                        {questState?.status === 'completed' ? 'Their reckoning is finished.' : 'Their reckoning remains open.'}
                      </small>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <div className="ending-actions">
          <button className="btn btn-primary" onClick={goToMenu}>
            Return to the main menu
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              goToMenu();
              window.setTimeout(() => setScreen('creation'), 120);
            }}
          >
            Begin another chronicle
          </button>
        </div>

        <p className="ending-coda">
          Ending {endingIndex + 1} of {endings.length} · “The Crown remembers everything — even the things you would
          rather forget.”
        </p>
      </article>
    </main>
  );
}
