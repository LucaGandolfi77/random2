# Deploy di Fidenza da Giocare

## Stato attuale

Il sito viene pubblicato da GitHub Actions su GitHub Pages:

```text
https://lucagandolfi77.github.io/random2/fidenza-city-v3/
https://lucagandolfi77.github.io/random2/fidenza-city-v3/fidenza-editor/
```

Il workflow `.github/workflows/pages.yml`:

- esclude i sorgenti di sviluppo (`tools/`);
- esclude il save Minecraft `assets/ArnisWorld3/` (circa 575 MB);
- pubblica `data/arnis/` con i materiali derivati, `data/ground/` con l'ortofoto RER e `data/ground/tiles/` con le 441 tessere da 0,5 m;
- genera `fidenza-city-v3/build-info.json` con commit e data di build;
- sostituisce l’ID cache del service worker con lo SHA del commit.

## Dominio personalizzato

Quando il dominio è pronto:

1. copia `CNAME.example` in `CNAME` nella radice del repository e scrivi il
   dominio (es. `fidenza.example.com`);
2. su GitHub: **Settings → Pages → Custom domain**, inserisci lo stesso
   dominio e abilita **Enforce HTTPS**;
3. DNS:
   - sottodominio: CNAME verso `lucagandolfi77.github.io`;
   - apex: record A verso gli IP GitHub Pages
     (`185.199.108.153`, `185.199.109.153`, `185.199.110.153`,
     `185.199.111.153`);
4. attendi la verifica DNS e la provisioning del certificato HTTPS;
5. aggiorna canonical, `og:url` e `og:image` in `index.html` con il nuovo
   dominio.

GitHub Pages non permette header HTTP personalizzati. Cache, CSP e
`X-Content-Type-Options` restano limitati a `<meta>` e al service worker.
Se in futuro servissero header reali, preview automatiche o funzioni
server-side, si potrà affiancare Cloudflare Pages senza cambiare il codice.

## Pubblicazione dall’editor

L’editor usa un **fine-grained GitHub PAT**:

- permessi: `Contents: Read and write`, `Pull requests: Read and write`;
- repository limitato a questo progetto;
- il token resta in `sessionStorage` e non viene mai scritto nel repository;
- la pubblicazione crea un branch `editor/<timestamp>`, un commit con
  `maps/fidenza/map.json` e `data/map.json`, e una pull request.

La PR viene validata da CI. Il deploy su Pages avviene solo dopo il merge su
`main`. In alternativa l’editor può sempre esportare i due JSON e il commit
può essere fatto manualmente.

## Installazione su iPhone

Safari non espone un prompt automatico di installazione. La pagina mostra un
pulsante **Installa su iPhone** solo su iOS e solo quando il gioco non è già in
modalità standalone.

1. Apri `https://lucagandolfi77.github.io/random2/fidenza-city-v3/` in **Safari**,
   non in Chrome e non nel browser interno di Instagram/WhatsApp.
2. Tocca **Condividi** → **Aggiungi a Home** → **Aggiungi**.
3. Avvia l’icona **Fidenza** dalla Home: parte a schermo intero, senza barra di
   Safari, con splash screen e service worker.

Dopo il primo caricamento il gioco funziona offline. Se l’icona o le splash
screen cambiano, rimuovi e riaggiungi l’app dalla Home per vederle.

## Cache e aggiornamenti

- `sw.js` ha una cache versionata; in build l’ID `fidenza-da-giocare-v3.x.y`
  viene sostituito con lo SHA del commit e il workflow verifica la sostituzione.
- `build-info.json` legge la versione da `js/config.js` e contiene commit e data
  di build.
- Dopo un deploy, il gioco mostra il pulsante di aggiornamento PWA.
- Il prefetch delle tessere usa una cache dedicata (`fidenza-ground-tiles-v1`);
  la cache shell è `v3.3.1`.
- L’editor non registra un service worker: un hard reload è sufficiente per
  aggiornare l’interfaccia.

## SEO e indicizzazione

- `robots.txt` esclude l’editor.
- L’editor ha `noindex` nelle meta tag.
- La sitemap è generata da `tools/sitemap.mjs`; include il gioco quando
  `fidenza-city-v3/index.html` è versionato. Dopo il primo commit della
  cartella esegui `node tools/sitemap.mjs` e committa `sitemap.xml`.
- Ogni deploy mantiene gli asset esclusi fuori dal sito pubblico.

## Verifiche prima del deploy

```bash
cd fidenza-city-v3
node tools/audit-arnis.mjs
node tools/validate-map.mjs
node --check js/world.js
```

Il workflow CI esegue anche il controllo sintattico di tutti i `.js` e `.mjs`.
