## Overview

Create a Codex-compatible animated pet from a concept, one or more reference images, or both. This skill owns pet-specific prompt planning, animation rows, frame extraction, atlas geometry, QA, previews, and packaging. It delegates visual generation to `$imagegen`.

User-facing inputs are optional. If the user omits a pet name, infer one from the concept or reference filenames; if that is not possible, choose a short appropriate name. If the user omits a description, infer one from the concept or references. If the user omits reference images, generate the base pet from text first, then use that base as the canonical reference for every animation row.
