import { describe, expect, it } from 'vitest';
import { loadTextSize, saveTextSize, textScale } from '../src/accessibility';

describe('text size', () => {
  it('scales the large option without changing the normal option', () => {
    expect(textScale('normal')).toBe(1);
    expect(textScale('large')).toBe(1.2);
  });

  it('defaults to normal when storage is unavailable', () => {
    expect(loadTextSize()).toBe('normal');
    expect(() => saveTextSize('large')).not.toThrow();
  });
});
