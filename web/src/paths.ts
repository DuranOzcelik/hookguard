/** Links and routes under the site's base path: "/" in development, "/hookguard/" on GitHub Pages. */

const BASE = import.meta.env.BASE_URL;

/** "/short-links" -> "/hookguard/short-links", "/#faq" -> "/hookguard/#faq". */
export const href = (path: string) => BASE + path.replace(/^\//, "");

/** The current page's path without the base: "/", "/short-links", "/s/CODE". */
export const route = () => `/${location.pathname.slice(BASE.length).replace(/\/+$/, "")}`.replace(/^\/\/+/, "/");
