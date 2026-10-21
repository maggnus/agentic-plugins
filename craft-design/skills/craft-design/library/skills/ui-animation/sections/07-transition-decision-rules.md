## Transition decision rules

Match the UI element first, then pick the recipe from [references/transition-recipes.md](references/transition-recipes.md):

| UI pattern | Recipe |
|---|---|
| Trigger + floating dot/count | Notification badge |
| Trigger grows into the surface it opens | Container morph |
| Trigger + anchored surface | Menu dropdown |
| Centred surface on top of page | Modal dialog |
| Panel sliding into existing container | Panel reveal |
| List ↔ detail or wizard steps | Page side-by-side slides |
| Element dimension changes | Card resize |
| Text updating in place | Text state swap |
| Two icons in same slot | Icon swap |
| Number arriving on its own | Number pop-in |
| Number the user is driving | Odometer digit roll |
| Confirmation / success moment | Success celebration |
| Hovering item in horizontal stack | Avatar group hover |
| Form validation error | Error state shake |

Prefer lower-overhead transitions (CSS-only) unless the design requires JS orchestration.
