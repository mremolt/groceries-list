import { defineConfig } from '@playwright/test';

// Matrix of TS-TEST-18 (tiers T1 `e2e`, T2 `e2e:nightly`). The default cell (TS-TEST-29) is Chromium, expanded, light.
const touch = { isMobile: true, hasTouch: true }; // isMobile is not supported in Firefox: left out there
const size = (width: number, height: number) => ({ viewport: { width, height } });
const expanded = { browserName: 'chromium' as const, ...size(1024, 768) };
const responsive = { grep: /@responsive/ };
const themed = { grep: /@theme/ };

// WebKit needs host libraries (`sudo npx playwright install-deps`). Where they are missing, `E2E_SKIP_WEBKIT=1` drops the
// WebKit projects explicitly and loudly; the baseline matrix (TS-TEST-16) is only met when it is unset.
const skipWebkit = process.env['E2E_SKIP_WEBKIT'] === '1';
if (skipWebkit) {
  console.warn('E2E_SKIP_WEBKIT=1: WebKit projects are NOT run; the TS-TEST-16 matrix is incomplete.');
}

export default defineConfig({
  testDir: 'e2e',
  retries: process.env['CI'] ? 1 : 0, // TS-TEST-31
  reporter: process.env['CI'] ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: { baseURL: 'http://localhost:4200', reducedMotion: 'reduce' },
  webServer: {
    command: 'npm run start -- --port 4200',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
  projects: [
    // T1: npm run e2e
    { name: 'stubbed-expanded', use: expanded },
    { name: 'stubbed-firefox-expanded', use: { ...expanded, browserName: 'firefox' as const } },
    { name: 'stubbed-webkit-expanded', use: { ...expanded, browserName: 'webkit' as const } },
    { name: 'stubbed-compact', ...responsive, use: { browserName: 'chromium' as const, ...size(390, 844), ...touch } },
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
  ].filter((project) => !(skipWebkit && project.name.includes('webkit'))),
});
