import { useEffect, useRef } from 'react';
import { useGameStore, isChoiceAvailable } from '@/core/gameStore';
import { dialogueById } from '@/data/dialogues';
import { getPortrait } from '@/data/portraits';
import { Portrait } from '@/ui/Portrait';
import { Eightsigil } from '@/ui/CrownSigil';
import { cx } from '@/utils';

export function DialoguePanel() {
  const dialogue = useGameStore((state) => state.dialogue);
  const game = useGameStore((state) => state.game);
  const choose = useGameStore((state) => state.chooseDialogueChoice);
  const advance = useGameStore((state) => state.advanceDialogue);
  const close = useGameStore((state) => state.closeDialogue);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (dialogue) bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [dialogue?.id, dialogue?.nodeId]);

  if (!dialogue || !game) return null;

  const def = dialogueById[dialogue.id];
  const node = def?.nodes[dialogue.nodeId];
  if (!def || !node) return null;

  const player = game.characters[game.playerId];
  const appearance = getPortrait(node.portrait, player?.portrait);
  const isNarrator = node.portrait === 'narrator';
  const choices = node.choices ?? [];
  const hasChoices = choices.length > 0;

  return (
    <div className="dialogue-layer">
      <div className="dialogue-panel">
        <div className="dialogue-ornament-top">
          <span />
          <Eightsigil />
          <span />
        </div>
        <button className="dialogue-close" onClick={close} aria-label="Leave conversation">
          ×
        </button>

        <div ref={bodyRef} className={cx('dialogue-body', isNarrator && 'is-narrator')}>
          <div className="dialogue-portrait-wrap">
            {isNarrator ? (
              <div className="dialogue-book">
                <span className="dialogue-book-mark">❧</span>
                <span className="dialogue-book-title">{def.title}</span>
              </div>
            ) : (
              <>
                <Portrait appearance={appearance} size="lg" />
                <span className="dialogue-portrait-rule" />
              </>
            )}
          </div>

          <div className="dialogue-content">
            <div className="dialogue-speaker-row">
              <div>
                <h2 className="dialogue-speaker">{node.speaker}</h2>
                <p className="dialogue-title">{def.title}</p>
              </div>
              {node.tag && <span className="tag tag-gold">{node.tag}</span>}
            </div>

            <p className="dialogue-text" key={dialogue.nodeId}>
              {node.text}
            </p>

            {hasChoices ? (
              <div className="dialogue-choices">
                {choices.map((choice, index) => {
                  const available = isChoiceAvailable(game, choice);
                  if (!available && choice.hiddenIfUnavailable) return null;
                  const checkLabel = choice.check
                    ? `${choice.check.label ?? choice.check.proficiency ?? choice.check.stat.toUpperCase()} · DC ${choice.check.dc}`
                    : null;
                  return (
                    <button
                      key={choice.id}
                      className={cx(
                        'dialogue-choice',
                        choice.tone && `tone-${choice.tone}`,
                        !available && 'is-locked'
                      )}
                      disabled={!available}
                      onClick={() => choose(choice.id)}
                    >
                      <span className="choice-index">{String(index + 1).padStart(2, '0')}</span>
                      <span className="choice-text">{choice.text}</span>
                      <span className="choice-tags">
                        {checkLabel && <span className="choice-check">{checkLabel}</span>}
                        {choice.tag && <span className="choice-tag">{choice.tag}</span>}
                        {!choice.tag && choice.requiresClass && <span className="choice-tag">{choice.requiresClass}</span>}
                        {!choice.tag && choice.requiresAncestry && <span className="choice-tag">{choice.requiresAncestry}</span>}
                        {!available && <span className="choice-lock">Locked</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <button className="dialogue-continue" onClick={node.next ? advance : close}>
                {node.next ? 'Continue' : 'Leave'}
                <span>→</span>
              </button>
            )}
          </div>
        </div>

        <div className="dialogue-footer">
          <span>{node.speaker}</span>
          <span className="muted">A conversation is a kind of door.</span>
        </div>
      </div>
    </div>
  );
}
