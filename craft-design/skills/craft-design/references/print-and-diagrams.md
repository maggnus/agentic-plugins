# Paper, PDF and diagrams

Read for documents meant to be printed or saved as PDF (letters, invoices,
reports, resumes, one-pagers, flyers, posters) and for diagrams (flows,
architecture, org charts). The charter still applies; the Pages rules replace
its screen assumptions, the Diagrams rules add to them.

## Pages

- Fixed page boxes at 96 dpi: Letter 816×1056px, A4 794×1123px, a poster at its
  real size. Each page is one `.page` element, `box-sizing: border-box`, with
  `break-after: page`; margins live inside it (40px on a one-page piece, 64–72px
  on a document read at length) and hold nothing but a running header or a page
  number. A long document (a report, a contract) may instead flow as one column
  of the page width and let the browser paginate: then keep headings with their
  first paragraph (`break-after: avoid`) and let a table repeat its `<thead>`
  on every page.
- `@page { size: A4; margin: 0 }` (or `letter`) and an `@media print` block that
  drops screen chrome: preview bars, shadows, backgrounds a printer will not
  reproduce. `print-color-adjust: exact` on the elements whose fill carries
  meaning (a table header band, a brand bar), otherwise the printer may drop it.
- Type in points: body at least 12pt (16px), captions and footnotes no smaller
  than 9pt; hierarchy by size and weight, not by color. Dark ink on light paper
  by default; the contract's colors are welcome for accents and bands, and
  secondary text is grey no lighter than `#767676` on white.
- Tables: rules of at least 1px, a header row recognizable without color,
  numbers right-aligned in tabular figures, rows and figures with their captions
  kept together (`break-inside: avoid`).
- A flyer or poster passes a three-second read from a distance: what, when,
  where, in one dominant element; the rest supports it.
- No hover states and no action that only a link can perform: print the URL or
  the contact where it matters.
- Verification: `shot.mjs` renders screen styles only, so it checks the layout
  and the type at the page width, not pagination or print colors. For those,
  open the file in a browser and use its print preview or Save as PDF (page
  breaks, the running header, the fills). Say in the reply which of the two you
  checked.

## Diagrams

Diagrams are screen artifacts: the theme and the screen rules apply, and
`shot.mjs --full` at the diagram's own width verifies them (no clipped labels,
no connector crossing a card). The distances below are starting points, not
limits.

- Build with HTML and CSS (grid or absolute positions) or inline SVG; text stays
  selectable, never an image of text.
- Size every card to the longest label, then make the cards of one row the same
  size; a label may wrap to two lines rather than widen the whole row. About
  48px between cards so connectors have room; a label on a connector sits in a
  clear box about 8px from any line.
- Connectors are straight or orthogonal with one arrowhead style; a loop runs
  around the outside, never through other cards; a decision is a diamond
  (`clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%)`) with inner padding
  of about a quarter of its width so the question stays inside the shape, and
  every branch labelled.
- One reading direction (left to right or top to bottom), levels aligned on a
  grid, one accent for the main path; status by shape or label, not hue alone.
