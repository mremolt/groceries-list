// Public API of src/platform (NG-ARCH-04). The app root and features import only from here (`@platform`).
export { AppTitleStrategy } from './adapter/in/ui/app-title-strategy';
export { ColorScheme, type ColorSchemePreference } from './adapter/in/ui/color-scheme';
export { GlobalErrorHandler } from './adapter/in/ui/global-error-handler';
export { IcuTranspiler } from './adapter/in/ui/icu-transpiler';
export { RouteFocus } from './adapter/in/ui/route-focus';
export { PlatformTranslationLoader } from './adapter/in/ui/translation-loader';
export { NoopErrorReporting } from './adapter/out/error-reporting/noop-error-reporting';
export { RuntimeConfigHolder } from './adapter/out/http/runtime-config-loader';
export { ReportErrorService } from './application/report-error-service';
export { CLOCK, REPORT_ERROR, RUNTIME_CONFIG } from './platform.tokens';
export type { ReportErrorUseCase } from './ports/in/report-error-use-case';
export type { Clock } from './ports/out/clock';
export type { ErrorReportingPort } from './ports/out/error-reporting-port';
export type { RuntimeConfig } from './ports/out/runtime-config';
