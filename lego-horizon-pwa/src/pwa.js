/* Service-worker registration, offline state and the install flow. */

export function initPWA({ installBtn, installState, installDialog, installDesc, installPromptBtn, offlinePill }) {
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
  let deferredPrompt = null;
  let hadController = "serviceWorker" in navigator && !!navigator.serviceWorker.controller;

  const openInstallDialog = () => {
    if (installDialog && typeof installDialog.showModal === "function") {
      installDialog.showModal();
    }
  };

  if (standalone) {
    if (installBtn) installBtn.hidden = true;
    if (installState) installState.hidden = false;
  } else if (installBtn) {
    installBtn.addEventListener("click", () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice?.then(() => { deferredPrompt = null; });
      } else {
        openInstallDialog();
      }
    });
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    if (installBtn) installBtn.textContent = "Install app";
    if (installPromptBtn) installPromptBtn.hidden = false;
    if (installDesc) installDesc.textContent = "Install the app to get a fullscreen, offline copy of this store page.";
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    if (installBtn) installBtn.hidden = true;
    if (installState) installState.hidden = false;
  });

  installPromptBtn?.addEventListener("click", () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice?.then(() => { deferredPrompt = null; });
  });

  installDialog?.querySelectorAll("[data-close]").forEach((btn) =>
    btn.addEventListener("click", () => installDialog.close())
  );
  installDialog?.addEventListener("click", (event) => {
    if (event.target === installDialog) installDialog.close();
  });

  const setOffline = () => {
    if (offlinePill) offlinePill.hidden = navigator.onLine !== false;
  };
  window.addEventListener("online", setOffline);
  window.addEventListener("offline", setOffline);
  setOffline();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch((err) => {
        console.warn("lego-horizon-pwa: service worker registration failed", err);
      });
    });
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (hadController) window.location.reload();
    });
  }
}
