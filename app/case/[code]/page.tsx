"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { t } from "@/lib/i18n";
import type { Excerpt } from "@/lib/types";

const interviewCode = (name?: string): string | null => {
  const m = /\bP\s*-?\s*0*(\d{1,3})/i.exec(name ?? "");
  return m ? `P${m[1].padStart(2, "0")}` : null;
};

type Respondent = { id: string; code?: string; name?: string; values?: Record<string, unknown> };

export default function CasePage() {
  const params = useParams<{ code: string }>();
  const code = decodeURIComponent(params.code || "").toUpperCase();
  const [resp, setResp] = useState<Respondent | null>(null);
  const [excerpts, setExcerpts] = useState<Excerpt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/respondents").then((r) => r.json()).catch(() => ({})),
      fetch("/api/evidence").then((r) => r.json()).catch(() => ({})),
    ])
      .then(([rd, ed]) => {
        const rs: Respondent[] = rd.respondents ?? [];
        setResp(rs.find((x) => (x.code ?? "").toUpperCase() === code) ?? null);
        const all: Excerpt[] = ed.evidence ?? [];
        setExcerpts(all.filter((e) => interviewCode(e.itemTitle) === code));
      })
      .finally(() => setLoading(false));
  }, [code]);

  const byTheme = useMemo(() => {
    const m = new Map<string, Excerpt[]>();
    excerpts.forEach((e) => (e.tags ?? []).forEach((tg) => {
      const a = m.get(tg) ?? [];
      a.push(e);
      m.set(tg, a);
    }));
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [excerpts]);

  const attrs = resp?.values
    ? Object.entries(resp.values).filter(([, v]) => v !== "" && v != null)
    : [];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8 pb-20">
        <Link href="/respondents" className="text-sm text-muted hover:text-accent">← {t.nav_respondents}</Link>
        <h1 className="mt-2 font-serif text-3xl text-ink">
          {code}{resp?.name ? ` · ${resp.name}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted">{t.case_desc}</p>

        {attrs.length > 0 && (
          <section className="mt-5 rounded-[var(--radius-card)] border border-line bg-card p-4">
            <h2 className="mb-2 text-sm font-medium text-ink">{t.case_attrs}</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-3">
              {attrs.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-muted">{k}</dt>
                  <dd className="text-ink">{String(v)}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <section className="mt-5">
          <h2 className="mb-2 text-sm font-medium text-ink">{t.case_coded} · {excerpts.length}</h2>
          {loading ? (
            <p className="text-sm text-muted">{t.loading}</p>
          ) : byTheme.length === 0 ? (
            <p className="rounded-[var(--radius-card)] border border-dashed border-line-strong p-6 text-center text-sm text-muted">
              {t.case_none}
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {byTheme.map(([theme, es]) => (
                <div key={theme}>
                  <div className="mb-1.5 text-sm text-accent">#{theme} · {es.length}</div>
                  <div className="flex flex-col gap-2">
                    {es.map((e) => (
                      <blockquote key={e.id} className="rounded-[var(--radius-card)] border border-line bg-card p-3 font-serif text-[15px] leading-relaxed text-ink">
                        {e.quote}
                        {e.note && <span className="mt-1 block font-sans text-xs text-muted">{e.note}</span>}
                      </blockquote>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
