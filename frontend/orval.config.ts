import { defineConfig } from 'orval';

// Spec: the backend's committed contract (REPO-API-01, API-CON-08). One API used by the platform HTTP adapters:
// generated once into src/platform/adapter/out/http/groceries/generated/ (typescript-openapi-clients.md, Layout).
const input = { target: '../backend/openapi/groceries-v1.yaml' };
const generated = './src/platform/adapter/out/http/groceries/generated';

export default defineConfig({
  groceries: {
    input,
    output: {
      mode: 'tags-split',
      target: `${generated}/endpoints`,
      schemas: `${generated}/model`,
      client: 'angular', // TS-API-03: HttpClient services, interceptors apply
      override: { angular: { provideIn: false } }, // TS-API-04
      mock: { generators: [{ type: 'msw', useExamples: true }] }, // API-CON-11
      urlEncodeParameters: true, // TS-API-09
      clean: true,
    },
  },
  groceriesZod: {
    input,
    output: {
      mode: 'tags-split',
      target: `${generated}/endpoints`,
      client: 'zod',
      fileExtension: '.zod.ts',
    },
  },
});
