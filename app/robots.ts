import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://strattondefense.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/bankruptcy-myths", "/refund-expectations", "/violations-checklist", "/case-review"],
        disallow: ["/admin/", "/operator/", "/webmaster/", "/dashboard/", "/api/", "/auth/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
