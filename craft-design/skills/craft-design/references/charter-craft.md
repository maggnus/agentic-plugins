# Design charter, part 2: craft

The second part of the charter; `charter.md` is the first. The guide delivers both whole, in bounded packets.

## Design craft

### Avoid the generic "AI gloss"

- purple gradient washes, gradients on every layer;
- emoji as functional icons;
- the "colored left bar + rounded card" callout;
- hover that greys or lightens text;
- hand-drawn SVG people or scenes;
- several solid buttons in one action group or panel footer (including `--danger` beside `--accent`), icons beside every heading;
- Inter, Roboto, Arial or Fraunces as display faces (fine for body) unless the
  visual contract names them;
- vanity metrics and filler copy that fits any business ("for your perfect
  day", "it all starts with the bean");
- default warm-beige + terracotta/ochre cliché (`#F4F1EA + #A8421E + #1A1814`) for craft, architectural, or consumer briefs unless explicitly requested by the brand: derive a fresh domain palette (e.g. cool architectural limestone + graphite steel + pine/cobalt/amber signal);
- designer-only or presenter-only control panels inside a product artifact;
- OS chrome drawn inside a screen: a status bar with a clock, signal and
  battery, a drawn keyboard, a fake browser bar. The screen keeps the safe-area
  insets as empty padding; a device frame around it is presentation only and
  must come off without breaking the screen (see `platforms.md`);
- an icon or a known component imitated from memory: a labeled placeholder reads
  better than a wrong copy.

Add no sections or features beyond what the brief and the chosen entry imply.

### Quality bar

The target is finished, shippable work, whatever the style. These are
principles; the figures in them are examples, not a house style to repeat.

- **Specific content.** Every block says something concrete about this subject:
  what, when, how much, for whom ("Roasted on Tuesdays and Fridays in the back
  room; the roast date is on every bag."). A line that would fit any business is
  rewritten. Lists carry real attributes (origin, roast date, weight, price).
  Each main section helps a decision (what to choose, how much, when, where, how
  to get it); a section that only sets a mood is cut or merged, and the art idea
  grows out of those facts, not beside them.
- **It works.** A prototype, not a picture: tabs switch content, toggles and
  steppers change state, forms validate with inline errors and end in a success
  state, unavailable options look and behave disabled, derived details update
  (open now, totals, the chosen slot summarized). Plain JS state in one script;
  no dead buttons, no `href="#"` primary actions.
- **Typographic voice.** A display face with character for this subject, set at
  a scale that decides the page, with a body face that stays quiet; size
  contrast carries the hierarchy, not boxes and shadows. On a landing or
  marketing page the first screen is a poster: its focal element is the name
  or one short line (a few words, not a sentence of facts) at poster scale,
  about 8× the body size or more at 1440, or the subject's object drawn as
  large; the facts and actions follow it in body size. Section titles keep a
  clear step below it.
- **Form follows content.** An assortment becomes dense rows, a menu becomes
  switchable lists, a visit becomes a booking or route; ruled lists and tables
  over card grids, cards only for genuinely separate objects. Sections differ
  in type, density and background, so the page has a rhythm.
- **Intrinsic responsiveness.** `repeat(auto-fit, minmax(min(100%, Npx), 1fr))`,
  `flex-wrap` and `clamp()` for type, spacing and media heights, so 390 and 1440
  both work with few media queries; flex and grid with `gap`, not margins on
  children; `text-wrap: balance` on headings and `pretty` on paragraphs. On `<= 768px`,
  stack in reading order: columns become rows, never leave a data table in a
  narrow horizontal scroll box clipping its right edge (reflow into stacked
  cards or rows), side-by-side actions go full width (a pair of
  compact actions such as Cancel / Save may share one row); the mobile header
  stays one compact row.
- **Grid proportions & Gestalt proximity.** Align blocks to shared vertical grid axes and vary column proportions and section structures across consecutive bands instead of stacking uniform card rows. Respect Gestalt proximity (`label→value < sibling gap < container padding < section rhythm`) and keep corner radii consistent with the chosen genre (or sharp `0px` where editorial/print discipline calls for it).
- **SVG & data micro-detail (Berlyne / Tufte) — no defensive simplification.** Never replace informative annotated diagrams, architectural plans, or rich charts with empty cards, bare numbers, or stripped-down rectangles merely to pass automated checks easily. Technical sections and plans require clear layer hierarchy (subtle coordinate grids, primary structural lines with `<pattern>` hatching where appropriate, thin dimension/leader lines with crisp labels on clean margins, `<rect>` pills, or `paint-order: stroke` halos). Data charts follow Tufte: hairline horizontal gridlines, target/tolerance bands where relevant, sufficient data density with subtle area fill, extremum callouts, and inline sparklines in comparison rows.
- **One memorable move** that belongs to this subject, not a repeated trick.

### Color and typography

- Take the palette from the visual contract, never from the host's chrome.
- Derive missing state colors with `oklch()` from the contract's tokens.
- **Surface organization (airy vs. layered).** Two approaches are equally valid: (a) **airy / structural** — whitespace, typographic scale, and hairline `1px solid var(--border)` rules without boxes or shadows; (b) **layered / tactile** — stepped surfaces (`--bg`, `--surface`, `--surface-2` with monotonic `oklch()` lightness) and subtle shadows where interactive hierarchy benefits. Inside `--surface`, keep nested charts/summaries/logs `transparent` with hairline dividers rather than nested grey boxes.
- **Action hierarchy.** At most ONE solid button per action group/footer (render `--danger` beside a primary CTA as quiet outlined `--danger` until confirmation). Use horizontal `flex-wrap` rows (`34–38px` only in dense desktop `>= 1024px`; `>= 44×44px` on touch `<= 768px`).
- **Figure-ground scarcity & conditional color.** By default, any composition rests on a quiet neutral canvas (70–90%) plus **ONE focal accent (`--accent`)** used sparingly. Do not invent `--accent-2` or status hues (`--danger`, `--warn`, `--success`) unless real data series or live system incidents require them. Treat dark contrast masses (`.on-dark`) as a rare dramatic device, never as an obligatory default.
- Near-neutrals stay neutral: keep chroma under `0.02` unless tint is intentional.
- Display and body faces differ; one family only for utilitarian or data-dense briefs. Never leave generic `Inter`, `Roboto`, or `Arial` as `--font-display` unless an external brand contract explicitly requires them.
- **Expressive typographic voice & optical calibration.** Choose a voice that fits the genre and medium — including delicate serifs for print, cultural, and editorial work, or crisp engineered grotesks for operational tools. Calibrate weights (`400–600`) and modular scale ratios (`1.200` for dense tools, `1.333–1.414` for editorial/brand pages) without shouting with `800/900` weights everywhere at once.
- A web font in the contract must really load: reachable `@font-face` or allowed Google Fonts `<link>` with needed weights and target script glyphs (e.g. Cyrillic for Russian) plus fallback stack. On 1:1 PNGs, confirm the display face rendered and verify legibility for the target medium and size.
- One decisive flourish per design; three is noise.

### Text and language

Set `<html lang>`. Follow the content language's typography; for Russian:
«ёлочки» („лапки“ inside), an em dash with spaces and a no-break space before it
(`слово&nbsp;— слово`), no-break spaces after one- and two-letter words and
between numbers and units (`5&nbsp;мин`, `350&nbsp;₽`), `ё` where it matters,
`hyphens: auto` for narrow columns. Russian runs 15–25 % longer than English:
size buttons and headlines for it.

### One action, one primary CTA

One primary-styled button per action on the page. A long page may repeat it once
at the end, never twice in one viewport. Other entry points are secondary, ghost
or text links, with different wording. A button group has at most one solid
primary. Three or more buttons for the same action is a failed delivery unless the
user asked for it.

### States and contrast

Define and verify foreground and background as a pair for hover, focus, active,
disabled. Contrast never drops below the default state: at least 4.5:1 for body
text, 3:1 for large text and icons. Hover moves the background ±0.06–0.12 in OKLch
L, or changes border, shadow or position; never fade the foreground toward
`--muted`. A solid button that inverts on hover swaps both colors in one rule.
Only disabled may lower contrast. Every focusable element has a visible
`:focus-visible` ring.

Build it accessible as drawn: a real `<button>` for actions and `<a href>` for
navigation, every form control with an accessible name (a `<label>`, or
`aria-label` on icon-only controls), `aria-hidden` on decorative SVG, headings
in order inside `header`, `nav`, `main` and `footer`; dialogs return focus on
close; tabs support full keyboard control (`role="tablist"`/`"tab"`/`"tabpanel"`,
`aria-selected`, `aria-controls`, `ArrowLeft`/`ArrowRight`, managed focus/scroll). Status is never carried by
hue alone: a word or a symbol carries it, a lightness step only supports it,
and red against green alone is never the signal. Read the parts of
`library/craft/accessibility-baseline.md` that apply to the artifact (forms,
dialogs, data tables, motion).

### Sizing

Touch targets (`button`, `a`, `input`, `select`, `textarea`) at least `44×44px` on mobile and touch widths (`<= 768px`); `34–38px` is allowed exclusively for dense desktop panels (`>= 1024px`). Screen text at least 12px and body copy at least
15px on a phone; print body text at least 12pt (`print-and-diagrams.md`); no
horizontal scroll on mobile, and no
block wider than its container; redesign for small screens instead of squeezing
the desktop layout.

### Layout integrity

Hard requirements:

- no accidental overlap;
- text fits its container, including table cells;
- no orphans (1–2 characters or a short word alone on the last line while the
  line above has room) in any language: fix the container and wrapping first,
  then size or spacing; never hide overflow;
- display type fits its column: reduce, wrap or widen, never `white-space: nowrap`
  into neighbours;
- charts use filled data encoding, not outlines alone.

### Text over images

Anchor badges and labels to one corner with equal inset, fully inside the image,
off faces and the main subject, on a solid or frosted background with a shadow.
If no corner is safe, put the text beside the image.

### Visual finish

The result must feel finished, not a grey wireframe (unless a wireframe was
asked for). Use meaningful imagery where products, places, people, food, artwork
or textures matter. Sourcing order:

1. Reuse user, project and brand assets that represent the subject correctly.
2. A named real referent (person, product, logo, cover, artwork, event, landmark,
   place) needs its correct real image, found with the host's authorized search
   or fetch tools and localized. Never generate, draw or substitute it.
3. A demo catalog of a public category (books, albums, films, gadgets) uses real,
   well-known items with their real images; do not invent them to avoid sourcing.
4. The client's own venue, team, food or product you have no photos of gets an
   art-directed placeholder, not stock: a block at the final ratio in the
   palette, composed from the concept (the subject's object drawn in outline,
   a texture or a typographic composition), never a flat or blurred fill,
   with a short caption that reads as a future
   photo ("photo to come: the room in the morning, window light"); never caption an
   illustration as a photo. A placeholder is never the largest visual of the
   page. Stock
   would pass a stranger's room off as the client's. Use real photos for these
   only when the user asks for them. Keep placeholders few and varied, never a
   grid of identical blurred blocks: where visitors choose by the picture
   (bouquets, dishes, products), give each item a visual made from the concept
   (a simple object illustration in the palette, a color or typographic
   composition of its real attributes), and put the shot list in the summary.
5. Generate with the host's own image tool when appropriate, only for the few
   surfaces that matter, never to bypass factual sourcing.
6. When licensing or privacy rules out every source, use a deliberate labeled
   placeholder and state the limitation in the summary.

For named referents and requested photos, search and download with
`scripts/images.mjs` (Wikimedia Commons, then
Openverse); it keeps only licenses that allow commercial use and modification
(CC0, public domain, CC BY, CC BY-SA), downsizes and records credits in
`img/CREDITS.md`. Use Unsplash or Pexels only from a known page URL. CC BY and
CC BY-SA need a visible credit ("Photo: author, CC BY-SA 4.0") near the image or
in the footer.

Every image is a local file under `img/` with a relative path, at most about
1600px wide; data URIs only for small assets (icons, textures under about 30 KB),
because inlined photos make the HTML too large to reread and edit. Read its
intrinsic size first; its box adopts that ratio via natural sizing, matching
`width`/`height` or `aspect-ratio`. Show the full frame (`object-fit: contain` or
natural flow); keep `cover` for deliberately croppable decoration. Do not lock both
axes on variable-ratio content; cap one axis with `max-height`/`max-width`
instead. Declare dimensions to avoid layout shift; accurate `alt` for meaningful
images, empty `alt` for decoration.

Build a full palette: primary, domain-relevant accent and state colors, with
product-scale controls.

## Technical contract

### Inspectable HTML

Add `data-craft-id="kebab-case-id"` to regions, headings, CTAs, controls and repeated
cards the user may point at; repeated cards get unique ids (`feature-card-speed`).
Decoration needs none. Inspection reports, preview overlays and revision discussions use these ids.

### Files

- descriptive filenames; a `-v2` copy before a major revision;
- about 1,000 lines per file at most;
- no `scrollIntoView`;
- copy every used image into the artifact's `img/`; keep required attribution.

### Inline React JSX

Exact versions: `react@18.3.1` and `react-dom@18.3.1` UMD development builds,
`@babel/standalone@7.29.0` from unpkg, `framer-motion@11.11.13/dist/framer-motion.js`.
Motion hooks are on `window.Motion` (`dist/motion.js` lacks them). Babel scopes are
isolated: share values with `Object.assign(window, {...})`. No `type="module"`, no
bare `const styles`.

## Conduct

- Explain design decisions in prose; do not narrate tool calls.
- Write user-visible content in the user's language.
- Do not recreate copyrighted designs (another company's distinctive UI patterns
  or branded visual language). Sourcing a correctly attributed real image is not
  covered by this rule; never substitute a look-alike to work around it.

End of charter part 2.
