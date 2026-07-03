"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import type { PhaseId, ResearchItem } from "@/lib/types";
import { useStructure } from "./structure-provider";
import { t } from "@/lib/i18n";
import { UploadIcon } from "./icons";

type Job = {
  name: string;
  pct: number;
  status: "uploading" | "saving" | "done" | "error";
  error?: string;
};

// 本地模式：XHR 上传到磁盘，带进度。
function localUpload(
  file: File,
  fields: Record<string, string>,
  onProgress: (pct: number) => void,
): Promise<ResearchItem> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append("file", file);
    Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      try {
        const d = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(d.item as ResearchItem);
        else reject(new Error(d.error ?? t.err_upload));
      } catch {
        reject(new Error(t.err_upload));
      }
    };
    xhr.onerror = () => reject(new Error(t.err_network));
    xhr.send(fd);
  });
}

export function UploadPanel({
  defaultPhase,
  lockedPhase,
  blobConfigured,
  onUploaded,
}: {
  defaultPhase: PhaseId;
  lockedPhase?: boolean;
  blobConfigured: boolean;
  onUploaded: (item: ResearchItem) => void;
}) {
  const [phase, setPhase] = useState<PhaseId>(defaultPhase);
  const { phases } = useStructure();
  const [tags, setTags] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function setJob(name: string, patch: Partial<Job>) {
    setJobs((prev) => prev.map((j) => (j.name === name ? { ...j, ...patch } : j)));
  }

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    setJobs((prev) => [
      ...list.map((f) => ({ name: f.name, pct: 0, status: "uploading" as const })),
      ...prev,
    ]);

    for (const file of list) {
      try {
        let item: ResearchItem;
        if (blobConfigured) {
          const blob = await upload(`research/${phase}/${file.name}`, file, {
            access: "public",
            handleUploadUrl: "/api/blob-upload",
            contentType: file.type || undefined,
            multipart: true,
            clientPayload: JSON.stringify({ phase }),
            onUploadProgress: ({ percentage }) =>
              setJob(file.name, { pct: Math.round(percentage) }),
          });
          setJob(file.name, { status: "saving", pct: 100 });
          const res = await fetch("/api/items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: blob.url,
              pathname: blob.pathname,
              filename: file.name,
              contentType: file.type,
              size: file.size,
              phase,
              tags,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? t.v_saveFailed);
          item = data.item as ResearchItem;
        } else {
          item = await localUpload(
            file,
            { phase, tags },
            (pct) => setJob(file.name, { pct }),
          );
        }

        onUploaded(item);
        setJob(file.name, { status: "done", pct: 100 });
        setTimeout(
          () => setJobs((prev) => prev.filter((j) => j.name !== file.name)),
          2200,
        );
      } catch (e) {
        setJob(file.name, { status: "error", error: (e as Error).message });
      }
    }
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-card p-4">
      {!blobConfigured && (
        <p className="mb-3 rounded-lg bg-paper-2/70 px-3 py-2 text-xs text-muted">
          {t.up_localMode}
        </p>
      )}
      <div className="mb-3 flex flex-wrap items-end gap-3">
        {!lockedPhase && (
          <label className="flex flex-col gap-1 text-xs text-muted">
            {t.up_fileUnder}
            <select
              value={phase}
              onChange={(e) => setPhase(e.target.value as PhaseId)}
              className="rounded-lg border border-line-strong bg-paper px-3 py-1.5 text-sm text-ink outline-none focus:border-accent"
            >
              {phases.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.parent ? `· ${p.title}` : p.title}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-1 flex-col gap-1 text-xs text-muted">
          {t.up_tags}
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder={t.up_tags_ph}
            className="rounded-lg border border-line-strong bg-paper px-3 py-1.5 text-sm text-ink outline-none focus:border-accent"
          />
        </label>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
          dragging
            ? "border-accent bg-accent/5"
            : "border-line-strong hover:border-accent/60 hover:bg-paper-2/50"
        }`}
      >
        <UploadIcon className="h-6 w-6 text-accent" />
        <p className="text-sm text-ink-soft">
          {t.up_drag_pre} <span className="text-accent">{t.up_drag_link}</span>
        </p>
        <p className="text-xs text-muted">{t.up_formats}</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {jobs.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {jobs.map((j) => (
            <li
              key={j.name}
              className="flex items-center gap-3 rounded-lg bg-paper-2/60 px-3 py-2 text-xs"
            >
              <span className="flex-1 truncate text-ink-soft">{j.name}</span>
              {j.status === "error" ? (
                <span className="text-accent">{j.error ?? t.up_failed}</span>
              ) : j.status === "done" ? (
                <span className="text-[#3f6f5b]">{t.up_done}</span>
              ) : (
                <span className="flex items-center gap-2 text-muted">
                  <span className="h-1.5 w-24 overflow-hidden rounded-full bg-line">
                    <span
                      className="block h-full rounded-full bg-accent transition-all"
                      style={{ width: `${j.pct}%` }}
                    />
                  </span>
                  {j.status === "saving" ? t.up_saving : `${j.pct}%`}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
