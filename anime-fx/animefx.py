#!/usr/bin/env python3
"""animefx - beat-synced anime-edit effects engine (OpenCV + FFmpeg + librosa).

Recreates the effect vocabulary found in popular Instagram anime edits:
velocity speed-ramps, whip / zoom / tilt / flash transitions, zoom punches,
camera shake, RGB split, glitch, invert flashes, glow/bloom, colour grades,
letterbox, vignette, grain, kinetic text and screen-blended overlays.

Commands
  animefx beats   SONG                         print tempo + beat times (JSON)
  animefx edit    --music SONG --clips A B ... build a beat-synced montage
  animefx apply   IN --out OUT [--fx ...]      add effects to an existing video
  animefx analyse VIDEO...                     cut rate / beat-sync / flash stats

Run `animefx <command> -h` for options.
"""
import argparse, json, math, os, random, subprocess, sys
import numpy as np
import cv2

# --------------------------------------------------------------------------- IO

def probe(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
         "stream=width,height,r_frame_rate:format=duration", "-of", "json", path],
        capture_output=True, text=True, check=True).stdout
    j = json.loads(out)
    s = j["streams"][0]
    num, den = s["r_frame_rate"].split("/")
    return int(s["width"]), int(s["height"]), float(num) / float(den), float(j["format"]["duration"])


def has_audio(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries",
                          "stream=index", "-of", "csv=p=0", path], capture_output=True, text=True).stdout
    return bool(out.strip())


class Reader:
    """Frame access by time, optimised for forward (possibly repeating/skipping) reads."""

    def __init__(self, path):
        self.path = path
        self.w, self.h, self.fps, self.dur = probe(path)
        self.cap = cv2.VideoCapture(path)
        self.pos = -1          # index of self.last
        self.last = None
        self.nframes = max(1, int(self.dur * self.fps) - 1)

    def frame_at(self, t):
        idx = int(min(max(t, 0), self.dur) * self.fps)
        idx = min(idx, self.nframes)
        if idx == self.pos and self.last is not None:
            return self.last
        if idx < self.pos or idx - self.pos > 90:
            self.cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            self.pos = idx - 1
        while self.pos < idx:
            ok, f = self.cap.read()
            if not ok:
                break
            self.last, self.pos = f, self.pos + 1
        if self.last is None:
            self.last = np.zeros((self.h, self.w, 3), np.uint8)
        return self.last


class Writer:
    def __init__(self, path, w, h, fps, audio=None, audio_start=0.0, duration=None, fade_out=0.6):
        cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24",
               "-s", f"{w}x{h}", "-r", str(fps), "-i", "-"]
        if audio:
            cmd += ["-ss", str(audio_start), "-i", audio, "-map", "0:v", "-map", "1:a"]
            af = []
            if duration and fade_out:
                af.append(f"afade=t=out:st={max(0, duration - fade_out):.3f}:d={fade_out}")
            if af:
                cmd += ["-af", ",".join(af)]
            cmd += ["-c:a", "aac", "-b:a", "192k", "-shortest"]
        cmd += ["-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p",
                "-movflags", "+faststart", path]
        self.p = subprocess.Popen(cmd, stdin=subprocess.PIPE)

    def write(self, f):
        self.p.stdin.write(np.ascontiguousarray(f).tobytes())

    def close(self):
        self.p.stdin.close()
        if self.p.wait() != 0:
            sys.exit("ffmpeg failed while encoding")


def fill(frame, w, h):
    """Scale + centre-crop to fill w x h (e.g. landscape anime -> 9:16 reel)."""
    fh, fw = frame.shape[:2]
    s = max(w / fw, h / fh)
    nw, nh = max(w, round(fw * s)), max(h, round(fh * s))
    f = cv2.resize(frame, (nw, nh), interpolation=cv2.INTER_AREA if s < 1 else cv2.INTER_CUBIC)
    x, y = (nw - w) // 2, (nh - h) // 2
    return f[y:y + h, x:x + w]

# ------------------------------------------------------------------------ beats

def detect_beats(path, start=0.0, duration=None):
    import librosa
    sr = 22050
    cmd = ["ffmpeg", "-v", "error", "-ss", str(start), "-i", path]
    if duration:
        cmd += ["-t", str(duration)]
    cmd += ["-vn", "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"]
    y = np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, np.float32)
    if not len(y):
        sys.exit(f"no audio found in {path}")
    env = librosa.onset.onset_strength(y=y, sr=sr)
    tempo, frames = librosa.beat.beat_track(onset_envelope=env, sr=sr)
    tempo = float(np.atleast_1d(tempo)[0])
    times = librosa.frames_to_time(frames, sr=sr)
    strength = env[np.clip(frames, 0, len(env) - 1)] if len(frames) else np.array([])
    strong = strength >= np.percentile(strength, 70) if len(strength) else np.array([], bool)
    # onsets (hits between beats) are useful for small shakes
    onsets = librosa.onset.onset_detect(onset_envelope=env, sr=sr, units="time")
    return {"tempo": round(tempo, 2), "beats": [round(float(t), 3) for t in times],
            "strong": [bool(s) for s in strong], "onsets": [round(float(t), 3) for t in onsets],
            "duration": round(len(y) / sr, 3)}

# ---------------------------------------------------------------- frame effects
# All effects take and return uint8 BGR frames.

def _affine(f, scale=1.0, angle=0.0, dx=0.0, dy=0.0):
    h, w = f.shape[:2]
    m = cv2.getRotationMatrix2D((w / 2, h / 2), angle, scale)
    m[0, 2] += dx
    m[1, 2] += dy
    return cv2.warpAffine(f, m, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)


def _noise(t, seed, freq=37.0):
    return (math.sin(t * freq + seed) * 0.6 + math.sin(t * freq * 2.31 + seed * 1.7) * 0.3
            + math.sin(t * freq * 4.7 + seed * 3.1) * 0.1)


def motion_blur(f, length, angle=0.0):
    length = int(length)
    if length < 3:
        return f
    k = np.zeros((length, length), np.float32)
    k[length // 2, :] = 1.0
    if angle:
        k = cv2.warpAffine(k, cv2.getRotationMatrix2D((length / 2 - 0.5, length / 2 - 0.5), angle, 1.0),
                           (length, length))
    k /= max(k.sum(), 1e-6)
    return cv2.filter2D(f, -1, k, borderType=cv2.BORDER_REFLECT)


def zoom_blur(f, amount, steps=5):
    """Radial blur: average of progressively scaled copies."""
    if amount < 0.005:
        return f
    acc = f.astype(np.float32)
    for i in range(1, steps):
        acc += _affine(f, 1 + amount * i / (steps - 1)).astype(np.float32)
    return (acc / steps).astype(np.uint8)


def fx_shake(f, p, s, t, seed=1.0):
    h, w = f.shape[:2]
    env = (1 - p) ** 1.5
    amp = s * 0.035 * w * env
    dx, dy = amp * _noise(t, seed), amp * _noise(t, seed + 11.3)
    ang = s * 2.5 * env * _noise(t, seed + 5.1, 23)
    out = _affine(f, 1.06 + 0.04 * s * env, ang, dx, dy)
    return motion_blur(out, abs(dx) * 0.6, math.degrees(math.atan2(dy, dx + 1e-6))) if amp > 4 else out


def fx_zoom(f, p, s, t=0.0):
    """Zoom punch: starts pushed-in with radial blur, eases back to 1.0."""
    env = (1 - p) ** 2.2
    return zoom_blur(_affine(f, 1 + 0.22 * s * env), 0.08 * s * env)


def fx_flash(f, p, s, t=0.0, color=(255, 255, 255)):
    a = min(1.0, s) * (1 - p) ** 2
    if a < 0.01:
        return f
    c = np.empty_like(f)
    c[:] = color
    return cv2.addWeighted(f, 1 - a, c, a, 0)


def fx_rgb(f, p, s, t=0.0):
    h, w = f.shape[:2]
    k = int(s * 0.014 * w * (1 - p))
    if k < 1:
        return f
    b, g, r = cv2.split(f)
    r = np.roll(r, k, axis=1)
    b = np.roll(b, -k, axis=1)
    return cv2.merge([b, g, r])


def fx_glitch(f, p, s, t=0.0):
    h, w = f.shape[:2]
    rng = random.Random(int(t * 60))
    out = fx_rgb(f, p, s * 1.4).copy()
    for _ in range(int(6 * s) + 2):
        y0 = rng.randrange(0, h - 8)
        hh = rng.randrange(4, max(5, h // 12))
        out[y0:y0 + hh] = np.roll(out[y0:y0 + hh], int(rng.uniform(-0.12, 0.12) * w * s), axis=1)
    return out


def fx_invert(f, p, s, t=0.0):
    return 255 - f if p < 0.5 else f


def fx_whip(f, amt, direction=1):
    """amt 0..1: horizontal swish (translate + directional blur)."""
    if amt <= 0.01:
        return f
    w = f.shape[1]
    out = _affine(f, 1.0 + 0.05 * amt, 0, direction * amt * 0.35 * w, 0)
    return motion_blur(out, amt * 0.18 * w)


def fx_tilt(f, amt, direction=1):
    """3D swing around the vertical axis on black (perspective transition)."""
    if amt <= 0.01:
        return f
    h, w = f.shape[:2]
    ang = math.radians(direction * amt * 70)
    d = 1.6 * w
    pts = []
    for x, y in [(-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2)]:
        z = x * math.sin(ang) + d
        xx = x * math.cos(ang) * d / z
        yy = y * d / z
        pts.append([xx + w / 2, yy + h / 2])
    m = cv2.getPerspectiveTransform(np.float32([[0, 0], [w, 0], [w, h], [0, h]]), np.float32(pts))
    out = cv2.warpPerspective(f, m, (w, h), borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0))
    return motion_blur(out, amt * 0.08 * w)


EVENT_FX = {"shake": fx_shake, "zoom": fx_zoom, "flash": fx_flash, "rgb": fx_rgb,
            "glitch": fx_glitch, "invert": fx_invert}
DEFAULT_DUR = {"shake": 0.35, "zoom": 0.3, "flash": 0.15, "rgb": 0.2, "glitch": 0.12, "invert": 0.07}

# ------------------------------------------------------------- global looks

def _lut(fn):
    x = np.arange(256, dtype=np.float32) / 255
    return np.clip(fn(x) * 255, 0, 255).astype(np.uint8)


def _scurve(c):
    return _lut(lambda x: x * (1 - c) + c * (x * x * (3 - 2 * x)))


class Look:
    def __init__(self, w, h, grade="vivid", glow=0.35, vignette=0.35, letterbox=False,
                 grain=0.0, sharpen=0.5, seed=0, clarity=0.0):
        self.grade, self.glow, self.grain, self.sharpen = grade, glow, grain, sharpen
        self.clarity = clarity
        self.clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)) if clarity else None
        self.w, self.h = w, h
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
        r = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2) / math.sqrt(2)
        self.vig = (1 - vignette * np.clip(r, 0, 1) ** 2.2)[..., None] if vignette else None
        self.bar = 0
        if letterbox and w > h:
            self.bar = max(0, int((h - w / 2.39) / 2))
        self.curve = _scurve(0.35 if grade != "none" else 0)
        rng = np.random.default_rng(seed)
        self.noise = [rng.normal(0, 1, (h, w, 1)).astype(np.float32) for _ in range(4)] if grain else None
        self.i = 0

    def _grade(self, f):
        g = self.grade
        if g == "none":
            return f
        f = cv2.LUT(f, self.curve)
        x = f.astype(np.float32) / 255
        l = (0.114 * x[..., 0] + 0.587 * x[..., 1] + 0.299 * x[..., 2])[..., None]
        if g == "vivid":
            x = l + 1.35 * (x - l)
        elif g == "tealorange":
            x = l + 1.15 * (x - l)
            sh, hi = (1 - l) ** 2, l ** 2
            x += sh * np.array([0.09, 0.04, -0.06], np.float32) + hi * np.array([-0.08, 0.01, 0.08], np.float32)
        elif g == "crimson":
            b, gr, r = x[..., 0], x[..., 1], x[..., 2]
            red = np.clip((r - np.maximum(gr, b)) * 2.5, 0, 1)[..., None]
            x = l + (0.55 + 1.1 * red) * (x - l)
            x = np.clip((x - 0.06) / 0.94, 0, 1) ** 1.15          # crush blacks
        elif g == "gothic":
            # crimson cast: reds/skin keep colour, everything else drains, shadows go blood-red
            b, gr, r = x[..., 0], x[..., 1], x[..., 2]
            red = np.clip((r - np.maximum(gr, b)) * 2.5, 0, 1)[..., None]
            x = l + (0.45 + 0.9 * red) * (x - l)
            x += ((1 - l) ** 2) * np.array([-0.03, -0.04, 0.07], np.float32)
            x = np.clip((x - 0.05) / 0.95, 0, 1) ** 1.12
        elif g == "cold":
            x = l + 0.8 * (x - l)
            x = x * np.array([1.12, 1.0, 0.86], np.float32) - 0.02
        elif g == "mono":
            x = np.repeat(np.clip((l - 0.5) * 1.5 + 0.5, 0, 1), 3, axis=2)
        return np.clip(x * 255, 0, 255).astype(np.uint8)

    def __call__(self, f):
        if self.clahe is not None:
            # local contrast: makes muscle definition/texture read without an HDR look
            lab = cv2.cvtColor(f, cv2.COLOR_BGR2LAB)
            l2 = self.clahe.apply(lab[..., 0])
            lab[..., 0] = cv2.addWeighted(lab[..., 0], 1 - self.clarity, l2, self.clarity, 0)
            f = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
        f = self._grade(f)
        if self.sharpen:
            bl = cv2.GaussianBlur(f, (0, 0), 1.2)
            f = cv2.addWeighted(f, 1 + self.sharpen, bl, -self.sharpen, 0)
        if self.glow:
            small = cv2.resize(f, (self.w // 4, self.h // 4), interpolation=cv2.INTER_AREA)
            bright = cv2.subtract(small, np.full_like(small, 150))
            bright = cv2.GaussianBlur(bright, (0, 0), max(2, self.w / 160))
            bright = cv2.resize(bright, (self.w, self.h), interpolation=cv2.INTER_LINEAR)
            a, b = f.astype(np.float32) / 255, np.clip(bright.astype(np.float32) / 105 * self.glow, 0, 1)
            f = ((1 - (1 - a) * (1 - b)) * 255).astype(np.uint8)          # screen blend
        if self.vig is not None:
            f = (f.astype(np.float32) * self.vig).astype(np.uint8)
        if self.noise:
            n = self.noise[self.i % len(self.noise)]
            self.i += 1
            f = np.clip(f.astype(np.float32) + n * self.grain * 18, 0, 255).astype(np.uint8)
        if self.bar:
            f[: self.bar] = 0
            f[-self.bar:] = 0
        return f

# ---------------------------------------------------------------- kinetic text

FONT_CANDIDATES = [
    "/usr/share/fonts/opentype/inter/Inter-Black.otf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/System/Library/Fonts/Supplemental/Impact.ttf",
    "C:/Windows/Fonts/impact.ttf",
]


class KineticText:
    """Pop-in text with glow, RGB split on entry and a quick fade out."""

    def __init__(self, text, t, dur, w, h, font=None, size=None, y=0.5):
        from PIL import Image, ImageDraw, ImageFont
        self.t, self.dur, self.y = t, dur, y
        path = font or next((p for p in FONT_CANDIDATES if os.path.exists(p)), None)
        size = size or int(min(w, h) * 0.12)
        fnt = ImageFont.truetype(path, size) if path else ImageFont.load_default()
        box = ImageDraw.Draw(Image.new("L", (1, 1))).textbbox((0, 0), text, font=fnt)
        tw, th = box[2] - box[0] + size, box[3] - box[1] + size
        img = Image.new("L", (tw, th), 0)
        ImageDraw.Draw(img).text((size // 2 - box[0], size // 2 - box[1]), text, font=fnt, fill=255)
        a = np.array(img, np.float32) / 255
        if tw > w * 0.92:                                   # keep inside frame
            s = w * 0.92 / tw
            a = cv2.resize(a, (int(tw * s), int(th * s)), interpolation=cv2.INTER_AREA)
        self.alpha = a
        self.glow = cv2.GaussianBlur(a, (0, 0), size / 6)

    def apply(self, f, t):
        p = (t - self.t) / self.dur
        if p < 0 or p > 1:
            return f
        h, w = f.shape[:2]
        pin = min(1, p / 0.12)                               # first 12%: pop in
        scale = 1 + 0.6 * (1 - pin) ** 3
        fade = 1 - max(0, (p - 0.85) / 0.15)
        a = cv2.resize(self.alpha, None, fx=scale, fy=scale, interpolation=cv2.INTER_LINEAR)
        g = cv2.resize(self.glow, None, fx=scale, fy=scale, interpolation=cv2.INTER_LINEAR)
        ah, aw = a.shape
        x0, y0 = (w - aw) // 2, int(h * self.y - ah / 2)
        canvas = np.zeros((h, w), np.float32)
        gcan = np.zeros((h, w), np.float32)
        xs, ys = max(0, x0), max(0, y0)
        xe, ye = min(w, x0 + aw), min(h, y0 + ah)
        if xe <= xs or ye <= ys:
            return f
        canvas[ys:ye, xs:xe] = a[ys - y0:ye - y0, xs - x0:xe - x0]
        gcan[ys:ye, xs:xe] = g[ys - y0:ye - y0, xs - x0:xe - x0]
        k = int((1 - pin) * 0.02 * w) + 2
        out = f.astype(np.float32)
        out = out * (1 - 0.55 * gcan[..., None] * fade) + 255 * 0.55 * gcan[..., None] * fade
        for ch, shift in ((2, k), (0, -k)):                  # RGB-split fringes
            m = np.roll(canvas, shift, axis=1) * fade
            out[..., ch] = out[..., ch] * (1 - m) + 255 * m
        m = canvas[..., None] * fade
        out = out * (1 - m) + 255 * m
        return np.clip(out, 0, 255).astype(np.uint8)


def parse_text(spec, w, h, font):
    # "TEXT@start[:dur[:ypos]]"
    text, _, rest = spec.rpartition("@")
    parts = [float(x) for x in rest.split(":")]
    t = parts[0]
    dur = parts[1] if len(parts) > 1 else 1.2
    y = parts[2] if len(parts) > 2 else 0.5
    return KineticText(text, t, dur, w, h, font=font, y=y)

# ---------------------------------------------------------------- overlays

class Overlay:
    """Screen-blend a looping overlay clip (fire, lightning, particles, dust...)."""

    def __init__(self, path, w, h, opacity=0.8):
        self.r, self.w, self.h, self.opacity = Reader(path), w, h, opacity

    def apply(self, f, t):
        o = fill(self.r.frame_at(t % max(self.r.dur - 0.05, 0.1)), self.w, self.h)
        a, b = f.astype(np.float32) / 255, o.astype(np.float32) / 255 * self.opacity
        return ((1 - (1 - a) * (1 - b)) * 255).astype(np.uint8)

# ---------------------------------------------------------------- events

def parse_fx(spec):
    # "type@time[:strength[:duration]]"
    name, _, rest = spec.partition("@")
    if name not in EVENT_FX:
        sys.exit(f"unknown effect '{name}'. choose from {', '.join(EVENT_FX)}")
    parts = [float(x) for x in rest.split(":")]
    return {"type": name, "t": parts[0], "s": parts[1] if len(parts) > 1 else 1.0,
            "dur": parts[2] if len(parts) > 2 else DEFAULT_DUR[name]}


def apply_events(f, t, events):
    for e in events:
        if e["t"] <= t < e["t"] + e["dur"]:
            p = (t - e["t"]) / e["dur"]
            f = EVENT_FX[e["type"]](f, p, e["s"], t) if e["type"] != "shake" \
                else fx_shake(f, p, e["s"], t, seed=e["t"] * 7.3)
    return f


STYLES = {
    # derived from the reference analysis (see README)
    "hype":      dict(grade="vivid", glow=0.45, vignette=0.3, grain=0.0, velocity=0.65, speed=1.3,
                      transitions=["whip", "zoom", "flash", "whip", "tilt"], beat_fx=["zoom", "shake", "rgb"],
                      offbeat_shake=0.35, invert_on_drop=True),
    "cinematic": dict(grade="tealorange", glow=0.35, vignette=0.4, grain=0.25, velocity=0.5, speed=1.0,
                      transitions=["whip", "tilt", "cut", "zoom"], beat_fx=["shake"], offbeat_shake=0.2,
                      invert_on_drop=False, letterbox=True),
    "dark":      dict(grade="crimson", glow=0.55, vignette=0.5, grain=0.15, velocity=0.6, speed=1.2,
                      transitions=["flash", "zoom", "whip", "cut"], beat_fx=["zoom", "glitch", "shake"],
                      offbeat_shake=0.3, invert_on_drop=True, flash_color=(20, 20, 235)),
    "soft":      dict(grade="cold", glow=0.6, vignette=0.35, grain=0.2, velocity=0.3, speed=0.85,
                      transitions=["zoom", "cut", "flash"], beat_fx=[], offbeat_shake=0.0,
                      invert_on_drop=False),
}

# ---------------------------------------------------------------- edit

def parse_clip(spec):
    path, _, rng = spec.partition("@")
    a, b = (rng.split("-") + [""])[:2] if rng else ("", "")
    return {"path": path, "a": float(a) if a else 0.0, "b": float(b) if b else None}


def build_plan(beats, clips, readers, args, style):
    period = 60 / max(beats["tempo"], 1)
    every = args.cut_every or max(1, round(0.55 / period))
    bt = beats["beats"]
    cut_idx = list(range(0, len(bt), every))
    cuts = [0.0] + [bt[i] for i in cut_idx if bt[i] > 0.15]
    total = args.duration or beats["duration"]
    cuts = [c for c in cuts if c < total - 0.15] + [total]
    strong_at = {round(t, 3) for t, s in zip(bt, beats["strong"]) if s}
    cursors = [c["a"] for c in clips]
    segs, rng = [], random.Random(args.seed)
    for i in range(len(cuts) - 1):
        k = i % len(clips) if not args.shuffle else rng.randrange(len(clips))
        c, r = clips[k], readers[k]
        seg_len = cuts[i + 1] - cuts[i]
        span = seg_len * style["speed"]
        end_lim = c["b"] if c["b"] is not None else r.dur
        if cursors[k] + span > end_lim:
            cursors[k] = c["a"]
        if c["b"] is not None:
            # never read past a pinned range: slow the shot down instead (reads as slow-mo)
            span = min(span, max(0.05, end_lim - cursors[k]))
        segs.append({"t0": cuts[i], "t1": cuts[i + 1], "clip": k, "src": cursors[k], "span": span,
                     "trans": style["transitions"][i % len(style["transitions"])] if i else "cut",
                     "strong": round(cuts[i], 3) in strong_at})
        cursors[k] += span + 0.25 * seg_len
    events = []
    for t, s in zip(bt, beats["strong"]):
        if t >= total:
            break
        if s:
            for name in style["beat_fx"]:
                events.append({"type": name, "t": t, "s": 1.0 if name != "rgb" else 0.8,
                               "dur": DEFAULT_DUR[name]})
        elif style["offbeat_shake"]:
            events.append({"type": "shake", "t": t, "s": style["offbeat_shake"], "dur": 0.25})
    if style["invert_on_drop"]:
        strong = [t for t, s in zip(bt, beats["strong"]) if s and t < total]
        for t in strong[3::6]:
            events.append({"type": "invert", "t": t, "s": 1, "dur": DEFAULT_DUR["invert"]})
    return segs, events


def velocity_time(u, a):
    """Map 0..1 output progress to 0..1 source progress; fast at ends, slow in middle."""
    return u + a * math.sin(2 * math.pi * u) / (2 * math.pi)


def cmd_edit(args):
    style = dict(STYLES[args.style])
    for k in ("grade", "glow", "velocity", "speed", "grain", "vignette"):
        v = getattr(args, k)
        if v is not None:
            style[k] = v
    if args.transitions:
        style["transitions"] = args.transitions.split(",")
    if args.beat_fx is not None:
        style["beat_fx"] = [x for x in args.beat_fx.split(",") if x]
    if args.offbeat_shake is not None:
        style["offbeat_shake"] = args.offbeat_shake
    if args.no_invert:
        style["invert_on_drop"] = False
    switches = sorted((float(t), g) for t, g in (s.split(":") for s in args.grade_switch or []))
    w, h = map(int, args.size.lower().split("x"))
    fps = args.fps
    print(f"[animefx] beat tracking {args.music} ...", file=sys.stderr)
    beats = detect_beats(args.music, args.start, args.duration)
    print(f"[animefx] tempo {beats['tempo']} BPM, {len(beats['beats'])} beats", file=sys.stderr)
    clips = [parse_clip(c) for c in args.clips]
    readers = [Reader(c["path"]) for c in clips]
    segs, events = build_plan(beats, clips, readers, args, style)
    events += [parse_fx(s) for s in args.fx or []]
    texts = [parse_text(s, w, h, args.font) for s in args.text or []]
    overlays = [Overlay(p, w, h, args.overlay_opacity) for p in args.overlay or []]
    look = Look(w, h, style["grade"], style["glow"], style["vignette"],
                style.get("letterbox", False) and not args.no_letterbox, style["grain"], seed=args.seed,
                clarity=args.clarity, sharpen=args.sharpen)
    base_grade = style["grade"]
    total = segs[-1]["t1"]
    tw = args.transition
    flash_color = style.get("flash_color", (255, 255, 255))
    out = Writer(args.out, w, h, fps, audio=args.music, audio_start=args.start, duration=total)
    nf = int(total * fps)
    si = 0
    for n in range(nf):
        t = n / fps
        while si < len(segs) - 1 and t >= segs[si]["t1"]:
            si += 1
        s = segs[si]
        u = (t - s["t0"]) / (s["t1"] - s["t0"])
        src = s["src"] + s["span"] * velocity_time(u, style["velocity"])
        f = fill(readers[s["clip"]].frame_at(src), w, h)
        if args.push:
            # slow handheld push-in: every shot breathes like a real camera
            ph = si * 1.7
            f = _affine(f, 1 + args.push * (0.3 + u), 0.15 * math.sin(t * 1.3 + ph),
                        w * 0.004 * math.sin(t * 0.9 + ph), h * 0.004 * math.cos(t * 1.1 + ph))
        look.grade = base_grade
        for st, g in switches:
            if t >= st:
                look.grade = g
        # transitions: outgoing tail of this segment / incoming head of next
        nxt = segs[si + 1] if si + 1 < len(segs) else None
        if nxt and s["t1"] - t < tw / 2:
            f = transition(f, nxt["trans"], 1 - (s["t1"] - t) / (tw / 2), out_going=True, idx=si)
        elif si > 0 and t - s["t0"] < tw / 2:
            f = transition(f, s["trans"], 1 - (t - s["t0"]) / (tw / 2), out_going=False, idx=si,
                           flash_color=flash_color)
        f = apply_events(f, t, events)
        for o in overlays:
            f = o.apply(f, t)
        f = look(f)
        for tx in texts:
            f = tx.apply(f, t)
        if args.fade_out and t > total - args.fade_out:
            f = (f.astype(np.float32) * max(0, (total - t) / args.fade_out)).astype(np.uint8)
        out.write(f)
        if n % (fps * 2) == 0:
            print(f"\r[animefx] rendering {100 * n // nf:3d}%", end="", file=sys.stderr)
    out.close()
    print(f"\r[animefx] done -> {args.out} ({total:.1f}s, {len(segs)} shots)", file=sys.stderr)


def transition(f, kind, amt, out_going, idx, flash_color=(255, 255, 255)):
    """amt: 0 (far from cut) .. 1 (at the cut)."""
    amt = max(0.0, min(1.0, amt)) ** 1.6
    d = 1 if idx % 2 else -1
    if kind == "whip":
        return fx_whip(f, amt, -d if out_going else d)
    if kind == "zoom":
        return zoom_blur(_affine(f, 1 + (0.35 if out_going else 0.25) * amt), 0.25 * amt)
    if kind == "tilt":
        return fx_tilt(f, amt, d if out_going else -d)
    if kind == "flash":
        return f if out_going else fx_flash(f, 1 - amt, 1.0, color=flash_color)
    if kind == "dip":
        # one or two pure-black frames on the cut
        return np.zeros_like(f) if (not out_going and amt > 0.45) else f
    return f

# ---------------------------------------------------------------- apply

def cmd_apply(args):
    r = Reader(args.input)
    w, h = (map(int, args.size.lower().split("x"))) if args.size else (r.w, r.h)
    fps = r.fps
    events = [parse_fx(s) for s in args.fx or []]
    audio = args.music or (args.input if has_audio(args.input) else None)
    if args.auto_beats:
        if not audio:
            sys.exit("--auto-beats needs audio (input has none; pass --music)")
        b = detect_beats(audio, 0, r.dur)
        print(f"[animefx] tempo {b['tempo']} BPM, {len(b['beats'])} beats", file=sys.stderr)
        for t, s in zip(b["beats"], b["strong"]):
            if s:
                events += [{"type": "zoom", "t": t, "s": 0.8, "dur": 0.3},
                           {"type": "shake", "t": t, "s": 0.8, "dur": 0.35},
                           {"type": "rgb", "t": t, "s": 0.7, "dur": 0.18}]
            else:
                events.append({"type": "shake", "t": t, "s": 0.3, "dur": 0.25})
    texts = [parse_text(s, w, h, args.font) for s in args.text or []]
    overlays = [Overlay(p, w, h, args.overlay_opacity) for p in args.overlay or []]
    look = Look(w, h, args.grade, args.glow, args.vignette, args.letterbox, args.grain)
    out = Writer(args.out, w, h, fps, audio=audio, duration=r.dur, fade_out=0)
    nf = int(r.dur * fps)
    for n in range(nf):
        t = n / fps
        f = r.frame_at(t)
        f = fill(f, w, h) if (f.shape[1], f.shape[0]) != (w, h) else f
        f = apply_events(f, t, events)
        for o in overlays:
            f = o.apply(f, t)
        f = look(f)
        for tx in texts:
            f = tx.apply(f, t)
        out.write(f)
    out.close()
    print(f"[animefx] done -> {args.out}", file=sys.stderr)

# ---------------------------------------------------------------- analyse

def cmd_analyse(args):
    from scenedetect import detect, AdaptiveDetector
    for path in args.videos:
        w, h, fps, dur = probe(path)
        cuts = [s[0].seconds for s in detect(path, AdaptiveDetector(adaptive_threshold=2.5,
                                                                     min_scene_len=4))[1:]]
        cap = cv2.VideoCapture(path)
        luma, sat, edges = [], [], []
        while True:
            ok, f = cap.read()
            if not ok:
                break
            s = cv2.resize(f, (160, 90))
            g = cv2.cvtColor(s, cv2.COLOR_BGR2GRAY).astype(np.float32)
            luma.append(g.mean())
            sat.append(cv2.cvtColor(s, cv2.COLOR_BGR2HSV)[..., 1].mean())
            edges.append(cv2.Laplacian(g, cv2.CV_32F).var())
        luma, edges = np.array(luma), np.array(edges)
        flashes = int(sum(1 for i in range(2, len(luma) - 2)
                          if luma[i] > 170 and luma[i] - np.median(luma[max(0, i - 6):i + 7]) > 45))
        res = {"file": os.path.basename(path), "duration": round(dur, 1), "cuts": len(cuts),
               "cuts_per_s": round(len(cuts) / dur, 2),
               "median_shot_s": round(float(np.median(np.diff([0] + cuts + [dur]))), 2),
               "flash_frames": flashes, "mean_saturation": round(float(np.mean(sat)), 1),
               "blurred_frame_frac": round(float((edges < 0.35 * np.median(edges)).mean()), 2)}
        if has_audio(path):
            b = detect_beats(path)
            res["tempo"] = b["tempo"]
            on = np.array(b["onsets"] + b["beats"])
            if len(cuts) and len(on):
                res["cuts_on_beat"] = round(float(np.mean([np.min(np.abs(on - c)) < 0.06 for c in cuts])), 2)
        print(json.dumps(res))

# ---------------------------------------------------------------- cli

def main():
    ap = argparse.ArgumentParser(prog="animefx", description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    b = sub.add_parser("beats", help="print tempo and beat times as JSON")
    b.add_argument("song")
    b.add_argument("--start", type=float, default=0)
    b.add_argument("--duration", type=float)

    look_args = argparse.ArgumentParser(add_help=False)
    look_args.add_argument("--fx", action="append", metavar="TYPE@T[:STRENGTH[:DUR]]",
                           help=f"timed effect; TYPE in {', '.join(EVENT_FX)} (repeatable)")
    look_args.add_argument("--text", action="append", metavar="TEXT@T[:DUR[:Y]]",
                           help="kinetic pop-in text; Y is 0..1 vertical position (repeatable)")
    look_args.add_argument("--font", help="TTF/OTF font for --text")
    look_args.add_argument("--overlay", action="append", metavar="VIDEO",
                           help="screen-blend overlay clip, e.g. fire/lightning/particles (repeatable)")
    look_args.add_argument("--overlay-opacity", type=float, default=0.8)

    e = sub.add_parser("edit", parents=[look_args], help="beat-synced montage from clips + music")
    e.add_argument("--music", required=True)
    e.add_argument("--clips", nargs="+", required=True, metavar="CLIP[@START-END]")
    e.add_argument("--out", required=True)
    e.add_argument("--style", choices=STYLES, default="hype")
    e.add_argument("--start", type=float, default=0, help="song start offset (s)")
    e.add_argument("--duration", type=float, help="edit length (s); default whole song")
    e.add_argument("--size", default="1080x1920", help="WxH, default 1080x1920 (Reels/Shorts)")
    e.add_argument("--fps", type=int, default=30)
    e.add_argument("--cut-every", type=int, help="cut every N beats (default: auto ~0.55s shots)")
    e.add_argument("--transition", type=float, default=0.2, help="transition length (s)")
    e.add_argument("--grade", choices=["vivid", "tealorange", "crimson", "gothic", "cold", "mono", "none"])
    e.add_argument("--glow", type=float)
    e.add_argument("--velocity", type=float, help="speed-ramp depth 0..0.9")
    e.add_argument("--speed", type=float, help="average playback speed of source clips")
    e.add_argument("--fade-out", type=float, default=0.8)
    e.add_argument("--no-letterbox", action="store_true")
    e.add_argument("--shuffle", action="store_true")
    e.add_argument("--seed", type=int, default=7)
    e.add_argument("--transitions", help="comma list cycled per cut: cut,whip,zoom,tilt,flash,dip")
    e.add_argument("--beat-fx", help="comma list of effects on strong beats ('' for none)")
    e.add_argument("--offbeat-shake", type=float)
    e.add_argument("--no-invert", action="store_true")
    e.add_argument("--grade-switch", action="append", metavar="T:GRADE",
                   help="change grade from time T, e.g. 4.5:gothic (repeatable)")
    e.add_argument("--clarity", type=float, default=0.0, help="local contrast 0..1 (muscle definition)")
    e.add_argument("--sharpen", type=float, default=0.5)
    e.add_argument("--push", type=float, default=0.0, help="slow push-in per shot, e.g. 0.05")
    e.add_argument("--grain", type=float)
    e.add_argument("--vignette", type=float)

    a = sub.add_parser("apply", parents=[look_args], help="add effects/looks to an existing video")
    a.add_argument("input")
    a.add_argument("--out", required=True)
    a.add_argument("--music", help="replace audio with this track")
    a.add_argument("--auto-beats", action="store_true", help="add zoom/shake/rgb hits on detected beats")
    a.add_argument("--size")
    a.add_argument("--grade", default="vivid", choices=["vivid", "tealorange", "crimson", "gothic", "cold", "mono", "none"])
    a.add_argument("--glow", type=float, default=0.35)
    a.add_argument("--vignette", type=float, default=0.3)
    a.add_argument("--grain", type=float, default=0.0)
    a.add_argument("--letterbox", action="store_true")

    n = sub.add_parser("analyse", help="edit-style statistics for reference videos")
    n.add_argument("videos", nargs="+")

    args = ap.parse_args()
    if args.cmd == "beats":
        print(json.dumps(detect_beats(args.song, args.start, args.duration)))
    elif args.cmd == "edit":
        cmd_edit(args)
    elif args.cmd == "apply":
        cmd_apply(args)
    else:
        cmd_analyse(args)


if __name__ == "__main__":
    main()
