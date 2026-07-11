import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./design/tokens.css";
import { App } from "./app/App";
import { AppStateProvider } from "./app/state";
import { ensureSeeded } from "./data/seed/bootstrap";

// Seed the local DB with prototype fixtures on first boot (README §4).
void ensureSeeded();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppStateProvider>
        <App />
      </AppStateProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
