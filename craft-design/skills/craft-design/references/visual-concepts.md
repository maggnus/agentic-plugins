# Visual concept → editable artifact

Use an image as a composition proposal, then implement it in the requested editable
format. This is an optional design method, not an image service bundled with the
plugin. It can help a new poster, page or product screen when visual direction is
open. A focused edit or a screen already determined by product components usually
goes directly to implementation. Follow the user's chosen method and budget.
For open styling, use the proposal after establishing content and constraints but
before locking new fonts, palette and layout. Its useful decisions become the
normal design spec; existing brand decisions remain fixed throughout.

## Choose from actual capabilities

The authoring model, image generator and image viewer are separate capabilities.
Check the tools exposed in this session, discovering relevant tools when supported.
Do not infer availability or quality from the model name, subscription or the fact
that the client is Codex or Claude Code. A screenshot renderer, image search and an
image generator do different jobs. An image file path or successful tool call alone
does not mean the author can see its pixels.

| Available input and capabilities | Path |
| --- | --- |
| The requested change is already determined by existing components or the user wants code-only work | Implement directly, preserving the established system. |
| A suitable supplied or project image; the author can view it | Inspect and implement from that reference. Do not generate a replacement merely to enter this mode. |
| No suitable image; an authorized generator and visual inspection are available; composition is open | Generate one proposal, inspect it, then translate it into editable content. |
| No usable generator, a quota/error, or an unsuitable proposal | Continue directly from the brief and visual contract, reusing any legitimate assets. Mention the fallback briefly when relevant. |
| Image generation exists, but no visual inspection is available | Use direct implementation for an editable task. Do not generate a proposal that cannot be inspected or claim visual fidelity. |

Use the host's supported image tool and its instructions; the generator need not
be the authoring model. A connected generator can supply an image to a model that
only authors code and reads images. The same author may do both stages: this mode
does not require another agent. A separate visual reader or builder is an option
only when delegation is already authorized and the recipient can actually receive
the image; never assume capabilities transfer between agents.

Do not invent tool names, add a provider, install a service, obtain credentials or
switch to a separately billed API to keep an optional mode alive. Follow existing
host permissions and any explicit user authorization. If the user specifically
requires generation, exact reference matching or a raster deliverable and the
needed capability is missing, state that limitation and ask only for the missing
choice/input; do not silently replace the requested result. A model without visual
input may implement a supplied written specification, but that is not visual
reference verification. Keep any unperformed visual checks explicit.

## Produce and assess the proposal

Pass the brief's content, audience, target size/aspect ratio, principal task and
locked brand constraints to the generator. Preserve open choices instead of
imposing a default palette or layout. Ask for a flat view of the artifact itself,
without a device mockup or perspective. For related screens, start with the key
composition and reuse its system; generate additional states only when they resolve
a real design question. Keep the exact prompt and tool/provider identity with the
saved concept, without secrets. Do not assert an underlying model that the tool
does not disclose. Reserve time for implementation and final verification.

The brief remains authoritative for facts, labels, ordering and states. Give the
generator important copy and data, but do not treat its rendered text as a new data
source. Preserve genuine supplied assets and factual sourcing: a generated product,
venue, person or logo cannot become evidence about a real subject. Mark a proposal
as such when presenting it. Do not publish the proposal as the verified result.

View the proposal before implementation. Judge it by the artifact's job:

- Is the main reading or decision path clear? Can mandatory content fit at the
  intended scale, rather than depending on tiny text or decorative empty panels?
- Do composition, typography, density and emphasis work together and respect the
  actual brand/components? Generated decoration does not override the visual contract.
- Which useful visual decisions should carry into code, and which omissions,
  impossible controls or factual errors must be corrected?

Minor text errors can be corrected in implementation. Reject a proposal whose
layout or visual direction cannot support the task. A successful image call is not
a quality pass. If a focused correction is likely to help and fits the budget, make
one targeted revision; otherwise continue directly. Do not keep retrying, lower
the acceptance criteria or force a weak image into the result. A user-requested
exploration may have its own explicit number of candidates.

## Carry the design into editable content

Save the selected concept in the artifact directory, e.g. `concept.png`, and put a
short transfer note in the existing design spec or decisions file. Identify the
composition, hierarchy, type character, color roles and density to preserve, plus
specific corrections required by the brief. This is a handoff, not a new mandatory
schema or a second design system. If another authorized author continues, provide
the image itself, the original brief and these locked constraints together.

Build native text, controls, tables, charts and layout in HTML/CSS/SVG or the
requested editor's components. Bind the existing design-system tokens; an image
cannot redefine them. Where style was open, materialize the chosen visual decisions
as the normal theme. Choose real available fonts and verify their rendering instead
of inventing an exact font identity from pixels. Implement responsive behavior and
interaction states only to the scope requested.

Do not put a full-screen bitmap behind transparent controls or ship raster text as
an editable UI. Separate illustrations or textures may be reused when appropriate,
with host-supported image editing if needed; keep required text and data native.
Record reused regions/assets and their provenance. An interface may transfer the
composition without using any raster assets at all.

## Verify the implementation, not just the image

Use the ordinary token, render and content checks at the required sizes, then view
the final render. Compare it with both the brief and the selected concept: inspect
reading order, relative scale, density, color roles and the main focal relationship.
Preserve valuable visual decisions while correcting content, accessibility and
layout defects; matching an erroneous pixel is not acceptance. Check data-dependent
states through the existing scenario tools when the task needs them.

State the path actually used, any fallback, reused image assets and checks not
performed in the normal delivery note. Technical checks do not score taste, and
an automated preference is not a substitute for the owner's choice. Do not claim
the method is universally better across generators or authoring models.
