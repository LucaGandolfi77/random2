/**
 * Fidenza da Giocare v2.5 — eventi in città
 *
 * Calendario leggero e deterministico. Gli eventi non richiedono backend:
 * dipendono da data, ora e stagione. Possono essere forzati con ?event=<id>.
 */

export const CITY_EVENTS = [
  {
    id: 'christmas-market',
    title: 'Mercatino di Natale',
    short: 'Luci, bancarelle e profumo di vin brulé in Piazza Duomo.',
    icon: '✦',
    color: '#9a4a34',
    placeId: 'piazza-duomo',
    type: 'christmas',
    careers: ['photo', 'courier', 'taxi'],
    schedule(date) {
      if (date.getMonth() !== 11 || date.getDate() > 24) return null;
      return { start: 10, end: 21, label: '10:00 – 21:00' };
    }
  },
  {
    id: 'san-donnino',
    title: 'Festa di San Donnino',
    short: 'La festa patronale: bancarelle, musica e specialità in centro.',
    icon: '✹',
    color: '#c2684b',
    placeId: 'piazza-duomo',
    type: 'festival',
    careers: ['courier', 'photo', 'taxi'],
    schedule(date) {
      if (date.getMonth() !== 9 || date.getDate() < 8 || date.getDate() > 10) return null;
      return { start: 10, end: 23, label: '10:00 – 23:00' };
    }
  },
  {
    id: 'market',
    title: 'Mercato in Piazza Duomo',
    short: 'Il mercato settimanale: banchi, cassette e consegne dell’ultimo minuto.',
    icon: '▤',
    color: '#c99a3f',
    placeId: 'piazza-duomo',
    type: 'market',
    careers: ['courier', 'taxi'],
    schedule(date) {
      const day = date.getDay();
      if (day !== 3 && day !== 6) return null;
      return { start: 7, end: 14, label: '07:00 – 14:00' };
    }
  },
  {
    id: 'theatre-night',
    title: 'Serata al Teatro Magnani',
    short: 'Il teatro si accende: taxi, pubblico e luci sul foyer.',
    icon: '◈',
    color: '#7a5a8a',
    placeId: 'teatro',
    type: 'theatre',
    careers: ['taxi', 'photo'],
    schedule(date) {
      const day = date.getDay();
      if (day !== 5 && day !== 6) return null;
      return { start: 19, end: 23.5, label: '19:00 – 23:30' };
    }
  },
  {
    id: 'summer-dehors',
    title: 'Dehors d’estate',
    short: 'Tavolini e ombrelloni in piazza nelle sere d’estate.',
    icon: '☀',
    color: '#c99a3f',
    placeId: 'piazza-duomo',
    type: 'summer',
    careers: ['taxi', 'photo'],
    schedule(date) {
      if (date.getMonth() < 5 || date.getMonth() > 7) return null;
      const day = date.getDay();
      if (day !== 5 && day !== 6 && day !== 0) return null;
      return { start: 18.5, end: 23.5, label: '18:30 – 23:30' };
    }
  },
  {
    id: 'station-rush',
    title: 'Ora di punta in stazione',
    short: 'Treni, valigie e taxi: la stazione è nel vivo della giornata.',
    icon: '⇄',
    color: '#3f748a',
    placeId: 'stazione',
    type: 'rush',
    careers: ['taxi', 'courier'],
    schedule(date) {
      const day = date.getDay();
      if (day === 0 || day === 6) return null;
      return { start: 7, end: 19.5, label: '07:00 – 09:00 · 17:30 – 19:30', windows: [[7, 9], [17.5, 19.5]] };
    }
  }
];

const EVENT_ORDER = ['christmas-market', 'san-donnino', 'market', 'theatre-night', 'summer-dehors', 'station-rush'];

export function getEventById(id) {
  return CITY_EVENTS.find(event => event.id === id) || null;
}

export function getEventSchedule(event, date = new Date()) {
  return event?.schedule?.(date) || null;
}

export function getTodayEvents(date = new Date()) {
  return CITY_EVENTS
    .map(event => ({ ...event, schedule: getEventSchedule(event, date) }))
    .filter(event => event.schedule);
}

export function getActiveEvent(date = new Date()) {
  const hour = date.getHours() + date.getMinutes() / 60;
  const ordered = [...CITY_EVENTS].sort((a, b) => EVENT_ORDER.indexOf(a.id) - EVENT_ORDER.indexOf(b.id));
  for (const event of ordered) {
    const schedule = getEventSchedule(event, date);
    const open = schedule?.windows
      ? schedule.windows.some(([start, end]) => hour >= start && hour < end)
      : schedule && hour >= schedule.start && hour < schedule.end;
    if (open) return { ...event, schedule, active: true };
  }
  return null;
}

export function getEventSnapshot(date = new Date(), forcedId = null) {
  const forced = forcedId ? getEventById(forcedId) : null;
  const active = forced
    ? { ...forced, active: true, schedule: { start: 0, end: 24, label: 'evento forzato' } }
    : getActiveEvent(date);
  const today = getTodayEvents(date);
  const hour = date.getHours() + date.getMinutes() / 60;
  const next = today
    .map(event => {
      const starts = event.schedule.windows
        ? event.schedule.windows.map(([start]) => start)
        : [event.schedule.start];
      const nextStart = starts.filter(start => start > hour).sort((a, b) => a - b)[0];
      return nextStart == null ? null : { ...event, nextStart };
    })
    .filter(Boolean)
    .sort((a, b) => a.nextStart - b.nextStart)[0] || null;
  return {
    active,
    today,
    next,
    dateKey: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
    forced: !!forced
  };
}

export function eventLabel(event) {
  return event ? `${event.title} · ${event.schedule?.label || ''}`.trim() : 'Nessun evento';
}
