import type { Provider } from '@angular/core';
import { Announcer } from '@shared/ui/a11y/announcer';
import { vi } from 'vitest';

/**
 * The screen-reader announcer as an explicit double: the real one writes into a live region of the document (NG-TEST-12).
 * Pass your own `vi.fn` to assert on the messages (NG-TOOL-11: no `expect(mock.method)`).
 */
export function provideTestAnnouncer(announce = vi.fn<(message: string) => void>()): Provider[] {
  return [{ provide: Announcer, useValue: { announce } }];
}
