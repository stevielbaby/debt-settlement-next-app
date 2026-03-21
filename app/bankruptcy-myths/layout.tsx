import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://strattondefense.com";

export const metadata: Metadata = {
  title: "The Truth About Bankruptcy — Myths vs. Facts",
  description:
    "Debt settlement companies often mislead clients about bankruptcy. Learn the truth about how Chapter 7 and Chapter 13 bankruptcy actually work and how they compare to debt settlement programs.",
  keywords: [
    "bankruptcy myths facts",
    "debt settlement vs bankruptcy",
    "Chapter 7 bankruptcy truth",
    "Chapter 13 bankruptcy facts",
    "bankruptcy automatic stay",
    "does bankruptcy ruin your credit",
    "bankruptcy alternatives",
  ],
  alternates: { canonical: `${siteUrl}/bankruptcy-myths` },
  openGraph: {
    title: "The Truth About Bankruptcy — Myths vs. Facts",
    description:
      "Debt settlement companies frequently spread myths about bankruptcy to keep clients paying fees. Stratton Defense breaks down the facts.",
    url: `${siteUrl}/bankruptcy-myths`,
  },
  twitter: {
    title: "The Truth About Bankruptcy — Myths vs. Facts",
    description:
      "Is everything you've heard about bankruptcy true? Stratton Defense separates myth from fact so you can make an informed decision.",
  },
};

export default function BankruptcyMythsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
