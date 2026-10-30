interface ImportMetaEnv {
  /** The HookGuard API address baked into a build, e.g. WXT_API_BASE=https://api.example.org npm run build */
  readonly WXT_API_BASE?: string;
}

// Raw SVG strings for the small in-page elements (content/inline.ts). Named one by one: a
// wildcard here would clash with the React components every other "~icons/*" import gives.
declare module "~icons/solar/shield-check-bold?raw" {
  const svg: string;
  export default svg;
}
declare module "~icons/solar/danger-triangle-bold?raw" {
  const svg: string;
  export default svg;
}
declare module "~icons/solar/shield-warning-bold?raw" {
  const svg: string;
  export default svg;
}
declare module "~icons/solar/link-round-angle-bold?raw" {
  const svg: string;
  export default svg;
}
