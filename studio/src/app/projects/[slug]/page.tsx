import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { folderSummary, getProject, readScript } from "@/lib/projects";
import { PROJECT_STATUSES } from "@/lib/types";
import { Badge, PageHeader, fmtDate } from "@/components/ui";
import { setApprovalAction, setStatusAction } from "../actions";

export default async function ProjectPage(props: PageProps<"/projects/[slug]">) {
  await connection();
  const { slug } = await props.params;
  const project = await getProject(slug).catch(() => null);
  if (!project) notFound();
  const [script, folders] = await Promise.all([readScript(project), folderSummary(slug)]);

  const approvals = [
    { key: "script" as const, label: "Script", value: project.script.approval },
    { key: "storyboard" as const, label: "Storyboard", value: project.storyboard.approval },
    { key: "final" as const, label: "Final render", value: project.finalApproval },
  ];

  return (
    <>
      <PageHeader
        title={project.title}
        subtitle={`${project.videoType} · ${project.format === "short" ? "Short 9:16" : "Long 16:9"} · ${project.output.width}×${project.output.height} @ ${project.output.fps}fps`}
        action={<Badge value={project.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <h2 className="mb-2 font-semibold">Script</h2>
          {script ? (
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-panel-2 p-3 font-sans text-sm leading-relaxed">{script}</pre>
          ) : (
            <p className="text-sm text-muted">No script yet. Script Studio (Phase 3) will import and analyse it.</p>
          )}
          <h2 className="mb-2 mt-6 font-semibold">Scenes</h2>
          <p className="text-sm text-muted">
            {project.scenes.length
              ? `${project.scenes.length} scenes`
              : "No storyboard yet — generated in Phase 3 from the approved script."}
          </p>
        </section>

        <div className="space-y-6">
          <section className="card space-y-3 text-sm">
            <h2 className="font-semibold">Details</h2>
            <Row k="Topic" v={project.topic || "—"} />
            <Row k="Voice" v={`${project.voice.provider}${project.voice.voiceId ? ` · ${project.voice.voiceId}` : ""}`} />
            <Row k="Visual style" v={project.visualStyle || "—"} />
            <Row k="Folder" v={`projects/${project.slug}/`} mono />
            <form action={setStatusAction.bind(null, slug)} className="flex gap-2 pt-2">
              <select name="status" defaultValue={project.status} className="field">
                {PROJECT_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
              <button className="btn-ghost">Set</button>
            </form>
          </section>

          <section className="card space-y-3 text-sm">
            <h2 className="font-semibold">Approvals</h2>
            {approvals.map((a) => (
              <div key={a.key} className="flex items-center justify-between gap-2">
                <span>{a.label}</span>
                <div className="flex items-center gap-2">
                  <Badge value={a.value} />
                  <form action={setApprovalAction.bind(null, slug, a.key, "approved")}><button className="btn-ghost px-2 py-0.5 text-xs">✓</button></form>
                  <form action={setApprovalAction.bind(null, slug, a.key, "rejected")}><button className="btn-ghost px-2 py-0.5 text-xs">✗</button></form>
                </div>
              </div>
            ))}
          </section>

          <section className="card text-sm">
            <h2 className="mb-2 font-semibold">Reference images</h2>
            {project.referenceImages.length ? (
              <ul className="space-y-1 font-mono text-xs">{project.referenceImages.map((r) => <li key={r}>{r}</li>)}</ul>
            ) : (
              <p className="text-muted">None</p>
            )}
          </section>

          <section className="card text-sm">
            <h2 className="mb-2 font-semibold">Folders</h2>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs">
              {folders.map((f) => (
                <li key={f.name} className="flex justify-between"><span>{f.name}/</span><span className="text-muted">{f.files}</span></li>
              ))}
            </ul>
          </section>

          <section className="card text-sm">
            <h2 className="mb-2 font-semibold">History</h2>
            <ul className="max-h-48 space-y-1 overflow-auto text-xs">
              {[...project.history].reverse().map((h, i) => (
                <li key={i}><span className="text-muted">{fmtDate(h.at)}</span> · {h.event}{h.detail ? ` — ${h.detail}` : ""}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>
      <Link href="/" className="mt-6 inline-block text-sm text-gold hover:underline">← Dashboard</Link>
    </>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs text-muted">{k}</div>
      <div className={mono ? "font-mono text-xs" : ""}>{v}</div>
    </div>
  );
}
