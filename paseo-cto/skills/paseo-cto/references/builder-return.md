# Builder return

Read this file when writing a contract and when reading a return. The structure below is what the
contract requires of the builder, what the CTO checks before dispatching a review, and what the
reviewer receives as its checklist. It exists because a return that is complete costs one round and
a return that is vague costs three.

The captured command lines here are what the reviewer reads **instead of rerunning the work**. That
substitution only holds if the lines are real, so the return states exactly what ran and nothing it
did not.

```text
RANGE: <source-linked baseline..final revision>
TIME: <dd/mm hh:mm> local, <n>m of work
CHANGES: <one line per contract item: what the item asked, what the code now does>
CHECKS:
| claim | command, verbatim | result line |
| --- | --- | --- |
| <what this proves> | <the exact command> | <the real exit or measurement> |
FALSIFIERS: <which check fails under which deliberate break, with the captured failing line>
SCREENSHOTS: <file · surface · theme · dimensions · what it shows; or none>
UNVERIFIED: <every claim the contract asked for that no command above establishes>
FINDINGS: <what the contract or the package lacked; proposed children; no workarounds applied>
```

## What each section refuses

**`CHECKS` carries only commands that ran.** A command named but not executed, a suite reported as
green from memory, a lint or type check listed where the project has no such script — each is a
false statement about evidence, not an optimistic summary. If a check did not run, its claim belongs
under `UNVERIFIED`, where a reviewer can price it.

**`FALSIFIERS` names the break, not the intention.** For each load-bearing claim: the deliberate
break, the command, and the real non-zero exit that followed. A claim whose failing form was never
observed is not proven, however many green lines surround it.

**`SCREENSHOTS` is a manifest, not a gallery.** One set exists only where an owner decision waits on
it. Every entry states the file, the surface, the theme and the dimensions, and anything the set
does not cover is written as not verified rather than implied by silence.

**`UNVERIFIED` is mandatory and may not be empty by convention.** Where every contracted claim is
established, it reads `none`, and that word is itself a claim the reviewer can check.

**`FINDINGS` reports what was missing without routing around it.** A contract that named a section,
an export or a mechanism that does not exist is a finding; inventing a substitute and shipping it is
a scope change nobody authorized.

## How it is used

The contract's `Return` field points at this structure and names the character ceiling. The reviewer
reads the return as a checklist: a missing section is a finding before any code is read, because the
review cannot substitute captured evidence for its own runs when the capture is absent. The CTO
checks the same structure before dispatching the review, so an incomplete return costs a message
rather than a round.
