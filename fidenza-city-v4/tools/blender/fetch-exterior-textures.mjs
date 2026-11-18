#!/usr/bin/env node
/**
 * Scarica le foto CC degli esterni dei principali edifici di Fidenza.
 * Genera SOURCES.md e tools/blender/exterior-textures.json con attribuzione.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const outDir = resolve(root, 'assets/textures/exteriors');
mkdirSync(outDir, { recursive: true });

const API = 'https://commons.wikimedia.org/w/api.php';
const HEADERS = { 'User-Agent': 'FidenzaGameBuilder/1.0 (exterior texture research)' };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/** [nome locale, edificio, lato, titolo su Commons] */
const SOURCES = [
  ['duomo-facciata', 'duomo', 'front', 'File:Duomo (Fidenza) - facciata 1 2022-07-18.jpg'],
  ['duomo-lato-nord', 'duomo', 'side', 'File:Duomo (Fidenza) - facciata e lato nord 2019-10-02.jpg'],
  ['duomo-lato-sud', 'duomo', 'side', 'File:Duomo (Fidenza) - abside e lato sud 2019-10-02.jpg'],
  ['duomo-protiro', 'duomo', 'detail', 'File:Duomo (Fidenza) - protiro 1 2022-07-18.jpg'],
  ['duomo-portale', 'duomo', 'detail', 'File:Duomo (Fidenza) - portale d\'ingresso sinistro 2022-07-18.jpg'],
  ['duomo-campanile', 'duomo', 'detail', 'File:Ingresso e campanile del Duomo di Fidenza.jpg'],
  ['porta-esterno', 'porta', 'front', 'File:Porta di San Donnino (Fidenza) - lato esterno 1 2019-10-02.jpg'],
  ['porta-interno', 'porta', 'back', 'File:Porta di San Donnino (Fidenza) - lato interno 2019-10-02.jpg'],
  ['teatro-facciata', 'teatro', 'front', 'File:Teatro Girolamo Magnani (Fidenza) - facciata 1 2019-10-02.jpg'],
  ['teatro-dettaglio', 'teatro', 'detail', 'File:Teatro Girolamo Magnani, dettaglio facciata.jpg'],
  ['teatro-stemma', 'teatro', 'detail', 'File:Teatro Girolamo Magnani, stemma facciata.jpg'],
  ['comune-facciata', 'comunale', 'front', 'File:Municipio di Fidenza.jpg'],
  ['comune-porticato', 'comunale', 'detail', 'File:Palazzo Comunale (Fidenza) - porticato 2019-10-02.jpg'],
  ['comune-torre', 'comunale', 'back', 'File:Palazzo Comunale (Fidenza) - retro e torre campanaria 1 2019-10-02.jpg'],
  ['stazione-facciata', 'stazione', 'front', 'File:Stazione ferroviaria di Fidenza.jpg'],
  ['stazione-orologio', 'stazione', 'detail', 'File:Fidenza staz ferr orologio.jpg'],
  ['stazione-lato', 'stazione', 'side', 'File:Stazione ferroviaria Fidenza, PR, Italia 04.jpg'],
  ['sanpietro-facciata', 'sanpietro', 'front', 'File:Chiesa di San Pietro (Fidenza) - facciata 2019-10-02.jpg'],
  ['sanpietro-convento', 'sanpietro', 'side', 'File:Chiesa di San Pietro (Fidenza) - convento e facciata 1 2019-10-02.jpg'],
  ['granmadre-facciata', 'granmadre', 'front', 'File:Santuario della Gran Madre di Dio (Fidenza) - facciata 2019-10-02.jpg'],
  ['granmadre-lato', 'granmadre', 'side', 'File:Santuario della Gran Madre di Dio (Fidenza) - facciata e lato ovest 2019-10-02.jpg'],
  ['granmadre-collegio', 'granmadre', 'detail', 'File:Via Agostino Berenini (Fidenza) - santuario della Gran Madre di Dio e collegio dei Gesuiti 2019-10-02.jpg'],
];

function stripHtml(value) {
  return String(value || '').replace(/<[^>]+>/g, '').trim();
}

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', ...params })}`;
  for (let attempt = 0; attempt < 6; attempt++) {
    const response = await fetch(url, { headers: HEADERS });
    if (response.ok) return response.json();
    if (response.status !== 429 || attempt === 5) throw new Error(`Commons API ${response.status}`);
    console.log('  rate limit API, attendo…');
    await sleep(3000 * (attempt + 1));
  }
  throw new Error('Commons API non disponibile');
}

const manifest = [];
const lines = [
  '# Fonti fotografiche degli esterni',
  '',
  'Le immagini in `assets/textures/exteriors/` derivano dalle foto sotto.',
  'Sono state **ridimensionate** (lato max ~1280 px) e **ricompress** in JPEG',
  'per l’uso come texture. I file derivati restano soggetti alla licenza della',
  'foto originale; il resto del progetto mantiene la propria licenza.',
  '',
  '| File locale | Edificio | Fonte | Autore | Licenza |',
  '| --- | --- | --- | --- | --- |',
];

for (const [local, building, side, title] of SOURCES) {
  try {
    const data = await api({
      action: 'query', prop: 'imageinfo', iiprop: 'url|extmetadata',
      iiurlwidth: '1024', titles: title,
    });
    const page = Object.values(data.query.pages)[0];
    const info = page?.imageinfo?.[0];
    if (!info) {
      console.warn('SKIP (non trovato):', title);
      continue;
    }
    const metadata = info.extmetadata || {};
    const license = stripHtml(metadata.LicenseShortName?.value) || 'sconosciuta';
    const author = stripHtml(metadata.Artist?.value) || 'autore non indicato';
    const descriptionUrl = info.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(title)}`;
    const sourceUrl = info.thumburl || info.url;
    let imageResponse = null;
    for (let attempt = 0; attempt < 6; attempt++) {
      await sleep(600);
      imageResponse = await fetch(sourceUrl, { headers: HEADERS });
      if (imageResponse.ok) break;
      if (imageResponse.status !== 429 || attempt === 5) throw new Error(`download ${imageResponse.status}`);
      console.log('  rate limit download, attendo…');
      await sleep(2500 * (attempt + 1));
    }
    const filename = local + '.jpg';
    writeFileSync(resolve(outDir, filename), Buffer.from(await imageResponse.arrayBuffer()));
    manifest.push({
      local: filename, building, side,
      title: title.replace(/^File:/, ''), author, license, source: descriptionUrl,
    });
    lines.push(`| \`${filename}\` | ${building} (${side}) | [${title.replace(/^File:/, '')}](${descriptionUrl}) | ${author} | ${license} |`);
    console.log('OK', filename, license);
  } catch (err) {
    console.warn('ERRORE', title, err.message);
  }
  await sleep(800);
}

writeFileSync(resolve(root, 'tools/blender/exterior-textures.json'), JSON.stringify(manifest, null, 2));
writeFileSync(resolve(outDir, 'SOURCES.md'), lines.join('\n') + '\n');
console.log(` Scaricate ${manifest.length} texture in ${outDir}`);
