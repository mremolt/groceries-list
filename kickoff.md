We're building the groceries list app described in requirements/. Read requirements/README.md first. The order of implementation and the working rules are in requirements/05-implementation-plan.md (milestones M0–M7, unattended, commit and log rules). The binding requirements are in 04-detailed-requirements.md, and the look is in mockups/ (values from mockups/design-tokens.json). Don't load everything at once: read 04 by the requirement IDs of the milestone you are working on.

The plan leaves every technical detail to "the platform team's technical documentation". That documentation is our quality baseline in docs/baseline/: synced, with AGENTS.md as the entry point and stacks spring + angular, declared in .baseline.json. It is binding. On anything technical it wins over the requirements, over skills and over your own habits.

## Session scope and progress

STOP POINT: none. Run M0 through M7 unattended. Stop earlier only for a blocker as defined in 05 §1.2 and under "Working mode" below. If a session ends for another reason (context or time limit), the log must let the next session resume without loss.

Progress lives in implementation-log.md at the repository root (05 §1.3). Put a short "Resume" section at the top of it:
- the stop point;
- the status of each milestone (not started / in progress / done, with commit hash and tag);
- the next action, precise enough for a fresh session to continue without this conversation;
- the work in flight (half-done items, files touched, what is still red).

Below that, keep the per-milestone entries 05 asks for.

At the start of every session:
- If implementation-log.md exists, read its Resume section first, check `git log`, `git tag` and `git status` against it, and continue at "Next action". Don't redo finished work.
- If the repository has only the requirements commit, first commit the synced baseline, AGENTS.md, CLAUDE.md, the agent skills and hooks, the IDE config, .baseline.json and this kickoff.md, unchanged, as "Initial commit: baseline sync and kickoff". Then create the log.

Update the log with every commit and before you stop for any reason.

## Working mode: unattended

I'm away. One goal of this project is to test whether the baseline alone is enough to guide you, so work unattended:
- Don't stop for confirmation, reviews or progress reports, and **never stop between milestones**. After a milestone's commit and tag, continue straight into the next one.
- When you face a choice, decide it yourself, in this order: the baseline, then the requirements, then the most conservative sensible default. Record the decision as an ADR (architecture) or in docs/architecture/ (product concepts). Record assumptions in the log as 05 §1.1 rule 4 says, then continue.
- Stop only for a blocker from 05 §1.2, for anything irreversible or outward-facing (pushing, publishing, external accounts, real credentials), or for a red build you cannot fix without breaking rule 6. Before stopping, finish all work that doesn't depend on the answer and update the log.
- Commit as 05 §1.3 says: milestone and requirement IDs in the message, plus the baseline rule IDs the change applies. Tag each milestone (`m0-done` … `m7-done`). The repository has no remote: **don't push**.

## Technical frame (maps 05 §2 onto the baseline)

1. Before any work: read AGENTS.md and follow its "How to read" steps (TOOL-SKL-10):
   - the rule indexes first;
   - full docs only for the topics a task touches;
   - a single rule by its ID;
   - before finishing, the agent checklist sections of the docs you used.

   Before writing code for a stack, load that stack's entry skills from AGENTS.md "Read by stack". Load the task skills (`baseline-tdd`, `baseline-security`, …) whenever a task touches their area.
2. Before M0, do the technical design as documents only. Don't write a separate technical specification; document only what is specific to this product:
   - docs/architecture/ (arc42): context, building blocks, domain model, and product-specific concepts such as sharing tokens, synchronisation by polling and optimistic item updates. Link to docs/baseline/ instead of repeating it.
   - an ADR in docs/adr/ for every choice the baseline leaves open and for every deviation;
   - docs/security/requirements.md and a first docs/security/threat-model.md;
   - docs/data-protection/: processing record and deletion concept. The product stores e-mail addresses, names and shopping lists. 05 §5 defers the GDPR *measures* NFR-PRIV for the internal test release, but the baseline's inventory and deletion documents are still required;
   - the repository layout per the decision guide (REPO-LAY-02), with the decision recorded: one repository, `backend/` and `frontend/`.

   Commit this as "M0 design: …" before scaffolding.
3. Where the requirements describe a technical solution that differs from the baseline, the baseline applies. Map the business intent onto the baseline's solution and record each mapping in docs/architecture/ (with an ADR where it is a decision). Known cases:
   - FR-AUTH-01–05 and NFR-SEC-02/03/06. Own sign-up, login, password storage, reset mails and login rate limits become login through the external OIDC identity provider (Keycloak, locally in Compose) via the BFF. Sign-up, reset and brute-force protection are identity-provider configuration and features. Keycloak's login theme carries the German texts and the design tokens as far as possible. The acceptance criteria are tested against the real identity provider in the real-backend E2E tier. Rate limits on the app's own endpoints (share-link joins) stay in the app (SPRING-SEC-21).
   - FR-AUTH-06 (login and sign-up from a share link): the join token survives the OIDC round trip server-side, never in browser storage (TS-SEC-01).
   - FR-SET-04 (delete account with password confirmation): becomes re-authentication at the identity provider (`prompt=login` / `max_age`) followed by deletion in the product and at the identity provider.
   - M0's "pipeline deploys to the internal test environment": there is no CI or hosting yet. Apply REL-CD-08. The local `verify` commands are the gate, and the internal test environment is the local Compose installation with Mailpit as the mail catcher. Record this in an ADR and in docs/architecture/07. It is not a blocker.
   - Texts are German only (NFR-L10N), but they still live in resource files, not in templates.
4. Implement milestone by milestone, as 05 §3 and §4 say. For each milestone:
   - work test-first with the test type each architecture element requires (testing-by-architecture-element.md);
   - meet both the milestone's "Done when" and the baseline's rules: hexagonal boundaries and architecture tests, generated OpenAPI clients, WCAG 2.2 AA asserted by tests, explicit timeouts, membership checks per BR-01 with a non-member test;
   - check every data-loading change for N+1, especially the drawer counts and the "changes since" polling. Choose a strategy and note it in the commit message (API-N1-01);
   - update docs/architecture/ in the same change when the architecture changes. Docs claim only what exists (DOC-ARC-11);
   - once `backend/` and `frontend/` exist, re-run the `baseline-ide-setup` skill so the IDE config picks up the stacks;
   - run the full verify of both components and all tests before committing. A milestone isn't done while anything is red.

   Copy the "Manual check" lines into the log for the human review (05 §1.4). Don't do them yourself.
5. Demo data (05 §3): two fictitious test users and the three lists from the mockups, created by a seed adapter under a demo profile. Fictitious only (DP-ENV-01).
6. Never weaken or delete a test, an architecture rule, a lint rule, or a security or accessibility check to get green (SEC-REV-02). Never take an architectural shortcut silently. If one seems unavoidable, write the ADR draft and take the compliant path if there is one; otherwise treat it as a blocker.

## Baseline feedback

We're also test-driving the baseline. Keep a running log in baseline-feedback.md at the repository root. Record every place where the baseline was:
- unclear or contradictory;
- missing something the requirements needed;
- impractical;
- contradicted by a skill.

Also record every decision you had to make because the baseline didn't answer it, even an easy one. For each entry, give the doc or rule ID, what happened, and what you did instead. Keep it factual and short, number the entries F-01, F-02, …, and commit the file with the milestones.

When you reach the stop point or hit a blocker, end with a short report:
- the milestones completed, with their tags and the commit range;
- the next action from the log;
- the assumptions and open questions;
- the number of baseline-feedback entries.
