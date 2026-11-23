// Published API of the session feature (TS-ARCH-10/19): who is signed in, and sign-out. Never routes (TS-ARCH-20).
export type { CurrentUser } from './domain/current-user';
export type { DisplayNameProblem } from './domain/session-errors';
export { DisplayNameInvalidError, NotAuthenticatedError, ReauthenticationRequiredError } from './domain/session-errors';
export type { CheckSignedInUseCase } from './ports/in/check-signed-in-use-case';
export type { DeleteAccountUseCase } from './ports/in/delete-account-use-case';
export type { LoadCurrentUserUseCase } from './ports/in/load-current-user-use-case';
export type { LogoutUseCase } from './ports/in/logout-use-case';
export type { UpdateDisplayNameUseCase } from './ports/in/update-display-name-use-case';
export { provideSessionApi } from './session.providers';
export { CHECK_SIGNED_IN, DELETE_ACCOUNT, LOAD_CURRENT_USER, LOGOUT, UPDATE_DISPLAY_NAME } from './session.tokens';
