import { getAchievements, getSave, getStats, unlockAchievement } from './save.js';
import { careerLevel } from './career.js';

const missionCount = save => Object.keys(save.missions || {}).length;

export const ACHIEVEMENTS = [
  {
    id: 'first-star', icon: '★', title: 'Prima stella', desc: 'Trova la prima stella di Fidenza.',
    target: () => 1, value: save => save.stars.length
  },
  {
    id: 'star-collector', icon: '✦', title: 'Collezionista', desc: 'Trova 10 stelle.',
    target: () => 10, value: save => save.stars.length
  },
  {
    id: 'all-stars', icon: '✧', title: 'Cielo di Fidenza', desc: 'Trova tutte le stelle della città.',
    target: ctx => ctx.totalStars, value: save => save.stars.length
  },
  {
    id: 'first-place', icon: '◆', title: 'Primo passo', desc: 'Scopri il primo luogo.',
    target: () => 1, value: save => save.places.length
  },
  {
    id: 'all-places', icon: '❖', title: 'Fidenza conosciuta', desc: 'Scopri tutti i luoghi principali.',
    target: ctx => ctx.totalPlaces, value: save => save.places.length
  },
  {
    id: 'npc-first', icon: '💬', title: 'Buongiorno, Fidenza', desc: 'Parla con un abitante.',
    target: () => 1, value: () => (getStats().npcsMet || []).length
  },
  {
    id: 'npc-10', icon: '☺', title: 'Volti di Fidenza', desc: 'Parla con 10 abitanti.',
    target: () => 10, value: () => (getStats().npcsMet || []).length
  },
  {
    id: 'districts-all', icon: '⌘', title: 'Sette quartieri', desc: 'Visita tutti i quartieri di Fidenza, da Coduro al Centro.',
    target: () => 7, value: () => (getStats().districtsSeen || []).length
  },
  {
    id: 'first-mission', icon: '✓', title: 'Primo incarico', desc: 'Completa la prima missione.',
    target: () => 1, value: save => missionCount(save)
  },
  {
    id: 'all-missions', icon: '☑', title: 'Cittadino modello', desc: 'Completa tutte le missioni.',
    target: ctx => ctx.totalMissions, value: save => missionCount(save)
  },
  {
    id: 'driver-10', icon: '▰', title: 'Autista di Fidenza', desc: 'Percorri 10 km in auto o in Vespa.',
    target: () => 10, value: () => (getStats().driveMeters || 0) / 1000
  },
  {
    id: 'walker-5', icon: '➜', title: 'Passo sicuro', desc: 'Percorri 5 km a piedi.',
    target: () => 5, value: () => (getStats().walkMeters || 0) / 1000
  },
  {
    id: 'speed-50', icon: '⏱', title: 'Via Emilia', desc: 'Raggiungi 50 km/h.',
    target: () => 50, value: () => getStats().maxSpeed || 0
  },
  {
    id: 'photo-first', icon: '▣', title: 'Fotografo', desc: 'Scatta la prima cartolina.',
    target: () => 1, value: () => getStats().photos || 0
  },
  {
    id: 'photo-five', icon: '▦', title: 'Album di Fidenza', desc: 'Scatta 5 foto.',
    target: () => 5, value: () => getStats().photos || 0
  },
  {
    id: 'photo-duomo', icon: '◈', title: 'La facciata', desc: 'Scatta una foto al Duomo di San Donnino.',
    target: () => 1, value: () => getStats().photoDuomo ? 1 : 0
  },
  {
    id: 'seasons', icon: '❋', title: 'Quattro stagioni', desc: 'Gioca in primavera, estate, autunno e inverno.',
    target: () => 4, value: () => (getStats().seasons || []).length
  },
  {
    id: 'pilgrim', icon: '✦', title: 'Buon cammino', desc: 'Accompagna il pellegrino della Via Francigena.',
    target: () => 1, value: save => save.missions?.pilgrim ? 1 : 0
  },
  {
    id: 'delivery', icon: '▤', title: 'Consegna urgente', desc: 'Completa la consegna in ospedale.',
    target: () => 1, value: save => save.missions?.delivery ? 1 : 0
  },
  {
    id: 'tour', icon: '◈', title: 'Tassista per un giorno', desc: 'Completa il giro turistico.',
    target: () => 1, value: save => save.missions?.tour ? 1 : 0
  },
  {
    id: 'score-5000', icon: '✹', title: 'Cinquemila', desc: 'Raggiungi 5.000 punti.',
    target: () => 5000, value: save => save.score || 0
  },
  {
    id: 'first-job', icon: '▤', title: 'Primo lavoro', desc: 'Completa il primo lavoro della carriera.',
    target: () => 1, value: save => save.career?.jobsDone || 0
  },
  {
    id: 'jobs-10', icon: '▦', title: 'Professionista', desc: 'Completa 10 lavori.',
    target: () => 10, value: save => save.career?.jobsDone || 0
  },
  {
    id: 'taxi-10', icon: '◈', title: 'Taxi di Fidenza', desc: 'Completa 10 corse come tassista.',
    target: () => 10, value: save => save.career?.jobs?.taxi || 0
  },
  {
    id: 'courier-10', icon: '▰', title: 'Corriere veloce', desc: 'Completa 10 consegne.',
    target: () => 10, value: save => save.career?.jobs?.courier || 0
  },
  {
    id: 'photo-10', icon: '▣', title: 'Occhio fotografico', desc: 'Completa 10 servizi fotografici.',
    target: () => 10, value: save => save.career?.jobs?.photo || 0
  },
  {
    id: 'level-5', icon: '✹', title: 'Carriera avviata', desc: 'Raggiungi il livello 5 nella carriera.',
    target: () => 5, value: save => careerLevel(save.career?.xp || 0).level
  },
  {
    id: 'money-5000', icon: '€', title: 'Conto pieno', desc: 'Guadagna 5.000 € in carriera.',
    target: () => 5000, value: save => getStats().moneyEarned || 0
  },
  {
    id: 'event-first', icon: '⚑', title: 'Vita di città', desc: 'Partecipa al primo evento.',
    target: () => 1, value: () => (getStats().eventsSeen || []).length
  },
  {
    id: 'event-three', icon: '✹', title: 'Agenda piena', desc: 'Partecipa a 3 eventi diversi.',
    target: () => 3, value: () => (getStats().eventsSeen || []).length
  },
  {
    id: 'event-jobs-5', icon: '▤', title: 'Dietro le quinte', desc: 'Completa 5 lavori legati agli eventi.',
    target: () => 5, value: () => getStats().eventJobs || 0
  },
  {
    id: 'market-visit', icon: '▦', title: 'Al mercato', desc: 'Visita il mercato di Piazza Duomo.',
    target: () => 1, value: () => (getStats().eventsSeen || []).includes('market') ? 1 : 0
  },
  {
    id: 'christmas-visit', icon: '✦', title: 'Natale in piazza', desc: 'Visita il mercatino di Natale.',
    target: () => 1, value: () => (getStats().eventsSeen || []).includes('christmas-market') ? 1 : 0
  },
  {
    id: 'theatre-visit', icon: '◈', title: 'Prima al Magnani', desc: 'Vivi una serata al Teatro Magnani.',
    target: () => 1, value: () => (getStats().eventsSeen || []).includes('theatre-night') ? 1 : 0
  },
  {
    id: 'festival-visit', icon: '✹', title: 'Festa patronale', desc: 'Partecipa alla festa di San Donnino.',
    target: () => 1, value: () => (getStats().eventsSeen || []).includes('san-donnino') ? 1 : 0
  },
  {
    id: 'rush-visit', icon: '⇄', title: 'Ora di punta', desc: 'Vivi l’ora di punta in stazione.',
    target: () => 1, value: () => (getStats().eventsSeen || []).includes('station-rush') ? 1 : 0
  },
  {
    id: 'san-donnino-procession', icon: '✹', title: 'La processione', desc: 'Completa la processione di San Donnino.',
    target: () => 1, value: save => save.missions?.['san-donnino-procession'] ? 1 : 0
  },
  {
    id: 'san-donnino-torta', icon: '▤', title: 'Torta fritta', desc: 'Porta la torta fritta alle bancarelle.',
    target: () => 1, value: save => save.missions?.['san-donnino-torta-fritta'] ? 1 : 0
  },
  {
    id: 'san-donnino-photo', icon: '▣', title: 'La foto della festa', desc: 'Completa il servizio fotografico di San Donnino.',
    target: () => 1, value: save => save.missions?.['san-donnino-photo'] ? 1 : 0
  },
  {
    id: 'san-donnino-badge', icon: '⚑', title: 'Badge San Donnino', desc: 'Completa tutte e tre le missioni della festa.',
    target: () => 1, value: () => (getStats().badges || []).includes('san-donnino') ? 1 : 0
  }
];

function safeTarget(def, ctx) {
  const value = Number(def.target(ctx));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function achievementState(ctx = {}) {
  const save = getSave();
  const unlocked = getAchievements();
  return ACHIEVEMENTS.map(def => {
    const target = safeTarget(def, ctx);
    const raw = Number(def.value(save, ctx)) || 0;
    const value = target ? Math.min(target, raw) : 0;
    return {
      ...def,
      target,
      value,
      unlocked: !!unlocked[def.id],
      unlockedAt: unlocked[def.id]?.unlockedAt || null,
      percent: target ? Math.min(100, value / target * 100) : 0
    };
  });
}

export function evaluateAchievements(ctx = {}) {
  const save = getSave();
  const unlocked = getAchievements();
  const newly = [];
  for (const def of ACHIEVEMENTS) {
    if (unlocked[def.id]) continue;
    const target = safeTarget(def, ctx);
    if (!target) continue;
    const value = Number(def.value(save, ctx)) || 0;
    if (value >= target && unlockAchievement(def.id)) newly.push(def);
  }
  return newly;
}
