import { useEffect } from 'react';
import { useGameStore } from '@/core/gameStore';
import { introSlides } from '@/data/campaign';
import { Eightsigil } from '@/ui/CrownSigil';
import { cx } from '@/utils';

function IntroArt({ index }: { index: number }) {
  return (
    <svg className="intro-art-svg" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id={`intro-sky-${index}`} cx="50%" cy="40%" r="75%">
          <stop offset="0%" stopColor={index === 3 ? '#3a3a2b' : index === 1 ? '#3a2920' : '#2a2328'} />
          <stop offset="55%" stopColor="#151114" />
          <stop offset="100%" stopColor="#08070a" />
        </radialGradient>
        <linearGradient id={`intro-fade-${index}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#08070a" stopOpacity="0" />
          <stop offset="100%" stopColor="#08070a" stopOpacity="0.95" />
        </linearGradient>
      </defs>
      <rect width="1200" height="800" fill={`url(#intro-sky-${index})`} />
      <circle cx={index === 2 ? 820 : 650} cy={index === 3 ? 250 : 280} r="180" fill={index === 3 ? '#c7b980' : '#cdb27e'} opacity="0.04" />

      {index === 0 && (
        <g>
          <path d="M0 620l180-40 120-150 80 30 60-190 80 40 80-120 90 160 110-50 120 240 160-30 120 130v220H0z" fill="#100d10" />
          <path d="M530 450l30-120 30 120 40-40 20 50v90h-120v-100z" fill="#1c171b" />
          <path d="M450 800V600h60V480h38V340l22-60 22 60v140h35v120h80V430h40v-80l22-50 22 50v80h50v190h70V520h45v280z" fill="#0b090b" />
          <g stroke="#b18b52" strokeWidth="2" opacity="0.3" fill="none">
            <path d="M540 388l24-58 24 58M688 360l18-48 18 48" />
          </g>
        </g>
      )}
      {index === 1 && (
        <g>
          <path d="M0 620c200-50 380-40 530-20 170 24 340-30 670-100v300H0z" fill="#100c0d" />
          <path d="M420 800c80-160 120-250 210-330 20-18 40 4 18 22-90 78-120 180-150 308z" fill="#211a18" />
          <path d="M560 520c80 12 160-10 250-50" stroke="#6b5237" strokeWidth="5" opacity="0.4" fill="none" />
          <g fill="#0b090b">
            <path d="M200 610l16-150 18 2 8 148z" />
            <path d="M860 540l12-120 15 2 6 118z" />
            <path d="M1040 600l20-210 16 2 4 208z" />
          </g>
          <g fill="#b18b52" opacity="0.4">
            <circle cx="610" cy="505" r="2" />
            <circle cx="700" cy="490" r="1.4" />
            <circle cx="760" cy="515" r="1.8" />
          </g>
        </g>
      )}
      {index === 2 && (
        <g>
          <circle cx="800" cy="300" r="210" fill="none" stroke="#8f7042" strokeWidth="1" opacity="0.18" />
          <circle cx="800" cy="300" r="150" fill="none" stroke="#8f7042" strokeWidth="1" opacity="0.12" />
          <path d="M760 300l40-70 40 70-40 70z" fill="#151114" stroke="#b18b52" strokeWidth="1.5" opacity="0.7" />
          <path d="M775 300l25-44 25 44-25 44z" fill="#caa967" opacity="0.14" />
          <path d="M800 330v120" stroke="#b18b52" strokeWidth="0.8" opacity="0.3" />
          <g stroke="#b18b52" opacity="0.16" fill="none">
            <path d="M800 300L300 800M800 300L1000 800M800 300L100 600M800 300L1100 560" />
          </g>
          <path d="M0 700c180-40 350-20 520 0 130 14 230-10 340-40 120-32 230-18 340 10v130H0z" fill="#0b090b" />
        </g>
      )}
      {index === 3 && (
        <g>
          <path d="M0 700c180-80 380-70 520-30 140 40 260 20 370-30 110-50 210-40 310-10v170H0z" fill="#0d0f0c" />
          <g fill="#151713">
            <path d="M200 620V420l60-50 60 50v200z" />
            <path d="M790 590V390l55-45 55 45v200z" />
            <path d="M520 560V320l45-40 45 40v240z" />
          </g>
          <g fill="#c8a96d" opacity="0.35">
            <rect x="242" y="500" width="12" height="18" />
            <rect x="286" y="470" width="12" height="18" />
            <rect x="832" y="460" width="10" height="16" />
            <rect x="550" y="420" width="10" height="15" />
          </g>
          <path d="M100 800c60-120 120-190 220-250 30-18 50 10 20 30-100 70-130 140-170 250z" fill="#1b1c17" />
          <g stroke="#9b8e65" strokeWidth="1" opacity="0.2">
            <path d="M0 640h1200M0 700h1200" />
          </g>
        </g>
      )}
      {index === 4 && (
        <g>
          <path d="M0 680c220-50 420 10 600 0 210-12 360-68 600-20v140H0z" fill="#100c0f" />
          <path d="M470 700V560h60V430h40V300l25-70 25 70v130h38v130h80V410h42v-90h24v90h42v210h82V480h50v220z" fill="#1b151a" />
          <path d="M600 380l20-50 20 50-20 20z" fill="#d3b26f" opacity="0.5" />
          <g fill="#d3b26f" opacity="0.55">
            <circle cx="300" cy="360" r="1.5" />
            <circle cx="940" cy="300" r="1.2" />
            <circle cx="760" cy="460" r="1.4" />
            <circle cx="410" cy="500" r="1" />
          </g>
        </g>
      )}

      <rect width="1200" height="800" fill={`url(#intro-fade-${index})`} />
    </svg>
  );
}

export function IntroScreen() {
  const slide = useGameStore((state) => state.introSlide);
  const advanceIntro = useGameStore((state) => state.advanceIntro);
  const skipIntro = useGameStore((state) => state.skipIntro);
  const current = introSlides[slide] ?? introSlides[0];
  const isLast = slide >= introSlides.length - 1;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        advanceIntro();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advanceIntro]);

  return (
    <main className="intro-screen">
      <div className="intro-art" key={slide}>
        <IntroArt index={slide} />
      </div>
      <div className="intro-vignette" />
      <div className="intro-grain" />

      <header className="intro-header">
        <div className="intro-brand">
          <Eightsigil className="intro-brand-sigil" />
          <span>Ashen Crown</span>
        </div>
        <div className="intro-progress-label">
          Prologue <span className="dot-sep">·</span> {slide + 1} / {introSlides.length}
        </div>
        <button className="text-btn intro-skip" onClick={skipIntro}>
          Skip prologue
        </button>
      </header>

      <section className="intro-content" key={`content-${slide}`}>
        <p className="intro-kicker">{current.kicker}</p>
        <h1 className="intro-title">{current.title}</h1>
        <div className="intro-rule">
          <span />
          <Eightsigil />
          <span />
        </div>
        <p className="intro-text">{current.text}</p>
        <button className="btn btn-primary intro-next" onClick={advanceIntro}>
          {isLast ? 'Enter the Fallen Bastion ✦' : 'Continue'}
        </button>
        <span className="intro-hint">Press Enter</span>
      </section>

      <footer className="intro-footer">
        <div className="intro-dots">
          {introSlides.map((entry, index) => (
            <span key={entry.title} className={cx('intro-dot', index === slide && 'is-active', index < slide && 'is-past')} />
          ))}
        </div>
        <p className="intro-footer-quote">“You are not in the book.”</p>
        <div className="intro-chapter">Chapter One · The Crown of Cinders</div>
      </footer>
    </main>
  );
}
