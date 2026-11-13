import { mkdir, writeFile } from 'node:fs/promises';
import { FILM, sceneStarts } from '../src/data/film';
import { formatTime } from '../src/engine/Persistence';

const starts = sceneStarts();
const outDir = 'docs';
await mkdir(outDir, { recursive: true });

const header = `# NEVE E FERRO

**Liberamente ispirato ad *Anna Karenina* di Lev Tolstoj**

- Formato: 16:9 · palcoscenico virtuale 1920×1080
- Durata: 25:00 (1500 secondi)
- Scene: 12
- Inquadrature: ${FILM.scenes.reduce((sum, scene) => sum + scene.shots.length, 0)}
- Dialoghi, pensieri e sottotitoli: ${FILM.scenes.reduce((sum, scene) => sum + scene.subtitles.length, 0)}

> Un inverno. Un treno. Una scelta.  
> L'amore non sempre salva: a volte rivela la gabbia.
`;

const sceneTable = `| # | Sequenza | Durata | Inizio | Ambientazione | Musica |
|---|---|---|---|---|---|
${FILM.scenes
  .map(
    (scene, index) =>
      `| ${index + 1} | ${scene.title} | ${formatTime(scene.duration)} | ${formatTime(starts[index] ?? 0)} | ${scene.environment} | ${scene.music.id} |`
  )
  .join('\n')}
`;

const screenplaySections = FILM.scenes
  .map((scene, index) => {
    const lines = scene.subtitles
      .map(
        (cue) =>
          `- **${formatTime(cue.start)}–${formatTime(cue.end)} · ${cue.kind === 'narration' ? 'NARRAZIONE' : cue.kind === 'thought' ? `PENSIERO DI ${cue.speaker}` : cue.speaker}**: ${cue.text}`
      )
      .join('\n');
    const shots = scene.shots
      .map(
        (shot) =>
          `- ${formatTime(shot.start)}–${formatTime(shot.start + shot.duration)} · *${shot.id}* · ${shot.environment} · ${
            shot.actors.length ? shot.actors.map((actor) => actor.character).join(', ') : 'nessun personaggio in campo'
          }`
      )
      .join('\n');
    return `## ${index + 1}. ${scene.title} — ${formatTime(scene.duration)}

**Ambientazione:** ${scene.environment}  
**Musica:** ${scene.music.id} (${scene.music.mode}, ${scene.music.tempo} BPM, intensità ${scene.music.intensity})  
**Ambienza:** ${scene.ambience.join(', ')}

**Inquadrature**

${shots}

**Dialoghi, pensieri e narrazione**

${lines || '- Nessuna battuta: la sequenza è affidata a immagine, montaggio e suono.'}

**Transizione in uscita:** ${scene.transition ?? 'fade'}${scene.musicStopAt !== undefined ? ` · musica in silenzio da ${formatTime(scene.musicStopAt)}` : ''}

---`;
  })
  .join('\n\n');

const screenplay = `${header}

## Nota di regia

Il film non è un adattamento lineare. È un ritratto per soglie: vetri, specchi, porte, vagoni, banchine. Anna è sempre vista mentre viene vista. Kitty e Levin non sono la coppia che la condanna, ma un'altra velocità dell'amore. Karenin non è un antagonista: è un uomo che ha scambiato l'ordine per amore. Vronskij non è un cinico: è un uomo che confonde la libertà con l'assenza di conseguenze.

Il finale non mostra il corpo di Anna. Mostra l'assenza, la neve che copre le tracce, il rumore che resta.

## Struttura

${sceneTable}

${screenplaySections}

## Titoli di coda

Un film originale ispirato ad *Anna Karenina* di Lev Tolstoj.  
Sceneggiatura, regia, animazione, musica e sviluppo realizzati per questo progetto.  
Immagini vettoriali originali. Partitura e sound design sintetizzati in Web Audio.  
Tipografia: Cormorant Garamond e Inter (SIL Open Font License).  
Nessun frame, voce o musica proveniente da adattamenti esistenti.

> A chi cerca una voce propria.
`;

const storyboardSections = FILM.scenes
  .map((scene, index) => {
    const shots = scene.shots
      .map((shot) => {
        const camera = shot.camera
          .map(
            (key) =>
              `t=${key.t.toFixed(1)}s → centro (${key.x.toFixed(0)}, ${key.y.toFixed(0)}), zoom ${key.zoom.toFixed(2)}`
          )
          .join(' · ');
        const actors = shot.actors.length
          ? shot.actors
              .map(
                (track) =>
                  `**${track.character}${track.back ? ' (di spalle)' : ''}**: ${track.keys
                    .map(
                      (key) =>
                        `t=${key.t.toFixed(1)} (${key.x.toFixed(0)}, ${key.y.toFixed(0)}) scala ${key.scale.toFixed(2)} · ${key.pose} · ${key.expression}${key.opacity !== undefined ? ` · opacità ${key.opacity}` : ''}${key.blur ? ` · blur ${key.blur}` : ''}`
                    )
                    .join(' → ')}`
              )
              .join('<br/>')
          : 'Nessun personaggio in campo: paesaggio, oggetto o luce.';
        const sfx = (shot.sfx ?? []).map((cue) => `${cue.id}@${cue.t.toFixed(1)}s`).join(', ') || '—';
        const effects = (shot.effects ?? []).map((effect) => `${effect.type} ${effect.intensity ?? 1}`).join(', ') || '—';
        const props = (shot.props ?? []).map((prop) => `${prop.id} (${prop.x}, ${prop.y})`).join(', ') || '—';
        return `### ${shot.id}

- **Tempo:** ${formatTime(shot.start)}–${formatTime(shot.start + shot.duration)} (${shot.duration}s)
- **Ambiente:** ${shot.environment}
- **Camera:** ${camera}
- **Blocking:** ${actors}
- **Effetti:** ${effects}
- **Suoni:** ${sfx}
- **Props:** ${props}
`;
      })
      .join('\n');
    return `## ${index + 1}. ${scene.title} — ${formatTime(scene.duration)}

${shots}`;
  })
  .join('\n---\n\n');

const storyboard = `# NEVE E FERRO — Storyboard tecnico

${header}

> Questo documento è generato dai dati della timeline. Le inquadrature sono 79; ogni shot contiene camera, blocking, effetti, suoni e props. La regia privilegia long take, primi piani, viste di spalle in primo piano e transizioni per corrispondenza.

${storyboardSections}
`;

await writeFile(`${outDir}/screenplay.md`, screenplay, 'utf8');
await writeFile(`${outDir}/storyboard.md`, storyboard, 'utf8');
console.log('docs/screenplay.md e docs/storyboard.md generati.');
