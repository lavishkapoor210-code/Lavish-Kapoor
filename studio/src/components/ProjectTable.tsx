import Link from "next/link";
import type { ProjectManifest } from "@/lib/types";
import { Badge, fmtDate } from "./ui";

export function ProjectTable({ projects, empty }: { projects: ProjectManifest[]; empty: string }) {
  if (!projects.length) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs uppercase text-muted">
          <tr>
            <th className="py-2 pr-4">Project</th>
            <th className="py-2 pr-4">Format</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2 pr-4">Scenes</th>
            <th className="py-2">Updated</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.slug} className="border-t border-border">
              <td className="py-2 pr-4">
                <Link href={`/projects/${p.slug}`} className="font-medium hover:text-gold">{p.title}</Link>
                <div className="text-xs text-muted">{p.topic || p.videoType}</div>
              </td>
              <td className="py-2 pr-4">{p.format === "short" ? "Short 9:16" : "Long 16:9"}</td>
              <td className="py-2 pr-4"><Badge value={p.status} /></td>
              <td className="py-2 pr-4">{p.scenes.length}</td>
              <td className="py-2 text-muted">{fmtDate(p.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
