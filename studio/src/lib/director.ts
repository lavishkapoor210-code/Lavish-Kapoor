import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { ProjectError } from "./projects";
import { StoryboardDraftSchema, type StoryboardDraft } from "./storyboard-schema";
import type { ProjectManifest } from "./types";

export const DIRECTOR_MODEL = "claude-opus-5-5";

export function directorConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

async function productionProfile(): Promise<string> {
  const file = path.resolve(/*turbopackIgnore: true*/ process.cwd(), "..", "ASTROLOGY_PRODUCTION_PROFILE.md");
  return fs.readFile(file, "utf8").catch(() => "");
}

const RULES = `You are the content director of Lavish Astro, a Hindi astrology video channel.
You turn an approved script into an analysis and a scene-by-scene storyboard.

Hard rules:
1. Narration: copy each scene's narration character-for-character from the script, in script order, covering the whole spoken script. Never reword, translate, shorten, add or fix anything. Drop only scene markers such as "[दृश्य 1]".
2. Facts: never invent planetary positions, transits, dates, nakshatras or predictions. Analysis lists contain only what the script states. Put any claim that needs an astronomical or astrological source in claimsToVerify.
3. Follow the production profile below. It is the house style; do not introduce a new creative direction.
4. Flow prompts are in English. Every Flow prompt must keep the generated clip free of on-screen text, subtitles and music (text is added in the edit). Presenter shots keep the presenter's face, beard, hair, sherwani and cosmic background identical to the reference image and have him speak the narration in Hindi with natural lip-sync.
5. Short format (9:16): presenter scenes with audioSource "flow" carry the story; one Flow clip holds about 8 seconds of speech, so split narration at sentence boundaries into scenes of at most ~20 Hindi words. Use "b-roll"/"graphic" with audioSource "tts" only where the presenter is off screen.
6. Long format (16:9): narration is "tts" over cosmic b-roll and graphics that illustrate exactly what is being said; presenter "flow" scenes for the opening, chapter openers and closing.
7. Visuals must match the narration of the same scene. Avoid repeating the same visual. Use hard cuts by default; use a transition only where it serves a change of section.
8. durationSec: the time needed to speak the narration (about 2.5 Hindi words per second plus a breath).
9. subtitle: the narration text for on-screen subtitles (Devanagari), unchanged.
10. referenceAssets: file paths from the project's reference images that a scene should use (presenter scenes use the presenter photo).`;

export async function generateStoryboard(project: ProjectManifest, script: string): Promise<{ draft: StoryboardDraft; model: string }> {
  if (!directorConfigured()) {
    throw new ProjectError("ANTHROPIC_API_KEY is not set on the server — add it in Settings / environment to use Claude analysis.", 503);
  }
  const client = new Anthropic();
  const profile = await productionProfile();

  const stream = client.beta.messages.stream({
    model: DIRECTOR_MODEL,
    max_tokens: 64000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "high", format: betaZodOutputFormat(StoryboardDraftSchema) },
    system: [
      { type: "text", text: RULES },
      { type: "text", text: `# Production profile\n\n${profile}`, cache_control: { type: "ephemeral" } },
    ],
    messages: [
      {
        role: "user",
        content: [
          `Project: ${project.title}`,
          `Topic: ${project.topic || "—"}`,
          `Video type: ${project.videoType}`,
          `Format: ${project.format} (${project.output.width}x${project.output.height})`,
          `Voice: ${project.voice.provider}`,
          `Visual style: ${project.visualStyle}`,
          `Reference images: ${project.referenceImages.join(", ") || "none"}`,
          "",
          "<script>",
          script,
          "</script>",
        ].join("\n"),
      },
    ],
  });
  const message = await stream.finalMessage();

  if (message.stop_reason === "refusal") {
    throw new ProjectError(`Claude declined this request (${message.stop_details?.category ?? "no category"}).`, 422);
  }
  if (message.stop_reason === "max_tokens") {
    throw new ProjectError("The storyboard was cut off (output limit). Split the script into parts and analyse each.", 422);
  }
  const draft = message.parsed_output;
  if (!draft) throw new ProjectError("Claude's reply could not be parsed as a storyboard.", 502);
  return { draft, model: message.model };
}
