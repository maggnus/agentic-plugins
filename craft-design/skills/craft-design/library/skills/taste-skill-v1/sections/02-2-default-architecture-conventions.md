## 2. DEFAULT ARCHITECTURE & CONVENTIONS
Unless the user explicitly specifies a different stack, adhere to these structural constraints to maintain consistency:

* **DEPENDENCY VERIFICATION [MANDATORY]:** Before importing ANY 3rd party library (e.g. `framer-motion`, `lucide-react`, `zustand`), you MUST check `package.json`. If the package is missing, you MUST output the installation command (e.g. `npm install package-name`) before providing the code. **Never** assume a library exists.
* **Framework & Interactivity:** React or Next.js. Default to Server Components (`RSC`).
    * **RSC SAFETY:** Global state works ONLY in Client Components. In Next.js, wrap providers in a `"use client"` component.
    * **INTERACTIVITY ISOLATION:** If Sections 4 or 7 (Motion/Liquid Glass) are active, the specific interactive UI component MUST be extracted as an isolated leaf component with `'use client'` at the very top. Server Components must exclusively render static layouts.
* **State Management:** Use local `useState`/`useReducer` for isolated UI. Use global state strictly for deep prop-drilling avoidance.
* **Styling Policy:** Use Tailwind CSS (v3/v4) for 90% of styling.
    * **TAILWIND VERSION LOCK:** Check `package.json` first. Do not use v4 syntax in v3 projects.
    * **T4 CONFIG GUARD:** For v4, do NOT use `tailwindcss` plugin in `postcss.config.js`. Use `@tailwindcss/postcss` or the Vite plugin.
* **ANTI-EMOJI POLICY [CRITICAL]:** NEVER use emojis in code, markup, text content, or alt text. Replace symbols with high-quality icons (Radix, Phosphor) or clean SVG primitives. Emojis are BANNED.
* **Responsiveness & Spacing:**
  * Standardize breakpoints (`sm`, `md`, `lg`, `xl`).
  * Contain page layouts using `max-w-[1400px] mx-auto` or `max-w-7xl`.
  * **Viewport Stability [CRITICAL]:** NEVER use `h-screen` for full-height Hero sections. ALWAYS use `min-h-[100dvh]` to prevent catastrophic layout jumping on mobile browsers (iOS Safari).
  * **Grid over Flex-Math:** NEVER use complex flexbox percentage math (`w-[calc(33%-1rem)]`). ALWAYS use CSS Grid (`grid grid-cols-1 md:grid-cols-3 gap-6`) for reliable structures.
* **Icons:** You MUST use exactly `@phosphor-icons/react` or `@radix-ui/react-icons` as the import paths (check installed version). Standardize `strokeWidth` globally (e.g., exclusively use `1.5` or `2.0`).
