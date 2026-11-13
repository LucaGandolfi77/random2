export const cx = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ');

export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => window.setTimeout(resolve, ms));

export const formatCode = (value: string): string =>
  value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);

export const readNickname = (): string => {
  try {
    return localStorage.getItem('briscola-nickname') || 'Ospite';
  } catch {
    return 'Ospite';
  }
};

export const saveNickname = (value: string): void => {
  try {
    localStorage.setItem('briscola-nickname', value.slice(0, 18));
  } catch {
    // The game remains playable without storage.
  }
};

export const shareText = (code: string): string => {
  const basePath = window.location.pathname.replace(/[^/]*$/, '');
  return `Ti sfido a Briscola! Codice stanza: ${code} — ${window.location.origin}${basePath}`;
};

export const friendlyOnlineError = (value: unknown, fallback = 'Errore di connessione al server.'): string => {
  const message = value instanceof Error ? value.message : '';
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return 'Impossibile raggiungere il server online. Controlla la configurazione Supabase e la connessione.';
  }
  return message || fallback;
};
