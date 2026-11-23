import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

interface Budget {
  type: string;
  maximumWarning?: string;
  maximumError?: string;
}
interface Angular {
  projects: Record<
    string,
    {
      architect: {
        build: {
          configurations: Record<
            string,
            {
              fileReplacements?: unknown;
              sourceMap?: unknown;
              budgets?: Budget[];
              optimization?: { fonts?: { inline?: boolean } };
            }
          >;
        };
      };
    }
  >;
}

const angular = JSON.parse(readFileSync(new URL('../angular.json', import.meta.url), 'utf8')) as Angular;
const build = angular.projects['frontend']?.architect.build;
const indexHtml = readFileSync(new URL('../src/index.html', import.meta.url), 'utf8');

describe('build configuration', () => {
  it('has one production build for every environment (NG-CFG-01)', () => {
    const configurations = Object.entries(build?.configurations ?? {});
    expect(configurations.map(([name]) => name).sort((a, b) => a.localeCompare(b))).toEqual([
      'development',
      'production',
    ]);
    for (const [name, configuration] of configurations) {
      expect(configuration.fileReplacements, `fileReplacements in ${name}`).toBeUndefined();
    }
  });

  it('publishes no source maps in production (NG-TOOL-08, TS-SEC-05)', () => {
    expect(build?.configurations['production']?.sourceMap).toBe(false);
  });

  it('keeps the bundle budgets enabled (NG-TOOL-05)', () => {
    const budgets = build?.configurations['production']?.budgets ?? [];
    expect(budgets.some((b) => b.type === 'initial' && b.maximumError !== undefined)).toBe(true);
    expect(budgets.some((b) => b.type === 'anyComponentStyle' && b.maximumError !== undefined)).toBe(true);
  });

  it('does not inline fonts, which would load them from Google (NG-UI-34)', () => {
    expect(build?.configurations['production']?.optimization?.fonts?.inline).toBe(false);
  });
});

describe('index.html', () => {
  it('declares the document language German (A11Y-32, NFR-L10N-01)', () => {
    expect(indexHtml).toContain('<html lang="de">');
  });

  it('loads no third-party fonts or scripts (NG-UI-34, TS-SEC-07)', () => {
    expect(indexHtml).not.toMatch(/googleapis|gstatic|https?:\/\//);
  });

  it('sets the viewport with safe-area support (NG-UI-26)', () => {
    expect(indexHtml).toContain('viewport-fit=cover');
  });

  it('marks the root for the BFF nonce templating (NG-SEC-06)', () => {
    expect(indexHtml).toContain('ngCspNonce="CSP_NONCE"');
  });
});
