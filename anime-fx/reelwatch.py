#!/usr/bin/env python3
"""reelwatch - turn a reel (file or direct video URL) into something Claude can "watch".

Outputs into OUTDIR:
  video.mp4      the reel
  overview.jpg   30 evenly spaced frames with timestamps
  cuts.jpg       2 frames either side of each detected cut (transitions up close)
  transcript.txt speech/lyrics via faster-whisper (if there is audio)
  stats.json     cut rate, beat sync, flashes, saturation, blur (animefx analyse)

usage: reelwatch SOURCE [-o OUTDIR] [--no-transcript]
"""
import argparse, json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PY = sys.executable


def run(cmd, **kw):
    return subprocess.run(cmd, check=True, **kw)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("source")
    ap.add_argument("-o", "--outdir", default="reel")
    ap.add_argument("--no-transcript", action="store_true")
    a = ap.parse_args()
    os.makedirs(a.outdir, exist_ok=True)
    video = os.path.join(a.outdir, "video.mp4")
    if a.source.startswith("http"):
        run(["curl", "-sSL", "--fail", "--max-time", "120", "-o", video, a.source])
    elif os.path.abspath(a.source) != os.path.abspath(video):
        run(["cp", a.source, video])

    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                "-of", "csv=p=0", video], capture_output=True, text=True).stdout)
    stamp = "drawtext=text='%{pts\\:hms}':x=4:y=4:fontsize=14:fontcolor=yellow:box=1:boxcolor=black@0.6"
    run(["ffmpeg", "-v", "error", "-y", "-i", video, "-vf",
         f"fps={30 / dur},scale=-2:200,{stamp},tile=6x5:padding=4", "-frames:v", "1",
         os.path.join(a.outdir, "overview.jpg")])

    stats = json.loads(subprocess.run([PY, os.path.join(HERE, "animefx.py"), "analyse", video],
                                      capture_output=True, text=True).stdout.strip().splitlines()[-1])
    from scenedetect import detect, AdaptiveDetector
    cuts = [s[0].seconds for s in detect(video, AdaptiveDetector(adaptive_threshold=2.5, min_scene_len=4))[1:]]
    stats["cut_times"] = [round(c, 2) for c in cuts]
    json.dump(stats, open(os.path.join(a.outdir, "stats.json"), "w"), indent=1)

    if cuts:
        fps = 30
        frames = sorted({max(0, int(c * fps) + d) for c in cuts[:24] for d in (-2, -1, 0, 1)})
        sel = "+".join(f"eq(n\\,{f})" for f in frames)
        rows = max(1, -(-len(frames) // 8))
        run(["ffmpeg", "-v", "error", "-y", "-i", video, "-vf",
             f"fps={fps},select='{sel}',scale=-2:180,{stamp},tile=8x{rows}:padding=3",
             "-frames:v", "1", "-vsync", "vfr", os.path.join(a.outdir, "cuts.jpg")])

    has_audio = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries",
                                "stream=index", "-of", "csv=p=0", video],
                               capture_output=True, text=True).stdout.strip()
    if has_audio and not a.no_transcript:
        os.environ.setdefault("HF_HUB_DISABLE_XET", "1")
        from faster_whisper import WhisperModel
        segs, info = WhisperModel("base", device="cpu", compute_type="int8").transcribe(video, vad_filter=True)
        with open(os.path.join(a.outdir, "transcript.txt"), "w") as f:
            f.write(f"# language: {info.language}\n")
            for s in segs:
                f.write(f"[{s.start:6.2f}-{s.end:6.2f}] {s.text.strip()}\n")
    print(json.dumps({"outdir": a.outdir, "duration": round(dur, 1), **{k: stats.get(k) for k in
          ("cuts", "median_shot_s", "tempo", "cuts_on_beat", "flash_frames", "mean_saturation")}}))


if __name__ == "__main__":
    main()
