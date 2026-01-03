/**
 * Normalize email address for consistent comparison
 * Trims whitespace and converts to lowercase
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Get the single firm (for single-tenant mode)
 * In the future, this could take a firmId parameter for multi-tenancy
 */
export async function getCurrentFirm() {
  const { prisma } = await import('@/app/lib/db');

  // For now, just return the first firm (single-tenant)
  // In multi-tenant mode, this would take a firmId parameter
  const firm = await prisma.firm.findFirst();
  if (!firm) {
    throw new Error('No firm configured. Please run setup wizard.');
  }

  return firm;
}


