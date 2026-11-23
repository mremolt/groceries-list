# Groceries List App – UX Concepts

| | |
|---|---|
| **Status** | Decided – see section 3 |
| **Version** | 0.1 |
| **Date** | 2026-11-23 |
| **Based on** | [01-concept.md](01-concept.md) v0.4 |
| **Mockups** | [mockups/archive/first-drafts/](mockups/archive/first-drafts/) · design canvas (page "Erste Entwürfe A/B/C"): https://claude.ai/artifact/8oStH94SASVc2y3uF6AjvH |

---

## 1. Overview

There are three mockups of the main screen (a list with its items). Each one uses a different layout and way of moving through the app, not just a different color scheme. All three:

- are **mobile first** and adapt to tablet and desktop. Each concept is one responsive screen, shown at 390 px (mobile), 834 px (tablet) and 1280 px (desktop) wide.
- have a **light and a dark theme**. The canvas shows both, and each mockup has a button to switch between them. In the real app, the theme should follow the device setting by default.
- cover only the MVP scope: lists, free-text items, checking items off, clearing checked items, the share link, and leaving a list (D1–D5).
- have German text (D4).
- are clickable: you can check items, add items, switch lists, and open the overlay panels.

| | A – Two-pane navigation | B – Tiles & board | C – Focus & input first |
|---|---|---|---|
| **Idea** | A familiar app layout: list navigation on the side, items in the main area | Items as large tiles to tap; on desktop, all lists side by side as columns | One calm column with large type; adding an item comes first |
| **Mobile navigation** | Menu button opens a side panel listing all lists | Row of tabs for the lists at the top | The list name in the header is a button that opens the list picker |
| **Adding items** | Mobile: input fixed at the bottom of the screen. Tablet/desktop: input above the items | Floating "Hinzufügen" button opens a panel from the bottom. Desktop: input at the top of each column | Large input with a visible label ("Was fehlt?") at the top, on all devices |
| **Items** | Compact rows with checkboxes (52 px high) | Tiles in 2 columns (mobile) or 3 columns (tablet), tapped to toggle. Desktop: cards in each column | Large rows (64 px, 20–22 px text) with large checkboxes |
| **Checked items** | Separate "Erledigt" section below the open items | Stay in the grid, moved to the end and shown faded with a dashed border | Mobile: collapsible "Im Wagen" section. Tablet/desktop: own column next to the open items |
| **Tablet / desktop** | Side panel with all lists, items in the main area (max. 720 px wide) | Tablet: tabs and 3 tile columns. Desktop: all lists side by side as columns, with horizontal scrolling | Same single column, centered. From tablet width, "Noch zu kaufen" and "Im Wagen" sit side by side |
| **Look** | Inter, slate grey and teal, calm | Space Grotesk headings, stone grey and orange, bold | Atkinson Hyperlegible (a font designed for readability), black/white and blue, high contrast |
| **Strengths** | Familiar; good overview of several lists; efficient on desktop | Fast to use in the store (big tap targets); desktop shows everything at once | Simplest; easiest to read; best for accessibility and older users |
| **Weaknesses** | Least distinctive; side panel adds a step on mobile | Most work to build accessibly; the board needs horizontal scrolling | Less information on screen; switching lists takes one extra tap |

### States shown on the canvas

| Artboard | State |
|---|---|
| A · Mobile (dark) | List side panel open |
| B · Mobile (dark) | "Add item" panel open |
| C · Mobile (dark) | List picker open |
| C · Mobile (light) | Menu open: rename, renew share link, leave list, delete list; account: settings, log out |

In A and B, the "Weitere Aktionen" (⋯) button doesn't open anything yet. Its contents would be the same as C's menu.

## 2. WCAG 2.2 AA Evaluation

### 2.1 Scope and method

- This is a **design-level evaluation** of the mockups against WCAG 2.2 Level A and AA. It is based on the markup, colors, sizes, and interaction design.
- It is **not** a conformance audit of a finished product. The binding accessibility requirements (full WCAG conformance) come from the technical documentation of the separate team (see 01-concept.md, section 8).
- Not tested yet: screen readers (NVDA, VoiceOver, TalkBack), 400 % zoom in real browsers, Windows high-contrast / forced-colors mode.

Ratings: ✅ met by the design · ⚠️ met only if the implementation follows the note · ❌ not met in the mockup

### 2.2 Color contrast (1.4.3 Text, 1.4.11 Non-text)

All ratios were calculated with the WCAG relative-luminance formula. Required: text 4.5:1 (large text 3:1); UI component borders and state indicators 3:1.

| Concept / theme | Body text | Secondary text | Accent text / buttons | Checkbox & input borders | Lowest value |
|---|---|---|---|---|---|
| A light | 17.9 | 7.2 | 5.2 / 5.5 | 4.8 | 4.8 ✅ |
| A dark | 14.1 | 6.8 | 12.7 / 7.8 | 6.8 | 6.8 ✅ * |
| B light | 16.7 | 7.0 | 5.0 / 5.2 | 4.8 | 4.8 ✅ |
| B dark | 16.7 | 10.2 | 10.4 / 7.7 | 6.0 | 6.0 ✅ |
| C light | 18.9 | 6.9 | 6.7 / 6.7 | 4.8 | 4.8 ✅ |
| C dark | 18.2 | 7.1 | 11.0 | 7.1 | 7.1 ✅ |

\* The check found one failure: in A dark, the item count on the selected list was 3.7:1. It is fixed in the mockup (it now uses the main text color, 7.7:1).

Checked items use a muted color **and** strikethrough, and stay at ≥ 4.5:1. They are still readable, so WCAG requires full contrast for them.

### 2.3 Criteria by concept

| WCAG 2.2 criterion | A | B | C | Notes |
|---|---|---|---|---|
| 1.1.1 Non-text content | ✅ | ✅ | ✅ | Decorative icons are hidden from screen readers; icon-only buttons have German names (e.g. "Liste teilen") |
| 1.3.1 Info and relationships | ✅ | ✅ | ✅ | Real headings, lists, labels and native controls. A and C use native checkboxes; B uses toggle buttons that report their state (`aria-pressed`) |
| 1.3.2 Meaningful sequence | ✅ | ⚠️ | ✅ | B: the floating "Hinzufügen" button must come after the item grid in the page structure, which it does in the mockup |
| 1.3.4 Orientation | ✅ | ✅ | ✅ | Works in portrait and landscape |
| 1.3.5 Identify input purpose | ⚠️ | ⚠️ | ⚠️ | Not shown in the mockups: the login and sign-up forms need autofill hints (`email`, `current-password`, `new-password`) |
| 1.4.1 Use of color | ✅ | ✅ | ✅ | Checked state = checkmark + strikethrough + position, not color alone. Selected list = background + bold text + programmatic "current" state |
| 1.4.3 Contrast (minimum) | ✅ | ✅ | ✅ | See 2.2 |
| 1.4.4 Resize text | ✅ | ⚠️ | ✅ | B: tab and button heights are fixed in the mockup; the implementation must use minimum heights so text doesn't get cut off at 200 % |
| 1.4.10 Reflow | ✅ | ⚠️ | ✅ | B desktop board scrolls horizontally. At 320 px width (400 % zoom) B switches to the tab layout, so it passes, but the board must never be shown at narrow widths |
| 1.4.11 Non-text contrast | ✅ | ✅ | ✅ | Checkbox, input and checked-tile borders ≥ 3:1. C's progress bar is decorative (hidden from screen readers) and has a text equivalent ("2 von 9 erledigt") |
| 1.4.12 Text spacing | ⚠️ | ⚠️ | ✅ | A/B: fixed-height pills and buttons must grow with the text |
| 1.4.13 Content on hover or focus | ✅ | ✅ | ✅ | No tooltips or hover-only content |
| 2.1.1 Keyboard | ✅ | ✅ | ✅ | Only native buttons, inputs and checkboxes; no dragging |
| 2.1.2 No keyboard trap | ⚠️ | ⚠️ | ⚠️ | Overlays (A side panel, B add panel, C list picker) must close with Esc and with their close button |
| 2.4.3 Focus order | ⚠️ | ⚠️ | ⚠️ | Overlays: move focus into the overlay when it opens, keep it there while open, and return it to the button that opened it on close |
| 2.4.6 Headings and labels | ✅ | ✅ | ✅ | Every screen has an h1 (list name or "Meine Listen") and sections have h2s |
| 2.4.7 Focus visible | ⚠️ | ⚠️ | ⚠️ | The mockups rely on the browser's default focus outline. The design system needs a clearly visible focus style in both themes |
| **2.4.11 Focus not obscured (minimum)** *(new in 2.2)* | ⚠️ | ⚠️ | ✅ | A mobile: the fixed bottom input bar, and B: the floating button can cover a focused item. Needs extra bottom scroll padding (`scroll-padding-bottom`) |
| 2.5.1 Pointer gestures | ✅ | ✅ | ✅ | No swipe or multi-finger gestures needed; B's scrolling tab row also works by tapping |
| 2.5.3 Label in name | ✅ | ✅ | ✅ | Each button's accessible name contains its visible text |
| **2.5.7 Dragging movements** *(new in 2.2)* | ✅ | ✅ | ✅ | No drag and drop; the fixed item order decided for the MVP (I3) helps here |
| **2.5.8 Target size (minimum)** *(new in 2.2)* | ✅ | ✅ | ✅ | All touch targets ≥ 44 × 44 px (AA requires 24 × 24) |
| 3.1.1 Language of page | ✅ | ✅ | ✅ | Pages are marked as German (`lang="de"`) |
| 3.2.1 / 3.2.2 On focus / on input | ✅ | ✅ | ✅ | Checking an item doesn't move focus. **Note:** in A and C, a checked item moves to the other section; focus handling must keep the user's place (e.g. focus the next open item) |
| **3.2.6 Consistent help** *(new in 2.2)* | ⚠️ | ⚠️ | ⚠️ | If help or contact options are added, they must always be in the same place (e.g. Settings) |
| 3.3.1 Error identification | ⚠️ | ⚠️ | ⚠️ | Submitting an empty item is silently ignored in the mockups; the implementation needs a text error message |
| 3.3.2 Labels or instructions | ⚠️ | ⚠️ | ✅ | A, and B on desktop: the input label is only available to screen readers, and the visible placeholder disappears while typing. Technically enough, but a visible label is recommended. C (and B's add panel) have visible labels |
| **3.3.7 Redundant entry** *(new in 2.2)* | ✅ | ✅ | ✅ | No multi-step forms in the MVP |
| **3.3.8 Accessible authentication (minimum)** *(new in 2.2)* | ⚠️ | ⚠️ | ⚠️ | Email + password login (D3) must allow pasting and password managers, with no puzzle-style CAPTCHA |
| 4.1.2 Name, role, value | ✅ | ✅ | ✅ | C: the list picker and the menu are expand/collapse panels (`aria-expanded`), not ARIA menus, so screen readers and keyboard users don't expect arrow-key menu navigation |
| 4.1.3 Status messages | ⚠️ | ⚠️ | ⚠️ | Not shown in the mockups: "Artikel hinzugefügt", "Erledigte entfernt" and changes by other members (D5 / R1 regular sync) must be announced via a polite live region, batched so updates aren't too chatty |

### 2.4 Summary

| | A | B | C |
|---|---|---|---|
| Met by the design | 20 | 17 | 23 |
| Met with implementation notes | 11 | 14 | 8 |
| Not met in the mockup | 0 (1 contrast failure found and fixed) | 0 | 0 |
| **Implementation effort for AA** | Medium | High | Low |

**From an accessibility point of view, C is the strongest concept:** visible labels, large text and targets, nothing fixed over the content, and a readability-focused font. A comes close; its main gaps are the fixed bottom input bar and labels only screen readers get. B can reach AA, but needs the most care: toggle tiles, the floating button covering focus, the overlay panel, and the horizontal board.

**Requirements for every concept** (to go into the detailed requirements):
1. Overlays: focus management, Esc to close, and focus returned to the opening button.
2. A visible focus style in both themes.
3. Status messages for item changes and for updates from other members.
4. Error messages for invalid input.
5. Login and sign-up: autofill hints, pasting allowed, no cognitive tests.
6. Theme follows the system setting (`prefers-color-scheme`) by default, and the app also works in forced-colors / high-contrast mode.
7. Respect the reduced-motion setting (`prefers-reduced-motion`) for any animation added later.

## 3. Recommendation and Next Steps

> **Decision (2026-11-23):** Concept C, with the list navigation always visible on desktop, reworked to follow Material Design 3. See [03-ux-material3.md](03-ux-material3.md).

- **Recommendation:** C as the base, possibly with A's always-visible list side panel on desktop to make switching lists easier.
- **To decide:**
  1. Which concept (or combination) to continue with?
  2. Should the theme only follow the system setting, or also have a manual switch in Settings?
- **Next:** refine the chosen concept and add the remaining screens (log in / sign up, list overview, share link dialog, settings, confirmation dialogs). Then write the detailed requirements.
