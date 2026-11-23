import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { cruise, type IConfiguration } from 'dependency-cruiser';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const config = require('../.dependency-cruiser.cjs') as IConfiguration;

/** TS-ARCH-13 / ARCH-ENF-02: the checker must fail on a known type-only violation, so it cannot silently check nothing. */
describe('architecture rules', () => {
  it('flag a type-only import of generated code in a domain file', async () => {
    const fixture = fileURLToPath(new URL('fixtures/arch-violation', import.meta.url)); // absolute baseDir
    const { output } = await cruise(['src'], {
      ...config.options,
      ruleSet: { forbidden: config.forbidden ?? [] },
      validate: true,
      baseDir: fixture,
      tsConfig: { fileName: `${fixture}/tsconfig.json` },
    });
    const violations = typeof output === 'string' ? [] : output.summary.violations.map((v) => v.rule.name);

    expect(violations).toContain('domain-is-pure');
    expect(violations).toContain('generated-api-only-in-http-adapter');
  });

  it('check the real source tree and find modules', async () => {
    const { output } = await cruise(['src'], {
      ...config.options,
      ruleSet: { forbidden: config.forbidden ?? [] },
      validate: true,
      baseDir: fileURLToPath(new URL('..', import.meta.url)),
    });
    expect(typeof output).not.toBe('string');
    if (typeof output !== 'string') {
      expect(output.summary.totalCruised).toBeGreaterThan(10);
      expect(output.summary.violations).toEqual([]);
    }
  });
});
