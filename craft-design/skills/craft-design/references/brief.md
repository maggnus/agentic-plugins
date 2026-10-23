# Clarifying a brief

The charter's Clarification section decides whether to ask at all. When you do:
one call, 1–3 questions (at most 4), one decision each, the most decisive first,
in the user's language. Then end the turn. The answers are locked and never
asked again; a second round only when an answer opens a question you could not
have asked before, or the user asks for more. When the host cannot ask or the
user said not to, decide, build and state the assumptions in one line.

## Questions come from the material

Each question names what you read (the brief, the attached page, the project's
code) and the gap or tension in it, so that only someone who read the brief
could have asked it. Never ask what the chat, the project, the chosen entry, the
design system or a reference already settles; default what the setting implies
and say so in the assumptions. Stock questions (audience? platform? how many
screens?) are for an empty brief only.

The options are the real work: 2–4 concrete directions for this piece ("lead
with the schedule", not "informational"), each differing on an axis you can
name, never shades of one idea, labelled in the user's words in a few words.
Your pick comes first, marked "(Recommended)"; no recommendation on questions
of fact. No "Other" or "you decide" option: the host adds "Other" itself, and
what the user leaves to you, you decide. Look and feel are never a question in
words: when the look is open, the directions file (charter, Directions instead
of a question about look) is the question, and the questions of fact travel in
the same turn.

Example, for "a page with our schedule" from a climbing gym whose PDF timetable
you read:

- "The timetable lists about 40 sessions a week across three rooms. What should
  the page lead with?" — Today's sessions by time (Recommended) / The whole week
  as a grid by room / Courses for beginners, then the open sessions.
- "Booking happens in the gym's app today. On this page, a session is…" — A
  link into the app (Recommended) / A demo booking form on the page itself.

## Bank for an empty brief

| id | Kind | Content |
|---|---|---|
| `output` | single | landing / single-page prototype; multi-screen app prototype; dashboard or tool; editorial or marketing page; document; other |
| `platform` | multiple, ≤ 4 options | responsive web, desktop web, iOS, Android, tablet, desktop app, fixed canvas |
| `audience` | options with likely answers | who the design is for |
| `brand` | single | I have brand guidelines; match a site, product or screenshot; nothing yet |
| `scale` | options with likely answers | number of pages, screens or the content scope |
| `constraints` | options with likely answers | must-use elements, things to avoid, other limits |

The `brand` answer routes the design phase: "guidelines" or "match" → ask for
the actual spec, URL or screenshot in the same turn if it was not attached;
"nothing yet" → you author the design spec (charter, Lock brand and direction),
showing directions first when the look is open. Never offer "pick a direction
for me" as an option: that is the default, not a choice.

## Claude Code

Use `AskUserQuestion`: up to 4 questions, 2–4 options each, a short `header`,
`multiSelect: true` only where answers combine (platforms, elements to include).
"Other" is added automatically, so a free-text question becomes options with
likely answers, or a plain question in the reply when no options make sense.

## Codex

Use the host's structured question tool when the current mode offers one,
within that tool's own limits on count and options; when it answers
synchronously, continue in the same turn. Otherwise send one short sentence and
a numbered list, each with lettered options and the recommendation first, and
no "Other" line (the user can always type):

```text
1. The timetable lists about 40 sessions a week in three rooms. The page leads with:
   a) today's sessions by time (Recommended)  b) the whole week as a grid by room  c) beginner courses first
2. Booking stays in the gym's app?
   a) yes, link into it (Recommended)  b) no, a demo booking form on the page
```

Then end the turn and wait. Accept short replies such as `1a 2b`.
