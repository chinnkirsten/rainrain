"use client";

import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { useStructure } from "@/components/structure-provider";
import type { Phase } from "@/lib/phases";
import { t } from "@/lib/i18n";

export default function StructurePage() {
  const { phases, refresh } = useStructure();
  const [draft, setDraft] = useState<Phase[]>(phases);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => setDraft(phases), [phases]);

  const top = draft.filter((p) => !p.parent);
  const kidsOf = (id: string) => draft.filter((p) => p.parent === id);

  const set = (id: string, patch: Partial<Phase>) =>
    setDraft((d) => d.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const del = (id: string) => {
    if (!confirm(t.struct_delConfirm)) return;
    setDraft((d) => d.filter((p) => p.id !== id && p.parent !== id));
  };

  const addSub = (parent: string) =>
    setDraft((d) => [
      ...d,
      { id: "sub-" + crypto.randomUUID().slice(0, 8), parent, title: t.struct_newSub, titleEn: "", period: "", tagline: "", intro: "", accent: "#7c2d2d" },
    ]);

  const addPhase = () =>
    setDraft((d) => [
      ...d,
      { id: "phase-" + crypto.randomUUID().slice(0, 8), title: t.struct_newPhase, titleEn: "", period: "", tagline: "", intro: "", accent: "#1f3d5c" },
    ]);

  const move = (id: string, dir: -1 | 1) =>
    setDraft((d) => {
      const arr = [...d];
      const i = arr.findIndex((p) => p.id === id);
      if (i < 0) return d;
      let j = i + dir;
      while (j >= 0 && j < arr.length && arr[j].parent !== arr[i].parent) j += dir;
      if (j < 0 || j >= arr.length) return d;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/structure", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phases: draft }),
      });
      if (res.ok) {
        setSaved(true);
        refresh();
        setTimeout(() => setSaved(false), 2200);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8 pb-28">
        <h1 className="font-serif text-3xl text-ink">{t.struct_title}</h1>
        <p className="mt-1 text-sm text-muted">{t.struct_desc}</p>

        <div className="mt-6 flex flex-col gap-5">
          {top.map((p) => (
            <div key={p.id} className="flex flex-col gap-2">
              <PhaseCard p={p} onSet={set} onMove={move} onDel={del} />
              <div className="ml-6 flex flex-col gap-2 border-l border-line pl-4">
                {kidsOf(p.id).map((c) => (
                  <PhaseCard key={c.id} p={c} sub onSet={set} onMove={move} onDel={del} />
                ))}
                <button
                  onClick={() => addSub(p.id)}
                  className="self-start rounded-full border border-dashed border-line-strong px-3 py-1 text-xs text-muted hover:border-accent hover:text-accent"
                >
                  + {t.struct_addSub}
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={addPhase}
            className="self-start rounded-full border border-dashed border-line-strong px-4 py-1.5 text-sm text-muted hover:border-accent hover:text-accent"
          >
            + {t.struct_addPhase}
          </button>
        </div>
      </main>

      {/* 保存栏 */}
      <div className="no-print sticky bottom-0 border-t border-line bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-end gap-3 px-5 py-3">
          {saved && <span className="text-sm text-accent">{t.struct_saved}</span>}
          <button
            onClick={save}
            disabled={saving}
            className="rounded-full bg-accent px-5 py-2 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? t.struct_saving : t.struct_save}
          </button>
        </div>
      </div>
    </>
  );
}

function PhaseCard({
  p,
  sub,
  onSet,
  onMove,
  onDel,
}: {
  p: Phase;
  sub?: boolean;
  onSet: (id: string, patch: Partial<Phase>) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onDel: (id: string) => void;
}) {
  const inp = "w-full rounded-lg border border-line-strong bg-paper px-2.5 py-1.5 text-sm text-ink outline-none focus:border-accent";
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-card p-3.5">
      <div className="mb-2 flex items-center gap-2">
        <input
          type="color"
          value={p.accent}
          onChange={(e) => onSet(p.id, { accent: e.target.value })}
          className="h-7 w-7 cursor-pointer rounded border border-line-strong bg-transparent"
          title={t.struct_f_accent}
        />
        <input
          value={p.title}
          onChange={(e) => onSet(p.id, { title: e.target.value })}
          placeholder={t.struct_f_title}
          className={`${inp} font-serif text-base`}
        />
        <div className="ml-auto flex items-center gap-0.5 text-muted">
          <button onClick={() => onMove(p.id, -1)} className="px-1.5 text-lg leading-none hover:text-accent" title="↑">↑</button>
          <button onClick={() => onMove(p.id, 1)} className="px-1.5 text-lg leading-none hover:text-accent" title="↓">↓</button>
          <button onClick={() => onDel(p.id)} className="px-1.5 text-sm hover:text-red-600" title={t.v_delete}>✕</button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input value={p.titleEn} onChange={(e) => onSet(p.id, { titleEn: e.target.value })} placeholder={t.struct_f_inst} className={inp} />
        <input value={p.period} onChange={(e) => onSet(p.id, { period: e.target.value })} placeholder={t.struct_f_period} className={inp} />
      </div>
      <input value={p.tagline} onChange={(e) => onSet(p.id, { tagline: e.target.value })} placeholder={t.struct_f_tagline} className={`${inp} mt-2`} />
      {!sub && (
        <textarea value={p.intro} onChange={(e) => onSet(p.id, { intro: e.target.value })} placeholder={t.struct_f_intro} className={`${inp} mt-2 h-20 resize-none`} />
      )}
    </div>
  );
}
