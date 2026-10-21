## Motion design principles

- **Continuity over teleportation.** Elements visible in both states transition in place; expand from where elements sit rather than fading in a new instance. Never duplicate a persistent element or hard-cut between views that share components; hard cuts lose spatial context.
- **Directional motion matches position.** Tab and carousel transitions animate in the direction matching spatial layout (left-to-right forward, right-to-left back).
- **Emerge from the trigger.** Overlays, trays, and panels animate outward from the element that opened them; generic centre-screen entrances break spatial orientation. Better still where the shapes allow: let the trigger *become* the surface (see the container-morph recipe).
- **Confirm in place, not in a corner.** An action's result belongs on the control that caused it: the button becomes "Copied", holds, and reverts. A toast in the far corner makes the user's eye leave the thing they just touched to find out whether it worked. Reserve corner toasts for results with no on-screen origin (a background job finishing, an incoming message).
- **Animate paired states together.** If open animates, close animates. If hover has motion, focus and pressed states get equivalent feedback. Do not polish only one half of a repeated interaction.
- **Delight scales inversely with frequency.** Rarer interactions get more personality; high-frequency actions must be invisible.
- **Motion enhances perceived speed.** Smooth transitions feel faster than hard cuts, even at identical load times.
