import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./design/tokens.css";
import { App } from "./app/App";
import { AppStateProvider } from "./app/state";
import { ensureSeeded } from "./data/seed/bootstrap";

/* Seed the v5 demo fixtures once before first paint, then mount. */
ensureSeeded().finally(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <BrowserRouter>
        <AppStateProvider>
          <App />
        </AppStateProvider>
      </BrowserRouter>
    </React.StrictMode>,
  );
});
