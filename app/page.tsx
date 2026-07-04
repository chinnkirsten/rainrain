import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { BackupNudge } from "@/components/backup-nudge";
import { ArrowIcon, EditIcon, KindIcon } from "@/components/icons";
import { topPhasesOf, childrenInOf } from "@/lib/phases";
import { loadPhases } from "@/lib/structure";
import { getAllItems, toPublicItem } from "@/lib/catalog";
import { cookies } from "next/headers";
import { tFor, nItemsFor, langFrom } from "@/lib/i18n";
import { RecentStrip } from "@/components/recent-strip";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const lang = langFrom((await cookies()).get("rr-lang")?.value);
  const T = tFor(lang);
  const all = (await getAllItems()).map(toPublicItem);
  const phases = await loadPhases();
  const countOf = (phaseId: string) => all.filter((i) => i.phase === phaseId).length;
  const recent = [...all]
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
    .slice(0, 6);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-20">
        <BackupNudge />
        {/* Hero */}
        <section className="flex flex-col items-start gap-5 py-12 md:py-16">
          <h1 className="max-w-3xl font-serif text-4xl leading-tight text-ink md:text-5xl">
            {T.brand}
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-ink-soft">
            {T.home_subtitle}
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href="/library"
              className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm text-paper transition-opacity hover:opacity-90"
            >
              {T.home_browse}
              <ArrowIcon className="h-4 w-4" />
            </Link>
            <Link
              href="/summary"
              className="inline-flex items-center rounded-full border border-line-strong px-5 py-2.5 text-sm text-ink-soft transition-colors hover:border-accent hover:text-accent"
            >
              {T.home_buildSummary}
            </Link>
            <span className="inline-flex items-center rounded-full border border-line-strong px-5 py-2.5 text-sm text-muted">
              {nItemsFor(lang, all.length)}
            </span>
          </div>
        </section>

        {/* Recently viewed */}
        <RecentStrip />

        {/* Research journey */}
        <section className="py-4">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="rr-sec font-serif text-xl text-ink">{T.home_journey}</h2>
              <p className="max-w-xl text-xs leading-relaxed text-muted">{T.home_journey_hint}</p>
            </div>
            <Link
              href="/structure"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line-strong px-3.5 py-1.5 text-sm text-ink-soft transition-colors hover:border-accent hover:text-accent"
            >
              <EditIcon className="h-3.5 w-3.5" />
              {T.struct_edit}
            </Link>
          </div>
          <div className="flex flex-col gap-4">
            {topPhasesOf(phases).map((p, idx) => {
              const kids = childrenInOf(phases, p.id);
              const total =
                countOf(p.id) + kids.reduce((s, c) => s + countOf(c.id), 0);
              return (
                <div key={p.id} className="flex flex-col gap-3">
                  <Link
                    href={`/research/${p.id}`}
                    className="group relative flex items-stretch gap-5 overflow-hidden rounded-[var(--radius-card)] border border-line bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_12px_30px_-16px_rgba(0,0,0,0.25)]"
                  >
                    <div
                      className="absolute inset-y-0 left-0 w-1.5"
                      style={{ backgroundColor: p.accent }}
                    />
                    <div className="flex w-14 shrink-0 flex-col items-center pl-2">
                      <span className="font-serif text-2xl" style={{ color: p.accent }}>
                        0{idx + 1}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col gap-1">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <h3 className="font-serif text-lg text-ink">{p.title}</h3>
                        <span className="text-xs text-muted">{p.titleEn}</span>
                      </div>
                      <p className="text-xs text-muted">{p.period}</p>
                      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-soft">
                        {p.tagline}
                      </p>
                    </div>
                    <div className="flex flex-col items-end justify-between text-right">
                      <span className="text-sm tabular-nums text-muted">
                        {nItemsFor(lang, total)}
                      </span>
                      <ArrowIcon className="h-5 w-5 text-muted transition-transform group-hover:translate-x-1 group-hover:text-ink" />
                    </div>
                  </Link>

                  {/* Sub-topics */}
                  {kids.length > 0 && (
                    <div className="ml-7 flex flex-col gap-3 border-l-2 border-line pl-5">
                      {kids.map((c) => (
                        <Link
                          key={c.id}
                          href={`/research/${c.id}`}
                          className="group relative flex items-center gap-4 overflow-hidden rounded-xl border border-line bg-card/70 p-4 transition-all hover:border-line-strong hover:bg-card"
                        >
                          <span
                            className="h-9 w-1 rounded-full"
                            style={{ backgroundColor: c.accent }}
                          />
                          <div className="flex flex-1 flex-col gap-0.5">
                            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                              <span className="text-[11px] text-muted">{T.home_subtopic}</span>
                              <h4 className="font-serif text-base text-ink">{c.title}</h4>
                              {c.featured && (
                                <span
                                  className="rounded-full px-2 py-0.5 text-[10px] text-white"
                                  style={{ backgroundColor: c.accent }}
                                >
                                  {T.home_inProgress}
                                </span>
                              )}
                            </div>
                            <p className="text-xs leading-relaxed text-muted line-clamp-1">
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
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Recently added */}
        {recent.length > 0 && (
          <section className="py-10">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-serif text-xl text-ink">{T.home_recent}</h2>
              <Link href="/library" className="text-sm text-muted hover:text-accent">
                {T.home_viewAll}
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {recent.map((item) => (
                <Link
                  key={item.id}
                  href={`/research/${item.phase}`}
                  className="group flex flex-col overflow-hidden rounded-xl border border-line bg-card"
                  title={item.title}
                >
                  <div className="flex aspect-square items-center justify-center overflow-hidden bg-paper-2">
                    {item.kind === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.src}
                        alt={item.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <KindIcon kind={item.kind} className="h-8 w-8 text-muted opacity-50" />
                    )}
                  </div>
                  <span className="truncate px-2 py-1.5 text-[11px] text-ink-soft">
                    {item.title}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-line py-6 text-center text-xs text-muted">
        {T.footer}
      </footer>
    </>
  );
}
