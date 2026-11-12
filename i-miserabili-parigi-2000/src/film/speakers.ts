const SPEAKER_KEYS: Record<string, string | null> = {
  Narratore: null,
  'Victor Hugo': null,
  Valjean: 'valjean',
  Madeleine: 'valjean',
  Myriel: 'myriel',
  Fantine: 'fantine',
  Cosette: 'cosette',
  Javert: 'javert',
  Marius: 'marius',
  Enjolras: 'enjolras',
  Thénardier: 'thenardier',
  'Madame Thénardier': 'madame',
  Guardia: 'guard',
  Gendarme: 'guard',
  Ostiere: 'innkeeper',
  Cittadino: 'citizen',
  Bambino: 'child',
  Caposquadra: 'foreman',
  Giudice: 'judge',
  Champmathieu: 'accused',
  Pubblico: 'crowd',
  Operaio: 'worker',
  Sorella: 'sister',
}

export function speakerToActorKey(speaker: string | undefined): string | null {
  if (!speaker) return null
  return SPEAKER_KEYS[speaker] ?? null
}
