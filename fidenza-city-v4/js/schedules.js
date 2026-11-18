/**
 * Fidenza da Giocare v2.15 — orari, turni e ritmi di città
 *
 * Turni NPC, aperture dei locali e fasce di presenza dei pedoni. Tutto deriva
 * dall'ora del mondo: nessuno stato da salvare.
 */

const standard = (x, z, opts = {}) => {
  const lunchX = opts.lunchX ?? x;
  const lunchZ = opts.lunchZ ?? z;
  const eveningX = opts.eveningX ?? x;
  const eveningZ = opts.eveningZ ?? z;
  const slots = [];
  if (opts.morning !== false) slots.push({ from: 7, to: 13, x, z, activity: 'lavoro' });
  slots.push({ from: 13, to: 15, x: lunchX, z: lunchZ, activity: 'pausa' });
  if (opts.afternoon !== false) slots.push({ from: 15, to: 19, x, z, activity: 'lavoro' });
  if (opts.evening !== false) slots.push({ from: 19, to: 22, x: eveningX, z: eveningZ, activity: 'tempo libero' });
  return slots;
};

const active = (from, to, activity = 'in giro') => [{ from, to, keepRoute: true, activity }];

export const NPC_SCHEDULES = {
  'blue-bartender': [
    { from: 8, to: 20, x: 2078, z: 788, activity: 'bar' }
  ],
  'giulia-duomo': standard(-283, 8, { lunchX: -296, lunchZ: -4, eveningX: -296, eveningZ: -4 }),
  'marco-fotografo': standard(-305, 12, { lunchX: -296, lunchZ: -4, eveningX: -296, eveningZ: -4 }),
  'rosa-mercato': [
    { from: 7, to: 14, x: -290, z: -18, activity: 'mercato' },
    { from: 18, to: 21, x: -296, z: -4, activity: 'tempo libero' }
  ],
  'pietro-giornalaio': standard(8, -16, { eveningX: 14, eveningZ: -21 }),
  'anna-artigiana': standard(24, -28, { lunchX: 14, lunchZ: -21, eveningX: 14, eveningZ: -21 }),
  'luca-teatro': [
    { from: 10, to: 13, x: -86, z: 64, activity: 'teatro' },
    { from: 15, to: 23, x: -86, z: 64, activity: 'teatro' }
  ],
  'chiara-stazione': [
    { from: 6, to: 22, x: 181, z: -117, activity: 'stazione' }
  ],
  'bianca-parco': [
    { from: 6, to: 9, x: -228, z: 602, activity: 'corsa' },
    { from: 17, to: 20, x: -228, z: 602, activity: 'corsa' }
  ],
  'samuele-parco': [
    { from: 9, to: 12, x: -244, z: 626, activity: 'passeggiata' },
    { from: 16, to: 19, x: -244, z: 626, activity: 'passeggiata' }
  ],
  'paolo-granmadre': [
    { from: 8, to: 12, x: 407, z: 141, activity: 'volontariato' },
    { from: 14, to: 18, x: 407, z: 141, activity: 'volontariato' }
  ],
  'francesca-verdi': standard(-12, 100, { lunchX: -18, lunchZ: 105, eveningX: -18, eveningZ: 105 }),
  'nadia-farmacia': standard(-62, -2, { lunchX: -51, lunchZ: 2, eveningX: -51, eveningZ: 2 }),
  'sofia-studentessa': active(7, 22),
  'davide-barista': active(7, 22),
  'omar-pendolare': active(6, 22),
  'enrico-ciclista': active(7, 21),
  'elena-fioraia': active(8, 21),
  'marta-libraia': active(9, 21)
};

export function scheduleSlotFor(id, hour) {
  const slots = NPC_SCHEDULES[id];
  if (!slots) return { visible: true, activity: 'in giro' };
  const slot = slots.find(s => hour >= s.from && hour < s.to);
  return slot ? { ...slot, visible: true } : { visible: false, activity: 'a casa' };
}

export function isVenueOpen(hour, hours = {}, weekday = null) {
  if (Array.isArray(hours.closedDays) && weekday != null && hours.closedDays.includes(weekday)) return false;
  const open = Number(hours.open);
  const close = Number(hours.close);
  if (!Number.isFinite(open) || !Number.isFinite(close)) return true;
  if (open === close) return true;
  return open < close
    ? hour >= open && hour < close
    : hour >= open || hour < close;
}

export function venueLabel(hours = {}) {
  const open = Number(hours.open);
  const close = Number(hours.close);
  if (!Number.isFinite(open) || !Number.isFinite(close)) return 'sempre aperto';
  const fmt = h => `${String(Math.floor(h)).padStart(2, '0')}:${h % 1 ? '30' : '00'}`;
  return `${fmt(open)}–${fmt(close)}`;
}

export function venueStatus(hour, venue = {}, weekday = null) {
  const open = isVenueOpen(hour, venue.hours || {}, weekday);
  return {
    open,
    label: venueLabel(venue.hours || {}),
    text: open ? 'aperto' : 'chiuso',
    until: open ? `fino alle ${venueLabel(venue.hours || {}).split('–')[1]}` : `apre alle ${venueLabel(venue.hours || {}).split('–')[0]}`
  };
}

const CROWD_CURVES = {
  monica: [[6, 9, 3], [9, 17, 1], [17, 20, 3], [20, 22, 1]],
  centro: [[6, 8, 1], [8, 10, 2], [10, 14, 3], [14, 17, 2], [17, 22, 3], [22, 24, 0]],
  sanlazzaro: [[7, 9, 3], [9, 12, 1], [12, 14, 2], [14, 17, 1], [17, 20, 3], [20, 22, 1]],
  azalee: [[7, 9, 2], [9, 12, 1], [12, 14, 2], [14, 17, 1], [17, 20, 3], [20, 22, 1]],
  corea: [[7, 9, 3], [9, 12, 1], [12, 14, 2], [14, 17, 1], [17, 20, 3], [20, 22, 1]],
  luce: [[7, 9, 2], [9, 12, 1], [12, 14, 2], [14, 17, 1], [17, 20, 3], [20, 22, 1]]
};

export function crowdLevel(districtId, hour) {
  const curve = CROWD_CURVES[districtId] || CROWD_CURVES.centro;
  for (const [from, to, level] of curve) {
    if (hour >= from && hour < to) return level;
  }
  return 0;
}

export function crowdVisible(districtId, slot, hour) {
  return slot < crowdLevel(districtId, hour);
}

export function scheduleSummary(hour) {
  const ranges = [
    [6, 9, 'mattina presto'],
    [9, 12, 'mattina'],
    [12, 14, 'pranzo'],
    [14, 17, 'pomeriggio'],
    [17, 20, 'ora di punta'],
    [20, 22, 'sera'],
    [22, 24, 'notte']
  ];
  const found = ranges.find(([from, to]) => hour >= from && hour < to);
  return found ? found[2] : 'notte';
}
