import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const N = (text, dur = 7, gap = 1.7) => ({
  speaker: 'Narratore',
  text,
  dur,
  gap,
  kind: 'narration',
})

const D = (speaker, text, dur = 6.5, gap = 1.7) => ({
  speaker,
  text,
  dur,
  gap,
  kind: 'dialogue',
})

const Q = (text, translation, dur = 9, gap = 1.7) => ({
  speaker: 'Victor Hugo',
  text,
  translation,
  dur,
  gap,
  kind: 'quote',
  attribution: 'Victor Hugo, Les Misérables, 1862',
})

const chapters = [
  {
    id: 'ouverture',
    title: 'Ouverture',
    subtitle: 'Parigi, 2000',
    duration: 30,
    episodes: [],
    scene: 'I tetti di Parigi nella notte',
    intro: 1.8,
    lines: [
      N('Parigi, 2000. La città brilla, ma la notte ha ancora tasche profonde.', 7.5, 1.5),
      N('Sotto i vetri delle vetrine, la miseria conserva il volto di un uomo.', 7.5, 1.5),
      Q(
        "Il n'y a ni mauvaises herbes ni mauvais hommes. Il n'y a que de mauvais cultivateurs.",
        'Non esistono erbacce cattive né uomini cattivi. Esistono soltanto cattivi coltivatori.',
        9.5,
        1,
      ),
    ],
  },
  {
    id: 'release',
    title: 'L’uomo che torna',
    subtitle: 'Episodio 1 · Diciannove anni',
    duration: 90,
    episodes: [1],
    scene: 'Il carcere e la strada di Digne',
    intro: 2.5,
    lines: [
      N('Diciannove anni. Tanto era durata la pena di Jean Valjean, rinchiuso per aver rubato un pane.', 9, 1.5),
      D('Guardia', 'Valjean. Da oggi sei fuori. Non tornare.', 6, 1.5),
      D('Valjean', 'Fuori.', 4, 1.5),
      D('Guardia', 'Prendi il passaporto giallo. Ovunque andrai, dirà ciò che sei stato.', 8, 1.8),
      N('Nel 2000 le porte hanno vetri, citofoni e telecamere. Ma possono restare chiuse quanto quelle di un altro secolo.', 11, 1.8),
      D('Valjean', 'Ho pagato. Ho pagato per tutti.', 6, 1.8),
      N('A Digne cercò una stanza. Il denaro non bastava a comprare la fiducia.', 9.5, 1.8),
      D('Ostiere', 'Fuori. La legge dice che dobbiamo segnalarti. Non vogliono guai.', 8, 1.5),
      D('Valjean', 'Non chiedo pietà. Chiedo un letto.', 6, 1.5),
      N('Nessuno rispose.', 4.5, 1),
    ],
  },
  {
    id: 'doors',
    title: 'Le porte chiuse',
    subtitle: 'Episodio 2 · Il rifiuto',
    duration: 80,
    episodes: [2],
    scene: 'Le strade di Digne, sotto la pioggia',
    intro: 2.5,
    lines: [
      N('La città aveva imparato a proteggersi. Inferriate, codici, ricevute. La pietà non aveva un numero civico.', 10, 1.7),
      D('Valjean', 'Una notte. Pagherò.', 5.5, 1.5),
      D('Cittadino', 'Non qui. Il passaporto giallo non è una colpa, dicono. Ma nessuno vuole vederlo.', 8.5, 1.7),
      N('Valjean camminò sotto la pioggia. Ogni vetrina accesa era una promessa negata.', 10.5, 1.7),
      D('Bambino', 'Signore, ha freddo?', 5, 1.5),
      D('Valjean', 'Sì. Ma non è il freddo che mi spezza.', 6.5, 1.7),
      N('A sera, una donna gli indicò la casa del vescovo. Non per bontà: per stanchezza.', 10, 1.5),
      D('Valjean', 'Un vescovo.', 4, 1.5),
      N('La porta aveva la vernice scrostata. Era l’unica, in quella strada, senza telecamera.', 11, 1),
    ],
  },
  {
    id: 'bishop',
    title: 'La casa del vescovo',
    subtitle: 'Episodi 3–6 · La notte e la luce',
    duration: 190,
    episodes: [3, 4, 5, 6],
    scene: 'La casa di Monseigneur Myriel, poi l’alba',
    intro: 2.5,
    lines: [
      N('Monseigneur Myriel aveva ottant’anni e una casa troppo grande per un solo uomo.', 9, 1.5),
      D('Myriel', 'Entrate. La notte è di tutti.', 5.5, 1.4),
      D('Valjean', 'Sono un ex detenuto.', 5, 1.4),
      Q(
        "Cette porte ne demande pas à celui qui entre s'il a un nom, mais s'il a une douleur.",
        'Questa porta non chiede a chi entra se ha un nome, ma se ha un dolore.',
        9, 1.6,
      ),
      N('La sorella apparecchiò. Il vescovo mise sul tavolo l’argenteria, i piatti, i candelabri.', 10.5, 1.5),
      D('Valjean', 'Perché fate questo? Nessuno mi crede.', 6.5, 1.4),
      D('Myriel', 'Non vi credo. Vi accolgo. Non è la stessa cosa, ma è un inizio.', 8, 1.6),
      N('Valjean mangiò come chi teme che il cibo possa sparire. Poi, nella notte, si alzò.', 11, 1.5),
      N('Prese l’argenteria. Il vescovo dormiva. La porta era aperta.', 9, 1.5),
      D('Gendarme', 'Ecco il ladro. Ha detto che glielo avevate regalato.', 7.5, 1.5),
      D('Myriel', 'È vero. E avete dimenticato i candelabri. Sono i più preziosi.', 8, 1.6),
      Q(
        "N'oubliez pas, n'oubliez jamais que vous m'avez promis d'employer cet argent à devenir honnête homme.",
        'Non dimenticate, non dimenticate mai che mi avete promesso di usare questo denaro per diventare un uomo onesto.',
        10.5, 1.5,
      ),
      Q(
        "Jean Valjean, mon frère, vous n'appartenez plus au mal, mais au bien.",
        'Jean Valjean, fratello mio, non appartenete più al male, ma al bene.',
        8, 1.6,
      ),
      N('Valjean uscì. Sulla strada c’era un ragazzo. Una moneta gli cadde dalla mano.', 11, 1.5),
      N('Valjean la raccolse. Il ragazzo pianse. Fu allora che l’uomo capì di essere ancora capace di fare del male.', 12, 1.4),
      D('Valjean', 'No. Non così.', 4, 1.2),
      N('Alzò gli occhi. Per la prima volta, la luce non gli sembrò un rimprovero.', 10, 1),
    ],
  },
  {
    id: 'madeleine',
    title: 'Il nuovo nome',
    subtitle: 'Episodi 7 e 9 · Monsieur Madeleine',
    duration: 105,
    episodes: [7, 9],
    scene: 'La fabbrica di Montreuil e l’ufficio del sindaco',
    intro: 2.5,
    lines: [
      N('Cinque anni dopo, a Montreuil, nessuno ricordava il forzato. Conoscevano Monsieur Madeleine.', 10.5, 1.5),
      D('Operaio', 'Il padrone paga bene. Ma non sorride mai.', 6, 1.5),
      D('Madeleine', 'Il lavoro non è carità. È dignità. Chi può lavorare deve poter vivere.', 8, 1.6),
      D('Javert', 'Monsieur le Maire. Un ex detenuto è stato visto in città.', 7, 1.5),
      D('Madeleine', 'Cercatelo. Se ha commesso un crimine, risponderà.', 6.5, 1.5),
      D('Javert', 'Sono stato alla galera. So riconoscere un uomo che ha portato le catene.', 8.5, 1.6),
      N('Javert non aveva prove. Aveva memoria.', 6.5, 1.5),
      D('Madeleine', 'La legge è una cosa. La giustizia è un’altra. A volte camminano separate.', 8.5, 1.6),
      N('Madeleine costruì scuole, pagò infermiere, salvò un operaio da un carro rovesciato.', 10, 1.5),
      N('Ma sotto il nome nuovo, il passato aspettava. E a Parigi, una donna stava per cadere.', 10, 1),
    ],
  },
  {
    id: 'fantine',
    title: 'Fantine',
    subtitle: 'Episodi 8–9 · La miseria e la legge',
    duration: 150,
    episodes: [8, 9],
    scene: 'La fabbrica, la strada, l’ospedale',
    intro: 2.5,
    lines: [
      N('Fantine aveva una figlia, Cosette, lasciata a Montfermeil. Ogni mese pagava il suo posto nel mondo.', 10.5, 1.5),
      D('Fantine', 'Ho bisogno del lavoro. Mia figlia mangia con quello che guadagno.', 7, 1.5),
      D('Caposquadra', 'Sei stata vista con un uomo. Qui le madri sole non restano.', 7, 1.5),
      D('Fantine', 'Non ho scelto di essere sola.', 5.5, 1.5),
      N('Vendette i capelli. Poi i denti. Poi il diritto di dire di no.', 8.5, 1.5),
      D('Fantine', 'Quanto vale un corpo quando serve a sfamare una bambina?', 7, 1.5),
      Q('La misère offre, la société accepte.', 'La miseria offre, la società accetta.', 5, 1.4),
      D('Javert', 'Sei in arresto. Sei mesi.', 4.5, 1.4),
      D('Fantine', 'Chiamate Monsieur Madeleine. Lui sa di Cosette.', 6, 1.4),
      D('Madeleine', 'Lasciatela. È malata. La prendo io.', 5.5, 1.4),
      D('Javert', 'Un sindaco non si sostituisce alla legge.', 5.5, 1.4),
      D('Madeleine', 'Allora la legge guardi ciò che ha fatto. E abbia vergogna.', 6, 1.5),
      N('La portò all’ospedale. Fantine delirava, e chiamava una bambina che non c’era.', 10, 1.5),
      D('Fantine', 'Cosette... è viva?', 4.5, 1.3),
      D('Madeleine', 'Sì. E la riporterò a te.', 5, 1),
      N('Ma la notte aveva ancora una porta da aprire.', 6, 1),
    ],
  },
  {
    id: 'champmathieu',
    title: 'Champmathieu',
    subtitle: 'Episodi 10–11 · La confessione',
    duration: 90,
    episodes: [10, 11],
    scene: 'Il tribunale di Arras',
    intro: 2.5,
    lines: [
      N('Ad Arras, un uomo chiamato Champmathieu era davanti al tribunale. Il suo volto somigliava a un altro.', 10.5, 1.5),
      D('Giudice', 'Champmathieu, sei stato riconosciuto come Jean Valjean, forzato fuggito.', 8, 1.5),
      D('Champmathieu', 'Non sono nessuno. Sono solo un uomo che rubava mele.', 7.5, 1.5),
      D('Pubblico', 'È lui. Guardate gli occhi.', 5, 1.4),
      N('Madeleine entrò nell’aula. Tutti si alzarono. L’uomo rispettabile veniva a difendere la legge.', 10.5, 1.5),
      D('Madeleine', 'Quell’uomo non è Jean Valjean.', 5.5, 1.4),
      D('Giudice', 'Chi lo afferma?', 3.5, 1.2),
      D('Madeleine', 'Io. Jean Valjean. Sono io.', 6, 1.5),
      N('L’aula tacque. La verità aveva il volto di un sindaco.', 7.5, 1),
    ],
  },
  {
    id: 'fantine-death',
    title: 'La morte di Fantine',
    subtitle: 'Episodio 12 · La promessa',
    duration: 60,
    episodes: [12],
    scene: 'La stanza d’ospedale, la notte',
    intro: 1.8,
    lines: [
      N('All’ospedale, Fantine respirava a fatica. Fuori, la città accendeva le vetrine.', 8, 1.3),
      D('Fantine', 'Cosette... ha i miei occhi?', 5.5, 1.2),
      D('Valjean', 'Ha i tuoi occhi. E avrà una casa.', 6, 1.2),
      D('Fantine', 'Promettimi...', 3.5, 1.2),
      D('Valjean', 'Te lo prometto. Crescerà senza paura.', 6, 1.3),
      N('Javert apparve sulla porta. Non serviva una condanna: bastava la sua presenza.', 8, 1.3),
      D('Javert', 'Jean Valjean. Ti ho trovato.', 4.5, 1.2),
      N('Fantine chiuse gli occhi.', 4, 1),
    ],
  },
  {
    id: 'montfermeil',
    title: 'Montfermeil',
    subtitle: 'Episodi 13–14 · La bambina e la foresta',
    duration: 120,
    episodes: [13, 14],
    scene: 'La locanda Thénardier, la notte di Natale',
    intro: 2.5,
    lines: [
      N('La notte di Natale, a Montfermeil, le vetrine brillavano. Cosette portava un secchio troppo grande.', 10.5, 1.5),
      D('Cosette', 'L’acqua è pesante. Ma se torno senza, mi picchiano.', 7, 1.5),
      D('Madame Thénardier', 'Muoviti, piccola. Le tue scarpe costano più del tuo lavoro.', 7.5, 1.5),
      N('Valjean la vide nella foresta. Una bambina sola, sotto gli alberi neri.', 9.5, 1.5),
      D('Valjean', 'Perché piangi?', 3.5, 1.2),
      D('Cosette', 'Ho paura del buio.', 4, 1.2),
      D('Valjean', 'Allora ti accompagno. Il buio non è più grande di due persone.', 7, 1.5),
      D('Thénardier', 'Per portarla via devi pagare. Quindici franchi. E le spese.', 7, 1.4),
      D('Valjean', 'Prendete. Non è il prezzo di una bambina. È il prezzo della vostra coscienza.', 8, 1.4),
      D('Madame Thénardier', 'Non abbiamo coscienza. Abbiamo clienti.', 6, 1.5),
      N('Valjean comprò una bambola e la mise tra le braccia di Cosette. Poi la portò via, dentro un cappotto troppo grande.', 12, 1.5),
      D('Cosette', 'Non mi lascerete?', 4, 1.2),
      D('Valjean', 'Mai.', 3, 1),
      N('Per la prima volta, Cosette dormì senza paura.', 6, 1),
    ],
  },
  {
    id: 'paris',
    title: 'Una nuova vita',
    subtitle: 'Episodi 15–16 · Cosette e Marius',
    duration: 90,
    episodes: [15, 16],
    scene: 'Il giardino del Lussemburgo e un caffè di Parigi',
    intro: 2.5,
    lines: [
      N('A Parigi, Cosette crebbe tra libri, cortili e silenzi. Valjean le aveva dato una casa, ma non una spiegazione.', 11, 1.5),
      D('Cosette', 'Perché non parliamo mai del passato?', 5.5, 1.4),
      D('Valjean', 'Il passato è un paese dove non voglio portarti.', 6, 1.5),
      N('Nel giardino del Lussemburgo, un giovane la vide. Si chiamava Marius.', 8, 1.4),
      D('Marius', 'Mi scusi. Ho perso il conto delle volte che ho sperato di incontrarla.', 7, 1.3),
      D('Cosette', 'Non mi ha mai incontrata.', 4.5, 1.2),
      D('Marius', 'Allora ho perso il conto dei giorni.', 5, 1.4),
      N('Valjean li osservò da lontano. La felicità di Cosette aveva il volto di un addio.', 9, 1.5),
      N('Nei caffè, intanto, gli studenti parlavano di una barricata. La città ascoltava.', 10, 1),
    ],
  },
  {
    id: 'barricade',
    title: 'La barricata',
    subtitle: 'Episodi 17–18 · La scelta',
    duration: 105,
    episodes: [17, 18],
    scene: 'Una strada di Parigi, la notte della protesta',
    intro: 2.5,
    lines: [
      N('La barricata non era quella del 1832. Era una strada qualunque del 2000, piena di mobili rovesciati e di rabbia.', 11, 1.5),
      D('Enjolras', 'Non cediamo. Se la voce del popolo non entra nelle istituzioni, entra nelle strade.', 8.5, 1.5),
      D('Marius', 'Cosette crede che io stia studiando. Le ho scritto una lettera.', 6, 1.4),
      N('Javert fu riconosciuto tra i prigionieri. Enjolras lo consegnò a Valjean.', 9.5, 1.5),
      D('Enjolras', 'Uccidilo. È una spia.', 4, 1.2),
      D('Valjean', 'La vita non si restituisce con un’altra morte.', 6, 1.4),
      D('Javert', 'Perché mi risparmi? La legge non ti deve nulla.', 6.5, 1.4),
      D('Valjean', 'Non ti risparmio per legge. Ti risparmio perché posso.', 6.5, 1.5),
      N('Quando Javert scomparve nella notte, Valjean seppe che la libertà era una strada senza ritorno.', 10.5, 1.5),
      N('Poco dopo, la barricata cadde. Marius era vivo, ma ferito. Valjean lo sollevò.', 9.5, 1),
    ],
  },
  {
    id: 'sewers',
    title: 'Le fogne',
    subtitle: 'Episodi 19–20 · La gabbia infranta',
    duration: 105,
    episodes: [19, 20],
    scene: 'Le gallerie sotto Parigi e la Senna',
    intro: 2.5,
    lines: [
      N('Le fogne di Parigi non sono un luogo. Sono una memoria che scorre sotto la città.', 9.5, 1.5),
      D('Valjean', 'Tieni duro, ragazzo. La luce è vicina.', 5, 1.4),
      N('Valjean portò Marius sulle spalle per chilometri. Il fango gli entrava nella bocca.', 10.5, 1.5),
      D('Thénardier', 'Ci siamo già visti. Tu sei l’uomo che ha rubato l’argenteria.', 7, 1.3),
      D('Valjean', 'E tu sei l’uomo che affitta bambini.', 4.5, 1.4),
      N('All’uscita, Javert attendeva. La sua divisa era immobile. Dentro, tutto si muoveva.', 10, 1.5),
      D('Javert', 'Ho passato la vita a credere che il male fosse un ordine. Tu mi hai mostrato il disordine.', 8, 1.4),
      D('Valjean', 'Non era un ordine. Era una gabbia.', 4.5, 1.4),
      N('Javert guardò la Senna. Poi posò le manette. Non le aprì: le lasciò cadere.', 10.5, 1.5),
      N('Valjean non si voltò. Aveva ancora un ragazzo da salvare.', 6, 1),
    ],
  },
  {
    id: 'candlesticks',
    title: 'I candelabri',
    subtitle: 'Episodi 21–22 · La luce affidata',
    duration: 105,
    episodes: [21, 22],
    scene: 'La stanza di Valjean, l’alba',
    intro: 1.8,
    lines: [
      N('Marius guarì. Cosette tornò alla luce. Valjean, invece, sentì che il suo tempo si chiudeva.', 9, 1.5),
      D('Valjean', 'Bisogna che vi dica chi sono. Non per chiedere perdono. Per lasciarvi liberi.', 7.5, 1.4),
      D('Marius', 'Che cosa avete fatto per meritare una colpa così grande?', 6, 1.4),
      D('Valjean', 'Ho rubato un pane. Poi ho rubato la vita di una donna, credendo di salvarla.', 8, 1.5),
      D('Cosette', 'Non sei un ladro. Sei l’uomo che mi ha portata via dal buio.', 6.5, 1.5),
      N('Valjean prese i candelabri del vescovo. La cera era bassa, ma la luce non si era spenta.', 9.5, 1.5),
      D('Valjean', 'Questa luce non era mia. Mi è stata affidata.', 5, 1.3),
      D('Marius', 'Restate. Avete il diritto di essere felice.', 5, 1.3),
      D('Valjean', 'Ho imparato che la felicità non si possiede. Si passa.', 5.5, 1.4),
      N('Fuori, Parigi continuava. Dentro, per la prima volta, non c’era più paura.', 8, 1.4),
      N('Marius e Cosette gli presero le mani.', 5, 1.3),
      N('Le candele si consumarono. La luce restò.', 4.5, 1.2),
      Q(
        "Tant qu'il y aura sur la terre ignorance et misère, des livres de la nature de celui-ci pourront ne pas être inutiles.",
        'Finché sulla terra esisteranno ignoranza e miseria, libri come questo potranno non essere inutili.',
        9.5, 1.2,
      ),
      N('Un uomo può essere condannato per ciò che ha fatto. Ma non dovrebbe essere condannato per sempre a ciò che è stato.', 6.5, 1),
    ],
  },
]

let total = 0
const chapterData = chapters.map((chapter) => {
  const start = total
  total += chapter.duration
  return {
    id: chapter.id,
    title: chapter.title,
    subtitle: chapter.subtitle,
    duration: chapter.duration,
    start,
    end: total,
    episodes: chapter.episodes,
    scene: chapter.scene,
  }
})

const allCues = []
let cueIndex = 0

for (let c = 0; c < chapters.length; c += 1) {
  const chapter = chapters[c]
  const meta = chapterData[c]
  const intro = chapter.intro ?? 2.2
  const target = chapter.duration - 0.7
  const sumDuration = chapter.lines.reduce((sum, line) => sum + line.dur, 0)
  const sumGap = chapter.lines.reduce((sum, line, index) => sum + (index === chapter.lines.length - 1 ? 0 : line.gap), 0)
  let gapScale = 1
  if (sumGap > 0) {
    gapScale = (target - intro - sumDuration) / sumGap
  }
  if (!Number.isFinite(gapScale) || gapScale < 0.18) {
    throw new Error(`Capitolo ${chapter.id}: troppo testo per ${chapter.duration}s (scala gap ${gapScale.toFixed(2)})`)
  }
  let cursor = intro
  for (let l = 0; l < chapter.lines.length; l += 1) {
    const line = chapter.lines[l]
    const start = Number(cursor.toFixed(3))
    const end = Number((start + line.dur).toFixed(3))
    if (end > chapter.duration - 0.35) {
      throw new Error(`Capitolo ${chapter.id}: cue ${l + 1} termina fuori capitolo (${end})`)
    }
    cueIndex += 1
    const cue = {
      id: `cue-${String(cueIndex).padStart(3, '0')}`,
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      scene: chapter.scene,
      start: Number((meta.start + start).toFixed(3)),
      end: Number((meta.start + end).toFixed(3)),
      localStart: start,
      localEnd: end,
      speaker: line.speaker,
      text: line.text,
      kind: line.kind,
      ...(line.translation ? { translation: line.translation } : {}),
      ...(line.attribution ? { attribution: line.attribution } : {}),
    }
    allCues.push(cue)
    cursor = end + (l === chapter.lines.length - 1 ? 0 : line.gap * gapScale)
  }
}

for (let i = 1; i < allCues.length; i += 1) {
  if (allCues[i].start < allCues[i - 1].end - 0.001) {
    throw new Error(`Sovrapposizione tra ${allCues[i - 1].id} e ${allCues[i].id}`)
  }
}

const coveredEpisodes = new Set(chapterData.flatMap((chapter) => chapter.episodes))
for (let episode = 1; episode <= 22; episode += 1) {
  if (!coveredEpisodes.has(episode)) {
    throw new Error(`Episodio ${episode} non coperto`)
  }
}

if (total !== 1320) {
  throw new Error(`Durata totale ${total}, attesa 1320`)
}

const forbidden = ['euro', 'smartphone', 'social network', 'contactless', 'tiktok', 'instagram']
for (const cue of allCues) {
  const lower = `${cue.text} ${cue.translation ?? ''}`.toLowerCase()
  for (const word of forbidden) {
    if (lower.includes(word)) {
      throw new Error(`Anacronismo "${word}" in ${cue.id}`)
    }
  }
}

const film = {
  film: {
    title: 'I Miserabili',
    subtitle: 'Parigi 2000',
    language: 'it',
    duration: total,
    chapterCount: chapterData.length,
    episodeCount: 22,
    quotes: allCues.filter((cue) => cue.kind === 'quote').length,
    generatedAt: new Date().toISOString(),
  },
  chapters: chapterData,
  cues: allCues,
}

const srtTime = (seconds) => {
  const ms = Math.round(seconds * 1000)
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const s = Math.floor((ms % 60_000) / 1000)
  const rest = ms % 1000
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(rest).padStart(3, '0')}`
}

const srtBody = allCues
  .map((cue, index) => {
    const text = cue.translation
      ? `${cue.text}\n${cue.translation}`
      : cue.text
    return `${index + 1}\n${srtTime(cue.start)} --> ${srtTime(cue.end)}\n${text}\n`
  })
  .join('\n')

mkdirSync(join(root, 'src', 'data'), { recursive: true })
mkdirSync(join(root, 'public'), { recursive: true })
writeFileSync(join(root, 'src', 'data', 'film.json'), `${JSON.stringify(film, null, 2)}\n`)
writeFileSync(join(root, 'src', 'data', 'subtitles.json'), `${JSON.stringify(allCues, null, 2)}\n`)
writeFileSync(join(root, 'public', 'subtitles.srt'), srtBody)

console.log(`Generati ${chapterData.length} capitoli, ${allCues.length} cue, ${total}s (${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}).`)
console.log(`Citazioni: ${film.film.quotes}. Episodi coperti: ${coveredEpisodes.size}.`)
