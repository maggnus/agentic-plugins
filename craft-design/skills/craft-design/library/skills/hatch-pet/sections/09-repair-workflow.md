## Repair Workflow

If finalization stops because row QA failed, queue targeted repair jobs:

```bash
python "$SKILL_DIR/scripts/queue_pet_repairs.py" \
  --run-dir /absolute/path/to/run
```

Then repeat the `$imagegen` generation and `record_imagegen_result.py` ingest loop for each reopened row job. Regenerate the smallest failing scope: the failed row, not the whole sheet.

For identity repairs, use the canonical base image, original references, contact sheet, and exact row failure note as grounding context. Repair only the failed row while preserving the canonical pet identity.
