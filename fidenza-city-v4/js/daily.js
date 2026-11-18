import { addScore, getDaily, setDaily } from './save.js';

export const DAILY_CHALLENGES = [
  { id: 'stars', event: 'star', target: 3, reward: 150, title: 'Cacciatore di stelle', desc: 'Trova 3 stelle in città.' },
  { id: 'places', event: 'place', target: 2, reward: 180, title: 'Giro del centro', desc: 'Scopri 2 luoghi di Fidenza.' },
  { id: 'mission', event: 'mission', target: 1, reward: 250, title: 'Un lavoro ben fatto', desc: 'Completa una missione.' },
  { id: 'photos', event: 'photo', target: 2, reward: 200, title: 'Cartoline di oggi', desc: 'Scatta 2 foto con la modalità foto.' },
  { id: 'distance', event: 'distance', target: 2000, kind: 'add', reward: 200, title: 'Due passi in città', desc: 'Percorri 2 km tra strade e piazze.' },
  { id: 'speed', event: 'speed', target: 45, kind: 'max', reward: 180, title: 'Via Emilia veloce', desc: 'Raggiungi 45 km/h con un veicolo.' },
  { id: 'duomo', event: 'photo', target: 1, match: 'duomo', reward: 260, title: 'La facciata del Duomo', desc: 'Scatta una foto vicino al Duomo.' },
  { id: 'walk', event: 'walk', target: 1500, kind: 'add', reward: 180, title: 'A piedi per Fidenza', desc: 'Cammina per 1,5 km.' },
  { id: 'score', event: 'score', target: 300, kind: 'add', reward: 150, title: 'Punti in città', desc: 'Guadagna 300 punti oggi.' },
  { id: 'career', event: 'career', target: 1, reward: 240, title: 'Un giorno di lavoro', desc: 'Completa un lavoro della carriera.' },
  { id: 'city-event', event: 'event', target: 1, reward: 220, title: 'Vita di città', desc: 'Partecipa a un evento in città.' }
];

export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dailyIndex(date = new Date()) {
  const key = dateKey(date);
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % DAILY_CHALLENGES.length;
}

export function getDailyChallenge(date = new Date()) {
  return { ...DAILY_CHALLENGES[dailyIndex(date)], date: dateKey(date) };
}

export function getDailySnapshot(date = new Date()) {
  const challenge = getDailyChallenge(date);
  const stored = getDaily();
  if (stored.date !== challenge.date) {
    setDaily({ date: challenge.date, progress: 0, done: false, claimed: false });
  }
  const daily = getDaily();
  const progress = Math.min(challenge.target, Math.max(0, Number(daily.progress) || 0));
  return {
    challenge,
    progress,
    done: !!daily.done || progress >= challenge.target,
    claimed: !!daily.claimed,
    percent: challenge.target ? Math.min(100, progress / challenge.target * 100) : 0
  };
}

export function recordDaily(event, amount = 1, meta = {}) {
  const challenge = getDailyChallenge();
  if (challenge.event !== event) return { completedNow: false, snapshot: getDailySnapshot() };
  if (challenge.match && !String(meta.place || '').toLowerCase().includes(challenge.match)) {
    return { completedNow: false, snapshot: getDailySnapshot() };
  }
  const snapshot = getDailySnapshot();
  const previous = snapshot.progress;
  const next = challenge.kind === 'max'
    ? Math.max(previous, amount)
    : previous + amount;
  const capped = Math.min(challenge.target, next);
  const wasDone = snapshot.done;
  const done = wasDone || capped >= challenge.target;
  const claimed = snapshot.claimed || done;
  setDaily({ date: challenge.date, progress: capped, done, claimed });
  if (done && !wasDone) addScore(challenge.reward);
  return {
    completedNow: done && !wasDone,
    snapshot: { ...snapshot, progress: capped, done, claimed, percent: challenge.target ? capped / challenge.target * 100 : 0 }
  };
}
