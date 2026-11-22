import Link from "next/link";
import { connection } from "next/server";
import { listProjects } from "@/lib/projects";
import { providerStatuses } from "@/lib/providers";
import { PageHeader } from "@/components/ui";
import { ProjectTable } from "@/components/ProjectTable";

export default async function Dashboard() {
  await connection();
  const projects = await listProjects();
  const providers = providerStatuses();
  const count = (f: (p: (typeof projects)[number]) => boolean) => projects.filter(f).length;
  const stats = [
    { label: "Projects", value: projects.length },
    { label: "Short (9:16)", value: count((p) => p.format === "short") },
    { label: "Long (16:9)", value: count((p) => p.format === "long") },
    { label: "Completed", value: count((p) => p.status === "completed") },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Astrology video production — scripts to finished MP4s"
        action={<Link href="/projects/new" className="btn">New project</Link>}
      />
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card">
            <div className="text-3xl font-bold text-gold">{s.value}</div>
            <div className="text-xs uppercase tracking-wide text-muted">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <h2 className="mb-3 font-semibold">Recent projects</h2>
          <ProjectTable projects={projects.slice(0, 10)} empty="No projects yet — create the first one." />
        </section>
        <section className="card">
          <h2 className="mb-3 font-semibold">Providers</h2>
          <ul className="space-y-2 text-sm">
            {providers.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2">
                <span>{p.name}</span>
                <span className={p.configured ? "text-green" : "text-muted"}>
                  {p.id === "flow" ? "job pack" : p.configured ? "configured" : "not set"}
                </span>
              </li>
            ))}
          </ul>
          <Link href="/settings" className="mt-4 inline-block text-sm text-gold hover:underline">Settings →</Link>
        </section>
      </div>
    </>
  );
}
