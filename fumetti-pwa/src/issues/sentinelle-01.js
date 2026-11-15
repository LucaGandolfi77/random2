/* SENTINELLE — Episodio 1: "La città senza luci".
 *
 * A complete, original Italian superhero noir. Every page is data: the
 * reader lays it out with CSS, art.js paints the panels on canvas, and the
 * balloons are real DOM text so they stay selectable and screen-reader
 * friendly. Coordinates are fractions of the panel: x/y is the top-left of
 * a balloon, w its width; a character's x/y is the point between the feet.
 */

export const sentinelle01 = {
  id: "sentinelle-01",
  slug: "sentinelle-01",
  series: "SENTINELLE",
  title: "La città senza luci",
  number: 1,
  kicker: "Episodio 1",
  genre: "Noir supereroistico",
  coverAlt: "Tre supereroi su un tetto di Milano sotto la pioggia.",
  tagline: "Tre supereroi. Una Milano sotto la pioggia. Un uomo che ruba la luce.",
  description:
    "Quattro blackout in una settimana, tutti a Milano, nessun guasto. Aurora, Tino e Marta scendono in strada per capire chi sta spegnendo la città — e trovano un uomo che, anni fa, è rimasto al buio quando contava di più.",
  credits: "Storia, dialoghi e disegno generati dal codice. Un fumetto originale di random2.",
  readingTime: "8 tavole · circa 10 minuti",

  cover: {
    id: "cover",
    bg: "rooftopMilano",
    theme: "night",
    fx: ["rain", "fog", "lightning"],
    chars: [
      { who: "luce", x: 0.27, y: 0.876, s: 0.92, pose: "stand" },
      { who: "volt", x: 0.45, y: 0.884, s: 0.86, pose: "stand", flip: true },
      { who: "muro", x: 0.63, y: 0.872, s: 0.95, pose: "stand" }
    ]
  },

  end: {
    kicker: "Fine dell'episodio 1",
    title: "La città senza luci",
    text:
      "Milano si è riaccesa. Ettore Valli è vivo, e qualcuno ha pagato la cura senza firmarsi. Le Sentinelle hanno un nome che non hanno scelto — e un quartiere che le guarda.",
    teaser: "Continua con l'Episodio 2: L'uomo senza ombra."
  },

  pages: [
    {
      id: "pagina-01",
      layout: "splash",
      panels: [
        {
          id: "p01-1",
          bg: "rooftopMilano",
          theme: "night",
          fx: ["rain", "fog", "lightning"],
          chars: [
            { who: "luce", x: 0.24, y: 0.877, s: 0.92, pose: "stand" },
            { who: "volt", x: 0.43, y: 0.882, s: 0.86, pose: "stand", flip: true },
            { who: "muro", x: 0.61, y: 0.874, s: 0.95, pose: "stand" }
          ],
          balloons: [
            {
              kind: "caption", x: 0.045, y: 0.048, w: 0.55,
              text: "MILANO, 02:13. La città ha smesso di lampeggiare."
            },
            {
              kind: "caption", x: 0.045, y: 0.165, w: 0.42,
              text: "Quattro blackout in una settimana. Nessun guasto. Nessuna spiegazione."
            },
            {
              kind: "caption", x: 0.045, y: 0.845, w: 0.34,
              text: "SENTINELLE · EPISODIO 1"
            },
            {
              kind: "whisper", x: 0.575, y: 0.635, w: 0.36, tail: "bl",
              who: "Una voce nel buio",
              text: "«Spegnete tutto. Così mi vedrete.»"
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
          id: "p02-1",
          bg: "tramStreet",
          theme: "night",
          fx: ["rain", "fog"],
          chars: [
            { who: "luce", x: 0.70, y: 0.874, s: 0.78, pose: "stand" },
            { who: "volt", x: 0.80, y: 0.882, s: 0.74, pose: "stand", flip: true },
            { who: "muro", x: 0.89, y: 0.874, s: 0.8, pose: "stand" }
          ],
          balloons: [
            {
              kind: "caption", x: 0.04, y: 0.045, w: 0.56,
              text: "Capolinea 1."
            },
            {
              kind: "speech", x: 0.05, y: 0.20, w: 0.58, tail: "br", who: "Volt",
              text: "Quattro blackout. Solo a Milano. Nessun guasto."
            },
            {
              kind: "speech", x: 0.38, y: 0.68, w: 0.56, tail: "br", who: "Luce",
              text: "Il buio non ha odore. Ma stanotte sembra... diretto."
            }
          ]
        },
        {
          id: "p02-2",
          bg: "barInterior",
          theme: "bar",
          chars: [
            { who: "crowd", x: 0.19, y: 0.9, s: 0.42, pose: "stand" }
          ],
          balloons: [
            {
              kind: "tv", x: 0.06, y: 0.06, w: 0.66, who: "TG della notte",
              text: "QUARTO BLACKOUT. ENEL: «NESSUN GUASTO»."
            },
            {
              kind: "speech", x: 0.30, y: 0.66, w: 0.62, tail: "bl", who: "Muro",
              text: "Mia madre è di turno a Niguarda."
            }
          ]
        },
        {
          id: "p02-3",
          bg: "tramStreet",
          theme: "dark",
          noLights: true,
          fx: ["rain", "darkSmoke"],
          chars: [
            { who: "volt", x: 0.53, y: 0.874, s: 0.86, pose: "stand" },
            { who: "luce", x: 0.67, y: 0.874, s: 0.88, pose: "stand" },
            { who: "muro", x: 0.81, y: 0.874, s: 0.9, pose: "stand" }
          ],
          balloons: [
            {
              kind: "caption", x: 0.045, y: 0.05, w: 0.62,
              text: "Si spengono una alla volta. Non tutte insieme."
            },
            {
              kind: "speech", x: 0.07, y: 0.68, w: 0.52, tail: "br", who: "Volt",
              text: "Okay. Non è un guasto."
            },
            {
              kind: "sfx", x: 0.65, y: 0.30, rotate: -8, color: "amber",
              text: "TOK"
            }
          ]
        },
        {
          id: "p02-4",
          bg: "tramStreet",
          theme: "dark",
          noLights: true,
          fx: ["rain", "darkSmoke", "fog"],
          chars: [
            { who: "nero", x: 0.55, y: 0.70, s: 0.62, pose: "loom" }
          ],
          balloons: [
            {
              kind: "whisper", x: 0.08, y: 0.09, w: 0.58, tail: "br", who: "La voce",
              text: "«Così mi vedrete.»"
            },
            {
              kind: "speech", x: 0.43, y: 0.66, w: 0.52, tail: "tl", who: "Luce",
              text: "Qualcuno sta bevendo la luce."
            },
            {
              kind: "sfx", x: 0.58, y: 0.31, rotate: 6, color: "cyan",
              text: "SSSH"
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
          id: "p03-1",
          bg: "depot",
          theme: "night",
          fx: ["fog"],
          chars: [
            { who: "luce", x: 0.30, y: 0.885, s: 0.9, pose: "stand" },
            { who: "volt", x: 0.50, y: 0.885, s: 0.86, pose: "stand", flip: true },
            { who: "muro", x: 0.70, y: 0.885, s: 0.95, pose: "stand" }
          ],
          balloons: [
            {
              kind: "caption", x: 0.04, y: 0.05, w: 0.36,
              text: "Deposito ATM, Darsena. 02:41."
            },
            {
              kind: "speech", x: 0.43, y: 0.07, w: 0.54, tail: "bl", who: "Luce",
              text: "Non siamo nati con un mantello. Ci siamo trovati con un dono."
            },
            {
              kind: "caption", x: 0.04, y: 0.83, w: 0.5,
              text: "E un quartiere che non poteva aspettare."
            }
          ]
        },
        {
          id: "p03-2",
          bg: "depot",
          theme: "night",
          fx: ["lightBeam", "fog"],
          chars: [
            { who: "luce", x: 0.52, y: 0.89, s: 1.02, pose: "cast" }
          ],
          balloons: [
            {
              kind: "speech", x: 0.07, y: 0.07, w: 0.56, tail: "br", who: "Luce",
              text: "Regola uno: niente nomi, niente gloria."
            },
            {
              kind: "sfx", x: 0.60, y: 0.76, rotate: -6, color: "amber",
              text: "FSSH"
            }
          ]
        },
        {
          id: "p03-3",
          bg: "depot",
          theme: "night",
          chars: [
            { who: "muro", x: 0.5, y: 0.89, s: 1.05, pose: "guard" }
          ],
          balloons: [
            {
              kind: "speech", x: 0.08, y: 0.08, w: 0.6, tail: "br", who: "Muro",
              text: "Regola due: si torna tutti a casa."
            }
          ]
        },
        {
          id: "p03-4",
          bg: "tramStreet",
          theme: "night",
          fx: ["rain", "speedLines", "lightning"],
          chars: [
            { who: "volt", x: 0.47, y: 0.87, s: 0.95, pose: "run" }
          ],
          balloons: [
            {
              kind: "speech", x: 0.08, y: 0.08, w: 0.66, tail: "br", who: "Volt",
              text: "Regola tre: chi arriva primo aspetta gli altri."
            },
            {
              kind: "sfx", x: 0.66, y: 0.62, rotate: 10, color: "cyan",
              text: "ZIP"
            }
          ]
        },
        {
          id: "p03-5",
          bg: "darsena",
          theme: "night",
          fx: ["rain", "fog", "glass"],
          chars: [
            { who: "luce", x: 0.33, y: 0.87, s: 0.85, pose: "stand" },
            { who: "muro", x: 0.5, y: 0.87, s: 0.86, pose: "stand" },
            { who: "volt", x: 0.66, y: 0.875, s: 0.8, pose: "kneel" }
          ],
          balloons: [
            {
              kind: "caption", x: 0.045, y: 0.05, w: 0.56,
              text: "Dove passava il buio restava vetro nero."
            },
            {
              kind: "speech", x: 0.56, y: 0.70, w: 0.36, tail: "bl", who: "Luce",
              text: "Seguitelo."
            },
            {
              kind: "sfx", x: 0.16, y: 0.46, rotate: -12, color: "cream",
              text: "CRIK"
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
          id: "p04-1",
          bg: "powerStation",
          theme: "dark",
          fx: ["fog", "embers"],
          chars: [
            { who: "luce", x: 0.28, y: 0.88, s: 0.84, pose: "stand" },
            { who: "volt", x: 0.48, y: 0.88, s: 0.82, pose: "stand", flip: true },
            { who: "muro", x: 0.68, y: 0.88, s: 0.88, pose: "stand" }
          ],
          balloons: [
            {
              kind: "caption", x: 0.04, y: 0.05, w: 0.5,
              text: "Centrale di Porta Volta. Zona interdetta."
            },
            {
              kind: "speech", x: 0.58, y: 0.07, w: 0.38, tail: "br", who: "Volt",
              text: "Nessuno paga da sei anni. Eppure respira."
            }
          ]
        },
        {
          id: "p04-2",
          bg: "powerStation",
          theme: "dark",
          fx: ["darkSmoke", "embers"],
          chars: [
            { who: "nero", x: 0.52, y: 0.79, s: 1.15, pose: "loom" }
          ],
          balloons: [
            {
              kind: "speech", x: 0.07, y: 0.07, w: 0.56, tail: "br", who: "Nero",
              text: "Siete arrivati prima del previsto."
            },
            {
              kind: "speech", x: 0.40, y: 0.60, w: 0.54, tail: "tl", who: "Nero",
              text: "Io ho smesso di aspettare molto tempo fa."
            }
          ]
        },
        {
          id: "p04-3",
          bg: "powerStation",
          theme: "dark",
          fx: ["lightning", "impact", "speedLines"],
          chars: [
            { who: "volt", x: 0.38, y: 0.875, s: 0.95, pose: "punch" },
            { who: "nero", x: 0.63, y: 0.79, s: 1.05, pose: "loom", flip: true }
          ],
          balloons: [
            {
              kind: "sfx", x: 0.06, y: 0.58, rotate: -6, color: "cyan",
              text: "ZZRAK"
            },
            {
              kind: "speech", x: 0.30, y: 0.07, w: 0.6, tail: "bl", who: "Nero",
              text: "La tua elettricità è luce che urla."
            }
          ]
        },
        {
          id: "p04-4",
          bg: "powerStation",
          theme: "dark",
          fx: ["lightBeam", "darkSmoke", "embers"],
          chars: [
            { who: "luce", x: 0.34, y: 0.875, s: 0.98, pose: "cast" },
            { who: "nero", x: 0.65, y: 0.79, s: 1.05, pose: "point" }
          ],
          balloons: [
            {
              kind: "speech", x: 0.06, y: 0.07, w: 0.5, tail: "br", who: "Luce",
              text: "Allora prendi anche la mia."
            },
            {
              kind: "speech", x: 0.43, y: 0.50, w: 0.51, tail: "tl", who: "Nero",
              text: "Io ho spento un ospedale."
            },
            {
              kind: "sfx", x: 0.12, y: 0.38, rotate: 4, color: "amber",
              text: "FWOOM"
            }
          ]
        },
        {
          id: "p04-5",
          bg: "powerStation",
          theme: "dark",
          fx: ["impact", "darkSmoke", "embers"],
          chars: [
            { who: "muro", x: 0.38, y: 0.875, s: 1.0, pose: "guard" },
            { who: "nero", x: 0.67, y: 0.79, s: 1.05, pose: "point" }
          ],
          balloons: [
            {
              kind: "speech", x: 0.06, y: 0.07, w: 0.48, tail: "br", who: "Muro",
              text: "Ragazzi... il mio muro sta cedendo."
            },
            {
              kind: "speech", x: 0.42, y: 0.44, w: 0.52, tail: "tl", who: "Nero",
              text: "Conosco i vostri nomi."
            },
            {
              kind: "sfx", x: 0.11, y: 0.66, rotate: -4, color: "cream",
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
          id: "p05-1",
          bg: "hospitalCorridor",
          theme: "hospital",
          fx: ["fog"],
          chars: [
            { who: "nurse", x: 0.40, y: 0.90, s: 1.2, pose: "run" }
          ],
          balloons: [
            {
              kind: "caption", x: 0.04, y: 0.05, w: 0.5,
              text: "Niguarda, 14 gennaio 2019."
            },
            {
              kind: "caption", x: 0.04, y: 0.26, w: 0.54,
              text: "Il reparto è al buio. Le torce sono lucciole."
            }
          ]
        },
        {
          id: "p05-2",
          bg: "hospitalRoom",
          theme: "hospital",
          fx: ["lightBeam", "fog"],
          chars: [
            { who: "ettore", x: 0.38, y: 0.89, s: 0.8, pose: "kneel" },
            { who: "ada", x: 0.68, y: 0.62, s: 0.9, pose: "lie" }
          ],
          balloons: [
            {
              kind: "speech", x: 0.06, y: 0.07, w: 0.48, tail: "br", who: "Ettore",
              text: "Ada, resta con me."
            },
            {
              kind: "speech", x: 0.50, y: 0.30, w: 0.44, tail: "bl", who: "Ada",
              text: "Non farla spegnere."
            }
          ]
        },
        {
          id: "p05-3",
          bg: "hospitalRoom",
          theme: "hospital",
          fx: ["fog"],
          chars: [
            { who: "ettore", x: 0.38, y: 0.89, s: 0.8, pose: "kneel" },
            { who: "ada", x: 0.68, y: 0.62, s: 0.9, pose: "lie" }
          ],
          balloons: [
            {
              kind: "caption", x: 0.04, y: 0.05, w: 0.58,
              text: "Il generatore durò undici minuti."
            },
            {
              kind: "sfx", x: 0.28, y: 0.48, rotate: 0, color: "cyan",
              text: "TIC TIC"
            },
            {
              kind: "speech", x: 0.08, y: 0.70, w: 0.52, tail: "tl", who: "Ettore",
              text: "Respira, Ada. Ti prego."
            }
          ]
        },
        {
          id: "p05-4",
          bg: "powerStation",
          theme: "dark",
          fx: ["darkSmoke", "embers"],
          chars: [
            { who: "muro", x: 0.23, y: 0.88, s: 0.9, pose: "stand" },
            { who: "nero", x: 0.56, y: 0.79, s: 1.05, pose: "loom" }
          ],
          balloons: [
            {
              kind: "speech", x: 0.06, y: 0.07, w: 0.56, tail: "br", who: "Muro",
              text: "Quel bracciale è di Niguarda."
            },
            {
              kind: "speech", x: 0.46, y: 0.66, w: 0.5, tail: "tl", who: "Nero",
              text: "Allora sai com'è aspettare."
            }
          ]
        },
        {
          id: "p05-5",
          bg: "powerStation",
          theme: "dark",
          fx: ["lightBeam", "embers"],
          chars: [
            { who: "luce", x: 0.38, y: 0.88, s: 0.95, pose: "reach" },
            { who: "nero", x: 0.64, y: 0.83, s: 0.92, pose: "kneel" }
          ],
          balloons: [
            {
              kind: "speech", x: 0.06, y: 0.07, w: 0.6, tail: "br", who: "Luce",
              text: "Non sei il buio, Ettore. Sei rimasto al buio."
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
          id: "p06-1",
          bg: "powerStation",
          theme: "dark",
          fx: ["lightning", "embers", "speedLines"],
          chars: [
            { who: "volt", x: 0.42, y: 0.88, s: 0.96, pose: "carry" }
          ],
          balloons: [
            {
              kind: "speech", x: 0.06, y: 0.07, w: 0.54, tail: "br", who: "Volt",
              text: "Posso ridare corrente. Per trenta secondi."
            },
            {
              kind: "sfx", x: 0.60, y: 0.52, rotate: 8, color: "cyan",
              text: "KRK"
            }
          ]
        },
        {
          id: "p06-2",
          bg: "powerStation",
          theme: "dark",
          fx: ["lightThreads", "embers"],
          chars: [
            { who: "muro", x: 0.44, y: 0.88, s: 1.04, pose: "cast" }
          ],
          balloons: [
            {
              kind: "speech", x: 0.07, y: 0.07, w: 0.52, tail: "br", who: "Muro",
              text: "Tengo la tempesta. Fate il resto."
            }
          ]
        },
        {
          id: "p06-3",
          bg: "lightStorm",
          theme: "dark",
          fx: ["lightThreads", "embers", "phoneLights"],
          chars: [
            { who: "luce", x: 0.34, y: 0.88, s: 1.0, pose: "cast" },
            { who: "nero", x: 0.68, y: 0.81, s: 0.98, pose: "loom" }
          ],
          balloons: [
            {
              kind: "caption", x: 0.04, y: 0.05, w: 0.62,
              text: "Ogni lampione. Ogni telefono. Ogni finestra."
            },
            {
              kind: "speech", x: 0.08, y: 0.70, w: 0.42, tail: "bl", who: "Luce",
              text: "Tutta la città."
            }
          ]
        },
        {
          id: "p06-4",
          bg: "lightStorm",
          theme: "dark",
          fx: ["lightBeam", "embers", "lightThreads"],
          chars: [
            { who: "luce", x: 0.35, y: 0.88, s: 0.92, pose: "reach" },
            { who: "nero", x: 0.58, y: 0.83, s: 0.96, pose: "kneel" }
          ],
          balloons: [
            {
              kind: "speech", x: 0.07, y: 0.07, w: 0.36, tail: "br", who: "Nero",
              text: "Perché?"
            },
            {
              kind: "speech", x: 0.28, y: 0.34, w: 0.56, tail: "bl", who: "Luce",
              text: "Nessuno dovrebbe spegnersi da solo."
            },
            {
              kind: "sfx", x: 0.44, y: 0.74, rotate: -4, color: "amber",
              text: "FSSSH"
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
          id: "p07-1",
          bg: "dawnNavigli",
          theme: "dawn",
          fx: ["fog", "embers"],
          chars: [
            { who: "luce", x: 0.30, y: 0.88, s: 0.86, pose: "stand" },
            { who: "muro", x: 0.64, y: 0.88, s: 0.88, pose: "stand" },
            { who: "volt", x: 0.77, y: 0.885, s: 0.8, pose: "stand", flip: true },
            { who: "nero", x: 0.50, y: 0.86, s: 0.82, pose: "kneel" }
          ],
          balloons: [
            {
              kind: "caption", x: 0.04, y: 0.05, w: 0.42,
              text: "05:41. La città tornò a respirare."
            },
            {
              kind: "speech", x: 0.31, y: 0.34, w: 0.5, tail: "tl", who: "Nero",
              text: "Volevo solo che qualcuno vedesse."
            },
            {
              kind: "speech", x: 0.06, y: 0.74, w: 0.42, tail: "tr", who: "Luce",
              text: "L'abbiamo visto. Resta con noi."
            }
          ]
        },
        {
          id: "p07-2",
          bg: "dawnNavigli",
          theme: "dawn",
          fx: ["phoneLights", "fog"],
          chars: [
            { who: "crowd", x: 0.5, y: 0.86, s: 0.7, pose: "stand" }
          ],
          balloons: [
            {
              kind: "caption", x: 0.04, y: 0.05, w: 0.62,
              text: "Qualcuno ci riprese. Per non dimenticare."
            },
            {
              kind: "speech", x: 0.06, y: 0.58, w: 0.48, tail: "br", who: "Volt",
              text: "Sentinelle? Sembriamo tre lampioni."
            },
            {
              kind: "speech", x: 0.52, y: 0.76, w: 0.44, tail: "tl", who: "Muro",
              text: "Meglio dei ragazzi del buio."
            }
          ]
        },
        {
          id: "p07-3",
          bg: "dawnNavigli",
          theme: "dawn",
          fx: ["fog", "embers"],
          chars: [
            { who: "luce", x: 0.29, y: 0.88, s: 0.88, pose: "stand" },
            { who: "volt", x: 0.47, y: 0.885, s: 0.84, pose: "stand", flip: true },
            { who: "muro", x: 0.64, y: 0.88, s: 0.9, pose: "stand" }
          ],
          balloons: [
            {
              kind: "caption", x: 0.04, y: 0.05, w: 0.58,
              text: "«CHI HA RIACCESO MILANO?»"
            },
            {
              kind: "speech", x: 0.33, y: 0.64, w: 0.4, tail: "bl", who: "Luce",
              text: "Niente nomi."
            },
            {
              kind: "speech", x: 0.52, y: 0.78, w: 0.42, tail: "tl", who: "Volt",
              text: "Però un caffè sì."
            }
          ]
        },
        {
          id: "p07-4",
          bg: "piazzaMorning",
          theme: "morning",
          fx: ["fog"],
          chars: [
            { who: "stranger", x: 0.54, y: 0.87, s: 0.96, pose: "stand" }
          ],
          balloons: [
            {
              kind: "caption", x: 0.04, y: 0.05, w: 0.58,
              text: "Milano aveva di nuovo la luce."
            },
            {
              kind: "caption", x: 0.04, y: 0.24, w: 0.52,
              text: "Qualcuno non proiettava ombra."
            },
            {
              kind: "speech", x: 0.36, y: 0.64, w: 0.48, tail: "tl", who: "Lo sconosciuto",
              text: "Che nome rassicurante."
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
          id: "p08-1",
          bg: "piazzaMorning",
          theme: "morning",
          fx: ["fog", "cafeTable"],
          chars: [
            { who: "luce", x: 0.34, y: 0.86, s: 0.8, pose: "sit" },
            { who: "volt", x: 0.50, y: 0.86, s: 0.76, pose: "sit", flip: true },
            { who: "muro", x: 0.65, y: 0.86, s: 0.82, pose: "sit" }
          ],
          balloons: [
            {
              kind: "caption", x: 0.04, y: 0.05, w: 0.42,
              text: "Bar Centrale. 08:12."
            },
            {
              kind: "speech", x: 0.06, y: 0.60, w: 0.48, tail: "br", who: "Volt",
              text: "Tre tavole, quattro caffè."
            },
            {
              kind: "speech", x: 0.52, y: 0.76, w: 0.44, tail: "tl", who: "Muro",
              text: "Il quarto è di mia madre."
            }
          ]
        },
        {
          id: "p08-2",
          bg: "newspaper",
          theme: "morning",
          chars: [],
          balloons: [
            {
              kind: "caption", x: 0.04, y: 0.05, w: 0.44,
              text: "Ieri notte"
            },
            {
              kind: "speech", x: 0.08, y: 0.58, w: 0.56, tail: "br", who: "Muro",
              text: "L'ospedale ha ricevuto una donazione."
            },
            {
              kind: "speech", x: 0.58, y: 0.80, w: 0.34, tail: "tl", who: "Luce",
              text: "Meglio così."
            }
          ]
        },
        {
          id: "p08-3",
          bg: "piazzaMorning",
          theme: "morning",
          fx: ["fog", "phoneLights"],
          chars: [
            { who: "stranger", x: 0.55, y: 0.87, s: 0.94, pose: "stand" },
            { who: "crowd", x: 0.2, y: 0.88, s: 0.42, pose: "stand" }
          ],
          balloons: [
            {
              kind: "caption", x: 0.04, y: 0.05, w: 0.56,
              text: "Qualcuno non aveva finito."
            }
          ]
        },
        {
          id: "p08-4",
          bg: "piazzaMorning",
          theme: "morning",
          fx: ["fog"],
          chars: [
            { who: "stranger", x: 0.52, y: 0.90, s: 1.55, pose: "stand" }
          ],
          balloons: [
            {
              kind: "speech", x: 0.06, y: 0.07, w: 0.52, tail: "br", who: "Lo sconosciuto",
              text: "Che nome rassicurante."
            },
            {
              kind: "end", x: 0.06, y: 0.82, w: 0.88,
              text: "FINE DELL'EPISODIO 1 · CONTINUA CON L'UOMO SENZA OMBRA"
            }
          ]
        }
      ]
    }
  ]
};
