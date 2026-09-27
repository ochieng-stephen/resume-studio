import React from "react";
import ReactDOM from "react-dom/client";
import { IconContext } from "@phosphor-icons/react";
import App from "./App";
import "./index.css";

// "bold" weight everywhere by default — "regular" still read as too thin. Individual icons opt
// into "duotone"/"fill" only for a deliberate highlight (e.g. the flagship slash command).
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <IconContext.Provider value={{ weight: "bold" }}>
      <App />
    </IconContext.Provider>
  </React.StrictMode>,
);
