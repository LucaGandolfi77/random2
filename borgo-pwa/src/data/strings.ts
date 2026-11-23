import type { Language, Localized } from './types';

export const UI = {
  loading: {
    it: 'Fidenza si sta svegliando…',
    en: 'Fidenza is waking up…'
  },
  hospitality: { it: 'Ospitalità', en: 'Hospitality' },
  objective: { it: 'In corso', en: 'In progress' },
  objectiveReady: { it: 'Da consegnare', en: 'Ready to hand over' },
  questAvailable: { it: 'Disponibile', en: 'Available' },
  introHint: {
    it: 'Parla con la gente del centro. Qualcuno ha bisogno di te.',
    en: 'Talk to the people in the centre. Someone needs you.'
  },
  bellReady: {
    it: 'Il centro è pronto. La campana aspetta.',
    en: 'The centre is ready. The bell is waiting.'
  },
  itemTile: { it: 'Tessera del mosaico', en: 'Mosaic tile' },
  itemLetter: { it: 'Lettera', en: 'Letter' },
  itemFlower: { it: 'Fiore di campo', en: 'Wildflower' },
  itemNewspaper: { it: 'Giornale', en: 'Newspaper' },
  itemBook: { it: 'Libro', en: 'Book' },
  itemCoffee: { it: 'Caffè', en: 'Coffee' },
  itemBread: { it: 'Pane', en: 'Bread' },
  bellName: { it: 'Campana del Duomo', en: 'Cathedral bell' },
  tapHint: { it: 'Tocca', en: 'Tap' },
  journal: { it: 'Diario', en: 'Journal' },
  map: { it: 'Mappa', en: 'Map' },
  menu: { it: 'Pausa', en: 'Pause' },
  titleEyebrow: {
    it: "Fidenza · un'ora d'oro",
    en: 'Fidenza · one golden hour'
  },
  titleTagline: {
    it: 'Sette voci, dodici ricordi, una sera che comincia.',
    en: 'Seven voices, twelve memories, one evening beginning.'
  },
  continueGame: { it: 'Continua', en: 'Continue' },
  newGame: { it: 'Nuova partita', en: 'New game' },
  saveFound: {
    it: 'Un taccuino ti aspetta: riprendi da dove eri.',
    en: 'A notebook is waiting: pick up where you left off.'
  },
  saveEmpty: {
    it: 'Nessun salvataggio. La prima passeggiata a Fidenza comincia qui.',
    en: 'No saved walk yet. Your first passeggiata in Fidenza starts here.'
  },
  controlMove: { it: 'Cammina', en: 'Walk' },
  controlRun: { it: 'Corri', en: 'Run' },
  controlJump: { it: 'Salta', en: 'Jump' },
  controlInteract: { it: 'Interagisci', en: 'Interact' },
  controlMap: { it: 'Mappa', en: 'Map' },
  controlJournal: { it: 'Diario', en: 'Journal' },
  controlPause: { it: 'Pausa', en: 'Pause' },
  controlLook: { it: 'Guarda intorno', en: 'Look around' },
  controlFly: { it: 'Volo', en: 'Fly' },
  controlHorn: { it: 'Clacson / campanello', en: 'Horn / bell' },
  controlReset: { it: 'Rimetti in strada', en: 'Reset vehicle' },
  controlsTravel: {
    it: 'Auto e bici: W/S accelera e retromarcia, A/D sterza, Space frena. In volo: Space sale, Shift scende, F atterra.',
    en: 'Cars and bikes: W/S accelerate and reverse, A/D steer, Space brakes. In flight: Space climbs, Shift descends, F lands.'
  },
  audioNote: {
    it: "L'audio si attiva al primo tocco. Nessuna rete, nessun download.",
    en: 'Sound starts on your first tap. No network, no downloads.'
  },
  madeWith: {
    it: 'Un racconto originale in tre dimensioni',
    en: 'An original story in three dimensions'
  },
  continueHint: { it: 'continua', en: 'continue' },
  journalEyebrow: { it: 'Taccuino di viaggio', en: 'Traveller’s notebook' },
  journalTitle: { it: 'Diario', en: 'Journal' },
  journalPlaces: { it: 'Luoghi di Fidenza', en: 'Places of Fidenza' },
  placeDiscovered: { it: 'Luogo scoperto', en: 'Place discovered' },
  mapAttribution: {
    it: 'Mappa: © OpenStreetMap contributors (ODbL)',
    en: 'Map: © OpenStreetMap contributors (ODbL)'
  },
  close: { it: 'Chiudi', en: 'Close' },
  activeQuests: { it: 'In corso', en: 'In progress' },
  completedQuests: { it: 'Completate', en: 'Completed' },
  noneYet: {
    it: 'Nessun incarico. Parla con la gente del centro.',
    en: 'No errands yet. Talk to the people in the centre.'
  },
  mosaicTitle: { it: 'Mosaico dei Ricordi', en: 'Mosaic of Memories' },
  tilesFound: { it: 'tessere trovate', en: 'tiles found' },
  mosaicHint: {
    it: 'Le tessere brillano dove Fidenza ricorda.',
    en: 'The tiles shine where Fidenza remembers.'
  },
  undiscovered: { it: 'Non ancora scoperto', en: 'Not discovered yet' },
  placesFound: { it: 'luoghi scoperti', en: 'places discovered' },
  closeHint: { it: 'chiudi', en: 'close' },
  mapEyebrow: { it: "Fidenza dall'alto", en: 'Fidenza from above' },
  mapTitle: { it: 'Mappa di Fidenza', en: 'Map of Fidenza' },
  legendPlayer: { it: 'Tu', en: 'You' },
  legendNpc: { it: 'Paesani', en: 'Townsfolk' },
  legendTile: { it: 'Ricordi', en: 'Memories' },
  legendTarget: { it: 'Incarichi', en: 'Errands' },
  pauseEyebrow: { it: "Una pausa all'ombra", en: 'A pause in the shade' },
  paused: { it: 'Pausa', en: 'Paused' },
  resume: { it: 'Riprendi', en: 'Resume' },
  settings: { it: 'Impostazioni', en: 'Settings' },
  backToTitle: { it: 'Torna al titolo', en: 'Back to title' },
  controlsTitle: { it: 'Comandi', en: 'Controls' },
  settingsEyebrow: { it: 'Come vuoi camminare', en: 'How you want to walk' },
  settingsTitle: { it: 'Impostazioni', en: 'Settings' },
  volume: { it: 'Volume', en: 'Volume' },
  reducedMotion: { it: 'Movimento ridotto', en: 'Reduced motion' },
  reducedMotionHint: {
    it: 'Meno oscillazioni e transizioni più rapide.',
    en: 'Less sway and quicker transitions.'
  },
  languageLabel: { it: 'Lingua', en: 'Language' },
  confirmTitle: { it: 'Ricominciare?', en: 'Start over?' },
  confirmText: {
    it: "La passeggiata attuale andrà persa. Il diario ricomincerà da una pagina bianca.",
    en: 'The current walk will be lost. The journal will begin on a blank page.'
  },
  confirmYes: { it: 'Sì, ricomincia', en: 'Yes, start over' },
  cancel: { it: 'Annulla', en: 'Cancel' },
  finaleEyebrow: { it: 'La campana ha suonato', en: 'The bell has rung' },
  finaleTitle: { it: 'La passeggiata', en: 'The evening walk' },
  keepPlaying: { it: "Resta un altro po'", en: 'Stay a little longer' },
  finaleBody: {
    it: "Le lanterne si accendono una a una lungo la Via Emilia. Fidenza esce di casa, e per un'ora non esiste altro che questa strada, questa luce, questo passo.",
    en: 'The lanterns come on one by one along the Via Emilia. Fidenza steps outside, and for an hour there is nothing but this street, this light, this walk.'
  },
  finaleBodyAll: {
    it: 'Il tuo mosaico è completo: ogni tessera ha trovato il suo posto. Adesso Fidenza ricorda anche te.',
    en: 'Your mosaic is complete: every tile has found its place. Now Fidenza remembers you too.'
  },
  finaleTiles: { it: 'Ricordi', en: 'Memories' },
  finalePlaces: { it: 'Luoghi', en: 'Places' },
  finaleTime: { it: 'Tempo', en: 'Time' },
  finaleRank: { it: 'Rango', en: 'Rank' },
  promptTalk: { it: 'Parla con', en: 'Talk to' },
  promptTake: { it: 'Raccogli', en: 'Pick up' },
  promptDeliver: { it: 'Consegna', en: 'Deliver' },
  promptBell: { it: 'Suona', en: 'Ring' },
  promptEnter: { it: 'Sali su', en: 'Get on' },
  promptExit: { it: 'Scendi da', en: 'Get off' },
  promptLand: { it: 'Atterra', en: 'Land' },
  promptFly: { it: 'Vola', en: 'Fly' },
  promptFlyBlocked: { it: 'Scendi dal veicolo per volare', en: 'Get off the vehicle to fly' },
  actionEnter: { it: 'SALI', en: 'GET ON' },
  actionExit: { it: 'SCENDI', en: 'GET OFF' },
  actionLand: { it: 'ATTERRA', en: 'LAND' },
  actionFly: { it: 'VOLO', en: 'FLY' },
  touchRun: { it: 'CORRI', en: 'RUN' },
  touchBrake: { it: 'FRENO', en: 'BRAKE' },
  touchFly: { it: 'VOLO', en: 'FLY' },
  touchReset: { it: 'RIPARA', en: 'RESET' },
  toastFlight: { it: 'Volo libero. F per atterrare.', en: 'Free flight. F to land.' },
  toastLand: { it: 'Atterrato.', en: 'Landed.' },
  toastLandBlocked: {
    it: 'Qui non c’è spazio per atterrare: cerca una strada o una piazza.',
    en: 'No room to land here: find a street or a square.'
  },
  toastVehicleReset: { it: 'Veicolo riportato in strada.', en: 'Vehicle returned to the road.' },
  toastVehicleBlocked: {
    it: 'Il veicolo è bloccato: premi R per rimetterlo in strada.',
    en: 'The vehicle is stuck: press R to put it back on the road.'
  },
  toastExitBlocked: {
    it: 'Non c’è spazio per scendere qui.',
    en: 'There is no room to get off here.'
  },
  hudFlight: { it: 'Quota', en: 'Altitude' },
  trainTrack: { it: 'Binario 1', en: 'Track 1' },
  trainDepartsIn: { it: 'parte tra', en: 'departs in' },
  trainDeparting: { it: 'in partenza', en: 'departing' },
  trainNext: { it: 'prossimo treno', en: 'next train' },
  trainArriving: { it: 'in arrivo tra', en: 'arriving in' },
  trainBoardName: { it: 'Fidenza · Regionale', en: 'Fidenza · Regional' },
  promptRead: { it: 'Leggi', en: 'Read' },
  toastTile: { it: 'Tessera del mosaico', en: 'Mosaic tile' },
  toastLetter: { it: 'Lettera recuperata', en: 'Letter recovered' },
  toastFlower: { it: 'Fiore raccolto', en: 'Flower picked' },
  toastBread: {
    it: 'Il pane è sul tavolo. La festa può cominciare.',
    en: 'The bread is on the table. The feast can begin.'
  },
  toastLetters: {
    it: 'Elio ha riavuto le sue lettere.',
    en: 'Elio has his letters back.'
  },
  toastFlowers: {
    it: 'Marta ha i suoi fiori per la passeggiata.',
    en: 'Marta has her flowers for the walk.'
  },
  toastNewspaper: {
    it: 'Il giornale è arrivato in stazione.',
    en: 'The newspaper has reached the station.'
  },
  toastBook: {
    it: 'Il libro è tornato a San Pietro.',
    en: 'The book is back at San Pietro.'
  },
  toastCoffee: {
    it: 'Il caffè è arrivato al Comune, ancora caldo.',
    en: 'The coffee reached the Town Hall, still hot.'
  },
  toastBell: {
    it: 'La campana suona sopra i tetti.',
    en: 'The bell rings over the rooftops.'
  },
  toastAllTiles: {
    it: 'Il mosaico è completo.',
    en: 'The mosaic is complete.'
  },
  toastAccepted: { it: 'Nuovo incarico', en: 'New errand' },
  toastCompleted: { it: 'Incarico completato', en: 'Errand complete' },
  toastObjective: { it: 'Obiettivo raggiunto', en: 'Objective reached' },
  toastSaved: { it: 'Salvato', en: 'Saved' },
  questActive: { it: 'In corso', en: 'In progress' },
  questReady: { it: 'Da consegnare', en: 'Ready to hand over' },
  questDone: { it: 'Completata', en: 'Completed' },
  rank0: { it: 'Forestiero', en: 'Wayfarer' },
  rank1: { it: 'Ospite', en: 'Guest' },
  rank2: { it: 'Amico del Borgo', en: 'Friend of the Borgo' },
  rank3: { it: 'Cittadino onorario', en: 'Honorary Citizen' },
  touchHint: { it: 'Joystick per camminare', en: 'Joystick to walk' }
} satisfies Record<string, Localized>;

export type UiKey = keyof typeof UI;

export function t(key: UiKey, lang: Language): string {
  return UI[key][lang];
}

export function pick(value: Localized, lang: Language): string {
  return value[lang];
}

export function rankName(index: number, lang: Language): string {
  const safe = Math.max(0, Math.min(3, Math.floor(index))) as 0 | 1 | 2 | 3;
  return t(`rank${safe}`, lang);
}

export function formatNumber(value: number, lang: Language): string {
  return new Intl.NumberFormat(lang === 'it' ? 'it-IT' : 'en-GB').format(value);
}

export function formatClock(totalSeconds: number, lang: Language): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return lang === 'it'
    ? `${minutes} min ${String(rest).padStart(2, '0')} s`
    : `${minutes}m ${String(rest).padStart(2, '0')}s`;
}
