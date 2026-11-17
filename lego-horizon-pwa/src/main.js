/* Wiring for the fan store page. */

import {
  EDITIONS, defaultState, loadState, saveState, addItem, removeItem,
  toggleWishlist, cartCount, cartTotal, formatPrice,
} from "./store.js";
import { initGallery } from "./gallery.js";
import { initPWA } from "./pwa.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

/* ------------------------------------------------------------------ toast */

const toastEl = $("#toast");
let toastTimer = 0;
function toast(message) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove("show"), 2400);
}
function buzz(ms = 10) {
  try { navigator.vibrate?.(ms); } catch { /* optional */ }
}

/* ------------------------------------------------------------------ state */

let state = loadState();
function commit(next) {
  state = next;
  saveState(state);
  render();
}

const buyDialog = $("#buy-dialog");
const cartDialog = $("#cart-dialog");

function openDialog(dialog) {
  if (dialog && typeof dialog.showModal === "function") dialog.showModal();
}
function closeDialog(dialog) {
  if (dialog?.open) dialog.close();
}
$$("[data-close]").forEach((btn) => {
  btn.addEventListener("click", () => closeDialog(btn.closest("dialog")));
});
$$("dialog").forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeDialog(dialog);
  });
});

/* ----------------------------------------------------------------- render */

function render() {
  const wish = $("#wish-btn");
  if (wish) {
    wish.setAttribute("aria-pressed", String(state.wishlist));
    wish.setAttribute("aria-label", state.wishlist ? "Remove from wishlist" : "Add to wishlist");
  }

  const count = cartCount(state);
  const badge = $("#cart-badge");
  const cartBtn = $("#cart-btn");
  if (badge) { badge.textContent = String(count); badge.hidden = count === 0; }
  if (cartBtn) cartBtn.setAttribute("aria-label", `Cart, ${count} ${count === 1 ? "item" : "items"}`);

  const total = formatPrice(cartTotal(state));
  const cartTotalEl = $("#cart-total");
  if (cartTotalEl) cartTotalEl.textContent = total;

  const items = $("#cart-items");
  const checkout = $("#checkout-btn");
  if (items) {
    items.innerHTML = "";
    if (!state.items.length) {
      items.innerHTML = '<p class="cart-empty">Your cart is empty. Pick an edition above.</p>';
    } else {
      state.items.forEach((id) => {
        const edition = EDITIONS[id];
        const row = document.createElement("div");
        row.className = "cart-row";
        row.innerHTML = `<div><strong>${edition.name}</strong><small>${edition.detail}</small></div>
          <div><b>${formatPrice(edition.price)}</b><br><button class="rm" type="button" data-remove="${id}">Remove</button></div>`;
        items.appendChild(row);
      });
      items.querySelectorAll("[data-remove]").forEach((btn) =>
        btn.addEventListener("click", () => {
          commit(removeItem(state, btn.dataset.remove));
          toast("Removed from cart");
        })
      );
    }
  }
  if (checkout) checkout.disabled = state.items.length === 0;
}

/* --------------------------------------------------------------- purchases */

function chooseEdition(id) {
  if (!EDITIONS[id]) return;
  commit(addItem(state, id));
  closeDialog(buyDialog);
  toast(`${EDITIONS[id].name} added to cart`);
  buzz(15);
}

$$(".buy-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const wanted = btn.dataset.edition;
    $$(".choice").forEach((choice) =>
      choice.style.outline = choice.dataset.choice === wanted ? "2px solid var(--accent)" : ""
    );
    openDialog(buyDialog);
  });
});
$("#buy-cta")?.addEventListener("click", () => openDialog(buyDialog));
$("#cart-btn")?.addEventListener("click", () => { render(); openDialog(cartDialog); });
$("#dlc-btn")?.addEventListener("click", () => {
  $$(".choice").forEach((choice) =>
    choice.style.outline = choice.dataset.choice === "deluxe" ? "2px solid var(--accent)" : ""
  );
  openDialog(buyDialog);
});
$$(".choice").forEach((choice) =>
  choice.addEventListener("click", () => chooseEdition(choice.dataset.choice))
);

$("#checkout-btn")?.addEventListener("click", () => {
  if (!state.items.length) return;
  commit({ ...defaultState(), wishlist: state.wishlist });
  closeDialog(cartDialog);
  toast("Demo order complete — no payment was taken");
  buzz(25);
});

$("#wish-btn")?.addEventListener("click", () => {
  const next = toggleWishlist(state);
  commit(next);
  toast(next.wishlist ? "Added to wishlist" : "Removed from wishlist");
  buzz(10);
});

/* ------------------------------------------------------------------- share */

$("#share-btn")?.addEventListener("click", async () => {
  const data = {
    title: "LEGO Horizon Adventures — Fan Store",
    text: "A mobile-first fan store page with original concept art.",
    url: window.location.href,
  };
  try {
    if (navigator.share) {
      await navigator.share(data);
    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(data.url);
      toast("Link copied to clipboard");
    } else {
      toast("Sharing is not available in this browser");
    }
  } catch (err) {
    if (err?.name !== "AbortError") toast("Could not share this page");
  }
});

/* ----------------------------------------------------------- scroll + tabs */

const topbar = $("#topbar");
const progress = $("#progress span");
const tabs = $$(".tab");
const sections = tabs.map((tab) => $(tab.getAttribute("href"))).filter(Boolean);

function onScroll() {
  const y = window.scrollY || document.documentElement.scrollTop;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  if (progress) progress.style.width = `${max > 0 ? Math.min(100, (y / max) * 100) : 0}%`;
  topbar?.classList.toggle("scrolled", y > 40);

  let active = 0;
  sections.forEach((section, i) => {
    if (section.getBoundingClientRect().top <= 180) active = i;
  });
  tabs.forEach((tab, i) => tab.classList.toggle("is-active", i === active));
}
window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", onScroll);
onScroll();

/* ------------------------------------------------------------- misc bits */

const tagsToggle = $("#tags-toggle");
const tagList = $("#tag-list");
tagsToggle?.addEventListener("click", () => {
  const open = tagList.classList.toggle("expanded");
  tagsToggle.setAttribute("aria-expanded", String(open));
  tagsToggle.textContent = open ? "Show less" : "Show all";
});

$$(".spec summary").forEach((summary) => {
  const details = summary.parentElement;
  const glyph = summary.querySelector("span");
  if (!glyph) return;
  const sync = () => { glyph.textContent = details.open ? "−" : "+"; };
  details.addEventListener("toggle", sync);
  sync();
});

/* --------------------------------------------------------------- game */

let gameModule = null;
let activeGame = null;
async function openGame() {
  if (activeGame) return;
  try {
    gameModule ||= await import("../game/main.js");
    activeGame = gameModule.startGame();
    activeGame.setExitHandler(() => {
      activeGame = null;
      document.querySelector("[data-play]")?.focus();
    });
  } catch (error) {
    console.warn("lego-horizon-pwa: game failed to load", error);
    toast("The playable demo could not be loaded");
  }
}
$$("[data-play]").forEach((btn) => btn.addEventListener("click", openGame));

/* --------------------------------------------------------------- boot */

render();
initGallery({
  dialog: $("#gallery-dialog"),
  track: $("#lb-track"),
  counter: $("#lb-counter"),
  openers: $$("[data-gallery-index]"),
  prev: $("#lb-prev"),
  next: $("#lb-next"),
});
initPWA({
  installBtn: $("#install-btn"),
  installState: $("#install-state"),
  installDialog: $("#install-dialog"),
  installDesc: $("#install-desc"),
  installPromptBtn: $("#install-prompt-btn"),
  offlinePill: $("#offline-pill"),
});
