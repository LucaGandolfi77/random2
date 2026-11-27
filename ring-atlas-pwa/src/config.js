export const LEVELS_PER_ATLAS = 10;
export const STORAGE_KEY = "ring-atlas-progress-v1";

export const RING_COLORS = [
  { hex: "#f4a7b5", name: "Coral" },
  { hex: "#a8e6cf", name: "Mint" },
  { hex: "#a9c9f5", name: "Azure" },
  { hex: "#f7e3a1", name: "Amber" },
  { hex: "#d5b9ec", name: "Violet" },
  { hex: "#f3c3a5", name: "Ember" }
];

export const ATLASES = [
  { id: "prima-orbita", name: "Prima Orbita", subtitle: "Il primo allineamento", rings: 3, segments: 6, links: 0, locks: 0, mirrors: 0, accent: "#a8e6cf" },
  { id: "specchi", name: "Specchi", subtitle: "Il cielo capovolto", rings: 4, segments: 6, links: 0, locks: 0, mirrors: 2, accent: "#a9c9f5" },
  { id: "gravita", name: "Gravità", subtitle: "Anelli collegati", rings: 4, segments: 8, links: 1, locks: 0, mirrors: 0, accent: "#f7e3a1" },
  { id: "cancelli", name: "Cancelli", subtitle: "Apri le dipendenze", rings: 5, segments: 8, links: 0, locks: 2, mirrors: 0, accent: "#d5b9ec" },
  { id: "eco", name: "Eco", subtitle: "Movimenti opposti", rings: 5, segments: 10, links: 2, locks: 0, mirrors: 2, accent: "#f4a7b5" },
  { id: "notte", name: "Notte", subtitle: "Il buio tra gli anelli", rings: 5, segments: 10, links: 1, locks: 2, mirrors: 2, accent: "#a9c9f5" },
  { id: "nucleo", name: "Nucleo", subtitle: "Tutto è collegato", rings: 6, segments: 8, links: 2, locks: 2, mirrors: 1, accent: "#f7e3a1" },
  { id: "caos", name: "Caos", subtitle: "Nessuna scorciatoia", rings: 6, segments: 10, links: 3, locks: 3, mirrors: 2, accent: "#f3c3a5" },
  { id: "aurora", name: "Aurora", subtitle: "Luce in movimento", rings: 6, segments: 10, links: 3, locks: 3, mirrors: 3, accent: "#d5b9ec" },
  { id: "atlante", name: "Atlante", subtitle: "L'ultima costellazione", rings: 6, segments: 10, links: 4, locks: 4, mirrors: 3, accent: "#a8e6cf" }
];
