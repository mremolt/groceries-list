import { defineConfig } from '@playwright/test';

// Matrix of TS-TEST-18 (tiers T1 `e2e`, T2 `e2e:nightly`). The default cell (TS-TEST-29) is Chromium, expanded, light.
const touch = { isMobile: true, hasTouch: true }; // isMobile is not supported in Firefox: left out there
const size = (width: number, height: number) => ({ viewport: { width, height } });
const expanded = { browserName: 'chromium' as const, ...size(1024, 768) };
const responsive = { grep: /@responsive/ };
const themed = { grep: /@theme/ };

// TEMPORARILY DEACTIVATED (2026-11-23): Firefox and WebKit projects are dropped because Playwright Firefox crashes
// show up in the system logs. Set `E2E_ALL_BROWSERS=1` to run them, or delete this switch to reactivate them for good.
// The baseline matrix (TS-TEST-16) is only met with all browsers.
const allBrowsers = process.env['E2E_ALL_BROWSERS'] === '1';

const realTier = process.env['E2E_REAL'] === '1';

export default defineConfig({
  testDir: 'e2e',
  ...(realTier ? {} : { testIgnore: /real\// }), // the real tier runs only against the Compose stack
  retries: process.env['CI'] ? 1 : 0, // TS-TEST-31
  reporter: process.env['CI'] ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: { baseURL: 'http://localhost:4200', reducedMotion: 'reduce' },
  // The real-backend tier (E2E_REAL=1) talks to the Compose stack and needs no dev server.
  ...(realTier
    ? {}
    : {
        webServer: {
          command: 'npm run start -- --port 4200',
          url: 'http://localhost:4200',
          reuseExistingServer: !process.env['CI'],
          timeout: 120_000,
        },
      }),
  // The real tier shares one identity provider and one mail catcher: one worker, files in name order.
  ...(realTier ? { workers: 1 } : {}),
  projects: realTier
    ? [
        // Real backend tier (REPO-CI-04, SPRING-DEV-10): npm run e2e:real, against `docker compose ... up` of backend/.
        {
          name: 'real',
          grep: /@real/,
          testMatch: /real\/.*\.spec\.ts/,
          use: {
            baseURL: 'http://localhost:8080',
            browserName: 'chromium' as const,
            viewport: { width: 1024, height: 768 },
          },
        },
      ]
    : [
        // T1: npm run e2e
        { name: 'stubbed-expanded', use: expanded },
        { name: 'stubbed-firefox-expanded', use: { ...expanded, browserName: 'firefox' as const } },
        { name: 'stubbed-webkit-expanded', use: { ...expanded, browserName: 'webkit' as const } },
        {
          name: 'stubbed-compact',
          ...responsive,
          use: { browserName: 'chromium' as const, ...size(390, 844), ...touch },
        },
        {
          name: 'stubbed-medium',
          ...responsive,
          use: { browserName: 'chromium' as const, ...size(768, 1024), hasTouch: true },
        },
        { name: 'stubbed-reflow', ...responsive, use: { browserName: 'chromium' as const, ...size(320, 800) } },
        { name: 'stubbed-dark', ...themed, use: { ...expanded, colorScheme: 'dark' as const } },
        { name: 'stubbed-high-contrast', ...themed, use: { ...expanded, contrast: 'more' as const } },
        { name: 'stubbed-forced-colors', grep: /@shell/, use: { ...expanded, forcedColors: 'active' as const } },
        // T2: npm run e2e:nightly
        { name: 'nightly-large', ...responsive, use: { browserName: 'chromium' as const, ...size(1440, 900) } },
        { name: 'nightly-extra-large', ...responsive, use: { browserName: 'chromium' as const, ...size(1920, 1080) } },
        // NFR-COMP-02: widths up to at least 2560 px
        { name: 'nightly-ultrawide', ...responsive, use: { browserName: 'chromium' as const, ...size(2560, 1440) } },
        {
          name: 'nightly-compact-landscape',
          ...responsive,
          use: { browserName: 'chromium' as const, ...size(844, 390), ...touch },
        },
        { name: 'nightly-firefox-compact', ...responsive, use: { browserName: 'firefox' as const, ...size(390, 844) } },
        {
          name: 'nightly-webkit-compact',
          ...responsive,
          use: { browserName: 'webkit' as const, ...size(390, 844), ...touch },
        },
      ]
        .filter((project) => allBrowsers || project.use.browserName === 'chromium')
        // @modal tests need the modal drawer (< 840 px), @permanent tests the permanent one (>= 840 px): no test is skipped
        .map((project) => ({
          ...project,
          grepInvert: project.use.viewport.width >= 840 ? /@modal/ : /@permanent/,
        })),
});
