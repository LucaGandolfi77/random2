export type TextSize = 'normal' | 'large';

const KEY = 'crew-of-one:text-size';

export const loadTextSize = (): TextSize => {
  try {
    return localStorage.getItem(KEY) === 'large' ? 'large' : 'normal';
  } catch {
    return 'normal';
  }
};

export const saveTextSize = (size: TextSize): void => {
  try {
    localStorage.setItem(KEY, size);
  } catch {
    // The size still applies for this session.
  }
};

export const textScale = (size: TextSize): number => (size === 'large' ? 1.2 : 1);
