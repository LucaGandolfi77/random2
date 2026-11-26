import type { ComuneData, Lang } from "./types";
import { fmtNumber, fmtPercent, t } from "./strings";

/*
 * The policy and event cards are shared by all six towns, but their
 * evidence line is not: it quotes the selected town's real indicator.
 * Missing values are shown as n.d. instead of being invented.
 */
function pct(value: number | null, lang: Lang, digits = 1): string {
  return value === null ? t(lang, "noData") : fmtPercent(value, lang, digits);
}

function num(value: number | null, lang: Lang, digits = 0): string {
  return value === null ? t(lang, "noData") : fmtNumber(value, lang, digits);
}

function ratio(income: number | null, omi: number | null): number | null {
  if (income === null || omi === null || omi <= 0) return null;
  return income / omi;
}

export function policyFact(policyId: string, comune: ComuneData, lang: Lang): string {
  const it = lang === "it";
  const pop = comune.population;
  const eco = comune.economy;
  const housing = comune.housing;
  const env = comune.environment;
  const mob = comune.mobility;
  const services = comune.services;
  const incomeRatio = ratio(eco.incomeMean, housing.omiMean);

  switch (policyId) {
    case "asili-aperti":
      return it
        ? `${pct(pop.under15.pct, lang)} under 15 · occupazione ${pct(eco.employmentRate, lang)}`
        : `${pct(pop.under15.pct, lang)} under 15 · employment ${pct(eco.employmentRate, lang)}`;
    case "patto-generazioni":
      return it
        ? `${pct(pop.over65.pct, lang)} over 65 · indice di vecchiaia ${num(pop.oldAgeIndex, lang)}`
        : `${pct(pop.over65.pct, lang)} over 65 · old-age index ${num(pop.oldAgeIndex, lang)}`;
    case "reddito-ponte":
      return it
        ? `Reddito medio ${num(eco.incomeMean, lang)} € · disoccupazione ${pct(eco.unemploymentRate, lang)}`
        : `Mean income €${num(eco.incomeMean, lang)} · unemployment ${pct(eco.unemploymentRate, lang)}`;
    case "rigenera-non-consumare":
      return it
        ? `Suolo consumato ${pct(env.soilConsumptionPct, lang)} · case vuote ${pct(housing.vacantDwellingsPct, lang)}`
        : `Land consumed ${pct(env.soilConsumptionPct, lang)} · vacant homes ${pct(housing.vacantDwellingsPct, lang)}`;
    case "affitto-giovani":
      return it
        ? `Reddito / OMI ${num(incomeRatio, lang, 1)} · quotazione media ${num(housing.omiMean, lang)} €/m²`
        : `Income / OMI ${num(incomeRatio, lang, 1)} · mean price €${num(housing.omiMean, lang)}/m²`;
    case "albergo-diffuso":
      return it
        ? `${num(housing.tourismBedsPer100, lang, 1)} letti ogni 100 abitanti · ${num(housing.vacantDwellingsPct, lang, 1)}% case vuote`
        : `${num(housing.tourismBedsPer100, lang, 1)} beds per 100 residents · ${num(housing.vacantDwellingsPct, lang, 1)}% vacant homes`;
    case "tram-pianura":
      return it
        ? `${num(mob.vehiclesPer1000, lang)} auto ogni 1.000 abitanti · PM10 ${num(env.pm10, lang, 1)} µg/m³`
        : `${num(mob.vehiclesPer1000, lang)} cars per 1,000 residents · PM10 ${num(env.pm10, lang, 1)} µg/m³`;
    case "citta-15-minuti":
      return it
        ? `${num(mob.injuriesPer10k, lang, 1)} feriti ogni 10.000 abitanti · ${num(mob.accidents, lang)} incidenti`
        : `${num(mob.injuriesPer10k, lang, 1)} injuries per 10,000 residents · ${num(mob.accidents, lang)} crashes`;
    case "corriere-elettrico":
      return it
        ? `${num(mob.evPer1000, lang, 2)} punti di ricarica ogni 1.000 abitanti · ${num(mob.evPoints, lang)} punti`
        : `${num(mob.evPer1000, lang, 2)} charging points per 1,000 residents · ${num(mob.evPoints, lang)} points`;
    case "scuola-aperta":
      return it
        ? `${num(services.schoolsPer1000, lang, 2)} plessi ogni 1.000 abitanti · ${num(services.schools, lang)} plessi`
        : `${num(services.schoolsPer1000, lang, 2)} school sites per 1,000 residents · ${num(services.schools, lang)} sites`;
    case "telemedicina":
      return it
        ? `FTTH ${pct(services.ftthPct, lang)} · ${pct(pop.over65.pct, lang)} over 65`
        : `FTTH ${pct(services.ftthPct, lang)} · ${pct(pop.over65.pct, lang)} over 65`;
    case "banda-ovunque":
      return it
        ? `FTTH ${pct(services.ftthPct, lang)} · ${num(services.thirdSectorPer1000, lang, 1)} enti del terzo settore ogni 1.000`
        : `FTTH ${pct(services.ftthPct, lang)} · ${num(services.thirdSectorPer1000, lang, 1)} third-sector bodies per 1,000`;
    default:
      return it ? "Dato comunale citato nella scheda." : "Municipal data cited on the card.";
  }
}

export function eventFact(eventId: string, comune: ComuneData, lang: Lang): string {
  const it = lang === "it";
  const pop = comune.population;
  const eco = comune.economy;
  const housing = comune.housing;
  const env = comune.environment;
  const mob = comune.mobility;
  const services = comune.services;
  const incomeRatio = ratio(eco.incomeMean, housing.omiMean);

  switch (eventId) {
    case "inverno-polveri":
      if (env.pm10 === null) {
        return it
          ? `PM10 2025 non disponibile per questo comune · ultima stazione attiva nel ${num(env.airYear, lang)}`
          : `PM10 2025 unavailable for this town · last active station in ${num(env.airYear, lang)}`;
      }
      return it
        ? `PM10 ${num(env.pm10, lang, 1)} µg/m³ nel ${num(env.airYear, lang)} · media delle stazioni urbane`
        : `PM10 ${num(env.pm10, lang, 1)} µg/m³ in ${num(env.airYear, lang)} · urban-station average`;
    case "treno-non-ferma":
      return it
        ? `${num(mob.commutersOut, lang)} pendolari uscenti · ${num(mob.commutersIn, lang)} entranti · auto-contenimento ${pct(mob.selfContainmentPct, lang)}`
        : `${num(mob.commutersOut, lang)} outbound commuters · ${num(mob.commutersIn, lang)} inbound · self-containment ${pct(mob.selfContainmentPct, lang)}`;
    case "casa-che-non-c-e":
      return it
        ? `Reddito / OMI ${num(incomeRatio, lang, 1)} · ${pct(housing.vacantDwellingsPct, lang)} case vuote`
        : `Income / OMI ${num(incomeRatio, lang, 1)} · ${pct(housing.vacantDwellingsPct, lang)} vacant homes`;
    case "conto-del-clima":
      return it
        ? `Suolo consumato ${pct(env.soilConsumptionPct, lang)} · popolazione in aree a rischio ${pct(env.landslidePopulationPct, lang)}`
        : `Land consumed ${pct(env.soilConsumptionPct, lang)} · population in risk areas ${pct(env.landslidePopulationPct, lang)}`;
    case "scuola-che-chiude":
      return it
        ? `${num(services.schools, lang)} plessi · ${pct(pop.under15.pct, lang)} under 15 · età media ${num(pop.medianAge, lang, 1)}`
        : `${num(services.schools, lang)} school sites · ${pct(pop.under15.pct, lang)} under 15 · median age ${num(pop.medianAge, lang, 1)}`;
    case "fabbrica-che-assume":
      return it
        ? `Occupazione ${pct(eco.employmentRate, lang)} · disoccupazione ${pct(eco.unemploymentRate, lang)} · reddito medio ${num(eco.incomeMean, lang)} €`
        : `Employment ${pct(eco.employmentRate, lang)} · unemployment ${pct(eco.unemploymentRate, lang)} · mean income €${num(eco.incomeMean, lang)}`;
    case "turismo-che-arriva":
      return it
        ? `${num(housing.tourismBedsPer100, lang, 1)} letti ogni 100 abitanti · ${pct(housing.vacantDwellingsPct, lang)} case vuote`
        : `${num(housing.tourismBedsPer100, lang, 1)} beds per 100 residents · ${pct(housing.vacantDwellingsPct, lang)} vacant homes`;
    case "pnrr-che-scade":
      return it
        ? `PNRR ${num(services.pnrrPerCapita, lang)} € per abitante · ${num(services.pnrrProjects, lang)} progetti`
        : `PNRR €${num(services.pnrrPerCapita, lang)} per resident · ${num(services.pnrrProjects, lang)} projects`;
    default:
      return it ? "Dato comunale citato nella scheda." : "Municipal data cited on the card.";
  }
}

export function metricRawFact(metric: string, comune: ComuneData, lang: Lang): string {
  const it = lang === "it";
  const pop = comune.population;
  const eco = comune.economy;
  const housing = comune.housing;
  const env = comune.environment;
  const mob = comune.mobility;
  const services = comune.services;
  switch (metric) {
    case "giovani":
      return it ? `${pct(pop.under15.pct, lang)} sotto 15 anni` : `${pct(pop.under15.pct, lang)} under 15`;
    case "invecchiamento":
      return it ? `indice di vecchiaia ${num(pop.oldAgeIndex, lang)}` : `old-age index ${num(pop.oldAgeIndex, lang)}`;
    case "occupazione":
      return it ? `${pct(eco.employmentRate, lang)} occupati` : `${pct(eco.employmentRate, lang)} employed`;
    case "reddito":
      return it ? `${num(eco.incomeMean, lang)} € medi` : `€${num(eco.incomeMean, lang)} mean`;
    case "suolo":
      return it ? `${pct(env.soilConsumptionPct, lang)} suolo consumato` : `${pct(env.soilConsumptionPct, lang)} land consumed`;
    case "casa":
      return it
        ? `reddito / OMI ${num(ratio(eco.incomeMean, housing.omiMean), lang, 1)}`
        : `income / OMI ${num(ratio(eco.incomeMean, housing.omiMean), lang, 1)}`;
    case "turismo":
      return it ? `${num(housing.tourismBedsPer100, lang, 1)} letti / 100 ab.` : `${num(housing.tourismBedsPer100, lang, 1)} beds / 100 res.`;
    case "abitato":
      return it ? `${pct(housing.vacantDwellingsPct, lang)} case vuote` : `${pct(housing.vacantDwellingsPct, lang)} vacant homes`;
    case "aria":
      return env.pm10 === null
        ? it ? "PM10 non disponibile" : "PM10 unavailable"
        : it ? `PM10 ${num(env.pm10, lang, 1)} µg/m³` : `PM10 ${num(env.pm10, lang, 1)} µg/m³`;
    case "auto":
      return mob.vehiclesPer1000 === null
        ? it ? "parco auto non confrontabile" : "car fleet not comparable"
        : it ? `${num(mob.vehiclesPer1000, lang)} auto / 1.000 ab.` : `${num(mob.vehiclesPer1000, lang)} cars / 1,000 res.`;
    case "incidenti":
      return it ? `${num(mob.injuriesPer10k, lang, 1)} feriti / 10.000 ab.` : `${num(mob.injuriesPer10k, lang, 1)} injuries / 10,000 res.`;
    case "ev":
      return it ? `${num(mob.evPer1000, lang, 2)} punti ricarica / 1.000 ab.` : `${num(mob.evPer1000, lang, 2)} charging points / 1,000 res.`;
    case "scuola":
      return it ? `${num(services.schoolsPer1000, lang, 2)} plessi / 1.000 ab.` : `${num(services.schoolsPer1000, lang, 2)} school sites / 1,000 res.`;
    case "digitale":
      return it ? `FTTH ${pct(services.ftthPct, lang)}` : `FTTH ${pct(services.ftthPct, lang)}`;
    case "comunita":
      return it ? `${num(services.thirdSectorPer1000, lang, 1)} enti / 1.000 ab.` : `${num(services.thirdSectorPer1000, lang, 1)} bodies / 1,000 res.`;
    case "pnrr":
      return it ? `${num(services.pnrrPerCapita, lang)} € PNRR / ab.` : `€${num(services.pnrrPerCapita, lang)} PNRR / res.`;
    default:
      return "";
  }
}
