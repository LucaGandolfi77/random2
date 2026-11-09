import { useEffect } from 'react';
import { useGameStore } from '@/core/gameStore';
import { introSlides } from '@/data/chapters';
import { Portrait } from '@/ui/Portrait';
import { emmaPortrait } from '@/data/contacts';
import { cx } from '@/utils';

function IntroRoom({ slide }: { slide: number }) {
  return (
    <div className={cx('intro-room', `slide-${slide}`)} aria-hidden="true">
      <div className="intro-wall" />
      <div className="intro-window">
        <div className="intro-window-sky" />
        <div className="intro-window-rain" />
        <div className="intro-window-shadow" />
        <div className="intro-window-cross horizontal" />
        <div className="intro-window-cross vertical" />
      </div>
      <div className="intro-curtain left" />
      <div className="intro-curtain right" />
      <div className="intro-lamp">
        <span />
      </div>
      <div className="intro-phone-glow" />
      <div className="intro-silhouette" />
    </div>
  );
}

export function IntroScreen() {
  const slide = useGameStore((state) => state.introSlide);
  const advance = useGameStore((state) => state.advanceIntro);
  const finish = useGameStore((state) => state.finishIntro);
  const origin = useGameStore((state) => state.game?.origin ?? 'work');
  const setOrigin = useGameStore((state) => state.setOrigin);
  const current = introSlides[slide] ?? introSlides[0];
  const last = slide >= introSlides.length - 1;
  const originBody =
    slide === 0 && origin === 'appointment'
      ? 'Daniel offered to walk you home. You said you wanted the air. The restaurant closed behind you at 9:58, and the first message arrived at 10:06. The street is longer than it was this morning. Home is thirty minutes away. It should be thirty minutes away.'
      : current.body;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        advance();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance]);

  return (
    <main className="intro-screen">
      <IntroRoom slide={slide} />
      <div className="intro-vignette" />
      <div className="intro-grain" />
      <header className="intro-header">
        <span className="intro-brand">PHONE OR DIE</span>
        <span className="intro-progress">
          {slide + 1} / {introSlides.length}
        </span>
        <button className="text-button" onClick={finish}>
          Skip intro
        </button>
      </header>

      <section className="intro-content" key={slide}>
        <p className="eyebrow">{current.kicker}</p>
        <h1>{current.title}</h1>
        <div className="intro-mini">
          <Portrait portrait={emmaPortrait} size="xs" />
          <span>Emma Mercer · 10:00 PM · walking home</span>
        </div>
        {slide === 0 && (
          <div className="intro-origin" role="group" aria-label="Why is Emma out tonight?">
            <button
              className={origin === 'work' ? 'is-selected' : undefined}
              onClick={() => setOrigin('work')}
            >
              <span>Late shift</span>
              <small>The copy shop closed at ten.</small>
            </button>
            <button
              className={origin === 'appointment' ? 'is-selected' : undefined}
              onClick={() => setOrigin('appointment')}
            >
              <span>Late dinner</span>
              <small>Daniel offered you a ride.</small>
            </button>
          </div>
        )}
        <p className="intro-body">{originBody}</p>
        <button className="intro-next" onClick={advance}>
          {last ? 'Stop reading. Answer the phone.' : 'Continue'}
          <span>→</span>
        </button>
        <span className="intro-hint">Press Enter</span>
      </section>

      <footer className="intro-footer">
        <div className="intro-dots">
          {introSlides.map((entry, index) => (
            <span key={entry.title} className={cx('intro-dot', index === slide && 'active', index < slide && 'past')} />
          ))}
        </div>
        <span className="intro-quote">“They only come when you’re alone.”</span>
      </footer>
    </main>
  );
}
