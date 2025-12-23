import { sql } from "@/app/lib/db";
import { getOrCreateStripeCustomer } from "@/lib/stripe";
import { saveStripeCustomerIdIfAbsent } from "@/lib/stripe-db";

/**
 * Ensure a Stripe customer exists for an organization and persist its ID if absent.
 * Returns the Stripe customer ID.
 */
export async function ensureStripeCustomerForOrganization(
  organizationId: string
): Promise<string> {
  // Load org basics needed for customer creation
  const orgRows = await sql`
    SELECT id, name, email, stripe_customer_id
    FROM app.organizations
    WHERE id = ${organizationId}
    LIMIT 1
  `;

  if (orgRows.length === 0) {
    throw new Error(`Organization ${organizationId} not found`);
  }

  const org = orgRows[0] as {
    id: string;
    name: string;
    email: string;
    stripe_customer_id: string | null;
  };

  if (org.stripe_customer_id) {
    return org.stripe_customer_id;
  }

  const customer = await getOrCreateStripeCustomer(
    organizationId,
    org.email,
    org.name
  );

  const finalId = await saveStripeCustomerIdIfAbsent(
    organizationId,
    customer.id
  );

  return finalId;
}
