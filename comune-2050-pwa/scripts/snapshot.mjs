#!/usr/bin/env node
/*
 * COMUNE 2050 — build-time data snapshot.
 *
 * Fetches the six comuni from Cruscotto Italia (dati.gov.it) through its
 * public MCP endpoint and writes src/data/comuni.json. The PWA never calls
 * the network at runtime: this file is the only data source it knows.
 *
 *   node scripts/snapshot.mjs
 *
 * The endpoint is a federation of ISTAT, ISPRA, MEF, MIUR, AGCOM, GSE,
 * RUNTS, Italia Domani and other public datasets. Each field keeps its
 * source id so every card in the app can cite the original producer.
 */
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const MCP = "https://cruscotto-italia-mcp.agid.workers.dev/mcp";

const COMUNI = [
  {
    code: "034014",
    palette: { sky: "#f7d7a8", ground: "#c8b98a", accent: "#c65d3b", roof: "#9d4b35", water: "#7fa7a5" },
    tagline: {
      it: "La città della Francigena, tra campi, torrente e treno.",
      en: "The Via Francigena town, between fields, river and railway."
    }
  },
  {
    code: "100005",
    palette: { sky: "#f3c9b3", ground: "#c9a68a", accent: "#b7513d", roof: "#7d3a30", water: "#8fa9a3" },
    tagline: {
      it: "Il distretto tessile che cuce il futuro, filo dopo filo.",
      en: "The textile district stitching the future, thread by thread."
    }
  },
  {
    code: "075035",
    palette: { sky: "#f7e2b8", ground: "#d8c49c", accent: "#b9843a", roof: "#a4652f", water: "#6fa8bd" },
    tagline: {
      it: "La pietra dorata regge il peso del turismo e della storia.",
      en: "Golden stone carries the weight of tourism and history."
    }
  },
  {
    code: "066049",
    palette: { sky: "#c9d9e6", ground: "#b9b6a7", accent: "#8a6a4f", roof: "#6e5142", water: "#7d9aab" },
    tagline: {
      it: "Dopo il terremoto, la città si ricuce intorno alla montagna.",
      en: "After the earthquake, the city stitches itself around the mountain."
    }
  },
  {
    code: "118006",
    palette: { sky: "#f8d9b0", ground: "#d7c39a", accent: "#d27b45", roof: "#a95338", water: "#5f9fb4" },
    tagline: {
      it: "Il mare porta turismo, ma i giovani salpano verso altrove.",
      en: "The sea brings tourism, but young people sail away."
    }
  },
  {
    code: "022205",
    palette: { sky: "#cfe0e8", ground: "#b9c6a8", accent: "#6f8f68", roof: "#567052", water: "#7ba9b5" },
    tagline: {
      it: "Le Alpi come laboratorio: servizi, cura e buona amministrazione.",
      en: "The Alps as a laboratory: services, care and good government."
    }
  }
];

const SOURCE_BY_METRIC = {
  giovani: "istat-posas",
  invecchiamento: "istat-posas",
  occupazione: "istat-census",
  reddito: "mef-income",
  suolo: "ispra-soil",
  casa: "mef-omi",
  turismo: "istat-tourism",
  abitato: "istat-census",
  aria: "ispra-air",
  auto: "aci-vehicles",
  incidenti: "aci-vehicles",
  ev: "gse-ev",
  scuola: "miur-schools",
  digitale: "agcom-broadband",
  comunita: "runts",
  pnrr: "regis-pnrr"
};

const SOURCES = [
  "istat-posas",
  "istat-census",
  "istat-d7b",
  "istat-commuting",
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

let nextId = 1;
async function call(name, args) {
  const response = await fetch(MCP, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "User-Agent": "comune-2050-snapshot/1.0"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: nextId++,
      method: "tools/call",
      params: { name, arguments: args }
    })
  });
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
  const body = await response.json();
  if (body.error) throw new Error(`${name}: ${body.error.message}`);
  return body.result;
}

async function dashboard(code) {
  /* The public endpoint is rate-limited. A local cache makes the snapshot
     reproducible and lets CI-free refreshes reuse an earlier extraction. */
  const cache = process.env.COMUNE2050_CACHE;
  if (cache) {
    try {
      const raw = await readFile(join(cache, `dashboard-${code}.json`), "utf8");
      console.log(`(cache ${code})`);
      return JSON.parse(raw);
    } catch {
      /* fall through to the network */
    }
  }
  const result = await call("comune_dashboard", { istat_code: code });
  if (result?.structuredContent && typeof result.structuredContent === "object") {
    return result.structuredContent;
  }
  const text = result?.content?.[0]?.text;
  if (!text) throw new Error(`No dashboard text for ${code}`);
  return JSON.parse(text);
}

const isNum = (value) => typeof value === "number" && Number.isFinite(value);
const numberOrNull = (value) => (isNum(value) ? value : null);
const round = (value, digits = 1) => {
  if (!isNum(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};
const ratio = (part, total) => (isNum(part) && isNum(total) && total > 0 ? (part / total) * 100 : null);

function incomeOf(dashboardData) {
  const years = dashboardData.redditi?.anni ?? {};
  const latest = Object.keys(years).sort().at(-1);
  const row = latest ? years[latest] : null;
  return (
    row?.reddito_complessivo?.medio_per_dichiarante ??
    row?.reddito_complessivo?.medio ??
    null
  );
}

function build(meta, data) {
  const anagrafica = data.anagrafica ?? {};
  const demografia = data.demografia ?? {};
  const profilo = data.profilo ?? {};
  const lavoro = profilo.lavoro ?? {};
  const famiglia = profilo.famiglie ?? {};
  const redditi = data.redditi ?? {};
  const omi = data.omi?.kpi ?? {};
  const turismo = data.turismo?.capacita_comune ?? {};
  const territorio = data.territorio ?? {};
  const ambiente = territorio.kpi ?? {};
  const aria = data.aria?.ultimo_anno ?? {};
  const veicoli = data.veicoli?.parco_veicoli ?? {};
  const incidenti = data.veicoli?.incidenti?.ultimo_anno ?? {};
  const scuole = data.scuole?.kpi ?? {};
  const banda = data.agcom_bbmap?.kpi ?? {};
  const runts = data.runts?.kpi ?? {};
  const pnrr = data.pnrr?.kpi ?? {};
  const censimento = data.censimento?.kpi_comune ?? {};
  const morfologia = data.morfologia?.stats ?? {};
  const pendolarismo = data.pendolarismo?.kpi ?? {};
  const energia = Array.isArray(data.pun?.punti) ? data.pun.punti.length : null;
  const farmacie = data.sanita_mds?.farmacie?.kpi?.n_totale ?? null;

  const serie = (demografia.serie_storica?.punti ?? [])
    .filter((point) => isNum(point.anno) && isNum(point.popolazione))
    .map((point) => ({ year: point.anno, value: point.popolazione, estimate: Boolean(point.stima) }));
  const population = demografia.popolazione_totale;
  const start = serie.find((point) => point.year === 2022)?.value;
  const end = serie.find((point) => point.year === 2026)?.value ?? population;
  const annualGrowth =
    isNum(start) && isNum(end) && start > 0 ? Math.pow(end / start, 1 / 4) - 1 : 0;
  const annualGrowthPct = round(annualGrowth * 100, 2);
  const population2050 = isNum(population)
    ? Math.round(population * Math.pow(1 + annualGrowthPct / 100, 24))
    : null;

  const fasce = demografia.fasce_eta ?? {};
  const under15 = fasce["0_14"]?.n ?? null;
  const over65 = fasce["65_piu"]?.n ?? null;
  const income = incomeOf(data);
  const omiMean = omi.residenziale_medio ?? null;
  const vacant = censimento.abitazioni_vuote;
  const dwellings = censimento.abitazioni_totali;
  const vehiclesPer1000 = veicoli._unreliable ? null : veicoli.tasso_motorizzazione_per_1000_ab ?? null;
  const evPer1000 =
    isNum(energia) && isNum(population) && population > 0 ? (energia / population) * 1000 : null;
  const schoolsPer1000 =
    isNum(scuole.n_scuole) && isNum(population) && population > 0
      ? (scuole.n_scuole / population) * 1000
      : null;
  const thirdSectorPer1000 =
    isNum(runts.n_totale) && isNum(population) && population > 0
      ? (runts.n_totale / population) * 1000
      : null;
  const pnrrPerCapita =
    isNum(pnrr.totale_finanziamento_pnrr) && isNum(population) && population > 0
      ? pnrr.totale_finanziamento_pnrr / population
      : null;
  const pharmaciesPer1000 =
    isNum(farmacie) && isNum(population) && population > 0 ? (farmacie / population) * 1000 : null;

  return {
    identity: {
      istat: anagrafica.istat_code ?? anagrafica.istat ?? meta.code,
      name: anagrafica.denominazione ?? anagrafica.nome ?? "",
      province: anagrafica.provincia ?? "",
      region: anagrafica.regione ?? "",
      codiceCatastale: anagrafica.codice_catastale ?? null
    },
    palette: meta.palette,
    tagline: meta.tagline,
    population: {
      total: population,
      year: 2026,
      estimate: Boolean(demografia._stima),
      series: serie,
      births: demografia.dinamica?.anni?.at(-1)?.nati ?? null,
      deaths: demografia.dinamica?.anni?.at(-1)?.morti ?? null,
      naturalBalance: demografia.dinamica?.anni?.at(-1)?.saldo_naturale ?? null,
      under15: { count: under15, pct: fasce["0_14"]?.pct ?? null },
      over65: { count: over65, pct: fasce["65_piu"]?.pct ?? null },
      medianAge: demografia.eta_media ?? null,
      oldAgeIndex: demografia.indice_vecchiaia ?? null,
      dependencyIndex: demografia.indice_dipendenza ?? null
    },
    economy: {
      employmentRate: lavoro.tasso_occupazione ?? null,
      unemploymentRate: lavoro.tasso_disoccupazione ?? null,
      activityRate: lavoro.tasso_attivita ?? null,
      incomeMean: income,
      families: famiglia.n_famiglie ?? null,
      averageFamily: famiglia.dim_media_famiglia ?? null
    },
    housing: {
      omiMean,
      omiMin: omi.residenziale_min ?? null,
      omiMax: omi.residenziale_max ?? null,
      vacantDwellingsPct: ratio(vacant, dwellings),
      tourismBeds: turismo.totale_letti ?? null,
      tourismStructures: turismo.totale_strutture ?? null,
      tourismBedsPer100: turismo.indice_turisticita_per_100ab ?? null
    },
    environment: {
      areaKm2: ambiente.ar_kmq ?? morfologia.area_km2 ?? null,
      altitudeMean: morfologia.elev_mean ?? null,
      soilConsumptionPct: ambiente.suolo_consumato_pct ?? null,
      soilConsumptionYear: ambiente.suolo_consumato_anno ?? null,
      recyclingPct: ambiente.rd_pct_ultimo_anno ?? null,
      wasteKgPerPerson: ambiente.kg_per_abitante_ultimo_anno ?? null,
      landslidePopulationPct: ambiente.popolazione_frane_p3p4_pct ?? null,
      seismicZone: territorio.classificazione_sismica?.zona_sismica ?? null,
      pm10: aria.pm10?.media ?? null,
      pm25: aria.pm25?.media ?? null,
      no2: aria.no2?.media ?? null,
      airYear: isNum(aria.anno) ? aria.anno : null
    },
    mobility: {
      commutersOut: pendolarismo.uscenti_totali ?? null,
      commutersIn: pendolarismo.entranti_totali ?? null,
      commutingBalance: pendolarismo.saldo_netto ?? null,
      selfContainmentPct: pendolarismo.auto_contenimento_pct ?? null,
      vehiclesPer1000,
      vehiclesTotal: veicoli.totale ?? null,
      evPoints: energia,
      evPer1000,
      accidents: incidenti.incidenti ?? null,
      injuriesPer10k: incidenti.feriti_per_10k_ab ?? null,
      deathsPer10k: incidenti.morti_per_10k_ab ?? null
    },
    services: {
      schools: scuole.n_scuole ?? null,
      schoolsPer1000,
      schoolYear: data.scuole?.anno_scolastico ?? null,
      ftthPct: banda.copertura_ftth_desi_pct ?? null,
      thirdSector: runts.n_totale ?? null,
      thirdSectorPer1000,
      pnrrProjects: pnrr.n_progetti ?? null,
      pnrrPerCapita,
      pharmacies: farmacie,
      pharmaciesPer1000,
      incomeYear: redditi.anni ? Number(Object.keys(redditi.anni).sort().at(-1)) : null
    },
    baseline: {
      annualGrowth: annualGrowthPct,
      population2050
    },
    sourceByMetric: SOURCE_BY_METRIC,
    sources: SOURCES
  };
}

async function main() {
  const comuni = [];
  for (const meta of COMUNI) {
    process.stdout.write(`→ ${meta.code}… `);
    const data = await dashboard(meta.code);
    const built = build(meta, data);
    comuni.push(built);
    console.log(`${built.identity.name} (${built.population.total} ab.)`);
  }

  const output = {
    meta: {
      title: "COMUNE 2050 — snapshot dati",
      generatedAt: new Date().toISOString(),
      extractionDate: "2026-11-26",
      producer: "Cruscotto Italia / dati.gov.it",
      endpoint: MCP,
      note:
        "Snapshot build-time. I valori sono quelli restituiti dal dashboard comunale del Cruscotto Italia alla data di estrazione. Le proiezioni 2050 sono elaborazioni tendenziali sui residenti 2022–2026, non previsioni ufficiali.",
      licenses:
        "Licenze per fonte: ISTAT CC BY 4.0 / CC BY 3.0 IT; ISPRA CC BY 4.0; MEF CC BY 4.0 o CC BY 3.0; Agenzia delle Entrate CC BY 4.0; AGCOM CC BY 4.0; GSE CC BY 4.0; Ministero della Salute IODL 2.0; altre fonti secondo il rispettivo ente."
    },
    comuni
  };

  await writeFile(new URL("../src/data/comuni.json", import.meta.url), JSON.stringify(output, null, 2) + "\n", "utf8");
  console.log(`\n✓ scritti ${comuni.length} comuni in src/data/comuni.json`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
