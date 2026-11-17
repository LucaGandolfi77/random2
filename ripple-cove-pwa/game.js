/*
 * RIPPLE COVE — cozy fishing PWA
 *
 * Zero external assets: the whole scene is painted on a 2D canvas and every
 * sound is synthesised with WebAudio. State lives in localStorage.
 *
 * Layout, IDs and data-i18n keys mirror index.html.
 */
(function () {
  "use strict";

  /* ═══════════════════════════ utilities ═══════════════════════════ */
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const now = () => Date.now();
  const uid = () => Math.random().toString(36).slice(2, 9);
  const fmt = (n) => Math.round(n).toLocaleString("it-IT");

  function hex2rgb(h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(a, b, t) {
    const A = hex2rgb(a), B = hex2rgb(b);
    return `rgb(${Math.round(lerp(A[0], B[0], t))},${Math.round(lerp(A[1], B[1], t))},${Math.round(lerp(A[2], B[2], t))})`;
  }

  /* ═══════════════════════════ i18n ═══════════════════════════ */
  const I18N = {
    it: {
      loc_river: "Fiume", loc_lake: "Lago", loc_sea: "Mare", loc_ocean: "Oceano",
      tap_cast: "Tocca LANCIA per pescare", cast: "LANCIA", waiting: "ATTENDI…",
      room_hint: "Trascina gli oggetti · tocca un pesce montato per rimuoverlo",
      bucket: "Secchio", nav_shop: "Negozi", nav_fish: "Pesca", nav_cabin: "Casa",
      nav_fisho: "Ittica", nav_quests: "Missioni", nav_set: "Opzioni",
      b_hold: "TIENI PREMUTO per sollevare", b_release: "RILASCIA! Il filo è teso",
      b_ten: "Filo", new_record: "Nuovo record!", mount: "Monta", make_bait: "Esca",
      sell: "Vendi", keep: "Tieni", back_bucket: "In secchio", sell_item: "Vendi ½",
      close: "Chiudi", sell_all: "Vendi tutto", sell_all2: "Vendi tutto ×2",
      recipes: "Ricette esche", choose_bait: "Scegli esca", set_lang: "Lingua",
      set_sound: "Suoni", set_haptic: "Vibrazione", stats: "Statistiche",
      export: "Esporta", import: "Importa", reset: "Ricomincia",
      offline_title: "Mentre eri via…", collect: "Raccogli",
      hello_1: "Hai ereditato la vecchia cabina del nonno, su una baia tranquilla.",
      hello_2: "Pesca al fiume, al lago, al mare e infine in oceano. Vendi o monta i pesci, compra esche, canne e arredi.",
      hello_3: "La mira: riempire l'ittica e rendere la cabina il posto più accogliente del mondo.",
      start: "Inizia",
      bite: "Ha abboccato! Tieni premuto!", line_broken: "Il filo si è spezzato…",
      escaped: "Il pesce è fuggito…", got: "Hai preso", no_bait: "Non hai più esca! Comprane al negozio.",
      locked: "Raggiungi il livello", bought: "Acquistato", equipped: "Equipaggiato",
      placed: "Posizionato", sold: "Venduto per", coins: "monete",
      quest_done: "Missione completata!", no_recipes: "Nessuna ricetta disponibile per ora.",
      dex_title: "Specie scoperte", caught_n: "pesci catturati", cozy: "Accoglienza",
      bonuses: "Bonus", none: "—", room_full: "La stanza è piena! Rimuovi qualcosa.",
      no_fish: "Il secchio è vuoto", already_owned: "Già posseduto",
      bait_used: "Esca selezionata", removed: "Rimosso", level_up: "Livello",
      new_place: "Nuovo luogo sbloccato!", merchant_open: "Mercante sbloccato!",
      reset_ok: "Partita azzerata", imported: "Partita importata", export_fail: "Export non riuscito",
      spring: "Primavera", summer: "Estate", autumn: "Autunno", winter: "Inverno",
      sunny: "Sereno", cloudy: "Nuvoloso", rain: "Pioggia", storm: "Tempesta", snow: "Neve",
      stats_line: "Lanci {a} · Catture {b} · Vendite {c} · Record {d}",
      sell_2: "Vendita ×2", luck: "Fortuna", tension: "Filo +", coins_bonus: "Monete +5%",
      map_treasure: "Tesoro", distance: "Sconosciuto", weight: "g",
      tap_hint_cast: "Tocca per lanciare", cast_again: "Lancia di nuovo",
      fish_of: "di", shop: "Negozi", buy: "Compra", equip: "Equipaggia",
      use: "Usa", selected: "Selezionato", sell_for: "Vendi", craft: "Crea",
      per_unit: "cad.", each: "×1", full: "Pieno", claim: "Raccogli",
      offline_line: "La cabina ha lavorato per te: +{n} monete.",
      table_rods: "Canne", table_boats: "Barche", table_bait: "Esca",
      table_cabin: "Cabina", table_extras: "Extra", table_merchant: "Mercante",
      cheapest: "Prezzo", owned: "Posseduto", lock_lvl: "Lv {n}",
      reset_confirm: "Cancellare tutti i progressi?", import_bad: "File non valido",
      new_fish: "Nuova specie!", pressure: "Pressione", release_now: "Rilascia adesso"
    },
    en: {
      loc_river: "River", loc_lake: "Lake", loc_sea: "Sea", loc_ocean: "Ocean",
      tap_cast: "Tap CAST to fish", cast: "CAST", waiting: "WAIT…",
      room_hint: "Drag objects around · tap a mounted fish to remove it",
      bucket: "Bucket", nav_shop: "Shops", nav_fish: "Fish", nav_cabin: "Cabin",
      nav_fisho: "Fishopedia", nav_quests: "Quests", nav_set: "Settings",
      b_hold: "HOLD to reel in", b_release: "RELEASE! Line is taut",
      b_ten: "Line", new_record: "New record!", mount: "Mount", make_bait: "Bait",
      sell: "Sell", keep: "Keep", back_bucket: "To bucket", sell_item: "Sell ½",
      close: "Close", sell_all: "Sell all", sell_all2: "Sell all ×2",
      recipes: "Bait recipes", choose_bait: "Choose bait", set_lang: "Language",
      set_sound: "Sound", set_haptic: "Vibration", stats: "Statistics",
      export: "Export", import: "Import", reset: "Reset",
      offline_title: "While you were away…", collect: "Collect",
      hello_1: "You inherited grandpa's old cabin on a quiet bay.",
      hello_2: "Fish the river, lake, sea and finally the ocean. Sell or mount fish, buy bait, rods and furniture.",
      hello_3: "Your goal: fill the fishopedia and make the cabin the cosiest place in the world.",
      start: "Start",
      bite: "A bite! Hold to reel!", line_broken: "The line snapped…",
      escaped: "The fish got away…", got: "You caught", no_bait: "Out of bait! Buy more at the shop.",
      locked: "Reach level", bought: "Bought", equipped: "Equipped", placed: "Placed",
      sold: "Sold for", coins: "coins", quest_done: "Quest complete!",
      no_recipes: "No recipes available yet.", dex_title: "Species discovered",
      caught_n: "fish caught", cozy: "Cosiness", bonuses: "Bonuses", none: "—",
      room_full: "The room is full! Remove something first.", no_fish: "The bucket is empty",
      already_owned: "Already owned", bait_used: "Bait selected", removed: "Removed",
      level_up: "Level", new_place: "New fishing spot unlocked!", merchant_open: "Merchant unlocked!",
      reset_ok: "Game reset", imported: "Game imported", export_fail: "Export failed",
      spring: "Spring", summer: "Summer", autumn: "Autumn", winter: "Winter",
      sunny: "Clear", cloudy: "Cloudy", rain: "Rain", storm: "Storm", snow: "Snow",
      stats_line: "Casts {a} · Catch {b} · Sales {c} · Records {d}",
      sell_2: "Sell ×2", luck: "Luck", tension: "Line +", coins_bonus: "Coins +5%",
      map_treasure: "Treasure", distance: "Unknown", weight: "g",
      tap_hint_cast: "Tap to cast", cast_again: "Cast again",
      fish_of: "of", shop: "Shops", buy: "Buy", equip: "Equip", use: "Use",
      selected: "Selected", sell_for: "Sell", craft: "Craft", per_unit: "ea.",
      each: "×1", full: "Full", claim: "Claim",
      offline_line: "The cabin worked while you were away: +{n} coins.",
      table_rods: "Rods", table_boats: "Boats", table_bait: "Bait", table_cabin: "Cabin",
      table_extras: "Extras", table_merchant: "Merchant", cheapest: "Price",
      owned: "Owned", lock_lvl: "Lv {n}",
      reset_confirm: "Erase all progress?", import_bad: "Invalid file",
      new_fish: "New species!", pressure: "Pressure", release_now: "Release now"
    }
  };
  function tr(k, vars) {
    let s = (I18N[S.lang] || I18N.it)[k] || k;
    if (vars) for (const p in vars) s = s.split("{" + p + "}").join(vars[p]);
    return s;
  }

  /* ═══════════════════════════ data ═══════════════════════════ */
  // em, it, en, loc, r (rarity 0..4), min/max grams, base coins, xp, flavor
  const FISH = [
    // river
    { id: "minnow",  em: "🐟", it: "Pesciolino",   en: "Minnow",        loc: "river", r: 0, w: [20, 80],    v: 4,   xp: 6,  it_f: "Un piccolo nuotatore timido.", en_f: "A shy little swimmer." },
    { id: "crucian", em: "🐠", it: "Carassio",      en: "Crucian",       loc: "river", r: 0, w: [80, 220],   v: 7,   xp: 8,  it_f: "Dorato come il sole del mattino.", en_f: "Golden as the morning sun." },
    { id: "trout",   em: "🐟", it: "Trota",         en: "Trout",         loc: "river", r: 1, w: [200, 900],  v: 18,  xp: 14, it_f: "Ama le acque fredde e correnti.", en_f: "Loves cold, running water." },
    { id: "barbel",  em: "🐟", it: "Barbo",         en: "Barbel",        loc: "river", r: 1, w: [300, 1400], v: 22,  xp: 16, it_f: "Ha la barba, ma non racconta storie.", en_f: "Has a beard, but tells no tales." },
    { id: "pike",    em: "🐟", it: "Luccio",        en: "Pike",          loc: "river", r: 2, w: [900, 3500], v: 55,  xp: 26, it_f: "Un predatore paziente tra i canneti.", en_f: "A patient hunter among the reeds." },
    { id: "tench",   em: "🐠", it: "Tinca",         en: "Tench",         loc: "river", r: 2, w: [500, 2200], v: 48,  xp: 24, it_f: "Scivola via come un'ombra verde.", en_f: "Slips away like a green shadow." },
    { id: "salmon",  em: "🐟", it: "Salmone",       en: "Salmon",        loc: "river", r: 3, w: [2200, 7000], v: 140, xp: 42, it_f: "Risale il fiume verso casa.", en_f: "Swims upstream toward home." },
    { id: "sturgeon",em: "🦈", it: "Storione",      en: "Sturgeon",      loc: "river", r: 4, w: [6000, 20000],v: 420, xp: 80, it_f: "Un antico abitante del fiume.", en_f: "An ancient resident of the river." },
    // lake
    { id: "bleak",   em: "🐟", it: "Alborella",     en: "Bleak",         loc: "lake", r: 0, w: [15, 60],    v: 5,   xp: 6,  it_f: "Luccica tra i riflessi del lago.", en_f: "Glitters among the lake reflections." },
    { id: "perch",   em: "🐠", it: "Persico",       en: "Perch",         loc: "lake", r: 0, w: [60, 300],   v: 8,   xp: 9,  it_f: "A righe, come una piccola tigre.", en_f: "Striped like a tiny tiger." },
    { id: "carp",    em: "🐟", it: "Carpa",         en: "Carp",          loc: "lake", r: 1, w: [400, 2500], v: 24,  xp: 16, it_f: "Saggia e lenta, vive a lungo.", en_f: "Wise and slow, it lives a long life." },
    { id: "whitefish",em:"🐟", it: "Coregone",      en: "Whitefish",     loc: "lake", r: 1, w: [300, 1500], v: 26,  xp: 17, it_f: "Sale dalle profondità azzurre.", en_f: "Rises from the blue depths." },
    { id: "catfish", em: "🐟", it: "Siluro",        en: "Catfish",       loc: "lake", r: 2, w: [1500, 7000],v: 70,  xp: 30, it_f: "I baffi lunghi due come il lago.", en_f: "Whiskers as long as the lake is wide." },
    { id: "lakepike",em: "🐟", it: "Luccio di lago",en: "Lake pike",     loc: "lake", r: 2, w: [1000, 4500],v: 65,  xp: 28, it_f: "L'ombra più veloce del lago.", en_f: "The fastest shadow in the lake." },
    { id: "rainbow", em: "🌈", it: "Trota iridea",  en: "Rainbow trout", loc: "lake", r: 3, w: [800, 4000], v: 165, xp: 46, it_f: "Porta con sé tutti i colori.", en_f: "Carries every colour with it." },
    { id: "lakeking",em: "🦈", it: "Re del lago",   en: "Lake king",     loc: "lake", r: 4, w: [8000, 26000],v: 480, xp: 90, it_f: "Vecchio quanto la cabina.", en_f: "As old as the cabin itself." },
    // sea
    { id: "sardine", em: "🐟", it: "Sardina",       en: "Sardine",       loc: "sea", r: 0, w: [20, 90],    v: 6,   xp: 7,  it_f: "Viaggia in compagnia, sempre.", en_f: "Never travels alone." },
    { id: "anchovy", em: "🐟", it: "Alici",         en: "Anchovy",       loc: "sea", r: 0, w: [15, 70],    v: 6,   xp: 7,  it_f: "Piccola, ma dal sapore intenso.", en_f: "Small, but full of flavour." },
    { id: "mullet",  em: "🐠", it: "Muggine",       en: "Mullet",        loc: "sea", r: 1, w: [200, 1200], v: 20,  xp: 15, it_f: "Salta fuori dall'acqua al tramonto.", en_f: "Leaps from the water at sunset." },
    { id: "bream",   em: "🐟", it: "Orata",         en: "Bream",         loc: "sea", r: 1, w: [300, 1800], v: 30,  xp: 19, it_f: "Il suo dorato ricorda il sole.", en_f: "Its gold reminds you of the sun." },
    { id: "bass",    em: "🐟", it: "Branzino",      en: "Sea bass",      loc: "sea", r: 2, w: [800, 4200], v: 75,  xp: 31, it_f: "Predatore elegante e silenzioso.", en_f: "An elegant, silent predator." },
    { id: "mackerel",em: "🐟", it: "Sgombro",       en: "Mackerel",      loc: "sea", r: 2, w: [400, 2000], v: 60,  xp: 28, it_f: "Veloce come il vento salino.", en_f: "Fast as the salty wind." },
    { id: "tuna",    em: "🐟", it: "Tonno",         en: "Tuna",          loc: "sea", r: 3, w: [4000, 25000],v: 220, xp: 55, it_f: "Un motore che non si ferma mai.", en_f: "An engine that never stops." },
    { id: "sword",   em: "🦈", it: "Pescespada",    en: "Swordfish",     loc: "sea", r: 4, w: [12000, 45000],v: 560, xp: 95, it_f: "La lama taglia l' acqua in due.", en_f: "A blade cutting the sea in two." },
    // ocean
    { id: "shrimp",  em: "🦐", it: "Gambero",       en: "Shrimp",        loc: "ocean", r: 0, w: [10, 80],    v: 9,   xp: 8,  it_f: "Tiny, rosso come il corallo.", en_f: "Red as the coral." },
    { id: "crab",    em: "🦀", it: "Granchio",      en: "Crab",          loc: "ocean", r: 0, w: [60, 500],   v: 12,  xp: 10, it_f: "Cammina di traverso, per dispetto.", en_f: "Walks sideways, just because." },
    { id: "squid",   em: "🦑", it: "Calamaro",      en: "Squid",         loc: "ocean", r: 1, w: [200, 2000], v: 32,  xp: 20, it_f: "Disegna ombre sul fondo.", en_f: "Draws shadows on the seabed." },
    { id: "octopus", em: "🐙", it: "Polpo",         en: "Octopus",       loc: "ocean", r: 1, w: [400, 3500], v: 45,  xp: 24, it_f: "Otto braccia, mille trucchi.", en_f: "Eight arms, a thousand tricks." },
    { id: "dolphin", em: "🐬", it: "Delfino",       en: "Dolphin",       loc: "ocean", r: 2, w: [3000, 12000],v: 130, xp: 40, it_f: "Sorride anche quando non deve.", en_f: "Smiles even when it needn't." },
    { id: "ray",     em: "🐟", it: "Razza",         en: "Ray",           loc: "ocean", r: 2, w: [1500, 9000], v: 110, xp: 38, it_f: "Volò via come un mantello scuro.", en_f: "Flies off like a dark cloak." },
    { id: "shark",   em: "🦈", it: "Squalo",        en: "Shark",         loc: "ocean", r: 3, w: [9000, 40000],v: 340, xp: 70, it_f: "L'ombra più temuta del mare.", en_f: "The most feared shadow of the sea." },
    { id: "whale",   em: "🐋", it: "Balena",        en: "Whale",         loc: "ocean", r: 4, w: [30000, 90000],v: 900, xp: 120,it_f: "Canta una canzone antica.", en_f: "Sings a very old song." }
  ];
  const F = Object.fromEntries(FISH.map((f) => [f.id, f]));

  const LOCATIONS = {
    river: { em: "🏞️", lvl: 1, sky: ["#8fd0e8", "#dff1f0"], water: ["#4f9fb5", "#1c5266"], hill: "#3c7266", speed: 1, tide: 1 },
    lake:  { em: "🪷", lvl: 3, sky: ["#a6cbe8", "#f3e5c8"], water: ["#3f93a6", "#15475c"], hill: "#4a6b5c", speed: 1.06, tide: 0.8 },
    sea:   { em: "🌊", lvl: 6, sky: ["#7fbfe6", "#e6eef2"], water: ["#247d9c", "#0b354b"], hill: "#2a5564", speed: 1.16, tide: 1.25 },
    ocean: { em: "🐋", lvl: 10, sky: ["#6aa9d6", "#cfe2f0"], water: ["#155f80", "#062b40"], hill: "#1e3f55", speed: 1.3, tide: 1.55 }
  };

  const CAT = {
    rods: {
      bamboo: { em: "🎋", it: "Canna di bambù", en: "Bamboo rod", d_it: "Leggera e affidabile.", d_en: "Light and reliable.", cost: 0, lvl: 1, power: 1 },
      telescopic: { em: "🎣", it: "Canna telescopica", en: "Telescopic rod", d_it: "Un po' più sensibile.", d_en: "A bit more sensitive.", cost: 150, lvl: 2, power: 2 },
      carbon: { em: "🪝", it: "Canna in carbonio", en: "Carbon rod", d_it: "Filo più resistente.", d_en: "Stronger line.", cost: 600, lvl: 5, power: 3 },
      pro: { em: "🎣", it: "Canna pro", en: "Pro rod", d_it: "Per pescatori esigenti.", d_en: "For demanding anglers.", cost: 1800, lvl: 9, power: 4 },
      legend: { em: "🏆", it: "Canna leggendaria", en: "Legendary rod", d_it: "Non si rompe quasi mai.", d_en: "Almost unbreakable.", cost: 5000, lvl: 14, power: 5 }
    },
    boats: {
      none: { em: "🛶", it: "Nessuna barca", en: "No boat", d_it: "Peschi dalla riva.", d_en: "Fish from the shore.", cost: 0, lvl: 1, speed: 1 },
      rowboat: { em: "🛶", it: "Barca a remi", en: "Rowboat", d_it: "Raggiungi acque più calme.", d_en: "Reach calmer waters.", cost: 300, lvl: 4, speed: 1.12 },
      motor: { em: "🚤", it: "Barca a motore", en: "Motorboat", d_it: "Più veloce, più campo.", d_en: "Faster, wider range.", cost: 1200, lvl: 7, speed: 1.26 },
      sail: { em: "⛵", it: "Barca a vela", en: "Sailboat", d_it: "Silenziosa e veloce.", d_en: "Silent and swift.", cost: 3200, lvl: 12, speed: 1.42 }
    },
    baits: {
      worm: { em: "🪱", it: "Verme", en: "Worm", d_it: "L'esca di sempre.", d_en: "The classic bait.", cost: 5, lvl: 1, speed: 1, luck: 0 },
      corn: { em: "🌽", it: "Mais", en: "Corn", d_it: "Attira pesci curiosi.", d_en: "Attracts curious fish.", cost: 12, lvl: 2, speed: 1.08, luck: 0.2 },
      dough: { em: "🧪", it: "Pastura", en: "Dough bait", d_it: "Profumo irresistibile.", d_en: "Irresistible scent.", cost: 25, lvl: 4, speed: 1.14, luck: 0.55 },
      glow: { em: "💡", it: "Esca luminosa", en: "Glow bait", d_it: "Brilla sott'acqua.", d_en: "Glows underwater.", cost: 65, lvl: 7, speed: 1.24, luck: 1 },
      roe: { em: "🍥", it: "Caviale", en: "Roe", d_it: "Solo per intenditori.", d_en: "For connoisseurs only.", cost: 160, lvl: 11, speed: 1.36, luck: 1.6 }
    },
    furniture: {
      chair: { em: "🪑", it: "Sedia", en: "Chair", d_it: "Un posto dove sedersi.", d_en: "Somewhere to sit.", cost: 70, lvl: 1, cozy: 3 },
      lamp: { em: "💡", it: "Lampada", en: "Lamp", d_it: "Luce calda la sera.", d_en: "Warm evening light.", cost: 130, lvl: 2, cozy: 4 },
      books: { em: "📚", it: "Libreria", en: "Bookshelf", d_it: "Storie di altri mari.", d_en: "Stories of other seas.", cost: 260, lvl: 4, cozy: 6 },
      rug: { em: "🧶", it: "Tappeto", en: "Rug", d_it: "Morbido sotto i piedi.", d_en: "Soft underfoot.", cost: 190, lvl: 5, cozy: 5 },
      stove: { em: "🔥", it: "Stufa", en: "Stove", d_it: "Scaccia l'umidità.", d_en: "Keeps the damp away.", cost: 420, lvl: 7, cozy: 9 },
      aquarium: { em: "🐠", it: "Acquario", en: "Aquarium", d_it: "Un pezzo di mare in casa.", d_en: "A piece of the sea indoors.", cost: 750, lvl: 10, cozy: 13 },
      cat: { em: "🐈", it: "Gatto", en: "Cat", d_it: "Il vero padrone della cabina.", d_en: "The true owner of the cabin.", cost: 520, lvl: 8, cozy: 10 }
    },
    extras: {
      hat: { em: "🎩", it: "Cappello da pescatore", en: "Fishing hat", d_it: "+5% monete vendendo.", d_en: "+5% coins when selling.", cost: 120, lvl: 3 },
      gloves: { em: "🧤", it: "Guanti", en: "Gloves", d_it: "Il filo resiste di più.", d_en: "The line lasts longer.", cost: 180, lvl: 5 },
      binoculars: { em: "🔭", it: "Binocolo", en: "Binoculars", d_it: "Vedi la rarità del pesce.", d_en: "See the fish's rarity.", cost: 340, lvl: 6 },
      wetsuit: { em: "🤿", it: "Muta", en: "Wetsuit", d_it: "Addocchi più in oceano.", d_en: "Bites faster in the ocean.", cost: 850, lvl: 11 },
      clover: { em: "🍀", it: "Portafortuna", en: "Lucky charm", d_it: "+fortuna su ogni lancio.", d_en: "+luck on every cast.", cost: 1300, lvl: 13 }
    },
    merchant: {
      purse: { em: "👝", it: "Borsa di cuoio", en: "Leather purse", d_it: "Vendi tutto al doppio.", d_en: "Sell everything for double.", cost: 650, lvl: 8, perk: "sell2" },
      hook: { em: "🪝", it: "Amo dorato", en: "Golden hook", d_it: "Pesci più rari.", d_en: "Rarer fish.", cost: 950, lvl: 9, perk: "luck" },
      map: { em: "🗺️", it: "Mappa del tesoro", en: "Treasure map", d_it: "A volte trovi monete.", d_en: "Sometimes you find coins.", cost: 1600, lvl: 12, perk: "map" }
    }
  };

  const RECIPES = [
    { out: "dough", n: 2, need: { minnow: 3 }, lvl: 2 },
    { out: "glow", n: 2, need: { sardine: 2, anchovy: 1 }, lvl: 5 },
    { out: "roe", n: 3, need: { shrimp: 2, squid: 1 }, lvl: 9 }
  ];

  const QUESTS = [
    { id: "q1", em: "🎣", it: "Primi lanci", en: "First casts", d_it: "Cattura 5 pesci", d_en: "Catch 5 fish", stat: "fishCaught", n: 5, rw: 80 },
    { id: "q2", em: "⭐", it: "Pesc esperto", en: "Seasoned angler", d_it: "Raggiungi il livello 3", d_en: "Reach level 3", stat: "level", n: 3, rw: 60 },
    { id: "q3", em: "🪙", it: "Mercato", en: "Market day", d_it: "Vendi 10 pesci", d_en: "Sell 10 fish", stat: "fishSold", n: 10, rw: 160 },
    { id: "q4", em: "🐟", it: "Bella preda", en: "Fine catch", d_it: "Cattura un pesce raro (r2+)", d_en: "Catch a rare fish (r2+)", stat: "rare", n: 1, rw: 200 },
    { id: "q5", em: "📖", it: "Ittica", en: "Fishopedia", d_it: "Scopri 10 specie", d_en: "Discover 10 species", stat: "dex", n: 10, rw: 260 },
    { id: "q6", em: "🖼️", it: "Il museo", en: "The museum", d_it: "Monta 3 pesci in cabina", d_en: "Mount 3 fish in the cabin", stat: "mounted", n: 3, rw: 220 },
    { id: "q7", em: "🏞️", it: "Il fiume", en: "The river", d_it: "Cattura 8 pesci al fiume", d_en: "Catch 8 fish in the river", stat: "loc_river", n: 8, rw: 300 },
    { id: "q8", em: "🛍️", it: "Mercante", en: "The merchant", d_it: "Raggiungi il livello 8", d_en: "Reach level 8", stat: "level", n: 8, rw: 400 },
    { id: "q9", em: "🦈", it: "Leggenda", en: "Legend", d_it: "Cattura un pesce leggendario", d_en: "Catch a legendary fish", stat: "r4", n: 1, rw: 1000 },
    { id: "q10", em: "🛋️", it: "Arredatore", en: "Decorator", d_it: "Compra 5 arredi", d_en: "Buy 5 furnishings", stat: "furn", n: 5, rw: 500 }
  ];

  const SLOTS = [
    [0.16, 0.28], [0.38, 0.26], [0.62, 0.26], [0.84, 0.28],
    [0.16, 0.56], [0.38, 0.56], [0.62, 0.56], [0.84, 0.56],
    [0.27, 0.82], [0.73, 0.82], [0.5, 0.4], [0.5, 0.7]
  ];

  /* ═══════════════════════════ state ═══════════════════════════ */
  const SAVE = "ripple-cove-save-v1";
  function fresh() {
    return {
      v: 1, coins: 40, xp: 0, level: 1,
      fishCaught: 0, fishSold: 0, rare: 0, r4: 0, mounted: 0, furn: 0,
      loc: "river", baits: { worm: 3 },
      owned: { rods: ["bamboo"], boats: ["none"], baits: [], furniture: [], extras: [], merchant: [] },
      equip: { rod: "bamboo", boat: "none", bait: "worm" },
      bucket: [], dex: {}, records: {}, room: [], quests: {},
      locStat: { river: 0, lake: 0, sea: 0, ocean: 0 },
      time: 6 * 60, day: 1, season: 0, weather: "sunny", weatherT: 0,
      sound: true, haptic: true, lang: "it", seen: false, lastSeen: now(),
      stats: { casts: 0, escapes: 0, sales: 0 }
    };
  }
  let S = fresh();
  function load() {
    try {
      const raw = localStorage.getItem(SAVE);
      if (raw) {
        const o = JSON.parse(raw);
        if (o && o.v === 1) S = Object.assign(fresh(), o);
      }
    } catch (e) { /* corrupt save — start fresh */ }
  }
  function save() {
    S.lastSeen = now();
    try { localStorage.setItem(SAVE, JSON.stringify(S)); } catch (e) { /* quota */ }
  }

  /* ═══════════════════════════ derived ═══════════════════════════ */
  function xpNeed(l) { return 80 + l * 45; }
  function perk(p) { return S.owned.merchant.some((id) => CAT.merchant[id] && CAT.merchant[id].perk === p); }
  function hasExtra(id) { return S.owned.extras.includes(id); }
  function cozy() {
    let c = 0;
    for (const it of S.room) {
      if (it.kind === "fish") c += F[it.id].r + 1;
      else if (CAT.furniture[it.id]) c += CAT.furniture[it.id].cozy;
    }
    return c;
  }
  function bonusList() {
    const b = [];
    if (hasExtra("hat")) b.push(tr("coins_bonus"));
    if (hasExtra("gloves")) b.push(tr("tension"));
    if (hasExtra("clover") || perk("luck")) b.push(tr("luck"));
    if (perk("sell2")) b.push(tr("sell_2"));
    if (perk("map")) b.push(tr("map_treasure"));
    return b.length ? b.join(" · ") : tr("none");
  }
  function baitDef() { return CAT.baits[S.equip.bait] || CAT.baits.worm; }
  function rodDef() { return CAT.rods[S.equip.rod] || CAT.rods.bamboo; }
  function boatDef() { return CAT.boats[S.equip.boat] || CAT.boats.none; }

  function addXp(n) {
    S.xp += n;
    while (S.xp >= xpNeed(S.level)) {
      S.xp -= xpNeed(S.level);
      S.level++;
      toast(tr("level_up") + " " + S.level, "gold");
      sfx("level");
      const newly = Object.keys(LOCATIONS).find((k) => LOCATIONS[k].lvl === S.level);
      if (newly) toast(tr("new_place") + " " + tr("loc_" + newly));
      if (S.level === 8) toast(tr("merchant_open"), "gold");
    }
  }
  function addCoins(n) { S.coins = Math.max(0, Math.round(S.coins + n)); }

  /* ═══════════════════════════ audio + haptics ═══════════════════════════ */
  let AC = null;
  function sfx(type) {
    if (!S.sound) return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      if (AC.state === "suspended") AC.resume();
      const spec = {
        cast: [420, 220, 0.18, "sine"], bite: [220, 520, 0.16, "square"],
        catch: [523, 784, 0.28, "sine"], coin: [880, 1320, 0.12, "sine"],
        level: [392, 784, 0.36, "triangle"], bad: [300, 120, 0.3, "sawtooth"],
        tap: [600, 600, 0.05, "sine"]
      }[type] || [440, 440, 0.08, "sine"];
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = spec[3];
      o.frequency.setValueAtTime(spec[0], AC.currentTime);
      o.frequency.exponentialRampToValueAtTime(Math.max(1, spec[1]), AC.currentTime + spec[2]);
      g.gain.setValueAtTime(0.0001, AC.currentTime);
      g.gain.exponentialRampToValueAtTime(0.12, AC.currentTime + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + spec[2]);
      o.connect(g).connect(AC.destination);
      o.start(); o.stop(AC.currentTime + spec[2] + 0.02);
    } catch (e) { /* audio unsupported */ }
  }
  function buzz(ms) {
    if (!S.haptic || !navigator.vibrate) return;
    // Chromium logs a console error when vibrate is called without a user
    // gesture. Only fire it after the user has actually interacted.
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    try { navigator.vibrate(ms); } catch (e) {}
  }

  /* ═══════════════════════════ toast ═══════════════════════════ */
  function toast(msg, kind) {
    const box = $("toasts");
    if (!box) return;
    const el = document.createElement("div");
    el.className = "toast" + (kind ? " " + kind : "");
    el.textContent = msg;
    box.appendChild(el);
    setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity .3s"; setTimeout(() => el.remove(), 320); }, 2300);
  }

  /* ═══════════════════════════ i18n apply ═══════════════════════════ */
  function applyI18n() {
    document.documentElement.lang = S.lang;
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const k = el.getAttribute("data-i18n");
      if (I18N[S.lang][k]) el.textContent = I18N[S.lang][k];
    });
    $("set-lang").value = S.lang;
    renderAll();
  }

  /* ═══════════════════════════ UI: HUD / views / panels ═══════════════════════════ */
  function show(id, on) { const e = $(id); if (e) e.hidden = !on; }
  function setStatus(msg, hot) {
    const s = $("status");
    s.textContent = msg || "";
    s.classList.toggle("hot", !!hot);
  }
  function refreshHud() {
    $("coins").textContent = fmt(S.coins);
    $("lvl").textContent = "Lv " + S.level;
    const need = xpNeed(S.level);
    $("xpfill").style.width = clamp(S.xp / need * 100, 0, 100) + "%";
    $("bait-n").textContent = "×" + (S.baits[S.equip.bait] || 0);
    $("bucket-n").textContent = S.bucket.reduce((a, f) => a + f.n, 0);
    const h = Math.floor(S.time / 60) % 24, m = Math.floor(S.time % 60);
    $("clock").textContent = String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
    const night = h < 6 || h >= 20;
    $("wicon").textContent = ({ sunny: night ? "🌙" : "☀️", cloudy: "☁️", rain: "🌧️", storm: "⛈️", snow: "❄️" })[S.weather] || "☀️";
    $("sicon").textContent = ["🌸", "☀️", "🍂", "❄️"][S.season];
    $("cozy").textContent = cozy();
    $("bonus-txt").textContent = bonusList();
    document.querySelectorAll(".loc").forEach((b) => {
      const k = b.dataset.loc;
      b.classList.toggle("on", k === S.loc);
      b.classList.toggle("locked", LOCATIONS[k].lvl > S.level);
    });
    show("tab-merc", S.level >= 8);
    const castBtn = $("btn-cast");
    castBtn.disabled = phase !== "idle";
    $("cast-label").textContent = phase === "idle" ? tr("cast") : phase === "wait" ? tr("waiting") : tr("waiting");
    updateQuestProgress();
  }

  function setView(name) {
    show("view-fish", name === "fish");
    show("view-cabin", name === "cabin");
    document.querySelectorAll("#nav button[data-view]").forEach((b) => b.classList.toggle("on", b.dataset.view === name));
    if (name === "cabin") renderRoom();
    resize();
  }

  function openPanel(id) {
    document.querySelectorAll(".panel").forEach((p) => { if (p.id !== id) p.hidden = true; });
    const p = $(id);
    p.hidden = !p.hidden;
    if (!p.hidden) {
      if (id === "p-shop") renderShop();
      if (id === "p-bucket") renderBucket();
      if (id === "p-fisho") renderDex();
      if (id === "p-quests") renderQuests();
      if (id === "p-bait") renderBaitPanel();
      if (id === "p-settings") renderSettings();
    }
    document.querySelectorAll("#nav button[data-panel]").forEach((b) => b.classList.toggle("on", !p.hidden && "p-" + b.dataset.panel === id));
  }
  function closePanels() {
    document.querySelectorAll(".panel").forEach((p) => (p.hidden = true));
    document.querySelectorAll("#nav button[data-panel]").forEach((b) => b.classList.remove("on"));
  }

  /* ═══════════════════════════ shop ═══════════════════════════ */
  let shopTab = "rods";
  function shopKey(tab) { return tab === "bait" ? "baits" : tab === "cabin" ? "furniture" : tab; }
  function renderShop() {
    $("shop-tabs").querySelectorAll("button[data-tab]").forEach((b) => b.classList.toggle("on", b.dataset.tab === shopTab));
    const key = shopKey(shopTab);
    const defs = CAT[key];
    const body = $("shop-body");
    body.innerHTML = "";
    for (const id in defs) {
      const d = defs[id];
      const owned = S.owned[key].includes(id);
      const locked = S.level < d.lvl;
      const row = document.createElement("div");
      row.className = "item";
      row.innerHTML =
        '<div class="em">' + d.em + "</div>" +
        '<div class="grow"><b>' + (d[S.lang] || d.it) + "</b><small>" + (d["d_" + S.lang] || d.d_it) + "</small></div>";
      const act = document.createElement("button");
      act.className = "act";
      if (locked) {
        act.classList.add("buy");
        act.textContent = tr("lock_lvl", { n: d.lvl });
        act.disabled = true;
      } else if (key === "baits") {
        act.classList.add("buy");
        act.textContent = tr("buy") + " " + d.cost + " " + tr("coins");
        act.disabled = S.coins < d.cost;
        act.onclick = () => {
          if (S.coins < d.cost) return;
          addCoins(-d.cost);
          S.baits[id] = (S.baits[id] || 0) + 1;
          sfx("coin"); toast(d.em + " " + tr("bought") + " +1");
          save(); refreshHud(); renderShop();
        };
      } else if (key === "furniture") {
        act.classList.add("buy");
        act.textContent = tr("buy") + " " + d.cost + " " + tr("coins");
        act.disabled = S.coins < d.cost;
        act.onclick = () => {
          if (S.coins < d.cost) return;
          addCoins(-d.cost);
          S.owned.furniture.push(id); S.furn = (S.furn || 0) + 1;
          if (placeInRoom(id, "furn")) toast(tr("placed") + " " + (d[S.lang] || d.it));
          else { S.owned.furniture.pop(); S.furn--; addCoins(d.cost); toast(tr("room_full"), "bad"); }
          sfx("coin"); save(); refreshHud(); renderShop();
        };
      } else if (key === "merchant") {
        if (owned) { act.textContent = "✓"; act.disabled = true; }
        else {
          act.classList.add("buy");
          act.textContent = tr("buy") + " " + d.cost + " " + tr("coins");
          act.disabled = S.coins < d.cost;
          act.onclick = () => {
            if (S.coins < d.cost) return;
            addCoins(-d.cost); S.owned.merchant.push(id);
            sfx("coin"); toast(tr("bought") + " " + (d[S.lang] || d.it), "gold");
            save(); refreshHud(); renderShop();
          };
        }
      } else {
        // rods, boats, extras — buy once, then equip/activate
        if (owned) {
          const isEquipped = S.equip[key === "rods" ? "rod" : key === "boats" ? "boat" : "bait"] === id;
          if (key === "extras") { act.textContent = "✓"; act.disabled = true; }
          else {
            act.textContent = isEquipped ? tr("selected") : tr("equip");
            act.classList.add(isEquipped ? "sel" : "use");
            act.disabled = isEquipped;
            act.onclick = () => {
              S.equip[key === "rods" ? "rod" : "boat"] = id;
              sfx("tap"); toast(tr("equipped") + " " + (d[S.lang] || d.it));
              save(); refreshHud(); renderShop();
            };
          }
        } else {
          act.classList.add("buy");
          act.textContent = tr("buy") + " " + d.cost + " " + tr("coins");
          act.disabled = S.coins < d.cost;
          act.onclick = () => {
            if (S.coins < d.cost) return;
            addCoins(-d.cost); S.owned[key].push(id);
            if (key === "rods") S.equip.rod = id;
            if (key === "boats") S.equip.boat = id;
            sfx("coin"); toast(tr("bought") + " " + (d[S.lang] || d.it));
            save(); refreshHud(); renderShop();
          };
        }
      }
      row.appendChild(act);
      body.appendChild(row);
    }
  }

  /* ═══════════════════════════ bucket / recipes ═══════════════════════════ */
  function bucketValue(f) { return Math.round(F[f.id].v * (0.6 + f.w / F[f.id].w[1] * 0.8)) * (perk("sell2") ? 2 : 1); }
  function sellFish(f) {
    const v = bucketValue(f);
    addCoins(v); S.fishSold++; S.stats.sales++;
    if (hasExtra("hat")) addCoins(Math.round(v * 0.05));
    sfx("coin");
    return v;
  }
  function renderBucket() {
    const list = $("bucket-list");
    list.innerHTML = "";
    if (!S.bucket.length) {
      const e = document.createElement("div"); e.className = "mini"; e.textContent = tr("no_fish");
      list.appendChild(e);
    }
    S.bucket.forEach((f, i) => {
      const d = F[f.id];
      const row = document.createElement("div");
      row.className = "item";
      row.innerHTML =
        '<div class="em">' + d.em + "</div>" +
        '<div class="grow"><b>' + (d[S.lang] || d.it) + " ×" + f.n + "</b><small>" + Math.round(f.w) + " " + tr("weight") + " · " + bucketValue(f) + " 🪙</small></div>";
      const b = document.createElement("button");
      b.className = "act buy"; b.textContent = "🪙 " + bucketValue(f) * f.n;
      b.onclick = () => {
        const v = sellFish(f) * f.n;
        S.bucket.splice(i, 1);
        toast(tr("sold") + " " + v + " " + tr("coins"), "gold");
        save(); refreshHud(); renderBucket();
      };
      row.appendChild(b);
      list.appendChild(row);
    });
    show("bk-sellall2", perk("sell2"));
    const list2 = $("recipes");
    list2.innerHTML = "";
    let any = false;
    for (const rc of RECIPES) {
      if (S.level < rc.lvl) continue;
      any = true;
      const have = Object.keys(rc.need).every((k) => S.bucket.some((f) => f.id === k && f.n >= rc.need[k]));
      const row = document.createElement("div");
      row.className = "item";
      row.innerHTML =
        '<div class="em">' + CAT.baits[rc.out].em + "</div>" +
        '<div class="grow"><b>' + CAT.baits[rc.out][S.lang] + " ×" + rc.n + "</b><small>" +
        Object.keys(rc.need).map((k) => F[k][S.lang] + " ×" + rc.need[k]).join(" + ") + "</small></div>";
      const b = document.createElement("button");
      b.className = "act use"; b.textContent = tr("craft");
      b.disabled = !have;
      b.onclick = () => {
        for (const k in rc.need) removeFromBucket(k, rc.need[k]);
        S.baits[rc.out] = (S.baits[rc.out] || 0) + rc.n;
        sfx("tap"); toast(CAT.baits[rc.out][S.lang] + " ×" + rc.n);
        save(); refreshHud(); renderBucket();
      };
      row.appendChild(b);
      list2.appendChild(row);
    }
    if (!any) {
      const e = document.createElement("div"); e.className = "mini"; e.textContent = tr("no_recipes");
      list2.appendChild(e);
    }
  }
  function removeFromBucket(id, n) {
    const i = S.bucket.findIndex((f) => f.id === id);
    if (i < 0) return;
    S.bucket[i].n -= n;
    if (S.bucket[i].n <= 0) S.bucket.splice(i, 1);
  }
  function addToBucket(id, w) {
    const f = S.bucket.find((x) => x.id === id);
    if (f) { f.w = Math.max(f.w, w); f.n++; }
    else S.bucket.push({ id, w, n: 1 });
  }

  /* ═══════════════════════════ bait panel ═══════════════════════════ */
  function renderBaitPanel() {
    const list = $("bait-list");
    list.innerHTML = "";
    for (const id in CAT.baits) {
      const d = CAT.baits[id];
      if (!S.baits[id] && id !== S.equip.bait) continue;
      const row = document.createElement("div");
      row.className = "item";
      row.innerHTML =
        '<div class="em">' + d.em + "</div>" +
        '<div class="grow"><b>' + d[S.lang] + " ×" + (S.baits[id] || 0) + "</b><small>" + d["d_" + S.lang] + "</small></div>";
      const b = document.createElement("button");
      b.className = "act use"; b.textContent = S.equip.bait === id ? tr("selected") : tr("use");
      b.disabled = S.equip.bait === id || !(S.baits[id] > 0);
      b.onclick = () => {
        S.equip.bait = id; sfx("tap"); toast(tr("bait_used") + " " + d[S.lang]);
        save(); refreshHud(); renderBaitPanel();
      };
      row.appendChild(b);
      list.appendChild(row);
    }
  }

  /* ═══════════════════════════ fishopedia ═══════════════════════════ */
  function renderDex() {
    const found = Object.keys(S.dex).length;
    $("fisho-progress").textContent = tr("dex_title") + ": " + found + " / " + FISH.length + " · " + S.fishCaught + " " + tr("caught_n");
    const box = $("fisho-list");
    box.innerHTML = "";
    FISH.forEach((f) => {
      const c = document.createElement("div");
      const got = S.dex[f.id];
      c.className = "fcard" + (got ? "" : " no") + (f.r >= 3 ? " r" + f.r : "");
      const rec = S.records[f.id] ? Math.round(S.records[f.id]) + " " + tr("weight") : tr("distance");
      c.innerHTML =
        '<div class="em">' + (got ? f.em : "❔") + "</div>" +
        "<b>" + (got ? (f[S.lang] || f.it) : "???") + "</b>" +
        '<small>' + (got ? tr("loc_" + f.loc) + " · " + rec : "—") + "</small>" +
        '<div class="r r' + f.r + '">' + "★".repeat(f.r + 1) + "</div>";
      box.appendChild(c);
    });
  }

  /* ═══════════════════════════ quests ═══════════════════════════ */
  function questVal(q) {
    if (q.stat === "level") return S.level;
    if (q.stat === "dex") return Object.keys(S.dex).length;
    if (q.stat === "mounted") return S.room.filter((r) => r.kind === "fish").length;
    if (q.stat === "furn") return S.furn || 0;
    if (q.stat.startsWith("loc_")) return S.locStat[q.stat.slice(4)] || 0;
    return S[q.stat] || 0;
  }
  function updateQuestProgress() {
    QUESTS.forEach((q) => {
      const val = Math.min(questVal(q), q.n);
      const st = S.quests[q.id] || (S.quests[q.id] = { p: val, claimed: false });
      st.p = val;
    });
  }
  function renderQuests() {
    updateQuestProgress();
    const list = $("quest-list");
    list.innerHTML = "";
    QUESTS.forEach((q) => {
      const st = S.quests[q.id];
      const done = st && st.p >= q.n;
      const card = document.createElement("div");
      card.className = "qcard";
      card.innerHTML =
        "<b>" + q.em + " " + (q[S.lang] || q.it) + "</b>" +
        "<p>" + (q["d_" + S.lang] || q.d_it) + "</p>" +
        '<div class="qbar"><i style="width:' + (st ? st.p / q.n * 100 : 0) + '%"></i></div>' +
        '<div class="qfoot"><span class="rw">🪙 ' + q.rw + "</span>" +
        '<button class="act">' + (st && st.claimed ? "✓" : done ? tr("claim") : Math.min(questVal(q), q.n) + "/" + q.n) + "</button></div>";
      const b = card.querySelector("button");
      b.disabled = !done || (st && st.claimed);
      b.onclick = () => {
        if (!done || st.claimed) return;
        st.claimed = true; addCoins(q.rw); sfx("coin");
        toast(tr("quest_done") + " +" + q.rw + " 🪙", "gold");
        save(); refreshHud(); renderQuests();
      };
      list.appendChild(card);
    });
  }

  /* ═══════════════════════════ cabin ═══════════════════════════ */
  function placeInRoom(id, kind, w) {
    const used = new Set(S.room.map((r) => r.slot));
    let slot = SLOTS.findIndex((_, i) => !used.has(i));
    if (slot < 0) return false;
    S.room.push({ uid: uid(), id, kind, slot, x: SLOTS[slot][0], y: SLOTS[slot][1], w: w || 0 });
    if (kind === "fish") S.mounted++;
    renderRoom();
    return true;
  }
  function renderRoom() {
    const room = $("room");
    room.querySelectorAll(".pitem").forEach((e) => e.remove());
    S.room.forEach((it) => {
      const d = it.kind === "fish" ? F[it.id] : CAT.furniture[it.id];
      if (!d) return;
      const el = document.createElement("div");
      el.className = "pitem" + (it.kind === "fish" ? " fishy" : "");
      el.dataset.uid = it.uid;
      el.style.left = (it.x * 100 - 6.25) + "%";
      el.style.top = (it.y * 100 - 5) + "%";
      el.innerHTML = '<div>' + d.em + "</div><small>" + (d[S.lang] || d.it) + "</small>";
      room.appendChild(el);
    });
    const hasCat = S.room.some((r) => r.id === "cat");
    show("cat", hasCat);
    if (hasCat) moveCat();
  }
  let catTimer = null;
  function moveCat() {
    const c = $("cat");
    if (!c || c.hidden) return;
    c.style.left = rnd(8, 82) + "%";
    c.style.top = rnd(30, 70) + "%";
    clearTimeout(catTimer);
    catTimer = setTimeout(moveCat, 3200);
  }
  // drag & tap handling
  let drag = null;
  function roomPoint(e) {
    const r = $("room").getBoundingClientRect();
    return { x: clamp((e.clientX - r.left) / r.width, 0.06, 0.94), y: clamp((e.clientY - r.top) / r.height, 0.12, 0.92) };
  }
  $("room").addEventListener("pointerdown", (e) => {
    const el = e.target.closest(".pitem");
    if (!el) return;
    const it = S.room.find((r) => r.uid === el.dataset.uid);
    if (!it) return;
    const p = roomPoint(e);
    drag = { el, it, ox: p.x - it.x, oy: p.y - it.y, moved: false, t: Date.now() };
    el.classList.add("drag");
    el.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  $("room").addEventListener("pointermove", (e) => {
    if (!drag) return;
    const p = roomPoint(e);
    if (Math.abs(p.x - (drag.it.x + drag.ox)) > 0.005 || Math.abs(p.y - (drag.it.y + drag.oy)) > 0.005) drag.moved = true;
    drag.it.x = clamp(p.x - drag.ox, 0.06, 0.94);
    drag.it.y = clamp(p.y - drag.oy, 0.12, 0.92);
    drag.el.style.left = (drag.it.x * 100 - 6.25) + "%";
    drag.el.style.top = (drag.it.y * 100 - 5) + "%";
  });
  $("room").addEventListener("pointerup", (e) => {
    if (!drag) return;
    drag.el.classList.remove("drag");
    if (!drag.moved && drag.it.kind === "fish") openPop(drag.it);
    drag = null; save();
  });

  let popItem = null;
  function openPop(it) {
    popItem = it;
    const d = it.kind === "fish" ? F[it.id] : CAT.furniture[it.id];
    $("pop-name").textContent = d.em + " " + (d[S.lang] || d.it);
    $("pop-desc").textContent = it.kind === "fish" ? (d[S.lang + "_f"] || d.it_f) : (d["d_" + S.lang] || d.d_it);
    $("pop-out").querySelector("small").textContent = it.kind === "fish" ? tr("back_bucket") : tr("close");
    $("pop-sell").querySelector("small").textContent = tr("sell_item");
    show("pop", true);
  }
  $("pop-out").onclick = () => {
    if (!popItem) return;
    const i = S.room.indexOf(popItem);
    if (i >= 0) S.room.splice(i, 1);
    if (popItem.kind === "fish") { addToBucket(popItem.id, popItem.w || 0); S.mounted = Math.max(0, S.mounted - 1); }
    popItem = null; show("pop", false);
    sfx("tap"); toast(tr("removed")); save(); refreshHud(); renderRoom();
  };
  $("pop-sell").onclick = () => {
    if (!popItem) return;
    const d = popItem.kind === "fish" ? F[popItem.id] : CAT.furniture[popItem.id];
    const v = Math.round((popItem.kind === "fish" ? d.v * (0.6 + (popItem.w || 0) / d.w[1] * 0.8) : d.cost) / 2);
    addCoins(v);
    const i = S.room.indexOf(popItem);
    if (i >= 0) S.room.splice(i, 1);
    if (popItem.kind === "fish") S.mounted = Math.max(0, S.mounted - 1);
    popItem = null; show("pop", false);
    sfx("coin"); toast(tr("sold") + " " + v + " 🪙", "gold"); save(); refreshHud(); renderRoom();
  };
  $("pop-x").onclick = () => { popItem = null; show("pop", false); };

  /* ═══════════════════════════ settings ═══════════════════════════ */
  function renderSettings() {
    $("set-sound").checked = S.sound;
    $("set-haptic").checked = S.haptic;
    $("set-lang").value = S.lang;
    $("stats-txt").textContent = tr("stats_line", { a: S.stats.casts, b: S.fishCaught, c: S.stats.sales, d: Object.keys(S.records).length });
  }
  $("set-lang").onchange = (e) => { S.lang = e.target.value; save(); applyI18n(); };
  $("set-sound").onchange = (e) => { S.sound = e.target.checked; save(); if (S.sound) sfx("tap"); };
  $("set-haptic").onchange = (e) => { S.haptic = e.target.checked; save(); if (S.haptic) buzz(30); };
  $("set-export").onclick = () => {
    try {
      const blob = new Blob([JSON.stringify(S, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "ripple-cove-save.json";
      a.click(); URL.revokeObjectURL(a.href);
      toast(tr("export") + " ✓");
    } catch (e) { toast(tr("export_fail"), "bad"); }
  };
  $("set-import").onclick = () => $("import-file").click();
  $("import-file").onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const o = JSON.parse(rd.result);
        if (!o || o.v !== 1) throw 0;
        S = Object.assign(fresh(), o);
        save(); applyI18n(); setView("fish"); toast(tr("imported"), "gold");
      } catch (err) { toast(tr("import_bad"), "bad"); }
    };
    rd.readAsText(file);
    e.target.value = "";
  };
  $("set-reset").onclick = () => {
    if (!confirm(tr("reset_confirm"))) return;
    S = fresh(); save(); applyI18n(); setView("fish"); closePanels(); toast(tr("reset_ok"));
  };

  /* ═══════════════════════════ offline earnings ═══════════════════════════ */
  function offlineReport() {
    const away = Math.max(0, now() - S.lastSeen);
    if (away < 60000) return;
    const rate = (2 + S.level * 0.6 + cozy() * 0.15) / 60; // coins per second
    const earned = Math.min(Math.floor(away / 1000 * rate), 8 * 3600 * rate);
    if (earned < 1) return;
    $("offline-txt").textContent = tr("offline_line", { n: fmt(earned) });
    $("offline-txt").dataset.coins = earned;
    show("p-offline", true);
  }
  $("offline-ok").onclick = () => {
    const n = parseInt($("offline-txt").dataset.coins || "0", 10);
    addCoins(n); save(); refreshHud(); show("p-offline", false); sfx("coin"); toast("+" + fmt(n) + " 🪙", "gold");
  };
  $("hello-go").onclick = () => { S.seen = true; save(); show("p-hello", false); sfx("tap"); };

  /* ═══════════════════════════ fishing loop ═══════════════════════════ */
  let phase = "idle"; // idle | wait | battle
  let waitT = 0, catchFish = null, bobber = { x: 0.5, y: 0.62, tx: 0.5, ty: 0.62, arc: 0 };
  let battle = { prog: 0, ten: 0, zone: 0.5, dir: 1, held: false, t: 0, speed: 1, fish: null, hint: "" };
  let splash = [];

  function cast() {
    if (phase !== "idle") return;
    if (!S.baits[S.equip.bait] || S.baits[S.equip.bait] <= 0) {
      toast(tr("no_bait"), "bad"); sfx("bad"); return;
    }
    S.baits[S.equip.bait]--;
    S.stats.casts++;
    phase = "wait";
    bobber.tx = rnd(0.32, 0.78);
    bobber.ty = rnd(0.58, 0.74);
    bobber.arc = 1;
    const bd = baitDef(), lo = LOCATIONS[S.loc], bo = boatDef();
    let wd = 1;
    if (S.weather === "rain" || S.weather === "storm") wd = 1.15;
    if (S.weather === "snow") wd = 0.9;
    if (S.loc === "ocean" && hasExtra("wetsuit")) wd *= 1.35;
    waitT = rnd(2.2, 5.5) / (bd.speed * lo.speed * bo.speed * wd);
    setStatus(tr("tap_hint_cast"), false);
    sfx("cast"); buzz(25);
    refreshHud();
  }

  function chooseFish() {
    const pool = FISH.filter((f) => f.loc === S.loc);
    let luck = baitDef().luck + (hasExtra("clover") ? 0.6 : 0) + (perk("luck") ? 0.8 : 0);
    if (S.weather === "rain" || S.weather === "storm") luck += 0.3;
    if (S.season === 1) luck += 0.15;
    const weights = [0.4, 0.3, 0.18, 0.09, 0.03].map((w, r) => w * (1 + luck * r * 0.7));
    const tot = weights.reduce((a, b) => a + b, 0);
    let x = Math.random() * tot, r = 0;
    for (; r < 4; r++) { if (x < weights[r]) break; x -= weights[r]; }
    const candidates = pool.filter((f) => f.r === r);
    return pick(candidates.length ? candidates : pool);
  }

  function bite() {
    const f = chooseFish();
    catchFish = {
      f,
      w: Math.round(rnd(f.w[0], f.w[1]) * (0.9 + baitDef().luck * 0.05))
    };
    phase = "battle";
    battle = {
      prog: 0.06, ten: 0.08, zone: 0.5, dir: Math.random() < 0.5 ? -1 : 1,
      held: false, t: 0,
      speed: (0.35 + f.r * 0.09) / rodDef().power,
      fish: f, hint: ""
    };
    splash.push({ x: bobber.tx, y: bobber.ty, t: 0 });
    splash.push({ x: bobber.tx + 0.01, y: bobber.ty, t: -0.12 });
    setStatus(tr("bite"), true);
    sfx("bite"); buzz([40, 40, 40]);
    $("b-name").textContent = hasExtra("binoculars") ? (f[S.lang] || f.it) + " " + "★".repeat(f.r + 1) : "★".repeat(f.r + 1) + " ???";
    $("b-hint").textContent = tr("b_hold");
    show("battle", true);
    refreshHud();
  }

  function endBattle(win) {
    show("battle", false);
    phase = "idle";
    if (win) {
      registerCatch();
      setStatus(tr("cast_again"), false);
    } else {
      S.stats.escapes++;
      setStatus(tr("line_broken"), false);
      sfx("bad"); buzz(120);
    }
    refreshHud();
  }

  function registerCatch() {
    const f = catchFish.f, w = catchFish.w;
    const isNew = !S.dex[f.id];
    S.fishCaught++;
    S.dex[f.id] = (S.dex[f.id] || 0) + 1;
    S.locStat[S.loc] = (S.locStat[S.loc] || 0) + 1;
    if (f.r >= 2) S.rare++;
    if (f.r === 4) S.r4++;
    const rec = !S.records[f.id] || w > S.records[f.id];
    if (rec) S.records[f.id] = w;
    addXp(f.xp + f.r * 4);
    addToBucket(f.id, w);
    sfx("catch"); buzz([30, 50, 30]);
    // populate card
    $("c-emoji").textContent = f.em;
    $("c-name").textContent = f[S.lang] || f.it;
    $("c-meta").textContent = Math.round(w) + " " + tr("weight") + " · " + tr("loc_" + f.loc) + " · " + "★".repeat(f.r + 1);
    $("c-flavor").textContent = f[S.lang + "_f"] || f.it_f;
    show("c-rec", rec);
    $("c-mount").disabled = S.room.length >= SLOTS.length;
    show("card", true);
    if (isNew) toast(tr("new_fish") + " " + (f[S.lang] || f.it), "gold");
    save();
  }

  function finishCard(action) {
    if (!catchFish) { show("card", false); return; }
    const f = catchFish.f, w = catchFish.w;
    if (action === "keep") toast((f[S.lang] || f.it) + " → " + tr("bucket"));
    if (action === "sell") {
      const v = bucketValue({ id: f.id, w });
      removeFromBucket(f.id, 1);
      addCoins(v); S.fishSold++; S.stats.sales++;
      if (hasExtra("hat")) addCoins(Math.round(v * 0.05));
      sfx("coin"); toast(tr("sold") + " " + v + " 🪙", "gold");
    }
    if (action === "bait") {
      const n = f.r >= 3 ? 2 : 1;
      const out = ["worm", "corn", "dough", "glow", "roe"][f.r];
      removeFromBucket(f.id, 1);
      S.baits[out] = (S.baits[out] || 0) + n;
      sfx("tap"); toast(CAT.baits[out][S.lang] + " ×" + n);
    }
    if (action === "mount") {
      if (placeInRoom(f.id, "fish", w)) {
        removeFromBucket(f.id, 1);
        toast(tr("placed") + " " + (f[S.lang] || f.it));
      } else toast(tr("room_full"), "bad");
    }
    show("card", false);
    catchFish = null;
    save(); refreshHud();
  }
  $("c-keep").onclick = () => finishCard("keep");
  $("c-sell").onclick = () => finishCard("sell");
  $("c-craft").onclick = () => finishCard("bait");
  $("c-mount").onclick = () => finishCard("mount");

  /* battle input */
  function setHold(on) {
    if (phase !== "battle") return;
    battle.held = on;
    $("b-hint").textContent = on && battle.ten > 0.72 ? tr("b_release") : tr("b_hold");
    $("b-hint").classList.toggle("hot", on && battle.ten > 0.72);
  }
  $("battle").addEventListener("pointerdown", (e) => { e.preventDefault(); setHold(true); });
  window.addEventListener("pointerup", () => setHold(false));
  window.addEventListener("pointercancel", () => setHold(false));
  window.addEventListener("keydown", (e) => { if (e.code === "Space") { e.preventDefault(); setHold(true); } });
  window.addEventListener("keyup", (e) => { if (e.code === "Space") setHold(false); });

  /* dock / nav */
  $("btn-cast").onclick = cast;
  $("btn-bait").onclick = () => openPanel("p-bait");
  $("btn-bucket").onclick = () => openPanel("p-bucket");
  $("btn-bucket2").onclick = () => openPanel("p-bucket");
  $("btn-shop2").onclick = () => openPanel("p-shop");
  document.querySelectorAll(".loc").forEach((b) => {
    b.onclick = () => {
      const k = b.dataset.loc;
      if (LOCATIONS[k].lvl > S.level) { toast(tr("locked") + " " + LOCATIONS[k].lvl, "bad"); sfx("bad"); return; }
      if (phase !== "idle") return;
      S.loc = k; sfx("tap"); save(); refreshHud();
    };
  });
  document.querySelectorAll("#nav button[data-view]").forEach((b) => b.onclick = () => { closePanels(); setView(b.dataset.view); sfx("tap"); });
  document.querySelectorAll("#nav button[data-panel]").forEach((b) => b.onclick = () => openPanel("p-" + b.dataset.panel));
  document.querySelectorAll("#shop-tabs button[data-tab]").forEach((b) => b.onclick = () => { shopTab = b.dataset.tab; renderShop(); sfx("tap"); });
  document.querySelectorAll(".panel .close").forEach((b) => b.onclick = () => closePanels());
  $("bk-sellall").onclick = () => {
    if (!S.bucket.length) return;
    let v = 0;
    S.bucket.forEach((f) => { v += sellFish(f) * f.n; });
    S.bucket = []; sfx("coin"); toast(tr("sold") + " " + v + " 🪙", "gold");
    save(); refreshHud(); renderBucket();
  };
  $("bk-sellall2").onclick = () => {
    if (!S.bucket.length) return;
    let v = 0;
    S.bucket.forEach((f) => { const gain = bucketValue(f) * f.n; v += gain; addCoins(gain); });
    S.fishSold += S.bucket.reduce((a, f) => a + f.n, 0);
    S.bucket = []; sfx("coin"); toast(tr("sold") + " ×2 " + v + " 🪙", "gold");
    save(); refreshHud(); renderBucket();
  };

  /* ═══════════════════════════ time & weather ═══════════════════════════ */
  function tickTime(dt) {
    S.time += dt * 3.2; // ~7.5 real minutes per game day
    if (S.time >= 1440) { S.time -= 1440; S.day++; }
    if (S.day % 7 === 0) S.season = Math.floor(S.day / 7) % 4;
    S.weatherT -= dt;
    if (S.weatherT <= 0) {
      const roll = Math.random();
      S.weather = roll < 0.5 ? "sunny" : roll < 0.7 ? "cloudy" : roll < 0.86 ? "rain" : roll < 0.95 ? "storm" : "snow";
      S.weatherT = rnd(90, 220);
    }
  }

  /* ═══════════════════════════ canvas scene ═══════════════════════════ */
  const canvas = $("scene");
  const ctx = canvas.getContext("2d");
  let V = { w: 0, h: 0, dpr: 1 };
  let t = 0;
  const bubbles = Array.from({ length: 46 }, () => ({ x: Math.random(), y: Math.random(), s: rnd(0.6, 2.4), v: rnd(0.01, 0.05), p: Math.random() * 6.28 }));
  const clouds = Array.from({ length: 6 }, () => ({ x: Math.random(), y: rnd(0.04, 0.26), s: rnd(0.05, 0.13), v: rnd(0.003, 0.012) }));
  const stars = Array.from({ length: 70 }, () => ({ x: Math.random(), y: rnd(0.02, 0.38), s: rnd(0.5, 1.6), p: Math.random() * 6.28 }));
  const fishes = Array.from({ length: 7 }, () => ({ x: Math.random(), y: rnd(0.45, 0.9), s: rnd(0.6, 1.4), v: rnd(0.01, 0.035), dir: Math.random() < 0.5 ? -1 : 1, p: Math.random() * 6.28 }));

  function resize() {
    const r = canvas.getBoundingClientRect();
    V.dpr = Math.min(window.devicePixelRatio || 1, 2);
    V.w = Math.max(1, r.width); V.h = Math.max(1, r.height);
    canvas.width = Math.round(V.w * V.dpr);
    canvas.height = Math.round(V.h * V.dpr);
  }
  window.addEventListener("resize", resize);

  function skyColors() {
    const h = (S.time / 60) % 24;
    const lo = LOCATIONS[S.loc];
    let top, bot;
    if (h < 5) { top = "#0b1b33"; bot = mix(lo.sky[0], "#243a5c", 0.7); }
    else if (h < 7) { top = mix("#27395c", lo.sky[0], (h - 5) / 2); bot = mix("#e0a070", lo.sky[1], (h - 5) / 2); }
    else if (h < 17) { top = lo.sky[0]; bot = lo.sky[1]; }
    else if (h < 20) { top = mix(lo.sky[0], "#33405f", (h - 17) / 3); bot = mix(lo.sky[1], "#e79a6c", (h - 17) / 3); }
    else { top = mix("#33405f", "#0b1b33", (h - 20) / 4); bot = mix("#e79a6c", "#16243d", (h - 20) / 4); }
    if (S.weather === "storm") { top = mix(top, "#1b2635", 0.55); bot = mix(bot, "#2f3a44", 0.5); }
    else if (S.weather === "rain" || S.weather === "cloudy") { top = mix(top, "#5c6b78", 0.4); bot = mix(bot, "#9aa7ae", 0.35); }
    else if (S.weather === "snow") { top = mix(top, "#9aa9b8", 0.35); bot = mix(bot, "#e8eef2", 0.3); }
    return { top, bot };
  }

  function draw(tm) {
    const w = V.w, h = V.h, dpr = V.dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const lo = LOCATIONS[S.loc];
    const sky = skyColors();
    const horizon = h * 0.44;

    // sky
    let g = ctx.createLinearGradient(0, 0, 0, horizon);
    g.addColorStop(0, sky.top); g.addColorStop(1, sky.bot);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, horizon + 2);

    const hour = (S.time / 60) % 24;
    const night = hour < 6 || hour >= 20;
    // stars
    if (night || S.weather === "storm") {
      stars.forEach((s) => {
        ctx.globalAlpha = (0.35 + 0.4 * Math.sin(tm * 1.6 + s.p)) * (night ? 1 : 0.4);
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(s.x * w, s.y * horizon, s.s, 0, 6.28); ctx.fill();
      });
      ctx.globalAlpha = 1;
    }
    // sun / moon
    const dayT = clamp((hour - 6) / 14, 0, 1);
    const orbX = w * (0.12 + dayT * 0.76);
    const orbY = horizon - Math.sin(dayT * Math.PI) * horizon * 0.72 - 10;
    ctx.save();
    ctx.globalAlpha = night ? 0.9 : 1;
    ctx.shadowBlur = night ? 18 : 30;
    ctx.shadowColor = night ? "rgba(220,235,255,.6)" : "rgba(255,225,150,.8)";
    ctx.fillStyle = night ? "#eef3ff" : "#ffe6a0";
    ctx.beginPath(); ctx.arc(orbX, orbY, night ? 13 : 20, 0, 6.28); ctx.fill();
    if (night) { ctx.fillStyle = sky.top; ctx.beginPath(); ctx.arc(orbX + 6, orbY - 5, 12, 0, 6.28); ctx.fill(); }
    ctx.restore();

    // clouds
    clouds.forEach((c) => {
      c.x += c.v * 0.016;
      if (c.x > 1.15) c.x = -0.15;
      const x = c.x * w, y = c.y * h, s = c.s * w;
      ctx.globalAlpha = S.weather === "storm" ? 0.55 : S.weather === "sunny" ? 0.55 : 0.8;
      ctx.fillStyle = S.weather === "storm" ? "#46525f" : "#ffffff";
      ctx.beginPath();
      ctx.ellipse(x, y, s, s * 0.32, 0, 0, 6.28);
      ctx.ellipse(x + s * 0.5, y - s * 0.12, s * 0.55, s * 0.3, 0, 0, 6.28);
      ctx.ellipse(x - s * 0.45, y + s * 0.08, s * 0.5, s * 0.26, 0, 0, 6.28);
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // hills / distant shore
    function hillLayer(baseY, amp, color, phase, freq) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, baseY);
      for (let x = 0; x <= w; x += 8) {
        const y = baseY - (Math.sin(x * freq + phase) * 0.5 + 0.5) * amp - Math.sin(x * freq * 0.37 + phase) * amp * 0.3;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, horizon + 2); ctx.lineTo(0, horizon + 2); ctx.closePath(); ctx.fill();
    }
    const hillDark = night ? mix(lo.hill, "#101c2a", 0.6) : lo.hill;
    hillLayer(horizon, h * 0.13, mix(hillDark, sky.bot, 0.35), 0.8, 0.006);
    hillLayer(horizon, h * 0.07, hillDark, 2.4, 0.011);

    // little house on the hill (the cabin)
    const hx = w * 0.8, hy = horizon - h * 0.055;
    ctx.fillStyle = night ? "#1a2b36" : "#3d2b1b";
    ctx.fillRect(hx - 13, hy - 12, 26, 14);
    ctx.fillStyle = night ? "#2c3f4a" : "#8a5c36";
    ctx.beginPath(); ctx.moveTo(hx - 17, hy - 12); ctx.lineTo(hx, hy - 24); ctx.lineTo(hx + 17, hy - 12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = night ? "rgba(255,220,150,.85)" : "rgba(255,235,180,.9)";
    ctx.fillRect(hx - 4, hy - 8, 8, 6);

    // water body
    g = ctx.createLinearGradient(0, horizon, 0, h);
    const wt = night ? mix(lo.water[0], "#0a1726", 0.5) : lo.water[0];
    const wb = night ? mix(lo.water[1], "#050d18", 0.5) : lo.water[1];
    g.addColorStop(0, wt); g.addColorStop(1, wb);
    ctx.fillStyle = g; ctx.fillRect(0, horizon, w, h - horizon);

    // glitter path under the orb
    ctx.save();
    ctx.globalAlpha = night ? 0.18 : 0.28;
    ctx.fillStyle = night ? "#cfe0ff" : "#fff3c4";
    for (let i = 0; i < 26; i++) {
      const yy = horizon + (i / 26) * (h - horizon);
      const spread = 12 + (yy - horizon) / (h - horizon) * w * 0.22;
      const xx = orbX + Math.sin(tm * 2 + i * 1.7) * spread * 0.5;
      ctx.fillRect(xx - spread / 2, yy, spread, 2);
    }
    ctx.restore();

    // wave lines
    const waveCount = S.loc === "ocean" ? 16 : 12;
    for (let i = 0; i < waveCount; i++) {
      const yy = horizon + (i + 0.5) / waveCount * (h - horizon);
      const amp = (1 + i / waveCount * 3) * lo.tide;
      ctx.strokeStyle = "rgba(234,252,255," + (0.05 + i / waveCount * 0.16) + ")";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 6) {
        const y = yy + Math.sin(x * 0.028 + tm * (1.1 + i * 0.05) + i) * amp;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // fish shadows
    fishes.forEach((f) => {
      f.x += f.v * f.dir * 0.016;
      if (f.x > 1.1) f.x = -0.1; if (f.x < -0.1) f.x = 1.1;
      const fx = f.x * w, fy = f.y * h + Math.sin(tm + f.p) * 4;
      ctx.save();
      ctx.translate(fx, fy); ctx.scale(f.dir * f.s, f.s);
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = "#02141d";
      ctx.beginPath(); ctx.ellipse(0, 0, 11, 4, 0, 0, 6.28); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-18, -5); ctx.lineTo(-18, 5); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
    });

    // bubbles
    bubbles.forEach((b) => {
      b.y -= b.v * 0.008;
      if (b.y < horizon / h) b.y = 1;
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = "#eafcff";
      ctx.beginPath(); ctx.arc((b.x + Math.sin(tm + b.p) * 0.006) * w, b.y * h, b.s, 0, 6.28); ctx.fill();
    });
    ctx.globalAlpha = 1;

    // scenery
    drawScenery(w, h, horizon, lo, night, tm);

    // bobber, line, splash
    if (phase !== "idle") drawBobber(w, h, horizon, tm);
    splash = splash.filter((s) => s.t < 1.1);
    splash.forEach((s) => {
      s.t += 0.02;
      if (s.t < 0) return;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - s.t);
      ctx.strokeStyle = "#eafcff"; ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * 6.28;
        const r = s.t * 34;
        ctx.beginPath();
        ctx.arc(s.x * w + Math.cos(a) * r, s.y * h + Math.sin(a) * r * 0.4, 2, 0, 6.28);
        ctx.stroke();
      }
      ctx.restore();
    });

    // weather overlays
    if (S.weather === "rain" || S.weather === "storm") {
      ctx.strokeStyle = S.weather === "storm" ? "rgba(200,220,235,.5)" : "rgba(200,220,235,.35)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 90; i++) {
        const x = ((i * 137.5 + tm * 220) % (w + 40)) - 20;
        const y = ((i * 91.3 + tm * (S.weather === "storm" ? 620 : 420)) % h);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 5, y + 16); ctx.stroke();
      }
    }
    if (S.weather === "snow") {
      ctx.fillStyle = "rgba(255,255,255,.75)";
      for (let i = 0; i < 70; i++) {
        const x = ((i * 83.7 + Math.sin(tm + i) * 24) % w);
        const y = ((i * 57.1 + tm * 26) % h);
        ctx.beginPath(); ctx.arc(x, y, 1.5 + (i % 3) * 0.6, 0, 6.28); ctx.fill();
      }
    }

    // vignette
    const vg = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.8);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(4,22,32,.35)");
    ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
  }

  function drawScenery(w, h, horizon, lo, night, tm) {
    const y = horizon + 6;
    if (S.loc === "river" || S.loc === "lake") {
      // reeds
      for (let side = 0; side < 2; side++) {
        const bx = side === 0 ? w * 0.06 : w * 0.94;
        for (let i = 0; i < 9; i++) {
          const x = bx + (i - 4) * (w * 0.012) + Math.sin(tm * 1.2 + i) * 3;
          const len = 26 + (i % 4) * 9;
          ctx.strokeStyle = night ? "#16322c" : "#2e5d3a";
          ctx.lineWidth = 2.4;
          ctx.beginPath(); ctx.moveTo(x, y + 14); ctx.quadraticCurveTo(x + 4, y - len * 0.4, x + Math.sin(tm + i) * 6, y - len); ctx.stroke();
        }
      }
      // lily pads
      for (let i = 0; i < 6; i++) {
        const x = w * (0.18 + i * 0.13) + Math.sin(tm * 0.8 + i) * 4;
        const yy = horizon + (h - horizon) * (0.22 + (i % 3) * 0.16);
        ctx.fillStyle = night ? "#204a34" : "#3f8a4e";
        ctx.beginPath(); ctx.ellipse(x, yy, 16, 6, 0, 0.25, 6.0); ctx.fill();
        if (i % 2 === 0) {
          ctx.fillStyle = "#f6c9d8";
          ctx.beginPath(); ctx.arc(x + 4, yy - 2, 3, 0, 6.28); ctx.fill();
        }
      }
    } else if (S.loc === "sea") {
      // rocks
      [[0.08, 0.62], [0.9, 0.7], [0.74, 0.58]].forEach(([px, py], i) => {
        const x = px * w, yy = py * h;
        ctx.fillStyle = night ? "#20313c" : "#5d6b68";
        ctx.beginPath(); ctx.moveTo(x - 18, yy); ctx.lineTo(x - 10, yy - 18 - i * 4); ctx.lineTo(x + 6, yy - 14); ctx.lineTo(x + 18, yy); ctx.closePath(); ctx.fill();
      });
      // distant sailboat
      const sx = w * 0.3, sy = horizon + 4;
      ctx.strokeStyle = night ? "#b9c7d4" : "#f7fbfd"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(sx, sy - 26); ctx.lineTo(sx, sy); ctx.stroke();
      ctx.fillStyle = night ? "#d7e2ec" : "#ffffff";
      ctx.beginPath(); ctx.moveTo(sx + 2, sy - 24); ctx.lineTo(sx + 16, sy - 2); ctx.lineTo(sx + 2, sy - 2); ctx.closePath(); ctx.fill();
    } else {
      // ocean: iceberg / waves / distant whale spout
      const ix = w * 0.86, iy = horizon + 8;
      ctx.fillStyle = night ? "#9fb6c8" : "#e4f1f7";
      ctx.beginPath(); ctx.moveTo(ix - 30, iy); ctx.lineTo(ix - 8, iy - 26); ctx.lineTo(ix + 2, iy - 14); ctx.lineTo(ix + 16, iy - 32); ctx.lineTo(ix + 34, iy); ctx.closePath(); ctx.fill();
      // whale tail
      const wx = w * 0.18, wy = horizon + (h - horizon) * 0.3;
      ctx.strokeStyle = "rgba(220,240,250,.5)"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(wx, wy); ctx.quadraticCurveTo(wx - 8, wy - 14, wx - 16, wy - 16);
      ctx.moveTo(wx, wy); ctx.quadraticCurveTo(wx + 8, wy - 14, wx + 16, wy - 16); ctx.stroke();
    }
  }

  function drawBobber(w, h, horizon, tm) {
    let bx = bobber.x, by = bobber.y;
    if (bobber.arc > 0) {
      bobber.arc = Math.max(0, bobber.arc - 0.018);
      const f = 1 - bobber.arc;
      bx = lerp(0.5, bobber.tx, f);
      by = lerp(0.86, bobber.ty, f) - Math.sin(f * Math.PI) * 0.16;
    } else {
      bobber.x = lerp(bobber.x, bobber.tx, 0.06);
      bobber.y = lerp(bobber.y, bobber.ty, 0.06);
      bx = bobber.x; by = bobber.y;
    }
    const px = bx * w, py = by * h + Math.sin(tm * 3) * 2;
    // rod tip + line
    ctx.strokeStyle = "rgba(234,252,255,.5)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(w * 0.92, h * 0.74); ctx.lineTo(px, py); ctx.stroke();
    // ripple rings
    ctx.strokeStyle = "rgba(234,252,255,.45)";
    for (let i = 0; i < 2; i++) {
      const r = 8 + ((tm * 22 + i * 11) % 22);
      ctx.globalAlpha = 0.5 * (1 - ((tm * 22 + i * 11) % 22) / 22);
      ctx.beginPath(); ctx.ellipse(px, py + 3, r, r * 0.35, 0, 0, 6.28); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // bobber
    ctx.fillStyle = "#ff6b4a";
    ctx.beginPath(); ctx.arc(px, py, 6, Math.PI, 0); ctx.fill();
    ctx.fillStyle = "#f4f7f3";
    ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI); ctx.fill();
    ctx.fillStyle = "#10333f";
    ctx.fillRect(px - 1, py - 11, 2, 6);
  }

  /* ═══════════════════════════ battle update ═══════════════════════════ */
  function updateBattle(dt) {
    if (phase !== "battle") return;
    const b = battle;
    b.t += dt;
    b.zone += b.dir * dt * b.speed * 0.42;
    if (b.zone > 0.82) { b.zone = 0.82; b.dir = -1; }
    if (b.zone < 0.18) { b.zone = 0.18; b.dir = 1; }
    const half = 0.12 + (rodDef().power - 1) * 0.012;
    const inZone = Math.abs(b.prog - b.zone) < half;
    const power = rodDef().power;
    const tenMul = hasExtra("gloves") ? 0.78 : 1;
    if (b.held) {
      b.prog += dt * (inZone ? 0.34 : 0.13) * (0.85 + power * 0.06);
      b.ten += dt * (inZone ? 0.055 : 0.26) * tenMul * (1 + b.fish.r * 0.12);
    } else {
      b.prog -= dt * 0.05;
      b.ten -= dt * 0.24;
    }
    b.prog = clamp(b.prog, 0, 1);
    b.ten = clamp(b.ten, 0, 1);
    // render
    $("b-prog").style.height = (b.prog * 100) + "%";
    $("b-zone").style.bottom = ((b.zone - half) * 100) + "%";
    $("b-zone").style.height = (half * 200) + "%";
    $("b-fish").style.bottom = (b.zone * 100) + "%";
    $("b-tenfill").style.width = (b.ten * 100) + "%";
    $("b-hint").textContent = b.held && b.ten > 0.72 ? tr("b_release") : tr("b_hold");
    $("b-hint").classList.toggle("hot", b.ten > 0.72);
    if (b.ten >= 1) endBattle(false);
    else if (b.prog >= 1) endBattle(true);
  }

  /* ═══════════════════════════ main loop ═══════════════════════════ */
  let last = 0, uiTick = 0, saveTick = 0;
  function frame(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0);
    last = ts; t += dt;
    tickTime(dt);
    if (phase === "wait") {
      waitT -= dt;
      if (waitT <= 0) bite();
    }
    updateBattle(dt);
    draw(t);
    uiTick += dt; saveTick += dt;
    if (uiTick > 1) { uiTick = 0; refreshHud(); }
    if (saveTick > 10) { saveTick = 0; save(); }
    requestAnimationFrame(frame);
  }

  /* ═══════════════════════════ boot ═══════════════════════════ */
  function renderAll() {
    refreshHud(); renderShop(); renderBucket(); renderDex(); renderQuests();
    renderBaitPanel(); renderSettings(); renderRoom();
  }
  function boot() {
    load();
    resize();
    applyI18n();
    renderAll();
    setView("fish");
    if (!S.seen) show("p-hello", true);
    else offlineReport();
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./service-worker.js").catch(() => {});
    }
    // Debug/testing hook — harmless in production, used by smoke.mjs.
    window.__ripple = {
      state: () => S,
      phase: () => phase,
      battle: () => battle,
      cast,
      forceBite: () => { if (phase === "wait") bite(); },
      finishCard,
      endBattle,
      giveCoins: (n) => { addCoins(n); save(); refreshHud(); },
      setHold,
      save,
      draw
    };
    requestAnimationFrame(frame);
  }
  boot();
})();
