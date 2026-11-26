import type { SourceId } from "./sources";

export type Lang = "it" | "en";

export interface Localized {
  it: string;
  en: string;
}

export type Family = "persone" | "abitare" | "mobilita" | "servizi";

export type MetricKey =
  | "giovani"
  | "invecchiamento"
  | "occupazione"
  | "reddito"
  | "suolo"
  | "casa"
  | "turismo"
  | "abitato"
  | "aria"
  | "auto"
  | "incidenti"
  | "ev"
  | "scuola"
  | "digitale"
  | "comunita"
  | "pnrr";

export type Metrics = Record<MetricKey, number>;
export type AxisScores = Record<Family, number>;

export interface PopulationPoint {
  year: number;
  value: number;
  estimate: boolean;
}

export interface ComuneData {
  identity: {
    istat: string;
    name: string;
    province: string;
    region: string;
    codiceCatastale: string | null;
  };
  palette: {
    sky: string;
    ground: string;
    accent: string;
    roof: string;
    water: string;
  };
  tagline: Localized;
  population: {
    total: number;
    year: number;
    estimate: boolean;
    series: PopulationPoint[];
    births: number | null;
    deaths: number | null;
    naturalBalance: number | null;
    under15: { count: number | null; pct: number | null };
    over65: { count: number | null; pct: number | null };
    medianAge: number | null;
    oldAgeIndex: number | null;
    dependencyIndex: number | null;
  };
  economy: {
    employmentRate: number | null;
    unemploymentRate: number | null;
    activityRate: number | null;
    incomeMean: number | null;
    families: number | null;
    averageFamily: number | null;
  };
  housing: {
    omiMean: number | null;
    omiMin: number | null;
    omiMax: number | null;
    vacantDwellingsPct: number | null;
    tourismBeds: number | null;
    tourismStructures: number | null;
    tourismBedsPer100: number | null;
  };
  environment: {
    areaKm2: number | null;
    altitudeMean: number | null;
    soilConsumptionPct: number | null;
    soilConsumptionYear: number | null;
    recyclingPct: number | null;
    wasteKgPerPerson: number | null;
    landslidePopulationPct: number | null;
    seismicZone: string | null;
    pm10: number | null;
    pm25: number | null;
    no2: number | null;
    airYear: number | null;
  };
  mobility: {
    commutersOut: number | null;
    commutersIn: number | null;
    commutingBalance: number | null;
    selfContainmentPct: number | null;
    vehiclesPer1000: number | null;
    vehiclesTotal: number | null;
    evPoints: number | null;
    evPer1000: number | null;
    accidents: number | null;
    injuriesPer10k: number | null;
    deathsPer10k: number | null;
  };
  services: {
    schools: number | null;
    schoolsPer1000: number | null;
    schoolYear: string | null;
    ftthPct: number | null;
    thirdSector: number | null;
    thirdSectorPer1000: number | null;
    pnrrProjects: number | null;
    pnrrPerCapita: number | null;
    pharmacies: number | null;
    pharmaciesPer1000: number | null;
    incomeYear: number | null;
  };
  baseline: {
    annualGrowth: number;
    population2050: number | null;
  };
  sourceByMetric: Record<MetricKey, SourceId>;
  sources: SourceId[];
}

export interface SnapshotMeta {
  title: string;
  generatedAt: string;
  extractionDate: string;
  producer: string;
  endpoint: string;
  note: string;
  licenses: string;
}

export interface ComuniSnapshot {
  meta: SnapshotMeta;
  comuni: ComuneData[];
}

export interface Policy {
  id: string;
  family: Family;
  title: Localized;
  blurb: Localized;
  cost: number;
  effects: Partial<Metrics>;
  evidence: Localized;
  source: SourceId;
  tags: string[];
}

export interface EventChoice {
  label: Localized;
  detail: Localized;
  cost: number;
  gain: number;
  effects: Partial<Metrics>;
}

export interface EventCard {
  id: string;
  title: Localized;
  body: Localized;
  evidence: Localized;
  source: SourceId;
  choices: [EventChoice, EventChoice];
}

export interface RunChoice {
  turn: number;
  year: number;
  policyId: string | null;
  eventId: string;
  choiceIndex: number;
}

export interface RunSnapshot {
  year: number;
  metrics: Metrics;
  population: number;
  axes: AxisScores;
}

export interface RunState {
  version: 1;
  comuneId: string;
  seed: number;
  turn: number;
  year: number;
  status: "policy" | "event" | "finished";
  credits: number;
  creditsSpent: number;
  pendingPolicyId: string | null;
  population: number;
  baselinePopulation: number;
  metrics: Metrics;
  baselineMetrics: Metrics;
  hand: string[];
  playedPolicies: string[];
  eventDeck: string[];
  eventIndex: number;
  choices: RunChoice[];
  history: RunSnapshot[];
}

export interface Bilancio {
  comune: ComuneData;
  year: number;
  population: number;
  baselinePopulation: number;
  populationDelta: number;
  axes: Array<{
    key: Family;
    final: number;
    baseline: number;
    delta: number;
  }>;
  total: number;
  baselineTotal: number;
  totalDelta: number;
  verdict: Localized;
  best: Family;
  worst: Family;
  policies: Policy[];
  events: Array<{ event: EventCard; choiceIndex: number }>;
  creditsSpent: number;
  creditsLeft: number;
}
