import type { Locator, Page } from '@playwright/test';

/** The themed pages of the identity provider (login, registration, password reset). Real tier only. */
export class AuthPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  get displayNameField(): Locator {
    return this.page.getByLabel('Anzeigename');
  }
  get emailField(): Locator {
    return this.page.getByLabel('E-Mail-Adresse');
  }
  get passwordField(): Locator {
    return this.page.getByLabel('Passwort', { exact: true });
  }
  get newPasswordField(): Locator {
    return this.page.getByLabel('Neues Passwort');
  }
  get signInButton(): Locator {
    return this.page.getByRole('button', { name: 'Anmelden' });
  }
  get createAccountLink(): Locator {
    return this.page.getByRole('link', { name: 'Konto erstellen' });
  }
  get createAccountButton(): Locator {
    return this.page.getByRole('button', { name: 'Konto erstellen' });
  }
  get forgotPasswordLink(): Locator {
    return this.page.getByRole('link', { name: 'Passwort vergessen?' });
  }
  get sendLinkButton(): Locator {
    return this.page.getByRole('button', { name: 'Link senden' });
  }
  get savePasswordButton(): Locator {
    return this.page.getByRole('button', { name: 'Passwort speichern und anmelden' });
  }
  get mailboxHeading(): Locator {
    return this.page.getByRole('heading', { name: 'Prüfe dein Postfach' });
  }

  get wrongCredentialsMessage(): Locator {
    return this.page.getByText('E-Mail-Adresse oder Passwort ist falsch.');
  }
  get lockoutMessage(): Locator {
    return this.page.getByText('Zu viele Versuche. Bitte warte einen Moment und versuche es erneut.');
  }

  async signIn(email: string, password: string): Promise<void> {
    await this.emailField.fill(email);
    await this.passwordField.fill(password);
    await this.signInButton.click();
  }

  /** Fills and submits the registration form that the „Konto erstellen“ link opens. */
  async register(displayName: string, email: string, password: string): Promise<void> {
    await this.displayNameField.fill(displayName);
    await this.emailField.fill(email);
    await this.passwordField.fill(password);
    await this.createAccountButton.click();
  }

  async requestPasswordReset(email: string): Promise<void> {
    await this.forgotPasswordLink.click();
    await this.emailField.fill(email);
    await this.sendLinkButton.click();
  }

  async setNewPassword(password: string): Promise<void> {
    await this.newPasswordField.fill(password);
    await this.savePasswordButton.click();
  }
}
