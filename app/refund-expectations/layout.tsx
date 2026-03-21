import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://strattondefense.com";

export const metadata: Metadata = {
  title: "What to Expect From a Debt Settlement Refund Claim",
  description:
    "Understand how refund claims work when a debt settlement company violates federal law. See how fees may be recovered and what factors affect your potential claim.",
  keywords: [
    "debt settlement refund claim",
    "recover debt settlement fees",
    "TSR refund",
    "debt settlement fee recovery",
    "illegal debt settlement upfront fees refund",
    "debt settlement lawsuit compensation",
  ],
  alternates: { canonical: `${siteUrl}/refund-expectations` },
  openGraph: {
    title: "What to Expect From a Debt Settlement Refund Claim",
    description:
      "Find out how debt settlement fee recovery claims are calculated and what you may be able to recover if your program violated TSR, FDCPA, or UDAAP rules.",
    url: `${siteUrl}/refund-expectations`,
  },
  twitter: {
    title: "What to Expect From a Debt Settlement Refund Claim",
    description:
      "Fee recovery in debt settlement violation cases explained. Learn what factors matter and what you may be able to claim.",
  },
};

export default function RefundExpectationsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
