"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/lib/nav";

export function Sidebar() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5 p-3">
      {NAV.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${
              active ? "bg-panel-2 text-gold" : "text-foreground/85 hover:bg-panel-2 hover:text-gold"
            }`}
          >
            <span>{item.label}</span>
            {item.phase > 2 && <span className="text-[10px] text-muted">P{item.phase}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
