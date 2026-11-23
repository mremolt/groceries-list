import { Injectable } from '@angular/core';
import { z } from 'zod';

import type { RuntimeConfig } from '../../../ports/out/runtime-config';

/** NG-CFG-03: validated at load; a missing or invalid field fails the bootstrap. Public values only (NG-CFG-05). */
export const RuntimeConfigSchema: z.ZodType<RuntimeConfig> = z.object({
  environment: z.string().min(1),
  apiBaseUrl: z.string().startsWith('/'),
  errorReporting: z.object({ enabled: z.boolean(), path: z.string().startsWith('/') }),
});

/** Outgoing adapter for `/config.json` (NG-CFG-02): plain `fetch`, no interceptors, relative URL, never cached. */
@Injectable()
export class RuntimeConfigHolder {
  #value: Readonly<RuntimeConfig> | undefined;

  async load(): Promise<void> {
    const response = await fetch('/config.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`config.json: ${String(response.status)}`);
    }
    this.#value = Object.freeze(RuntimeConfigSchema.parse(await response.json()));
  }

  get value(): Readonly<RuntimeConfig> {
    if (!this.#value) {
      throw new Error('RUNTIME_CONFIG read before the app initializer ran');
    }
    return this.#value;
  }
}
