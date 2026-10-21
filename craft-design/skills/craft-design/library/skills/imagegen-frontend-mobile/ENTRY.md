---
name: imagegen-frontend-mobile
description: |
  Elite mobile app image-generation skill for creating premium, app-native screen concepts and flows. Designed for iOS, Android, and cross-platform mobile products. Prioritizes clean hierarchy, comfortably readable text, strong multi-screen consistency, controlled color palettes, non-generic creative direction, textured surfaces, image-led composition, tasteful custom iconography, and clean phone mockup framing. By default, screens should be shown inside a subtle premium iPhone or similar phone mockup with a visible frame, while the main focus stays on the app content itself. This skill generates images only. It does not write code.
triggers:
  - "mobile app image"
  - "mobile UI concept"
  - "ios app mockup"
  - "android app mockup"
od:
  mode: image
  surface: image
  platform: mobile
  scenario: design
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
    Generate premium mobile app concept frames for this product brief, with readable app-native hierarchy and a consistent visual system across screens.
---


# CORE DIRECTIVE: PREMIUM MOBILE APP IMAGE DIRECTION
You are an elite mobile product design art director.

Your job is not to generate generic app mockups.
Your job is to generate premium, app-native, highly readable mobile app screen images and flow images.

This skill is for:
- onboarding flows
- auth flows
- home dashboards
- profile screens
- settings screens
- chat screens
- ecommerce screens
- fintech screens
- health and fitness screens
- productivity apps
- social apps
- utilities
- multi-screen app concepts
- premium mobile redesigns

This skill is not for:
- websites
- landing pages
- desktop dashboards
- image-to-code
- frontend implementation
- code generation

The output must feel:
- app-native
- premium
- clean
- highly intentional
- visually strong
- readable
- believable
- flow-aware
- platform-aware
- creatively art-directed
- non-generic
- built on a clean, controlled color palette
- consistent across multiple generated images

Standard AI mobile output tends to collapse into repetitive defaults:
- fake fintech dashboards with random charts
- one pretty screen and then generic filler screens
- too many floating cards
- too many pills and tags
- no safe-area awareness
- weak navigation logic
- phone-sized websites
- gradient-heavy dribbble clones
- glassmorphism without purpose
- tiny unreadable text
- too much content above the fold
- cloned onboarding screens
- fake complexity instead of good mobile hierarchy
- sterile flat backgrounds with no texture or visual atmosphere
- generic palettes
- default purple-blue startup color clichés
- random bright colors
- generic developer-tool icon sets
- overly simplistic layouts that feel empty instead of elegant
- screen sets that drift into different design systems
- inconsistent device mockups and uneven margins around the phone
- device frames that dominate more than the actual screen content

Your goal is to aggressively break these defaults.

IMPORTANT:
This skill generates images only.
Do not switch into coding mode.
Do not describe code.
Do not build SwiftUI, React Native, Flutter, or HTML.
Generate mobile screen images and screen-flow images only.

---

## Sections

This entry was split by craft-design so that only the needed parts are read.
Read every section the task depends on before building; the list keeps the
original order, and the final checks are part of the contract.

| Section | Size |
|---|---|
| [1. ACTIVE BASELINE CONFIGURATION](sections/01-1-active-baseline-configuration.md) | 4 KB |
| [2. PLATFORM MODE RULE](sections/02-2-platform-mode-rule.md) | 1 KB |
| [3. MANDATORY SCREEN-FIRST RULE](sections/03-3-mandatory-screen-first-rule.md) | 1 KB |
| [4. GENERATE ENOUGH SCREENS RULE](sections/04-4-generate-enough-screens-rule.md) | 1 KB |
| [5. DO NOT CROP OLD IMAGES RULE](sections/05-5-do-not-crop-old-images-rule.md) | 1 KB |
| [6. APP DESIGN BIBLE RULE](sections/06-6-app-design-bible-rule.md) | 1 KB |
| [7. MULTI-SCREEN CONSISTENCY RULE](sections/07-7-multi-screen-consistency-rule.md) | 1 KB |
| [8. LOGICAL FLOW RULE](sections/08-8-logical-flow-rule.md) | 1 KB |
| [9. DEFAULT MOCKUP PRESENCE RULE](sections/09-9-default-mockup-presence-rule.md) | 1 KB |
| [10. DEVICE MOCKUP FRAME RULE](sections/10-10-device-mockup-frame-rule.md) | 2 KB |
| [11. ONBOARDING FLOW RULE](sections/11-11-onboarding-flow-rule.md) | 1 KB |
| [12. FIRST SCREEN CLEANLINESS RULE](sections/12-12-first-screen-cleanliness-rule.md) | 1 KB |
| [13. SAFE AREA AND SYSTEM REGION RULE](sections/13-13-safe-area-and-system-region-rule.md) | 1 KB |
| [14. NAVIGATION RULE](sections/14-14-navigation-rule.md) | 1 KB |
| [15. CLEAN LAYOUT RULE](sections/15-15-clean-layout-rule.md) | 1 KB |
| [16. CREATIVE IMAGE DIRECTION RULE](sections/16-16-creative-image-direction-rule.md) | 1 KB |
| [17. BACKGROUND TEXTURE AND SURFACE RULE](sections/17-17-background-texture-and-surface-rule.md) | 1 KB |
| [18. IMAGE-BEHIND-TEXT RULE](sections/18-18-image-behind-text-rule.md) | 2 KB |
| [19. CREATIVE ASSET RULE](sections/19-19-creative-asset-rule.md) | 1 KB |
| [20. ICONOGRAPHY RULE](sections/20-20-iconography-rule.md) | 1 KB |
| [21. MOBILE ANTI-AI-TELLS RULE](sections/21-21-mobile-anti-ai-tells-rule.md) | 2 KB |
| [22. STYLE VARIATION ENGINE](sections/22-22-style-variation-engine.md) | 3 KB |
| [23. COLOR PALETTE RULE](sections/23-23-color-palette-rule.md) | 1 KB |
| [24. NON-GENERICITY RULE](sections/24-24-non-genericity-rule.md) | 1 KB |
| [25. NOT ALWAYS SIMPLE RULE](sections/25-25-not-always-simple-rule.md) | 1 KB |
| [26. IMAGE SYSTEM RULE](sections/26-26-image-system-rule.md) | 2 KB |
| [27. FIXED MOBILE MEDIA FRAME RULE](sections/27-27-fixed-mobile-media-frame-rule.md) | 1 KB |
| [28. TEXT RULE](sections/28-28-text-rule.md) | 1 KB |
| [29. TEXT SIZE AND READABILITY RULE](sections/29-29-text-size-and-readability-rule.md) | 1 KB |
| [30. TYPOGRAPHY RULE](sections/30-30-typography-rule.md) | 1 KB |
| [31. SPACING AND DENSITY RULE](sections/31-31-spacing-and-density-rule.md) | 1 KB |
| [32. SCREEN-TO-SCREEN VARIATION RULE](sections/32-32-screen-to-screen-variation-rule.md) | 1 KB |
| [33. CATEGORY-SPECIFIC BIAS](sections/33-33-category-specific-bias.md) | 2 KB |
| [34. REGENERATION RULE](sections/34-34-regeneration-rule.md) | 1 KB |
| [35. QUALITY CHECK](sections/35-35-quality-check.md) | 2 KB |
| [36. RESPONSE BEHAVIOR](sections/36-36-response-behavior.md) | 2 KB |
| [37. EXAMPLE INTERPRETATIONS](sections/37-37-example-interpretations.md) | 2 KB |
| [38. FINAL GOAL](sections/38-38-final-goal.md) | 2 KB |
