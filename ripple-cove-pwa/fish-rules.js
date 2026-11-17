/*
 * Ripple Cove — fish data and pure catch rules.
 * Loaded as an ES module by game.js and imported directly by Node tests.
 */

const fish = (id, em, it, en, loc, r, w, v, xp, it_f, en_f, extra = {}) =>
  ({ id, em, it, en, loc, r, w, v, xp, it_f, en_f, ...extra });

const legend = (id, em, it, en, loc, w, v, xp, it_f, en_f, condition, lore_it, lore_en, hint_it, hint_en, glow) =>
  fish(id, em, it, en, loc, 4, w, v, xp, it_f, en_f,
    { legend: true, condition, lore_it, lore_en, hint_it, hint_en, glow });

export const FISH = [
  /* ── original 32 species ───────────────────────────────────────── */
  fish("minnow",  "🐟", "Pesciolino",   "Minnow",       "river", 0, [20, 80],     4,   6, "Un piccolo nuotatore timido.", "A shy little swimmer."),
  fish("crucian", "🐠", "Carassio",      "Crucian",      "river", 0, [80, 220],    7,   8, "Dorato come il sole del mattino.", "Golden as the morning sun."),
  fish("trout",   "🐟", "Trota",         "Trout",        "river", 1, [200, 900],   18,  14, "Ama le acque fredde e correnti.", "Loves cold, running water."),
  fish("barbel",  "🐟", "Barbo",         "Barbel",       "river", 1, [300, 1400],  22,  16, "Ha la barba, ma non racconta storie.", "Has a beard, but tells no tales."),
  fish("pike",    "🐟", "Luccio",        "Pike",         "river", 2, [900, 3500],  55,  26, "Un predatore paziente tra i canneti.", "A patient hunter among the reeds."),
  fish("tench",   "🐠", "Tinca",         "Tench",        "river", 2, [500, 2200],  48,  24, "Scivola via come un'ombra verde.", "Slips away like a green shadow."),
  fish("salmon",  "🐟", "Salmone",       "Salmon",       "river", 3, [2200, 7000], 140, 42, "Risale il fiume verso casa.", "Swims upstream toward home."),
  fish("sturgeon","🦈", "Storione",      "Sturgeon",     "river", 4, [6000, 20000],420, 80, "Un antico abitante del fiume.", "An ancient resident of the river."),

  fish("bleak",    "🐟", "Alborella",    "Bleak",        "lake", 0, [15, 60],     5,   6, "Luccica tra i riflessi del lago.", "Glitters among the lake reflections."),
  fish("perch",    "🐠", "Persico",      "Perch",        "lake", 0, [60, 300],    8,   9, "A righe, come una piccola tigre.", "Striped like a tiny tiger."),
  fish("carp",     "🐟", "Carpa",        "Carp",         "lake", 1, [400, 2500],  24,  16, "Saggia e lenta, vive a lungo.", "Wise and slow, it lives a long life."),
  fish("whitefish","🐟", "Coregone",     "Whitefish",    "lake", 1, [300, 1500],  26,  17, "Sale dalle profondità azzurre.", "Rises from the blue depths."),
  fish("catfish",  "🐟", "Siluro",       "Catfish",      "lake", 2, [1500, 7000], 70,  30, "I baffi lunghi due come il lago.", "Whiskers as long as the lake is wide."),
  fish("lakepike", "🐟", "Luccio di lago","Lake pike",   "lake", 2, [1000, 4500], 65,  28, "L'ombra più veloce del lago.", "The fastest shadow in the lake."),
  fish("rainbow",  "🌈", "Trota iridea", "Rainbow trout","lake", 3, [800, 4000],  165, 46, "Porta con sé tutti i colori.", "Carries every colour with it."),
  fish("lakeking", "🦈", "Re del lago",  "Lake king",    "lake", 4, [8000, 26000],480, 90, "Vecchio quanto la cabina.", "As old as the cabin itself."),

  fish("sardine", "🐟", "Sardina",      "Sardine",      "sea", 0, [20, 90],      6,   7, "Viaggia in compagnia, sempre.", "Never travels alone."),
  fish("anchovy", "🐟", "Alici",        "Anchovy",      "sea", 0, [15, 70],      6,   7, "Piccola, ma dal sapore intenso.", "Small, but full of flavour."),
  fish("mullet",  "🐠", "Muggine",      "Mullet",       "sea", 1, [200, 1200],   20,  15, "Salta fuori dall'acqua al tramonto.", "Leaps from the water at sunset."),
  fish("bream",   "🐟", "Orata",        "Bream",        "sea", 1, [300, 1800],   30,  19, "Il suo dorato ricorda il sole.", "Its gold reminds you of the sun."),
  fish("bass",    "🐟", "Branzino",     "Sea bass",     "sea", 2, [800, 4200],   75,  31, "Predatore elegante e silenzioso.", "An elegant, silent predator."),
  fish("mackerel","🐟", "Sgombro",      "Mackerel",     "sea", 2, [400, 2000],   60,  28, "Veloce come il vento salino.", "Fast as the salty wind."),
  fish("tuna",    "🐟", "Tonno",        "Tuna",         "sea", 3, [4000, 25000], 220, 55, "Un motore che non si ferma mai.", "An engine that never stops."),
  fish("sword",   "🦈", "Pescespada",   "Swordfish",    "sea", 4, [12000, 45000],560, 95, "La lama taglia l' acqua in due.", "A blade cutting the sea in two."),

  fish("shrimp",  "🦐", "Gambero",      "Shrimp",       "ocean", 0, [10, 80],     9,   8, "Tiny, rosso come il corallo.", "Red as the coral."),
  fish("crab",    "🦀", "Granchio",     "Crab",         "ocean", 0, [60, 500],    12,  10, "Cammina di traverso, per dispetto.", "Walks sideways, just because."),
  fish("squid",   "🦑", "Calamaro",     "Squid",        "ocean", 1, [200, 2000],  32,  20, "Disegna ombre sul fondo.", "Draws shadows on the seabed."),
  fish("octopus", "🐙", "Polpo",        "Octopus",      "ocean", 1, [400, 3500],  45,  24, "Otto braccia, mille trucchi.", "Eight arms, a thousand tricks."),
  fish("dolphin", "🐬", "Delfino",      "Dolphin",      "ocean", 2, [3000, 12000],130, 40, "Sorride anche quando non deve.", "Smiles even when it needn't."),
  fish("ray",     "🐟", "Razza",        "Ray",          "ocean", 2, [1500, 9000], 110, 38, "Volò via come un mantello scuro.", "Flies off like a dark cloak."),
  fish("shark",   "🦈", "Squalo",       "Shark",        "ocean", 3, [9000, 40000],340, 70, "L'ombra più temuta del mare.", "The most feared shadow of the sea."),
  fish("whale",   "🐋", "Balena",       "Whale",        "ocean", 4, [30000, 90000],900, 120,"Canta una canzone antica.", "Sings a very old song."),

  /* ── 40 new ordinary species (10 per location) ─────────────────── */
  fish("roach",    "🐟", "Scardola",    "Roach",        "river", 0, [25, 110],   5,   6, "Un lampo argentato tra i sassi.", "A silver flash among the stones."),
  fish("dace",     "🐟", "Vairone",     "Dace",         "river", 0, [30, 140],   6,   7, "Più veloce della corrente.", "Faster than the current."),
  fish("gudgeon",  "🐟", "Ghiozzo",     "Gudgeon",      "river", 0, [18, 90],    5,   6, "Vive nascondendosi nel fango.", "Lives hidden in the mud."),
  fish("chub",     "🐟", "Cavedano",    "Chub",         "river", 1, [350, 1800], 28,  18, "Curioso come un bambino.", "Curious as a child."),
  fish("rivperch", "🐠", "Persico di fiume","River perch","river",1, [250, 1200], 25,  17, "A righe, ma più timido del cugino.", "Striped, but shyer than its cousin."),
  fish("breamr",   "🐟", "Breme",       "River bream",  "river", 1, [400, 2000], 29,  19, "Largo e piatto come una foglia.", "Broad and flat as a leaf."),
  fish("asp",      "🐟", "Aspio",       "Asp",          "river", 2, [1200, 4800],68,  29, "Salta per acchiappare gli insetti.", "Leaps to catch insects."),
  fish("zander",   "🐟", "Sandro",      "Zander",       "river", 2, [1800, 6000],82,  33, "Caccia nell'ombra della notte.", "Hunts in the shadow of night."),
  fish("grayling", "🐟", "Temolo",      "Grayling",     "river", 3, [600, 3200], 135, 40, "Una pinna che sembra una vela.", "A fin that looks like a sail."),
  fish("eel",      "🐍", "Anguilla",    "Eel",          "river", 3, [1000, 5000],155, 44, "Scivola tra le canne come un'ombra.", "Slips through reeds like a shadow."),

  fish("sunfish",  "🐠", "Pesce sole",  "Sunfish",      "lake", 0, [20, 100],    6,   7, "Si scalda sulla superficie.", "Warms itself at the surface."),
  fish("smelt",    "🐟", "Osmera",      "Smelt",        "lake", 0, [12, 70],     5,   6, "Profuma di cetriolo, stranamente.", "Somehow smells of cucumber."),
  fish("lakerudd", "🐠", "Rossoro",     "Rudd",         "lake", 0, [40, 180],    8,   9, "Rosso come un tramonto.", "Red as a sunset."),
  fish("ruffe",    "🐟", "Gremillone",  "Ruffe",        "lake", 1, [80, 450],    16,  13, "Piccolo ma pieno di spine.", "Small but full of spines."),
  fish("burbot",   "🐟", "Bottatrice",  "Burbot",       "lake", 1, [900, 4200],  52,  25, "L'unico pesce che canta di notte.", "The only fish that sings at night."),
  fish("pikeperl", "🐟", "Percia",      "Pikeperch",    "lake", 2, [1400, 6500], 78,  32, "Occhi d'oro nelle acque scure.", "Golden eyes in dark water."),
  fish("vendace",  "🐟", "Bondella",    "Vendace",      "lake", 2, [500, 2600],  62,  29, "Vive dove l'acqua è più fredda.", "Lives where the water is coldest."),
  fish("lakeeel",  "🐍", "Anguilla di lago","Lake eel", "lake", 3, [1600, 6200], 170, 47, "Non torna mai indietro.", "Never turns back."),
  fish("lakechar", "🐟", "Salmerino",   "Lake char",    "lake", 3, [1200, 5200], 175, 48, "Rosso ventre, bianco candore.", "Red belly, snowy white."),
  fish("goldcarp", "🐠", "Carpa dorata","Gold carp",    "lake", 3, [2200, 9000], 210, 52, "Sembra una moneta che nuota.", "Looks like a swimming coin."),

  fish("sprat",    "🐟", "Spratto",     "Sprat",        "sea", 0, [10, 60],      5,   6, "Una nuvola di piccole luci.", "A cloud of tiny lights."),
  fish("horsemack","🐟", "Suro",        "Horse mackerel","sea",0, [60, 320],     9,   10, "Ha le tasche piene di sardine.", "Has pockets full of sardines."),
  fish("sandeel",  "🐟", "Cicerello",   "Sandeel",      "sea", 0, [15, 90],      6,   7, "Si infila nella sabbia come un ago.", "Burrows into sand like a needle."),
  fish("redmullet","🐠", "Triglia",     "Red mullet",   "sea", 1, [250, 1400],   34,  21, "Arrossisce appena lo tocchi.", "Blushes the moment you touch it."),
  fish("pout",     "🐟", "Merluzzo giovane","Pout",     "sea", 1, [300, 1700],   36,  22, "Ha sempre l'aria sorpresa.", "Always looks surprised."),
  fish("whiting",  "🐟", "Merlano",     "Whiting",      "sea", 1, [400, 2200],   42,  24, "Silver come la luna sul mare.", "Silver like the moon on the sea."),
  fish("pollack",  "🐟", "Pollachio",   "Pollack",      "sea", 2, [1000, 5200],  88,  34, "Vive tra le rocce e le alghe.", "Lives among rocks and seaweed."),
  fish("sole",     "🐟", "Sogliola",    "Sole",         "sea", 2, [600, 3400],   72,  30, "Due occhi da una sola parte.", "Two eyes on just one side."),
  fish("halibut",  "🐟", "Ippoglosso",  "Halibut",      "sea", 3, [8000, 32000], 290, 62, "Grande come un tavolo da picnic.", "As big as a picnic table."),
  fish("bluefin",  "🐟", "Tonno rosso", "Bluefin tuna", "sea", 3, [12000, 48000],380, 72, "Un tesoro che non si ferma mai.", "A treasure that never stops."),

  fish("krill",    "🦐", "Krill",       "Krill",        "ocean", 0, [5, 40],      7,   7, "La minuscola luce dell'oceano.", "The tiny light of the ocean."),
  fish("anemone",  "🌊", "Anemone",     "Anemone",      "ocean", 0, [20, 120],    10,  10, "Sembra un fiore ma non lo è.", "Looks like a flower but isn't."),
  fish("cucumber", "🥒", "Cetriolo di mare","Sea cucumber","ocean",0,[80, 400],    14,  12, "Poco attraente, molto utile.", "Un appealing, very useful."),
  fish("jelly",    "🪼", "Medusa",      "Jellyfish",    "ocean", 1, [150, 1200],  38,  22, "Una campanella di vetro vivo.", "A bell of living glass."),
  fish("starfish", "⭐", "Stella marina","Starfish",    "ocean", 1, [100, 800],   34,  21, "Cammina lentamente, senza fretta.", "Walks slowly, in no hurry."),
  fish("hermit",   "🦀", "Granchio eremita","Hermit crab","ocean",1,[120, 900],   40,  23, "Porta la casa sulle spalle.", "Carries its home on its back."),
  fish("moray",    "🐍", "Murena",      "Moray",        "ocean", 2, [2000, 11000],145, 43, "Guarda dalla fessura della roccia.", "Watches from the rock crevice."),
  fish("marlin",   "🐟", "Marlin",      "Marlin",       "ocean", 2, [5000, 22000],190, 50, "Una lancia che corre sott'acqua.", "A spear running underwater."),
  fish("tigershark","🦈","Squalo tigre","Tiger shark",  "ocean", 3, [15000, 55000],420, 78, "Striato come un predatore antico.", "Striped like an ancient predator."),
  fish("giantsquid","🦑","Calamaro gigante","Giant squid","ocean",3,[20000, 70000],520, 88, "Leggende dei marinai, e anche verità.", "Sailors' tales — and also true."),

  /* ── 12 special legendary fish (3 per location) ─────────────────── */
  legend("silvermirror", "🌕", "Specchio d'Argento", "Silver Mirror", "river",
    [9000, 26000], 1800, 210,
    "Solo la luna piena lo rende visibile.",
    "Only the full moon reveals it.",
    { night: true, weather: "sunny" },
    "Si dice che il fiume diventi uno specchio soltanto per lui. Chi lo vede, per un attimo vede anche il cielo.",
    "They say the river becomes a mirror only for it. Whoever sees it, sees the sky for a moment too.",
    "Notte serena", "Clear night", "#dfeaff"),
  legend("currentking", "⚡", "Re delle Correnti", "Current King", "river",
    [14000, 42000], 2600, 270,
    "Nuota solo quando il fiume è in piena.",
    "Swims only when the river runs high.",
    { weather: "storm", bait: "roe" },
    "Nessuno lo ha mai visto in acque calme. Porta con sé il tuono, e la pazienza di chi aspetta da secoli.",
    "Nobody has ever seen it in calm water. It carries the thunder, and the patience of one who has waited for centuries.",
    "Tempesta + Caviale", "Storm + Roe", "#9fd8ff"),
  legend("crystaltrout","❄️","Trota Cristallo","Crystal Trout","river",
    [7000, 22000], 1500, 195,
    "Il freddo la rende trasparente.",
    "The cold turns it transparent.",
    { season: 3, weather: "snow" },
    "Un pesce di ghiaccio che si scioglierebbe al primo sole. È l'inverno che lo protegge, non tu.",
    "A fish of ice that would melt at the first sun. The winter protects it, not you.",
    "Inverno + Neve", "Winter + Snow", "#bff3ff"),

  legend("lakeguardian","🛡️","Guardiano del Lago","Lake Guardian","lake",
    [18000, 50000], 2900, 290,
    "Veglia sulle acque profonde di notte.",
    "Watches the deep waters at night.",
    { night: true, bait: "glow", minLevel: 6 },
    "Il lago lo ha scelto come custode. Solo una luce artificiale riesce a convincerlo a farsi vedere.",
    "The lake chose it as guardian. Only an artificial light can persuade it to be seen.",
    "Notte + Esca luminosa · Lv6", "Night + Glow bait · Lv6", "#b6f0d0"),
  legend("autumnnymph","🍂","Ninfa d'Autunno","Autumn Nymph","lake",
    [9000, 28000], 1900, 230,
    "Appare tra le foglie che cadono.",
    "Appears among the falling leaves.",
    { season: 2, weather: "rain" },
    "Vestita di foglie rosse, scende sul lago quando l'estate è finita. Se la peschi, l'autunno ti ha benedetto.",
    "Dressed in red leaves, it descends to the lake when summer is over. Catch it and autumn has blessed you.",
    "Autunno + Pioggia", "Autumn + Rain", "#ffc38a"),
  legend("imperialcarp","👑","Carpa Imperiale","Imperial Carp","lake",
    [12000, 36000], 2400, 255,
    "Ama il sole e il mais più dolce.",
    "Loves the sun and the sweetest corn.",
    { season: 1, weather: "sunny", bait: "corn" },
    "Porta una corona che nessun pescatore ha mai osato togliere. Preferisce il mais al caviale, e il sole a tutto il resto.",
    "It wears a crown no angler has ever dared remove. It prefers corn to roe, and the sun to everything else.",
    "Estate + Sole + Mais", "Summer + Sun + Corn", "#ffe9a3"),

  legend("mermaid","🧜","Sirena","Mermaid","sea",
    [16000, 48000], 2800, 285,
    "Canta di notte, quando il mare è calmo.",
    "Sings at night, when the sea is calm.",
    { night: true, weather: "sunny", bait: "glow" },
    "I pescatori giurano di averla sentita cantare. Nessuno giura di averla vista davvero — fino ad ora.",
    "Fishermen swear they heard her sing. None swear they truly saw her — until now.",
    "Notte serena + Esca luminosa", "Clear night + Glow bait", "#a8e6ff"),
  legend("leviathan","🌊","Leviatano","Leviathan","sea",
    [30000, 90000], 4200, 360,
    "Solo una tempesta può destarlo.",
    "Only a storm can wake it.",
    { weather: "storm", bait: "roe", minLevel: 9 },
    "Quando il mare si rabbia, qualcosa di enorme si muove sotto. Non è una leggenda: ha soltanto bisogno di un'esca degna di lui.",
    "When the sea rages, something enormous moves below. It isn't a legend: it only needs bait worthy of it.",
    "Tempesta + Caviale · Lv9", "Storm + Roe · Lv9", "#8fb8ff"),
  legend("blackpearl","🖤","Perla Nera","Black Pearl","sea",
    [10000, 30000], 2100, 245,
    "La pioggia primaverile la fa affiorare.",
    "Spring rain makes it surface.",
    { season: 0, weather: "rain" },
    "Una perla nera cresciuta dove nessuno ha mai cercato. Il mare la nasconde, la pioggia la tradisce.",
    "A black pearl grown where nobody ever looked. The sea hides it, the rain betrays it.",
    "Primavera + Pioggia", "Spring + Rain", "#cfc7ff"),

  legend("seadragon","🐉","Drago Marinaio","Sea Dragon","ocean",
    [45000, 120000], 5600, 420,
    "Vive nelle profondità, e odia la luce.",
    "Lives in the depths, and hates the light.",
    { night: true, bait: "roe", minLevel: 12 },
    "Il mare profondo ha i suoi draghi. Solo chi ha imparato a conoscerlo può sperare di intravederlo — e solo di notte.",
    "The deep sea has its own dragons. Only one who has learned to know it can hope to glimpse one — and only at night.",
    "Notte + Caviale · Lv12", "Night + Roe · Lv12", "#9affc8"),
  legend("spiritwhale","👻","Balena Spirito","Spirit Whale","ocean",
    [60000, 160000], 6800, 460,
    "Appare sotto la neve, d'inverno.",
    "Appears beneath snowfall, in winter.",
    { season: 3, weather: "snow" },
    "Non lascia bolle, né ombra. Nuota sotto la neve come un ricordo che non vuole andarsene.",
    "It leaves no bubbles, no shadow. It swims beneath the snow like a memory that refuses to leave.",
    "Inverno + Neve", "Winter + Snow", "#e6f7ff"),
  legend("ambercrown","🔆","Corona d'Ambra","Amber Crown","ocean",
    [38000, 100000], 5000, 400,
    "Il sole estivo la illumina sott'acqua.",
    "The summer sun lights it underwater.",
    { season: 1, weather: "sunny", bait: "glow" },
    "Una corona di ambra antico, più vecchia di qualsiasi mappa. Il sole la trova anche dove lo sguardo non arriva.",
    "A crown of ancient amber, older than any map. The sun finds it even where the eye cannot reach.",
    "Estate + Sole + Esca luminosa", "Summer + Sun + Glow bait", "#ffd36e")
];

export const BY_ID = Object.fromEntries(FISH.map((f) => [f.id, f]));
export const LEGENDS = FISH.filter((f) => f.legend);
export const NORMAL = FISH.filter((f) => !f.legend);
export const LOCATIONS_LIST = ["river", "lake", "sea", "ocean"];

const asList = (v) => (v === undefined ? null : Array.isArray(v) ? v : [v]);

/* Every declared condition must match the current world state. */
export function matchesCondition(f, ctx) {
  if (!f.condition) return true;
  const c = f.condition;
  const weather = asList(c.weather);
  if (weather && !weather.includes(ctx.weather)) return false;
  const season = asList(c.season);
  if (season && !season.includes(ctx.season)) return false;
  const bait = asList(c.bait);
  if (bait && !bait.includes(ctx.bait)) return false;
  if (c.night !== undefined && !!c.night !== !!ctx.night) return false;
  if (c.minLuck !== undefined && (ctx.luck || 0) < c.minLuck) return false;
  if (c.minLevel !== undefined && (ctx.level || 1) < c.minLevel) return false;
  return true;
}

export function legendChance(luck = 0, ctx = {}) {
  const base = 0.006;
  const conditionBoost = ctx.conditionBoost || 1;
  return Math.min(0.09, base * (1 + luck * 0.45) * conditionBoost);
}

/* Pure fish selection: injectable RNG so Node tests can drive it. */
export function chooseFish(ctx, rand = Math.random) {
  const pool = NORMAL.filter((f) => f.loc === ctx.loc);
  const luck = ctx.luck || 0;

  const eligible = LEGENDS.filter((f) => f.loc === ctx.loc && matchesCondition(f, ctx));
  if (eligible.length && rand() < legendChance(luck, ctx)) {
    return eligible[Math.floor(rand() * eligible.length) % eligible.length];
  }

  const weights = [0.4, 0.3, 0.18, 0.09, 0.03].map((w, r) => w * (1 + luck * r * 0.7));
  const total = weights.reduce((a, b) => a + b, 0);
  let x = rand() * total, r = 0;
  for (; r < 4; r++) { if (x < weights[r]) break; x -= weights[r]; }
  const candidates = pool.filter((f) => f.r === r);
  return candidates[Math.floor(rand() * candidates.length) % candidates.length] || pool[0];
}

export function conditionText(f, lang = "en") {
  if (!f.legend) return "";
  return (lang === "it" ? f.hint_it : f.hint_en) || "";
}
