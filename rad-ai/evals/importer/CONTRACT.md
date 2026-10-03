# Import outcome
The command `python3 -m inbox INPUT --store STORE` imports CSV columns `id,value` into a JSON object.
Valid batches add each integer value by ID and exit 0. Existing entries are preserved.
A duplicate ID, invalid integer or missing input exits 2 with a diagnostic.
The batch is atomic: any rejected batch leaves the existing store unchanged, or creates no store if none existed.
Repeated imports of an existing ID are rejected. Writes are limited to inbox.py and its tests.
Risk: cross-module/user-visible behavior. Assess code and observed behavior without editing the implementation.
