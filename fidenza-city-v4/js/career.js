import {
  addCareerJob, addCareerMoney, addCareerReputation, addCareerXp,
  addStat, addUniqueStat, getCareer, recordCareerJob, setCareerLicense, updateCareer
} from './save.js';
import { formatNumber } from './utils.js';

export const CAREER_TYPES = {
  taxi: { label: 'Tassista', icon: '◈', color: '#3f748a', desc: 'Porta i passeggeri tra stazione, piazze e quartieri.' },
  courier: { label: 'Corriere', icon: '▤', color: '#2f6b4f', desc: 'Consegne rapide, pacchi fragili e clienti impazienti.' },
  photo: { label: 'Fotografo', icon: '▣', color: '#7a5a8a', desc: 'Scatta cartoline ai luoghi simbolo di Fidenza.' }
};

export const CAREER_LEVELS = [0, 300, 800, 1600, 2800, 4500, 7000, 10000, 14000, 20000];

export const UPGRADES = {
  engine: { label: 'Motore', desc: 'Velocità massima e accelerazione', costs: [350, 800, 1500] },
  handling: { label: 'Assetto', desc: 'Sterzo più preciso e agile', costs: [300, 700, 1300] },
  brakes: { label: 'Freni', desc: 'Spazi di frenata più corti', costs: [250, 600, 1200] }
};

export function careerLevel(xp = 0) {
  let level = 1;
  for (let i = 1; i < CAREER_LEVELS.length; i++) {
    if (xp >= CAREER_LEVELS[i]) level = i + 1;
    else break;
  }
  const floor = CAREER_LEVELS[level - 1] || 0;
  const next = CAREER_LEVELS[level] ?? null;
  return {
    level,
    floor,
    next,
    toNext: next == null ? 0 : next - xp,
    progress: next == null ? 100 : Math.min(100, (xp - floor) / Math.max(1, next - floor) * 100)
  };
}

function placeStep(place, overrides = {}) {
  return {
    x: place.beaconX ?? place.x,
    z: place.beaconZ ?? place.z,
    name: place.short || place.name,
    prompt: 'interagisci',
    comment: '',
    radius: 13,
    ...overrides
  };
}

function pickTwo(places) {
  const pool = (places || []).filter(p => p && Number.isFinite(p.x) && Number.isFinite(p.z));
  if (pool.length < 2) return null;
  for (let i = 0; i < 20; i++) {
    const a = pool[Math.floor(Math.random() * pool.length)];
    const b = pool[Math.floor(Math.random() * pool.length)];
    if (!a || !b || a.id === b.id) continue;
    const d = Math.hypot(a.x - b.x, a.z - b.z);
    if (d > 180) return { a, b, distance: d };
  }
  return { a: pool[0], b: pool[1], distance: Math.hypot(pool[0].x - pool[1].x, pool[0].z - pool[1].z) };
}

function pickPlaces(places, count) {
  const pool = (places || []).filter(p => p && Number.isFinite(p.x) && Number.isFinite(p.z));
  const out = [];
  const used = new Set();
  for (let attempt = 0; attempt < 60 && out.length < count; attempt++) {
    const p = pool[Math.floor(Math.random() * pool.length)];
    if (!p || used.has(p.id)) continue;
    used.add(p.id);
    out.push(p);
  }
  return out;
}

function payoutFor(distance, base, perMeter, reputation, night) {
  const rep = 1 + Math.min(0.5, (reputation || 0) * 0.01);
  return Math.round((base + distance * perMeter) * rep * (night ? 1.22 : 1));
}

function isNight(hour) {
  return hour >= 20 || hour < 6;
}

function makeTaxiOffer(world, reputation, index) {
  const pair = pickTwo(world.places);
  if (!pair) return null;
  const night = isNight(world.hour);
  const payout = payoutFor(pair.distance, 65, 0.7, reputation, night);
  return {
    id: `taxi-${Date.now()}-${index}`,
    career: 'taxi',
    type: 'taxi',
    title: `${pair.a.short || pair.a.name} → ${pair.b.short || pair.b.name}`,
    short: `Corsa taxi per ${pair.b.short || pair.b.name}. ${night ? 'Turno notturno.' : 'Turno diurno.'}`,
    payout,
    xp: Math.round(22 + pair.distance * 0.025),
    reputation: 2,
    time: Math.max(80, Math.round(pair.distance / 7 + 55 + (night ? 15 : 0))),
    distance: Math.round(pair.distance),
    night,
    steps: [
      placeStep(pair.a, { name: `Cliente · ${pair.a.short || pair.a.name}`, prompt: 'fai salire il cliente', radius: 12, comment: '«A destra, poi dritto. Senza fretta.»' }),
      placeStep(pair.b, { name: `Destinazione · ${pair.b.short || pair.b.name}`, prompt: 'fai scendere il cliente', radius: 14, comment: 'Corsa conclusa. Il cliente lascia una mancia.' })
    ]
  };
}

function makeCourierOffer(world, reputation, index) {
  const places = pickPlaces(world.places, 3);
  if (places.length < 3) return null;
  const night = isNight(world.hour);
  const d1 = Math.hypot(places[0].x - places[1].x, places[0].z - places[1].z);
  const d2 = Math.hypot(places[1].x - places[2].x, places[1].z - places[2].z);
  const distance = d1 + d2;
  const payout = payoutFor(distance, 90, 0.85, reputation, night);
  return {
    id: `courier-${Date.now()}-${index}`,
    career: 'courier',
    type: 'delivery',
    title: `Consegne: ${places[0].short || places[0].name} → ${places[2].short || places[2].name}`,
    short: `Ritira il pacco e consegnalo a ${places[1].short || places[1].name} e ${places[2].short || places[2].name}.`,
    payout,
    xp: Math.round(26 + distance * 0.03),
    reputation: 3,
    time: Math.max(110, Math.round(distance / 6.5 + 70 + (night ? 15 : 0))),
    distance: Math.round(distance),
    night,
    steps: [
      placeStep(places[0], { name: `Ritiro · ${places[0].short || places[0].name}`, prompt: 'ritira il pacco', radius: 11, comment: 'Pacco fragile: guida con attenzione.' }),
      placeStep(places[1], { name: `Consegna · ${places[1].short || places[1].name}`, prompt: 'consegna il pacco', radius: 12, comment: 'Prima consegna firmata.' }),
      placeStep(places[2], { name: `Consegna · ${places[2].short || places[2].name}`, prompt: 'consegna l’ultimo pacco', radius: 12, comment: 'Consegne completate. Il cliente ti ringrazia.' })
    ]
  };
}

function makePhotoOffer(world, reputation, index) {
  const places = pickPlaces(world.places, 3);
  if (places.length < 2) return null;
  const chosen = places.slice(0, 3);
  const payout = payoutFor(chosen.length * 90, 40, 0.2, reputation, false);
  return {
    id: `photo-${Date.now()}-${index}`,
    career: 'photo',
    type: 'photo',
    title: `Servizio fotografico: ${chosen.map(p => p.short || p.name).join(', ')}`,
    short: 'Scatta una foto vicino a ogni soggetto. Usa la modalità foto (P).',
    payout,
    xp: 18 + chosen.length * 10,
    reputation: 2,
    time: 210,
    distance: 0,
    night: isNight(world.hour),
    steps: chosen.map(p => placeStep(p, {
      name: `Foto · ${p.short || p.name}`,
      prompt: 'scatta una foto in modalità foto',
      radius: 18,
      photoRequired: true,
      comment: 'Scatto riuscito: composizione perfetta.'
    }))
  };
}

function makeEventOffer(event, careerId, world, reputation, index) {
  const target = world.places.find(p => p.id === event.placeId);
  if (!target) return null;
  const others = world.places.filter(p => p.id !== target.id);
  const origin = others[Math.floor(Math.random() * others.length)] || target;
  const night = isNight(world.hour);
  const distance = Math.hypot(target.x - origin.x, target.z - origin.z);
  const multiplier = event.type === 'christmas' ? 1.65 : event.type === 'festival' ? 1.6 : 1.45;
  const basePayout = payoutFor(distance, 100, 0.9, reputation, night);
  const payout = Math.round(basePayout * multiplier);

  if (careerId === 'taxi') {
    return {
      id: `event-taxi-${event.id}-${Date.now()}-${index}`,
      career: 'taxi',
      type: 'taxi',
      event: event.id,
      eventTitle: event.title,
      title: `Taxi per ${event.title}`,
      short: `${event.short} Porta i passeggeri fino all’evento.`,
      payout,
      xp: Math.round(34 + distance * 0.03),
      reputation: 4,
      time: Math.max(90, Math.round(distance / 7 + 60)),
      distance: Math.round(distance),
      night,
      steps: [
        placeStep(origin, { name: `Passeggeri · ${origin.short || origin.name}`, prompt: 'fai salire i passeggeri', radius: 13, comment: '«Andiamo all’evento, presto!»' }),
        placeStep(target, { name: `Evento · ${event.title}`, prompt: 'lascia i passeggeri', radius: 15, comment: 'I passeggeri scendono emozionati.' })
      ]
    };
  }

  if (careerId === 'courier') {
    return {
      id: `event-courier-${event.id}-${Date.now()}-${index}`,
      career: 'courier',
      type: 'delivery',
      event: event.id,
      eventTitle: event.title,
      title: `Fornitura per ${event.title}`,
      short: `Consegna la fornitura speciale all’evento in ${target.short || target.name}.`,
      payout,
      xp: Math.round(30 + distance * 0.035),
      reputation: 4,
      time: Math.max(100, Math.round(distance / 6.5 + 70)),
      distance: Math.round(distance),
      night,
      steps: [
        placeStep(origin, { name: `Ritiro fornitura · ${origin.short || origin.name}`, prompt: 'ritira la fornitura', radius: 12, comment: 'Casse pronte: l’evento non può aspettare.' }),
        placeStep(target, { name: `Consegna · ${event.title}`, prompt: 'consegna la fornitura', radius: 15, comment: 'Fornitura consegnata: l’evento può iniziare.' })
      ]
    };
  }

  if (careerId === 'photo') {
    const second = others[Math.floor(Math.random() * others.length)] || target;
    return {
      id: `event-photo-${event.id}-${Date.now()}-${index}`,
      career: 'photo',
      type: 'photo',
      event: event.id,
      eventTitle: event.title,
      title: `Servizio foto · ${event.title}`,
      short: 'Scatta foto all’evento e al soggetto collegato.',
      payout,
      xp: 42,
      reputation: 4,
      time: 220,
      distance: 0,
      night,
      steps: [
        placeStep(target, { name: `Foto evento · ${event.title}`, prompt: 'scatta una foto all’evento', radius: 20, photoRequired: true, comment: 'Scatto all’evento riuscito.' }),
        placeStep(second, { name: `Foto collegata · ${second.short || second.name}`, prompt: 'scatta una foto al soggetto', radius: 18, photoRequired: true, comment: 'Servizio completato.' })
      ]
    };
  }
  return null;
}

export class CareerManager {
  constructor({ missions, world, vehicles, audio, onToast, onChange, onJobStart }) {
    this.missions = missions;
    this.world = world;
    this.vehicles = vehicles;
    this.audio = audio;
    this.onToast = onToast;
    this.onChange = onChange;
    this.onJobStart = onJobStart;
    this.offerCache = new Map();
    this.activeOffer = null;
    this.event = null;
  }

  setEvent(event) {
    const changed = (this.event?.id || null) !== (event?.id || null);
    this.event = event || null;
    if (changed) {
      this.offerCache.clear();
      this.onChange?.();
    }
  }

  levelInfo() { return careerLevel(getCareer().xp || 0); }

  getOffers(careerId, force = false) {
    const cacheKey = `${careerId}:${this.event?.id || 'city'}`;
    if (!force && this.offerCache.has(cacheKey)) return this.offerCache.get(cacheKey);
    const career = getCareer();
    const builder = careerId === 'taxi' ? makeTaxiOffer : careerId === 'courier' ? makeCourierOffer : makePhotoOffer;
    const offers = [];
    if (this.event?.careers?.includes(careerId)) {
      const eventOffer = makeEventOffer(this.event, careerId, this.world, career.reputation, 0);
      if (eventOffer) offers.push(eventOffer);
    }
    for (let i = 0; offers.length < 3 && i < 6; i++) {
      const offer = builder(this.world, career.reputation, i);
      if (offer) offers.push(offer);
    }
    this.offerCache.set(cacheKey, offers);
    return offers;
  }

  startOffer(offer) {
    if (!offer) return false;
    const def = {
      ...offer,
      id: `career-${offer.career}-${Date.now()}`,
      reward: Math.round(offer.payout / 3),
      career: {
        kind: 'job',
        career: offer.career,
        payout: offer.payout,
        xp: offer.xp,
        reputation: offer.reputation,
        night: offer.night,
        event: offer.event || null
      },
      steps: offer.steps.map(step => ({ ...step }))
    };
    const ok = this.missions.startJob(def);
    if (ok) {
      this.activeOffer = offer;
      this.onJobStart?.(offer);
    }
    return ok;
  }

  startLicense() {
    const career = getCareer();
    if (career.license) return false;
    const places = ['piazza-duomo', 'teatro', 'stazione', 'comunale']
      .map(id => this.world.places.find(p => p.id === id))
      .filter(Boolean)
      .slice(0, 3);
    if (places.length < 3) return false;
    const def = {
      id: `license-${Date.now()}`,
      type: 'custom',
      title: 'Esame di guida',
      short: 'Raggiungi i tre checkpoint nel tempo limite. Supera l’esame per sbloccare taxi e consegne.',
      time: 150,
      reward: 0,
      career: { kind: 'license' },
      steps: places.map((p, i) => placeStep(p, {
        name: i === 0 ? 'Checkpoint di partenza' : `Checkpoint ${i + 1}`,
        prompt: i === 2 ? 'termina l’esame' : 'passa il checkpoint',
        radius: 15,
        comment: i === 2 ? 'Esame superato: patente conseguita!' : 'Checkpoint superato.'
      }))
    };
    const ok = this.missions.startJob(def);
    if (ok) this.activeOffer = null;
    return ok;
  }

  completeJob(def, elapsed) {
    const c = def?.career;
    if (!c) return null;
    this.offerCache.clear();
    this.activeOffer = null;
    const beforeXp = getCareer().xp || 0;

    if (c.kind === 'license') {
      setCareerLicense(true);
      addCareerMoney(200);
      addCareerXp(40);
      addStat('moneyEarned', 200);
      addCareerJob('license');
      recordCareerJob({ title: 'Esame di guida superato', payout: 200, xp: 40, career: 'license', at: Date.now() });
      const after = careerLevel((getCareer().xp || 0));
      return { kind: 'license', payout: 200, xp: 40, levelUp: after.level > careerLevel(beforeXp).level, level: after.level };
    }

    addCareerMoney(c.payout || 0);
    addCareerXp(c.xp || 0);
    addCareerReputation(c.reputation || 0);
    addCareerJob(c.career);
    addStat('jobs', 1);
    addStat('moneyEarned', c.payout || 0);
    if (c.event) {
      addStat('eventJobs', 1);
      addUniqueStat('eventsSeen', c.event);
    }
    recordCareerJob({
      title: def.title,
      payout: c.payout || 0,
      xp: c.xp || 0,
      career: c.career,
      elapsed: Math.round(elapsed || 0),
      at: Date.now()
    });
    const after = careerLevel(getCareer().xp || 0);
    return {
      kind: 'job',
      career: c.career,
      payout: c.payout || 0,
      xp: c.xp || 0,
      levelUp: after.level > careerLevel(beforeXp).level,
      level: after.level,
      event: c.event || null
    };
  }

  failJob(def) {
    const c = def?.career;
    if (!c) return null;
    this.offerCache.clear();
    this.activeOffer = null;
    if (c.kind === 'license') {
      return { kind: 'license', failed: true };
    }
    addCareerReputation(-1);
    return { kind: 'job', career: c.career, failed: true };
  }

  registerPhoto(photo) {
    return this.missions.registerPhoto?.(photo) || false;
  }

  buyUpgrade(key, vehicles = this.vehicles) {
    const def = UPGRADES[key];
    const career = getCareer();
    if (!def) return { ok: false, reason: 'unknown' };
    const level = career.upgrades?.[key] || 0;
    if (level >= 3) return { ok: false, reason: 'max' };
    const cost = def.costs[level];
    if ((career.money || 0) < cost) return { ok: false, reason: 'money' };
    const upgrades = { ...(career.upgrades || {}), [key]: level + 1 };
    updateCareer({ money: career.money - cost, upgrades });
    vehicles?.applyUpgrades?.(upgrades);
    this.onChange?.();
    return { ok: true, level: level + 1, cost };
  }

  refresh() {
    this.offerCache.clear();
    this.onChange?.();
  }

  moneyLabel() { return `${formatNumber(getCareer().money || 0)} €`; }
}
