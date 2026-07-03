"use client";

import { useMemo, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { DownloadIcon } from "@/components/icons";
import { BrushRule } from "@/components/ink-bits";
import profileData from "@/data/profile.json";
import { t, dateLocale } from "@/lib/i18n";

type Profile = {
  name: string;
  headline: string;
  affiliation: string;
  location: string;
  statement: string;
  currentFocus: string;
  interests: string[];
  education: { degree: string; school: string; period: string }[];
  publications: { authors: string; title: string; venue: string; status: string }[];
  programmes: { title: string; support: string; period: string }[];
  appointments: { role: string; org: string; period: string }[];
  conferences: string[];
};
const profile = profileData as Profile;

type SectionKey =
  | "statement"
  | "interests"
  | "current"
  | "education"
  | "publications"
  | "programmes"
  | "appointments"
  | "conferences";

const SECTION_LABELS: Record<SectionKey, string> = {
  statement: t.sec_statement,
  interests: t.sec_interests,
  current: t.sec_current,
  education: t.sec_education,
  publications: t.sec_publications,
  programmes: t.sec_programmes,
  appointments: t.sec_appointments,
  conferences: t.sec_conferences,
};

export default function SummaryPage() {
  const [on, setOn] = useState<Record<SectionKey, boolean>>({
    statement: true,
    interests: true,
    current: true,
    education: true,
    publications: true,
    programmes: false,
    appointments: false,
    conferences: false,
  });
  const [pubs, setPubs] = useState<boolean[]>(profile.publications.map(() => true));
  const [copied, setCopied] = useState(false);

  const selectedPubs = useMemo(
    () => profile.publications.filter((_, i) => pubs[i]),
    [pubs],
  );

  const today = new Date().toLocaleDateString(dateLocale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  function toggle(k: SectionKey) {
    setOn((p) => ({ ...p, [k]: !p[k] }));
  }

  function asText() {
    const L: string[] = [];
    L.push(profile.name);
    L.push(`${profile.headline} · ${profile.affiliation} · ${profile.location}`);
    L.push("");
    if (on.statement) L.push(profile.statement, "");
    if (on.current) L.push(t.sec_current.toUpperCase(), profile.currentFocus, "");
    if (on.interests)
      L.push(t.sec_interests.toUpperCase(), profile.interests.join(" · "), "");
    if (on.education) {
      L.push(t.sec_education.toUpperCase());
      profile.education.forEach((e) =>
        L.push(`• ${e.degree}, ${e.school} (${e.period})`),
      );
      L.push("");
    }
    if (on.publications && selectedPubs.length) {
      L.push(t.sec_publications.toUpperCase());
      selectedPubs.forEach((p) =>
        L.push(`• ${p.authors}. "${p.title}." ${p.venue}. [${p.status}]`),
      );
      L.push("");
    }
    if (on.programmes) {
      L.push(t.sec_programmes.toUpperCase());
      profile.programmes.forEach((p) => L.push(`• ${p.title} — ${p.support} (${p.period})`));
      L.push("");
    }
    if (on.appointments) {
      L.push(t.sec_appointments.toUpperCase());
      profile.appointments.forEach((a) => L.push(`• ${a.role}, ${a.org} (${a.period})`));
      L.push("");
    }
    if (on.conferences) {
      L.push(t.sec_conferences.toUpperCase());
      profile.conferences.forEach((c) => L.push(`• ${c}`));
      L.push("");
    }
    return L.join("\n").trim();
  }

  async function copy() {
    await navigator.clipboard.writeText(asText());
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 pb-20">
        <div className="no-print mb-6">
          <h1 className="font-serif text-3xl text-ink">{t.sum_title}</h1>
          <BrushRule className="mt-1.5" />
          <p className="mt-1 max-w-2xl text-sm text-muted">{t.sum_desc}</p>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Controls */}
          <aside className="no-print lg:w-72 lg:shrink-0">
            <div className="lg:sticky lg:top-20 flex flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-card p-4">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted">{t.sum_sections}</span>
                {(Object.keys(SECTION_LABELS) as SectionKey[]).map((k) => (
                  <label key={k} className="flex items-center gap-2 text-sm text-ink-soft">
                    <input
                      type="checkbox"
                      checked={on[k]}
                      onChange={() => toggle(k)}
                      className="accent-[var(--accent)]"
                    />
                    {SECTION_LABELS[k]}
                  </label>
                ))}
              </div>

              {on.publications && (
                <div className="flex flex-col gap-2 border-t border-line pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted">{t.sum_publications}</span>
                    <button
                      onClick={() => setPubs((p) => p.map(() => !p.every(Boolean)))}
                      className="text-[11px] text-accent hover:underline"
                    >
                      {pubs.every(Boolean) ? t.sum_none : t.sum_all}
                    </button>
                  </div>
                  {profile.publications.map((p, i) => (
                    <label key={i} className="flex items-start gap-2 text-[12px] text-ink-soft">
                      <input
                        type="checkbox"
                        checked={pubs[i]}
                        onChange={() =>
                          setPubs((arr) => arr.map((v, j) => (j === i ? !v : v)))
                        }
                        className="mt-0.5 accent-[var(--accent)]"
                      />
                      <span className="line-clamp-2">{p.title}</span>
                    </label>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-2 border-t border-line pt-3">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm text-white transition-opacity hover:opacity-90"
                >
                  <DownloadIcon className="h-4 w-4" />
                  {t.sum_print}
                </button>
                <button
                  onClick={copy}
                  className="rounded-lg border border-line-strong px-3 py-2 text-sm text-ink-soft transition-colors hover:border-ink hover:text-ink"
                >
                  {copied ? t.sum_copied : t.sum_copy}
                </button>
              </div>
            </div>
          </aside>

          {/* Preview */}
          <article className="print-area flex-1 rounded-[var(--radius-card)] border border-line bg-card p-8 md:p-10">
            <header className="border-b border-line pb-5">
              <h2 className="font-serif text-3xl text-ink">{profile.name}</h2>
              <p className="mt-1.5 text-sm text-ink-soft">
                {profile.headline} · {profile.affiliation} · {profile.location}
              </p>
              <p className="mt-1 text-xs text-muted">{t.sum_researchSummary} · {today}</p>
            </header>

            <div className="flex flex-col">
              {on.statement && (
                <Block>
                  <p className="text-[14.5px] leading-relaxed text-ink-soft">
                    {profile.statement}
                  </p>
                </Block>
              )}

              {on.current && (
                <Block title={t.sec_current}>
                  <p className="text-sm leading-relaxed text-ink-soft">
                    {profile.currentFocus}
                  </p>
                </Block>
              )}

              {on.interests && (
                <Block title={t.sec_interests}>
                  <p className="text-sm text-ink-soft">{profile.interests.join(" · ")}</p>
                </Block>
              )}

              {on.education && (
                <Block title={t.sec_education}>
                  <ul className="flex flex-col gap-2">
                    {profile.education.map((e, i) => (
                      <li key={i} className="text-sm">
                        <span className="text-ink">{e.degree}</span>
                        <span className="text-ink-soft">, {e.school} </span>
                        <span className="text-muted">({e.period})</span>
                      </li>
                    ))}
                  </ul>
                </Block>
              )}

              {on.publications && selectedPubs.length > 0 && (
                <Block title={t.sec_publicationsFull}>
                  <ol className="flex flex-col gap-2">
                    {selectedPubs.map((p, i) => (
                      <li key={i} className="text-[13px] leading-relaxed">
                        <span className="text-ink-soft">{p.authors}. </span>
                        <span className="text-ink">“{p.title}.” </span>
                        <span className="italic text-muted">{p.venue}. </span>
                        <span className="text-muted">[{p.status}]</span>
                      </li>
                    ))}
                  </ol>
                </Block>
              )}

              {on.programmes && (
                <Block title={t.sec_programmes}>
                  <ul className="flex flex-col gap-2">
                    {profile.programmes.map((p, i) => (
                      <li key={i} className="text-[13px] leading-relaxed">
                        <span className="text-ink">{p.title}</span>
                        <span className="text-muted"> — {p.support} ({p.period})</span>
                      </li>
                    ))}
                  </ul>
                </Block>
              )}

              {on.appointments && (
                <Block title={t.sec_appointments}>
                  <ul className="flex flex-col gap-1.5">
                    {profile.appointments.map((a, i) => (
                      <li key={i} className="text-[13px]">
                        <span className="text-ink">{a.role}</span>
                        <span className="text-ink-soft">, {a.org} </span>
                        <span className="text-muted">({a.period})</span>
                      </li>
                    ))}
                  </ul>
                </Block>
              )}

              {on.conferences && (
                <Block title={t.sec_conferences}>
                  <ul className="flex flex-col gap-1 text-[13px] text-ink-soft">
                    {profile.conferences.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </Block>
              )}
            </div>
          </article>
        </div>
      </main>
    </>
  );
}

function Block({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-line py-4 last:border-b-0">
      {title && (
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-accent">
          {title}
        </h3>
      )}
      {children}
    </section>
  );
}
