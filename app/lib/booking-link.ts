export type BookingProvider = "calendly" | "cal.com";

export type BookingLink = {
  url: string;
  provider: BookingProvider;
};

function providerForHost(hostname: string): BookingProvider | null {
  const host = hostname.toLowerCase();
  if (host === "calendly.com" || host === "www.calendly.com") return "calendly";
  if (host === "cal.com" || host === "www.cal.com" || host.endsWith(".cal.com")) return "cal.com";
  return null;
}

export function parseBookingLink(input: string): BookingLink {
  const trimmed = input.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Enter the full link, starting with https://");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("The booking link must start with https://");
  }

  const provider = providerForHost(parsed.hostname);
  if (!provider) {
    throw new Error("Use a Calendly or Cal.com link.");
  }

  const path = parsed.pathname.replace(/\/+$/, "");
  if (!path || path === "/" || path === "/embed") {
    throw new Error("Paste the link for one event, not the homepage.");
  }

  parsed.hash = "";
  parsed.pathname = path;
  return { url: parsed.toString(), provider };
}

export function bookingEmbedUrl(
  link: BookingLink,
  prefill?: { name?: string; email?: string }
): string {
  const embed = new URL(link.url);

  if (link.provider === "cal.com" && !embed.pathname.endsWith("/embed")) {
    embed.pathname = `${embed.pathname}/embed`;
  }

  if (prefill?.name) embed.searchParams.set("name", prefill.name);
  if (prefill?.email) embed.searchParams.set("email", prefill.email);
  if (link.provider === "calendly") {
    embed.searchParams.set("hide_gdpr_banner", "1");
  }

  return embed.toString();
}
