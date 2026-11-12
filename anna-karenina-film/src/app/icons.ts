const PATHS: Record<string, string> = {
  play: '<path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M8 5v14M16 5v14" stroke-width="2.4"/>',
  back10: '<path d="M11 6 6 10l5 4"/><path d="M6 10h8.5a4.5 4.5 0 1 1 0 9H10"/><text x="9" y="17.5" font-size="6" fill="currentColor" stroke="none">10</text>',
  forward10: '<path d="m13 6 5 4-5 4"/><path d="M18 10h-8.5a4.5 4.5 0 1 0 0 9H14"/><text x="9" y="17.5" font-size="6" fill="currentColor" stroke="none">10</text>',
  volume: '<path d="M4 10v4h4l5 4V6l-5 4H4Z"/><path d="M16 9a4 4 0 0 1 0 6"/><path d="M19 6.5a8 8 0 0 1 0 11"/>',
  mute: '<path d="M4 10v4h4l5 4V6l-5 4H4Z"/><path d="m16 10 5 5M21 10l-5 5"/>',
  cc: '<rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="M11 10.2a2.2 2.2 0 1 0 0 3.6M17.5 10.2a2.2 2.2 0 1 0 0 3.6"/>',
  fullscreen: '<path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5"/>',
  exitFullscreen: '<path d="M4 9h5V4M20 9h-5V4M4 15h5v5M20 15h-5v5"/>',
  chapters: '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="7" cy="6" r="1.3" fill="currentColor"/><circle cx="7" cy="12" r="1.3" fill="currentColor"/><circle cx="7" cy="18" r="1.3" fill="currentColor"/>',
  restart: '<path d="M4 9a8 8 0 1 1 2 8"/><path d="M4 4v5h5"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8.2v.2"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  prev: '<path d="m14 6-6 6 6 6"/>',
  next: '<path d="m10 6 6 6-6 6"/>',
  install: '<path d="M12 4v11M8 11l4 4 4-4"/><path d="M5 19h14"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  sound: '<path d="M5 9v6h4l4 3V6L9 9H5Z"/><path d="M16 9.5a3.5 3.5 0 0 1 0 5"/>'
};

export function icon(name: keyof typeof PATHS | string, className = ''): string {
  const path = PATHS[name] ?? PATHS.info;
  return `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}
