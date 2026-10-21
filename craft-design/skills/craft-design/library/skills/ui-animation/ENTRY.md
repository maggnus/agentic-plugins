---
name: ui-animation
description: "Implement, review, and measure UI motion. Reconstruct easing, springs and gestures from a recording using bundled frame extraction, tracking and curve-fitting tools when available."
en_name: "ui-animation"
zh_name: "录屏动效复刻与分析"
zh_description: "从参考录屏分析动画时长、缓动、弹簧和手势，复刻界面动效；也支持常规动效实现与审查。精确测量需要 FFmpeg 和 Python 依赖。"
triggers:
  - "ui-animation"
  - "animation"
  - "motion"
  - "动效"
  - "动画"
  - "录屏"
  - "动效复刻"
  - "缓动"
  - "spring"
  - "easing"
  - "gesture"
license: MIT
od:
  mode: utility
  category: animation-motion
  upstream: "https://github.com/mblode/agent-skills"
  source-commit: 5a781a88ed60c1033767b6b6a966887cd93dd912
---

# UI Animation

## Sections

This entry was split by craft-design so that only the needed parts are read.
Read every section the task depends on before building; the list keeps the
original order, and the final checks are part of the contract.

| Section | Size |
|---|---|
| [Open Design execution context](sections/01-open-design-execution-context.md) | 2 KB |
| [Reference files](sections/02-reference-files.md) | 4 KB |
| [Core rules](sections/03-core-rules.md) | 2 KB |
| [Motion design principles](sections/04-motion-design-principles.md) | 2 KB |
| [What to animate](sections/05-what-to-animate.md) | 2 KB |
| [Easing defaults](sections/06-easing-defaults.md) | 2 KB |
| [Transition decision rules](sections/07-transition-decision-rules.md) | 1 KB |
| [Spatial and sequencing](sections/08-spatial-and-sequencing.md) | 1 KB |
| [Accessibility](sections/09-accessibility.md) | 1 KB |
| [Performance](sections/10-performance.md) | 2 KB |
| [Anti-patterns](sections/11-anti-patterns.md) | 2 KB |
| [Workflow](sections/12-workflow.md) | 2 KB |
| [Validation](sections/13-validation.md) | 1 KB |
| [Discovery workflow](sections/14-discovery-workflow.md) | 1 KB |
| [Reverse-engineer workflow](sections/15-reverse-engineer-workflow.md) | 5 KB |
| [Related skills](sections/16-related-skills.md) | 1 KB |
