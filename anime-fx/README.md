# animefx — anime-edit effects engine

A beat-synced effects engine that recreates the editing style of popular Instagram
anime editors, built on FFmpeg, OpenCV and librosa.

## Reference analysis (Nov 2026)

These are the three most-viewed reels from each of three public anime-edit accounts.

| Account | Followers | Tool (from captions) | Style signature |
|---|---|---|---|
| @amv.e | 68K | After Effects | Mixed-media collage (VHS, newspaper, graffiti, manga panels), fire text, zoom punches, white/orange bloom flashes |
| @animeroku | 33K | — | Fast beat cuts (0.33–1.8 s median shot), red/black crush, very high saturation (mean sat 120–150), glow, fade-to-black outro |
| @zyper_ins | 18K | After Effects | Teal-orange/cold grades, whip blur transitions, 3D tilt swings, lightning overlays, kinetic text with RGB-split echo, letterbox |

Measured across the 9 reels:
- **Cut timing:** 22–62% of cuts land within 50 ms of an audio onset.
- **Blur:** up to a third of frames are motion-blurred (velocity ramps and whip transitions).
- **Flashes:** amve_3 alone has 23 near-white frames.

## Effects

| Effect | Where it was seen | animefx |
|---|---|---|
| Velocity speed-ramp (fast→slow→fast inside each shot) | all | `--velocity 0..0.9` |
| Whip / swish transition (directional blur, mirror edges) | zyper, amve.e | transition `whip` |
| Zoom-through transition (radial blur) | amve.e, zyper | transition `zoom` |
| 3D tilt / perspective swing | zyper | transition `tilt` |
| Flash cut (white or coloured) | amve.e, animeroku | transition `flash`, `--fx flash@T` |
| Zoom punch on beat | amve.e, zyper | `--fx zoom@T` |
| Camera shake | zyper | `--fx shake@T[:strength[:dur]]` |
| RGB split / chromatic aberration | zyper | `--fx rgb@T` |
| Glitch slices | animeroku | `--fx glitch@T` |
| Invert flash | common on drops | `--fx invert@T` |
| Glow / bloom | all | `--glow` |
| Colour grades | all | `--grade vivid / tealorange / crimson / cold / mono` |
| Letterbox, vignette, grain, sharpen ("4K CC") | zyper | look options |
| Kinetic text (pop-in, glow, RGB fringe) | all three | `--text "TEXT@T:DUR:Y"` |
| Fire / lightning / particle overlays | amve.e, zyper | `--overlay clip.mp4` (screen blend; bring your own overlay pack) |

Not automated: hand-built collage and mixed-media scenes (amve.e). These are custom After Effects
compositions, not reusable effects.

## Styles (`edit --style`)

- `hype`: vivid grade, whip/zoom/flash/tilt transitions, zoom+shake+RGB on strong beats, invert on drops
- `cinematic`: teal-orange, letterbox (landscape), whip/tilt, gentle shakes, grain
- `dark`: crimson crush, red flashes, glitch hits, heavy glow
- `soft`: cold grade, slow velocity, zoom/flash transitions, strong glow

## Usage

```bash
# Beat-synced 9:16 reel from clips + a song (cuts every ~0.55s on the beat)
animefx edit --music song.mp3 --clips ep1.mkv@120-300 ep2.mkv fight.mp4 \
  --start 42 --duration 20 --style hype --text "GOJO@0.3:1.2:0.35" --out reel.mp4

# Add effects to an already-cut video
animefx apply edit.mp4 --out final.mp4 --auto-beats --grade crimson --glow 0.5 \
  --fx flash@3.2 --fx shake@5.0:1.2:0.5

animefx beats song.mp3          # tempo + beat times
animefx analyse reference.mp4   # cut rate, beat sync, flashes, saturation, blur
```

Clip ranges (`file@start-end`) let you pin the exact source moments you want.
The engine walks through each range in order.

Requirements: the `~/.venvs/video` environment (opencv-python-headless, librosa, pillow,
scenedetect) plus ffmpeg. Rendering 1080x1920 runs at about 0.15x realtime on CPU.
