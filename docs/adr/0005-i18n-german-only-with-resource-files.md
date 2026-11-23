# 0005. German only, texts in resource files

- **Status:** Accepted
- **Date:** 2026-11-23
- **Deciders:** implementing agent (unattended run, kickoff.md); for review by the team
- **Rules affected:** I18N-01, I18N-02, I18N-03, NG-I18N-01, SPRING-I18N-01

## Context

NFR-L10N: German only, texts in resource files (more languages later).

## Decision

Supported locale `de` (source and only). No language switch, no Weblate connection. Frontend: Transloco with `de.json` catalogs per feature and `context.json` sidecars (NG-I18N-02/05); `<html lang="de">`. Backend: one `MessageSource` with `messages_de.properties`; API stays language neutral with stable error `code`s, `title`/`detail` German (I18N-03). Keycloak theme texts in `messages_de.properties` of the theme (Keycloak's own resource mechanism). Pseudo-locale for tests is generated (TOOL-I18N-04) where cheap.

## Consequences

Adding a language later means translation files, not code. Weblate is not set up (TOOL-I18N-08 stance: catalogs live in the repository).
