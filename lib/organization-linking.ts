/**
 * Organization Linking Utilities
 * Enables webmasters to create invite codes for operators to join existing organizations
 */

/**
 * Generate a random invite code for an organization
 * Format: 8 uppercase alphanumeric characters (e.g., "ABC12XYZ")
 */
export function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

/**
 * Validate invite code format
 * Must be 8 characters, alphanumeric, uppercase
 */
export function isValidInviteCode(code: string): boolean {
  return /^[A-Z0-9]{8}$/.test(code);
}

/**
 * Generate a shareable invite link
 * Operators can use this link to join the organization
 */
export function generateInviteLink(inviteCode: string, baseUrl: string = ""): string {
  const url = baseUrl || (typeof window !== "undefined" ? window.location.origin : "");
  return `${url}/auth/join?code=${inviteCode}`;
}

/**
 * Utility to explain the organization linking flow to webmasters
 */
export const ORG_LINKING_GUIDE = {
  steps: [
    {
      step: 1,
      action: "Generate invite code",
      description: "Click 'Generate Invite Code' on organization detail page",
      result: "Code displayed (e.g., ABC12XYZ)",
    },
    {
      step: 2,
      action: "Share with operator",
      description: "Copy and send invite code/link to operator via email",
      result: "Operator receives code",
    },
    {
      step: 3,
      action: "Operator joins on signup",
      description: "Operator enters code during signup instead of creating new org",
      result: "Operator now belongs to your organization",
    },
    {
      step: 4,
      action: "Operator sees subscription",
      description: "Operator can now access billing info, usage limits, etc.",
      result: "Full integration complete",
    },
  ],
  
  example: {
    code: "ABC12XYZ",
    link: "https://app.example.com/auth/join?code=ABC12XYZ",
    email: `
Dear Operator,

Your law firm has set up an account for you. To join and access the case management system:

1. Visit: https://app.example.com/auth/join?code=ABC12XYZ
2. Or signup at https://app.example.com and enter code: ABC12XYZ

Questions? Contact support@example.com
    `,
  },
};
