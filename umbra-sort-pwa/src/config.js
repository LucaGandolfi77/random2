export const COLORS = [
  { hex: "#ff5d73", name: "Coral", symbol: "●" },
  { hex: "#53d6b5", name: "Mint", symbol: "▲" },
  { hex: "#58a6ff", name: "Azure", symbol: "◆" },
  { hex: "#ffd166", name: "Amber", symbol: "■" },
  { hex: "#b58cff", name: "Violet", symbol: "✚" },
  { hex: "#ff8c42", name: "Ember", symbol: "◉" }
];

export const AREAS = [
  { id: "conveyor", name: "Conveyor", subtitle: "Impara il flusso", colors: 3, accent: "#53d6b5" },
  { id: "liftworks", name: "Liftworks", subtitle: "Le piattaforme si muovono", colors: 4, accent: "#58a6ff" },
  { id: "night-shift", name: "Night Shift", subtitle: "Il buio nasconde la griglia", colors: 4, accent: "#b58cff" },
  { id: "foundry", name: "Foundry", subtitle: "La macchina produce", colors: 5, accent: "#ff8c42" },
  { id: "prism-core", name: "Prism Core", subtitle: "Ridai colore all'incolore", colors: 5, accent: "#ff5d73" }
];

export const LEVELS_PER_AREA = 20;
export const STORAGE_KEY = "umbra-sort-progress-v1";
