import { NextResponse } from "next/server";
import { getProject } from "@/lib/projects";

export async function GET(_req: Request, ctx: RouteContext<"/api/projects/[slug]">) {
  const { slug } = await ctx.params;
  const p = await getProject(slug).catch(() => null);
  return p ? NextResponse.json(p) : NextResponse.json({ error: "Not found" }, { status: 404 });
}
