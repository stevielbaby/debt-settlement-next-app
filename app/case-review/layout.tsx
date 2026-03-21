import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://strattondefense.com";

export const metadata: Metadata = {
  title: "Free Debt Settlement Case Review — Start Here",
  description:
    "Submit your debt settlement contract details for a confidential case review. Stratton Defense Law Firm evaluates potential TSR, FDCPA, and UDAAP violations and assesses whether you may have grounds for a claim.",
  keywords: [
    "free debt settlement case review",
    "debt settlement legal consultation",
    "debt settlement violation claim",
    "debt settlement attorney consultation",
    "free debt relief legal review",
    "debt settlement contract review attorney",
  ],
  alternates: { canonical: `${siteUrl}/case-review` },
  openGraph: {
    title: "Free Debt Settlement Case Review — Start Here",
    description:
      "Describe your debt settlement situation. Stratton Defense will review your contract for potential TSR, FDCPA, and UDAAP violations — at no upfront cost.",
    url: `${siteUrl}/case-review`,
  },
  twitter: {
    title: "Free Debt Settlement Case Review — Start Here",
    description:
      "Get a confidential review of your debt settlement contract. Stratton Defense identifies potential violations and explains your options.",
  },
};

export default function CaseReviewLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
