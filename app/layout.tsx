import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://strattondefense.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Debt Settlement Fraud Attorneys | Free Case Review — Stratton Defense",
    template: "%s | Stratton Defense Law Firm",
  },
  description:
    "Stratton Defense Law Firm fights TSR, FDCPA, and UDAAP violations by debt settlement companies. Get a free case review to find out if you may be entitled to recover fees paid to a predatory debt settlement program.",
  keywords: [
    "debt settlement attorney",
    "debt settlement fraud lawyer",
    "TSR violation refund",
    "FDCPA violation attorney",
    "UDAAP debt settlement claim",
    "debt settlement scam lawsuit",
    "recover debt settlement fees",
    "debt settlement company violations",
    "California debt relief attorney",
    "free debt settlement case review",
  ],
  authors: [{ name: "Stratton Defense Law Firm", url: siteUrl }],
  creator: "Stratton Defense Law Firm",
  publisher: "Stratton Defense Law Firm",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Stratton Defense Law Firm",
    title: "Debt Settlement Fraud Attorneys | Free Case Review",
    description:
      "Stratton Defense Law Firm fights TSR, FDCPA, and UDAAP violations by debt settlement companies. Find out if you may be able to recover fees you paid to a predatory program.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Stratton Defense Law Firm — Debt Settlement Fraud Attorneys",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Debt Settlement Fraud Attorneys | Free Case Review",
    description:
      "Find out if your debt settlement company violated federal law. Get a free case review from Stratton Defense Law Firm.",
    images: ["/og-image.png"],
    creator: "@strattondefense",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
  category: "legal services",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "LegalService",
      "@id": `${siteUrl}/#legalservice`,
      name: "Stratton Defense Law Firm",
      url: siteUrl,
      description:
        "Stratton Defense Law Firm represents consumers who have been harmed by predatory debt settlement companies that violate the FTC's Telemarketing Sales Rule (TSR), the Fair Debt Collection Practices Act (FDCPA), and UDAAP provisions.",
      areaServed: "US",
      knowsAbout: [
        "Debt Settlement Fraud",
        "TSR Violations",
        "FDCPA Violations",
        "UDAAP Claims",
        "Consumer Protection Law",
        "Federal Clawback Litigation",
      ],
      serviceType: [
        "Debt Settlement Fraud Litigation",
        "FDCPA Violation Claims",
        "TSR Violation Recovery",
        "Consumer Protection Law",
      ],
      priceRange: "Free initial case review",
      sameAs: [],
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "Stratton Defense Law Firm",
      description:
        "Legal representation for victims of predatory debt settlement programs. Free case reviews for TSR, FDCPA, and UDAAP violations.",
      publisher: { "@id": `${siteUrl}/#legalservice` },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${siteUrl}/?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
      inLanguage: "en-US",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.variable} ${playfair.variable} antialiased`}>
        <div className="grain"></div>
        {children}
      </body>
    </html>
  );
}
