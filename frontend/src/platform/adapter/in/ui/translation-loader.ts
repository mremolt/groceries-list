import { Injectable } from '@angular/core';
import type { Translation, TranslocoLoader } from '@jsverse/transloco';

/** Loads the platform catalog (root scope: app name, route titles, generic errors). Feature scopes load lazily. */
@Injectable()
export class PlatformTranslationLoader implements TranslocoLoader {
  async getTranslation(lang: string): Promise<Translation> {
    if (lang !== 'de') {
      throw new Error(`Unsupported language: ${lang}`);
    }
    const catalog = await import('./i18n/de.json');
    return catalog.default;
  }
}
