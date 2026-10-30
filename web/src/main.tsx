import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@fontsource-variable/atkinson-hyperlegible-next";
import "@fontsource-variable/atkinson-hyperlegible-mono";
import "@fontsource-variable/bricolage-grotesque";
import "@shared/design/tokens.css";
import "@shared/design/palettes.css";
import "@shared/design/base.css";
import "@shared/design/components.css";
import "./styles.css";

import App from "./App";
import { applyLang, applyPalette, applyTheme, savedLang, savedPalette, savedTheme } from "./prefs";

applyTheme(savedTheme());
applyPalette(savedPalette());
applyLang(savedLang());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
