# Design

Every app follows the same behavioural rules and uses the same token names. Each app chooses its
own palette, fonts and personality. Rules here are about how an app behaves, not how it looks.

## Copy

The full rules, with examples, are the `ui-verbosity-reduction` skill
(`skills/ui-verbosity-reduction/SKILL.md`). Write new copy to them, not just clean up after.
In short:

- **The test:** would someone who has never seen this screen still know what to do if this
  string were shorter? If yes, shorten it. Shorter must not mean vaguer.
- **Don't narrate the UI** or point at the control beside the text. A page subtitle is optional:
  one line, only when the page needs context the title can't give, never one that repeats it.
- **Don't litigate settled decisions.** Show the state, not the reasoning behind it.
- **Let design direct.** Colour, button style, icons and position say what's primary or
  dangerous. Don't repeat it in prose.
- **Labels:** verb plus object for buttons ("Add Material"), a plain noun for headings and tabs.
  Keep the specific meaning: "Past Notes", not "Notes".
- **No examples left over from the brainstorm** (named people, specific chores, dates) in copy or
  hints. A generic sample placeholder is fine.
- **Confirms and errors keep their substance:** what will change or be lost, whether it can be
  undone, what went wrong and what to do.

**Casing:** Title Case for buttons, labels, headings, tabs, menu items, column headers and badges.
Sentence case, with no trailing period on fragments, for descriptions, hints, tooltips, empty
states, confirms and errors. A project overrides this only with a recorded decision in its
CLAUDE.md or design doc. A codebase that happens to use sentence case has not decided anything.

**When it runs:** `ship` applies the skill to every screen a PR touches, not only the strings it
changed: wordiness builds up across a screen, and a string-by-string trim never sees it. A full
pass over the whole app is part of bringing a repo up to standard (migration Phase 5).

## Layout

- **Phone first.** Every screen works at 360px wide. Tap targets are at least 44px. Form fields
  are at least 16px on touch devices (iOS zooms otherwise; enforce it in CSS, see the token file).
  No `autoFocus` on a phone. Date and time fields drop their native appearance so iOS can't
  widen them past their container (also in the token file).
- **Phone checks in a browser suite.** Browser (Playwright) tests are opt-in. A project that opts
  in includes a phone check: its main screens load in WebKit at 360px, and the test fails when
  the page scrolls sideways (`scrollWidth > clientWidth`). Chromium alone misses Safari's
  layout differences, such as native date fields overflowing.
- **Installable.** Every web app has a manifest with `display: standalone`, `scope: "/"` and
  `start_url: "/"` (Next.js template: `app/manifest.ts`; a Vite SPA links a
  `manifest.webmanifest`). It is served without sign-in, because browsers fetch it without
  cookies. Without one, an app added to a home screen shows browser bars on every page except the
  one it was added from.
- **The important thing is high on the screen.** Don't hide critical information behind a tab.
- **Detail pages use two columns** on a wide screen: reference information that rarely changes in
  the narrow column (one third), the working content in the wide one (two thirds). One column on a
  phone, working content first.
- Information is grouped in cards with a header. The card's actions sit in its header on the
  right.
- **An empty card collapses** to its muted header with its add action, not a "None added" body. A
  full empty state (`EmptyState`) only when a page's only list is empty.
- **No count badges in card headers**, unless the count isn't visible in the card itself (it's
  collapsed or paginated).
- Lists: clicking a row opens it; no separate "view" link.
- **Names wrap, never truncate.** Anything a person typed (an item's or record's name, a label
  they gave) wraps onto further lines in lists, cards, tables and at 360px. No ellipsis, no
  `truncate` or `line-clamp`: a name is often what tells two similar rows apart, and an ellipsis
  hides exactly the part that differs. Give it `overflow-wrap: anywhere` (Tailwind 4.1+
  `wrap-anywhere`), so one long unbroken word breaks instead of scrolling the page sideways.
  `anywhere`, not `break-word`: only `anywhere` lets a table column or flex item shrink below the
  longest word. A flex or grid item also needs `min-w-0`, which otherwise won't shrink below its
  content. Text the
  app itself writes is kept short enough to fit, so it doesn't need truncating either.
- Reports and anything printable get a print stylesheet or a print route.

## Actions

- **The usual answer takes one tap.** Where most people make the same choice, that choice is the
  default or the primary button. Rarer options sit behind a disclosure ("More options", a menu),
  not beside it with equal weight. Trimming words doesn't fix a screen that treats every option
  as equally likely.
- **What a user creates, they can remove.** Delete, or archive with a delete in the archive.
  Revoking, withdrawing or closing something isn't removing it, because the row stays in the list.
  Where a hard delete would reach further than the record (cascades, history other records
  point to), a soft delete is fine, or the user reassigns the linked records first.
- **At most one primary (accent-filled) button per screen**, for the thing the page is for. A card
  in a list never has one. Every other button with words is secondary.
- **One shape per verb** across the app: edit is always the pencil, delete always the trash, and
  so on. Icon-only buttons carry their label as a tooltip and `aria-label`.
- **Detail pages load read-only.** An edit button reveals an inline form in place. A dedicated edit
  page only when the form is too complex for inline.
- **Creating stays on the page**, rather than navigating away and back: an inline form in the card
  or a modal, whichever suits the app. Be consistent within an app.
- **Destructive actions confirm inline, in two steps:** the button is replaced in place by "Delete?"
  with Confirm and Cancel. Never the browser's `confirm()`. A modal confirm is only for a delete
  that cascades to other records, and it says what else goes.
- Forms keep what was typed when the server refuses.

## Tokens

Components use these names, never raw palette classes (`bg-white`, `text-gray-500`). Each app sets
the values in its global stylesheet (Next.js template: `templates/nextjs-app/app/globals.css`).
An app built on shadcn/ui renames its tokens to these, `components/ui` included (Phase 5), and
edits any component added later with `shadcn add` to these names in the same PR. Map by meaning,
not by name: shadcn's `background` is `page`, `foreground` is `ink`, `muted-foreground` is
`ink-3`, `border`/`input` are `line`, `primary` is `accent`, `destructive` is `danger`, and its
`accent` (a hover tint) and `muted` are usually `sunk`. `card` keeps its name and meaning, and
`popover` becomes `card`. Map `secondary` and `ring` by how the app uses them.

| Token | Use |
|---|---|
| `page` | Page background |
| `card` | Card and panel surface |
| `sunk` | Inset surfaces: wells, table stripes, input backgrounds |
| `line` | Borders and dividers |
| `ink`, `ink-2`, `ink-3` | Text: primary, secondary, muted |
| `accent`, `accent-ink`, `accent-soft` | Primary action fill, text on it, tinted background |
| `ok`, `ok-ink`, `ok-soft` | Done, success |
| `warn`, `warn-ink`, `warn-soft` | Needs attention, in progress |
| `danger`, `danger-ink`, `danger-soft` | Destructive, failed, overdue |
| `radius-card`, `radius-control` | Corner radii |

The `-ink` tokens are text on the solid fill (`text-danger-ink` on `bg-danger`, as `accent-ink`
is on `accent`), for a destructive button or a solid badge. A status badge is usually the soft
pair: `ok` text on `ok-soft`.

Status colours come from one map in the app (the kit's `StatusBadge`). Don't invent a status
colour inline.

**App tokens.** An app may add a colour token for something the shared set can't say, such as a
brand colour on a badge. Name it for what it means, set it in both themes, record it in the
app's `docs/DECISIONS.md`, and add every text pair it's part of to the contrast check. It never
becomes a second status colour or a stand-in for a shared token.

**No alpha under text.** A fill that carries text is a solid token, in every state. Hover and
pressed states move to another solid token (or add a ring or underline), not `bg-accent/80`: the
contrast check measures token pairs, so a translucent fill over whatever lies beneath goes
unchecked. Alpha is fine on fills with no text on them: overlays, scrims, decorative tints.

**Contrast:** every text/background token pair meets WCAG AA (4.5:1 for body text) in both
themes, app tokens included, checked in CI over the token file: a `check:contrast` script, or a test inside `test`
(either is fine, as long as CI runs it).

## Dark mode

Required. The app follows the system setting by default and offers a light/dark/system toggle in
settings or the user menu. The choice is stored in `localStorage` (the one per-user
preference that belongs there rather than in the database: it must apply before first paint,
with no request, and may reasonably differ per device) and applied by a script in `<head>`
before first paint, so the page never flashes the wrong theme. Inline is simplest; an app with a
strict Content-Security-Policy uses a render-blocking external `<script src>` (not `defer`,
`async` or a module) or allows the inline one by its CSP hash. Dark values are a
second set of the same tokens, so a component written with tokens needs no `dark:` classes. Check
new screens in both themes and at phone width.

## Icons and fonts

One icon set per app, used consistently; no emoji as icons. System fonts unless the app's identity
needs a webfont; load at most two families.
