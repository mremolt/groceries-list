# 0003. Map FR-AUTH-01–06, FR-SET-04 and NFR-SEC-02/03/06 onto the IdP

- **Status:** Accepted
- **Date:** 2026-11-23
- **Deciders:** implementing agent (unattended run, kickoff.md); for review by the team
- **Rules affected:** SPRING-SEC-03, SPRING-SEC-21, SPRING-SEC-41, SEC-CRY-02, SEC-CRY-06, TS-SEC-01

## Context

04 describes own sign-up, login, password storage, reset mails and login rate limits. The baseline says the IdP does this. Baseline wins on technical matters; the business intent is kept.

## Decision

| Requirement | Realisation |
|---|---|
| FR-AUTH-01 sign-up | Keycloak registration page: fields Anzeigename (user attribute `displayName`, 1–50 chars), E-Mail, Passwort (single field, show/hide). German texts and tokens in the login theme. Duplicate e-mail: Keycloak message text customised to the required wording. The app's own `users` row is created at first login (ADR 0002). Sign-up → logged in → app (OIDC code flow). E-mail verification stays off (OQ-1). |
| FR-AUTH-02 login | Keycloak login page. One generic error text (no enumeration). Brute-force detection (5 failures / 15 min, temporary lockout) in the realm; the "Zu viele Versuche" text is a theme message. Session sliding 30 days = Keycloak SSO idle + BFF session. |
| FR-AUTH-03 logout | App `POST /logout` ends BFF and Keycloak sessions; this device only (the Keycloak session of this browser). |
| FR-AUTH-04/05 reset | Keycloak "forgot password" flow; action token lifespan 60 min, single use; mail via SMTP to Mailpit locally; theme texts „Prüfe dein Postfach“, „Neues Passwort festlegen“, expired-link message. "Ends all other sessions" = Keycloak realm setting "logout other sessions" on credential reset; back-channel logout then ends the BFF sessions (SPRING-SEC-40). |
| FR-AUTH-06 login from share link | Assumption A-1: the invitation banner cannot live inside Keycloak pages (no way to give the theme the list name without putting it in a URL). So a logged-out visitor of `/j/{token}` sees an **app-owned invitation page** (Angular, same tokens) with the banner „Du wurdest zur Liste „‹Name›“ eingeladen. Erstelle ein Konto oder melde dich an, um beizutreten.“ and the buttons „Konto erstellen und beitreten“ (starts login with `prompt=create`) and „Anmelden“. The name comes from a public, rate-limited `POST /v1/invitations/lookup` (token in the body; answers only the list name, nothing else; same uniform 404 for unknown tokens). The token survives the OIDC round trip in the server-side session (ADR 0008). |
| NFR-SEC-02 password hash | Keycloak (Argon2id configurable in Keycloak 26; set in the realm). Product stores no passwords. |
| NFR-SEC-06 rate limits | Login, sign-up, reset: Keycloak brute-force + reverse proxy. Share-link joins: in the app (Bucket4j filter per user and per IP, SPRING-SEC-21). |
| FR-SET-04 delete account | Re-authentication at Keycloak (`prompt=login&max_age=0`) returning to a deletion confirmation, then the use case deletes memberships/lists in the product and the Keycloak user through an outgoing admin-API port (SPRING-SEC-41); sessions invalidated. The password field in „Konto löschen?“ is replaced by the re-authentication step; texts of the dialog otherwise unchanged. |

## Consequences

AUTH screens are Keycloak themes (FreeMarker + CSS), not Angular pages; M1's Angular screens are the app shell only. Token and password never touch the SPA (TS-SEC-01, NG-SEC-08).

## Implementation note (M6)

FR-SET-04 as decided above: the SPA calls `DELETE /api/v1/me`; without a re-authentication confirmed in the session in the last 5 minutes the answer is `403 REAUTH_REQUIRED`, the SPA navigates to `/oauth2/authorization/keycloak?reauth=1` and comes back to `/einstellungen?konto-loeschen` (a constant path). The IdP account is deleted through the service account `groceries-admin` (realm role `manage-users` only; Keycloak 26.8 additionally needs the `kc-admin-api` client scope for the admin audience, which the dev realm sets). Order: product data first (one transaction, sessions ended), IdP second; a failed IdP call is retried from an outbox table. FR-SET-04 AC2's "Wrong password: field error" cannot occur in the product: the IdP shows its own error on its login page.

