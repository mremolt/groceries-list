import eslint from '@eslint/js';
import comments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import ngrx from '@ngrx/eslint-plugin';
import angular from 'angular-eslint';
import type { Linter } from 'eslint';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier/flat';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import { importX } from 'eslint-plugin-import-x';
import security from 'eslint-plugin-security';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import { configs as sonarConfigs } from 'eslint-plugin-sonarjs';
import tseslint from 'typescript-eslint';

/** TS-TOOL-05: a rule is `error` or `off`; some presets ship `warn` entries. */
function warnAsError(config: Linter.Config): Linter.Config {
  const asError = (entry: Linter.RuleEntry): Linter.RuleSeverityAndOptions => {
    const [severity, ...options]: [Linter.RuleSeverity, ...unknown[]] = Array.isArray(entry) ? entry : [entry];
    return [severity === 'warn' || severity === 1 ? 'error' : severity, ...options];
  };
  const rules = Object.entries(config.rules ?? {}).flatMap(([name, entry]) =>
    entry === undefined ? [] : [[name, asError(entry)] as const],
  );
  return { ...config, rules: Object.fromEntries(rules) };
}

/**
 * angular-eslint and @ngrx/eslint-plugin type their presets with typescript-eslint's FlatConfig, which differs from
 * ESLint's Linter.Config only in the language-options index signature under exactOptionalPropertyTypes.
 */
function flat(config: unknown): Linter.Config[] {
  return [config].flat() as Linter.Config[]; // same runtime shape, see above
}

/** NG-TOOL-07: security bans. */
const securityBans = [
  {
    selector: 'CallExpression[callee.property.name=/^bypassSecurityTrust/]',
    message: 'bypassSecurityTrust* is forbidden (NG-SEC-02).',
  },
  {
    selector: 'AssignmentExpression[left.property.name=/^(innerHTML|outerHTML)$/]',
    message: 'No direct HTML writes (NG-SEC-04).',
  },
  {
    selector: "MemberExpression[property.name='nativeElement'][parent.type='AssignmentExpression']",
    message: 'No direct DOM writes through nativeElement (NG-SEC-04).',
  },
];

/** NG-TOOL-12 / TS-TOOL-21: wall-clock ban. */
const noWallClock = [
  {
    selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
    message: 'Use the platform clock (TS-ARCH-22).',
  },
  {
    selector: "NewExpression[callee.name='Date'][arguments.length=0]",
    message: 'Use the platform clock (TS-ARCH-22).',
  },
];

export default defineConfig(
  {
    // src/index.html is the static HTML shell, not an Angular template: its startup message exists before any catalog (NG-CFG-03)
    ignores: [
      'src/index.html',
      'dist/',
      'coverage/',
      '.angular/',
      'playwright-report/',
      'test-results/',
      '**/generated/**',
      'test/fixtures/**',
    ],
  },
  { linterOptions: { reportUnusedDisableDirectives: 'error' } },
  comments.recommended,
  {
    rules: {
      '@eslint-community/eslint-comments/require-description': 'error', // TS-TOOL-06
      '@eslint-community/eslint-comments/no-unlimited-disable': 'error',
    },
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      sonarConfigs.recommended,
      warnAsError(importX.flatConfigs.recommended),
      importX.flatConfigs.typescript,
      ...flat(angular.configs.tsRecommended),
      ...flat(ngrx.configs.signalsTypeChecked),
    ],
    ...(angular.processInlineTemplates ? { processor: angular.processInlineTemplates } : {}),
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    settings: {
      'import-x/resolver-next': [createTypeScriptImportResolver()],
    },
    plugins: { 'simple-import-sort': simpleImportSort },
    rules: {
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'import-x/order': 'off',
      'import-x/no-cycle': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      'sonarjs/no-unused-vars': 'off', // covered by @typescript-eslint/no-unused-vars
      'sonarjs/deprecation': 'off', // covered by @typescript-eslint/no-deprecated
      '@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'app', style: 'kebab-case' }],
      '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: 'app', style: 'camelCase' }],
      '@angular-eslint/component-class-suffix': 'off', // suffixless naming (NG-ARCH-02)
      '@angular-eslint/directive-class-suffix': 'off',
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      '@angular-eslint/component-max-inline-declarations': ['error', { template: 0, styles: 0, animations: 0 }],
      '@angular-eslint/prefer-signals': 'error',
      '@angular-eslint/no-developer-preview': 'error',
      '@angular-eslint/no-experimental': 'error',
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@angular/common/http',
              importNames: ['httpResource'],
              message: 'Only in adapter/out/http (NG-ARCH-13).',
            },
            { name: '@ngrx/store', message: 'Classic NgRx store needs an ADR (NG-STATE-13).' },
          ],
        },
      ],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-restricted-syntax': ['error', ...securityBans, ...noWallClock],
    },
  },
  {
    files: ['src/platform/platform.tokens.ts', '**/*.spec.ts', 'src/testing/**/*.ts', 'e2e/**/*.ts', 'test/**/*.ts'],
    rules: { 'no-restricted-syntax': ['error', ...securityBans] }, // NG-TOOL-12: clock only here
  },
  {
    files: ['**/*.spec.ts', 'src/testing/**/*.ts'],
    rules: { '@angular-eslint/component-max-inline-declarations': 'off' }, // NG-ARCH-21: test hosts
  },
  {
    files: ['**/*.spec.ts', '**/*.test.ts', 'e2e/**/*.ts', 'src/testing/**/*.ts', 'test/**/*.ts'],
    rules: {
      'sonarjs/no-hardcoded-passwords': 'off', // test fixtures
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    files: ['**/adapter/out/http/**/*.ts', 'src/platform/adapter/out/http/**/*.ts'],
    rules: { 'no-restricted-imports': 'off' }, // dependency-cruiser still guards the boundaries
  },
  {
    // NG-TOOL-07: folders that look up objects by untrusted keys
    files: ['**/adapter/out/http/**/*.ts'],
    plugins: { security },
    rules: { 'security/detect-object-injection': 'error' },
  },
  {
    files: ['eslint.config.ts', 'orval.config.ts', 'playwright.config.ts', 'vitest.arch.config.ts'],
    rules: { 'import-x/no-named-as-default-member': 'off' },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {
      '@angular-eslint/template/prefer-control-flow': 'error',
      '@angular-eslint/template/prefer-self-closing-tags': 'error',
      '@angular-eslint/template/prefer-ngsrc': 'error',
      '@angular-eslint/template/no-inline-styles': 'error',
      // NG-I18N-05: no hard-coded user-visible text (Transloco templates contain no static text)
      '@angular-eslint/template/i18n': [
        'error',
        {
          checkText: true,
          checkAttributes: true,
          checkId: false,
          ignoreAttributes: [
            'appearance',
            'matButton',
            'ariaCurrentWhenActive',
            'xPosition',
            'align',
            'aria-live',
            'icon',
          ],
        },
      ],
    },
  },
  prettier,
);
