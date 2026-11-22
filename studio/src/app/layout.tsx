import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono, Noto_Sans_Devanagari } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const devanagari = Noto_Sans_Devanagari({
  variable: "--font-devanagari",
  subsets: ["devanagari"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Lavish Astro Studio",
  description: "AI astrology video production studio",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${devanagari.variable} h-full antialiased`}>
      <body className="flex min-h-full font-sans">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 overflow-y-auto border-r border-border bg-panel md:block">
          <Link href="/" className="block border-b border-border px-5 py-4">
            <div className="text-lg font-bold tracking-wide text-gold">LAVISH ASTRO</div>
            <div className="text-xs text-muted">Video Production Studio</div>
          </Link>
          <Sidebar />
        </aside>
        <div className="min-w-0 flex-1">
          <header className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
            <Link href="/" className="font-bold text-gold">LAVISH ASTRO</Link>
            <Link href="/projects/new" className="btn-ghost">New</Link>
          </header>
          <main className="mx-auto max-w-6xl px-4 py-8 md:px-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
