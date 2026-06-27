import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";

// Self-hosted fonts — bundled by Vite, served from our own origin. The editor
// never needs the network, consistent with the local-first promise.
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-sans/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";

import { App } from "./App";
import "./styles/global.css";

const container = document.getElementById("root");
if (!container) throw new Error("Root element #root not found");

// HashRouter keeps routing working from any static host (and file://) — no
// server-side route config required, which suits a fully client-side app.
createRoot(container).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);

// Register the service worker for true installed-app offline support. Dev runs
// with a module-served SW path; production serves /sw.js from the build root.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    // Resolve against the deploy base so it works at the root or a sub-path.
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // Offline support is a progressive enhancement; ignore registration errors.
    });
  });
}
