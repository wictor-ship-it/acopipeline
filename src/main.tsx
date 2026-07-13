import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./design/tokens.css";
import { App } from "./app/App";
import { AppStateProvider } from "./app/state";
import { selectBackend } from "./data/backend";
import { ensureSeeded } from "./data/seed/bootstrap";

/* Boot: pick the data backend (server Postgres if configured + signed in,
   else browser IndexedDB), seed baseline state once, then mount. */
selectBackend().then(ensureSeeded).finally(() => {
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
