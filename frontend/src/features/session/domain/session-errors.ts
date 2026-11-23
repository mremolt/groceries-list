/** There is no valid session: the BFF answered 401. The whole page goes to the login. */
export class NotAuthenticatedError extends Error {
  constructor() {
    super('not authenticated');
    this.name = 'NotAuthenticatedError';
  }
}
