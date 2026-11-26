import type { Policy } from "./types";

/*
 * Twelve policies, three per family. Effects are points on the 0–100
 * indicator scale, not euro amounts: the simulation is about direction and
 * trade-offs, not fiscal forecasting.
 */
export const POLICIES: Policy[] = [
  {
    id: "asili-aperti",
    family: "persone",
    title: { it: "Asili aperti", en: "Open nurseries" },
    blurb: {
      it: "Nidi, tempo pieno e educatrici di quartiere: un posto per ogni bambino, un’ora in più per chi lavora.",
      en: "Nurseries, full-day school and neighbourhood educators: a place for every child, an extra hour for workers."
    },
    cost: 2,
    effects: { giovani: 7, occupazione: 3, comunita: 2 },
    evidence: {
      it: "La quota di residenti sotto i 15 anni e il tasso di occupazione femminile sono i due numeri che decidono se una città trattiene le famiglie.",
      en: "The share of residents under 15 and the female employment rate are the two numbers that decide whether a town keeps its families."
    },
    source: "istat-census",
    tags: ["famiglie", "lavoro", "scuola"]
  },
  {
    id: "patto-generazioni",
    family: "persone",
    title: { it: "Patto tra generazioni", en: "Generations pact" },
    blurb: {
      it: "Anziani, scuole e associazioni firmano un patto: tempo, competenze e spazi condivisi invece di due solitudini.",
      en: "Older residents, schools and associations sign a pact: time, skills and shared spaces instead of two solitudes."
    },
    cost: 1,
    effects: { invecchiamento: 6, comunita: 7, scuola: 2 },
    evidence: {
      it: "L’indice di vecchiaia racconta quante persone over 65 ci sono ogni 100 under 15: è la fotografia più brutale del ricambio generazionale.",
      en: "The old-age index counts people over 65 per 100 under-15s: it is the bluntest picture of generational turnover."
    },
    source: "istat-posas",
    tags: ["anziani", "giovani", "comunita"]
  },
  {
    id: "reddito-ponte",
    family: "persone",
    title: { it: "Reddito ponte", en: "Bridge income" },
    blurb: {
      it: "Un sostegno temporaneo per chi perde il lavoro e un percorso di riqualificazione, non un sussidio perpetuo.",
      en: "Temporary support for those who lose a job, plus a reskilling path, not a permanent subsidy."
    },
    cost: 3,
    effects: { reddito: 8, occupazione: 4, comunita: 3 },
    evidence: {
      it: "Il reddito medio comunale è la base su cui si calcola l’addizionale IRPEF e misura quanto il lavoro locale riesce a sostenere le famiglie.",
      en: "Mean municipal income is the base for the local income tax and measures how far local work sustains families."
    },
    source: "mef-income",
    tags: ["lavoro", "reddito", "famiglie"]
  },
  {
    id: "rigenera-non-consumare",
    family: "abitare",
    title: { it: "Rigenera, non consumare", en: "Regenerate, don’t consume" },
    blurb: {
      it: "Case vuote, capannoni e cortili tornano a vivere. Un piano che costruisce sul già costruito, prima di aprire un nuovo cantiere.",
      en: "Empty homes, warehouses and courtyards come back to life. A plan that builds on what already exists before breaking new ground."
    },
    cost: 2,
    effects: { suolo: 8, casa: 5, abitato: 6, turismo: 2 },
    evidence: {
      it: "Il consumo di suolo è la traccia fisica della città che cresce: recuperare un edificio vuoto evita di consumarne un altro.",
      en: "Land consumption is the physical trace of a growing town: reusing an empty building avoids consuming another."
    },
    source: "ispra-soil",
    tags: ["casa", "suolo", "rigenerazione"]
  },
  {
    id: "affitto-giovani",
    family: "abitare",
    title: { it: "Affitto ai giovani", en: "Rent for the young" },
    blurb: {
      it: "Un fondo di garanzia e canoni calmierati per chi ha un contratto e nessun patrimonio. La casa non deve essere un lasciapassare per andarsene.",
      en: "A guarantee fund and controlled rents for those with a job and no inheritance. Housing should not be a permit to leave."
    },
    cost: 2,
    effects: { casa: 9, giovani: 3, reddito: 2, abitato: 2 },
    evidence: {
      it: "Il rapporto tra reddito medio e quotazione OMI dice quanto pesa un metro quadrato sul salario di chi ci abita.",
      en: "The ratio between mean income and OMI prices shows how much a square metre weighs on the salary of those who live there."
    },
    source: "mef-omi",
    tags: ["casa", "giovani", "affitto"]
  },
  {
    id: "albergo-diffuso",
    family: "abitare",
    title: { it: "Albergo diffuso", en: "Scattered hotel" },
    blurb: {
      it: "Ospitalità nelle case del centro, gestita da famiglie e cooperative. Il turismo entra nelle vite, non nei capannoni fuori porta.",
      en: "Hospitality in the homes of the old centre, run by families and cooperatives. Tourism enters lives, not out-of-town warehouses."
    },
    cost: 1,
    effects: { turismo: 9, reddito: 3, casa: -3, suolo: -2, abitato: 3 },
    evidence: {
      it: "L’indice di turisticità rapporta i letti ricettivi alla popolazione: racconta quanto una città è attrezzata per ospitare, ma anche quanto è esposta.",
      en: "The tourism index relates beds to residents: it shows how equipped a town is to host, and how exposed it is."
    },
    source: "istat-tourism",
    tags: ["turismo", "casa", "centro storico"]
  },
  {
    id: "tram-pianura",
    family: "mobilita",
    title: { it: "Tram di pianura", en: "Plain tram" },
    blurb: {
      it: "Un tram leggero collega il centro, la stazione e i quartieri. Ogni corsa in più è un’auto in meno davanti alla scuola.",
      en: "A light tram links the centre, the station and the neighbourhoods. Every extra ride is one less car outside the school."
    },
    cost: 3,
    effects: { aria: 7, auto: 8, ev: 3, incidenti: 2 },
    evidence: {
      it: "Il tasso di motorizzazione e le polveri sottili raccontano la stessa dipendenza: più auto, più aria sporca e più incidenti.",
      en: "Car ownership and fine dust tell the same story: more cars, dirtier air and more crashes."
    },
    source: "aci-vehicles",
    tags: ["trasporti", "aria", "sicurezza"]
  },
  {
    id: "citta-15-minuti",
    family: "mobilita",
    title: { it: "Città dei 15 minuti", en: "15-minute town" },
    blurb: {
      it: "Scuole, negozi, ambulatori e parchi a un quarto d’ora a piedi. La prossimità è la prima infrastruttura.",
      en: "Schools, shops, clinics and parks within a quarter-hour walk. Proximity is the first infrastructure."
    },
    cost: 2,
    effects: { aria: 5, auto: 5, comunita: 5, casa: 2 },
    evidence: {
      it: "Gli incidenti e i feriti ogni 10.000 abitanti misurano quanto la città è organizzata intorno all’auto.",
      en: "Crashes and injuries per 10,000 residents measure how far the town is organised around the car."
    },
    source: "aci-vehicles",
    tags: ["quartieri", "commercio", "aria"]
  },
  {
    id: "corriere-elettrico",
    family: "mobilita",
    title: { it: "Corriere elettrico", en: "Electric last mile" },
    blurb: {
      it: "Una piattaforma logistica condivisa e furgoni elettrici per l’ultimo miglio. Meno furgoni vuoti, meno rumore.",
      en: "A shared logistics platform and electric vans for the last mile. Fewer empty vans, less noise."
    },
    cost: 1,
    effects: { aria: 3, ev: 5, digitale: 2 },
    evidence: {
      it: "I punti di ricarica ogni 1.000 abitanti dicono se la transizione elettrica è un’infrastruttura o uno spot.",
      en: "Charging points per 1,000 residents show whether the electric transition is infrastructure or a photo opportunity."
    },
    source: "gse-ev",
    tags: ["logistica", "elettrico", "aria"]
  },
  {
    id: "scuola-aperta",
    family: "servizi",
    title: { it: "Scuola aperta", en: "Open school" },
    blurb: {
      it: "Palestre, biblioteche e cortili scolastici aperti al quartiere dopo le lezioni. La scuola come ultima piazza pubblica.",
      en: "Gyms, libraries and schoolyards open to the neighbourhood after class. School as the last public square."
    },
    cost: 2,
    effects: { scuola: 8, giovani: 4, comunita: 4 },
    evidence: {
      it: "I plessi scolastici ogni 1.000 abitanti sono un indicatore di presenza, non solo di edilizia: dicono dove la città si ritrova.",
      en: "School sites per 1,000 residents are a measure of presence, not just buildings: they show where the town gathers."
    },
    source: "miur-schools",
    tags: ["scuola", "quartieri", "giovani"]
  },
  {
    id: "telemedicina",
    family: "servizi",
    title: { it: "Telemedicina di prossimità", en: "Neighbourhood telemedicine" },
    blurb: {
      it: "Un ambulatorio digitale nelle farmacie e nelle case di quartiere. Meno viaggi in ospedale per chi ha più bisogno di restare.",
      en: "A digital clinic in pharmacies and neighbourhood houses. Fewer hospital trips for those who most need to stay."
    },
    cost: 2,
    effects: { comunita: 7, invecchiamento: 5, digitale: 5 },
    evidence: {
      it: "La copertura FTTH è la condizione materiale perché la telemedicina non escluda proprio gli anziani che dovrebbe aiutare.",
      en: "FTTH coverage is the material condition for telemedicine not to exclude the older residents it should help."
    },
    source: "agcom-broadband",
    tags: ["sanità", "anziani", "digitale"]
  },
  {
    id: "banda-ovunque",
    family: "servizi",
    title: { it: "Banda ovunque", en: "Broadband everywhere" },
    blurb: {
      it: "Fibra nelle frazioni e spazi di coworking nei centri minori. Il lavoro non deve per forza passare dal capoluogo.",
      en: "Fibre in the hamlets and coworking spaces in small centres. Work should not have to pass through the capital."
    },
    cost: 1,
    effects: { digitale: 8, reddito: 3, occupazione: 2 },
    evidence: {
      it: "La copertura FTTH è già alta in molti comuni: il divario non è più solo nelle reti, ma nelle competenze e nei luoghi.",
      en: "FTTH coverage is already high in many towns: the gap is no longer only in networks, but in skills and places."
    },
    source: "agcom-broadband",
    tags: ["digitale", "lavoro", "frazioni"]
  }
];

export function policyById(id: string): Policy | undefined {
  return POLICIES.find((policy) => policy.id === id);
}
