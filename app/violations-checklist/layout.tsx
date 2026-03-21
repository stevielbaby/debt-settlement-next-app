import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://strattondefense.com";

export const metadata: Metadata = {
  title: "Debt Settlement Violations Checklist — TSR, FDCPA & UDAAP",
  description:
    "Review the most common TSR, FDCPA, and UDAAP violations by debt settlement companies. If your program committed any of these violations, you may have grounds for a legal claim.",
  keywords: [
    "debt settlement violations checklist",
    "TSR violations list",
    "FDCPA violations debt settlement",
    "UDAAP violations",
    "illegal debt settlement fees",
    "debt relief scam warning signs",
  ],
  alternates: { canonical: `${siteUrl}/violations-checklist` },
  openGraph: {
    title: "Debt Settlement Violations Checklist — TSR, FDCPA & UDAAP",
    description:
      "TSR, FDCPA, and UDAAP violations are common in the debt settlement industry. Review the checklist and see if your program crossed the line.",
    url: `${siteUrl}/violations-checklist`,
  },
  twitter: {
    title: "Debt Settlement Violations Checklist — TSR, FDCPA & UDAAP",
    description:
      "Does your debt settlement company's contract show signs of TSR, FDCPA, or UDAAP violations? Review the checklist from Stratton Defense.",
  },
};

export default function ViolationsChecklistLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
