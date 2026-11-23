# Keycloak (dev realm and theme)

Local identity provider for the groceries list ([ADR 0002](../../../docs/adr/0002-bff-in-backend-and-keycloak-idp.md), [ADR 0003](../../../docs/adr/0003-map-auth-requirements-to-oidc.md)). **Everything here is for local development only: fictitious users, fictitious secrets (DP-ENV-01, SEC-INC-01).** Never use these files in a deployed environment.

| What | Where |
|---|---|
| Realm import | `groceries-realm.json` (realm `groceries`, imported at first start by `start-dev --import-realm`) |
| Login theme | `theme/groceries/login/` (FreeMarker templates, `resources/css`, `js`, self-hosted Roboto, German `messages/messages_de.properties`) |
| Reset mail theme | `theme/groceries/email/` (German reset mail, no list content) |
| BFF client secret | `groceries-bff` / `dev-only-client-secret`, also in `../secrets/keycloak-client-secret` (mounted file read by the backend, SPRING-CFG-07) |
| Demo users | `anna@example.test` / `Demo-Passwort-1`, `ben@example.test` / `Demo-Passwort-2` (fictitious) |

Run: `cd backend && docker compose --profile auth --profile mail up -d --wait` (Keycloak on http://keycloak.localhost:8180, admin `admin`/`admin`; Mailpit UI on http://localhost:8025). The issuer is `http://keycloak.localhost:8180/realms/groceries` for the browser, the app on the host and containers alike (SPRING-DEV-11). After a realm change: `docker compose --profile auth --profile mail down -v` (the import runs once per empty database). Theme files are re-read on every request in dev mode.

Settings (ADR 0003): self-registration with the e-mail address as username, `displayName` user attribute (1–50 characters, claim `displayName`, also mapped to `name`), no e-mail verification (OQ-1), password length 8–128 without composition rules, Argon2id hashing, brute-force detection (5 failures, temporary lockout of 15 minutes, window 15 minutes), reset link valid 60 minutes and single use, SSO session 30 days, access token 5 minutes, only locale `de`. `prompt=create` opens the registration page. Back-channel logout goes to `http://app:8080/logout/connect/back-channel/keycloak`: the app runs in Compose as service `app` (`compose.app.yaml`), which is the stack the real-backend E2E tier uses. An app started on the host (`spring-boot:run`) is not reachable under that name; to test back-channel logout there, add `extra_hosts: ["app:host-gateway"]` to the keycloak service in a local override and let the app listen on the bridge address.

The theme needs JavaScript for two things: the password show/hide toggle and mirroring the single password field into Keycloak's mandatory `password-confirm` field.
