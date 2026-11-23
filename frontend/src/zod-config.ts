import { z } from 'zod';

// TS-SEC-09: zod runs jitless in the browser (the CSP forbids eval); this is the first import of main.ts.
z.config({ jitless: true });
