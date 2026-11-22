"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createProject, updateProject, ProjectError } from "@/lib/projects";
import { PROJECT_STATUSES, type ApprovalState, type ProjectStatus, type VideoFormat, type VoiceProviderId } from "@/lib/types";

export interface CreateState {
  error?: string;
}

const VOICES: VoiceProviderId[] = ["flow-native", "elevenlabs", "sarvam"];

export async function createProjectAction(_prev: CreateState, form: FormData): Promise<CreateState> {
  const str = (k: string) => String(form.get(k) ?? "");
  const format = str("format") as VideoFormat;
  const voiceProvider = str("voiceProvider") as VoiceProviderId;
  if (!VOICES.includes(voiceProvider)) return { error: "Choose a voice provider." };

  const files = form.getAll("referenceImages").filter((f): f is File => f instanceof File && f.size > 0);
  const scriptFile = form.get("scriptFile");
  let script = str("script");
  if (!script.trim() && scriptFile instanceof File && scriptFile.size > 0) script = await scriptFile.text();

  let slug: string;
  try {
    const p = await createProject({
      title: str("title"),
      topic: str("topic"),
      videoType: str("videoType"),
      format,
      voiceProvider,
      voiceId: str("voiceId"),
      visualStyle: str("visualStyle"),
      script,
      referenceImages: await Promise.all(
        files.map(async (f) => ({ name: f.name, data: Buffer.from(await f.arrayBuffer()) })),
      ),
    });
    slug = p.slug;
  } catch (e) {
    if (e instanceof ProjectError) return { error: e.message };
    throw e;
  }
  revalidatePath("/");
  redirect(`/projects/${slug}`);
}

export async function setStatusAction(slug: string, form: FormData) {
  const status = String(form.get("status")) as ProjectStatus;
  if (!PROJECT_STATUSES.includes(status)) throw new Error("Invalid status");
  await updateProject(slug, `status → ${status}`, (p) => {
    p.status = status;
  });
  revalidatePath(`/projects/${slug}`);
}

export async function setApprovalAction(slug: string, target: "script" | "storyboard" | "final", value: ApprovalState) {
  await updateProject(slug, `${target} ${value}`, (p) => {
    if (target === "script") p.script.approval = value;
    else if (target === "storyboard") p.storyboard.approval = value;
    else p.finalApproval = value;
  });
  revalidatePath(`/projects/${slug}`);
}
