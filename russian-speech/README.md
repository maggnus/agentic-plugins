# `russian-speech`

Treats compressed working notes as facts to understand, not a draft to translate literally.
The agent reconstructs their meaning and writes a coherent Russian explanation, preserving
technical terms and facts without inventing causes or completed actions.

[`SKILL.md`](skills/russian-speech/SKILL.md) contains the core rule and a wrong/right example.

In Claude Code a SessionStart hook injects a compact style directive into every session, so the base
register always applies. Codex has no such hook: there the style applies through implicit skill
invocation or explicitly as `$russian-speech:russian-speech`.

## Install from GitHub

### Claude Code

```sh
claude plugin marketplace add "maggnus/agentic-plugins@v12.0.7"
claude plugin install russian-speech@maggnus
```

### Codex

```sh
codex plugin marketplace add maggnus/agentic-plugins --ref v12.0.7
codex plugin add russian-speech@maggnus
```
