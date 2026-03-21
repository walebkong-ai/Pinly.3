import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/legal-document";
import { LEGAL_LAST_UPDATED_LABEL, termsSections } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Service | Pinly",
  description: "Pinly Terms of Service"
};

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms of Service"
      summary="These terms cover your use of Pinly's map, feed, profile, friendship, collection, messaging, and media features."
      lastUpdated={LEGAL_LAST_UPDATED_LABEL}
      sections={termsSections}
    />
  );
}

