---
name: design-taste-frontend
description: |
  Anti-slop frontend skill for landing pages, portfolios, and redesigns. The agent reads the brief, infers the right design direction, and ships interfaces that do not look templated. Real design systems when applicable, audit-first on redesigns, strict pre-flight check.
triggers:
  - "design taste"
  - "anti slop frontend"
  - "premium landing page"
  - "portfolio redesign"
  - "visual taste"
od:
  mode: prototype
  surface: web
  platform: desktop
  scenario: marketing
  category: creative-direction
  upstream: "https://github.com/Leonxlnx/taste-skill"
  preview:
    type: html
  design_system:
    requires: true
  craft:
    requires:
      - typography
      - color
      - anti-ai-slop
      - animation-discipline
  example_prompt: |
    Create a premium landing page that follows design-taste-frontend: infer the design read, set the dials, avoid AI-slop patterns, and output a polished responsive HTML artifact.
---


# tasteskill: Anti-Slop Frontend Skill

> Landing pages, portfolios, and redesigns. Not dashboards, not data tables, not multi-step product UI.
> Every rule below is **contextual**. None of it fires automatically. First read the brief, then pull only what fits.

---

## Sections

This entry was split by craft-design so that only the needed parts are read.
Read every section the task depends on before building; the list keeps the
original order, and the final checks are part of the contract.

| Section | Size |
|---|---|
| [0. BRIEF INFERENCE (Read the Room Before Anything Else)](sections/01-0-brief-inference-read-the-room-before-anything-.md) | 3 KB |
| [1. THE THREE DIALS (Core Configuration)](sections/02-1-the-three-dials-core-configuration.md) | 2 KB |
| [2. BRIEF → DESIGN SYSTEM MAP](sections/03-2-brief-design-system-map.md) | 4 KB |
| [3. DEFAULT ARCHITECTURE & CONVENTIONS](sections/04-3-default-architecture-conventions.md) | 4 KB |
| [4. DESIGN ENGINEERING DIRECTIVES (Bias Correction)](sections/05-4-design-engineering-directives-bias-correction.md) | 25 KB |
| [5. CONTEXT-AWARE PROACTIVITY](sections/06-5-context-aware-proactivity.md) | 9 KB |
| [6. PERFORMANCE & ACCESSIBILITY GUARDRAILS](sections/07-6-performance-accessibility-guardrails.md) | 3 KB |
| [7. DIAL DEFINITIONS (Technical Reference)](sections/08-7-dial-definitions-technical-reference.md) | 2 KB |
| [8. DARK MODE PROTOCOL](sections/09-8-dark-mode-protocol.md) | 2 KB |
| [9. AI TELLS (Forbidden Patterns)](sections/10-9-ai-tells-forbidden-patterns.md) | 12 KB |
| [10. REFERENCE VOCABULARY (Pattern Names the Agent Should Know)](sections/11-10-reference-vocabulary-pattern-names-the-agent-.md) | 5 KB |
| [11. REDESIGN PROTOCOL](sections/12-11-redesign-protocol.md) | 4 KB |
| [12. THE BLOCK LIBRARY (Contract - Implementations Land Here Iteratively)](sections/13-12-the-block-library-contract-implementations-la.md) | 3 KB |
| [13. OUT OF SCOPE](sections/14-13-out-of-scope.md) | 1 KB |
| [14. FINAL PRE-FLIGHT CHECK](sections/15-14-final-pre-flight-check.md) | 8 KB |
| [Appendix A - Install Commands per Design System](sections/16-appendix-a-install-commands-per-design-system.md) | 2 KB |
| [Appendix B - Canonical Sources (read these before reinventing)](sections/17-appendix-b-canonical-sources-read-these-before-r.md) | 3 KB |
| [Appendix C - Apple Liquid Glass: Honest Web Approximation](sections/18-appendix-c-apple-liquid-glass-honest-web-approxi.md) | 3 KB |
