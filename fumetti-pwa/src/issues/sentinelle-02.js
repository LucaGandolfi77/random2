/* SENTINELLE — Episodio 2: "L'uomo senza ombra".
 *
 * The second issue is a self-contained memory noir. Shadows are memories,
 * Silvio Ombra collects both, and the Sentinelle have to give him back a
 * real memory instead of another stolen one. Same data schema as issue 1:
 * pages, layouts, panels, balloons, and a cover that the shelf paints.
 */

export const sentinelle02 = {
  id: "sentinelle-02",
  slug: "sentinelle-02",
  series: "SENTINELLE",
  title: "L'uomo senza ombra",
  number: 2,
  kicker: "Episodio 2",
  genre: "Noir supereroistico",
  coverAlt: "Tre supereroi e un uomo senza ombra nella Galleria di Milano.",
  tagline: "Un uomo senza ombra. Una città che dimentica. Una notte per riportare indietro i ricordi.",
  description:
    "Dopo la notte del blackout, a Milano qualcuno ha iniziato a perdere la propria ombra — e con essa un ricordo. Le Sentinelle seguono una scia di vetro nero fino al Teatro Ombra, dove un illusionista del 1987 sta mettendo in scena il suo ultimo numero.",
  credits: "Storia, dialoghi e disegno generati dal codice. Un fumetto originale di random2.",
  readingTime: "8 tavole · circa 10 minuti",

  cover: {
    id: "cover-02",
    bg: "galleriaMilano",
    theme: "night",
    fx: ["spotlights", "mirrorShards", "fog"],
    chars: [
      { who: "luce", x: 0.23, y: 0.885, s: 0.82, pose: "stand" },
      { who: "volt", x: 0.36, y: 0.89, s: 0.78, pose: "stand", flip: true },
      { who: "muro", x: 0.48, y: 0.885, s: 0.85, pose: "stand" },
      { who: "silvio", x: 0.67, y: 0.875, s: 1.12, pose: "loom", flip: true }
    ]
  },

  end: {
    kicker: "Fine dell'episodio 2",
    title: "L'uomo senza ombra",
    text:
      "Le ombre sono tornate. Silvio Ombra è vivo, e il suo nome è di nuovo sui manifesti. Ma sul muro della Galleria c'è un'ombra che non appartiene a nessuno — e sta imparando a scrivere.",
    teaser: "Prossimamente: La città che ricorda."
  },

  pages: [
    {
      id: "pagina-01",
      layout: "splash",
      panels: [
        {
          id: "q01-1",
          bg: "galleriaMilano",
          theme: "night",
          fx: ["spotlights", "shadowHands", "mirrorShards", "fog"],
          chars: [
            { who: "crowd", x: 0.34, y: 0.89, s: 0.45, pose: "stand" },
            { who: "silvio", x: 0.56, y: 0.875, s: 1.05, pose: "point" }
          ],
          balloons: [
            {
              kind: "caption", x: 0.045, y: 0.05, w: 0.6,
              text: "MILANO, 21:07. La Galleria brillava come una lanterna."
            },
            {
              kind: "caption", x: 0.045, y: 0.16, w: 0.55,
              text: "La città aveva imparato a guardare la luce. Non a guardarsi le spalle."
            },
            {
              kind: "speech", x: 0.06, y: 0.62, w: 0.46, tail: "br", who: "Silvio",
              text: "«Un volontario?»"
            },
            {
              kind: "caption", x: 0.54, y: 0.78, w: 0.42,
              text: "Poi l'ombra non ci fu più."
            },
            {
              kind: "sfx", x: 0.70, y: 0.54, rotate: -5, color: "amber",
              text: "CLAP"
            }
          ]
        }
      ]
    },

    {
      id: "pagina-02",
      layout: "quad",
      panels: [
        {
          id: "q02-1",
          bg: "barInterior",
          theme: "bar",
          chars: [
            { who: "crowd", x: 0.19, y: 0.9, s: 0.42, pose: "stand" }
          ],
          balloons: [
            {
              kind: "tv", x: 0.06, y: 0.06, w: 0.66, who: "TG della notte",
              text: "SCOMPARSA DI OMBRA IN GALLERIA. TESTIMONI CONFUSI."
            },
            {
              kind: "speech", x: 0.30, y: 0.66, w: 0.62, tail: "bl", who: "Volt",
              text: "Confusi? O senza ricordi?"
            }
          ]
        },
        {
          id: "q02-2",
          bg: "barInterior",
          theme: "bar",
          chars: [
            { who: "muro", x: 0.36, y: 0.88, s: 0.86, pose: "stand" }
          ],
          balloons: [
            {
              kind: "caption", x: 0.05, y: 0.05, w: 0.58,
              text: "Niguarda, reparto di notte."
            },
            {
              kind: "speech", x: 0.08, y: 0.55, w: 0.6, tail: "br", who: "Muro",
              text: "Mamma dice che una paziente non riconosce più suo figlio."
            },
            {
              kind: "speech", x: 0.46, y: 0.28, w: 0.5, tail: "bl", who: "Luce",
              text: "Le ombre portano via i ricordi."
            }
          ]
        },
        {
          id: "q02-3",
          bg: "galleriaMilano",
          theme: "night",
          fx: ["fog", "phoneLights"],
          chars: [
            { who: "crowd", x: 0.46, y: 0.89, s: 0.5, pose: "stand" }
          ],
          balloons: [
            {
              kind: "caption", x: 0.04, y: 0.05, w: 0.6,
              text: "Tutte le vittime erano alla Galleria."
            },
            {
              kind: "speech", x: 0.06, y: 0.64, w: 0.7, tail: "br", who: "Volt",
              text: "Non è un ladro. È un collezionista."
            }
          ]
        },
        {
          id: "q02-4",
          bg: "galleriaMilano",
          theme: "dark",
          fx: ["fog", "shadowHands"],
          chars: [],
          balloons: [
            {
              kind: "caption", x: 0.04, y: 0.05, w: 0.7,
              text: "Sul pavimento, un biglietto da visita."
            },
            {
              kind: "caption", x: 0.34, y: 0.38, w: 0.64,
              text: "Il nome era cancellato."
            },
            {
              kind: "whisper", x: 0.46, y: 0.74, w: 0.48, tail: "tl", who: "Una voce",
              text: "«Silvio Ombra.»"
            }
          ]
        }
      ]
    },

    {
      id: "pagina-03",
      layout: "five",
      panels: [
        {
          id: "q03-1",
          bg: "metroPlatform",
          theme: "night",
          fx: ["fog"],
          chars: [
            { who: "volt", x: 0.30, y: 0.88, s: 0.86, pose: "run" },
            { who: "luce", x: 0.48, y: 0.88, s: 0.84, pose: "stand" },
            { who: "muro", x: 0.66, y: 0.88, s: 0.9, pose: "stand" },
            { who: "crowd", x: 0.86, y: 0.89, s: 0.34, pose: "stand" }
          ],
          balloons: [
            {
              kind: "caption", x: 0.04, y: 0.05, w: 0.58,
              text: "Linea gialla, direzione Comasina. 21:34."
            },
            {
              kind: "speech", x: 0.52, y: 0.62, w: 0.44, tail: "bl", who: "Volt",
              text: "L'ho visto salire. Non aveva ombra."
            }
          ]
        },
        {
          id: "q03-2",
          bg: "metroPlatform",
          theme: "dark",
          fx: ["shadowHands", "flicker"],
          chars: [
            { who: "shadow", x: 0.58, y: 0.84, s: 0.98, pose: "loom" },
            { who: "luce", x: 0.27, y: 0.88, s: 0.9, pose: "cast" }
          ],
          balloons: [
            {
              kind: "caption", x: 0.04, y: 0.05, w: 0.62,
              text: "L'ombra correva sui muri."
            },
            {
              kind: "speech", x: 0.07, y: 0.70, w: 0.5, tail: "br", who: "Luce",
              text: "Non è un riflesso."
            },
            {
              kind: "sfx", x: 0.40, y: 0.42, rotate: -6, color: "cyan",
              text: "FSSH"
            }
          ]
        },
        {
          id: "q03-3",
          bg: "metroPlatform",
          theme: "dark",
          fx: ["speedLines", "impact", "fog"],
          chars: [
            { who: "muro", x: 0.44, y: 0.88, s: 1.0, pose: "guard" },
            { who: "crowd", x: 0.72, y: 0.89, s: 0.38, pose: "stand" }
          ],
          balloons: [
            {
              kind: "speech", x: 0.06, y: 0.08, w: 0.56, tail: "br", who: "Muro",
              text: "La banchina sta cedendo!"
            },
            {
              kind: "sfx", x: 0.50, y: 0.72, rotate: -4, color: "cream",
              text: "CRACK"
            }
          ]
        },
        {
          id: "q03-4",
          bg: "metroPlatform",
          theme: "dark",
          fx: ["lightning", "speedLines"],
          chars: [
            { who: "volt", x: 0.40, y: 0.88, s: 0.94, pose: "run" },
            { who: "shadow", x: 0.72, y: 0.84, s: 0.8, pose: "point" }
          ],
          balloons: [
            {
              kind: "speech", x: 0.08, y: 0.08, w: 0.56, tail: "br", who: "Volt",
              text: "Non riesco a prenderlo!"
            },
            {
              kind: "speech", x: 0.28, y: 0.58, w: 0.7, tail: "tl", who: "L'uomo senza ombra",
              text: "Si restituiscono."
            }
          ]
        },
        {
          id: "q03-5",
          bg: "metroPlatform",
          theme: "night",
          fx: ["phoneLights"],
          chars: [
            { who: "luce", x: 0.34, y: 0.88, s: 0.86, pose: "stand" },
            { who: "muro", x: 0.54, y: 0.88, s: 0.88, pose: "stand" },
            { who: "volt", x: 0.70, y: 0.885, s: 0.8, pose: "stand", flip: true }
          ],
          balloons: [
            {
              kind: "caption", x: 0.04, y: 0.05, w: 0.66,
              text: "Sul muro, una locandina del 1987: TEATRO OMBRA."
            },
            {
              kind: "speech", x: 0.44, y: 0.68, w: 0.5, tail: "bl", who: "Luce",
              text: "Milano ricorda. Noi sì."
            }
          ]
        }
      ]
    },

    {
      id: "pagina-04",
      layout: "five",
      panels: [
        {
          id: "q04-1",
          bg: "teatroStage",
          theme: "bar",
          fx: ["spotlights", "fog"],
          chars: [
            { who: "muro", x: 0.24, y: 0.88, s: 0.84, pose: "stand" },
            { who: "luce", x: 0.40, y: 0.88, s: 0.86, pose: "stand" },
            { who: "volt", x: 0.56, y: 0.885, s: 0.8, pose: "stand", flip: true }
          ],
          balloons: [
            {
              kind: "caption", x: 0.04, y: 0.05, w: 0.56,
              text: "Teatro Ombra. Chiuso dal 1987."
            },
            {
              kind: "speech", x: 0.52, y: 0.64, w: 0.44, tail: "bl", who: "Muro",
              text: "Qualcuno è ancora sul palco."
            }
          ]
        },
        {
          id: "q04-2",
          bg: "teatroStage",
          theme: "dark",
          fx: ["spotlights", "flicker"],
          chars: [
            { who: "silvio", x: 0.55, y: 0.86, s: 1.05, pose: "loom" }
          ],
          balloons: [
            {
              kind: "speech", x: 0.05, y: 0.08, w: 0.62, tail: "br", who: "Silvio",
              text: "Benvenuti al mio ultimo spettacolo."
            },
            {
              kind: "caption", x: 0.38, y: 0.76, w: 0.58,
              text: "Il suo numero: L'uomo senza ombra."
            }
          ]
        },
        {
          id: "q04-3",
          bg: "teatroStage",
          theme: "bar",
          fx: ["spotlights", "mirrorShards"],
          chars: [
            { who: "silvio", x: 0.50, y: 0.86, s: 0.95, pose: "point" }
          ],
          balloons: [
            {
              kind: "caption", x: 0.05, y: 0.05, w: 0.62,
              text: "1987. Il trucco riuscì troppo bene."
            },
            {
              kind: "speech", x: 0.08, y: 0.70, w: 0.5, tail: "br", who: "Silvio",
              text: "Da allora, l'ombra non è più tornata."
            },
            {
              kind: "sfx", x: 0.62, y: 0.40, rotate: 5, color: "amber",
              text: "SNAP"
            }
          ]
        },
        {
          id: "q04-4",
          bg: "archiveOmbra",
          theme: "dark",
          fx: ["shadowHands", "flicker"],
          chars: [
            { who: "luce", x: 0.23, y: 0.88, s: 0.84, pose: "stand" },
            { who: "muro", x: 0.36, y: 0.88, s: 0.84, pose: "stand" },
            { who: "silvio", x: 0.58, y: 0.86, s: 0.94, pose: "stand" }
          ],
          balloons: [
            {
              kind: "speech", x: 0.38, y: 0.07, w: 0.56, tail: "bl", who: "Silvio",
              text: "Ogni ombra è un ricordo. Io colleziono ricordi."
            },
            {
              kind: "speech", x: 0.06, y: 0.68, w: 0.5, tail: "br", who: "Luce",
              text: "Ridalli indietro."
            }
          ]
        },
        {
          id: "q04-5",
          bg: "archiveOmbra",
          theme: "dark",
          fx: ["shadowHands", "mirrorShards", "impact"],
          chars: [
            { who: "muro", x: 0.34, y: 0.88, s: 0.95, pose: "kneel" },
            { who: "silvio", x: 0.59, y: 0.86, s: 1.0, pose: "point" }
          ],
          balloons: [
            {
              kind: "speech", x: 0.40, y: 0.07, w: 0.54, tail: "bl", who: "Silvio",
              text: "Uno per uno."
            },
            {
              kind: "caption", x: 0.05, y: 0.78, w: 0.62,
              text: "E Marta dimenticò il volto di suo padre."
            },
            {
              kind: "sfx", x: 0.12, y: 0.44, rotate: -4, color: "cream",
              text: "CRACK"
            }
          ]
        }
      ]
    },

    {
      id: "pagina-05",
      layout: "five",
      panels: [
        {
          id: "q05-1",
          bg: "martaHome",
          theme: "bar",
          fx: ["memoryLights", "flicker"],
          chars: [
            { who: "muro", x: 0.38, y: 0.85, s: 0.85, pose: "sit" },
            { who: "mother", x: 0.60, y: 0.86, s: 0.84, pose: "stand" },
            { who: "luce", x: 0.76, y: 0.86, s: 0.82, pose: "stand" }
          ],
          balloons: [
            {
              kind: "caption", x: 0.04, y: 0.05, w: 0.5,
              text: "Casa Neri, 23:10."
            },
            {
              kind: "speech", x: 0.06, y: 0.62, w: 0.54, tail: "br", who: "Muro",
              text: "Non riesco a ricordare il suo viso."
            },
            {
              kind: "speech", x: 0.56, y: 0.08, w: 0.42, tail: "bl", who: "Luce",
              text: "Le ombre sono memoria. La tua è qui."
            }
          ]
        },
        {
          id: "q05-2",
          bg: "martaHome",
          theme: "bar",
          fx: ["memoryLights"],
          chars: [
            { who: "mother", x: 0.50, y: 0.86, s: 0.86, pose: "stand" }
          ],
          balloons: [
            {
              kind: "caption", x: 0.04, y: 0.05, w: 0.6,
              text: "Sul muro, una foto di Marta bambina con suo padre."
            },
            {
              kind: "speech", x: 0.34, y: 0.64, w: 0.58, tail: "bl", who: "Madre",
              text: "Guardala finché il viso torna."
            }
          ]
        },
        {
          id: "q05-3",
          bg: "martaHome",
          theme: "bar",
          fx: ["lightBeam", "lightThreads", "memoryLights"],
          chars: [
            { who: "luce", x: 0.38, y: 0.87, s: 0.94, pose: "cast" },
            { who: "muro", x: 0.64, y: 0.85, s: 0.86, pose: "sit" }
          ],
          balloons: [
            {
              kind: "speech", x: 0.06, y: 0.08, w: 0.52, tail: "br", who: "Luce",
              text: "Luce sulla foto. Muro, tienila ferma."
            },
            {
              kind: "speech", x: 0.46, y: 0.64, w: 0.5, tail: "tl", who: "Muro",
              text: "La tengo."
            }
          ]
        },
        {
          id: "q05-4",
          bg: "martaHome",
          theme: "bar",
          fx: ["lightThreads", "memoryLights"],
          chars: [
            { who: "muro", x: 0.48, y: 0.86, s: 0.9, pose: "stand" }
          ],
          balloons: [
            {
              kind: "caption", x: 0.04, y: 0.05, w: 0.6,
              text: "Il viso tornò. Prima sfocato, poi intero."
            },
            {
              kind: "speech", x: 0.08, y: 0.64, w: 0.5, tail: "br", who: "Muro",
              text: "Papà."
            }
          ]
        },
        {
          id: "q05-5",
          bg: "martaHome",
          theme: "bar",
          fx: ["memoryLights", "flicker"],
          chars: [
            { who: "luce", x: 0.32, y: 0.88, s: 0.86, pose: "stand" },
            { who: "volt", x: 0.50, y: 0.885, s: 0.8, pose: "stand", flip: true },
            { who: "muro", x: 0.67, y: 0.88, s: 0.86, pose: "stand" }
          ],
          balloons: [
            {
              kind: "speech", x: 0.06, y: 0.08, w: 0.6, tail: "br", who: "Luce",
              text: "Un ricordo vero. Il suo nome."
            },
            {
              kind: "speech", x: 0.44, y: 0.66, w: 0.52, tail: "tl", who: "Volt",
              text: "Speriamo basti."
            }
          ]
        }
      ]
    },

    {
      id: "pagina-06",
      layout: "quad",
      panels: [
        {
          id: "q06-1",
          bg: "galleriaMilano",
          theme: "night",
          fx: ["spotlights", "shadowHands", "fog"],
          chars: [
            { who: "crowd", x: 0.20, y: 0.90, s: 0.4, pose: "stand" },
            { who: "silvio", x: 0.58, y: 0.86, s: 1.1, pose: "loom" }
          ],
          balloons: [
            {
              kind: "caption", x: 0.04, y: 0.05, w: 0.7,
              text: "Galleria, 00:12. L'ultimo spettacolo."
            },
            {
              kind: "speech", x: 0.42, y: 0.64, w: 0.54, tail: "tl", who: "Silvio",
              text: "Milano è una città di ombre educate."
            }
          ]
        },
        {
          id: "q06-2",
          bg: "galleriaMilano",
          theme: "night",
          fx: ["phoneLights", "memoryLights"],
          chars: [
            { who: "crowd", x: 0.46, y: 0.89, s: 0.56, pose: "stand" }
          ],
          balloons: [
            {
              kind: "caption", x: 0.04, y: 0.05, w: 0.62,
              text: "La folla alzò i telefoni. Ogni foto era un nome."
            },
            {
              kind: "speech", x: 0.08, y: 0.66, w: 0.5, tail: "br", who: "Volt",
              text: "Riflettori accesi."
            }
          ]
        },
        {
          id: "q06-3",
          bg: "galleriaMilano",
          theme: "dark",
          fx: ["shadowHands", "mirrorShards", "impact"],
          chars: [
            { who: "muro", x: 0.38, y: 0.88, s: 1.02, pose: "guard" },
            { who: "silvio", x: 0.67, y: 0.86, s: 1.02, pose: "point" }
          ],
          balloons: [
            {
              kind: "speech", x: 0.06, y: 0.08, w: 0.48, tail: "br", who: "Muro",
              text: "Ho le ombre. Liberale."
            },
            {
              kind: "sfx", x: 0.52, y: 0.64, rotate: -4, color: "cream",
              text: "CRACK"
            }
          ]
        },
        {
          id: "q06-4",
          bg: "galleriaMilano",
          theme: "night",
          fx: ["lightBeam", "lightThreads", "memoryLights"],
          chars: [
            { who: "luce", x: 0.34, y: 0.88, s: 1.0, pose: "cast" },
            { who: "silvio", x: 0.65, y: 0.86, s: 0.98, pose: "kneel" }
          ],
          balloons: [
            {
              kind: "speech", x: 0.06, y: 0.08, w: 0.56, tail: "br", who: "Luce",
              text: "Silvio Ombra. Ti ricordi chi eri?"
            },
            {
              kind: "caption", x: 0.05, y: 0.76, w: 0.62,
              text: "La luce attraversò il tetto di vetro."
            }
          ]
        }
      ]
    },

    {
      id: "pagina-07",
      layout: "quad",
      panels: [
        {
          id: "q07-1",
          bg: "galleriaMilano",
          theme: "dawn",
          fx: ["lightBeam", "embers", "memoryLights"],
          chars: [
            { who: "silvio", x: 0.48, y: 0.86, s: 0.94, pose: "kneel" },
            { who: "shadow", x: 0.66, y: 0.86, s: 0.9, pose: "stand" }
          ],
          balloons: [
            {
              kind: "caption", x: 0.04, y: 0.05, w: 0.58,
              text: "L'ombra tornò al suo posto."
            },
            {
              kind: "speech", x: 0.30, y: 0.62, w: 0.56, tail: "tl", who: "Silvio",
              text: "Io... mi chiamo Silvio."
            }
          ]
        },
        {
          id: "q07-2",
          bg: "galleriaMilano",
          theme: "dawn",
          fx: ["phoneLights", "embers"],
          chars: [
            { who: "muro", x: 0.25, y: 0.88, s: 0.85, pose: "stand" },
            { who: "crowd", x: 0.56, y: 0.89, s: 0.5, pose: "stand" }
          ],
          balloons: [
            {
              kind: "caption", x: 0.04, y: 0.05, w: 0.62,
              text: "Le ombre tornarono."
            },
            {
              kind: "speech", x: 0.08, y: 0.62, w: 0.5, tail: "br", who: "Muro",
              text: "Mio padre."
            },
            {
              kind: "speech", x: 0.50, y: 0.74, w: 0.44, tail: "tl", who: "Volt",
              text: "Tutto qui?"
            }
          ]
        },
        {
          id: "q07-3",
          bg: "piazzaMorning",
          theme: "morning",
          fx: ["fog", "phoneLights"],
          chars: [
            { who: "luce", x: 0.30, y: 0.88, s: 0.86, pose: "stand" },
            { who: "volt", x: 0.46, y: 0.885, s: 0.8, pose: "stand", flip: true },
            { who: "muro", x: 0.62, y: 0.88, s: 0.88, pose: "stand" }
          ],
          balloons: [
            {
              kind: "caption", x: 0.04, y: 0.05, w: 0.6,
              text: "Arrivò un'ambulanza. Non la polizia."
            },
            {
              kind: "speech", x: 0.08, y: 0.66, w: 0.4, tail: "br", who: "Volt",
              text: "Ancora voi?"
            },
            {
              kind: "speech", x: 0.44, y: 0.82, w: 0.52, tail: "tl", who: "Muro",
              text: "Meglio dei lampioni."
            }
          ]
        },
        {
          id: "q07-4",
          bg: "galleriaMilano",
          theme: "dark",
          fx: ["shadowHands", "mirrorShards", "flicker"],
          chars: [],
          balloons: [
            {
              kind: "caption", x: 0.04, y: 0.05, w: 0.7,
              text: "Sul muro restò un'ombra. Non apparteneva a nessuno."
            },
            {
              kind: "speech", x: 0.36, y: 0.60, w: 0.56, tail: "tl", who: "L'ombra",
              text: "Ci vediamo al prossimo ricordo."
            }
          ]
        }
      ]
    },

    {
      id: "pagina-08",
      layout: "quad",
      panels: [
        {
          id: "q08-1",
          bg: "barInterior",
          theme: "bar",
          fx: ["fog"],
          chars: [
            { who: "luce", x: 0.33, y: 0.86, s: 0.8, pose: "sit" },
            { who: "volt", x: 0.49, y: 0.86, s: 0.76, pose: "sit", flip: true },
            { who: "muro", x: 0.65, y: 0.86, s: 0.82, pose: "sit" }
          ],
          balloons: [
            {
              kind: "caption", x: 0.04, y: 0.05, w: 0.54,
              text: "Bar Centrale, 08:12."
            },
            {
              kind: "speech", x: 0.08, y: 0.58, w: 0.5, tail: "br", who: "Volt",
              text: "Due miracoli. Un cornetto."
            },
            {
              kind: "speech", x: 0.50, y: 0.82, w: 0.44, tail: "tl", who: "Muro",
              text: "Il caffè lo pago io."
            }
          ]
        },
        {
          id: "q08-2",
          bg: "martaHome",
          theme: "morning",
          fx: ["memoryLights"],
          chars: [
            { who: "muro", x: 0.34, y: 0.88, s: 0.86, pose: "stand" },
            { who: "mother", x: 0.60, y: 0.87, s: 0.86, pose: "stand" }
          ],
          balloons: [
            {
              kind: "speech", x: 0.08, y: 0.08, w: 0.5, tail: "br", who: "Madre",
              text: "I pazienti ricordano di nuovo."
            },
            {
              kind: "speech", x: 0.46, y: 0.64, w: 0.5, tail: "tl", who: "Muro",
              text: "Anche papà."
            }
          ]
        },
        {
          id: "q08-3",
          bg: "piazzaMorning",
          theme: "morning",
          fx: ["phoneLights", "fog"],
          chars: [
            { who: "luce", x: 0.24, y: 0.88, s: 0.84, pose: "stand" },
            { who: "crowd", x: 0.46, y: 0.89, s: 0.48, pose: "stand" },
            { who: "volt", x: 0.66, y: 0.885, s: 0.8, pose: "stand", flip: true },
            { who: "muro", x: 0.78, y: 0.88, s: 0.82, pose: "stand" }
          ],
          balloons: [
            {
              kind: "caption", x: 0.04, y: 0.05, w: 0.62,
              text: "Milano aveva imparato a guardarsi le spalle."
            },
            {
              kind: "speech", x: 0.08, y: 0.66, w: 0.56, tail: "br", who: "Volt",
              text: "Un'ombra?"
            },
            {
              kind: "speech", x: 0.54, y: 0.84, w: 0.42, tail: "tl", who: "Luce",
              text: "Non ancora."
            }
          ]
        },
        {
          id: "q08-4",
          bg: "galleriaMilano",
          theme: "dark",
          fx: ["shadowHands", "mirrorShards", "flicker"],
          chars: [],
          balloons: [
            {
              kind: "caption", x: 0.04, y: 0.05, w: 0.58,
              text: "Sul muro della Galleria, una scritta nuova."
            },
            {
              kind: "speech", x: 0.34, y: 0.58, w: 0.54, tail: "tl", who: "L'ombra",
              text: "Ci vediamo presto."
            },
            {
              kind: "end", x: 0.06, y: 0.84, w: 0.88,
              text: "FINE DELL'EPISODIO 2 · PROSSIMAMENTE: LA CITTÀ CHE RICORDA"
            }
          ]
        }
      ]
    }
  ]
};
