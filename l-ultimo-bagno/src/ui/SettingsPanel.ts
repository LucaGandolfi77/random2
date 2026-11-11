import type { QualitySetting, Settings, SubtitleSize } from '../utils/storage';

export interface SettingsCallbacks {
  onQuality: (quality: QualitySetting) => void;
  onSubtitleSize: (size: SubtitleSize) => void;
  onSubtitles: (enabled: boolean) => void;
  onVoices: (enabled: boolean) => void;
  onCinema: (enabled: boolean) => void;
  onDownloadSrt: () => void;
  onMenu: () => void;
}

export class SettingsPanel {
  private readonly root: HTMLElement;
  private readonly callback: SettingsCallbacks;
  private readonly quality: HTMLSelectElement;
  private readonly subtitleSize: HTMLSelectElement;
  private readonly subtitles: HTMLInputElement;
  private readonly voices: HTMLInputElement;
  private readonly cinema: HTMLInputElement;
  private readonly voiceStatus: HTMLElement;
  private openState = false;

  constructor(root: HTMLElement, callback: SettingsCallbacks) {
    this.root = root;
    this.callback = callback;
    this.quality = root.querySelector('#quality-select') as HTMLSelectElement;
    this.subtitleSize = root.querySelector('#subtitle-size') as HTMLSelectElement;
    this.subtitles = root.querySelector('#toggle-subtitles') as HTMLInputElement;
    this.voices = root.querySelector('#toggle-voices') as HTMLInputElement;
    this.cinema = root.querySelector('#toggle-cinema') as HTMLInputElement;
    this.voiceStatus = root.querySelector('#voice-status') as HTMLElement;

    this.quality.addEventListener('change', () => {
      this.callback.onQuality(this.quality.value as QualitySetting);
    });
    this.subtitleSize.addEventListener('change', () => {
      this.callback.onSubtitleSize(this.subtitleSize.value as SubtitleSize);
    });
    this.subtitles.addEventListener('change', () => {
      this.callback.onSubtitles(this.subtitles.checked);
    });
    this.voices.addEventListener('change', () => {
      this.callback.onVoices(this.voices.checked);
    });
    this.cinema.addEventListener('change', () => {
      this.callback.onCinema(this.cinema.checked);
    });

    const close = root.querySelector('#btn-close-settings') as HTMLButtonElement;
    close.addEventListener('click', () => this.close());

    const download = root.querySelector('#btn-download-srt') as HTMLButtonElement;
    download.addEventListener('click', () => this.callback.onDownloadSrt());

    const menu = root.querySelector('#btn-panel-menu') as HTMLButtonElement;
    menu.addEventListener('click', () => {
      this.close();
      this.callback.onMenu();
    });
  }

  get isOpen(): boolean {
    return this.openState;
  }

  open(voiceStatus = ''): void {
    this.openState = true;
    this.root.hidden = false;
    this.voiceStatus.textContent = voiceStatus;
    const close = this.root.querySelector('#btn-close-settings') as HTMLButtonElement | null;
    close?.focus({ preventScroll: true });
  }

  close(): void {
    this.openState = false;
    this.root.hidden = true;
  }

  toggle(voiceStatus = ''): void {
    if (this.openState) this.close();
    else this.open(voiceStatus);
  }

  sync(settings: Settings, voiceStatus = ''): void {
    this.quality.value = settings.quality;
    this.subtitleSize.value = settings.subtitleSize;
    this.subtitles.checked = settings.subtitles;
    this.voices.checked = settings.voices;
    this.cinema.checked = settings.cinema;
    if (voiceStatus) this.voiceStatus.textContent = voiceStatus;
  }
}
