import { createContext, useContext } from "react";

import { CONTENT, DEFAULT_LANG, type Content, type Lang } from "../content";

const LangContext = createContext<Lang>(DEFAULT_LANG);

/** Wrap a page in the reader's language; English when nothing is chosen. */
export const LangProvider = LangContext.Provider;

export function useLang(): Lang {
  return useContext(LangContext);
}

export function useContent(): Content {
  return CONTENT[useContext(LangContext)];
}
