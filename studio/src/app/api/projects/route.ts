import { NextResponse } from "next/server";
import { createProject, listProjects, ProjectError } from "@/lib/projects";

export async function GET() {
  return NextResponse.json(await listProjects());
}

/** JSON API for automation (Claude, scripts). Reference images go through the UI form. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "JSON body required" }, { status: 400 });
  try {
    const p = await createProject({
      title: String(body.title ?? ""),
      topic: String(body.topic ?? ""),
      videoType: String(body.videoType ?? ""),
      format: body.format === "long" ? "long" : "short",
      voiceProvider: ["elevenlabs", "sarvam"].includes(body.voiceProvider) ? body.voiceProvider : "flow-native",
      voiceId: body.voiceId ? String(body.voiceId) : undefined,
      visualStyle: String(body.visualStyle ?? ""),
      script: body.script ? String(body.script) : undefined,
    });
    return NextResponse.json(p, { status: 201 });
  } catch (e) {
    if (e instanceof ProjectError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
