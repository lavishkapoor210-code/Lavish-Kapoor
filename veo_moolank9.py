"""
Lavish Astro - Moolank 9 video with Veo 3.1 (Gemini API)
Prompts are in English, the man speaks in Hindi.

SETUP (one time):
    pip install google-genai
    Get a Gemini API key from https://aistudio.google.com/apikey (billing must be on for Veo)
    Windows:  set GEMINI_API_KEY=your_key
    Mac/Linux: export GEMINI_API_KEY=your_key

RUN:
    python veo_moolank9.py my_photo.jpg

Use your garden / studio photo (the one with your face) as my_photo.jpg.
It makes 5 clips of 8 sec each (clip_1.mp4 ... clip_5.mp4) and, if ffmpeg is
installed, joins them into moolank9_final.mp4.
"""

import os
import shutil
import subprocess
import sys
import time

from google import genai
from google.genai import types

MODEL = "veo-3.1-generate-preview"   # change to "veo-3.1-fast-generate-preview" for cheaper/faster
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


def make_prompt(i: int) -> str:
    return f'{STYLE} {ACTIONS[i]} He says in Hindi: "{LINES[i]}"'


def load_image(path: str) -> types.Image:
    ext = os.path.splitext(path)[1].lower()
    mime = "image/png" if ext == ".png" else "image/jpeg"
    with open(path, "rb") as f:
        return types.Image(image_bytes=f.read(), mime_type=mime)


def generate_clip(client, image, i: int) -> str:
    out = f"clip_{i + 1}.mp4"
    if os.path.exists(out):
        print(f"[{out}] already exists, skipping")
        return out

    print(f"\n[{out}] starting...")
    operation = client.models.generate_videos(
        model=MODEL,
        prompt=make_prompt(i),
        image=image,
        config=types.GenerateVideosConfig(aspect_ratio=ASPECT),
    )
    while not operation.done:
        print("  waiting...")
        time.sleep(15)
        operation = client.operations.get(operation)

    if operation.error:
        raise RuntimeError(f"Clip {i + 1} failed: {operation.error}")

    videos = operation.response.generated_videos if operation.response else None
    if not videos:
        raise RuntimeError(
            f"Clip {i + 1}: no video returned (it may have been blocked by safety filters). "
            "Try another photo or slightly reword that line."
        )

    video = videos[0]
    client.files.download(file=video.video)
    video.video.save(out)
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
         "-c:a", "aac", "-b:a", "192k", "moolank9_final.mp4"],
        check=True,
    )
    print("\nDone: moolank9_final.mp4")


def main():
    if len(sys.argv) < 2:
        print("Usage: python veo_moolank9.py my_photo.jpg")
        sys.exit(1)
    if not os.environ.get("GEMINI_API_KEY"):
        print("Please set GEMINI_API_KEY first.")
        sys.exit(1)

    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    image = load_image(sys.argv[1])

    clips = [generate_clip(client, image, i) for i in range(len(LINES))]
    join_clips(clips)


if __name__ == "__main__":
    main()
