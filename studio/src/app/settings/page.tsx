import { connection } from "next/server";
import { providerStatuses } from "@/lib/providers";
import { PageHeader } from "@/components/ui";

export default async function SettingsPage() {
  await connection();
  const providers = providerStatuses();
  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="API keys are read from server environment variables only. Values are never shown or sent to the browser."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {providers.map((p) => (
          <section key={p.id} className="card text-sm">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="font-semibold">{p.name}</h2>
              <span className={p.configured ? "text-green" : "text-muted"}>
                {p.id === "flow" ? "Claude in Chrome job pack" : p.configured ? "● configured" : "○ not set"}
              </span>
            </div>
            <p className="text-muted">{p.role} · Phase {p.phase}</p>
            {p.envVar && <p className="mt-2 font-mono text-xs">{p.envVar}</p>}
            <p className="mt-2 text-xs text-muted">{p.note}</p>
          </section>
        ))}
      </div>
      <section className="card mt-6 text-sm text-muted">
        <h2 className="mb-2 font-semibold text-foreground">Adding a key</h2>
        Put keys in <code className="font-mono text-foreground">studio/.env.local</code> (git-ignored) or the environment&apos;s
        secret settings, then restart the studio. Connection tests arrive with each provider&apos;s phase.
      </section>
    </>
  );
}
