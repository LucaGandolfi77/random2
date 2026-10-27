import { afterEach, describe, expect, it, vi } from 'vitest';
import { isIosSafari, shareText } from '../src/pwa';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('install and share helpers', () => {
  it('detects iOS Safari but not Chrome/Firefox on iOS', () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)' });
    expect(isIosSafari()).toBe(true);

    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (iPhone) CriOS/120.0' });
    expect(isIosSafari()).toBe(false);

    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Macintosh)' });
    expect(isIosSafari()).toBe(false);
  });

  it('uses the native share sheet when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share, userAgent: 'test' });

    await expect(shareText('A run', 'https://example.test')).resolves.toBe('shared');
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Crew of One', text: 'A run' }),
    );
  });

  it('falls back to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText }, userAgent: 'test' });

    await expect(shareText('A run', 'https://example.test')).resolves.toBe('copied');
    expect(writeText).toHaveBeenCalledWith('A run https://example.test');
  });

  it('reports cancellation and unavailable sharing', async () => {
    const abort = Object.assign(new Error('cancelled'), { name: 'AbortError' });
    vi.stubGlobal('navigator', { share: vi.fn().mockRejectedValue(abort), userAgent: 'test' });
    await expect(shareText('A run', 'https://example.test')).resolves.toBe('cancelled');

    vi.stubGlobal('navigator', { userAgent: 'test' });
    await expect(shareText('A run', 'https://example.test')).resolves.toBe('unavailable');
  });
});
