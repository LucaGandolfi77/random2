# Death of Ivan Ilyich

> **"The Black Sack"** — a standalone "Act II" scene from The Library, bilingual
> English and Italian, running entirely in the browser.

> *The study, the final weeks*

This is one of nine companion PWAs to [`anthology-pwa`](../anthology-pwa/):
a single playable scene, cut loose from the library so it can be installed,
linked and shared on its own. Death of Ivan Ilyich is a public-domain novel by Leo Tolstoy.

---

## What it is

A short branching dialogue. Ten or so lines of bilingual prose advance by tap,
click, `Space`, `Enter` or `→`; one choice branch sends the scene down a
second path. The language follows the anthology's saved choice, and an in-page
toggle writes it back to the same place.

Everything is drawn in the DOM — no canvas, no WebAudio, no animation beyond
what the type does. The whole thing is one HTML file.

## The architecture

These nine are not nine engines. They are one:

**`shared/scene-reader.js`** (220 lines) is the reader shared by all of them *and*
by the anthology itself. A scene is a data literal — `title`, `place`, `lines`,
`choices`, `outro` — handed to `LibraryScene.open()`:

```
<script src="../shared/scene-reader.js"></script>
<script>
  LibraryScene.open({
    mount:    document.getElementById("scene"),
    title:    { en: "...", it: "..." },
    place:    { en: "...", it: "..." },
    backHref: "../anthology-pwa/",
    lines:    [{ s: "Name" | {en,it}, t: { en: "...", it: "..." } }, ...],
    choices:  [{ text: {en,it}, lines: [{s,t}, ...] }, ...],
    outro:    { en: "...", it: "..." }
  });
</script>
```

Lines advance on tap / click / `Space` / `Enter` / `ArrowRight`; `Escape` returns
to `backHref`. The reader carries its own language state, shared with the
anthology through `localStorage["anthology-state"]`, so switching language here
switches it there too.

## What is here

| | |
|---|---|
| `index.html` | the page and the scene data, together — one file, no build step |
| `manifest.json` | `"name": "The Library — Ivan Ilyich"`, portrait, standalone |
| `icons/icon-192.svg` | one SVG icon |
| `src/` | **empty** — and untracked by git |

**No service worker.** Unlike the rest of the repo, these nine do not cache
themselves, so they are not installable in the offline sense the other PWAs
are: opening one from a home screen after a cold start will need the network.
The manifest still declares `display: standalone`, so the omission is
invisible until you try.

## Known limits

- 🟡 **No offline support.** No service worker and no precache. The single most
  common reproach against a PWA is one these nine currently incur.
- 🟡 **`src/` is empty** and untracked. It is a directory with nothing in it.
- 🟡 **Only `icon-192.svg`.** No 512, no maskable, so the icon is upscaled on
  a launcher that asks for more.
- ⚪ No canvas, no audio, no tests, no keyboard-only play beyond the reader's
  advance and escape.

## What's next

- 🟠 **A service worker.** Copy `snake-pwa/service-worker.js`, list the five
  assets, bump the cache name. Six lines, and it makes these the only
  offline-capable things in the repo that are not games.
- 🟠 **More acts.** The scene reader already supports arbitrary branches, so
  "Act III" is data, not code.
- 🟡 Icons at 512 and maskable, for Android launchers that ask.
- 🟡 A scene index: a hub page in each PWA listing the acts available, rather
  than relying on the back link.
- ⚪ Delete the empty `src/`.

## Copyright & licence

**© 2026 Luca Gandolfi.** Code released under the **MIT** licence — see
[`LICENSE`](../../LICENSE).

Death of Ivan Ilyich is a public-domain novel by Leo Tolstoy; the prose here is a bilingual
adaptation written for this repository.
