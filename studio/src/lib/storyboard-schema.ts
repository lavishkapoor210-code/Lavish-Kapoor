import { z } from "zod";

/** What Claude extracts from a script. Lists hold only what the script itself says. */
export const AnalysisSchema = z.object({
  mainTopic: z.string(),
  concepts: z.array(z.string()),
  zodiacSigns: z.array(z.string()),
  planets: z.array(z.string()),
  houses: z.array(z.string()),
  nakshatras: z.array(z.string()),
  importantDates: z.array(z.string()).describe("Only dates written in the script. Never computed or added."),
  emotionalTone: z.string(),
  storyProgression: z.array(z.string()).describe("The script's beats in order."),
  keywords: z.array(z.string()).describe("Hindi terms worth on-screen emphasis."),
  claimsToVerify: z
    .array(z.string())
    .describe("Astrological/astronomical claims in the script that need a verified source before publishing."),
  notes: z.string(),
});
export type Analysis = z.infer<typeof AnalysisSchema>;

export const ShotType = z.enum(["presenter", "b-roll", "graphic"]);
export const AudioSource = z.enum(["flow", "tts"]);

/** One storyboard scene: the 12 fields of the brief plus shot type and audio source. */
export const SceneDraftSchema = z.object({
  number: z.number().int().min(1),
  narration: z.string().describe("Copied verbatim from the script. Never reworded."),
  durationSec: z.number().min(1).max(60),
  shotType: ShotType,
  audioSource: AudioSource,
  visual: z.string(),
  flowPrompt: z.string().describe("English prompt for Google Flow."),
  camera: z.string(),
  lighting: z.string(),
  environment: z.string(),
  soundEffects: z.string(),
  transition: z.string(),
  subtitle: z.string().describe("Devanagari subtitle text for this scene, taken from the narration."),
  referenceAssets: z.array(z.string()),
});
export type SceneDraft = z.infer<typeof SceneDraftSchema>;

export const StoryboardDraftSchema = z.object({
  analysis: AnalysisSchema,
  scenes: z.array(SceneDraftSchema).min(1),
});
export type StoryboardDraft = z.infer<typeof StoryboardDraftSchema>;
