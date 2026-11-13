import type { Lang } from '../film/types';

export const STRINGS = {
  posterEyebrow: {
    en: 'A FILM DRAWN LIVE IN TYPESCRIPT',
    it: 'UN FILM DISEGNATO DAL VIVO IN TYPESCRIPT',
  },
  tagline: {
    en: 'The last immune cell of a dying body carries one final message through the ruins.',
    it: 'L’ultima cellula immunitaria di un corpo che muore porta un ultimo messaggio attraverso le rovine.',
  },
  meta: {
    en: '13 minutes · 10 chapters · headphones recommended',
    it: '13 minuti · 10 capitoli · cuffie consigliate',
  },
  begin: { en: 'Begin with sound', it: 'Inizia con l’audio' },
  beginSilent: { en: 'Watch in silence', it: 'Guarda in silenzio' },
  resume: { en: 'Resume', it: 'Riprendi' },
  resumeAt: { en: 'Resume from {time}', it: 'Riprendi da {time}' },
  contentNote: { en: 'Content note', it: 'Avviso sui contenuti' },
  contentBody: {
    en: 'The film depicts the death of a body, illness and grief. There is no graphic imagery and no rapid flashing. Captions are on by default.',
    it: 'Il film racconta la morte di un corpo, la malattia e il lutto. Non ci sono immagini cruente né lampi rapidi. I sottotitoli sono attivi per impostazione predefinita.',
  },
  about: { en: 'About', it: 'Il film' },
  aboutTitle: { en: 'About the film', it: 'Il film' },
  aboutP1: {
    en: 'An original 13-minute animated film drawn live in TypeScript. No video files, no images, no recorded sound: every frame is Canvas 2D, every note is Web Audio.',
    it: 'Un film d’animazione originale di 13 minuti disegnato dal vivo in TypeScript. Nessun video, nessuna immagine, nessun suono registrato: ogni fotogramma è Canvas 2D, ogni nota è Web Audio.',
  },
  aboutP2: {
    en: 'Inside a dying body, the last dendritic cell — the immune system’s messenger — carries the memory of everything the body has survived. When the barrier fails, the body’s oldest residents cross it. This is a requiem, not a rescue: it is about the border between self and other, and what remains when the energy to draw that border runs out.',
    it: 'Dentro un corpo che muore, l’ultima cellula dendritica — il messaggero del sistema immunitario — porta la memoria di tutto ciò che il corpo ha superato. Quando la barriera cede, i residenti più antichi del corpo la attraversano. È un requiem, non un salvataggio: parla del confine tra sé e altro, e di ciò che resta quando l’energia per tracciarlo finisce.',
  },
  science: { en: 'The science', it: 'La scienza' },
  scienceP1: {
    en: 'The immune system does not only fight. It learns tolerance: the daily, metabolic act of deciding what belongs. Dendritic cells sample tissue, carry antigens to lymph nodes, and teach T cells what is self and what is not.',
    it: 'Il sistema immunitario non solo combatte. Impara la tolleranza: l’atto quotidiano e metabolico di decidere ciò che appartiene. Le cellule dendritiche campionano i tessuti, portano gli antigeni ai linfonodi e insegnano ai linfociti T che cosa è sé e che cosa non lo è.',
  },
  scienceP2: {
    en: 'In a dying body, barrier failure can let gut bacteria translocate into the blood. The residents in this film are not villains; they are survivors. The film is poetic biology, not medical advice.',
    it: 'In un corpo che muore, il cedimento delle barriere può lasciare che i batteri intestinali traslochino nel sangue. I residenti di questo film non sono cattivi: sono sopravvissuti. Il film è biologia poetica, non consiglio medico.',
  },
  credits: { en: 'Credits', it: 'Crediti' },
  creditsLine: {
    en: 'Written, drawn and scored in TypeScript. Fonts: Cormorant Garamond and Inter (SIL OFL). Original film CC BY-NC-SA 4.0. Code MIT.',
    it: 'Scritto, disegnato e musicato in TypeScript. Font: Cormorant Garamond e Inter (SIL OFL). Film originale CC BY-NC-SA 4.0. Codice MIT.',
  },
  chapters: { en: 'Chapters', it: 'Capitoli' },
  chaptersTitle: { en: 'The film, chapter by chapter', it: 'Il film, capitolo per capitolo' },
  chaptersFoot: {
    en: 'The film is linear. You can move anywhere; the ending does not change.',
    it: 'Il film è lineare. Puoi muoverti ovunque; il finale non cambia.',
  },
  endLine: {
    en: 'The body is not a fortress. It is a garden that learned, for a little while, to say I.',
    it: 'Il corpo non è una fortezza. È un giardino che ha imparato, per un po’, a dire io.',
  },
  watchAgain: { en: 'Watch again', it: 'Guarda di nuovo' },
  backToPoster: { en: 'Back to the poster', it: 'Torna alla locandina' },
  share: { en: 'Share this moment', it: 'Condividi questo momento' },
  shareText: {
    en: 'SELF / NON-SELF — a requiem for the body’s last witness.',
    it: 'SELF / NON-SELF — un requiem per l’ultimo testimone del corpo.',
  },
  copied: { en: 'Link copied', it: 'Link copiato' },
  close: { en: 'Close', it: 'Chiudi' },
  play: { en: 'Play', it: 'Riproduci' },
  pause: { en: 'Pause', it: 'Pausa' },
  back: { en: 'Back 10 seconds', it: 'Indietro di 10 secondi' },
  forward: { en: 'Forward 10 seconds', it: 'Avanti di 10 secondi' },
  captions: { en: 'Toggle captions', it: 'Attiva o disattiva i sottotitoli' },
  mute: { en: 'Mute', it: 'Disattiva audio' },
  unmute: { en: 'Turn sound on', it: 'Attiva audio' },
  fullscreen: { en: 'Fullscreen', it: 'Schermo intero' },
  language: { en: 'Change language', it: 'Cambia lingua' },
  position: { en: 'Film position', it: 'Posizione nel film' },
  rotate: { en: 'Turn your phone upright to watch the film.', it: 'Metti il telefono in verticale per guardare il film.' },
  watchAnyway: { en: 'Watch anyway', it: 'Guarda comunque' },
  loading: { en: 'Preparing the body', it: 'Preparazione del corpo' },
  speakerMessenger: { en: 'THE MESSENGER', it: 'IL MESSAGGERO' },
  speakerResident: { en: 'THE RESIDENT', it: 'IL RESIDENTE' },
  nowPlaying: { en: 'Now', it: 'Ora' },
  replayFromChapter: { en: 'Play from here', it: 'Riproduci da qui' },
} as const;

export type StringKey = keyof typeof STRINGS;

export function t(key: StringKey, lang: Lang): string {
  return STRINGS[key][lang];
}
