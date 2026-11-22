import Link from "next/link";
import { NAV } from "@/lib/nav";
import { PageHeader } from "./ui";

/** Sections that are not built yet say so plainly instead of pretending to work. */
export function PlannedSection({ href }: { href: string }) {
  const item = NAV.find((n) => n.href === href)!;
  return (
    <>
      <PageHeader title={item.label} subtitle={item.blurb} />
      <div className="card text-sm">
        <p>
          <span className="font-semibold text-gold">Not built yet — Phase {item.phase}.</span> This section becomes
          functional in Phase {item.phase} of the implementation plan, after the earlier phases are tested.
        </p>
        <Link href="/" className="mt-4 inline-block text-gold hover:underline">← Dashboard</Link>
      </div>
    </>
  );
}
