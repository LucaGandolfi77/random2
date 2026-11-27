export const LEVELS_PER_FACTORY = 10;
export const STORAGE_KEY = "arrow-foundry-progress-v1";

export const DIRECTIONS = [
  { dx: 0, dy: -1, symbol: "↑", name: "Su", color: "#a8e6cf" },
  { dx: 1, dy: 0, symbol: "→", name: "Destra", color: "#a9c9f5" },
  { dx: 0, dy: 1, symbol: "↓", name: "Giù", color: "#f4a7b5" },
  { dx: -1, dy: 0, symbol: "←", name: "Sinistra", color: "#f7e3a1" }
];

export const FACTORIES = [
  { id: "base", name: "Officina Base", subtitle: "I primi ingranaggi", size: 5, arrows: 12, walls: 0, heavy: 0, doors: 0, accent: "#a8e6cf" },
  { id: "engineering", name: "Sala Ingegneri", subtitle: "Ordine e precisione", size: 5, arrows: 16, walls: 2, heavy: 0, doors: 0, accent: "#a9c9f5" },
  { id: "assembly", name: "Linea di Montaggio", subtitle: "Il flusso continua", size: 6, arrows: 20, walls: 4, heavy: 1, doors: 0, accent: "#f7e3a1" },
  { id: "forge", name: "Fucina", subtitle: "Acciaio e dipendenze", size: 6, arrows: 24, walls: 6, heavy: 2, doors: 0, accent: "#f4a7b5" },
  { id: "pneumatic", name: "Porte Pneumatiche", subtitle: "Apri la strada", size: 6, arrows: 24, walls: 4, heavy: 1, doors: 2, accent: "#d5b9ec" },
  { id: "tower", name: "Torre Ingranaggi", subtitle: "Catene verticali", size: 7, arrows: 30, walls: 8, heavy: 3, doors: 1, accent: "#a9c9f5" },
  { id: "night", name: "Reparto Notte", subtitle: "Il buio nasconde i passaggi", size: 7, arrows: 34, walls: 6, heavy: 2, doors: 4, accent: "#d5b9ec" },
  { id: "core", name: "Nucleo", subtitle: "Tutto è collegato", size: 7, arrows: 38, walls: 10, heavy: 4, doors: 2, accent: "#f4a7b5" },
  { id: "chaos", name: "Caos Ordinato", subtitle: "Nessuna scorciatoia", size: 8, arrows: 44, walls: 12, heavy: 5, doors: 4, accent: "#f3c3a5" },
  { id: "final", name: "Ultima Fabbrica", subtitle: "L'ultimo ingranaggio", size: 8, arrows: 48, walls: 14, heavy: 6, doors: 6, accent: "#a8e6cf" }
];
