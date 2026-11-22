import { connection } from "next/server";
import { listProjects } from "@/lib/projects";
import { PageHeader } from "@/components/ui";
import { ProjectTable } from "@/components/ProjectTable";

export default async function CompletedPage() {
  await connection();
  const done = (await listProjects()).filter((p) => p.status === "completed");
  return (
    <>
      <PageHeader title="Completed projects" />
      <div className="card"><ProjectTable projects={done} empty="No completed projects yet." /></div>
    </>
  );
}
