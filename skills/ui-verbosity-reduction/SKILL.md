---
name: ui-verbosity-reduction
description: Trim verbose UI copy in a codebase, such as button labels, headings, tabs, helper text, empty states, tooltips, confirm dialogs and onboarding blurbs. Use whenever the user asks to make a UI, screen, page or component less verbose, tighter, less wordy or cleaner, to cut or reduce the copy, or to clean up AI-generated UI text, even if they don't name this skill. Also use when building UI after the user has asked for concise copy.
---

# UI Verbosity Reduction

Agent-built UIs tend to over-explain. They narrate what the screen is doing, justify design decisions the user already made, and carry over examples from the brainstorming session that produced them. On a space-constrained screen every extra word costs attention. The goal is copy that a first-time user can act on at a glance.

## The test

For each string, ask: **would someone who has never seen this screen still know what to do if this were shorter?** If yes, shorten it. If no, it stays (or shrinks only as far as the meaning survives).

Shorter must not mean vaguer. A rewrite that drops the specific thing a label refers to has failed the test, even if it is shorter.

## Rules

**1. Don't narrate the UI.** The user can see the screen. Text like "Below you'll find your list of projects" or "Click the button to save your changes" restates what the layout already shows. Cut it. The same goes for text that points at a control sitting right next to it ("'Start this year's' makes the first").

**2. Don't litigate settled decisions.** Agent-written copy often explains *why* a feature works the way it does ("We don't ask again because you already answered"). The user doesn't need the reasoning, only the state. "Don't ask, already answered" → "Answered".

**3. Fewest words that carry the meaning.** Articles ("the", "a", "an"), filler ("simply", "just", "please", "you can"), and possessives ("your") are usually removable on a label. "Send the email" → "Send Email".

**4. Let design do the directing.** Color, button style, icons, position and grouping already tell the user what's primary, what's dangerous and what's optional. Prose that duplicates them ("This is the main action", "Optional:", "Warning:" next to a red button) can go. Work within the project's existing components and styles: if replacing prose with a design cue needs a style or component the codebase already has, use it; if it would need something new, leave the text short and note the idea in the summary instead of inventing styles.

**5. Labels are concise, direct and action-oriented.** Buttons start with a verb and name the object ("Add Material", "Start Project"). Headings and tabs name the thing ("Instructions", not "How we do it"). Avoid cute or conversational phrasing in labels.

**6. Keep the specific meaning.** Don't rename something to a broader word than what it holds. A section of notes from past rounds is "Past Notes", not "Notes"; "Past Projects" is not "Projects" if current ones live elsewhere. A prompt that asks the user to choose ("Where?", "In a quote?" as an empty dropdown option) keeps its prompting form ("Choose Place", "Which Quote?"), because a bare noun reads like a value that's already selected.

**7. Remove brainstorm-specific examples.** When a UI was designed by walking through real use cases, those cases leak into the copy: "pine straw every spring", a named person, a specific date or amount. They read as oddly specific to everyone else and go stale. Remove them from descriptions and hints. In placeholders, a sample value genuinely helps the user see what belongs in the field, so replace a scenario-specific placeholder with a short generic one ("Back yard pine straw" → "Spring mulching", or "e.g. Gutter cleaning") rather than leaving the field blank. Placeholders that show a format (a date pattern, "8", "roll") are fine as they are.

## Casing

Default:

- **Title Case** for buttons, labels, headings, tabs, menu items, column headers, badges and pills: "Send Email", "Recurring Projects", "Not in Series".
- **Sentence case** for descriptions, helper text, hints, tooltips, empty-state messages, confirm and error text, and anything else that reads as a phrase or sentence. Drop the trailing period on fragments.

Override the default only when the project has an *explicit, recorded* casing decision, such as a style guide, a design-system doc, or a line in CLAUDE.md/README/CONTRIBUTING. Look for one before editing. An existing codebase that just happens to use sentence case is not a decision; that's usually agent output nobody chose, so apply the default.

Because the default may differ from what the rest of the app currently uses, casing changes inside a narrow scope create mismatches (a "New Series" link that opens a page titled "New series"). Fix the immediate counterparts of what you changed (the page title a link opens, the button a confirm belongs to) and list any remaining sentence-case labels elsewhere in the app as a follow-up, offering an app-wide casing pass.

## Handle with care

These keep enough words to stay unambiguous. Tighten them, but don't strip meaning:

- **Destructive and consequential confirmations.** The user must know exactly what will change or be lost, and whether it can be undone. "Are you sure you want to permanently delete this project and all its materials? This can't be undone." → "Delete project and all its materials? This can't be undone." Not "Delete?" Keep any interpolated list of what will change.
- **Error messages.** Keep what went wrong and what to do about it. "Oops! Something went wrong while we were trying to save your project. Please try again." → "Couldn't save project. Try again."

## Examples

| Before | After | Why |
|---|---|---|
| Send the email | Send Email | Article removed, Title Case |
| Don't ask, already answered | Answered | State, not reasoning |
| A series is a job you do again and again, pine straw every spring. It keeps the checklist and materials to start from next time. | Recurring projects that provide a template with materials and other details | Narration and brainstorm example removed |
| How we do it | Instructions | Direct noun for a heading |
| Click here to add a new material to your list | Add Material | Narration and filler removed, verb + object |
| From past years | Past Notes | Shorter, still says what's in it (not "Notes") |

## Workflow

1. **Check for a recorded casing decision** (see Casing).
2. **Find the user-facing strings** in the files in scope: text in markup/JSX/templates, attributes such as `placeholder`, `title`, `aria-label`, `alt`, `label`, `hint`, props passed to components that render text, `confirm()`/`alert()` messages, page metadata titles, and translation/i18n files if the project uses them. Code comments and docs are out of scope, except a comment that quotes a string you renamed.
3. **Edit in place.** Change only the text. Never rename translation keys, IDs, variables, test selectors or anything logic depends on. If tests find elements by a string you changed, update the tests.
4. **Keep renamed terms consistent across the app.** When you rename a term rather than just trimming it ("How we do it" → "Instructions", "how-to" → "instructions"), search the whole codebase for it, including user-facing strings in server code and error messages. Update the other occurrences that are the same concept so the app doesn't call one thing by two names; if one is clearly outside what the user asked to touch, list it instead.
5. **Watch for knock-on text.** If you shorten a heading, check whether nearby helper text now repeats it.
6. **Summarize** after editing, grouped by file, as a short before → after list. Then a short list of anything deliberately left long (confirms, errors), anything outside scope that still needs the same change (renamed terms, casing), and any design-cue ideas you didn't implement. Don't explain each change; the before/after speaks for itself.
