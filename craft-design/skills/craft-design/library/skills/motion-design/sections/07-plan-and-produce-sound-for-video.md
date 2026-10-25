## Plan and produce sound for video

For a video motion brief, decide voice, music and effects separately in the
existing Design Spec and beat map. If the film benefits from music or sound
accents and the user has not requested silence, add suitable sound proactively.
“No voiceover” disables speech only; it does not mean no music or effects.
An explicit silent/muted/no-sound request wins. Choose silence when justified
by the destination (for example a silent ambient loop), and state that choice.
This policy belongs to video motion; do not add sound to ordinary prototypes,
documents, slides or interactive motion unless their brief calls for it.

Record the audio decision in the ordinary plan. Declare
`<meta name="craft-motion-audio" content="required">` for an audible film or
`content="silent"` for intentional silence. This is composition metadata for
the actual exporter, not a model-output planning contract.
For `required`, author real local audio assets inside the composition directory:
use supplied/licensed media, the host audio-generation tool when available, or
an original synthesized instrumental/effect WAV. Do not invent an asset URL,
install an unrelated audio environment, or substitute a pulsing visual for sound.
If required audio production fails, report the blocker instead of delivering
silence as complete.

Declare every track with the renderer's supported timing, for example:
`<audio src="assets/music.wav" data-start="0" data-duration="15" data-volume="0.3" preload="auto"></audio>`.
Effects use the same contract with their own start and duration. Keep sources
local and relative, pre-trim tracks, and avoid loop, playback-rate and media-start
attributes. Keep music below speech and align accents to the actual beat map.
Preserve the shared source player: it automatically loops picture and sound, and synchronizes audio to play,
pause, seek and replay. Do not start a second audio clock or use Web Audio alone, which is
not an exportable track. The renderer mixes these tracks into the MP4.

In the existing bounded video check, verify source audio follows those controls,
that downloaded MP4 contains an audible audio track, and that key sounds occur
at the authored times. A file extension or an audio tag alone does not prove
sound. Silent films remain valid; never require audio for other task types.
