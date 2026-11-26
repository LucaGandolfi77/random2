export const COLORS = [
  { hex: "#f4a7b5", name: "Coral", symbol: "●" },
  { hex: "#a8e6cf", name: "Mint", symbol: "▲" },
  { hex: "#a9c9f5", name: "Azure", symbol: "◆" },
  { hex: "#f7e3a1", name: "Amber", symbol: "■" },
  { hex: "#d5b9ec", name: "Violet", symbol: "✚" },
  { hex: "#f3c3a5", name: "Ember", symbol: "◉" }
];

export const AREAS = [
  { id: "conveyor", name: "Conveyor", subtitle: "Impara il flusso", colors: 3, accent: "#a8e6cf" },
  { id: "liftworks", name: "Liftworks", subtitle: "Le piattaforme si muovono", colors: 4, accent: "#a9c9f5" },
  { id: "night-shift", name: "Night Shift", subtitle: "Il buio nasconde la griglia", colors: 4, accent: "#d5b9ec" },
  { id: "foundry", name: "Foundry", subtitle: "La macchina produce", colors: 5, accent: "#f3c3a5" },
  { id: "prism-core", name: "Prism Core", subtitle: "Ridai colore all'incolore", colors: 5, accent: "#f4a7b5" },
  { id: "mirrorworks", name: "Mirrorworks", subtitle: "Percorsi che si riflettono", colors: 5, accent: "#d5b9ec" },
  { id: "conveyor-storm", name: "Conveyor Storm", subtitle: "Il flusso non si ferma", colors: 5, accent: "#a9c9f5" },
  { id: "prism-foundry", name: "Prism Foundry", subtitle: "Colori sotto pressione", colors: 6, accent: "#f3c3a5" },
  { id: "eclipse-core", name: "Eclipse Core", subtitle: "Il buio prende il controllo", colors: 6, accent: "#a8e6cf" },
  { id: "singularity", name: "Singularity", subtitle: "Tutti i sistemi insieme", colors: 6, accent: "#f4a7b5" }
];

export const LEVELS_PER_AREA = 20;
export const CAMPAIGN_LEVELS = AREAS.length * LEVELS_PER_AREA;
export const STORAGE_KEY = "umbra-sort-progress-v2";

export const PIECES = [
  { id: "luma", name: "Luma", icon: "✦", color: "#f7e3a1", cost: 0, description: "Mostra il countdown dei blackout." },
  { id: "flux", name: "Flux", icon: "ϟ", color: "#a9c9f5", cost: 20, description: "+1 carica Pulse all'inizio del livello." },
  { id: "magnete", name: "Magnete", icon: "∩", color: "#f4a7b5", cost: 35, description: "+1 carica Spinta ogni tre livelli." },
  { id: "tessera", name: "Tessera", icon: "⬡", color: "#a8e6cf", cost: 50, description: "+10% ingranaggi ottenuti." },
  { id: "prisma", name: "Prisma", icon: "◈", color: "#d5b9ec", cost: 75, description: "+1 carica iniziale del prisma." }
];

export const ABILITIES = {
  pulse: { name: "Pulse", icon: "ϟ", color: "#a9c9f5", duration: 6 },
  push: { name: "Spinta", icon: "↔", color: "#f4a7b5" },
  scan: { name: "Scansione", icon: "⌕", color: "#d5b9ec", duration: 5 }
};
