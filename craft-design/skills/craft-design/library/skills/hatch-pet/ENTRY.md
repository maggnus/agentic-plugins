---
name: hatch-pet
description: Create, repair, validate, preview, and package Codex-compatible animated pet spritesheets from character art, screenshots, generated images, or visual references. Use when a user wants to hatch a Codex pet, create a custom animated pet, or build a built-in pet asset with an 8x9 atlas, transparent unused cells, row-by-row animation prompts, QA contact sheets, preview videos, and pet.json packaging. This skill composes the installed $imagegen system skill for visual generation and uses bundled scripts for deterministic spritesheet assembly.
triggers:
  - "hatch a pet"
  - "hatch pet"
  - "codex pet"
  - "spritesheet pet"
  - "animated pet"
  - "孵化宠物"
  - "电子宠物"
craft:
  mode: image
  surface: image
  scenario: personal
  preview:
    type: image
    entry: final/spritesheet.png
  design_system:
    requires: false
  outputs:
    primary: final/spritesheet.png
    secondary:
      - final/spritesheet.webp
      - pet.json
      - qa/contact-sheet.png
  example_prompt: "Hatch me a tiny pixel-art shiba pet — friendly, sitting upright, with a small pomegranate prop. Use the hatch-pet skill end-to-end."
  upstream: "https://github.com/openai/skills/tree/main/skills/.curated/hatch-pet"
---

> **craft-design adaptation.** The sprite-sheet workflow and its scripts apply as
> written. The parts that hand the result to a desktop app's daemon or pet settings do
> not exist here: deliver the files into the user's chosen directory and tell them
> where they are.

# Hatch Pet

> **Studio integration.** This is the unmodified Codex `hatch-pet` skill,
> vendored under `skills/hatch-pet/` so any agent can run it. After
> the skill finishes packaging, the resulting `spritesheet.webp` (under
> `${CODEX_HOME:-$HOME/.codex}/pets/<pet-name>/`) can be imported into the
> floating pet companion via **Settings → General → Pets → Import Codex sprite**. The
> import flow auto-detects the 8×9 / `192×208` atlas and lets the user pick
> which animation row to play (idle, running-right, waving, …).

## Sections

This entry was split by craft-design so that only the needed parts are read.
Read every section the task depends on before building; the list keeps the
original order, and the final checks are part of the contract.

| Section | Size |
|---|---|
| [Overview](sections/01-overview.md) | 1 KB |
| [Generation Delegation](sections/02-generation-delegation.md) | 3 KB |
| [Codex Digital Pet Style](sections/03-codex-digital-pet-style.md) | 1 KB |
| [Transparency And Effects](sections/04-transparency-and-effects.md) | 3 KB |
| [Pet Naming](sections/05-pet-naming.md) | 1 KB |
| [Visible Progress Plan](sections/06-visible-progress-plan.md) | 2 KB |
| [Default Workflow](sections/07-default-workflow.md) | 5 KB |
| [Subagent Row Generation](sections/08-subagent-row-generation.md) | 4 KB |
| [Repair Workflow](sections/09-repair-workflow.md) | 1 KB |
| [Secondary Image Generation Fallback](sections/10-secondary-image-generation-fallback.md) | 1 KB |
| [Rules](sections/11-rules.md) | 3 KB |
| [Acceptance Criteria](sections/12-acceptance-criteria.md) | 1 KB |
