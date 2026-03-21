import { Brand } from "@/components/brand";
import { LegalLinks } from "@/components/legal/legal-links";
import type { LegalSection } from "@/lib/legal";

type LegalDocumentProps = {
  title: string;
  summary: string;
  lastUpdated: string;
  sections: LegalSection[];
};

export function LegalDocument({ title, summary, lastUpdated, sections }: LegalDocumentProps) {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="rounded-[2rem] border bg-[var(--surface-strong)] p-5 shadow-xl shadow-black/5 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <Brand compact />
          <LegalLinks />
        </div>

        <div className="mt-8 rounded-[1.75rem] border bg-[var(--card-strong)] p-5 sm:p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/46">Pinly Legal</p>
          <h1 className="mt-2 font-[var(--font-serif)] text-3xl sm:text-4xl">{title}</h1>
          <p className="mt-4 text-sm leading-6 text-[var(--foreground)]/68">{summary}</p>
          <p className="mt-3 text-xs uppercase tracking-[0.16em] text-[var(--foreground)]/45">
            Last updated {lastUpdated}
          </p>
        </div>

        <div className="mt-5 space-y-4">
          {sections.map((section) => (
            <section key={section.title} className="rounded-[1.5rem] border bg-[var(--surface-soft)] p-5">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">{section.title}</h2>
              <div className="mt-3 space-y-3 text-sm leading-6 text-[var(--foreground)]/72">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              {section.bullets?.length ? (
                <ul className="mt-3 space-y-2 pl-5 text-sm leading-6 text-[var(--foreground)]/72">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="list-disc">
                      {bullet}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
