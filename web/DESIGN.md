# Schub design system

Direction A ("Document"): calm and CV-like. No cards: structure comes from full-width rules and a fixed label
column. One indigo accent, neutral everything else.

Everything a page looks like comes from two places:

- **Tokens** in `src/app/globals.css`: colors, type, spacing, radii, widths and named layouts.
- **Components** in `src/components/ui`, imported from `@/components/ui`.

Pages use only these. `npx eslint src` fails on anything else (see [Enforcement](#enforcement)). To see every
component in every state, light and dark side by side, run the app and open `/design`. It exists in development
only and nothing links to it.

## Tokens

### Color

Each color is a `light-dark(light, dark)` pair. It follows the visitor's system theme, or `scheme-only-light` /
`scheme-only-dark` on a part of a page. Use them as Tailwind colors (`text-ink2`, `bg-chip`, `border-line2`, ...).

| Token | Use |
|---|---|
| `background` | The page |
| `foreground` | Headings and body text |
| `ink2` | Secondary text: headlines, details, labels in a form group |
| `muted` | The quietest text: counts, hints, "(optional)" |
| `border` | Light rules between rows |
| `line2` | Section rules, input and button outlines |
| `chip` | Chip and avatar fill, hover on quiet buttons |
| `accent-hover`, `danger-hover` | A filled button under the pointer |
| `surface` | A layer just off the page: secondary buttons, the search button |
| `accent`, `accent-soft`, `on-accent` | The one accent: primary buttons, links, the current tab, picked chips. Text on it is `on-accent` |
| `open` | The ring around people open to a team |
| `danger` | Errors and destructive actions |
| `scrim` | Behind modals |
| `qr-ink`, `qr-paper` | The QR code, black on white in both themes |

There are no palette colors (`zinc-500`, `white`, `red-600`). A new color is a new token, light and dark.

### Type

Instrument Sans (`font-sans`) for everything. IBM Plex Mono (`font-mono`) for skill chips, periods and small
uppercase labels. Eight sizes plus one for the landing page. Line height comes with each; letter spacing with
those from `xl` up.

| Class | Size | Use |
|---|---|---|
| `text-display` | 56px | The landing page's heading |
| `text-3xl` | 36px | Page titles from sm up |
| `text-2xl` | 28px | Page titles on phones |
| `text-xl` | 20px | Modal titles, timeline titles from sm up |
| `text-lg` | 17px | Row titles, headlines |
| `text-base` | 15px | Body text, inputs |
| `text-sm` | 14px | Buttons, details, labels |
| `text-meta` | 13px | Hints, errors under a field, small buttons |
| `text-xs` | 12px | Mono labels and chips, avatar initials |

`leading-tight` / `snug` / `normal` / `relaxed` and `tracking-tighter` / `tight` / `snug` / `wide` exist for the
rare place that needs them. Weights: `font-normal`, `font-medium`, `font-semibold`.

### Spacing

Padding, margin and gap use these steps only: `0.5 1 1.5 2 3 4 6 8` (2 to 32px) for components, `12 16 20` (48,
64, 80px) for page layout. Three named ones:

- `bar`: room under a phone page for a bar pinned to the bottom (`pb-bar`).
- `safe`: the phone's home-indicator inset.
- `safe-4`: the same, but at least 16px.

Element sizes (`h-*`, `w-*`) can use any quarter step (`h-4.5`, `h-15`).

### Radius, widths, shadows

- **Radius:** `rounded-sm` (4px) for chips, `rounded-md` (6px) for controls and buttons, `rounded-lg` (12px) for
  modals and sheets, `rounded-full` for avatars and dots.
- **Widths** (`max-w-*`):

  | Token | Width | Use |
  |---|---|---|
  | `note` | 224px | A short line under a button |
  | `search` | 320px | |
  | `narrow` | 360px | Sign-in buttons, the share card |
  | `phone` | 480px | |
  | `measure` | 520px | A paragraph beside a label column |
  | `form` | 560px | |
  | `prose` | 600px | |
  | `dialog` | 680px | |
  | `column` | 752px | A page's single column |
  | `statement` | 820px | |
  | `page` | 1176px | |
  | `wide` | 1440px | |
- **Shadows:**
  - `shadow-modal`: modals
  - `shadow-frame`: the landing page's sample frames
  - `shadow-tab`: the line under the current tab
  - `shadow-float`: something floating over the page (the hover card)
- **Aspect:** `aspect-photo` (3:2) for project images.

### Named layouts

Grid columns are named in `globals.css` instead of written in brackets:

| Class | Columns | Use |
|---|---|---|
| `grid-cols-label` | 152px, rest | A section's title column (Section) |
| `grid-cols-label-edit` | 152px, rest, 34px | The same with the owner's pencil |
| `grid-cols-label-sm` | 120px, rest | A form group's label |
| `grid-cols-media` | auto, rest | An avatar or photo, then text |
| `grid-cols-media-actions` | auto, rest, auto | The same, plus buttons |
| `grid-cols-fill-auto` | rest, auto | Text, then something at its own width |
| `grid-cols-fill-short` | rest, 7rem | A field and a short one (a year) |
| `grid-cols-sidebar` | rest, 296px | Profile: main column and side column |
| `grid-cols-hero`, `-hero-wide` | rest, 520 / 580px | The landing page's hero |
| `grid-cols-opportunity` | five columns | The opportunity list from lg up |
| `grid-cols-share` | 220px, rest | The share dialog |

There are also `grid-rows-auto-fill` (a row at its own height, then the rest), `h-story-sheet` / `h-story-page` (the
story image), `align-icon` (an inline icon on the text baseline) and `max-h-inherit`.

## Motion

CSS transitions only, no animation library. Hover and press take 120ms or less, opening 150ms, closing 100ms.
`ease-spring` is the release of a press. Under `prefers-reduced-motion` everything changes at once and nothing moves
(one rule at the end of `globals.css`; a spinner fades in and out instead of turning). The components do this themselves; pages add nothing.

| Class | Use |
|---|---|
| `pressable` | Hover color changes, and sinking when pressed (every button) |
| `motion-dialog` | `Modal`: sheet slides up, box fades and scales in |
| `motion-popover` | The `Combobox` popup |
| `motion-menu` | A `<details>` dropdown |
| `motion-in` | A list that appears under a field |
| `motion-toast` | The toast |
| `skeleton`, `animate-pop`, `animate-spin` | Loading blocks, counts, spinners |

## Components

| Component | Use it for |
|---|---|
| `PageHeader` | The top of every page: title, a line about it, the page's action. `stack` for detail pages (the action goes under the title on phones), `ruled` for forms, `eyebrow` for a MonoLabel above |
| `Section` | A titled section with the title in the label column (profile, team page, settings). `count`, `add` (+ Add under the title), `owner` + `edit` (the pencil), `quiet` for an empty one on your own page |
| `SectionTitle` | A full-width title over a ruled list, on pages without a label column |
| `Row` | One item of a ruled list: a team, a person, an application. `media` (avatar column), `actions` (right side), `stack` (actions under the content on phones), `center`, `flush` (no space above the first), `spacious`, `href` (the whole row links there, no rules, an accent highlight with a bar that follows the pointer or the keyboard, and an Enter hint from sm up. Mark the title link `data-row-main`; `linkedRowClass` and `RowMark` for rows drawn by hand) |
| `Timeline`, `TimelineEntry` | Experience: a line with a dot per entry, `current` fills the dot |
| `EmptyState` | Nothing to show: a Lucide `icon`, one sentence and one `action`, between two rules. Never just gray text |
| `SubmitButton` | The submit button of a server action's form: a spinner while it's sent, at the same width. Never a bare `<button>` there |
| `ActionButton`, `AnswerButtons`, `useOptimisticAction` | Connect, Invite, Accept and Decline: a check at once, then the new state; on failure the button returns with the reason |
| `ToastProvider`, `useToast` | A short message that slides in at the bottom |
| `Skeleton`, `PageSkeleton` | A page loading, in a route's `loading.tsx` |
| `Pop` | A count that pops in when it changes |
| `TabUnderline` | The sliding line under hand-built tabs (the top bar); `Tabs` has it already |
| `Icon` | Every icon: a Lucide one, 16px, 1.5 stroke |
| `HoverCard` | A preview beside a link, on mouse hover or keyboard focus. People use `PersonLink` (app/(app)/person-link.tsx) for every name or avatar that goes to a profile |
| `CommandPalette` | The ⌘K search |
| `Kbd` | A key shown on what it presses. Only for shortcuts that exist; no single-letter ones |
| `RowKeys` | Mounted once: the linked rows' highlight and Up / Down |
| `TeamSlots` | A team as slots, filled and open. Two variants being picked on `/design`; not on a page yet |
| `Tabs` | Underlined tabs, one route each. `count`, `alert` (a count waiting on you, in the accent), `scroll` when they may not fit on a phone |
| `Button`, `ButtonLink`, `ButtonAnchor`, `buttonClass` | See below. `ButtonLink` for a page in the app, `ButtonAnchor` for another site (new tab), `buttonClass()` for something else that should look like a button |
| `IconButton` | A square 34px button with an icon: the pencil, Close, Share in a row. Always give it a `label` |
| `Field` | Label, control, hint and error together, tied by `id`. `required` adds an accent star, `optional` adds "(optional)" or your words |
| `FieldLabel` | A label on its own (`as="legend"` in a fieldset). `quiet` for fields grouped under a label of their own (the profile's edit dialogs) |
| `Input`, `Textarea` | Form controls: 44px on phones, 40px from sm up. `small` (36px) in filter bars, `search` (40px, smaller text) over a list, `large` (44px everywhere) beside `lg` buttons |
| `Combobox` | Every dropdown, never a native `<select>`. A popup from sm up, a bottom sheet on phones; a search field over 8 options. `label` always (it names the list), plus `labelled` when a `FieldLabel` points at `id`. `name` posts it with a form; `ref` focuses it or sets a validity message. Options take a `hint` (a count) and a `group`. `ComboboxPanel` is its open list, for `/design` |
| `Switch` | An on/off setting posted as a checkbox |
| `ErrorText` | An error. `under` right under a field, `size="sm"` for the whole form, `as="span"` in a row of buttons |
| `Chip`, `ChipList` | Skills. `sm` (mono, the default) under an entry; `md` with where the skill is used |
| `ToggleChip` | A picked-or-not button: role pickers, filters |
| `CheckChip` | The same as a checkbox, for forms that post the picked values |
| `MonoLabel` | A small uppercase mono label: an event's type, a status, a placement. `tone` ink2, muted or accent |
| `Avatar` | A photo or initials. `size` xs to 2xl and `profile`; `ring` "open" (green) or "connection" (accent); `stacked` for overlapping rows; `square` for the profile photo |
| `Modal` | A dialog: a bottom sheet on phones, a box from sm up. Add `ModalGrabber` and `ModalHeader`. `width` "dialog" or "measure", `tall` for long forms with pinned buttons |

### Buttons

| Variant | Use |
|---|---|
| `primary` | The one main action in a place, filled with the accent |
| `secondary` | Every other action, outlined |
| `accent` | Reaching out to someone (Invite, Connect in suggestions) and the owner's "+ Add" in an empty section, outlined in the accent |
| `quiet` | Small or undoing actions in a row: Leave, Withdraw, Cancel |
| `danger` | Only to confirm something that can't be undone |
| `bare` | No look of its own (a menu item, a text link); still presses and loads |

`pending` shows a spinner over the faded label; `done` a check. `Modal` and `Combobox` fade out before their content
goes.

Sizes:

| Size | Height | Use |
|---|---|---|
| `xs` | 30px | Small text, beside names in a side column |
| `sm` | 36px | Rows and bars |
| `md` | 38px | Forms and headers; the default |
| `touch` | 44px on phones, `md` from sm up | |
| `lg` | 44px everywhere, larger text | Full-width buttons that are the point of a screen |

Two more options: `full` takes the whole width on phones, and `showFrom="sm"` hides the button on phones (they
get another way in).

## Adding a component

1. Check this file and `/design` first: most new screens need a variant of something here, not a new thing.
2. Add it to `src/components/ui`, one component per file, with a comment saying what it's for. Build it from the
   tokens. Bracket values are allowed inside `ui/` but keep them rare, and prefer adding a token.
3. Export it from `src/components/ui/index.ts`.
4. Add it to `/design` (`src/app/design/sheet.tsx`) in every state it has.
5. Add a row to the table above.
6. Move any page that drew the same thing by hand onto it.
7. Run `npm run test:visual`. If screenshots changed on purpose, run `npm run test:visual:update` and look at
   every new image before committing it.

A new token goes in `globals.css`, in the block it belongs to. A color needs both a light and a dark value. A
spacing step also goes in `STEPS` in `eslint-rules/design-tokens.mjs`, and a type size in `SIZES` there.

## Enforcement

- **Lint:** `eslint-rules/design-tokens.mjs`, run by `npx eslint src`, fails outside `src/components/ui` on:
  - bracket values (`text-[13px]`, `mt-[5px]`, `grid-cols-[...]`); arbitrary variants like `has-[:checked]:` are fine
  - palette colors (`zinc-500`, `white`)
  - spacing off the scale (`mt-5`)
  - type sizes that don't exist (`text-4xl`)
  - inline `style=`

  `src/lib/story-image.tsx` is exempt: next/og only takes inline styles. The rule has its own unit tests.
- **Screenshots:**
  - What's covered: `tests/visual` takes the landing page, a profile as its owner and as a visitor, Find teams,
    a team page, opportunities and People. Each at 1440 and 390 wide, light and dark.
  - How it runs: `npm run test:visual` resets the local database to the seed and serves the app, both with the
    same fixed day (`SEED_TODAY` and `FIXED_TODAY` in `scripts/visual.sh`), and compares against
    `tests/visual/__screenshots__`. It runs in the Playwright Docker image,
    so fonts render the same on every machine and in CI.
  - After an intended change: `npm run test:visual:update`, then review the images.
- **CI:** `.github/workflows/ci.yml` runs lint, types, unit, database, end-to-end and screenshot tests on every
  push and pull request.
