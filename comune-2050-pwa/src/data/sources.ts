/*
 * Source registry. Every indicator, policy card and event card points here,
 * so the app can always show the producer, the original link, the licence
 * and the extraction date.
 */
export interface Source {
  name: string;
  short: string;
  producer: string;
  url: string;
  license: string;
  extracted: string;
  note?: string;
}

export const SOURCES = {
  "istat-posas": {
    name: "ISTAT — Popolazione residente per età e sesso (POSAS)",
    short: "ISTAT POSAS",
    producer: "ISTAT",
    url: "https://demo.istat.it/",
    license: "CC BY 4.0",
    extracted: "2026-11-26",
    note: "Popolazione al 1° gennaio 2026, stima; serie storica 2022–2026."
  },
  "istat-commuting": {
    name: "ISTAT — Matrice pendolarismo per lavoro 2021",
    short: "ISTAT Pendolarismo",
    producer: "ISTAT",
    url: "https://esploradati.istat.it/databrowser/DWL/PERMPOP/MATPEN/matrix_pendoLAVORO_2021.zip",
    license: "CC BY 3.0 IT",
    extracted: "2026-05-18",
    note: "Spostamenti casa-lavoro per comune, rilevazione 2021."
  },
  "istat-d7b": {
    name: "ISTAT — Bilancio demografico mensile (D7B)",
    short: "ISTAT D7B",
    producer: "ISTAT",
    url: "https://demo.istat.it/",
    license: "CC BY 4.0",
    extracted: "2026-11-26",
    note: "Nati, morti, saldo naturale e migratorio, anno 2024."
  },
  "istat-census": {
    name: "ISTAT — Censimento permanente, basi territoriali e variabili censuarie",
    short: "ISTAT Censimento",
    producer: "ISTAT",
    url: "https://www.istat.it/notizia/basi-territoriali-e-variabili-censuarie/",
    license: "CC BY 3.0 IT",
    extracted: "2026-07-28",
    note: "Occupazione, istruzione, famiglie e abitazioni vuote; rilevazione 2023."
  },
  "ispra-soil": {
    name: "ISPRA / SNPA — Consumo di suolo, rischio idrogeologico e rifiuti",
    short: "ISPRA / SNPA",
    producer: "ISPRA e SNPA",
    url: "https://www.snpambiente.it/temi/suolo/",
    license: "CC BY 4.0",
    extracted: "2026-05-08",
    note: "Consumo di suolo e raccolta differenziata, anno 2024."
  },
  "ispra-air": {
    name: "ISPRA / SNPA — Qualità dell’aria",
    short: "ISPRA Aria",
    producer: "ISPRA e SNPA",
    url: "https://www.snpambiente.it/temi/aria/",
    license: "CC BY 4.0",
    extracted: "2026-10-06",
    note: "Medie 2025 delle stazioni urbane; per Fidenza il dato 2025 non è disponibile."
  },
  "istat-tourism": {
    name: "ISTAT — Capacità ed esercizio degli esercizi ricettivi",
    short: "ISTAT Turismo",
    producer: "ISTAT",
    url: "https://esploradati.istat.it/",
    license: "CC BY 4.0",
    extracted: "2026-11-26",
    note: "Strutture e letti, anno 2025."
  },
  "mef-income": {
    name: "MEF — Redditi IRPEF a livello comunale",
    short: "MEF Redditi",
    producer: "Ministero dell’Economia e delle Finanze",
    url: "https://www.finanze.gov.it/it/statistiche-fiscali/open-data-comunale-principali-variabili-irpef/",
    license: "CC BY 3.0",
    extracted: "2026-11-26",
    note: "Reddito medio per dichiarante, anno fiscale 2024."
  },
  "mef-omi": {
    name: "Agenzia delle Entrate — Osservatorio del Mercato Immobiliare (OMI)",
    short: "OMI",
    producer: "Agenzia delle Entrate",
    url: "https://www1.agenziaentrate.gov.it/servizi/geopoi_omi/",
    license: "CC BY 4.0",
    extracted: "2026-10-17",
    note: "Quotazioni medie residenziali, semestre 2026/1."
  },
  "aci-vehicles": {
    name: "ISTAT / ACI — Parco veicoli e incidenti stradali",
    short: "ISTAT / ACI",
    producer: "ISTAT e ACI",
    url: "https://www.aci.it/",
    license: "CC BY 4.0 (ISTAT); open data ACI",
    extracted: "2026-10-07",
    note: "Parco veicoli e incidenti 2024; per Trento il dato comunale del parco non è confrontabile."
  },
  "miur-schools": {
    name: "MIUR — Anagrafe delle scuole statali",
    short: "MIUR Scuole",
    producer: "Ministero dell’Istruzione e del Merito",
    url: "https://dati.istruzione.it/",
    license: "Open data della PA",
    extracted: "2026-09-05",
    note: "Plessi scolastici, anno 2026/27."
  },
  "agcom-broadband": {
    name: "AGCOM — Broadband Map",
    short: "AGCOM",
    producer: "AGCOM",
    url: "https://geo.agcom.it/reportistica/",
    license: "CC BY 4.0",
    extracted: "2026-11-05",
    note: "Copertura FTTH dichiarata, 30/09/2026."
  },
  "gse-ev": {
    name: "GSE — Piattaforma Unica Nazionale dei punti di ricarica",
    short: "GSE PUN",
    producer: "GSE",
    url: "https://www.piattaformaunicanazionale.it/idr",
    license: "CC BY 4.0",
    extracted: "2026-11-26",
    note: "Punti di ricarica per veicoli elettrici, snapshot 26/11/2026."
  },
  runts: {
    name: "RUNTS — Registro Unico Nazionale del Terzo Settore",
    short: "RUNTS",
    producer: "Ministero del Lavoro e delle Politiche Sociali",
    url: "https://servizi.lavoro.gov.it/runts/it-it/Lista-enti",
    license: "Open data della PA",
    extracted: "2026-11-23",
    note: "Enti iscritti, snapshot 23/11/2026."
  },
  "regis-pnrr": {
    name: "Italia Domani — Sistema ReGiS, progetti PNRR",
    short: "ReGiS PNRR",
    producer: "Presidenza del Consiglio — Italia Domani",
    url: "https://www.italiadomani.gov.it/",
    license: "Open data della PA",
    extracted: "2026-11-26",
    note: "Finanziamento PNRR assegnato ai progetti comunali."
  },
  "mds-health": {
    name: "Ministero della Salute — Farmacie e strutture sanitarie",
    short: "Min. Salute",
    producer: "Ministero della Salute",
    url: "https://www.dati.salute.gov.it/it/dataset/farmacie",
    license: "IODL 2.0",
    extracted: "2026-11-26",
    note: "Farmacie e parafarmacie, snapshot 26/11/2026."
  },
  cruscotto: {
    name: "Cruscotto Italia — federatore dei dati comunali",
    short: "Cruscotto Italia",
    producer: "AgID",
    url: "https://cruscotto-italia.dati.gov.it/",
    license: "CC BY 4.0 per la piattaforma; dati secondo le licenze dei singoli enti",
    extracted: "2026-11-26",
    note: "Interfaccia di estrazione: dashboard comunale e endpoint MCP pubblico."
  }
} as const satisfies Record<string, Source>;

export type SourceId = keyof typeof SOURCES;

export function source(id: SourceId): Source {
  return SOURCES[id];
}

export const SOURCE_ORDER: SourceId[] = [
  "istat-posas",
  "istat-d7b",
  "istat-commuting",
  "istat-census",
  "ispra-soil",
  "ispra-air",
  "istat-tourism",
  "mef-income",
  "mef-omi",
  "aci-vehicles",
  "miur-schools",
  "agcom-broadband",
  "gse-ev",
  "runts",
  "regis-pnrr",
  "mds-health",
  "cruscotto"
];
