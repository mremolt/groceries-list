/** An unexpected failure (server error, malformed answer, no connection): reported once, shown as the generic text. */
export class TechnicalError extends Error {
  constructor(message: string, options?: { readonly cause?: unknown }) {
    super(message, options);
    this.name = 'TechnicalError';
  }
}
