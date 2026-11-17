/* Pure cart + wishlist state for the fan store demo.
 * No DOM here, so the rules can be tested under node. */

export const EDITIONS = Object.freeze({
  standard: {
    id: "standard",
    name: "Standard Edition",
    detail: "The full base game",
    price: 3999,
  },
  deluxe: {
    id: "deluxe",
    name: "Digital Deluxe Edition Bundle",
    detail: "Base game + deluxe upgrade",
    price: 4999,
  },
});

const KEY = "lego-horizon-store-v1";

export function defaultState() {
  return { wishlist: false, items: [] };
}

function sanitize(raw) {
  const state = defaultState();
  if (!raw || typeof raw !== "object") return state;
  state.wishlist = raw.wishlist === true;
  if (Array.isArray(raw.items)) {
    const seen = new Set();
    for (const id of raw.items) {
      if (EDITIONS[id] && !seen.has(id)) {
        seen.add(id);
        state.items.push(id);
      }
    }
  }
  return state;
}

export function loadState(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(KEY);
    return raw ? sanitize(JSON.parse(raw)) : defaultState();
  } catch {
    return defaultState();
  }
}

export function saveState(state, storage = globalThis.localStorage) {
  try {
    storage?.setItem(KEY, JSON.stringify(sanitize(state)));
  } catch {
    /* private mode / blocked storage: the demo still works in memory */
  }
}

export function addItem(state, editionId) {
  if (!EDITIONS[editionId]) return state;
  if (state.items.includes(editionId)) return state;
  return { ...state, items: [...state.items, editionId] };
}

export function removeItem(state, editionId) {
  return { ...state, items: state.items.filter((id) => id !== editionId) };
}

export function toggleWishlist(state) {
  return { ...state, wishlist: !state.wishlist };
}

export function cartCount(state) {
  return state.items.length;
}

export function cartTotal(state) {
  return state.items.reduce((sum, id) => sum + (EDITIONS[id]?.price || 0), 0);
}

export function formatPrice(cents) {
  return `${(cents / 100).toFixed(2).replace(".", ",")}€`;
}
