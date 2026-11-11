"""
Lavish Astro - Moolank 9 talking video with Gemini (Gemini API)
Prompts are in English, the man speaks in Hindi.

SETUP (one time):
    pip install google-genai
    Get a Gemini API key from https://aistudio.google.com/apikey
    Billing must be ON for that key's project - without it Google answers
    RESOURCE_EXHAUSTED (no free quota for video).
    Windows:  set GEMINI_API_KEY=your_key
    Mac/Linux: export GEMINI_API_KEY=your_key

RUN:
    python veo_moolank9.py my_photo.jpg --logo lavish_astro_logo.png

Use your garden / studio photo (the one with your face) as my_photo.jpg.
It makes 5 clips of 8 sec each (clip_1.mp4 ... clip_5.mp4) and, if ffmpeg is
installed, joins them into moolank9_final.mp4, then adds the text overlays and
logo -> moolank9_branded.mp4.

USING GOOGLE FLOW INSTEAD (labs.google/flow, no API key needed):
    python veo_moolank9.py my_photo.jpg --flow
This writes my_photo_9x16.jpg and prints the 5 prompts. In Flow, use
"Frames to Video" with that photo as the first frame, 9:16, one prompt per
clip, and download them as clip_1.mp4 ... clip_5.mp4 into this folder. Then run
    python veo_moolank9.py my_photo.jpg --logo lavish_astro_logo.png
and it joins them and adds the overlays (no API key needed when all 5 exist).

Re-running skips clips that already exist, so a failed clip can be retried
without paying for the others again. To only redo the overlays:
    python veo_moolank9.py my_photo.jpg --logo lavish_astro_logo.png --overlay-only

The overlays need a font with Hindi letters. Found automatically on Windows
(Nirmala UI), Mac (Kohinoor) and Linux (Noto Sans Devanagari / FreeSans);
otherwise pass one with --font path/to/font.ttf
"""

import argparse
import base64
import mimetypes
import os
import shutil
import subprocess
import sys
import time

from google import genai

# Video model on the Gemini API. Veo (generate_videos) only works on Vertex AI
# in current google-genai, so this uses Gemini Omni through the Interactions API.
# If Google renames it, check the list at https://ai.google.dev/gemini-api/docs/models
MODEL = "gemini-omni-flash-preview"
DURATION = "8s"
ASPECT = "9:16"                      # vertical, for Reels / Shorts

# ---------- Same look in every clip (English) ----------
STYLE = (
    "The man in the image speaks directly to the camera in Hindi, in a warm, confident "
    "Indian male voice with clear, natural Hindi pronunciation, like a numerology expert "
    "sharing a secret with his audience. Perfect lip-sync. Keep his face, beard, hairstyle, "
    "clothes and the background exactly the same as in the image. Natural open-palm hand "
    "gestures at chest level, soft blinking, small nods. Steady camera with a very slow "
    "subtle push-in. Vertical 9:16, warm cinematic lighting. No background music, "
    "no subtitles, no text on screen."
)

# ---------- Hindi dialogue, split into ~8 sec parts ----------
LINES = [
    "रुकिए! अगर आपका जन्म 9, 18 या 27 तारीख को हुआ है, तो ये वीडियो सिर्फ़ आपके लिए है।",
    "आपका मूलांक है 9, और आपके ग्रह हैं मंगल — सेनापति। आप लड़ाई से नहीं डरते, और हारना आपको पसंद नहीं।",
    "लोग आपको बाहर से सख़्त समझते हैं, पर अंदर से आप सबसे बड़े दिल वाले हो। लेकिन एक गलती आपको बार-बार पीछे खींचती है — जल्दबाज़ी और गुस्सा।",
    "उपाय सुनिए: हर मंगलवार हनुमान जी को लाल फूल चढ़ाइए और किसी ज़रूरतमंद को मीठा खिलाइए।",
    "लकी नंबर — 9, लकी रंग — लाल। अपना मूलांक जानने के लिए कैप्शन पढ़िए, और फ़ॉलो कीजिए Lavish Astro।",
]

# Optional per-clip action (English) to add variety
ACTIONS = [
    "He leans slightly forward at the start, eyebrows raised, as if stopping the viewer.",
    "He raises one finger when he says the number, then speaks with pride.",
    "He speaks warmly, then turns a little serious and gently shakes his head when warning.",
    "He brings his palms together respectfully while describing the remedy.",
    "He smiles, points gently toward the bottom of the screen for the caption, and ends with a nod.",
]


# ---------- Text overlays (burned in after joining) ----------
TOP_TEXT = "मूलांक 9 · मंगल"
BOTTOM_TEXT = "अपना मूलांक जानने के लिए कैप्शन पढ़ें"
JOINED = "moolank9_final.mp4"
BRANDED = "moolank9_branded.mp4"

FONT_CANDIDATES = [
    "fonts/NotoSansDevanagari-Bold.ttf",                      # optional, next to this script
    "C:/Windows/Fonts/NirmalaB.ttf",                          # Windows 10
    "C:/Windows/Fonts/Nirmala.ttc",                           # Windows 11
    "C:/Windows/Fonts/Nirmala.ttf",
    "C:/Windows/Fonts/mangal.ttf",
    "/System/Library/Fonts/Kohinoor.ttc",                     # macOS
    "/System/Library/Fonts/Supplemental/DevanagariMT.ttc",
    "/usr/share/fonts/truetype/noto/NotoSansDevanagari-Bold.ttf",
    "/usr/share/fonts/opentype/noto/NotoSansDevanagari-Bold.ttf",
    "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
]


def make_prompt(i: int) -> str:
    return f'{STYLE} {ACTIONS[i]} He says in Hindi: "{LINES[i]}"'


def load_image(path: str) -> dict:
    """Photo as an Interactions API image block (cropped to 9:16 first)."""
    mime = mimetypes.guess_type(path)[0] or "image/jpeg"
    if mime not in ("image/jpeg", "image/png", "image/webp"):
        sys.exit(f"{path}: use a JPG, PNG or WEBP photo (got {mime}).")
    path = crop_to_vertical(path)
    mime = mimetypes.guess_type(path)[0] or "image/jpeg"
    with open(path, "rb") as f:
        data = base64.b64encode(f.read()).decode()
    return {"type": "image", "data": data, "mime_type": mime}


def crop_to_vertical(path: str) -> str:
    """The photo becomes the first frame. A landscape photo in a 9:16 video
    gets squeezed or invented at the edges, so centre-crop it to 9:16 first."""
    from PIL import Image

    img = Image.open(path)
    w, h = img.size
    if abs(w / h - 9 / 16) < 0.02:
        return path
    if w / h > 9 / 16:                       # too wide: keep the middle
        nw = round(h * 9 / 16)
        box = ((w - nw) // 2, 0, (w - nw) // 2 + nw, h)
    else:                                    # too tall: keep the top (the face)
        nh = round(w * 16 / 9)
        box = (0, 0, w, nh)
    out = os.path.splitext(path)[0] + "_9x16.jpg"
    img.crop(box).convert("RGB").save(out, quality=95)
    print(f"Photo is {w}x{h}, cropped to 9:16 -> {out}")
    return out


def status_of(interaction) -> str:
    return str(interaction.status).lower().split(".")[-1]


def generate_clip(client, image, i: int) -> str:
    out = f"clip_{i + 1}.mp4"
    if os.path.exists(out):
        print(f"[{out}] already exists, skipping")
        return out

    print(f"\n[{out}] starting...")
    for attempt in range(4):
        r = client.interactions.create(
            model=MODEL,
            api_version="v1beta",
            input=[{"type": "text", "text": make_prompt(i)}, image],
            response_modalities=["video"],
            response_format={"type": "video", "aspect_ratio": ASPECT,
                             "duration": DURATION, "delivery": "inline"},
            generation_config={"video_config": {"task": "image_to_video"}},
            background=True,
        )
        while status_of(r) not in ("completed", "failed", "cancelled"):
            print("  waiting...")
            time.sleep(15)
            r = client.interactions.get(id=r.id)

        if status_of(r) == "completed":
            break
        err = "; ".join(f"{e.code}: {e.message}" for e in (r.errors or [])) or status_of(r)
        if "RESOURCE_EXHAUSTED" in err and attempt == 0:
            print("  RESOURCE_EXHAUSTED - if this repeats, turn on billing for the key's "
                  "project at https://aistudio.google.com (free tier has no video quota).")
        if ("RESOURCE_EXHAUSTED" in err or "UNAVAILABLE" in err) and attempt < 3:
            print(f"  {err} - retrying in 60s...")
            time.sleep(60)
            continue
        raise RuntimeError(f"Clip {i + 1} failed: {err}")

    video = r.output_video
    if not video or not (video.data or video.uri):
        raise RuntimeError(
            f"Clip {i + 1}: no video returned (it may have been blocked by safety filters). "
            "Try another photo or slightly reword that line."
        )
    if video.data:
        data = video.data
        with open(out, "wb") as f:
            f.write(base64.b64decode(data) if isinstance(data, str) else data)
    else:
        import urllib.request
        req = urllib.request.Request(video.uri, headers={"x-goog-api-key": client._api_client.api_key})
        with urllib.request.urlopen(req) as resp, open(out, "wb") as f:
            shutil.copyfileobj(resp, f)
    print(f"  saved {out}")
    return out


def join_clips(clips):
    if not shutil.which("ffmpeg"):
        print("\nffmpeg not found - clips are ready, join them in any video editor (CapCut, InShot).")
        return
    with open("clips.txt", "w", encoding="utf-8") as f:
        for c in clips:
            f.write(f"file '{os.path.abspath(c)}'\n")
    subprocess.run(
        ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", "clips.txt",
         "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
         "-c:a", "aac", "-b:a", "192k", JOINED],
        check=True,
    )
    print(f"\nJoined: {JOINED}")
    return JOINED


def find_font(user_font=None):
    here = os.path.dirname(os.path.abspath(__file__))
    for f in ([user_font] if user_font else []) + FONT_CANDIDATES:
        path = f if os.path.isabs(f) or f.startswith("C:") else os.path.join(here, f)
        if os.path.exists(path):
            return path
    sys.exit("No Hindi (Devanagari) font found - pass one with --font path/to/font.ttf")


def video_size(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=width,height", "-of", "csv=p=0", path],
        check=True, capture_output=True, text=True,
    ).stdout.strip()
    w, h = out.split(",")[:2]
    return int(w), int(h)


def render_overlay(w, h, logo, font_path, out_png):
    """Draw logo + both Hindi lines on one transparent full-frame PNG.

    Pillow (with its built-in Raqm text shaping) is used instead of ffmpeg's
    drawtext, which breaks Hindi matras (मूलांक came out as मूलंक़).
    """
    from PIL import Image, ImageDraw, ImageFont, features

    if not features.check("raqm"):
        sys.exit("Pillow can't shape Hindi text here - run: pip install --upgrade pillow")
    layout = ImageFont.Layout.RAQM

    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    y = round(h * 0.05)

    if logo:
        img = Image.open(logo).convert("RGBA")
        img.thumbnail((round(w * 0.5), round(h * 0.075)), Image.LANCZOS)
        canvas.alpha_composite(img, ((w - img.width) // 2, y))
        y += img.height + round(h * 0.015)

    def banner(text, top, size, color):
        # shrink the font until the line fits within 90% of the width
        while True:
            font = ImageFont.truetype(font_path, size, layout_engine=layout)
            l, t, r, b = draw.textbbox((0, 0), text, font=font, stroke_width=3)
            if r - l <= w * 0.9 - 2 * size * 0.4 or size <= 16:
                break
            size -= 2
        pad = round(size * 0.4)
        x = (w - (r - l)) // 2 - l
        draw.rounded_rectangle(
            (x + l - pad, top - pad, x + r + pad, top + (b - t) + pad),
            radius=pad, fill=(0, 0, 0, 115),
        )
        draw.text((x, top - t), text, font=font, fill=color,
                  stroke_width=3, stroke_fill=(0, 0, 0, 200))

    banner(TOP_TEXT, y + round(w * 0.03), round(w * 0.085), (255, 213, 74, 255))
    banner(BOTTOM_TEXT, round(h * 0.78), round(w * 0.055), (255, 255, 255, 255))
    canvas.save(out_png)


def add_overlays(src, dst, logo=None, user_font=None):
    """Logo + title at the top, call-to-action at the bottom, for the whole video."""
    if not shutil.which("ffmpeg"):
        print("ffmpeg not found - can't add text overlays.")
        return
    w, h = video_size(src)
    render_overlay(w, h, logo, find_font(user_font), "overlay.png")
    subprocess.run(
        ["ffmpeg", "-y", "-i", src, "-i", "overlay.png",
         "-filter_complex", "[0:v][1:v]overlay=0:0[v]", "-map", "[v]", "-map", "0:a?",
         "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-c:a", "copy", dst],
        check=True,
    )
    print(f"\nDone: {dst}")


def main():
    ap = argparse.ArgumentParser(description="Lavish Astro Moolank 9 talking video (Gemini)")
    ap.add_argument("photo", help="your photo (JPG/PNG)")
    ap.add_argument("--logo", help="Lavish Astro logo, ideally a transparent PNG")
    ap.add_argument("--font", help="font file with Hindi letters (auto-detected if omitted)")
    ap.add_argument("--flow", action="store_true",
                    help="print the 5 prompts + make the 9:16 photo for Google Flow, then stop")
    ap.add_argument("--overlay-only", action="store_true",
                    help=f"skip video generation, just add overlays to an existing {JOINED}")
    args = ap.parse_args()

    for f in (args.photo, args.logo):
        if f and not os.path.exists(f):
            sys.exit(f"File not found: {f}")

    if args.flow:
        crop_to_vertical(args.photo)
        for i in range(len(LINES)):
            print(f"\n----- clip_{i + 1}.mp4 -----\n{make_prompt(i)}")
        return

    if args.logo is None:
        print("Note: no --logo given, the video will have text overlays only.")
    clip_names = [f"clip_{i + 1}.mp4" for i in range(len(LINES))]
    if args.overlay_only:
        if not os.path.exists(JOINED):
            sys.exit(f"{JOINED} not found - run without --overlay-only first.")
        joined = JOINED
    elif all(os.path.exists(c) for c in clip_names):
        print("All 5 clips found - joining them (no generation needed).")
        joined = join_clips(clip_names)
    else:
        if not os.environ.get("GEMINI_API_KEY"):
            missing = ", ".join(c for c in clip_names if not os.path.exists(c))
            sys.exit(f"Missing {missing}. Set GEMINI_API_KEY to generate them, "
                     "or make them in Google Flow (see --flow).")
        client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
        image = load_image(args.photo)
        clips = [generate_clip(client, image, i) for i in range(len(LINES))]
        joined = join_clips(clips)

    if joined:
        add_overlays(joined, BRANDED, args.logo, args.font)


if __name__ == "__main__":
    main()
