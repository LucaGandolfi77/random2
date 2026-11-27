export const LEVELS_PER_DISTRICT = 10;
export const STORAGE_KEY = "traffic-tessera-progress-v1";

export const VEHICLE_COLORS = [
  { hex: "#f4a7b5", name: "Coral", symbol: "●" },
  { hex: "#a8e6cf", name: "Menta", symbol: "▲" },
  { hex: "#a9c9f5", name: "Azzurro", symbol: "■" },
  { hex: "#f7e3a1", name: "Ambra", symbol: "◆" },
  { hex: "#d5b9ec", name: "Viola", symbol: "✚" },
  { hex: "#f3c3a5", name: "Arancio", symbol: "⬟" }
];

export const DISTRICTS = [
  { id: "primo-parcheggio", name: "Primo Parcheggio", subtitle: "Le prime uscite", size: 6, vehicles: 6, colors: 3, terminalCopies: 1, walls: 0, buses: 0, oneWays: 0, accent: "#a8e6cf" },
  { id: "terminali", name: "Terminali", subtitle: "Ogni colore ha una via", size: 6, vehicles: 6, colors: 4, terminalCopies: 1, walls: 1, buses: 1, oneWays: 0, accent: "#a9c9f5" },
  { id: "convogli", name: "Convogli", subtitle: "Spazio ai bus", size: 7, vehicles: 8, colors: 4, terminalCopies: 2, walls: 2, buses: 1, oneWays: 0, accent: "#f7e3a1" },
  { id: "sensi-unici", name: "Sensi Unici", subtitle: "Pianifica ogni corsia", size: 7, vehicles: 9, colors: 4, terminalCopies: 2, walls: 3, buses: 1, oneWays: 2, accent: "#f4a7b5" },
  { id: "elettrico", name: "Elettrico", subtitle: "La città si ricarica", size: 7, vehicles: 9, colors: 5, terminalCopies: 2, walls: 3, buses: 2, oneWays: 3, accent: "#d5b9ec" },
  { id: "notte", name: "Notte", subtitle: "Luci nella metropoli", size: 7, vehicles: 10, colors: 5, terminalCopies: 2, walls: 4, buses: 2, oneWays: 4, accent: "#a9c9f5" },
  { id: "nucleo", name: "Nucleo", subtitle: "Il cuore del traffico", size: 7, vehicles: 11, colors: 5, terminalCopies: 2, walls: 5, buses: 2, oneWays: 5, accent: "#f7e3a1" },
  { id: "caos", name: "Caos", subtitle: "Nessuna corsia libera", size: 8, vehicles: 12, colors: 5, terminalCopies: 2, walls: 6, buses: 3, oneWays: 6, accent: "#f3c3a5" },
  { id: "aurora", name: "Aurora", subtitle: "Luce in movimento", size: 8, vehicles: 12, colors: 6, terminalCopies: 2, walls: 6, buses: 3, oneWays: 7, accent: "#d5b9ec" },
  { id: "metropoli", name: "Metropoli", subtitle: "L'ultimo distretto", size: 8, vehicles: 13, colors: 6, terminalCopies: 2, walls: 7, buses: 3, oneWays: 8, accent: "#a8e6cf" }
];
