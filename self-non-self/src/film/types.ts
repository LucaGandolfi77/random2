export type Lang = 'en' | 'it';

export interface Text {
  en: string;
  it: string;
}

export type CueKind = 'narration' | 'dialogue' | 'intertitle' | 'dedication';
export type Speaker = 'messenger' | 'resident' | 'none';

export interface Cue {
  id: string;
  start: number;
  end: number;
  kind: CueKind;
  speaker: Speaker;
  text: Text;
}

export interface ClinicalOverlay {
  id: string;
  start: number;
  end: number;
  label: string;
  value: string;
}

export interface Shot {
  id: string;
  start: number;
  end: number;
}

export interface Chapter {
  id: string;
  index: number;
  roman: string;
  start: number;
  end: number;
  title: Text;
  accent: string;
  shots: Shot[];
}
