import { createHash } from "node:crypto";
import { Resend } from "resend";
import { generateInviteEmailTemplate } from "@/lib/dev-email";

const FROM_ADDRESS =
  process.env.EMAIL_FROM || "Woods Legal <noreply@humbleheadquarters.com>";

type SendParams = {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
};

function resendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set.");
  }
  return new Resend(apiKey);
}

function canRetry(error: { name?: string; statusCode?: number | null }) {
  const status = error.statusCode ?? 0;
  if (status === 429 || status >= 500) return true;
  return error.name === "rate_limit_exceeded" || error.name === "application_error";
}

async function sendWithRetry(
  params: SendParams,
  idempotencyKey: string
): Promise<{ id: string }> {
  const resend = resendClient();
  const maxRetries = 3;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const { data, error } = await resend.emails.send(params, { idempotencyKey });

    if (!error && data?.id) {
      return { id: data.id };
    }

    const failure = error ?? { name: "application_error", message: "No email id returned", statusCode: 500 };
    if (!canRetry(failure) || attempt === maxRetries) {
      throw new Error(failure.message || "Failed to send email");
    }

    const delay = Math.pow(2, attempt) * 1000;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  throw new Error("Failed to send email");
}

export async function sendInviteCodeEmail(params: {
  to: string;
  recipientName: string;
  organizationId: string;
  organizationName: string;
  inviteCode: string;
  inviteLink: string;
}): Promise<{ id: string }> {
  const { htmlBody, textBody } = generateInviteEmailTemplate({
    operatorName: params.recipientName,
    organizationName: params.organizationName,
    inviteCode: params.inviteCode,
    inviteLink: params.inviteLink,
  });

  const linkHash = createHash("sha256").update(params.inviteLink).digest("hex").slice(0, 12);
  const idempotencyKey = `operator-invite/${params.organizationId}/${params.to.toLowerCase()}/${params.inviteCode}/${linkHash}`.slice(0, 256);

  return sendWithRetry(
    {
      from: FROM_ADDRESS,
      to: [params.to],
      subject: `Your ${params.organizationName} access code`,
      html: htmlBody,
      text: textBody,
    },
    idempotencyKey
  );
}
