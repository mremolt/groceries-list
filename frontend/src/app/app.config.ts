import { provideHttpClient, withInterceptors, withXsrfConfiguration } from '@angular/common/http';
import {
  type ApplicationConfig,
  ErrorHandler,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, TitleStrategy, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideTransloco, provideTranslocoTranspiler, TranslocoService } from '@jsverse/transloco';
import {
  AppTitleStrategy,
  ColorScheme,
  GlobalErrorHandler,
  IcuTranspiler,
  NoopErrorReporting,
  PlatformTranslationLoader,
  REPORT_ERROR,
  ReportErrorService,
  RouteFocus,
  RUNTIME_CONFIG,
  RuntimeConfigHolder,
} from '@platform';
import { firstValueFrom } from 'rxjs';

import { routes } from './app.routes';

/** Root composition (NG-ARCH-12): router, HTTP stack, runtime config, translations, global error path. */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(), // window error / unhandledrejection -> ErrorHandler (NG-OBS-01)
    { provide: ErrorHandler, useExisting: GlobalErrorHandler },
    GlobalErrorHandler,
    NoopErrorReporting,
    { provide: REPORT_ERROR, useFactory: () => new ReportErrorService(inject(NoopErrorReporting)) },

    RuntimeConfigHolder,
    provideAppInitializer(() => inject(RuntimeConfigHolder).load()), // NG-CFG-02
    { provide: RUNTIME_CONFIG, useFactory: () => inject(RuntimeConfigHolder).value },

    provideRouter(routes, withComponentInputBinding(), withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })),
    AppTitleStrategy,
    { provide: TitleStrategy, useExisting: AppTitleStrategy },
    RouteFocus,

    // BFF session: cookie XSRF-TOKEN, header X-XSRF-TOKEN, same origin only (SPRING-SEC-25, NG-SEC-07/08)
    provideHttpClient(
      withInterceptors([]),
      withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }),
    ),

    // German only (ADR 0005): runtime catalogs, ICU without eval (NG-I18N-01)
    PlatformTranslationLoader,
    provideTransloco({
      config: {
        availableLangs: ['de'],
        defaultLang: 'de',
        fallbackLang: 'de',
        reRenderOnLangChange: false,
        missingHandler: { logMissingKey: true, useFallbackTranslation: false },
      },
      loader: PlatformTranslationLoader,
    }),
    provideTranslocoTranspiler(IcuTranspiler),
    provideAppInitializer(() => firstValueFrom(inject(TranslocoService).load('de'))), // preload (NG-I18N-12)

    ColorScheme,
    provideAppInitializer(() => {
      inject(ColorScheme); // applies the stored per-device theme before first paint (FR-SET-02)
    }),
  ],
};
