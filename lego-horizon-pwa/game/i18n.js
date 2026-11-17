/* Minimal EN/IT UI dictionary for Machine Hunt. Game data stays in English. */
const IT = {
  "World map": "Mappa del mondo",
  "Season": "Stagione",
  "Hunter level": "Livello cacciatore",
  "Skill tree": "Albero abilità",
  "Crafting bench": "Banco di fabbricazione",
  "Companions": "Compagni",
  "Villager jobs": "Lavori del villaggio",
  "Upgrades": "Migliorie",
  "Quest log": "Diario missioni",
  "Achievements": "Obiettivi",
  "Your record": "I tuoi record",
  "Community board": "Bacheca comunitaria",
  "Controls": "Controlli",
  "Colour palette": "Tavolozza",
  "Settings": "Impostazioni",
  "How to play": "Come si gioca",
  "Reset progress": "Azzera progressi",
  "Campaign": "Campagna",
  "Daily": "Giornaliera",
  "Endless": "Senza fine",
  "Boss Rush": "Boss Rush",
  "Start hunt": "Inizia caccia",
  "Play": "Gioca",
  "Equipped": "Equipaggiato",
  "Craft": "Crea",
  "Owned": "Posseduto",
  "Maxed": "Massimo",
  "Upgrade": "Migliora",
  "Change": "Cambia",
  "Share score": "Condividi punteggio",
  "Challenge code": "Codice sfida",
  "Export save": "Esporta salvataggio",
  "Import save": "Importa salvataggio",
  "Language": "Lingua",
  "Notifications": "Notifiche",
  "Enable daily reminder": "Attiva promemoria giornaliero",
  "prestige": "prestigio",
};

export function t(key, lang = "en") {
  if (lang === "it") return IT[key] || key;
  return key;
}

export function translateAll(root, lang) {
  if (lang !== "it") return;
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (IT[key]) el.textContent = IT[key];
  });
}
