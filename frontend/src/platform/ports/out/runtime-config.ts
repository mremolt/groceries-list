/** Public per-environment values served by the backend as `/config.json` (NG-CFG-03/05). */
export interface RuntimeConfig {
  /** Environment name, shown in error reports, not in the UI. */
  readonly environment: string;
  /** Same-origin base path of the REST API (NG-SEC-07). */
  readonly apiBaseUrl: string;
  /** Same-origin error reporting endpoint (NG-OBS-03). */
  readonly errorReporting: { readonly enabled: boolean; readonly path: string };
}
