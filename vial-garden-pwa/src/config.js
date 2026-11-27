export const CAPACITY = 4;
export const LEVELS_PER_GARDEN = 10;
export const STORAGE_KEY = "vial-garden-progress-v1";

export const COLORS = [
  { hex: "#f4a7b5", name: "Rosa", symbol: "●", plant: "Rosa" },
  { hex: "#a8e6cf", name: "Menta", symbol: "▲", plant: "Menta" },
  { hex: "#a9c9f5", name: "Azzurro", symbol: "◆", plant: "Rugiada" },
  { hex: "#f7e3a1", name: "Ambra", symbol: "■", plant: "Girasole" },
  { hex: "#d5b9ec", name: "Iris", symbol: "✚", plant: "Iris" },
  { hex: "#f3c3a5", name: "Pesca", symbol: "◉", plant: "Pesco" },
  { hex: "#c7e8a9", name: "Lime", symbol: "⬟", plant: "Felce" },
  { hex: "#f2c6d8", name: "Magnolia", symbol: "✦", plant: "Magnolia" }
];

export const GARDENS = [
  { id: "rose", name: "Roseto", subtitle: "I primi petali", colors: 4, tubes: 6, accent: "#f4a7b5" },
  { id: "mint", name: "Serra Menta", subtitle: "Foglie e rugiada", colors: 4, tubes: 7, accent: "#a8e6cf" },
  { id: "azure", name: "Orto Azzurro", subtitle: "Acqua limpida", colors: 5, tubes: 7, accent: "#a9c9f5" },
  { id: "amber", name: "Aranceto", subtitle: "Il miele del mattino", colors: 5, tubes: 8, accent: "#f7e3a1" },
  { id: "iris", name: "Giardino Iris", subtitle: "Colori sospesi", colors: 5, tubes: 8, accent: "#d5b9ec" },
  { id: "pollen", name: "Stanza del Polline", subtitle: "Il prato si muove", colors: 6, tubes: 9, accent: "#f3c3a5" },
  { id: "night", name: "Orto Notturno", subtitle: "Profumi al buio", colors: 6, tubes: 9, accent: "#c7e8a9" },
  { id: "moon", name: "Giardino Lunare", subtitle: "Petali d'argento", colors: 7, tubes: 10, accent: "#a9c9f5" },
  { id: "aurora", name: "Serra Aurora", subtitle: "Luce in movimento", colors: 7, tubes: 10, accent: "#f2c6d8" },
  { id: "elixir", name: "Elisir", subtitle: "L'ultima distillazione", colors: 8, tubes: 11, accent: "#d5b9ec" }
];
