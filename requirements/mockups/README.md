# Mockups – Groceries List App

Final UI mockups for the MVP: **concept C in Material Design 3** (see [../03-ux-material3.md](../03-ux-material3.md)).
The layout is final. The UI language is German.

| Folder / file | Contents |
|---|---|
| `source/` | Final mockups as source files (`.dc.html`), one file per screen/state, plus the two shared components `M3.dc.html` and `M3Auth.dc.html` |
| `screenshots/` | One PNG per screen, named like the source file (see below) |
| `design-tokens.json` | Colours (light/dark), typography, shapes, elevation, breakpoints, component sizes – **use these values in the implementation** |
| `canvas.json` | Layout of the design canvas (position and title of every screen). Only needed to rebuild the canvas |
| `archive/first-drafts/` | The three original concepts A/B/C. **Not to be implemented**, kept for history ([../02-ux-concepts.md](../02-ux-concepts.md)) |

Original design canvas (claude.ai, private; access must be shared by the owner): https://claude.ai/artifact/8oStH94SASVc2y3uF6AjvH – page "Konzept C – Material 3".

## How to use these mockups when implementing

1. **The requirements documents are binding**; the mockups show *how* it should look and behave. If they contradict each other, the requirements win; record the conflict in the implementation log (see `../05-implementation-plan.md` §1.3) and continue.
2. Take colours, sizes and type from `design-tokens.json`, not by eyeballing screenshots.
3. Use `screenshots/` to see the target and `source/` for exact details: text, spacing, states, and accessibility attributes (`aria-*`, labels, `autocomplete`).
4. Accessibility attributes in the source files are part of the spec. Keep them (WCAG 2.2 AA, see `../02-ux-concepts.md` §2 and `../03-ux-material3.md` §4 and §5.1).
5. The mockups are **not production code**. Re-implement them with the project's own framework and an M3 component library if one is used.

## Reading the `.dc.html` format

The files were made with a design-canvas tool and **do not render on their own** (they need that tool's runtime, `support.js`, which is not included). Read them as annotated HTML:

| Construct | Meaning |
|---|---|
| `<x-dc> … </x-dc>` | The screen's markup. Everything inside is plain HTML with inline styles |
| `<helmet>` | Head content (font import) |
| `{{name}}` | A value computed in the `<script type="text/x-dc">` block at the end of the file (method `renderVals()`), e.g. `{{c.primary}}` = colour role `primary` of the current theme |
| `<sc-if value="{{cond}}">` | Shown only when the condition is true (e.g. `compact`, `expanded`, `dialogOpen`) |
| `<sc-for list="{{items}}" as="it">` | Repeated once per entry (e.g. per list item) |
| `<dc-import name="M3" theme="dark" device="compact" dialog="share">` | Embeds the component `M3.dc.html` with these settings. The small screen files are just such wrappers that select a state |
| `onClick="{{handler}}"` | Interaction in the clickable mockup; the handler logic is in the script block |
| `data-props` on the script tag | The settings a component accepts (theme, device size, view, dialog, …) |

**Component settings (`M3.dc.html`):** `theme` light/dark · `device` compact/medium/expanded · `view` list/settings · `empty` noLists/noItems · `dialog` delete/clear/leave/renew/share/rename/newList/editItem/deleteAccount · `snackbar` copied/renewed/joined/cleared/deleted/left/saved/created · `drawer`, `menu`, `doneOpen` (booleans).

**Component settings (`M3Auth.dc.html`):** `theme` · `device` · `mode` login/register/reset/resetSent/newPassword · `invite` (arrived via share link) · `showError`.

The script blocks also contain the mock data and simple behaviour (check items, add, rename, delete, confirmations). Use them to understand the intended flow, not as an implementation.

## Screen index

`hell` = light theme, `dunkel` = dark theme. Compact = phone (390 px), Medium = tablet (834 px), Expanded = desktop (1280 px).

| File | Screen / state | Size |
|---|---|---|
| `M3.dc.html` | Main screen (shared component; default: desktop, light) | Expanded |
| `M3-Mobil-hell.dc.html` | Main screen, "Im Wagen" expanded | Compact |
| `M3-Mobil-Navigation-hell.dc.html` | Navigation drawer open | Compact |
| `M3-Tablet-hell.dc.html` | Main screen | Medium |
| `M3-Mobil-Menue-dunkel.dc.html` | ⋮ menu open | Compact |
| `M3-Mobil-Dialog-dunkel.dc.html` | "Liste löschen?" confirmation | Compact |
| `M3-Tablet-dunkel.dc.html` | Main screen | Medium |
| `M3-Desktop-dunkel.dc.html` | Main screen, permanent drawer | Expanded |
| `M3Auth.dc.html` | Log in (shared component; default: desktop, light) | Expanded |
| `Auth-Login-hell.dc.html` | Log in | Compact |
| `Auth-Registrieren-hell.dc.html` | Sign up after opening a share link, with validation error | Compact |
| `Auth-Reset-dunkel.dc.html` | Reset password | Compact |
| `Auth-Postfach-dunkel.dc.html` | Reset email sent | Compact |
| `Auth-NeuesPasswort-hell.dc.html` | Set new password | Compact |
| `Leer-Listen-hell.dc.html` | First start, no lists | Compact |
| `Leer-Listen-Desktop-hell.dc.html` | First start, no lists | Expanded |
| `Leer-Liste-dunkel.dc.html` | New, empty list | Compact |
| `Settings-hell.dc.html` | Settings | Compact |
| `Settings-Desktop-dunkel.dc.html` | Settings | Expanded |
| `Dlg-Teilen-hell.dc.html` | Share dialog | Compact |
| `Dlg-Teilen-Desktop-dunkel.dc.html` | Share dialog + snackbar "Link kopiert" | Expanded |
| `Dlg-Umbenennen-dunkel.dc.html` | Rename list | Compact |
| `Dlg-NeueListe-dunkel.dc.html` | New list | Compact |
| `Dlg-Artikel-hell.dc.html` | Edit / delete item | Compact |
| `Dlg-Konto-hell.dc.html` | Delete account (from Settings) | Compact |
| `Snack-Beigetreten-dunkel.dc.html` | Joined a list via share link (snackbar) | Compact |

Not drawn as separate screens but part of the interactive mockup: the confirmations "Erledigte entfernen?", "Liste verlassen?", "Teilen-Link erneuern?" (same dialog style as "Liste löschen?").

## Screenshots

`screenshots/` contains one PNG per screen, **named like the source file with `.png` instead of `.dc.html`**, e.g.
`source/Dlg-Teilen-hell.dc.html` → `screenshots/Dlg-Teilen-hell.png`.
`M3.png` and `M3Auth.png` show the two components in their default state (desktop, light).
Images are at 2× resolution (phone 780 × 1688, tablet 1668 × 2224, desktop 2560 × 1600).

### Known mockup artifacts – do not reproduce

| Artifact | Intended design |
|---|---|
| Visible grey scroll bars (vertical and horizontal) in the content area | The content area scrolls vertically only, with no horizontal scrolling. Scroll bars follow the platform default |
| On phone screenshots, the right edge of the cards touches or is cut off by the scroll bar | Cards have the same 12 px margin on the left and right (compact), 24 px on medium/expanded |
| Settings › Darstellung: the label "Design" sits directly under the card's divider, with a large gap above the segmented button | Label 16 px below the divider, 12 px above the segmented button |
