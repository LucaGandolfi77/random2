import type { QualitySetting } from '../utils/storage';

interface NavigatorWithMemory extends Navigator {
  deviceMemory?: number;
}

export class QualityManager {
  private setting: QualitySetting = 'auto';
  private low = false;

  get isLow(): boolean {
    return this.low;
  }

  get activeSetting(): QualitySetting {
    return this.setting;
  }

  setSetting(setting: QualitySetting): boolean {
    this.setting = setting;
    const nextLow = this.resolveLow();
    const changed = nextLow !== this.low;
    this.low = nextLow;
    return changed;
  }

  resolveLow(): boolean {
    if (this.setting === 'low') return true;
    if (this.setting === 'high') return false;

    const nav = navigator as NavigatorWithMemory;
    const memory = nav.deviceMemory ?? 8;
    const cores = navigator.hardwareConcurrency ?? 8;
    const smallScreen = window.innerWidth < 820;
    const touch = navigator.maxTouchPoints > 1;
    return memory <= 4 || cores <= 4 || (smallScreen && touch);
  }
}
