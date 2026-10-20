/*
 * Snap PWA — the interface pieces that are not the camera.
 *
 * The bottom sheet, the settings and the favourites. They live here rather
 * than in app.js because app.js is about the camera, and a file that is
 * about one thing is easier to change than a file that is about four.
 *
 * No dependencies, and nothing here is required for the app to work: the
 * sheet is an enhancement over a carousel that is always there.
 */

const SETTINGS_KEY = "snap-settings";
const FAVORITES_KEY = "snap-favorites";

/* The settings, with the defaults. The ones the user can change are read
   from local storage, so the app remembers them between sessions. */
export const impostazioni = {
  timer: 0,          // the countdown before the shot: 0 = off, 3 or 10
  griglia: "off",    // the composition guide: off, thirds or nine
  vibrazione: true,  // the 8ms buzz on every selection
  specchio: true,    // mirror the front camera
  qualita: 0.92,     // the JPEG quality of the saved photo
  ...leggi(SETTINGS_KEY),
};

function leggi(chiave) {
  try {
    return JSON.parse(localStorage.getItem(chiave) || "{}") || {};
  } catch {
    return {};
  }
}

export function salvaImpostazioni() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(impostazioni));
  } catch {
    /* private mode: the settings simply do not survive the session */
  }
}

/* ---- favourites ---- */

export function preferiti() {
  const v = leggi(FAVORITES_KEY);
  return Array.isArray(v.ids) ? v.ids : [];
}

export function togglePreferito(id) {
  const ids = preferiti();
  const i = ids.indexOf(id);
  if (i >= 0) ids.splice(i, 1);
  else ids.push(id);
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify({ ids }));
  } catch {
    /* private mode: the favourites do not survive the session */
  }
  return ids.includes(id);
}

export function ePreferito(id) {
  return preferiti().includes(id);
}

/* ---- the bottom sheet ---- */

let sulChiudi = null;

/**
 * Opens the sheet. `costruisci` receives the body element and fills it.
 * The sheet is a dialog: it takes the focus, Escape closes it, and the
 * focus goes back where it came from when it closes.
 */
export function apriFoglio(titolo, costruisci, extra = {}) {
  const foglio = document.getElementById("sheet");
  const corpo = document.getElementById("sheet-body");
  const intestazione = document.getElementById("sheet-title");
  if (!foglio || !corpo) return;

  intestazione.textContent = titolo;
  corpo.innerHTML = "";
  corpo.className = "sheet-body" + (extra.classe ? " " + extra.classe : "");
  costruisci(corpo);

  foglio.hidden = false;
  /* one frame later, so the transition has something to animate from */
  requestAnimationFrame(() => foglio.classList.add("aperto"));
  document.body.classList.add("foglio-aperto");

  const primo = corpo.querySelector("button, input, [tabindex]");
  if (primo) primo.focus();
}

export function chiudiFoglio() {
  const foglio = document.getElementById("sheet");
  if (!foglio || foglio.hidden) return;
  foglio.classList.remove("aperto");
  document.body.classList.remove("foglio-aperto");
  const chiudi = sulChiudi;
  sulChiudi = null;
  setTimeout(() => {
    foglio.hidden = true;
    document.getElementById("sheet-body").innerHTML = "";
  }, 220);
  if (chiudi) chiudi();
}

export function foglioAperto() {
  const foglio = document.getElementById("sheet");
  return !!foglio && !foglio.hidden;
}

/* The sheet closes on the scrim, on Escape and on the close button, and it
   gives the focus back to wherever it came from. */
export function collegaFoglio() {
  const foglio = document.getElementById("sheet");
  if (!foglio) return;

  foglio.querySelector(".sheet-scrim").addEventListener("click", chiudiFoglio);
  document.getElementById("sheet-close").addEventListener("click", chiudiFoglio);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && foglioAperto()) {
      e.preventDefault();
      chiudiFoglio();
    }
    /* the focus stays inside the sheet while it is open */
    if (e.key === "Tab" && !foglio.hidden) {
      const focusabili = foglio.querySelectorAll(
        'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
      );
      if (!focusabili.length) return;
      const primo = focusabili[0];
      const ultimo = focusabili[focusabili.length - 1];
      if (e.shiftKey && document.activeElement === primo) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primo.focus();
      }
    }
  });
}

/* Runs a callback when the sheet closes, once. */
export function alChiudi(callback) {
  sulChiudi = callback;
}
