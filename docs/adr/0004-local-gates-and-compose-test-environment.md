# 0004. No pipeline yet: local verify gates; the internal test environment is the local Compose installation

- **Status:** Accepted
- **Date:** 2026-11-23
- **Deciders:** implementing agent (unattended run, kickoff.md); for review by the team
- **Rules affected:** REL-CD-08, REL-CD-01, SEC-CI-01, SPRING-DEV-10

## Context

05 asks for a pipeline that deploys to an internal test environment. There is no SCM host, CI or hosting yet, and the repository has no remote.

## Decision

Interim per REL-CD-08: the gates are the local commands `cd backend && ./mvnw verify` and `cd frontend && npm run verify`, plus the E2E tiers, run before every commit. The "internal test environment" is the local Docker Compose installation (`backend/compose.yaml` + `compose.app.yaml`: PostgreSQL, Keycloak, Mailpit, the app image built from the same commit). Chapter 7 keeps every pipeline row, marked "not applicable" with reason and trigger.

## Consequences

No automatic deployment; scans (dependency, secret, SAST) run as local commands where installed and are logged. The PR template and branch protection come with the SCM host.

**Revisit when:** an SCM host or hosted environment is chosen.
