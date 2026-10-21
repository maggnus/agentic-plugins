# Clarifying a brief

Ask only about gaps that change the direction, structure or delivery format.
Usually 1–3 questions, at most 4. One decision per question. Prioritize by impact:
output type, audience, primary goal, platform, scale, constraints. Never ask what
the user, the project, the chosen entry, the design system or a reference source
already settles. With an active design system, never ask about brand, style,
theme or palette. Write user-facing text in the user's language.

Give each question a recommended answer based on what you know, marked
"(Recommended)" and listed first. Leave room for a custom answer. Ask once, then
end the turn; treat the answers as locked.

## Question bank

Pick only unanswered questions that matter:

| id | Kind | Content |
|---|---|---|
| `output` | single | landing / single-page prototype; multi-screen app prototype; dashboard or tool; editorial or marketing page; document; other |
| `platform` | multiple, ≤ 4 options | responsive web, desktop web, iOS, Android, tablet, desktop app, fixed canvas |
| `audience` | short text | who the design is for |
| `brand` | single, fixed values | `pick_direction` — "Pick a direction for me"; `brand_spec` — "I have brand guidelines"; `reference_match` — "Match a site or screenshot" |
| `scale` | short text | number of pages, screens or the content scope |
| `constraints` | long text | must-use elements, things to avoid, other limits |

The `brand` answer routes the design phase: `pick_direction` → choose from
`library/directions.md` (offer the five by label when the user wants to compare);
`brand_spec` or `reference_match` → ask for the actual spec, URL or screenshot if
it was not attached. Label options in the user's words ("Magazine-style layout",
not "Editorial") and keep labels short.

## Claude Code

Use `AskUserQuestion`: up to 4 questions, 2–4 options each, a short `header`,
`multiSelect: true` for `platform`. "Other" is added automatically, so free-text
questions (`audience`, `scale`, `constraints`) become options with likely answers
plus "Other", or a plain question in the reply when no options make sense.

## Codex

Use the host's structured question tool when one is available. Otherwise send one
short sentence and a numbered list, each with lettered options and the
recommendation first:

```text
1. What are we making?
   a) Landing page (Recommended)  b) App prototype  c) Dashboard  d) Other: …
2. Visual direction?
   a) Pick one for me (Recommended)  b) I have brand guidelines  c) Match a site or screenshot
```

Then end the turn and wait. Accept short replies such as `1a 2c`.
