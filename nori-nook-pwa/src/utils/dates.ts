export const pad2 = (value: number): string => String(value).padStart(2, '0');

export const dateKey = (date: Date = new Date()): string =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

export const parseDateKey = (key: string): Date => {
  const [year = '1970', month = '01', day = '01'] = key.split('-');
  return new Date(Number(year), Number(month) - 1, Number(day));
};

export const yesterdayKey = (date: Date = new Date()): string => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() - 1);
  return dateKey(copy);
};

export const getIsoWeekKey = (date: Date = new Date()): string => {
  const copy = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(((copy.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${copy.getUTCFullYear()}-W${pad2(weekNumber)}`;
};

const dayOfYear = (date: Date): number => {
  const start = new Date(date.getFullYear(), 0, 1);
  return Math.floor((date.getTime() - start.getTime()) / 86400000) + 1;
};

export const isDateInAnnualWindow = (
  date: Date,
  startMonth: number,
  startDay: number,
  endMonth: number,
  endDay: number,
): boolean => {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const start = startMonth * 100 + startDay;
  const end = endMonth * 100 + endDay;
  const current = month * 100 + day;
  if (start <= end) return current >= start && current <= end;
  return current >= start || current <= end;
};

export const daysUntilAnnualWindowEnd = (
  date: Date,
  endMonth: number,
  endDay: number,
): number => {
  const end = new Date(date.getFullYear(), endMonth - 1, endDay);
  if (end < new Date(date.getFullYear(), date.getMonth(), date.getDate())) {
    end.setFullYear(end.getFullYear() + 1);
  }
  return Math.max(0, Math.ceil((end.getTime() - date.getTime()) / 86400000));
};

export const currentSeason = (date: Date = new Date()): 'spring' | 'summer' | 'autumn' | 'winter' => {
  const month = date.getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
};

export const startOfDay = (date: Date = new Date()): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const weekdayLabel = (date: Date = new Date()): string =>
  ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()] ?? 'Sunday';

export const daysInYear = (year: number): number =>
  (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;

export const dayOfYearPublic = dayOfYear;
