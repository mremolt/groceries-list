import type { EnvironmentProviders, Provider } from '@angular/core';
import {
  provideTransloco,
  provideTranslocoTranspiler,
  type Translation,
  type TranslocoLoader,
} from '@jsverse/transloco';

import shell from '../features/shell/adapter/in/ui/i18n/de.json';
import platform from '../platform/adapter/in/ui/i18n/de.json';
import { IcuTranspiler } from '../platform/adapter/in/ui/icu-transpiler';

/** TEST-I18N-01: components render with the real source catalogs; scopes are merged under their key prefix. */
class RealCatalogLoader implements TranslocoLoader {
  getTranslation(): Promise<Translation> {
    return Promise.resolve({ ...platform, shell });
  }
}

export function provideTestTranslations(): (Provider | EnvironmentProviders)[] {
  return [
    provideTransloco({
      config: { availableLangs: ['de'], defaultLang: 'de', reRenderOnLangChange: false },
      loader: RealCatalogLoader,
    }),
    provideTranslocoTranspiler(IcuTranspiler),
  ];
}
