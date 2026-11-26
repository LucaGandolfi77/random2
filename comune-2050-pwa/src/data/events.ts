import type { EventCard } from "./types";

/*
 * Eight events. The engine draws five per run, one after each policy.
 * Every event starts from a real indicator family; the responses are
 * deliberately imperfect trade-offs, never a free win.
 */
export const EVENTS: EventCard[] = [
  {
    id: "inverno-polveri",
    title: { it: "L’inverno delle polveri", en: "The winter of dust" },
    body: {
      it: "Gennaio senza pioggia. Le centraline superano la soglia e le scuole del centro chiedono una risposta. Il traffico è la prima cosa che tutti vedono.",
      en: "A dry January. Monitors cross the threshold and central schools ask for an answer. Traffic is the first thing everyone sees."
    },
    evidence: {
      it: "Le medie PM10 delle stazioni urbane sono il dato che apre il dibattito su traffico e riscaldamento.",
      en: "Urban-station PM10 averages are the number that opens the debate on traffic and heating."
    },
    source: "ispra-air",
    choices: [
      {
        label: { it: "Blocca il traffico nelle ore critiche", en: "Ban traffic in peak hours" },
        detail: {
          it: "Targhe alterne e bus potenziati per due settimane. L’aria migliora, i negozi protestano.",
          en: "Alternate plates and extra buses for two weeks. Air improves, shops protest."
        },
        cost: 0,
        gain: 0,
        effects: { aria: 5, auto: 3, reddito: -2 }
      },
      {
        label: { it: "Filtri e aule pulite nelle scuole", en: "Filters and clean classrooms" },
        detail: {
          it: "Investi in purificatori e manutenzione. Proteggi i bambini, non risolvi la fonte.",
          en: "Invest in purifiers and maintenance. You protect children, not remove the source."
        },
        cost: 2,
        gain: 0,
        effects: { aria: 3, scuola: 4, comunita: 2 }
      }
    ]
  },
  {
    id: "treno-non-ferma",
    title: { it: "Il treno che non ferma", en: "The train that won’t stop" },
    body: {
      it: "La Regione ridisegna gli orari. Un collegamento diretto verso il capoluogo rischia di sparire: pendolari e imprese chiedono un posto al tavolo.",
      en: "The Region redraws the timetable. A direct link to the provincial capital may disappear: commuters and firms want a seat at the table."
    },
    evidence: {
      it: "Il pendolarismo e la copertura digitale misurano quanto il comune è connesso al resto del paese.",
      en: "Commuting and digital coverage measure how connected the town is to the rest of the country."
    },
    source: "istat-commuting",
    choices: [
      {
        label: { it: "Firma il patto con la Regione", en: "Sign the deal with the Region" },
        detail: {
          it: "Contribuisci al servizio e ospiti un presidio di coworking in stazione. Costoso, ma tiene aperta la porta.",
          en: "Co-fund the service and host a coworking desk at the station. Expensive, but keeps the door open."
        },
        cost: 2,
        gain: 0,
        effects: { reddito: 4, digitale: 3, comunita: 2 }
      },
      {
        label: { it: "Punta sul trasporto locale", en: "Bet on local transport" },
        detail: {
          it: "Niente treno in più, ma corse avanti e indietro verso i quartieri. Meno dipendenza dall’auto.",
          en: "No extra train, but shuttle runs to the neighbourhoods. Less car dependence."
        },
        cost: 0,
        gain: 0,
        effects: { auto: 4, aria: 3 }
      }
    ]
  },
  {
    id: "casa-che-non-c-e",
    title: { it: "La casa che non c’è", en: "The home that isn’t there" },
    body: {
      it: "Tre giovani insegnanti hanno rinunciato al posto perché non trovano un affitto sotto i 700 euro. Il centro si svuota, i proprietari aspettano il turista.",
      en: "Three young teachers turned down a job because they could not find rent under €700. The centre empties, owners wait for tourists."
    },
    evidence: {
      it: "Il rapporto tra reddito medio e quotazioni OMI è la misura più diretta dell’accessibilità abitativa.",
      en: "The ratio between mean income and OMI prices is the most direct measure of housing affordability."
    },
    source: "mef-omi",
    choices: [
      {
        label: { it: "Fondo affitti per chi lavora", en: "Rent fund for workers" },
        detail: {
          it: "Garanzia pubblica e canoni calmierati per tre anni. Il bilancio piange, il centro respira.",
          en: "Public guarantee and controlled rents for three years. The budget hurts, the centre breathes."
        },
        cost: 2,
        gain: 0,
        effects: { casa: 7, giovani: 3, abitato: 2 }
      },
      {
        label: { it: "Densifica il centro", en: "Densify the centre" },
        detail: {
          it: "Sopraelevazioni e nuove unità nei cortili. Più case, meno suolo libero e qualche vicino arrabbiato.",
          en: "Rooftop extensions and new units in courtyards. More homes, less free soil and a few angry neighbours."
        },
        cost: 0,
        gain: 0,
        effects: { casa: 4, suolo: -3, comunita: -2 }
      }
    ]
  },
  {
    id: "conto-del-clima",
    title: { it: "Il conto del clima", en: "The climate bill" },
    body: {
      it: "Un nubifragio mette in ginocchio la zona artigianale. Il torrente è stato cementificato per decenni; ora chiede spazio.",
      en: "A cloudburst brings the craft district to its knees. The stream was concreted for decades; now it asks for room."
    },
    evidence: {
      it: "Il consumo di suolo e la popolazione in aree a rischio idrogeologico raccontano quanto è fragile la pianura.",
      en: "Land consumption and the population in hydrogeological risk areas show how fragile the plain is."
    },
    source: "ispra-soil",
    choices: [
      {
        label: { it: "Rinatura il torrente", en: "Restore the stream" },
        detail: {
          it: "Parco fluviale, argini morbidi e piste ciclabili. Un cantiere lungo, un futuro più sicuro.",
          en: "River park, soft banks and cycle paths. A long building site, a safer future."
        },
        cost: 2,
        gain: 0,
        effects: { suolo: 5, aria: 3, casa: 2 }
      },
      {
        label: { it: "Muri e cemento", en: "Walls and concrete" },
        detail: {
          it: "La protezione più rapida e visibile. Il torrente resta una canaletta, il rischio resta a valle.",
          en: "The quickest, most visible protection. The stream stays a channel, the risk stays downstream."
        },
        cost: 0,
        gain: 0,
        effects: { casa: 3, suolo: -5, aria: -2 }
      }
    ]
  },
  {
    id: "scuola-che-chiude",
    title: { it: "La scuola che chiude", en: "The school that closes" },
    body: {
      it: "Le iscrizioni calano. Un plesso di periferia rischia la chiusura: per il paese è un presidio, per il bilancio è un costo.",
      en: "Enrolments fall. A peripheral school faces closure: for the village it is a lifeline, for the budget a cost."
    },
    evidence: {
      it: "Il numero di plessi scolastici e la quota di under 15 dicono dove la città sta invecchiando più in fretta.",
      en: "The number of school sites and the under-15 share show where the town is ageing fastest."
    },
    source: "miur-schools",
    choices: [
      {
        label: { it: "Accorpa e potenzia", en: "Merge and strengthen" },
        detail: {
          it: "Un polo più attrezzato, ma i bambini della frazione prendono il bus. Qualcuno si sente lasciato indietro.",
          en: "A better-equipped hub, but village children take the bus. Some feel left behind."
        },
        cost: 0,
        gain: 0,
        effects: { scuola: 4, comunita: -2 }
      },
      {
        label: { it: "Trasforma il plesso in polo civico", en: "Turn the school into a civic hub" },
        detail: {
          it: "Scuola, biblioteca e ambulatorio nello stesso edificio. Più servizi, più personale, più speranza.",
          en: "School, library and clinic in one building. More services, more staff, more hope."
        },
        cost: 2,
        gain: 0,
        effects: { scuola: 6, comunita: 5, giovani: 2 }
      }
    ]
  },
  {
    id: "fabbrica-che-assume",
    title: { it: "La fabbrica che assume", en: "The factory that hires" },
    body: {
      it: "Un gruppo industriale vuole un capannone nell’area artigianale. Promette 120 posti, chiede suolo e una corsia preferenziale.",
      en: "An industrial group wants a warehouse in the craft district. It promises 120 jobs, asks for land and a fast track."
    },
    evidence: {
      it: "Tasso di occupazione e reddito medio misurano la domanda di lavoro, ma il suolo consumato misura il costo fisico.",
      en: "Employment and mean income measure labour demand, but land consumption measures the physical cost."
    },
    source: "mef-income",
    choices: [
      {
        label: { it: "Patto per il lavoro locale", en: "Local jobs pact" },
        detail: {
          it: "Assunzioni vincolate ai residenti e formazione in città. Il capannone arriva, il suolo no.",
          en: "Hiring tied to residents and local training. The warehouse comes, the land does not."
        },
        cost: 1,
        gain: 0,
        effects: { occupazione: 6, reddito: 4, suolo: -2 }
      },
      {
        label: { it: "Solo se verde", en: "Only if green" },
        detail: {
          it: "Tetto fotovoltaico, logistica su rotaia e vincoli ambientali. Meno posti subito, più qualità dopo.",
          en: "Solar roof, rail logistics and environmental conditions. Fewer jobs now, more quality later."
        },
        cost: 0,
        gain: 0,
        effects: { occupazione: 3, aria: 4, suolo: 2 }
      }
    ]
  },
  {
    id: "turismo-che-arriva",
    title: { it: "Il turismo che arriva", en: "The tourism that arrives" },
    body: {
      it: "Una guida internazionale cita il centro storico. In tre mesi gli affitti brevi triplicano e i residenti iniziano a lamentarsi del rumore.",
      en: "An international guide mentions the old centre. In three months short lets triple and residents start complaining about noise."
    },
    evidence: {
      it: "L’indice di turisticità e le abitazioni vuote mostrano quanto il turismo può sostenere o spiazzare la città.",
      en: "The tourism index and vacant dwellings show how tourism can support or displace the town."
    },
    source: "istat-tourism",
    choices: [
      {
        label: { it: "Ospitalità diffusa e regole chiare", en: "Scattered hospitality and clear rules" },
        detail: {
          it: "Limiti agli affitti brevi nel centro, incentivi alle famiglie che ospitano. Il turismo cresce senza svuotare le case.",
          en: "Limits on short lets in the centre, incentives for host families. Tourism grows without emptying homes."
        },
        cost: 0,
        gain: 0,
        effects: { turismo: 6, reddito: 3, casa: -1 }
      },
      {
        label: { it: "Tassa di soggiorno per i servizi", en: "Tourist tax for services" },
        detail: {
          it: "Un contributo piccolo e diffuso per pulizia, trasporti e musei. Il turismo paga un pezzo di città.",
          en: "A small, broad contribution for cleaning, transport and museums. Tourism pays for a piece of the town."
        },
        cost: 0,
        gain: 0,
        effects: { turismo: 3, comunita: 4, reddito: 2 }
      }
    ]
  },
  {
    id: "pnrr-che-scade",
    title: { it: "Il PNRR che scade", en: "The PNRR deadline" },
    body: {
      it: "Un finanziamento per la scuola digitale è in ritardo. Le regole dicono: spendi entro dicembre o restituisci. Il cantiere è fermo da mesi.",
      en: "A digital-school grant is late. The rules say: spend by December or give it back. The site has been idle for months."
    },
    evidence: {
      it: "Il finanziamento PNRR per abitante misura la capacità di trasformare un’opportunità in un’opera.",
      en: "PNRR funding per resident measures the capacity to turn an opportunity into a building."
    },
    source: "regis-pnrr",
    choices: [
      {
        label: { it: "Cantieri accelerati", en: "Accelerate the sites" },
        detail: {
          it: "Straordinari, project manager e un po’ di consumo di suolo in più. La scuola digitale apre in tempo.",
          en: "Overtime, project managers and a little more land consumption. The digital school opens on time."
        },
        cost: 2,
        gain: 0,
        effects: { scuola: 4, digitale: 4, suolo: -2 }
      },
      {
        label: { it: "Rimanda e risparmia", en: "Postpone and save" },
        detail: {
          it: "Restituisci una parte dei fondi e rinunci al progetto. Le casse respirano, la scuola aspetta.",
          en: "Return part of the funds and give up the project. The coffers breathe, the school waits."
        },
        cost: 0,
        gain: 2,
        effects: { scuola: -2, digitale: -2 }
      }
    ]
  }
];

export function eventById(id: string): EventCard | undefined {
  return EVENTS.find((event) => event.id === id);
}
