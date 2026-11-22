export interface NavItem {
  href: string;
  label: string;
  phase: number;
  blurb: string;
}

/** The 13 dashboard sections. `phase` = plan phase that makes the section functional. */
export const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", phase: 2, blurb: "Overview of projects and providers." },
  { href: "/projects/new", label: "New Project", phase: 2, blurb: "Create a project and its folders." },
  { href: "/script", label: "Script Studio", phase: 3, blurb: "Import scripts; Claude analyses topic, planets, signs, tone and beats without changing the meaning." },
  { href: "/storyboard", label: "Storyboard", phase: 3, blurb: "Editable scene-by-scene storyboard with narration, visuals, Flow prompts, camera, light, sound and transitions." },
  { href: "/flow", label: "Google Flow Studio", phase: 4, blurb: "Flow job packs for Claude in Chrome, clip import, verification, takes, preview and approval." },
  { href: "/voice", label: "Voice Studio", phase: 5, blurb: "ElevenLabs / Sarvam Hindi narration per section, durations, replace and combine." },
  { href: "/editor", label: "Video Editor", phase: 6, blurb: "FFmpeg + Remotion assembly, trims, sync, titles, logo, graphics, transitions." },
  { href: "/subtitles", label: "Subtitle Editor", phase: 7, blurb: "Hindi SRT/ASS from approved narration, editable, burned in with correct shaping." },
  { href: "/audio", label: "Music & Sound", phase: 7, blurb: "Licensed / owned music and SFX library, levels, ducking, fades." },
  { href: "/renders", label: "Render Queue", phase: 8, blurb: "Short 1080×1920 and long 1920×1080 renders with progress, retry and verification." },
  { href: "/completed", label: "Completed Projects", phase: 2, blurb: "Projects marked completed." },
  { href: "/assets", label: "Asset Library", phase: 7, blurb: "Zodiac, planet, chart and cosmic assets with search and preview." },
  { href: "/settings", label: "Settings", phase: 2, blurb: "Provider status and API key configuration." },
];
