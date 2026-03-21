import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/legal-document";
import { LEGAL_LAST_UPDATED_LABEL, privacySections } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy | Pinly",
  description: "Pinly Privacy Policy"
};

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      summary="This policy explains what Pinly stores, how it powers the app, and how sharing works across your map, posts, collections, and messages."
      lastUpdated={LEGAL_LAST_UPDATED_LABEL}
      sections={privacySections}
    />
  );
}

