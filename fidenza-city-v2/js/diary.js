/**
 * Fidenza da Giocare v2.14 — Diario di Fidenza
 *
 * Costruisce i contenuti di Gazzetta, Passaporto, Radio e Taccuino a partire
 * dallo stato locale del gioco. Funzioni pure, senza DOM.
 */
import { careerLevel } from './career.js';
import { ACHIEVEMENTS } from './achievements.js';
import { NPC_ALL } from './npcs.js';
import { formatDistance, formatTime } from './utils.js';

const WEEKDAYS = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

function issueNumber(date = new Date()) {
  const start = new Date(2026, 0, 1);
  return 1 + Math.floor((date - start) / 86400000);
}

export function diaryDateLabel(date = new Date()) {
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function n(value, fallback = 0) {
  const v = Number(value);
  return Number.isFinite(v) ? v : fallback;
}

export function buildGazette(ctx = {}) {
  const save = ctx.save || {};
  const stats = ctx.stats || {};
  const districts = ctx.districts || [];
  const seen = new Set(ctx.seenDistricts || []);
  const now = ctx.date || new Date();
  const event = ctx.event || null;
  const daily = ctx.daily?.challenge || null;
  const weather = ctx.weather || {};
  const venues = ctx.venues || [];
  const openVenues = venues.filter(v => v.open);
  const level = careerLevel(save.career?.xp || 0);
  const photos = n(stats.photos);
  const npcs = (stats.npcsMet || []).length;
  const stars = (save.stars || []).length;
  const places = (save.places || []).length;
  const totalPlaces = ctx.totalPlaces ?? 23;
  const walk = n(stats.walkMeters);
  const drive = n(stats.driveMeters);

  const headlines = [];
  if (seen.size >= districts.length && districts.length) {
    headlines.push({
      title: 'Fidenza è tutta casa tua',
      body: 'Hai attraversato tutti i quartieri della città. Il prossimo passo? Una foto dalla Gran Madre al tramonto.'
    });
  } else {
    headlines.push({
      title: 'Alla scoperta di Fidenza',
      body: `Hai visitato ${seen.size}/${districts.length || 6} quartieri. Il prossimo confine è a pochi passi.`
    });
  }
  headlines.push({
    title: 'Bar Blu Piramide, l’aperitivo è servito',
    body: 'A Le Azalee l’insegna blu si accende al tramonto: tavolini fuori, auto parcheggiate e storie di quartiere.'
  });
  if (venues.length) {
    headlines.push({
      title: 'Locali aperti ora',
      body: openVenues.length
        ? openVenues.map(v => `${v.name} (${v.label})`).join(' · ')
        : 'Tutto chiuso: la città si riposa fino alla prossima apertura.'
    });
  }
  if (event) {
    headlines.push({
      title: event.title || 'Evento in città',
      body: `${event.short || 'Un appuntamento da non perdere'} · ${event.schedule?.label || 'oggi'}.`
    });
  }
  headlines.push({
    title: `${weather.icon || '☀'} ${weather.label || 'cielo'} su Fidenza`,
    body: `${weather.temp != null ? `${weather.temp}°C` : 'Temperature miti'} e una città che continua a muoversi tra piazze e quartieri.`
  });
  headlines.push({
    title: 'La città cammina',
    body: `${formatDistance(walk)} a piedi e ${formatDistance(drive)} in auto o Vespa. ${photos ? `${photos} cartoline scattate.` : 'Nessuna cartolina, per ora.'}`
  });
  if (daily) {
    headlines.push({
      title: 'Sfida del giorno',
      body: `${daily.title} · ${daily.desc}`
    });
  }
  headlines.push({
    title: 'Dal bancone di Blue',
    body: `Al Bar Blu Piramide si parla di ${npcs} abitanti incontrati e di ${stars} stelle trovate. La città ha sempre una storia in più.`
  });

  const classifieds = [];
  if (photos === 0) classifieds.push('Cercasi fotografo per il Duomo: la facciata aspetta una cartolina.');
  if (places < totalPlaces) classifieds.push('Pellegrino cerca compagnia per la Via Francigena.');
  if (!(save.career?.license)) classifieds.push('Autoscuola cerca aspiranti tassisti per tre checkpoint in città.');
  if (!seen.has('luce')) classifieds.push('Quartiere Luce: volontari per una passeggiata tra i viali.');
  if (!seen.has('corea')) classifieds.push('Corea: biciclette smarrite cercano proprietari in via Baracca.');
  if (npcs < 10) classifieds.push('Bar Blu Piramide: aperitivo e due chiacchiere con Blue.');
  if (venues.length) {
    const openList = openVenues.slice(0, 3).map(v => `${v.name} ${v.label}`).join(' · ');
    classifieds.unshift(openList ? `Aperti ora: ${openList}.` : 'Locali chiusi: si riapre domani.');
  }
  if (classifieds.length < 3) classifieds.push('Mercato di Piazza Duomo: banchi aperti il mercoledì e il sabato.');

  return {
    issue: issueNumber(now),
    dateLabel: diaryDateLabel(now),
    headlines: headlines.slice(0, 5),
    classifieds: classifieds.slice(0, 4),
    photoLine: photos ? `${photos} cartoline nell’album locale` : 'La prima cartolina è ancora da scattare',
    careerLine: `Livello ${level.level} · ${save.career?.jobsDone || 0} lavori completati`
  };
}

export function buildPassport(ctx = {}) {
  const districts = ctx.districts || [];
  const seen = new Set(ctx.seenDistricts || []);
  const stamps = districts.map((district, index) => ({
    id: district.id,
    name: district.name,
    color: district.color || '#8a7f6a',
    description: district.description || '',
    visited: seen.has(district.id),
    number: index + 1
  }));
  const visited = stamps.filter(s => s.visited).length;
  return {
    stamps,
    visited,
    total: stamps.length,
    complete: stamps.length > 0 && visited === stamps.length
  };
}

export function buildRadio(ctx = {}) {
  const gazette = ctx.gazette || buildGazette(ctx);
  const district = ctx.district || null;
  const stories = {
    centro: 'Dal Duomo a Piazza Garibaldi, il centro è un libro di pietra e botteghe.',
    monica: 'La stazione e Piazza della Repubblica sono il cuore dei pendolari e dei viaggi.',
    sanlazzaro: 'A San Lazzaro le vie residenziali raccontano la Fidenza del dopoguerra.',
    azalee: 'Le Azalee sono il quartiere verde a est, tra giardini, villette e il Bar Blu Piramide.',
    corea: 'Corea è il quartiere dei viali alberati e delle storie di vicinato.',
    luce: 'Luce è la Fidenza a ovest, tra via Tagliamento, la chiesa di San Paolo e i viali.'
  };
  const venues = ctx.venues || [];
  const openVenues = venues.filter(v => v.open);
  const venueBulletin = venues.length
    ? [{ title: 'Locali', body: openVenues.length ? openVenues.map(v => `${v.name} ${v.label}`).join(' · ') : 'Tutti chiusi, la città si riposa.' }]
    : [];
  return {
    station: 'Radio Francigena',
    frequency: `${88 + (gazette.issue % 12)}.${gazette.issue % 10} MHz`,
    now: district ? `In onda da ${district.name}` : 'In onda da Fidenza',
    story: district ? (stories[district.id] || district.description) : 'La città racconta le sue strade, i suoi abitanti e i suoi quartieri.',
    bulletin: [...venueBulletin, ...gazette.headlines.slice(0, 3)],
    signOff: 'Radio Francigena · la voce delle strade di Fidenza'
  };
}

export function buildNotebook(ctx = {}) {
  const save = ctx.save || {};
  const stats = ctx.stats || {};
  const seen = new Set(ctx.seenDistricts || []);
  const met = new Set(stats.npcsMet || []);
  const people = NPC_ALL
    .filter(npc => met.has(npc.id))
    .map(npc => ({ name: npc.name, role: npc.role, area: npc.area }))
    .slice(-8)
    .reverse();
  const level = careerLevel(save.career?.xp || 0);
  return {
    people,
    metrics: [
      { label: 'Quartieri', value: `${seen.size}/6` },
      { label: 'Abitanti', value: `${met.size}` },
      { label: 'Stelle', value: `${(save.stars || []).length}/${ctx.totalStars ?? 27}` },
      { label: 'Luoghi', value: `${(save.places || []).length}/${ctx.totalPlaces ?? 23}` },
      { label: 'Foto', value: `${n(stats.photos)}` },
      { label: 'Achievement', value: `${Object.keys(save.achievements || {}).length}/${ACHIEVEMENTS.length}` },
      { label: 'Carriera', value: `Lv ${level.level}` },
      { label: 'Locali', value: `${(ctx.venues || []).filter(v => v.open).length}/${(ctx.venues || []).length}` },
      { label: 'Tempo', value: formatTime(stats.playTime || 0) }
    ],
    signature: people.length ? `Ultimo incontro: ${people[0].name}, ${people[0].role}` : 'Il taccuino aspetta il primo incontro.'
  };
}

export function buildDiary(ctx = {}) {
  const gazette = buildGazette(ctx);
  return {
    gazette,
    passport: buildPassport(ctx),
    radio: buildRadio({ ...ctx, gazette }),
    notebook: buildNotebook(ctx)
  };
}
