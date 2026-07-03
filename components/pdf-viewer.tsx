"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { t } from "@/lib/i18n";

// 离线 worker（public/），版本须与 react-pdf 内置 pdfjs 一致
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const MIN = 0.5;
const MAX = 4;

export function PdfViewer({ src }: { src: string; title?: string }) {
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [baseWidth, setBaseWidth] = useState(0);
  const [scale, setScale] = useState(1);
  const [err, setErr] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const upd = () => setBaseWidth(Math.min(900, el.clientWidth - 16));
    upd();
    const ro = new ResizeObserver(upd);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 翻页后回到顶部
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, left: 0 });
  }, [page]);

  const zoom = (d: number) => setScale((s) => Math.min(MAX, Math.max(MIN, Math.round((s + d) * 100) / 100)));

  return (
    <div ref={wrapRef} className="flex h-[44vh] w-full flex-col bg-paper-2 md:h-[92vh]">
      <div ref={scrollRef} className="flex-1 overflow-auto">
        {err ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted">
            <div>
              <p>{t.pdf_error}</p>
              <a href={src} target="_blank" rel="noreferrer" className="mt-1 inline-block text-accent underline">
                {t.pdf_openTab}
              </a>
            </div>
          </div>
        ) : (
          <div className="w-max min-w-full py-3">
            <div className="mx-auto w-max">
              <Document
                file={src}
                onLoadSuccess={(d) => setNumPages(d.numPages)}
                onLoadError={() => setErr(true)}
                loading={<div className="px-6 py-10 text-center text-sm text-muted">{t.loading}</div>}
              >
                <Page
                  pageNumber={page}
                  width={baseWidth ? Math.round(baseWidth * scale) : undefined}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  loading={<div className="px-6 py-10 text-center text-sm text-muted">{t.loading}</div>}
                />
              </Document>
            </div>
          </div>
        )}
      </div>

      {!err && (
        <div className="flex items-center justify-center gap-1 border-t border-line bg-card/95 py-1.5 text-sm text-ink-soft">
          {/* 缩放 */}
          <button onClick={() => zoom(-0.25)} disabled={scale <= MIN} className="px-2.5 text-lg leading-none disabled:opacity-30" title="–">−</button>
          <span className="w-12 text-center text-xs tabular-nums">{Math.round(scale * 100)}%</span>
          <button onClick={() => zoom(0.25)} disabled={scale >= MAX} className="px-2.5 text-lg leading-none disabled:opacity-30" title="+">+</button>
          <button onClick={() => setScale(1)} className="ml-1 rounded px-2 py-0.5 text-xs text-muted hover:text-accent" title={t.pdf_fit}>{t.pdf_fit}</button>
          {numPages > 1 && (
            <>
              <span className="mx-2 text-line-strong">|</span>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-2.5 text-lg leading-none disabled:opacity-30">‹</button>
              <span className="tabular-nums">{t.pdf_page} {page} / {numPages}</span>
              <button onClick={() => setPage((p) => Math.min(numPages, p + 1))} disabled={page >= numPages} className="px-2.5 text-lg leading-none disabled:opacity-30">›</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
