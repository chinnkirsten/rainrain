import { SiteHeader } from "@/components/site-header";

const SECTIONS: { h: string; body: string[] }[] = [
  {
    h: "What this is",
    body: [
      "Your private research library. It runs entirely on this computer — nothing is uploaded to the internet. Your sources, recordings, transcripts and consent forms never leave the machine.",
      "Everything is behind a password. Set a strong one in the .env.local file (AUTH_PASSWORD).",
    ],
  },
  {
    h: "Browse",
    body: [
      "Home shows your research journey by phase, with sub-topics you can add under any stage.",
      "All Collections lists everything; each phase page lists just that phase. Filter by type, year, tag, or Favorites; switch grid/list and sort from the toolbar.",
    ],
  },
  {
    h: "Search",
    body: [
      "The search box does full-text search across titles, tags AND the body text of documents and OCR'd books.",
      "It normalises Simplified / Traditional / Japanese characters — a Simplified query finds Traditional & Japanese text — and ranks results by relevance.",
    ],
  },
  {
    h: "Read",
    body: [
      "Click any item to open it. PDFs render page-by-page (use ‹ › at the bottom); Word documents and transcripts show inline; images, audio and video play in place.",
      "Use ‹ › on the sides to move to the previous / next item.",
    ],
  },
  {
    h: "Upload",
    body: [
      "Click Upload, choose the phase, drag in files (optionally add tags). Files are saved locally and immediately become cards.",
      "New uploads are auto-processed in the background: a cover is generated for PDFs, full text is indexed (so it's instantly searchable), and scanned PDFs are OCR'd (macOS).",
    ],
  },
  {
    h: "Excerpts & Evidence",
    body: [
      "Open a document, select text, and click “Save as evidence” to capture a quote with an auto-citation. For PDFs/images use “+ Add evidence”.",
      "The Evidence bank collects all excerpts — search them, switch to “By theme” to see a code-book (counts per theme tag, across how many sources & respondents), and Export the lot as cited quotations.",
    ],
  },
  {
    h: "Respondents",
    body: [
      "The Respondents page turns the fieldwork interviews into a queryable dataset — search, facet-filter, and build a live cross-tab.",
      "Open a respondent to see their full profile, audio, transcript, and Key quotes (excerpts linked automatically by interview code).",
    ],
  },
  {
    h: "AI summaries (optional)",
    body: [
      "If you install Ollama (a free local AI runner — ollama.com) and pull a model (e.g. run `ollama pull qwen2.5` once), a “Summarize with AI” button appears when you open a document. It runs entirely on your computer — nothing is sent anywhere.",
      "Without Ollama everything works the same; AI is purely optional and off by default.",
    ],
  },
  {
    h: "Tidy & safety",
    body: [
      "Deleting moves items to the Recycle bin (⚙ → Recycle bin) — restore anytime, or empty it to remove permanently.",
      "Back up everything (originals + catalog + evidence + respondents) with ⚙ → Data → Back up now. It writes a timestamped zip into storage/backups/, fully local.",
    ],
  },
];

export default function HelpPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8 pb-20">
        <h1 className="font-serif text-3xl text-ink">Guide</h1>
        <p className="mt-1 text-sm text-muted">
          A quick tour of everything this library does. It all stays on your computer.
        </p>

        <div className="mt-6 flex flex-col gap-4">
          {SECTIONS.map((s) => (
            <section
              key={s.h}
              className="rounded-[var(--radius-card)] border border-line bg-card p-5"
            >
              <h2 className="font-serif text-lg text-ink">{s.h}</h2>
              <div className="mt-2 flex flex-col gap-2">
                {s.body.map((p, i) => (
                  <p key={i} className="text-[14px] leading-relaxed text-ink-soft">
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
