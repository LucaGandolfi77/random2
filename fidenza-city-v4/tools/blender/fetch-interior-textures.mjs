#!/usr/bin/env node
/**
 * Scarica le foto CC dei riferimenti per gli interni e genera SOURCES.md.
 * Le immagini vengono salvate in assets/textures/interiors/ e usate come
 * texture PBR nel GLB degli interni. Ogni fonte e' attribuita in SOURCES.md.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const outDir = resolve(root, 'assets/textures/interiors');
mkdirSync(outDir, { recursive: true });

const API = 'https://commons.wikimedia.org/w/api.php';
const HEADERS = { 'User-Agent': 'FidenzaGameBuilder/1.0 (interior texture research)' };

/** [nome locale, titolo su Commons, dove viene usata] */
const SOURCES = [
  ['duomo-navata', 'File:Duomo (Fidenza) - navata centrale 1 2022-07-18.jpg', 'Duomo — navata centrale'],
  ['duomo-presbiterio', 'File:Duomo (Fidenza) - presbiterio 1 2022-07-18.jpg', 'Duomo — presbiterio'],
  ['duomo-cristo-antelami', 'File:Duomo di fidenza, interno, abside 05 cristo in trono attr. antelami.JPG', 'Duomo — abside, Cristo in trono'],
  ['duomo-organo', 'File:Duomo di Fidenza organo.png', 'Duomo — organo'],
  ['duomo-arca', 'File:Duomo di fidenza, interno, cripta, arca di san donnino.JPG', 'Duomo — cripta, arca di San Donnino'],
  ['duomo-cripta', 'File:Duomo (Fidenza) - cripta 1 2022-07-18.jpg', 'Duomo — cripta'],
  ['teatro-sala', 'File:Interior of Teatro Regio, Parma, Italy.JPG', 'Teatro Magnani — sala'],
  ['teatro-soffitto', 'File:Il Soffitto Affrescato Teatro Regio Parma.jpg', 'Teatro Magnani — soffitto'],
  ['teatro-sipario', 'File:Parma - Teatro Regio - Sipario.jpg', 'Teatro Magnani — sipario'],
  ['teatro-busseto', 'File:Sala del teatro Giuseppe Verdi.jpg', 'Teatro Magnani — palchi'],
  ['bar-gritti', 'File:Bar Gritti.JPG', 'Bar — dettagli banco'],
  ['bar-tropea', 'File:Cafe in Tropea - Calabria - Italy - July 17th 2013 - 01.jpg', 'Bar — poster e arredi'],
  ['stazione-interno', 'File:Fidenza stazione ferr interno.JPG', 'Stazione — sala d’attesa'],
  ['comune-cortile', 'File:Palazzo Comunale (Fidenza) - lato nord del cortile interno 2019-10-02.jpg', 'Comune — cortile/atrio'],
];

function stripHtml(value) {
  return String(value || '').replace(/<[^>]+>/g, '').trim();
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', ...params })}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetch(url, { headers: HEADERS });
    if (response.ok) return response.json();
    if (response.status !== 429 || attempt === 4) throw new Error(`Commons API ${response.status}`);
    console.log('  rate limit, attendo…');
    await sleep(2500 * (attempt + 1));
  }
  throw new Error('Commons API non disponibile');
}

const manifest = [];
const lines = [
  '# Fonti fotografiche degli interni',
  '',
  'Le immagini in `assets/textures/interiors/` derivano dalle foto sotto.',
  'Sono state **ridimensionate** (lato max ~1280 px) e **ricompress** in JPEG/PNG',
  'per l’uso come texture. I file derivati restano soggetti alla licenza indicata',
  '(in genere CC BY-SA 4.0); il resto del progetto mantiene la propria licenza.',
  '',
  '| File locale | Fonte | Autore | Licenza | Uso |',
  '| --- | --- | --- | --- | --- |',
];

for (const [local, title, usage] of SOURCES) {
  try {
    const data = await api({
      action: 'query',
      prop: 'imageinfo',
      iiprop: 'url|extmetadata',
      iiurlwidth: '1024',
      titles: title,
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
    const extension = sourceUrl.toLowerCase().endsWith('.png') ? '.png' : '.jpg';
    const filename = local + extension;
    let imageResponse = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      await sleep(500);
      imageResponse = await fetch(sourceUrl, { headers: HEADERS });
      if (imageResponse.ok) break;
      if (imageResponse.status !== 429 || attempt === 4) throw new Error(`download ${imageResponse.status}`);
      await sleep(2000 * (attempt + 1));
    }
    const bytes = Buffer.from(await imageResponse.arrayBuffer());
    writeFileSync(resolve(outDir, filename), bytes);

    manifest.push({
      local: filename,
      title: title.replace(/^File:/, ''),
      author,
      license,
      source: descriptionUrl,
      usage,
    });
    lines.push(`| \`${filename}\` | [${title.replace(/^File:/, '')}](${descriptionUrl}) | ${author} | ${license} | ${usage} |`);
    console.log('OK', filename, `${Math.round(bytes.length / 1024)} KB`, license);
  } catch (err) {
    console.warn('ERRORE', title, err.message);
  }
  await sleep(600);
}

writeFileSync(resolve(root, 'tools/blender/interior-textures.json'), JSON.stringify(manifest, null, 2));
writeFileSync(resolve(outDir, 'SOURCES.md'), lines.join('\n') + '\n');
console.log(` Scaricate ${manifest.length} texture in ${outDir}`);
