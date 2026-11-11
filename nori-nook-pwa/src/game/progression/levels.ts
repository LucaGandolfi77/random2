export const XP_THRESHOLDS = [
  0, 40, 120, 240, 400, 620, 900, 1250, 1700, 2250, 2900, 3650, 4500, 5450, 6500, 7650, 8900, 10250,
  11700, 13250,
];

export const MAX_LEVEL = XP_THRESHOLDS.length;

export const levelFromXp = (xp: number): number => {
  let level = 1;
  for (let index = 0; index < XP_THRESHOLDS.length; index += 1) {
    if (xp >= (XP_THRESHOLDS[index] ?? 0)) level = index + 1;
  }
  return Math.min(MAX_LEVEL, level);
};

export const levelStartXp = (level: number): number =>
  XP_THRESHOLDS[Math.max(0, Math.min(XP_THRESHOLDS.length - 1, level - 1))] ?? 0;

export const nextLevelXp = (level: number): number => {
  if (level >= MAX_LEVEL) return levelStartXp(MAX_LEVEL);
  return XP_THRESHOLDS[level] ?? levelStartXp(MAX_LEVEL);
};

export const levelProgress = (xp: number): { level: number; into: number; span: number; ratio: number } => {
  const level = levelFromXp(xp);
  const start = levelStartXp(level);
  const next = nextLevelXp(level);
  const span = Math.max(1, next - start);
  const into = Math.max(0, xp - start);
  return { level, into, span, ratio: level === MAX_LEVEL ? 1 : Math.min(1, into / span) };
};

export const levelUnlocks = (level: number): string[] => {
  const unlocks: string[] = [];
  if (level >= 2) unlocks.push('Brown Rice', 'Shrimp', 'California Roll');
  if (level >= 3) unlocks.push('Seasoned Rice', 'Eel', 'Spicy Tuna Roll');
  if (level >= 4) unlocks.push('Pink Rice', 'Scallop', 'Rainbow Roll');
  if (level >= 5) unlocks.push('Black Rice', 'Premium ingredients', 'Golden Tuna Crown');
  return unlocks;
};

export const rewardGradeMultiplier = (grade: string): number => {
  switch (grade) {
    case 'Masterpiece':
      return 2.2;
    case 'Perfect':
      return 1.7;
    case 'Delicious':
      return 1.35;
    case 'Good':
      return 1;
    default:
      return 0.7;
  }
};
