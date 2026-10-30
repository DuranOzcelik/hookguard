import { StrictMode, type ComponentType } from "react";
import { createRoot } from "react-dom/client";

import { LangProvider } from "@shared/ui/i18n";

import { getSettings } from "./settings";

/** Starts an extension page (popup, warning, options) in the chosen language and colour palette. */
export async function mountPage(App: ComponentType): Promise<void> {
  const settings = await getSettings();
  const root = document.documentElement;
  root.lang = settings.lang;
  if (settings.palette === "aurora") root.removeAttribute("data-palette");
  else root.dataset.palette = settings.palette;
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <LangProvider value={settings.lang}>
        <App />
      </LangProvider>
    </StrictMode>,
  );
}
