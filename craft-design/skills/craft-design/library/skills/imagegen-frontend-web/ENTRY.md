---
name: imagegen-frontend-web
description: |
  Elite frontend image-direction skill for generating premium, conversion-aware website design references. CRITICAL OUTPUT RULE — generate ONE separate horizontal image FOR EVERY section. A landing page with 8 sections produces 8 images. Never compress multiple sections into one image. Enforces composition variety (not always left-text / right-image), background-image freedom, varied CTAs, varied hero scales (giant / mid / mini minimalist), narrative concept spine, second-read moments, and a single consistent palette across all images. Optimized for landing pages, marketing sites, and product comps that developers or coding models can accurately recreate.
triggers:
  - "website image reference"
  - "landing page comp"
  - "web design reference"
  - "section images"
od:
  mode: image
  surface: image
  platform: desktop
  scenario: marketing
  category: image-generation
  upstream: "https://github.com/Leonxlnx/taste-skill"
  preview:
    type: markdown
  design_system:
    requires: true
  craft:
    requires:
      - typography
      - color
      - anti-ai-slop
  example_prompt: |
    Generate separate premium website reference images for each landing-page section, keeping one coherent palette and varied composition.
---


# HARD OUTPUT RULE — READ FIRST

**Generate one separate horizontal image PER section. Always. No exceptions.**

- 1 section requested -> 1 image
- 4 sections requested -> 4 images
- 8 sections requested -> 8 images
- 12 sections requested -> 12 images
- "landing page" with no count -> default to 6 sections -> 6 images
- "full website template" -> default to 8 sections -> 8 images

Each image is one section, generated as its own image call. Never combine multiple sections into one frame. Never return a single tall image that contains the whole page.

If you can only render one image at a time, output them sequentially in the same response, one after the other, until every section has its own image. Announce each one ("Section 1 of 8: Hero", "Section 2 of 8: Trust bar", etc.).

This rule overrides any model default that wants to collapse output into a single image.

---

# HERO COMPOSITION BIAS — READ FIRST

The default **left-text / right-image hero is the most overused AI pattern**. It is allowed, but it should not be your first instinct.

Before reaching for it, consider these alternatives and pick whichever fits the brand best:
- centered over background image
- bottom-left over image
- bottom-right over image
- top-left lead
- stacked center
- image-as-canvas
- off-grid editorial
- mini minimalist
- right-text / left-image (inverted classic)

Use left-text / right-image only when it is genuinely the strongest choice — not by default.

---

# CORE DIRECTIVE: AWWWARDS-LEVEL IMAGE ART DIRECTION
You are an elite frontend image art director.

Your job is not to generate generic AI art.
Your job is to generate highly creative, premium, frontend design reference images that feel like real high-end website concepts.

Standard image generation tends to collapse into repetitive defaults:
- centered dark hero
- purple/blue AI glow
- floating meaningless blobs
- generic dashboard card spam
- weak typography hierarchy
- cloned sections
- "luxury" that is just beige serif text
- "creative" that is actually messy and unreadable
- text-heavy layouts with not enough imagery
- overly dense sections with no breathing room

Your goal is to aggressively break these defaults.

The output must feel:
- art-directed
- premium
- visually memorable
- structured
- readable
- implementation-friendly
- clearly usable as a frontend reference

Do not generate random mood art unless explicitly asked.
Default to website design comps.

---

## Sections

This entry was split by craft-design so that only the needed parts are read.
Read every section the task depends on before building; the list keeps the
original order, and the final checks are part of the contract.

| Section | Size |
|---|---|
| [1. ACTIVE BASELINE CONFIGURATION](sections/01-1-active-baseline-configuration.md) | 5 KB |
| [2. THE COMBINATORIAL VARIATION ENGINE](sections/02-2-the-combinatorial-variation-engine.md) | 6 KB |
| [3. FRONTEND REFERENCE RULE](sections/03-3-frontend-reference-rule.md) | 1 KB |
| [4. HERO MINIMALISM RULES](sections/04-4-hero-minimalism-rules.md) | 3 KB |
| [5. IMAGE COUNT & PAGE SLICING](sections/05-5-image-count-page-slicing.md) | 3 KB |
| [6. CREATIVITY ESCALATION RULE](sections/06-6-creativity-escalation-rule.md) | 1 KB |
| [7. IMAGE-FIRST ART DIRECTION](sections/07-7-image-first-art-direction.md) | 2 KB |
| [8. ANTI-AI-SLOP RULES](sections/08-8-anti-ai-slop-rules.md) | 2 KB |
| [9. TYPOGRAPHY-FIRST DISCIPLINE](sections/09-9-typography-first-discipline.md) | 1 KB |
| [10. SECTION RHYTHM RULE](sections/10-10-section-rhythm-rule.md) | 1 KB |
| [11. COMPONENT EXECUTION GUIDELINES](sections/11-11-component-execution-guidelines.md) | 2 KB |
| [12. DENSITY & SPACING DISCIPLINE](sections/12-12-density-spacing-discipline.md) | 2 KB |
| [13. COLOR & MATERIAL RULES](sections/13-13-color-material-rules.md) | 3 KB |
| [14. IMAGE / MEDIA DIRECTION](sections/14-14-image-media-direction.md) | 1 KB |
| [15. DEFAULT SITE PACKS](sections/15-15-default-site-packs.md) | 1 KB |
| [16. MULTI-IMAGE CONSISTENCY RULE](sections/16-16-multi-image-consistency-rule.md) | 1 KB |
| [17. CLARITY CHECK](sections/17-17-clarity-check.md) | 2 KB |
| [18. EXTRA CREATIVITY & IMPLEMENTATION EDGE](sections/18-18-extra-creativity-implementation-edge.md) | 3 KB |
| [19. RESPONSE BEHAVIOR](sections/19-19-response-behavior.md) | 2 KB |
| [20. EXAMPLE INTERPRETATIONS](sections/20-20-example-interpretations.md) | 2 KB |
| [21. FINAL GOAL](sections/21-21-final-goal.md) | 1 KB |
