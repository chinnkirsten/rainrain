import { SiteHeader } from "@/components/site-header";
import { LibraryBrowser } from "@/components/library-browser";
import { BrushRule } from "@/components/ink-bits";
import { cookies } from "next/headers";
import { tFor, nItemsFor, langFrom } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const lang = langFrom((await cookies()).get("rr-lang")?.value);
  const T = tFor(lang);
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 pb-20">
        <header className="mb-6">
          <h1 className="font-serif text-3xl text-ink">{T.lib_title}</h1>
          <BrushRule className="mt-1.5" />
          <p className="mt-1 text-sm text-muted">{T.lib_desc}</p>
        </header>
        <LibraryBrowser />
      </main>
    </>
  );
}
