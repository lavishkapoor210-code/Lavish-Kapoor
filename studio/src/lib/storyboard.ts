import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { PROJECTS_DIR } from "./config";
import { getProject, readScript, updateProject, ProjectError } from "./projects";
import { checkNarration, type NarrationReport } from "./narration";
import { StoryboardDraftSchema, SceneDraftSchema, type Analysis, type SceneDraft, type StoryboardDraft } from "./storyboard-schema";
import type { ProjectManifest, Scene } from "./types";

export interface StoredStoryboard {
  version: number;
  source: "claude" | "import" | "edit";
  createdAt: string;
  model?: string;
  analysis: Analysis;
  report: NarrationReport;
}

const FILE = "storyboard/storyboard.json";

function dir(slug: string) {
  return path.join(PROJECTS_DIR, slug);
}

export async function readStoryboard(slug: string): Promise<StoredStoryboard | null> {
  try {
    return JSON.parse(await fs.readFile(path.join(dir(slug), FILE), "utf8"));
  } catch {
    return null;
  }
}

function toScene(d: SceneDraft, prev: Scene | undefined, narrationEdited: boolean): Scene {
  return {
    id: prev?.id ?? randomUUID(),
    number: d.number,
    narration: d.narration,
    durationSec: d.durationSec,
    shotType: d.shotType,
    audioSource: d.audioSource,
    visual: d.visual,
    flowPrompt: d.flowPrompt,
    camera: d.camera,
    lighting: d.lighting,
    environment: d.environment,
    soundEffects: d.soundEffects,
    transition: d.transition,
    subtitle: d.subtitle,
    referenceAssets: d.referenceAssets,
    narrationEdited,
    // generated footage / voice already attached to this scene survive a storyboard edit
    takes: prev?.takes ?? [],
    selectedTake: prev?.selectedTake,
    voice: prev?.voice ?? [],
    approval: "pending",
  };
}

/**
 * Validate and store a storyboard. Claude/imported drafts must quote the script
 * verbatim (rejected otherwise). Human edits may change narration; those scenes
 * are flagged `narrationEdited` and shown as differing from the script.
 */
export async function saveStoryboard(
  slug: string,
  input: unknown,
  source: StoredStoryboard["source"],
  meta: { model?: string } = {},
): Promise<{ project: ProjectManifest; storyboard: StoredStoryboard }> {
  const parsed = StoryboardDraftSchema.safeParse(input);
  if (!parsed.success) {
    throw new ProjectError("Storyboard does not match the schema: " + parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  }
  const draft: StoryboardDraft = parsed.data;
  draft.scenes.sort((a, b) => a.number - b.number);
  draft.scenes.forEach((s, i) => (s.number = i + 1));

  const project = await getProject(slug);
  if (!project) throw new ProjectError("Project not found.", 404);
  const script = await readScript(project);
  if (!script) throw new ProjectError("Import a script before creating a storyboard.");

  const report = checkNarration(script, draft.scenes);
  if (source !== "edit" && report.errors.length) {
    throw new ProjectError(
      "Rejected: narration must be copied word-for-word from the script. " + report.errors.join(" | "),
    );
  }

  const prev = await readStoryboard(slug);
  const stored: StoredStoryboard = {
    version: (prev?.version ?? 0) + 1,
    source,
    createdAt: new Date().toISOString(),
    model: meta.model,
    analysis: draft.analysis,
    report,
  };
  const d = dir(slug);
  await fs.mkdir(path.join(d, "storyboard", "versions"), { recursive: true });
  const body = JSON.stringify({ ...stored, scenes: draft.scenes }, null, 2) + "\n";
  await fs.writeFile(path.join(d, "storyboard", "versions", `v${String(stored.version).padStart(3, "0")}.json`), body);
  const tmp = path.join(d, FILE + ".tmp");
  await fs.writeFile(tmp, body);
  await fs.rename(tmp, path.join(d, FILE));

  const updated = await updateProject(slug, `storyboard v${stored.version} (${source})`, (p) => {
    const byNumber = new Map(p.scenes.map((s) => [s.number, s]));
    p.scenes = draft.scenes.map((s) => toScene(s, byNumber.get(s.number), !report.scenes.find((c) => c.number === s.number)?.inScript));
    p.storyboard = { approval: "pending", version: stored.version, source, file: FILE, updatedAt: stored.createdAt };
    if (["draft", "script"].includes(p.status)) p.status = "storyboard";
  });
  return { project: updated, storyboard: stored };
}

/** Edit one scene's fields from the UI; re-validates the whole storyboard. */
export async function editScene(slug: string, number: number, patch: Partial<SceneDraft>) {
  const project = await getProject(slug);
  const sb = await readStoryboard(slug);
  if (!project || !sb) throw new ProjectError("No storyboard to edit.", 404);
  const scenes: SceneDraft[] = project.scenes.map((s) =>
    SceneDraftSchema.parse({
      number: s.number,
      narration: s.narration,
      durationSec: s.durationSec ?? 8,
      shotType: s.shotType ?? "presenter",
      audioSource: s.audioSource ?? "flow",
      visual: s.visual ?? "",
      flowPrompt: s.flowPrompt ?? "",
      camera: s.camera ?? "",
      lighting: s.lighting ?? "",
      environment: s.environment ?? "",
      soundEffects: s.soundEffects ?? "",
      transition: s.transition ?? "",
      subtitle: s.subtitle ?? "",
      referenceAssets: s.referenceAssets ?? [],
    }),
  );
  const i = scenes.findIndex((s) => s.number === number);
  if (i < 0) throw new ProjectError(`Scene ${number} not found.`, 404);
  scenes[i] = SceneDraftSchema.parse({ ...scenes[i], ...patch, number });
  return saveStoryboard(slug, { analysis: sb.analysis, scenes }, "edit");
}

/** Storyboard approval is refused while any scene's narration differs from the script. */
export async function approveStoryboard(slug: string, approve: boolean) {
  const project = await getProject(slug);
  if (!project) throw new ProjectError("Project not found.", 404);
  if (approve) {
    if (!project.scenes.length) throw new ProjectError("No storyboard to approve.");
    if (project.script.approval !== "approved") throw new ProjectError("Approve the script first.");
    const edited = project.scenes.filter((s) => s.narrationEdited).map((s) => s.number);
    if (edited.length) {
      throw new ProjectError(
        `Scene ${edited.join(", ")}: narration differs from the approved script. Update the script itself or restore the narration first.`,
      );
    }
  }
  return updateProject(slug, approve ? "storyboard approved" : "storyboard rejected", (p) => {
    p.storyboard.approval = approve ? "approved" : "rejected";
    for (const s of p.scenes) s.approval = approve ? "approved" : "pending";
  });
}
