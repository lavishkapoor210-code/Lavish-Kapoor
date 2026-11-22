import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { PROJECTS_DIR } from "./config";
import {
  OUTPUT_PRESETS,
  PROJECT_FOLDERS,
  type ProjectManifest,
  type VideoFormat,
  type VoiceProviderId,
} from "./types";

const MANIFEST = "project.json";
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,79}$/;

export class ProjectError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/** ASCII slug for folder names; Hindi-only titles fall back to a dated name. */
export function slugify(title: string): string {
  const base = title
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || `project-${new Date().toISOString().slice(0, 10)}`;
}

function projectDir(slug: string): string {
  if (!SLUG_RE.test(slug)) throw new ProjectError(`Invalid project id: ${slug}`, 404);
  return path.join(PROJECTS_DIR, slug);
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/** Write via temp file + rename so a crash never leaves a half-written manifest. */
async function writeJsonAtomic(file: string, data: unknown): Promise<void> {
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2) + "\n", "utf8");
  await fs.rename(tmp, file);
}

export interface NewProjectInput {
  title: string;
  topic: string;
  videoType: string;
  format: VideoFormat;
  voiceProvider: VoiceProviderId;
  voiceId?: string;
  visualStyle: string;
  script?: string;
  referenceImages?: { name: string; data: Buffer }[];
}

const SAFE_FILE_RE = /[^a-zA-Z0-9._-]+/g;
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

export async function createProject(input: NewProjectInput): Promise<ProjectManifest> {
  const title = input.title.trim();
  if (!title) throw new ProjectError("Project title is required.");
  if (!["short", "long"].includes(input.format)) throw new ProjectError("Format must be short or long.");

  await fs.mkdir(PROJECTS_DIR, { recursive: true });
  const base = slugify(title);
  let slug = base;
  for (let n = 2; await exists(path.join(PROJECTS_DIR, slug)); n++) slug = `${base}-${n}`;

  const dir = projectDir(slug);
  await fs.mkdir(dir);
  await Promise.all(PROJECT_FOLDERS.map((f) => fs.mkdir(path.join(dir, f))));

  const now = new Date().toISOString();
  const manifest: ProjectManifest = {
    schemaVersion: 1,
    slug,
    title,
    topic: input.topic.trim(),
    videoType: input.videoType.trim(),
    format: input.format,
    output: OUTPUT_PRESETS[input.format],
    voice: { provider: input.voiceProvider, voiceId: input.voiceId?.trim() || undefined },
    visualStyle: input.visualStyle.trim(),
    status: "draft",
    createdAt: now,
    updatedAt: now,
    script: { approval: "pending" },
    storyboard: { approval: "pending" },
    referenceImages: [],
    scenes: [],
    renders: [],
    finalApproval: "pending",
    history: [{ at: now, event: "created" }],
  };

  if (input.script?.trim()) {
    await fs.writeFile(path.join(dir, "script", "script.txt"), input.script.trim() + "\n", "utf8");
    manifest.script.file = "script/script.txt";
    manifest.status = "script";
    manifest.history.push({ at: now, event: "script imported", detail: `${input.script.trim().length} characters` });
  }

  for (const img of input.referenceImages ?? []) {
    const ext = path.extname(img.name).toLowerCase();
    if (!IMAGE_EXT.has(ext)) throw new ProjectError(`${img.name}: only JPG, PNG or WEBP images.`);
    const name = path.basename(img.name, ext).replace(SAFE_FILE_RE, "_").slice(0, 60) + ext;
    let target = `reference-images/${name}`;
    for (let n = 2; manifest.referenceImages.includes(target); n++) {
      target = `reference-images/${path.basename(name, ext)}_${n}${ext}`;
    }
    await fs.writeFile(path.join(dir, target), img.data);
    manifest.referenceImages.push(target);
  }
  if (manifest.referenceImages.length) {
    manifest.history.push({ at: now, event: "reference images added", detail: manifest.referenceImages.join(", ") });
  }

  await writeJsonAtomic(path.join(dir, MANIFEST), manifest);
  return manifest;
}

export async function getProject(slug: string): Promise<ProjectManifest | null> {
  const file = path.join(projectDir(slug), MANIFEST);
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as ProjectManifest;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

export async function listProjects(): Promise<ProjectManifest[]> {
  let entries: string[];
  try {
    entries = await fs.readdir(PROJECTS_DIR);
  } catch {
    return [];
  }
  const out: ProjectManifest[] = [];
  for (const name of entries) {
    if (!SLUG_RE.test(name)) continue;
    const p = await getProject(name).catch(() => null);
    if (p) out.push(p);
  }
  return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Read-modify-write of a manifest; the mutator records what it changed in history. */
export async function updateProject(
  slug: string,
  event: string,
  mutate: (p: ProjectManifest) => void,
): Promise<ProjectManifest> {
  const p = await getProject(slug);
  if (!p) throw new ProjectError("Project not found.", 404);
  mutate(p);
  p.updatedAt = new Date().toISOString();
  p.history.push({ at: p.updatedAt, event });
  await writeJsonAtomic(path.join(projectDir(slug), MANIFEST), p);
  return p;
}

export async function readScript(p: ProjectManifest): Promise<string | null> {
  if (!p.script.file) return null;
  return fs.readFile(path.join(projectDir(p.slug), p.script.file), "utf8");
}

export async function folderSummary(slug: string): Promise<{ name: string; files: number }[]> {
  const dir = projectDir(slug);
  return Promise.all(
    PROJECT_FOLDERS.map(async (name) => ({
      name,
      files: (await fs.readdir(path.join(dir, name)).catch(() => [])).length,
    })),
  );
}
