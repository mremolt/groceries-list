# Groceries List App – Detailed Requirements (MVP)

| | |
|---|---|
| **Status** | Draft – for review |
| **Version** | 0.3 |
| **Date** | 2026-11-23 |
| **Based on** | [01-concept.md](01-concept.md) v0.4 (D1–D5), [03-ux-material3.md](03-ux-material3.md) v0.3 (U1–U3), [mockups/](mockups/README.md) |

---

## 1. Introduction

### 1.1 Purpose

This document defines **what** the MVP must do, precisely enough to be implemented and tested. It is the binding reference for implementation. Where it and the mockups disagree, this document wins (see [README](README.md)).

### 1.1a Release scope

The first release is an **internal test release without public access**. Requirements marked **[Deferred – public release]** are not required for it; see [05-implementation-plan.md §5](05-implementation-plan.md#5-not-required-for-the-internal-test-release). They remain the target for the later public release.

### 1.2 Conventions

| Item | Convention |
|---|---|
| Requirement IDs | `FR-<AREA>-<NN>` (functional), `NFR-<AREA>-<NN>` (non-functional). IDs never change; removed requirements are marked *withdrawn*, not deleted |
| Priority | **Must** = required for the MVP release. **Should** = planned for the MVP; can slip only with product-owner approval. **Could** = nice to have |
| Acceptance criteria | Numbered `AC1, AC2, …` per requirement, mostly written as *Given / When / Then* |
| UI text | German, in quotes, exactly as shown (e.g. „Neue Liste“). Final copy may be polished, but its meaning must stay the same |
| Screen references | 📱 = file in `mockups/source/` (a screenshot with the same name is in `mockups/screenshots/`) |
| "Member" | A logged-in user who has access to a list. All members have identical rights (no roles) |
| Window size classes | Compact < 600 px, Medium 600–839 px, Expanded ≥ 840 px (see `mockups/design-tokens.json`) |

### 1.3 Areas

| Area | Code | Section |
|---|---|---|
| Accounts & authentication | AUTH | 3.1 |
| Navigation & app shell | NAV | 3.2 |
| Lists | LIST | 3.3 |
| Items | ITEM | 3.4 |
| Sharing & joining | SHARE | 3.5 |
| Synchronisation | SYNC | 3.6 |
| Settings & account | SET | 3.7 |
| Feedback, errors & empty states | FB | 3.8 |
| Non-functional | NFR-* | 4 |

---

## 2. Data Model and Business Rules

### 2.1 Entities

| Entity | Attributes | Rules |
|---|---|---|
| **User** | id, email, passwordHash, displayName, createdAt, lastLoginAt | `email` unique (compared case-insensitively, stored trimmed and lower-cased). `displayName` 1–50 characters after trimming |
| **List** | id, name, shareToken, createdBy (user id, informational only), createdAt, updatedAt | `name` 1–80 characters after trimming; duplicate names are allowed. `shareToken` is unique and random (see NFR-SEC-05) |
| **Membership** | userId, listId, joinedAt | One membership per user and list. Grants full rights on the list (D1 in the concept: no roles) |
| **Item** | id, listId, text, done, createdAt, updatedAt, doneAt | `text` 1–200 characters after trimming; duplicate texts are allowed. `done` is true/false |

### 2.2 Business rules

| ID | Rule |
|---|---|
| BR-01 | Only members can read or change a list or its items. Every request is authorised on the server (NFR-SEC-04) |
| BR-02 | All members have identical rights: add, edit, check, delete items; clear checked items; rename, share, renew the link, delete the list; leave |
| BR-03 | Members cannot remove other members |
| BR-04 | When the last member leaves a list, or deletes their account, the list and all its items are deleted |
| BR-05 | Deleting a list deletes it for **all** members, including its items and memberships |
| BR-06 | A list has exactly one valid share link at a time. Renewing it makes the previous link invalid immediately; existing memberships stay |
| BR-07 | Share links do not expire on their own |
| BR-08 | Joining requires an account (D1); there is no guest access |
| BR-09 | Item order: open items by `createdAt` ascending (oldest first). Checked items by `createdAt` ascending. No manual reordering |
| BR-10 | Order of lists in the navigation: by the user's `joinedAt` ascending (the list created or joined first is at the top) |
| BR-11 | Destructive actions on lists (delete, leave, clear checked items, renew the link) need a confirmation dialog. There is no undo (N4). Deleting a single item from the edit dialog needs no extra confirmation |
| BR-12 | Limits (to protect the service, confirmed in OQ-3): max. 500 items per list, 100 lists per user, 50 members per list. When a limit is reached, the action is refused with a clear message |

---

## 3. Functional Requirements

### 3.1 Accounts & Authentication (AUTH)

**User stories**
- As a new user, I want to create an account with my email address, so that I can create and share lists.
- As someone who received a share link, I want to sign up or log in right from that link, so that I end up in the shared list without extra steps.
- As a user who forgot my password, I want to reset it by email.

---

**FR-AUTH-01 – Sign up** · Must · 📱 `Auth-Registrieren-hell`, `M3Auth` (mode register)

The app offers a sign-up form with the fields „Anzeigename“, „E-Mail-Adresse“, „Passwort“ and the button „Konto erstellen“.

- AC1: Given valid input, when the user submits, then the account is created, the user is logged in and lands on the app (FR-NAV-03).
- AC2: „Anzeigename“ is required, 1–50 characters after trimming.
- AC3: „E-Mail-Adresse“ is required and must be a syntactically valid address. If the address is already registered, the message is „Mit dieser E-Mail-Adresse gibt es bereits ein Konto. Melde dich an oder setze dein Passwort zurück.“ with a link to log in.
- AC4: „Passwort“ needs at least 8 and at most 128 characters. There are no composition rules (no forced special characters). Help text: „Mindestens 8 Zeichen. Passwort-Manager und Einfügen sind erlaubt.“
- AC5: *Should:* Passwords that appear on a list of commonly used or breached passwords are rejected with „Dieses Passwort ist zu leicht zu erraten. Bitte wähle ein anderes.“
- AC6: There is a single password field (no „Passwort wiederholen“) with a show/hide button („Passwort anzeigen“, toggle state announced).
- AC7: **[Deferred – public release]** Below the fields: „Mit der Registrierung akzeptierst du die Nutzungsbedingungen und die Datenschutzhinweise.“ with both linked.
- AC8: Validation errors follow FR-FB-04 (error state per field, error text that explains the fix, focus on the first invalid field).
- AC9: Link „Schon ein Konto? Anmelden“ switches to the login form, keeping the entered email address.

**FR-AUTH-02 – Log in** · Must · 📱 `Auth-Login-hell`, `M3Auth`

- AC1: Fields „E-Mail-Adresse“ and „Passwort“ (with show/hide), button „Anmelden“, text button „Passwort vergessen?“, outlined button „Konto erstellen“.
- AC2: Given correct credentials, the user is logged in and lands on the app (FR-NAV-03).
- AC3: Given wrong credentials, the message is „E-Mail-Adresse oder Passwort ist falsch.“ – the same text whether the email exists or not (no account enumeration).
- AC4: Failed attempts are rate-limited (NFR-SEC-06). When limited, the message is „Zu viele Versuche. Bitte warte einen Moment und versuche es erneut.“
- AC5: The session stays valid for 30 days after the last activity (sliding). There is no "remember me" checkbox.

**FR-AUTH-03 – Log out** · Must · 📱 `M3-Mobil-Menue-dunkel`, `Settings-hell`

- AC1: „Abmelden“ is available in the ⋮ menu and in Settings › Konto.
- AC2: Logging out ends the session on this device only and shows the login screen.

**FR-AUTH-04 – Request password reset** · Must · 📱 `Auth-Reset-dunkel`, `Auth-Postfach-dunkel`

- AC1: The form has the field „E-Mail-Adresse“ and the button „Link senden“; „Zurück zur Anmeldung“ returns to login.
- AC2: After submitting, the screen „Prüfe dein Postfach“ is shown with the text „Falls ein Konto mit ‹E-Mail› existiert, haben wir dir einen Link zum Zurücksetzen geschickt. Schau auch im Spam-Ordner nach.“ – regardless of whether the account exists.
- AC3: If the account exists, an email with a reset link is sent. The link is valid for 60 minutes and can be used once. Requesting a new link invalidates older ones.
- AC4: „Keine E-Mail bekommen? Erneut senden“ requests a new link (rate-limited, NFR-SEC-06).

**FR-AUTH-05 – Set new password** · Must · 📱 `Auth-NeuesPasswort-hell`

- AC1: Opening a valid reset link shows „Neues Passwort festlegen“ for the account's email address with one password field (rules as FR-AUTH-01 AC4/AC5).
- AC2: „Passwort speichern und anmelden“ sets the password, ends all other sessions of this user, and logs the user in.
- AC3: An expired or already used link shows „Dieser Link ist abgelaufen oder wurde schon verwendet.“ with the button „Neuen Link anfordern“ (→ FR-AUTH-04).

**FR-AUTH-06 – Login and sign-up from a share link** · Must · 📱 `Auth-Registrieren-hell`

- AC1: Given a logged-out visitor opens a valid share link, then the login/sign-up screen shows the banner „Du wurdest zur Liste „‹Listenname›“ eingeladen. Erstelle ein Konto oder melde dich an, um beizutreten.“
- AC2: The sign-up button reads „Konto erstellen und beitreten“.
- AC3: After successful sign-up or login (including a password reset in between, if feasible), the user joins the list automatically (FR-SHARE-03).
- AC4: The banner shows the list name only. It shows no items, members or other content.

---

### 3.2 Navigation & App Shell (NAV)

**FR-NAV-01 – Responsive layout** · Must · 📱 all `M3-*`

| Window size | Navigation | Content |
|---|---|---|
| Compact | Menu button „Navigation öffnen“ opens a modal navigation drawer | One column; „Im Wagen“ is a collapsible card below „Noch zu kaufen“ |
| Medium | Same as compact | Two columns: „Noch zu kaufen“ (3/5) and „Im Wagen“ (2/5), max. 840 px |
| Expanded | Permanent navigation drawer (360 px) on the left | Two columns, max. 1040 px |

- AC1: The layout switches when the window width crosses a breakpoint, without reloading and without losing input.
- AC2: At 320 px width, all content is usable without horizontal scrolling (NFR-A11Y).

**FR-NAV-02 – Navigation drawer** · Must · 📱 `M3-Mobil-Navigation-hell`, `M3`

- AC1: Contents from top to bottom: button „Neue Liste“ (FR-LIST-01) · heading „Meine Listen“ · one entry per list (name + number of open items) in the order of BR-10 · divider · „Einstellungen“.
- AC2: The active list (or „Einstellungen“) is highlighted and marked as the current page for assistive technology.
- AC3: Each list entry's accessible name includes the open count, e.g. „Wocheneinkauf, 7 offen“.
- AC4: Compact/Medium: selecting an entry opens it and closes the drawer. The drawer closes with „Navigation schließen“, a tap on the backdrop, or Esc; focus returns to the menu button.
- AC5: Without lists, the drawer shows „Noch keine Listen.“

**FR-NAV-03 – Start screen** · Must · 📱 `M3`, `Leer-Listen-hell`

- AC1: After login, the app opens the list the user last opened on this device. If that list no longer exists or none was stored, the first list according to BR-10 opens.
- AC2: Without lists, the empty state „Noch keine Listen“ is shown (FR-FB-01).

**FR-NAV-04 – Top app bar** · Must · 📱 `M3-Mobil-hell`, `M3`

- AC1: Shows the page title (list name, „Einstellungen“, or „Einkaufsliste“ without lists) as the page's main heading.
- AC2: On a list: icon buttons „Liste teilen“ (FR-SHARE-01) and „Weitere Optionen“ (⋮, FR-NAV-05).
- AC3: Compact/Medium additionally: „Navigation öffnen“ at the start.
- AC4: The theme switch shown in the mockups is for review only and **not** part of the product (U1). The theme is set in Settings (FR-SET-02).

**FR-NAV-05 – ⋮ menu** · Must · 📱 `M3-Mobil-Menue-dunkel`

- AC1: Entries: „Liste umbenennen“, „Teilen-Link erneuern“, „Liste verlassen“, „Liste löschen“ (error colour) · divider · „Einstellungen“, „Abmelden“.
- AC2: The menu button reports its open/closed state. The menu closes on selection, on Esc, or on a click outside; focus returns to the menu button.
- AC3: Keyboard: arrow keys move between entries (NFR-A11Y-04).

**FR-NAV-06 – Deep links** · Should

- AC1: Every list and the settings page have their own URL (e.g. `/listen/‹id›`, `/einstellungen`), so the browser's back button, reload and bookmarks work.
- AC2: Opening a list URL the user is not a member of shows „Diese Liste gibt es nicht oder du hast keinen Zugriff.“ – the same text for both cases.

---

### 3.3 Lists (LIST)

**User stories**
- As a household organiser, I want to create several lists (e.g. weekly shop, BBQ), so that I can keep different purchases apart.
- As a member, I want to rename, leave or delete a list.

---

**FR-LIST-01 – Create list** · Must · 📱 `Dlg-NeueListe-dunkel`

- AC1: „Neue Liste“ (drawer or empty state) opens the dialog „Neue Liste“ with the field „Name der Liste“ and the buttons „Abbrechen“ / „Erstellen“.
- AC2: Given a valid name (1–80 characters after trimming), the list is created, the user becomes its only member, the new list opens, and the snackbar „Liste erstellt“ appears.
- AC3: An empty name is refused with the field error „Bitte gib einen Namen ein.“; too long: „Der Name darf höchstens 80 Zeichen lang sein.“
- AC4: Enter in the field submits the dialog.

**FR-LIST-02 – Rename list** · Must · 📱 `Dlg-Umbenennen-dunkel`

- AC1: ⋮ › „Liste umbenennen“ opens the dialog with the current name pre-filled and the text „Der neue Name ist für alle Mitglieder sichtbar.“
- AC2: „Speichern“ saves the name (rules as FR-LIST-01) and shows the snackbar „Gespeichert“. Other members see the new name with the next sync (FR-SYNC-01).

**FR-LIST-03 – Delete list** · Must · 📱 `M3-Mobil-Dialog-dunkel`

- AC1: ⋮ › „Liste löschen“ opens the confirmation „„‹Name›“ löschen?“ – „Die Liste wird für alle Mitglieder gelöscht. Das kann nicht rückgängig gemacht werden.“ with „Abbrechen“ / „Löschen“ (error colour).
- AC2: On confirmation, the list is deleted for everyone (BR-05). The user sees the next list (BR-10) or the empty state, plus the snackbar „Liste gelöscht“.
- AC3: Other members who currently have the list open see FR-SYNC-05.

**FR-LIST-04 – Leave list** · Must

- AC1: ⋮ › „Liste verlassen“ opens „„‹Name›“ verlassen?“ – „Die Liste verschwindet aus deiner Übersicht. Wenn du das letzte Mitglied bist, wird sie gelöscht.“ with „Abbrechen“ / „Verlassen“.
- AC2: On confirmation, the membership is removed; if it was the last member, BR-04 applies. The user sees the next list or the empty state, plus the snackbar „Du hast die Liste verlassen“.
- AC3: The user can rejoin later only through a valid share link.

**FR-LIST-05 – Open count per list** · Must · 📱 `M3`

- AC1: Each list entry in the drawer shows the number of open (unchecked) items, updated with every sync.

---

### 3.4 Items (ITEM)

**User stories**
- As a contributor, I want to add an item in a few seconds, so that I don't forget it.
- As a shopper, I want to check items off while shopping, so that everyone sees what is already in the trolley.
- As a member, I want to correct or delete an item.

---

**FR-ITEM-01 – Add item** · Must · 📱 `M3-Mobil-hell`, `M3`

- AC1: The card „Artikel hinzufügen“ contains the text field „Was fehlt?“ (with an example placeholder) and the add button: icon-only „+“ with accessible name „Hinzufügen“ on Compact, labelled „Hinzufügen“ on Medium/Expanded.
- AC2: Enter or the button adds the item as **one free-text line** (1–200 characters after trimming) at the end of „Noch zu kaufen“ (BR-09).
- AC3: After adding, the field is cleared and **keeps the focus**, so several items can be entered in a row.
- AC4: An empty input is refused with the field error „Bitte gib einen Artikel ein.“; too long: „Höchstens 200 Zeichen.“
- AC5: From opening the app to an added item takes at most 3 taps/clicks plus typing (NFR-USE-01).
- AC6: Duplicate items are allowed; there is no merging.

**FR-ITEM-02 – Check / uncheck item** · Must · 📱 `M3`, `M3-Mobil-hell`

- AC1: Each item has a checkbox labelled with the item text. Checking it moves the item to „Im Wagen“ (shown struck through); unchecking moves it back to „Noch zu kaufen“ at its position per BR-09.
- AC2: The change is shown immediately (optimistic update) and saved on the server; if saving fails, the change is undone and FR-FB-05 applies.
- AC3: After checking with the keyboard, focus moves to the next open item (or the previous one if it was the last), so the user does not lose their place (NFR-A11Y).
- AC4: The header of „Noch zu kaufen“ shows the open count as a badge and the progress „‹x› von ‹y› erledigt“ with a progress bar; both are hidden when the list has no items.

**FR-ITEM-03 – Edit item** · Must · 📱 `Dlg-Artikel-hell`

- AC1: Every open item has the icon button „„‹Text›“ bearbeiten“. It opens the dialog „Artikel bearbeiten“ with the text pre-filled and the note „Änderungen sind sofort für alle Mitglieder sichtbar.“
- AC2: „Speichern“ saves the text (rules as FR-ITEM-01). „Abbrechen“ discards.
- AC3: Checked items have **no** edit button (OQ-6). To change one, the user unchecks it first.

**FR-ITEM-04 – Delete item** · Must · 📱 `Dlg-Artikel-hell`

- AC1: The dialog „Artikel bearbeiten“ has the button „Löschen“ (error colour, on the left). It deletes the item immediately, without a further confirmation (BR-11).

**FR-ITEM-05 – Clear checked items** · Must

- AC1: The card „Im Wagen“ has the text button „Erledigte entfernen“ when it contains at least one item.
- AC2: It opens „Erledigte entfernen?“ – „‹n› erledigte Artikel werden für alle Mitglieder entfernt.“ with „Abbrechen“ / „Entfernen“.
- AC3: On confirmation, all checked items of this list are deleted and the snackbar „Erledigte Artikel entfernt“ appears.
- AC4: Only the items that were checked when the dialog opened are removed. Items checked by others in the meantime stay.

**FR-ITEM-06 – „Im Wagen“ section on Compact** · Must · 📱 `M3-Mobil-hell`

- AC1: On Compact, „Im Wagen“ is a collapsible card, collapsed by default, with the count badge visible when collapsed. The header button reports its expanded state.
- AC2: *Should:* The expanded/collapsed state is remembered per device.

---

### 3.5 Sharing & Joining (SHARE)

**User stories**
- As a list member, I want to send a link to my partner via any messenger, so that they can join the list.
- As a member, I want to make a link that was sent to the wrong person stop working.

---

**FR-SHARE-01 – Share dialog** · Must · 📱 `Dlg-Teilen-hell`, `Dlg-Teilen-Desktop-dunkel`

- AC1: „Liste teilen“ opens „„‹Name›“ teilen“ with the text „Jede Person mit diesem Link und einem Konto kann der Liste beitreten und sie bearbeiten.“, the read-only field „Teilen-Link“ with the current link, the button „Link kopieren“, a note about renewing, and the buttons „Link erneuern“ and „Fertig“.
- AC2: „Link kopieren“ copies the link to the clipboard and shows the snackbar „Link kopiert“.
- AC3: *Should:* Where the browser supports the Web Share API (mainly mobile), an additional button „Teilen …“ opens the system share sheet.
- AC4: Link format: `https://‹domain›/j/‹shareToken›` (NFR-SEC-05).

**FR-SHARE-02 – Renew share link** · Must

- AC1: Reachable via ⋮ › „Teilen-Link erneuern“ and „Link erneuern“ in the share dialog.
- AC2: Confirmation „Teilen-Link erneuern?“ – „Der bisherige Link funktioniert danach nicht mehr. Wer schon Mitglied ist, bleibt Mitglied.“ with „Abbrechen“ / „Erneuern“.
- AC3: On confirmation, a new token is created (BR-06) and the snackbar „Neuer Teilen-Link erstellt. Der alte Link funktioniert nicht mehr.“ appears. An open share dialog shows the new link.

**FR-SHARE-03 – Join via link** · Must · 📱 `Snack-Beigetreten-dunkel`

- AC1: Given a logged-in user who is not a member opens a valid link, the user becomes a member, the list opens, and the snackbar „Du bist der Liste „‹Name›“ beigetreten.“ appears.
- AC2: Given the user is already a member, the list just opens (no snackbar, no duplicate membership).
- AC3: Given a logged-out visitor, FR-AUTH-06 applies first.
- AC4: Given the member limit is reached (BR-12), joining is refused with „Diese Liste hat die maximale Anzahl an Mitgliedern erreicht.“

**FR-SHARE-04 – Invalid link** · Must

- AC1: An unknown or renewed (old) token shows a page „Dieser Link funktioniert nicht mehr“ – „Bitte die Person, die dir den Link geschickt hat, um einen neuen.“ with the button „Zu meinen Listen“ (logged in) or „Anmelden“ (logged out). Style as the empty states (FR-FB-01); there is no mockup.
- AC2: The page reveals nothing about whether the list exists.

---

### 3.6 Synchronisation (SYNC)

**FR-SYNC-01 – Regular update** · Must (R1)

- AC1: While a list is visible, the app fetches changes at least every 5 seconds.
- AC2: When the tab/app becomes visible again or the window regains focus, the app fetches changes immediately.
- AC3: While the tab is hidden, polling pauses (or slows to at most once per 60 s).
- AC4: Given member A makes a change, then member B, with the same list open, sees it within 6 seconds under normal network conditions (NFR-PERF-03).
- AC5: Updates do not reset what the user is doing: focus, text being typed, open dialogs, and scroll position stay.

**FR-SYNC-02 – Concurrent changes** · Must

- AC1: Items added at the same time by different members are all kept.
- AC2: Conflicting edits to the same item (text or done state): the last change saved on the server wins.
- AC3: Given member A edits an item that member B has meanwhile deleted, then A's save fails and A sees the snackbar „Dieser Artikel wurde inzwischen gelöscht.“

**FR-SYNC-03 – Navigation counts** · Must

- AC1: Open counts in the drawer (FR-LIST-05), new lists (after joining on another device) and renamed lists update with the sync. *Should:* lists other than the open one are refreshed at least every 30 s.

**FR-SYNC-04 – Screen-reader announcements for changes by others** · Should

- AC1: Changes made by other members are announced through a polite live region, batched to at most one announcement per sync, e.g. „Liste aktualisiert: 2 neue Artikel, 1 erledigt.“

**FR-SYNC-05 – List removed while open** · Must

- AC1: Given another member deletes the list (or the user left it on another device), when the next sync runs, then the user sees the snackbar „Diese Liste wurde gelöscht.“ and is taken to the next list or the empty state.

---

### 3.7 Settings & Account (SET)

Reached via the drawer entry or the ⋮ menu „Einstellungen“. 📱 `Settings-hell`, `Settings-Desktop-dunkel`

**FR-SET-01 – Display name** · Must

- AC1: Card „Profil“: field „Anzeigename“ (help text „So wirst du in der App angezeigt.“) and „Speichern“; rules as FR-AUTH-01 AC2. Success: snackbar „Gespeichert“.

**FR-SET-02 – Theme** · Must (U1)

- AC1: Card „Darstellung“: segmented button „System“ / „Hell“ / „Dunkel“ with the note „„System“ folgt der Einstellung deines Geräts.“ Default: „System“.
- AC2: The choice applies immediately and is stored **on the device** (OQ-2), so different devices can follow their own system setting. It is not part of the user profile.
- AC3: With „System“, the app follows `prefers-color-scheme` and switches live when the system setting changes.
- AC4: The login/sign-up screens follow the stored choice, otherwise the system setting.

**FR-SET-03 – Account information** · Must

- AC1: Card „Konto“ shows the email address (read-only), „Abmelden“ (FR-AUTH-03) and „Konto löschen“ (FR-SET-04).
- AC2: Changing the email address is not part of the MVP.

**FR-SET-04 – Delete account** · Must · 📱 `Dlg-Konto-hell`

- AC1: „Konto löschen“ opens „Konto löschen?“ – „Dein Konto wird dauerhaft gelöscht und du verlässt alle Listen. Listen, in denen du das letzte Mitglied bist, werden ebenfalls gelöscht.“ – with the field „Passwort zur Bestätigung“ and „Abbrechen“ / „Konto löschen“ (error colour).
- AC2: With the correct password, the account, all its memberships, and all lists where it was the last member are deleted immediately (BR-04); all sessions end; the login screen appears. Wrong password: field error „Das Passwort ist falsch.“
- AC3: Items the user created in lists that remain stay in those lists (they contain no personal data beyond the free text).
- AC4: **[Deferred – public release]** Personal data is also removed from backups within 30 days (NFR-PRIV-03).

**FR-SET-05 – Data access and legal pages** · Must · **[Deferred – public release]**

- AC1: Below the cards: „Eine Kopie deiner gespeicherten Daten kannst du jederzeit beim Support anfordern: ‹Support-Adresse›“ (N3; handled manually).
- AC2: Links „Impressum“ and „Datenschutz“ are shown in Settings and on the login/sign-up screens. Their content is provided by the operator (OQ-5).

---

### 3.8 Feedback, Errors & Empty States (FB)

**FR-FB-01 – Empty states** · Must · 📱 `Leer-Listen-hell`, `Leer-Listen-Desktop-hell`, `Leer-Liste-dunkel`

- AC1: No lists: card with icon, heading „Noch keine Listen“, text „Lege deine erste Einkaufsliste an und teile sie mit Familie, Partner oder WG.“, button „Neue Liste“, and the note „Du hast einen Teilen-Link bekommen? Öffne ihn einfach – die Liste erscheint dann hier.“
- AC2: Empty list: inside „Noch zu kaufen“: „Diese Liste ist noch leer“ – „Füge oben den ersten Artikel hinzu. Alle Mitglieder sehen ihn sofort.“
- AC3: All items checked: „Alles im Wagen.“; no checked items: „Noch nichts abgehakt.“

**FR-FB-02 – Snackbars** · Must · 📱 `Snack-Beigetreten-dunkel`, `Dlg-Teilen-Desktop-dunkel`

- AC1: Snackbars appear at the bottom (Compact: full width with 12 px margins; Medium/Expanded: bottom left, 344–560 px wide) and have a close button „Hinweis schließen“.
- AC2: They hide automatically after 10 seconds at the earliest; the timer pauses while the snackbar is hovered or has keyboard focus (WCAG 2.2.1).
- AC3: They are announced to screen readers (status role, polite) and do not take focus.
- AC4: Only one snackbar is visible at a time; a new one replaces the current one.
- AC5: Message catalogue: „Link kopiert“ · „Neuer Teilen-Link erstellt. Der alte Link funktioniert nicht mehr.“ · „Du bist der Liste „‹Name›“ beigetreten.“ · „Erledigte Artikel entfernt“ · „Liste gelöscht“ · „Du hast die Liste verlassen“ · „Gespeichert“ · „Liste erstellt“ · „Diese Liste wurde gelöscht.“ · „Dieser Artikel wurde inzwischen gelöscht.“ · FR-FB-05/06 texts.

**FR-FB-03 – Dialogs** · Must

- AC1: Dialogs are modal: focus moves into the dialog on open (into the text field, if any; otherwise the least destructive button), stays inside while open, Esc closes it like „Abbrechen“, and focus returns to the element that opened it.
- AC2: Dialog title and text are the accessible name and description.
- AC3: In dialogs with a text field, Enter submits.

**FR-FB-04 – Form validation** · Must · 📱 `Auth-Registrieren-hell`

- AC1: Fields are validated on submit (and *Should:* on leaving a field that was changed). No errors are shown while the user is still typing.
- AC2: An invalid field shows a 2 px error-coloured border, an error icon, and below it an error text that starts with „Fehler:“ and explains how to fix it (e.g. „Fehler: Diese E-Mail-Adresse ist unvollständig. Beispiel: name@beispiel.de“).
- AC3: The field is marked invalid for assistive technology and linked to its error text; focus moves to the first invalid field.
- AC4: Entered values are kept after an error (except password fields after a failed login).

**FR-FB-05 – Server or save errors** · Must

- AC1: If an action fails (server error, timeout), optimistic changes are rolled back and the snackbar „Das hat nicht geklappt. Bitte versuche es noch einmal.“ appears.
- AC2: Text the user was typing (new item, dialog field) is never lost because of an error.

**FR-FB-06 – No connection** · Must

- AC1: When the device is offline or the server cannot be reached for more than 10 seconds, a banner below the app bar says „Keine Verbindung. Änderungen sind gerade nicht möglich.“ (announced politely). There is no mockup; style as an M3 banner using `secondaryContainer`.
- AC2: While offline, actions that change data are disabled; reading the last loaded state stays possible. There is no offline queue (offline mode is out of scope, D2).
- AC3: When the connection returns, the banner disappears and the app syncs immediately.

---

## 4. Non-Functional Requirements

### 4.1 Performance (PERF)

| ID | Prio | Requirement |
|---|---|---|
| NFR-PERF-01 | Must | First load of the app on a mid-range phone over 4G: Largest Contentful Paint ≤ 2.5 s, Interaction to Next Paint ≤ 200 ms (Core Web Vitals "good", 75th percentile) |
| NFR-PERF-02 | Must | Checking, adding, editing items gives visible feedback within 100 ms (optimistic UI, FR-ITEM-02 AC2) |
| NFR-PERF-03 | Must | Changes reach other members' open lists within 6 s (FR-SYNC-01) |
| NFR-PERF-04 | Should | The sync request for an unchanged list is cheap (e.g. conditional request / "changes since" token), so that polling every 5 s scales |

### 4.2 Security (SEC)

| ID | Prio | Requirement |
|---|---|---|
| NFR-SEC-01 | Must | HTTPS only (HSTS); no mixed content |
| NFR-SEC-02 | Must | Passwords are stored with a modern adaptive hash (Argon2id, or bcrypt with an adequate cost); never logged or sent by email |
| NFR-SEC-03 | Must | Sessions use secure, HttpOnly, SameSite cookies (or an equivalent token mechanism); state-changing requests are protected against CSRF; logout and password reset invalidate sessions as specified |
| NFR-SEC-04 | Must | Every API request checks the session **and** list membership on the server (BR-01). Non-members get the same response for "does not exist" and "no access" |
| NFR-SEC-05 | Must | Share tokens are generated by a cryptographically secure random generator with at least 128 bits of entropy and are not derived from list ids |
| NFR-SEC-06 | Must | Rate limits on login, sign-up, password-reset requests and share-link joins, per account and per IP (e.g. 5 failed logins per 15 min per account/IP → temporary block) |
| NFR-SEC-07 | Must | Output encoding everywhere: list names, item texts and display names are user input and must never be interpreted as HTML |
| NFR-SEC-08 | Should | Security headers: Content-Security-Policy, X-Content-Type-Options, Referrer-Policy (`no-referrer` or `same-origin`, so share tokens don't leak via the Referer header) |
| NFR-SEC-09 | Must | Share tokens and reset tokens do not appear in server or analytics logs in plain text |

### 4.3 Privacy (PRIV) – [Deferred – public release]

| ID | Prio | Requirement |
|---|---|---|
| NFR-PRIV-01 | Must | GDPR compliance; hosting and data processing in the EU/EEA |
| NFR-PRIV-02 | Must | Data minimisation: only the data in section 2.1 plus technically necessary logs (kept ≤ 30 days) |
| NFR-PRIV-03 | Must | Account deletion (FR-SET-04) takes effect immediately in the live system and in backups within 30 days |
| NFR-PRIV-04 | Must | No third-party tracking, advertising or analytics cookies. Should analytics be needed later, only privacy-friendly, cookie-less and with a consent decision |
| NFR-PRIV-05 | Must | Requests for a copy of personal data (Art. 15 GDPR) are handled manually by support within the legal deadline (N3); support needs a documented procedure/tool to export one user's data |
| NFR-PRIV-06 | Must | Emails (password reset) contain no list contents |

### 4.4 Accessibility (A11Y)

Binding target: **WCAG 2.2 Level AA**. Detailed technical rules come from the separate team's technical documentation (see 01-concept §8); this section lists what the design already depends on.

| ID | Prio | Requirement |
|---|---|---|
| NFR-A11Y-01 | Must | Contrast as in `design-tokens.json`: text ≥ 4.5:1, UI component borders/states ≥ 3:1, in both themes. New colours must be checked before use |
| NFR-A11Y-02 | Must | Everything works with keyboard only; visible focus indicator in both themes (M3 focus ring: 3 px, offset 2 px); focus never hidden behind other elements (2.4.11) |
| NFR-A11Y-03 | Must | Semantic structure as in the mockups: one main heading per page, sections with headings, lists as lists, native form controls with visible labels; accessible names of icon buttons as given in the mockups |
| NFR-A11Y-04 | Must | Overlays (drawer, menu, dialogs) follow the focus rules in FR-NAV-02/05 and FR-FB-03; the menu supports arrow-key navigation |
| NFR-A11Y-05 | Must | Touch targets ≥ 48 × 48 px for all interactive elements (well above the 24 px AA minimum) |
| NFR-A11Y-06 | Must | Usable at 320 px width and at 200 % text size without loss of content or function; text spacing can be increased without clipping (fixed heights become minimum heights) |
| NFR-A11Y-07 | Must | Status messages (snackbars, sync announcements, offline banner) use live regions and do not move focus |
| NFR-A11Y-08 | Must | Authentication: autofill attributes (`email`, `current-password`, `new-password`, `nickname`), pasting allowed, show-password toggle, no cognitive tests/CAPTCHAs (3.3.8) |
| NFR-A11Y-09 | Must | Respects `prefers-reduced-motion` (no or reduced animation) and works in forced-colors / high-contrast mode |
| NFR-A11Y-10 | Should | Tested with NVDA + Firefox, VoiceOver + Safari (macOS and iOS) and TalkBack + Chrome before release |

### 4.5 Usability (USE)

| ID | Prio | Requirement |
|---|---|---|
| NFR-USE-01 | Must | Adding an item from app start takes at most 3 taps plus typing |
| NFR-USE-02 | Must | One-handed use on phones: primary actions (add, check) reachable without precise taps; no hover-only functions |
| NFR-USE-03 | Should | Installable as a Progressive Web App (manifest, icons) so it can be added to the home screen. This is not an offline mode |

### 4.6 Compatibility (COMP)

| ID | Prio | Requirement |
|---|---|---|
| NFR-COMP-01 | Must | Current and previous major version of Chrome, Edge, Firefox and Safari on desktop; Safari on iOS/iPadOS and Chrome on Android (current and previous major version) |
| NFR-COMP-02 | Must | Window widths from 320 px to at least 2560 px; portrait and landscape |
| NFR-COMP-03 | Must | Works with system text-size settings (U2) – no in-app text size option |

### 4.7 Localisation (L10N)

| ID | Prio | Requirement |
|---|---|---|
| NFR-L10N-01 | Must | UI language German only (D4); `lang="de"` |
| NFR-L10N-02 | Should | All UI texts kept in a resource file (not hard-coded), so more languages can be added later |
| NFR-L10N-03 | Must | Dates/numbers in German format; sorting/comparison of names uses German collation |

### 4.8 Operations (OPS) – [Deferred – public release]

| ID | Prio | Requirement |
|---|---|---|
| NFR-OPS-01 | Must | Availability ≥ 99.5 % per month (excluding announced maintenance) |
| NFR-OPS-02 | Must | Daily backups, kept for at most 30 days (NFR-PRIV-03); restore tested at least once before launch |
| NFR-OPS-03 | Must | Transactional email (password reset) via a provider with SPF/DKIM/DMARC configured; sender name „Einkaufsliste“ |
| NFR-OPS-04 | Should | Error monitoring without personal data in error reports (no item texts, no emails, no tokens) |

---

## 5. Out of Scope (MVP)

As listed in [01-concept.md §6](01-concept.md#6-out-of-scope-for-mvp): native apps, offline mode, live push sync, structured items/categories, manual reordering, autocomplete, activity history / "added by", email invitations, removing members, expiring links, undo, archiving, household groups, multiple languages, self-service data export, recipes, prices, notifications, integrations. Also out of scope: changing the email address, social login (D3), in-app text size (U2).

---

## 6. Traceability

| Decision | Requirements |
|---|---|
| Roles removed – all members equal (01 §4.1) | BR-02, BR-03 |
| D1 – account required | BR-08, FR-AUTH-06, FR-SHARE-03 |
| D2 – no offline mode | FR-FB-06 |
| D3 – email + password only | FR-AUTH-01…05 |
| D4 – German only | NFR-L10N-01 |
| D5 – link renewal | BR-06, FR-SHARE-02, FR-SHARE-04 |
| R1 – polling instead of push | FR-SYNC-01…05, NFR-PERF-03/04 |
| N3 – manual data copy | FR-SET-05, NFR-PRIV-05 |
| N4 – confirm, no undo | BR-11, FR-LIST-03/04, FR-ITEM-05, FR-SHARE-02 |
| I1/I3 – free text, fixed order | Item entity (2.1), BR-09, FR-ITEM-01 |
| U1 – theme system + manual | FR-SET-02, FR-NAV-04 AC4 |
| U2 – system text size | NFR-COMP-03, NFR-A11Y-06 |
| U3 – blue scheme | `mockups/design-tokens.json`, NFR-A11Y-01 |

## 7. Decisions on Open Questions

All questions raised in v0.1 are decided (2026-11-23):

| # | Question | Decision |
|---|---|---|
| OQ-1 | Must users confirm their email address after sign-up? | **No.** The password reset proves ownership when needed. Accepted risk: someone can sign up with another person's address; that person can take the account over via reset |
| OQ-2 | Theme choice per device or per account? | **Per device** (FR-SET-02 AC2) |
| OQ-3 | Limits (BR-12) | **Accepted:** 500 items/list, 100 lists/user, 50 members/list |
| OQ-4 | Reset link validity, session length | **Accepted:** reset link 60 min, single use; session 30 days sliding (FR-AUTH-02/04) |
| OQ-5 | Impressum, Datenschutz, Nutzungsbedingungen, support address, domain | **Provided by the operator before launch.** Until then the implementation uses clearly marked placeholders (e.g. `‹Support-Adresse›`, `‹domain›`); launch is blocked until they are replaced |
| OQ-6 | Edit button on checked items? | **No.** Checked items can only be unchecked, or removed together via „Erledigte entfernen“ (FR-ITEM-03 AC3) |

## 8. Change Log

| Version | Changes |
|---|---|
| 0.1 | First version of the detailed requirements |
| 0.2 | Open questions OQ-1–6 decided (section 7); FR-ITEM-03 AC3: no edit button on checked items; BR-12 limits confirmed |
| 0.3 | Release scope (1.1a): first release is internal; privacy, legal and operations requirements marked as deferred to the public release |
