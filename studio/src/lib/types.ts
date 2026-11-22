export type VideoFormat = "short" | "long";
export type VoiceProviderId = "flow-native" | "elevenlabs" | "sarvam";
export type ApprovalState = "pending" | "approved" | "rejected";

export type ProjectStatus =
  | "draft"
  | "script"
  | "storyboard"
  | "generating"
  | "editing"
  | "rendering"
  | "review"
  | "completed";

export const PROJECT_STATUSES: ProjectStatus[] = [
  "draft",
  "script",
  "storyboard",
  "generating",
  "editing",
  "rendering",
  "review",
  "completed",
];

/** Folders every project gets (IMPLEMENTATION_PLAN.md, "Project file organization"). */
export const PROJECT_FOLDERS = [
  "script",
  "storyboard",
  "flow-prompts",
  "reference-images",
  "generated-videos",
  "voiceovers",
  "subtitles",
  "music",
  "sound-effects",
  "previews",
  "renders",
  "logs",
] as const;

export interface OutputPreset {
  width: number;
  height: number;
  fps: number;
  videoCodec: "h264";
  audioCodec: "aac";
  container: "mp4";
  videoBitrate?: string;
}

export const OUTPUT_PRESETS: Record<VideoFormat, OutputPreset> = {
  short: { width: 1080, height: 1920, fps: 30, videoCodec: "h264", audioCodec: "aac", container: "mp4" },
  long: { width: 1920, height: 1080, fps: 30, videoCodec: "h264", audioCodec: "aac", container: "mp4" },
};

export interface SceneFile {
  path: string; // relative to the project folder
  addedAt: string;
  verified?: boolean;
  durationSec?: number;
  note?: string;
}

/** Filled in by Phase 3 (storyboard) and later phases. */
export interface Scene {
  id: string;
  number: number;
  narration: string;
  durationSec?: number;
  visual?: string;
  flowPrompt?: string;
  camera?: string;
  lighting?: string;
  environment?: string;
  soundEffects?: string;
  transition?: string;
  subtitle?: string;
  referenceAssets?: string[];
  shotType?: "presenter" | "b-roll" | "graphic";
  audioSource?: "flow" | "tts";
  /** narration no longer matches the script word-for-word (a human edit) */
  narrationEdited?: boolean;
  takes: SceneFile[];
  selectedTake?: string;
  voice: SceneFile[];
  approval: ApprovalState;
}

export interface HistoryEntry {
  at: string;
  event: string;
  detail?: string;
}

export interface ProjectManifest {
  schemaVersion: 1;
  slug: string;
  title: string;
  topic: string;
  videoType: string;
  format: VideoFormat;
  output: OutputPreset;
  voice: { provider: VoiceProviderId; voiceId?: string };
  visualStyle: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  script: { file?: string; approval: ApprovalState };
  storyboard: {
    approval: ApprovalState;
    version?: number;
    source?: "claude" | "import" | "edit";
    file?: string;
    updatedAt?: string;
  };
  referenceImages: string[];
  scenes: Scene[];
  renders: SceneFile[];
  finalApproval: ApprovalState;
  history: HistoryEntry[];
}
