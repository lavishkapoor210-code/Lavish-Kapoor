# AI Astrology Video Production Studio – Implementation Plan

Follows `ASTROLOGY_PRODUCTION_PROFILE.md`. Built in phases; each phase is
tested before the next starts. Existing `veo_moolank9.py` stays working.

## Verified provider facts (Nov 2026)

| Provider | How we integrate | Notes |
| --- | --- | --- |
| **Google Flow** | **Browser-assisted via Claude in Chrome, with manual fallback.** The studio exports a *Flow job pack* per project (`flow-prompts/jobs.json` + `FLOW_JOBS.md` + reference frames): for each scene the mode (Frames to Video / Text to Video), aspect ratio, reference image, exact prompt, number of takes and the file name to save as. A Claude in Chrome session on the owner's computer works through the pack inside the owner's own logged-in Flow tab; the owner can do the same by hand. Downloaded MP4s are uploaded/imported; the studio verifies each file (ffprobe: video stream, duration, resolution, audio) before marking the take done. | Google publishes no Flow API. Claude in Chrome runs in the owner's own browser and session, so no login, CAPTCHA or limit is bypassed; it stops and asks whenever Flow asks for a confirmation, credits or sign-in. Third-party Flow wrappers that take over the Google account are not used. Claude in Chrome is not reachable from the cloud session, so the pack is the hand-off. |
| Gemini API video (optional, later) | Server-side provider behind the same interface | Needs billing on the key's project; current key has no video quota. |
| **ElevenLabs** | REST TTS, key in `ELEVENLABS_API_KEY` (server only) | Host `api.elevenlabs.io` is currently blocked by this environment's network rules; key + host are added when Phase 5 starts. |
| **Sarvam AI** | REST TTS `bulbul` models, `hi-IN`, ≤ 2500 chars per request, key in `SARVAM_API_KEY` | Same network note for `api.sarvam.ai`. |
| **Claude** | Script analysis + storyboard via the Anthropic API, key in `ANTHROPIC_API_KEY` (server only); output is always an editable draft | Never invents dates/transits; it only structures what the script says. |
| FFmpeg | assembly, trims, loudness, encodes, verification | system binary |
| Remotion | animated titles, subtitles, graphics compositions | headless Chromium already in the container |
| Python + Pillow/Raqm | Hindi text rendering, crops, covers (code from `veo_moolank9.py`) | FFmpeg `drawtext` mis-shapes Devanagari |

## Open decision for the owner

**Talking head vs. TTS narration.** The established Reel is a lip-synced
presenter whose voice comes from Flow. TTS voices cannot be lip-synced onto
Flow clips. Proposed default:

* Short Reels: presenter scenes keep Flow's own voice (current format);
  ElevenLabs/Sarvam only for B-roll scenes without the presenter.
* Long-form: TTS narration over cosmic B-roll, with presenter clips for the
  intro, chapter openers and outro.

Each scene in the storyboard has an `audioSource`: `flow` | `tts` so both
work.

## Architecture

```
studio/                     Next.js 16 + TypeScript + Tailwind (dashboard + API routes)
  src/app/                  pages (13 sections) and /api routes
  src/lib/                  server-only core: projects, manifest, jobs, providers
  src/lib/providers/        voice/<elevenlabs|sarvam>, video/<flow-manual|gemini>, llm/claude
  remotion/                 compositions (Phase 6+)
  py/                       Pillow/Raqm text + image utilities (Phase 6+)
projects/<slug>/            per-project folders (git-ignored: personal media)
  project.json              manifest (scenes, files, prompts history, approvals, status)
  script/ storyboard/ flow-prompts/ reference-images/ generated-videos/
  voiceovers/ subtitles/ music/ sound-effects/ previews/ renders/ logs/
library/                    shared assets (music, sfx, zodiac/planet graphics, fonts) – git-ignored media
```

* **Manifest is the source of truth**; every stage writes its result there
  before the next stage starts (resume-safe).
* **Jobs:** file-backed queue (`projects/<slug>/jobs.json`), one worker
  process, idempotency key per job (provider + scene + input hash), so a retry
  reuses a saved result instead of paying twice. Pause/resume/retry, logs in
  `logs/`, usage + cost estimates per provider.
* **Secrets:** only server-side env vars; the Settings page shows
  configured/not-configured and a connection test, never values.
* Providers implement small interfaces (`VoiceProvider`, `VideoProvider`,
  `ScriptDirector`) so each can be swapped.

## Phases

| # | Phase | Done when (tested) |
| --- | --- | --- |
| 1 | Inspect + profile + plan | `ASTROLOGY_PRODUCTION_PROFILE.md`, this file ✅ |
| 2 | Dashboard + project management | create/list/open projects in the UI; folder tree + `project.json` created; settings shows provider status; builds and runs |
| 3 | Script Studio + storyboard | paste/import script → Claude analysis → editable storyboard (12 fields per scene) → approve; Moolank 9 script reproduces its 5 beats |
| 4 | Flow Studio | Flow job pack for Claude in Chrome (prompts, reference frames, file names, step list), upload/import of Flow MP4s, ffprobe verification, versions per scene, preview, approve/regenerate |
| 5 | Voice Studio | ElevenLabs + Sarvam selector, per-section generation, real durations, replace a section, combined track |
| 6 | Editor | FFmpeg assembly + Remotion overlays: trims (incl. trailing silence), sync, titles, logo, graphics, transitions |
| 7 | Subtitles + audio | Hindi SRT/ASS from approved narration, editable, burned in with correct shaping; music library, ducking, loudness normalisation |
| 8 | Render presets | 1080×1920 and 1920×1080 H.264/AAC, fps/bitrate options, progress, retry, output verification |
| 9 | End-to-end test | real project: short and long exports from real Flow clips + real TTS, both MP4s verified |
| 10 | Optimise | caching, cost tracking, speed |

## Needed from the owner

1. Decision above (talking head vs. TTS).
2. Lavish Astro logo (PNG, transparent).
3. Reference material for formats not yet produced: a long-form script or
   video, subtitle style, music/SFX you own or have licensed, intro/outro
   if any.
4. Keys when their phase starts: Anthropic (Phase 3), ElevenLabs and/or
   Sarvam (Phase 5), entered through the environment's secret settings,
   never in chat or in files.
