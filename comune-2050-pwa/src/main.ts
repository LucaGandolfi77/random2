import "./styles.css";
import { App } from "./ui/app";

const root = document.getElementById("app");
if (root) {
  const app = new App(root);
  app.start();
}

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.warn("Service worker registration failed", error);
    });
  });
}
