# Groceries List App – UX: Concept C in Material Design 3

| | |
|---|---|
| **Status** | Draft – for review |
| **Version** | 0.3 |
| **Date** | 2026-11-23 |
| **Based on** | [02-ux-concepts.md](02-ux-concepts.md) – concept C chosen, with a permanent navigation drawer on desktop |
| **Mockups** | [mockups/](mockups/README.md) (sources, screenshots, [design tokens](mockups/design-tokens.json)) · design canvas: https://claude.ai/artifact/8oStH94SASVc2y3uF6AjvH – page "Konzept C – Material 3" |

---

## 1. What changed compared to concept C

- **The list navigation is always visible on desktop:** a navigation drawer down the left side, instead of the list picker in the header.
- **The list picker is replaced by the standard Material pattern on mobile and tablet:** a menu button opens a navigation drawer that slides in over the content.
- **All components follow Material Design 3 (M3)**, including its color roles, type scale, shapes, elevation, and screen-size classes.
- **The checked-items section is collapsible on mobile.** It uses a button that announces whether it is open, instead of the browser's built-in `<details>` element.
- **New:** confirmation dialogs for deleting a list, leaving a list, and clearing checked items. These implement the MVP rule "confirm, no undo" (N4).
- **v0.2 – more visual structure** (review feedback: items were "listed naked on the background"):
  - The content sits on a slightly darker page background (Surface Container in light, Surface in dark).
  - The input, the open items and the checked items are each in their own outlined card (white / Surface Container, Outline Variant border, 12 px corners).
  - Each card has a header with a title, a count badge and a divider. The open-items header also holds the progress.
  - Item rows are separated by full-width dividers.
  - Each open item has a trailing edit button (editing items is in the MVP scope).
  - On desktop, the permanent drawer is separated from the content by a border.

- **v0.3 – mobile input row** (review feedback): on mobile, "Hinzufügen" is now a round icon-only button (+, 48 px) with the accessible name "Hinzufügen", so the text field gets most of the width. The example text is shorter on mobile ("z. B. 2× Milch"). Tablet and desktop keep the labelled button.
- **v0.3 – all remaining MVP screens** (see section 5).

## 2. Layout by Material window size class

| Window size class | Width | Example | Navigation | Content |
|---|---|---|---|---|
| **Compact** | < 600 px | Phone | Menu button in the top app bar opens a drawer over the content | One column; checked items in a collapsible card |
| **Medium** | 600–839 px | Tablet portrait | Same as compact | Two columns: "Noch zu kaufen" next to an "Im Wagen" card (max. 840 px wide) |
| **Expanded** | ≥ 840 px | Tablet landscape, desktop | **Navigation drawer always visible**, 360 px wide | Two columns, max. 1040 px wide |

## 3. Components used

| Area | M3 component | Spec details used |
|---|---|---|
| Header | Medium top app bar | Icon row 64 px high; title below it in Headline Small (24/32), Headline Medium (28/36) on desktop; icon buttons with 48 px touch targets |
| Navigation | Navigation drawer (standard on desktop, modal on mobile/tablet) | 360 px wide, Surface Container Low background, items 56 px high and fully rounded, active item in Secondary Container, section heading in Title Small, divider in Outline Variant. The modal drawer has a 16 px corner radius and a 32 % black backdrop |
| "Neue Liste" | Extended FAB, placed at the top of the drawer | 56 px high, 16 px corners, Primary Container color |
| Item input | Outlined text field | 56 px high, 4 px corners, Outline border, label "Was fehlt?" sitting on the border, placeholder text as an example |
| "Hinzufügen" | Filled button with icon | 40 px high, fully rounded, Primary / On Primary, Label Large text |
| Progress | Linear progress indicator (decorative) | 4 px high, Primary bar on a Secondary Container track with a 4 px gap. The text "x von y erledigt" carries the information |
| Item containers | Outlined cards | Card background white (light) / Surface Container (dark), 1 px Outline Variant border, 12 px corners. Header in Title Medium (16/24), with a badge in Secondary Container and a divider below |
| Items | List items (one line) with a leading checkbox and a trailing icon button | 56 px high, Body Large (16/24), full-width dividers in Outline Variant. Checkbox: 18 px box, 2 px corners, 48 px touch target. Trailing edit button 48 px. Checked items in On Surface Variant with strikethrough |
| Checked items | Outlined card | Same style as the open-items card; footer with the "Erledigte entfernen" text button. Collapsible on mobile with an expand/collapse arrow |
| "Erledigte entfernen", dialog actions | Text button | 40 px high, Primary color. Destructive actions use the Error color |
| ⋮ menu | Menu | Surface Container, 4 px corners, Elevation 2 shadow, items 48 px high with leading icons, dividers between the "list" and "account" groups |
| Confirmations | Basic dialog | Surface Container High, 28 px corners, title in Headline Small, actions right-aligned |
| Icons | Material Icons (filled, 24 px) | Embedded as SVG |

### 3.1 Color scheme

The colors are an M3 scheme generated from a blue seed color (Material Theme Builder, "Tonal Spot" variant), in light and dark versions. Main roles:

| Role | Light | Dark |
|---|---|---|
| Primary / On Primary | `#415F91` / `#FFFFFF` | `#AAC7FF` / `#0A305F` |
| Primary Container / On Primary Container | `#D6E3FF` / `#284777` | `#284777` / `#D6E3FF` |
| Secondary Container / On Secondary Container | `#DAE2F9` / `#3E4759` | `#3E4759` / `#DAE2F9` |
| Surface / On Surface | `#F9F9FF` / `#191C20` | `#111318` / `#E2E2E9` |
| On Surface Variant | `#44474E` | `#C4C6D0` |
| Outline / Outline Variant | `#74777F` / `#C4C6D0` | `#8E9099` / `#44474E` |
| Surface Container Low / Container / High | `#F3F3FA` / `#EDEDF4` / `#E7E8EE` | `#191C20` / `#1D2024` / `#282A2F` |
| Error | `#BA1A1A` | `#FFB4AB` |

### 3.2 Typography

Roboto (the M3 default), using the M3 type scale: Headline Medium/Small, Title Medium/Small, Body Large/Medium, Label Large. The font is a single design setting. A brand font, or a font designed for readability like Atkinson Hyperlegible from the first draft of C, can be swapped in later without changing the layout.

### 3.3 Deliberate deviations from M3

| Deviation | Reason |
|---|---|
| The label of the "Was fehlt?" field always sits on the border, even when the field is empty | Keeps the label permanently visible (WCAG 3.3.2), which was a strength of concept C |
| Mockups show a theme switch in the app bar | For reviewing only. The product follows the system setting, with a manual override in Settings (U1) |
| The drawer header has no app name or logo | Keeps the MVP minimal; can be added once there is branding |

## 4. WCAG 2.2 AA – changes compared to the evaluation in 02

Everything from [02-ux-concepts.md, section 2](02-ux-concepts.md#2-wcag-22-aa-evaluation) for concept C still applies. Changes:

| Criterion | Result | Notes |
|---|---|---|
| 1.4.3 Contrast | ✅ | All text roles ≥ 4.5:1 in both themes. Lowest: Primary on Secondary Container, 4.96:1 (light). Body text 16.3:1 (light) / 14.4:1 (dark) |
| 1.4.11 Non-text contrast | ✅ | Text field border (Outline) 4.27:1 light / 5.84:1 dark; checkbox border (On Surface Variant) 8.9:1 / 10.9:1 |
| 2.5.8 Target size | ✅ | Material's own target size (48 px) is well above the 24 px AA minimum. Buttons are drawn 40 px high, which still passes |
| 3.3.2 Labels | ✅ | Visible label on the text field (see deviation above) |
| 4.1.2 Name, role, value | ✅ | The drawer button, the ⋮ menu button, and the "Im Wagen" card report whether they are open or closed (`aria-expanded`). The current list is marked as current (`aria-current`). Dialogs are labelled by their title and text |
| 2.1.2 / 2.4.3 Keyboard & focus order | ⚠️ | Applies to three overlays now (drawer, menu, dialog): focus must move into them, stay inside while open, close with Esc, and return to the opening button. The M3 menu also needs arrow-key navigation once it is built as a real menu |
| 2.4.7 Focus visible | ⚠️ | M3 defines a focus ring (3 px, Secondary color, offset 2 px). It must be implemented in both themes |
| 1.4.11 Card borders & dividers | ✅ | They only structure the page visually and are not needed to identify a control, so no minimum contrast applies (≈ 1.7:1, clearly visible). Controls inside the cards keep their own ≥ 3:1 borders (text field 4.5:1 / 5.1:1) |
| 2.4.11 Focus not obscured | ✅ | Nothing is fixed over the content. The overlays are modal, so they don't hide focus on the page behind them |
| 3.3.4 Error prevention | ✅ | Not required for this app (no legal or financial data), but the confirmation dialogs cover the destructive actions anyway |

## 5. Screens

All screens are on the page "Konzept C – Material 3" of the canvas. Rows: main screen light/dark · log in & password · empty states & settings · dialogs & messages.

| Screen / state | Shown as | Notes |
|---|---|---|
| Log in | Mobile light, desktop light | Email, password with a show/hide button, "Passwort vergessen?", "Konto erstellen". On desktop: a centered card |
| Sign up (arrived through a share link) | Mobile light, with an error | Banner "Du wurdest zur Liste … eingeladen" (D1: account required). Fields: display name, email, password. Shows the error state: red border, error icon, error text that says how to fix it, and the field marked as invalid for screen readers (`aria-invalid`). The button reads "Konto erstellen und beitreten" |
| Reset password | Mobile dark | Email field, "Link senden" |
| Email sent | Mobile dark | Neutral wording ("Falls ein Konto … existiert"), so it doesn't reveal whether an account exists; "Erneut senden" |
| New password | Mobile light | One password field with a show/hide button, no "repeat password" field (WCAG 3.3.7) |
| First start, no lists | Mobile light, desktop light | Empty state with "Neue Liste", plus a note that opening a share link adds that list |
| New, empty list | Mobile dark | Empty state inside the "Noch zu kaufen" card; the progress is hidden |
| Settings | Mobile light, desktop dark | Cards: Profile (display name), Darstellung (System / Hell / Dunkel as a segmented button, U1), Konto (email, Abmelden, Konto löschen). Below: a note on how to request a copy of your data (N3), Impressum and Datenschutz links |
| Share | Mobile light, desktop dark (+ snackbar "Link kopiert") | Read-only link field, "Link kopieren", a note about renewing the link, the action "Link erneuern" (D5) |
| Rename list / new list | Mobile dark | Dialog with one text field |
| Edit item | Mobile light | Dialog with a text field; "Löschen" on the left removes the item (deleting items is in the MVP scope) |
| Delete account | Mobile light | Password confirmation; explains what happens to shared lists |
| Renew link, delete / leave list, clear checked items | (main screen rows, interactive) | Confirmation dialogs (N4) |
| Joined via a share link | Mobile dark | Snackbar "Du bist der Liste … beigetreten" |

All screens are clickable: the menu, drawer, dialogs and snackbars all open and close.

### 5.1 WCAG notes for the new screens

| Criterion | Result | Notes |
|---|---|---|
| 1.3.5 Identify input purpose | ✅ | Autofill hints `email`, `current-password`, `new-password`, `nickname` |
| 1.4.3 Contrast | ✅ | Snackbar 11.6:1 (light) / 10.2:1 (dark); error text on cards 6.5:1 / 9.6:1; dialog actions ≥ 5.2:1 |
| 2.2.1 Timing adjustable | ⚠️ | Snackbars must not disappear before people can read them: either they stay until closed (as in the mockup, which has a close button), or they stay for at least 10 seconds and pause on hover/focus |
| 3.3.1 / 3.3.3 Error identification & suggestion | ✅ | Errors are marked by an icon, the word "Fehler:" and an example, not only by red color |
| 3.3.7 Redundant entry | ✅ | No "repeat password" field; the email address is pre-filled on the "email sent" screen |
| 3.3.8 Accessible authentication | ✅ | Password managers and pasting are allowed (stated in the help text), a show-password button is offered, there's no CAPTCHA |
| 4.1.3 Status messages | ✅ | Snackbars and the "email sent" message are announced to screen readers (`role="status"`) |

## 6. Decisions

| # | Topic | Decision |
|---|---|---|
| U1 | Theme | Follows the device setting by default. Settings offers "System / Hell / Dunkel". The theme switch in the mockups' app bar is for reviewing only and won't be in the product. |
| U2 | Text size | Standard M3 type sizes. Users enlarge text through their browser or device settings; there is no separate in-app option. The layout must support this (WCAG 1.4.4). |
| U3 | Colour | Keep the blue scheme for the MVP. It is generated from one base colour, so it can be changed later at low cost. |

## 7. Next Steps

1. Review the mockups.
2. Write the detailed requirements, using these screens as the reference.
