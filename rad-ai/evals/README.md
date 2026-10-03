# Reproducing evaluation inputs

These are source fixtures and observations, not a local plugin installation.
The skill is installed only from an immutable published GitHub tag.

`python3 rad-ai/evals/reproduce-importer.py` checks input hashes and reproduces four
recorded baseline behaviors through the real command-line surface. Successful reproduction
means that the observed failures still occur; it does not mean the baseline meets its contract.

For a fresh independent skill trial, give the evaluator the installed acceptance role,
`importer/CONTRACT.md`, application source and a report of `python3 -m unittest -v`.
Do not supply the expected verdict, findings or corrected implementation. Keep outputs in
an isolated temporary workspace and assess observed behavior against the contract.

The larger trial uses public source at
`https://github.com/django/django/tree/7847227a3fecde4b2a169552b84c60c6286b6025`.
In a separate checkout of that revision, apply `django/result.patch` with `git apply --unidiff-zero` and run the recorded
checks in `../research/evidence/django-trial.json`. The patch is an evaluation result;
it is not an upstream contribution or part of the runtime method. The underlying source
license is retained in `django/LICENSE.Django`.

To repeat the agent trial, use the installed main role and `django/CONTRACT.md` against
an unmodified checkout, without giving it the recorded patch. Record host and model versions,
settings, budgets, full elapsed time, all attempts and independent acceptance. Repetition of
these cases alone does not establish comparative acceleration or giant-system capability.
