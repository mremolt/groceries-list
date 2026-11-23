# Groceries List App – Basic Concept

| | |
|---|---|
| **Status** | Draft – ready for sign-off |
| **Version** | 0.4 |
| **Date** | 2026-11-23 |
| **Next step** | Detailed requirements (after concept sign-off) |

---

## 1. Vision

A simple, fast web app that lets households, flatmates, and friends plan grocery shopping together. Everyone who shares a list sees the same up-to-date list, can add what's needed, and can tick items off in the store, so nothing is forgotten or bought twice.

**Guiding principle:** simplicity over features. Adding an item or checking one off has to take seconds, including on a phone in a supermarket aisle. The MVP deliberately contains only what is needed to share a list and shop from it.

## 2. Problem Statement

- Shopping lists live on paper, in chat messages, or in one person's head.
- Household members don't know what's already on the list or what's already been bought.
- This leads to duplicate purchases, forgotten items, and a lot of "do we still need milk?" messages.

## 3. Target Users & Personas

| Persona | Description | Key need |
|---|---|---|
| **Household organizer** | Does most of the planning and shopping for a family | Keep one central list and let others contribute |
| **Contributor** | Partner, child, or flatmate who notices that something has run out | Add an item quickly without much thought |
| **Shopper** | Whoever happens to be at the store | See the current list and check items off as they go |
| **Occasional collaborator** | Friend planning a party or a trip | Join a single list for a short time |

One person can take on different personas at different times.

## 4. Core Concepts (Domain Model)

| Concept | Description |
|---|---|
| **User** | A registered person with an account (email, password, display name). |
| **List** | A named grocery list (e.g. "Weekly shop", "BBQ Saturday"). The user who creates it becomes its first member. |
| **Item** | One free-text line on a list (e.g. "2x milk, lactose-free") with a status: open or checked. |
| **Membership** | Links a user to a list. There are **no roles**: every member has the same rights on the list (see 4.1). |
| **Share link** | A per-list link. Any logged-in user who opens it becomes a member of the list. Any member can renew it, which makes the old link stop working. |

```
User ──< Membership >── List ──< Item
                         │
                         └── Share link
```

### 4.1 Permission Model: All Members Are Equal

Every member of a list can do everything on it:

- add, edit, check/uncheck, and delete items; clear checked items
- rename or delete the list
- copy the share link and pass it on; renew the share link
- leave the list

Members **cannot remove other members**. The creator of a list is only recorded for information and has no extra rights.

**Rules:**
- Deleting a list, clearing checked items, and leaving a list require a confirmation step. There is no undo.
- When the last member leaves a list, the list is deleted.

## 5. MVP Scope

### 5.1 Account & Access
- Sign up, log in, log out, reset password (email + password)
- Basic profile: display name
- Delete own account (see 8, Data protection)

### 5.2 Lists
- Create, rename, and delete lists
- Overview of all lists the user is a member of

### 5.3 Items
- Add, edit, and delete items (a single free-text line each)
- Check and uncheck items (bought / not bought)
- Clear all checked items at once
- Fixed order: open items in the order they were added, checked items at the bottom. No manual reordering.

### 5.4 Sharing
- Each list has a share link that any member can copy and send through any channel (messenger, email, …)
- Opening the link while logged in adds the user to the list. Users who are not logged in sign up or log in first.
- An account is required to join; there is no guest access
- Any member can renew the share link. The old link stops working immediately, and existing members stay.
- No email invitations, no accept/decline step
- Members can leave a list; they cannot remove others

### 5.5 Sync
- While a list is open, the app checks for changes every few seconds, and again whenever the user returns to the browser tab or app window
- Simultaneous changes must never lose data. If two members edit the same item at the same time, the last change wins.

## 6. Out of Scope for MVP

**Candidates for later versions:**
- Native mobile apps (the web app is responsive and mobile-first instead)
- Offline mode (including read-only offline viewing)
- Live push updates (instead of checking every few seconds)
- Structured items (separate quantity, unit, note), categories, store aisle sorting
- Manual reordering of items
- Autocomplete and suggestions from purchase history
- Showing who added or checked an item; activity history
- Email invitations; removing other members; automatically expiring share links
- Undo / restoring deleted lists and items
- Archiving lists
- Household groups (sharing all lists with a group)
- Multiple languages
- Self-service data export
- Recipes and meal planning; prices, budgets, receipts
- Notifications (push / email)
- Integrations (voice assistants, online grocery delivery)

## 7. Key User Flows

1. **First use:** Sign up → create first list → add items → copy the share link and send it to a partner.
2. **Joining:** Open the share link → sign up or log in → the list appears in the overview.
3. **Contributing:** Open the app → pick a list → add "milk" → done (≤ 3 taps after opening).
4. **Shopping:** Open the list in the store → check items off → other members see the progress within a few seconds → clear checked items afterwards.

### Screens

1. Sign up / log in / reset password
2. List overview (create a list)
3. List view (items, share link, rename, delete, leave)
4. Settings (display name, log out, delete account)

## 8. Non-Functional Goals (High Level)

| Area | Goal |
|---|---|
| **Usability** | Mobile-first, responsive, works one-handed; minimal learning curve |
| **Performance** | Interactions feel instant; changes reach other members within a few seconds |
| **Availability** | Reliable enough for daily household use |
| **Security** | Users can only see lists they are a member of; secure authentication |
| **Data protection** | GDPR-compliant. Users can delete their own account. Requests for a copy of a user's data are handled manually by support; there is no export feature. |
| **Compatibility** | Current versions of major browsers (desktop & mobile) |
| **Accessibility** | Full WCAG conformance. Details are defined in the technical documentation of a separate team and will be referenced here later. |
| **Localization** | German only at launch |

## 9. Assumptions

- Users have internet access while using the app.
- Lists are small, typically fewer than 100 items and fewer than 10 members.
- The app is free to use, with no monetization in the MVP.

## 10. Decisions

All open questions from the review are resolved:

| # | Topic | Decision |
|---|---|---|
| D1 | Account requirement | Everyone needs an account; no guest access through share links |
| D2 | Offline | Out of scope for the MVP, including read-only offline viewing |
| D3 | Login methods | Email + password only; no social login |
| D4 | Language | German only at launch |
| D5 | Unwanted members | Any member can renew the share link (the old link stops working). Members still cannot remove each other. |

## 11. Next Steps

1. Sign off this concept.
2. Write the detailed requirements: functional requirements with IDs, user stories and acceptance criteria, detailed non-functional requirements, and data and permission rules.
3. Prioritize the requirements and confirm the MVP scope.

## Change Log

| Version | Changes |
|---|---|
| 0.1 | First draft |
| 0.2 | Removed roles; all members of a list have identical rights |
| 0.3 | Reduced to a minimal MVP: no archive; items as one free-text line with fixed order; share link instead of invitations; members can only leave; no "added/checked by"; regular update checks instead of live push; one language; no data export feature; no undo; no household groups; accessibility moved to the separate technical docs |
| 0.4 | Resolved open questions: account required, no offline mode, email + password only, German only, share link can be renewed |
