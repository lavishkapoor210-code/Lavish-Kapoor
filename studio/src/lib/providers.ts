import "server-only";

export interface ProviderStatus {
  id: string;
  name: string;
  role: string;
  phase: number;
  configured: boolean;
  envVar?: string;
  note: string;
}

const has = (name: string) => Boolean(process.env[name] && process.env[name]!.trim());

/** Reports only whether a secret is set — never its value. */
export function providerStatuses(): ProviderStatus[] {
  return [
    {
      id: "claude",
      name: "Claude (Anthropic API)",
      role: "Script analysis and storyboard",
      phase: 3,
      configured: has("ANTHROPIC_API_KEY"),
      envVar: "ANTHROPIC_API_KEY",
      note: "Server-side only. Output is always an editable draft for your approval.",
    },
    {
      id: "flow",
      name: "Google Flow",
      role: "Cinematic video clips",
      phase: 4,
      configured: true,
      note: "No official API. The studio exports a job pack that Claude in Chrome (or you) runs in your own logged-in Flow tab; clips are imported and verified.",
    },
    {
      id: "elevenlabs",
      name: "ElevenLabs",
      role: "Hindi narration (TTS)",
      phase: 5,
      configured: has("ELEVENLABS_API_KEY"),
      envVar: "ELEVENLABS_API_KEY",
      note: "Needs the key and network access to api.elevenlabs.io.",
    },
    {
      id: "sarvam",
      name: "Sarvam AI",
      role: "Hindi narration (TTS, Bulbul)",
      phase: 5,
      configured: has("SARVAM_API_KEY"),
      envVar: "SARVAM_API_KEY",
      note: "Needs the key and network access to api.sarvam.ai. Max 2500 characters per request.",
    },
  ];
}
