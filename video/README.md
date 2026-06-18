# video — narrated demo (Remotion)

Composes the captioned screencast with a voiceover track and renders the
narrated demo (`../docs/demo-narrated.mp4`).

The voiceover is an **ElevenLabs** read (voice *Roger*) in `public/narration.mp3`.
It's the timing authority: the screencast is recorded a touch longer and
stretched by an imperceptible factor (`src/vo.ts`) so it co-terminates with the
voice. To use a different voice, drop a new `public/narration.mp3` and update
`AUDIO_S` in `src/vo.ts`, then re-render.

`gen-vo.ps1` is a no-API-key fallback that synthesizes the narration with
Windows SAPI TTS if you don't have an ElevenLabs file.

## Regenerate

```bash
npm install

# 1. screencast (silent, captioned) — produced by the frontend recorder
#    (DEMO_SCALE stretches dwell times to ~the voiceover length), then copied:
cp ../docs/demo.mp4 public/screencast.mp4

# 2. normalize the voiceover to a consistent level:
ffmpeg -i raw-voiceover.mp3 -af loudnorm=I=-16:TP=-1.5:LRA=11 -ar 44100 public/narration.mp3

# 3. render (point at Edge to avoid a chromium download):
REMOTION_BROWSER_EXECUTABLE="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" \
  npx remotion render Narrated ../docs/demo-narrated.mp4
```

`npx remotion studio` opens a live preview to retime against the voice.
