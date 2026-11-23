// Published API of the session feature (TS-ARCH-10/19): who is signed in, and sign-out. Never routes (TS-ARCH-20).
export { NotAuthenticatedError } from './domain/session-errors';
export type { CurrentUser } from './domain/current-user';
export type { LoadCurrentUserUseCase } from './ports/in/load-current-user-use-case';
export type { LogoutUseCase } from './ports/in/logout-use-case';
export { provideSessionApi } from './session.providers';
export { LOAD_CURRENT_USER, LOGOUT } from './session.tokens';
