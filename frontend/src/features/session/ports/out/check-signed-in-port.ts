export interface CheckSignedInPort {
  isSignedIn(signal?: AbortSignal): Promise<boolean>;
}
