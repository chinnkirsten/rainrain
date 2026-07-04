import { notFound } from "next/navigation";
import Link from "next/link";
import type { CSSProperties } from "react";
import { SiteHeader } from "@/components/site-header";
import { LibraryBrowser } from "@/components/library-browser";
import { ArrowIcon } from "@/components/icons";
import { DEFAULT_PHASES, mapOf, childrenInOf } from "@/lib/phases";
import { loadPhases } from "@/lib/structure";
import { getAllItems } from "@/lib/catalog";
import { cookies } from "next/headers";
import { tFor, nItemsFor, langFrom } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return DEFAULT_PHASES.map((p) => ({ phase: p.id }));
}

export default async function PhasePage({
  params,
}: {
  params: Promise<{ phase: string }>;
}) {
  const lang = langFrom((await cookies()).get("rr-lang")?.value);
  const T = tFor(lang);
  const { phase } = await params;
  const phases = await loadPhases();
  const map = mapOf(phases);
  if (!map[phase]) notFound();
  const meta = map[phase];
  const parent = meta.parent ? map[meta.parent] : null;
  const kids = childrenInOf(phases, phase);

  let countOf: (id: string) => number = () => 0;
  if (kids.length > 0) {
    const all = await getAllItems();
    countOf = (id) => all.filter((i) => i.phase === id).length;
  }

  const accentStyle = {
    ["--color-accent"]: meta.accent,
    ["--accent"]: meta.accent,
  } as CSSProperties;

  return (
    <>
      <SiteHeader />
      <main
        className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 pb-20"
        style={accentStyle}
      >
        <header className="mb-7 border-l-4 pl-4" style={{ borderColor: meta.accent }}>
          {parent && (
            <Link
              href={`/research/${parent.id}`}
              className="mb-1 inline-block text-xs text-muted hover:text-accent"
            >
              ← {T.phase_partOf} {parent.title}
            </Link>
          )}
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="font-serif text-3xl text-ink">{meta.title}</h1>
            <span className="text-sm text-muted">{meta.titleEn}</span>
          </div>
          <p className="mt-1 text-xs text-muted">{meta.period}</p>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-soft">
            {meta.intro}
          </p>
        </header>

        {/* 子课题 */}
        {kids.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-medium text-muted">{T.phase_subtopics}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {kids.map((c) => (
                <Link
                  key={c.id}
                  href={`/research/${c.id}`}
                  className="group relative flex items-center gap-4 overflow-hidden rounded-xl border border-line bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_10px_24px_-14px_rgba(0,0,0,0.25)]"
                >
                  <span
                    className="h-10 w-1.5 rounded-full"
                    style={{ backgroundColor: c.accent }}
                  />
                  <div className="flex flex-1 flex-col gap-0.5">
                    <h3 className="font-serif text-base text-ink">{c.title}</h3>
                    <p className="text-xs leading-relaxed text-muted line-clamp-2">
                      {c.tagline}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm tabular-nums text-muted">
                    {nItemsFor(lang, countOf(c.id))}
                  </span>
                  <ArrowIcon className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                </Link>
              ))}
            </div>
          </section>
        )}

        <LibraryBrowser phase={phase} />
      </main>
    </>
  );
}
